const logger = require('../../utils/logger');
const { createNowPlayingEmbed, createErrorEmbed, createSuccessEmbed, createAstrialEmbed } = require('../../utils/embedBuilder');
const { createControllerComponents } = require('../../utils/controller');
const { formatSeconds, parseTimeToSeconds } = require('../../utils/timeHelper');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        logger.error(`Error executing slash command /${interaction.commandName}:`, error);
        const replyPayload = {
          embeds: [createErrorEmbed('Command Execution Error', 'An unexpected error occurred while executing this command.')],
          ephemeral: true
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload).catch(() => {});
        } else {
          await interaction.reply(replyPayload).catch(() => {});
        }
      }
      return;
    }

    // 1.5 Handle Seek Modal Submission
    if (interaction.isModalSubmit() && interaction.customId === 'modal_seek') {
      const queue = client.distube.getQueue(interaction.guildId);
      if (!queue || !queue.songs || queue.songs.length === 0) {
        return interaction.reply({
          embeds: [createErrorEmbed('No Music Active', 'There is no music currently playing.')],
          ephemeral: true
        });
      }

      const rawInput = interaction.fields.getTextInputValue('seek_input');
      const seconds = parseTimeToSeconds(rawInput);

      if (seconds === null || isNaN(seconds) || seconds < 0) {
        return interaction.reply({
          embeds: [createErrorEmbed('Invalid Time Format', 'Please enter a valid format like `1:30`, `02:45`, or seconds `90`.')],
          ephemeral: true
        });
      }

      const song = queue.songs[0];
      if (seconds >= song.duration) {
        return interaction.reply({
          embeds: [createErrorEmbed('Invalid Seek Time', `Cannot seek past the end of the song (\`${song.formattedDuration}\`).`)],
          ephemeral: true
        });
      }

      queue.seek(seconds);
      await interaction.reply({
        embeds: [createSuccessEmbed('Position Updated', `⏩ Jumped to \`${formatSeconds(seconds)}\` / \`${song.formattedDuration}\``)],
        ephemeral: true
      });

      if (interaction.message?.editable) {
        try {
          await interaction.message.edit({
            embeds: [createNowPlayingEmbed(queue.songs[0], queue)],
            components: createControllerComponents(queue)
          });
        } catch (e) {}
      }
      return;
    }

    // 2. Handle Ticket System Select Menus & Buttons
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_select_')) {
      const ticketManager = require('../../utils/ticketManager');
      return ticketManager.handleTicketSelect(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith('ticket_btn_')) {
      const ticketManager = require('../../utils/ticketManager');
      return ticketManager.handleTicketButton(interaction);
    }

    // 2.5 Handle Server Verification Button
    if (interaction.isButton() && (interaction.customId === 'btn_verify_member' || interaction.customId.startsWith('verify_btn_'))) {
      const verificationManager = require('../../utils/verificationManager');
      return verificationManager.handleVerificationButton(interaction);
    }

    // 3. Handle Controller Buttons & Filters Menu
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      // Ignore collector menus / buttons (handled in collectors)
      if (
        interaction.customId === 'help_category_select' ||
        interaction.customId === 'q_prev' ||
        interaction.customId === 'q_next' ||
        interaction.customId.startsWith('upi_') ||
        interaction.customId.startsWith('wl_')
      ) {
        return;
      }

      const queue = client.distube.getQueue(interaction.guildId);
      const memberVoice = interaction.member?.voice?.channel;
      const botVoice = interaction.guild?.members?.me?.voice?.channel;

      if (!memberVoice) {
        return interaction.reply({
          embeds: [createErrorEmbed('Voice Required', 'You must be in a voice channel to use music controls.')],
          ephemeral: true
        });
      }

      if (botVoice && memberVoice.id !== botVoice.id) {
        return interaction.reply({
          embeds: [createErrorEmbed('Wrong Voice Channel', `You must be in ${botVoice} to use the controller.`)],
          ephemeral: true
        });
      }

      if (!queue) {
        return interaction.reply({
          embeds: [createErrorEmbed('No Music Active', 'There is no music currently playing.')],
          ephemeral: true
        });
      }

      // Button Handlers
      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId === 'btn_rewind_10') {
          const song = queue.songs[0];
          const current = queue.currentTime || 0;
          const newTime = Math.max(0, current - 10);
          queue.seek(newTime);
          await interaction.reply({
            embeds: [createSuccessEmbed('Rewound 10s', `⏪ Music jumped back to \`${formatSeconds(newTime)}\``)],
            ephemeral: true
          });
        } else if (customId === 'btn_forward_10') {
          const song = queue.songs[0];
          const current = queue.currentTime || 0;
          const newTime = Math.min(Math.max(0, song.duration - 1), current + 10);
          queue.seek(newTime);
          await interaction.reply({
            embeds: [createSuccessEmbed('Fast Forwarded 10s', `⏩ Music advanced to \`${formatSeconds(newTime)}\``)],
            ephemeral: true
          });
        } else if (customId === 'btn_seek_modal') {
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ModalRow } = require('discord.js');
          const song = queue.songs[0];
          const modal = new ModalBuilder()
            .setCustomId('modal_seek')
            .setTitle('⏩ Seek Music Position');

          const input = new TextInputBuilder()
            .setCustomId('seek_input')
            .setLabel(`Position (Total: ${song.formattedDuration})`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 1:30 or 90')
            .setRequired(true);

          modal.addComponents(new ModalRow().addComponents(input));
          return interaction.showModal(modal);
        } else if (customId === 'btn_pause_resume') {
          if (queue.paused) {
            queue.resume();
            await interaction.deferUpdate().catch(() => {});
          } else {
            queue.pause();
            await interaction.deferUpdate().catch(() => {});
          }
        } else if (customId === 'btn_skip') {
          try {
            if (queue.songs.length <= 1 && !queue.autoplay) {
              await queue.stop();
              return interaction.reply({
                embeds: [createSuccessEmbed('Skipped', 'Skipped song. Queue has ended!')],
                ephemeral: true
              });
            }
            await queue.skip();
            return interaction.reply({
              embeds: [createSuccessEmbed('Skipped', `⏭️ ${interaction.user} skipped the track!`)],
              ephemeral: false
            });
          } catch (e) {
            return interaction.reply({
              embeds: [createErrorEmbed('Skip Failed', e.message || 'Could not skip.')],
              ephemeral: true
            });
          }
        } else if (customId === 'btn_stop') {
          await queue.stop();
          if (!client.stayInVoice?.[interaction.guildId]) {
            await client.distube.voices.leave(interaction.guildId);
          }
          return interaction.reply({
            embeds: [createSuccessEmbed('Stopped', `⏹️ ${interaction.user} stopped playback and cleared the queue.`)],
            ephemeral: false
          });
        } else if (customId === 'btn_loop') {
          const nextMode = (queue.repeatMode + 1) % 3;
          queue.setRepeatMode(nextMode);
          const modeNames = ['Disabled', 'Repeat Song', 'Repeat Queue'];
          await interaction.reply({
            embeds: [createSuccessEmbed('Loop Updated', `🔁 Repeat mode set to: **${modeNames[nextMode]}**`)],
            ephemeral: true
          });
        } else if (customId === 'btn_shuffle') {
          if (queue.songs.length <= 1) {
            return interaction.reply({
              embeds: [createErrorEmbed('Cannot Shuffle', 'Not enough songs in queue to shuffle.')],
              ephemeral: true
            });
          }
          await queue.shuffle();
          return interaction.reply({
            embeds: [createSuccessEmbed('Shuffled', `🔀 Shuffled ${queue.songs.length - 1} upcoming tracks!`)],
            ephemeral: true
          });
        } else if (customId === 'btn_vol_down') {
          const newVol = Math.max(10, queue.volume - 10);
          queue.setVolume(newVol);
          await interaction.reply({
            embeds: [createSuccessEmbed('Volume Changed', `🔉 Volume set to **${newVol}%**`)],
            ephemeral: true
          });
        } else if (customId === 'btn_vol_up') {
          const newVol = Math.min(150, queue.volume + 10);
          queue.setVolume(newVol);
          await interaction.reply({
            embeds: [createSuccessEmbed('Volume Changed', `🔊 Volume set to **${newVol}%**`)],
            ephemeral: true
          });
        } else if (customId === 'btn_autoplay') {
          const auto = queue.toggleAutoplay();
          await interaction.reply({
            embeds: [createSuccessEmbed('Autoplay Toggled', `📻 Autoplay is now: **${auto ? 'ON' : 'OFF'}**`)],
            ephemeral: true
          });
        } else if (customId === 'btn_queue') {
          const current = queue.songs[0];
          const upcoming = queue.songs.slice(1, 11);
          const list = upcoming.length > 0
            ? upcoming.map((s, idx) => `\`${idx + 1}.\` [${s.name.substring(0, 40)}](${s.url}) - \`${s.formattedDuration}\``).join('\n')
            : '*No more songs in queue.*';

          const qEmbed = createAstrialEmbed()
            .setTitle(`📜 Current Queue (${queue.songs.length} tracks)`)
            .setDescription(`**Now Playing:** [${current.name}](${current.url})\n\n**Upcoming (Next 10):**\n${list}`)
            .setFooter({ text: `Total Duration: ${queue.formattedDuration}` });

          return interaction.reply({ embeds: [qEmbed], ephemeral: true });
        }

        // Refresh original message embed if possible
        if (queue && queue.songs[0] && interaction.message?.editable) {
          try {
            await interaction.message.edit({
              embeds: [createNowPlayingEmbed(queue.songs[0], queue)],
              components: createControllerComponents(queue)
            });
          } catch (e) {}
        }
      }

      // Filter Select Menu Handler
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_filter') {
        const selected = interaction.values[0];
        if (selected === 'off') {
          queue.filters.clear();
          await interaction.reply({
            embeds: [createSuccessEmbed('Filters Cleared', '🎛️ Audio returned to normal!')],
            ephemeral: true
          });
        } else {
          queue.filters.clear();
          queue.filters.add(selected);
          await interaction.reply({
            embeds: [createSuccessEmbed('Filter Enabled', `🎛️ Applied audio effect: **${selected}**`)],
            ephemeral: true
          });
        }

        if (queue && queue.songs[0] && interaction.message?.editable) {
          try {
            await interaction.message.edit({
              embeds: [createNowPlayingEmbed(queue.songs[0], queue)],
              components: createControllerComponents(queue)
            });
          } catch (e) {}
        }
      }
    }
  }
};
