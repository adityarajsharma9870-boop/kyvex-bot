const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const config = require('../config');

/**
 * Builds the interactive music controller components (Buttons + Filters Select Menu)
 * @param {object} queue - DisTube queue object
 * @returns {Array<ActionRowBuilder>}
 */
function createControllerComponents(queue) {
  const isPaused = queue ? queue.paused : false;
  const isAutoplay = queue ? queue.autoplay : false;

  // Row 1: Main Playback Controls with Fast-Forward and Rewind
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_rewind_10')
      .setLabel('-10s')
      .setEmoji('⏪')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_pause_resume')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_forward_10')
      .setLabel('+10s')
      .setEmoji('⏩')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_skip')
      .setLabel('Skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger)
  );

  // Row 2: Seek Time, Loop, Shuffle & Volume
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_seek_modal')
      .setLabel('Seek To')
      .setEmoji('⏱️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_loop')
      .setLabel('Loop')
      .setEmoji('🔁')
      .setStyle(queue && queue.repeatMode > 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_shuffle')
      .setLabel('Shuffle')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_vol_down')
      .setLabel('Vol -10%')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_vol_up')
      .setLabel('Vol +10%')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary)
  );

  // Row 3: Queue & Autoplay
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_queue')
      .setLabel('View Queue')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_autoplay')
      .setLabel(isAutoplay ? 'Autoplay: ON' : 'Autoplay: OFF')
      .setEmoji('📻')
      .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Row 4: Audio Filters Select Menu
  const filterOptions = config.filters.map((f) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(f.label)
      .setValue(f.value)
      .setDescription(f.description)
      .setEmoji(f.emoji)
  );

  const filterMenu = new StringSelectMenuBuilder()
    .setCustomId('select_filter')
    .setPlaceholder('🎛️ Select an Audio Filter (Bassboost, 8D, etc.)')
    .addOptions(filterOptions);

  const row4 = new ActionRowBuilder().addComponents(filterMenu);

  return [row1, row2, row3, row4];
}

module.exports = {
  createControllerComponents
};
