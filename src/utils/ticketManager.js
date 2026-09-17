const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');
const logger = require('./logger');

const dataDir = path.join(__dirname, '..', '..', 'data');
const ticketsFile = path.join(dataDir, 'tickets.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(ticketsFile)) {
  fs.writeFileSync(ticketsFile, JSON.stringify({ counter: 1, panels: [], activeTickets: {} }, null, 2));
}

function loadTicketData() {
  try {
    return JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
  } catch (e) {
    logger.error('Failed to load tickets.json:', e);
    return { counter: 1, panels: [], activeTickets: {} };
  }
}

function saveTicketData(data) {
  try {
    fs.writeFileSync(ticketsFile, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error('Failed to save tickets.json:', e);
  }
}

const ticketManager = {
  getData() {
    return loadTicketData();
  },

  /**
   * Builds custom dynamic select menus created by the user
   */
  buildCustomDropdownComponents(dropdownList = []) {
    const rows = [];
    const maxRows = 5;
    const list = dropdownList.slice(0, maxRows);

    for (let i = 0; i < list.length; i++) {
      const menuData = list[i];
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket_select_custom_${i}_${Date.now()}`)
        .setPlaceholder(menuData.placeholder || `Select Option ${i + 1}`);

      const rawOptions = (menuData.options && Array.isArray(menuData.options) && menuData.options.length > 0)
        ? menuData.options
        : [{ label: 'General Support', emoji: '🎟️', description: 'Open a support ticket' }];

      const optionsToAdd = rawOptions.slice(0, 25).map((opt, optIdx) => {
        const optVal = opt.value || `custom_val_${i}_${optIdx}`;
        const optBuilder = new StringSelectMenuOptionBuilder()
          .setLabel((opt.label || `Option ${optIdx + 1}`).slice(0, 100))
          .setValue(optVal)
          .setDescription((opt.description || opt.label || 'Ticket Category').slice(0, 100));

        if (opt.emoji) {
          try {
            optBuilder.setEmoji(opt.emoji);
          } catch (e) {}
        }
        return optBuilder;
      });

      selectMenu.addOptions(optionsToAdd);
      rows.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    return rows;
  },

  /**
   * Builds the 5-dropdown ticket panel matching the user's screenshot
   */
  buildOGRegeditComponents(options = {}) {
    // 1. Dropdown: MAIN ACCOUNT (Internal Max, UID Bypass, External Panel, Emote Panel, Streamer Panel)
    const mainAccountMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_main_account')
      .setPlaceholder(options.dropdown1 || 'MAIN ACCOUNT')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('INTERNAL MAX')
          .setValue('main_internal_max')
          .setDescription('Direct Internal Max VIP Access')
          .setEmoji('🎀'),
        new StringSelectMenuOptionBuilder()
          .setLabel('UID BYPASS')
          .setValue('main_uid_bypass')
          .setDescription('Advanced UID Bypass Protection')
          .setEmoji('🎀'),
        new StringSelectMenuOptionBuilder()
          .setLabel('EXTERNAL PANEL')
          .setValue('main_external_panel')
          .setDescription('External Panel Edition Key')
          .setEmoji('🎀'),
        new StringSelectMenuOptionBuilder()
          .setLabel('EMOTE PANEL')
          .setValue('main_emote_panel')
          .setDescription('Instant Emote Panel Unlocks')
          .setEmoji('🎀'),
        new StringSelectMenuOptionBuilder()
          .setLabel('STREAMER PANEL')
          .setValue('main_streamer_panel')
          .setDescription('Streamer Edition Pro Panel')
          .setEmoji('🎀')
      ]);

    // 2. Dropdown: BRUTAL PANEL
    const brutalPanelMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_brutal_panel')
      .setPlaceholder(options.dropdown2 || 'BRUTAL PANEL')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('Buy Brutal Panel Key')
          .setValue('brutal_panel_buy')
          .setDescription('Get instant Brutal Panel VIP License key')
          .setEmoji('⚡'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Brutal Panel Renewal / Update')
          .setValue('brutal_panel_renew')
          .setDescription('Renew or upgrade existing panel subscription')
          .setEmoji('🔄')
      ]);

    // 3. Dropdown: CLIENT SUPPORT
    const clientSupportMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_client_support')
      .setPlaceholder(options.dropdown3 || 'CLIENT SUPPORT')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('Payment Assistance / UPI Verification')
          .setValue('client_support_payment')
          .setDescription('Verify payment screenshot and claim order')
          .setEmoji('💳'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Technical & Setup Support')
          .setValue('client_support_tech')
          .setDescription('Get setup help from support team')
          .setEmoji('💬')
      ]);

    // 4. Dropdown: CREATE TICKET TO BECOME A STAFF (Matches user screenshot 2)
    const becomeStaffMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_become_staff')
      .setPlaceholder(options.dropdown4 || 'CREATE TICKET TO BECOME A STAFF')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('STAFF')
          .setValue('become_staff_apply')
          .setDescription('Apply For Staff Member')
          .setEmoji('😅'),
        new StringSelectMenuOptionBuilder()
          .setLabel('STAFF SUPPORT')
          .setValue('become_staff_helper')
          .setDescription('Customer Support & Assistance Team')
          .setEmoji('😆')
      ]);

    // 5. Dropdown: FREE PANEL
    const freePanelMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_free_panel')
      .setPlaceholder(options.dropdown5 || 'FREE PANEL')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('Claim Free Trial Panel')
          .setValue('free_panel_claim')
          .setDescription('Get free trial access key')
          .setEmoji('🎁'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Free Panel Inquiries')
          .setValue('free_panel_info')
          .setDescription('Ask about trial conditions & setup')
          .setEmoji('📋')
      ]);

    return [
      new ActionRowBuilder().addComponents(mainAccountMenu),
      new ActionRowBuilder().addComponents(brutalPanelMenu),
      new ActionRowBuilder().addComponents(clientSupportMenu),
      new ActionRowBuilder().addComponents(becomeStaffMenu),
      new ActionRowBuilder().addComponents(freePanelMenu)
    ];
  },

  /**
   * Creates or sends a Ticket Panel to a target Discord text channel
   */
  async sendTicketPanel(guild, channelId, options = {}) {
    const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
    if (!channel || !channel.isTextBased()) {
      throw new Error('Target channel not found or is not a text channel.');
    }

    const title = options.title || 'Help & Support';
    const description = options.description || 'Click below to create a new support ticket 🎟️';
    const footerText = options.footerText || `Powered by ${guild.client?.user?.username || 'OG EMPIRE'}`;
    const bannerUrl = options.bannerUrl;
    const color = options.color || '#F1C40F';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title.replace(/\*\*/g, ''))
      .setDescription(description)
      .setFooter({ text: footerText });

    if (bannerUrl && bannerUrl.startsWith('http')) {
      embed.setImage(bannerUrl);
    }

    const components = [];
    const mode = options.interactionMode || (options.interactionRows ? 'rows' : (options.useDropdowns ? 'dropdowns' : 'button'));

    if (options.interactionRows && Array.isArray(options.interactionRows) && options.interactionRows.length > 0) {
      for (const rowData of options.interactionRows.slice(0, 5)) {
        if (rowData.type === 'button_row' && rowData.buttons && rowData.buttons.length > 0) {
          const actionRow = new ActionRowBuilder();
          for (const btn of rowData.buttons.slice(0, 5)) {
            if (btn.style === 'link' || btn.type === 'link') {
              const linkBtn = new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel((btn.label || 'Link').slice(0, 80))
                .setURL(btn.url && btn.url.startsWith('http') ? btn.url : 'https://discord.gg');
              if (btn.emoji) {
                try { linkBtn.setEmoji(btn.emoji); } catch(e) {}
              }
              actionRow.addComponents(linkBtn);
            } else {
              const btnStyle = btn.style === 'primary' 
                ? ButtonStyle.Primary 
                : (btn.style === 'success' ? ButtonStyle.Success : (btn.style === 'secondary' ? ButtonStyle.Secondary : ButtonStyle.Danger));

              const ticketBtn = new ButtonBuilder()
                .setCustomId(`ticket_btn_create_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
                .setLabel((btn.label || 'Create Ticket').slice(0, 80))
                .setStyle(btnStyle);
              if (btn.emoji) {
                try { ticketBtn.setEmoji(btn.emoji); } catch(e) {}
              }
              actionRow.addComponents(ticketBtn);
            }
          }
          if (actionRow.components.length > 0) {
            components.push(actionRow);
          }
        } else if (rowData.type === 'dropdown') {
          const ddRows = this.buildCustomDropdownComponents([rowData]);
          if (ddRows.length > 0) {
            components.push(ddRows[0]);
          }
        }
      }
    } else {
      const mode = options.interactionMode || (options.useDropdowns ? 'dropdowns' : 'button');

      if (mode === 'dropdowns') {
        if (options.dropdowns && Array.isArray(options.dropdowns) && options.dropdowns.length > 0) {
          components.push(...this.buildCustomDropdownComponents(options.dropdowns));
        } else {
          components.push(...this.buildOGRegeditComponents(options));
        }
      } else if (mode === 'hybrid') {
        const buttonStyle = options.buttonStyle === 'primary' 
          ? ButtonStyle.Primary 
          : (options.buttonStyle === 'success' ? ButtonStyle.Success : ButtonStyle.Danger);

        const createBtn = new ButtonBuilder()
          .setCustomId('ticket_btn_create')
          .setLabel(options.buttonLabel || 'Create Ticket')
          .setEmoji(options.buttonEmoji || '🎟️')
          .setStyle(buttonStyle);

        components.push(new ActionRowBuilder().addComponents(createBtn));

        const ddRows = (options.dropdowns && Array.isArray(options.dropdowns) && options.dropdowns.length > 0)
          ? this.buildCustomDropdownComponents(options.dropdowns)
          : this.buildOGRegeditComponents(options);

        components.push(...ddRows.slice(0, 4));
      } else {
        // Single button mode
        const buttonStyle = options.buttonStyle === 'primary' 
          ? ButtonStyle.Primary 
          : (options.buttonStyle === 'success' ? ButtonStyle.Success : ButtonStyle.Danger);

        const createBtn = new ButtonBuilder()
          .setCustomId('ticket_btn_create')
          .setLabel(options.buttonLabel || 'Create Ticket')
          .setEmoji(options.buttonEmoji || '🎟️')
          .setStyle(buttonStyle);

        components.push(new ActionRowBuilder().addComponents(createBtn));
      }
    }


    const data = loadTicketData();
    let message = null;
    let targetPanel = null;

    if (options.panelId) {
      targetPanel = data.panels.find((p) => p.id === options.panelId || p.messageId === options.panelId);
    }

    // If editing an existing panel, attempt to edit the Discord message in-place
    if (targetPanel && targetPanel.messageId) {
      try {
        const targetChId = targetPanel.channelId || channel.id;
        const targetCh = guild.channels.cache.get(targetChId) || (await guild.channels.fetch(targetChId).catch(() => null));
        if (targetCh && targetCh.id === channel.id) {
          const oldMsg = await targetCh.messages.fetch(targetPanel.messageId).catch(() => null);
          if (oldMsg) {
            await oldMsg.edit({ embeds: [embed], components });
            message = oldMsg;
          }
        }
      } catch (editErr) {
        logger.warn('[TicketPanel Edit] Could not edit old message, will send a new one:', editErr.message);
      }
    }

    if (!message) {
      message = await channel.send({
        embeds: [embed],
        components
      });
    }

    if (targetPanel) {
      targetPanel.messageId = message.id;
      targetPanel.channelId = channel.id;
      targetPanel.channelName = channel.name;
      targetPanel.guildId = guild.id;
      targetPanel.title = title;
      targetPanel.description = description;
      targetPanel.bannerUrl = bannerUrl;
      targetPanel.footerText = footerText;
      targetPanel.categoryId = options.categoryId || null;
      targetPanel.supportRoleId = options.supportRoleId || null;
      targetPanel.supportRoles = options.supportRoles || (options.supportRoleId ? [options.supportRoleId] : []);
      targetPanel.ticketPrefix = options.ticketPrefix || 'ticket-';
      targetPanel.adminAccess = options.adminAccess !== false;
      targetPanel.updatedAt = new Date().toISOString();
      targetPanel.buttonLabel = options.buttonLabel || 'Create Ticket';
      targetPanel.buttonEmoji = options.buttonEmoji || '🎟️';
      targetPanel.buttonStyle = options.buttonStyle || 'danger';
      targetPanel.interactionMode = mode;
      targetPanel.interactionRows = options.interactionRows || null;
      targetPanel.dropdowns = options.dropdowns || null;
      targetPanel.dropdown1 = options.dropdown1 || 'MAIN ACCOUNT';
      targetPanel.dropdown2 = options.dropdown2 || 'BRUTAL PANEL';
      targetPanel.dropdown3 = options.dropdown3 || 'CLIENT SUPPORT';
      targetPanel.dropdown4 = options.dropdown4 || 'CREATE TICKET TO BECOME A STAFF';
      targetPanel.dropdown5 = options.dropdown5 || 'FREE PANEL';

      saveTicketData(data);
      return { message, panel: targetPanel, updated: true };
    }

    const panelId = `panel_${Date.now()}`;
    const newPanel = {
      id: panelId,
      messageId: message.id,
      channelId: channel.id,
      channelName: channel.name,
      guildId: guild.id,
      title,
      description,
      bannerUrl,
      footerText,
      color,
      categoryId: options.categoryId || null,
      supportRoleId: options.supportRoleId || null,
      supportRoles: options.supportRoles || (options.supportRoleId ? [options.supportRoleId] : []),
      ticketPrefix: options.ticketPrefix || 'ticket-',
      adminAccess: options.adminAccess !== false,
      createdAt: new Date().toISOString(),
      buttonLabel: options.buttonLabel || 'Create Ticket',
      buttonEmoji: options.buttonEmoji || '🎟️',
      buttonStyle: options.buttonStyle || 'danger',
      interactionMode: mode,
      interactionRows: options.interactionRows || null,
      dropdowns: options.dropdowns || null,
      dropdown1: options.dropdown1 || 'MAIN ACCOUNT',
      dropdown2: options.dropdown2 || 'BRUTAL PANEL',
      dropdown3: options.dropdown3 || 'CLIENT SUPPORT',
      dropdown4: options.dropdown4 || 'CREATE TICKET TO BECOME A STAFF',
      dropdown5: options.dropdown5 || 'FREE PANEL'
    };

    data.panels.push(newPanel);
    saveTicketData(data);

    return { message, panel: newPanel, updated: false };
  },

  /**
   * Resend an existing panel to Discord
   */
  async resendPanel(guild, panelId) {
    const data = loadTicketData();
    const panel = data.panels.find((p) => p.id === panelId || p.messageId === panelId);
    if (!panel) throw new Error('Panel not found');
    return this.sendTicketPanel(guild, panel.channelId, panel);
  },

  /**
   * Delete panel config
   */
  deletePanel(guildId, panelId) {
    const data = loadTicketData();
    data.panels = data.panels.filter((p) => !(p.guildId === guildId && (p.id === panelId || p.messageId === panelId)));
    saveTicketData(data);
    return data.panels;
  },

  updatePanelSettings(guildId, panelId, updates) {
    const data = loadTicketData();
    const panel = data.panels.find((p) => (!guildId || p.guildId === guildId) && (p.id === panelId || p.messageId === panelId));
    if (panel) {
      Object.assign(panel, updates);
      panel.updatedAt = new Date().toISOString();
      saveTicketData(data);
      return panel;
    }
    return null;
  },

  /**
   * Reusable ticket creation core
   */
  async createTicketForUser(interaction, categoryInfo) {
    const guild = interaction.guild;
    const user = interaction.user;
    const data = loadTicketData();

    // Check if user already has an active ticket of this category
    const existingTicket = Object.values(data.activeTickets).find(
      (t) => t.userId === user.id && t.guildId === guild.id && !t.closed && t.prefix === categoryInfo.prefix
    );

    if (existingTicket) {
      const ch = guild.channels.cache.get(existingTicket.channelId);
      if (ch) {
        return interaction.reply({
          content: `⚠️ Aapke paas already ek open ticket hai: ${ch}! Pehle use close karein.`,
          ephemeral: true
        });
      }
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const ticketNumber = String(data.counter || 1).padStart(4, '0');
    data.counter = (data.counter || 1) + 1;

    // Find panel config if available to get target category and access roles
    const panelConfig = (interaction.message?.id && data.panels.find((p) => p.messageId === interaction.message.id)) || data.panels.find((p) => p.guildId === guild.id);
    let parentCategory = panelConfig?.categoryId ? guild.channels.cache.get(panelConfig.categoryId) : null;

    if (!parentCategory) {
      parentCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && (c.name.toUpperCase().includes('TICKET') || c.name.toUpperCase().includes('PRIVATE') || c.name.toUpperCase().includes('SUPPORT'))
      ) || null;
    }

    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
    const channelName = `${categoryInfo.prefix}-${cleanUsername}-${ticketNumber}`;

    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id, // Ticket Creator
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: guild.client.user.id, // Bot itself
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles
        ]
      }
    ];

    // Support roles access (single or multiple support roles who can view & reply)
    const supportRolesList = [];
    if (panelConfig?.supportRoleId) supportRolesList.push(panelConfig.supportRoleId);
    if (Array.isArray(panelConfig?.supportRoles)) {
      panelConfig.supportRoles.forEach((rId) => {
        if (rId && !supportRolesList.includes(rId)) supportRolesList.push(rId);
      });
    }

    for (const rId of supportRolesList) {
      if (guild.roles.cache.has(rId)) {
        permissionOverwrites.push({
          id: rId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        });
      }
    }

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: parentCategory ? parentCategory.id : undefined,
        topic: `Ticket #${ticketNumber} | Creator: ${user.tag} (${user.id}) | Category: ${categoryInfo.name}`,
        permissionOverwrites,
        reason: `[TICKET SYSTEM] Ticket #${ticketNumber} created by ${user.tag}`
      });

      data.activeTickets[ticketChannel.id] = {
        ticketId: ticketNumber,
        channelId: ticketChannel.id,
        guildId: guild.id,
        userId: user.id,
        userName: user.tag,
        category: categoryInfo.name,
        prefix: categoryInfo.prefix,
        createdAt: new Date().toISOString(),
        closed: false,
        claimedBy: null
      };
      saveTicketData(data);

      const botName = guild.client?.user?.username || 'OG EMPIRE';
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setAuthor({
          name: `${botName} • Ticket #${ticketNumber}`,
          iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`🎫 ${categoryInfo.desc}`)
        .setDescription(
          `Welcome ${user}! Thank you for opening a support ticket.\n` +
          `Our support team has been notified and will assist you shortly.\n\n` +
          `• **Ticket ID:** \`#${ticketNumber}\`\n` +
          `• **Topic / Category:** \`${categoryInfo.name}\`\n` +
          `• **Opened By:** ${user} (\`${user.id}\`)\n` +
          `• **Status:** \`🟢 Open / Awaiting Staff\`\n\n` +
          `*Please describe your issue or inquiry in detail below.*`
        )
        .setFooter({ text: `Powered by ${botName} • Use buttons below to manage ticket` })
        .setTimestamp();

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_btn_close_${ticketChannel.id}`)
          .setLabel('Close Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket_btn_claim_${ticketChannel.id}`)
          .setLabel('Claim Ticket')
          .setEmoji('🙋')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`ticket_btn_transcript_${ticketChannel.id}`)
          .setLabel('Transcript')
          .setEmoji('📑')
          .setStyle(ButtonStyle.Secondary)
      );

      await ticketChannel.send({
        content: `${user} ${panelConfig?.supportRoleId ? `<@&${panelConfig.supportRoleId}>` : ''}`,
        embeds: [welcomeEmbed],
        components: [actionRow]
      });

      return interaction.editReply({
        content: `✅ Aapka ticket successfully create ho gaya hai: ${ticketChannel}!`
      });
    } catch (err) {
      logger.error('Failed to create ticket channel:', err);
      return interaction.editReply({
        content: `❌ Ticket channel create nahi ho paya: ${err.message}`
      });
    }
  },

  /**
   * Handles user selecting a ticket option from any of the 5 dropdowns
   */
  async handleTicketSelect(interaction) {
    const value = interaction.values[0];

    // Map category values to clean human-readable names & prefixes
    const categoryMap = {
      main_internal_max: { name: 'Internal Max', prefix: 'internal', desc: '🎀 Internal Max VIP Access' },
      main_uid_bypass: { name: 'UID Bypass', prefix: 'bypass', desc: '🎀 Advanced UID Bypass' },
      main_external_panel: { name: 'External Panel', prefix: 'external', desc: '🎀 External Panel Edition' },
      main_emote_panel: { name: 'Emote Panel', prefix: 'emote', desc: '🎀 Emote Panel Unlock' },
      main_streamer_panel: { name: 'Streamer Panel', prefix: 'streamer', desc: '🎀 Streamer Edition Panel' },
      main_account_buy: { name: 'Main Account Buy', prefix: 'acc', desc: '👑 Buy Verified Main Account' },
      main_account_info: { name: 'Main Account Info', prefix: 'acc', desc: '📋 Main Account Inquiries' },
      brutal_panel_buy: { name: 'Brutal Panel Buy', prefix: 'brutal', desc: '⚡ Buy Brutal Panel VIP License' },
      brutal_panel_renew: { name: 'Brutal Panel Renew', prefix: 'brutal', desc: '🔄 Brutal Panel Renewal' },
      client_support_payment: { name: 'Payment Support', prefix: 'pay', desc: '💳 Payment Verification' },
      client_support_tech: { name: 'Client Support', prefix: 'sup', desc: '💬 Technical Support' },
      become_staff_apply: { name: 'Staff Application', prefix: 'staff', desc: '🛡️ Apply For Staff' },
      become_staff_helper: { name: 'Helper Application', prefix: 'helper', desc: '🤝 Apply For Helper' },
      free_panel_claim: { name: 'Free Panel Claim', prefix: 'free', desc: '🎁 Free Panel Claim' },
      free_panel_info: { name: 'Free Panel Info', prefix: 'free', desc: '📋 Free Panel Inquiries' }
    };

    let categoryInfo = categoryMap[value];

    if (!categoryInfo && interaction.component?.options) {
      const selectedOption = interaction.component.options.find((o) => o.value === value);
      if (selectedOption) {
        const label = selectedOption.label || value;
        const emoji = selectedOption.emoji?.name || '';
        const cleanPrefix = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'ticket';
        categoryInfo = {
          name: label,
          prefix: cleanPrefix,
          desc: `${emoji} ${label}`.trim()
        };
      }
    }

    if (!categoryInfo) {
      categoryInfo = { name: value, prefix: 'ticket', desc: value };
    }

    return this.createTicketForUser(interaction, categoryInfo);
  },

  /**
   * Handles Ticket Buttons (Close, Claim, Transcript, Delete, Reopen)
   */
  async handleTicketButton(interaction) {
    const customId = interaction.customId;
    const channel = interaction.channel;
    const guild = interaction.guild;
    const user = interaction.user;

    // 0. CREATE TICKET BUTTON CLICKED FROM PANEL (Dynamic label & emoji)
    if (customId.startsWith('ticket_btn_create')) {
      const buttonLabel = interaction.component?.label || 'General Support';
      const buttonEmoji = interaction.component?.emoji?.name || '🎟️';
      const cleanPrefix = buttonLabel.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'ticket';
      return this.createTicketForUser(interaction, {
        name: buttonLabel,
        prefix: cleanPrefix,
        desc: `${buttonEmoji} ${buttonLabel}`.trim()
      });
    }

    const data = loadTicketData();
    const ticketInfo = data.activeTickets[channel.id];

    // 1. CLOSE TICKET
    if (customId.startsWith('ticket_btn_close_')) {
      await interaction.deferReply();

      if (ticketInfo?.userId) {
        await channel.permissionOverwrites.edit(ticketInfo.userId, {
          SendMessages: false
        }).catch(() => {});
      }

      if (ticketInfo) {
        ticketInfo.closed = true;
        ticketInfo.closedBy = user.tag;
        ticketInfo.closedAt = new Date().toISOString();
        saveTicketData(data);
      }

      const closedEmbed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🔒 Ticket Closed')
        .setDescription(
          `This ticket was closed by ${user}!\n` +
          `Ticket creator permissions have been locked.\n\n` +
          `Click **Delete Ticket** to remove this channel permanently.`
        )
        .setTimestamp();

      const closedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_btn_reopen_${channel.id}`)
          .setLabel('Reopen Ticket')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ticket_btn_transcript_${channel.id}`)
          .setLabel('Save Transcript')
          .setEmoji('📑')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_btn_delete_${channel.id}`)
          .setLabel('Delete Ticket')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.editReply({
        embeds: [closedEmbed],
        components: [closedRow]
      });
    }

    // 2. REOPEN TICKET
    if (customId.startsWith('ticket_btn_reopen_')) {
      await interaction.deferReply();

      if (ticketInfo?.userId) {
        await channel.permissionOverwrites.edit(ticketInfo.userId, {
          SendMessages: true
        }).catch(() => {});
      }

      if (ticketInfo) {
        ticketInfo.closed = false;
        saveTicketData(data);
      }

      const reopenEmbed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🔓 Ticket Reopened')
        .setDescription(`This ticket was reopened by ${user}. Chat has been re-enabled for the creator!`)
        .setTimestamp();

      return interaction.editReply({ embeds: [reopenEmbed] });
    }

    // 3. CLAIM TICKET
    if (customId.startsWith('ticket_btn_claim_')) {
      if (ticketInfo?.claimedBy) {
        return interaction.reply({
          content: `⚠️ This ticket has already been claimed by **${ticketInfo.claimedBy}**!`,
          ephemeral: true
        });
      }

      if (ticketInfo) {
        ticketInfo.claimedBy = user.tag;
        saveTicketData(data);
      }

      const claimEmbed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('🙋 Ticket Claimed')
        .setDescription(`**${user}** has claimed this ticket and will be your dedicated support agent!`)
        .setTimestamp();

      return interaction.reply({ embeds: [claimEmbed] });
    }

    // 4. TRANSCRIPT
    if (customId.startsWith('ticket_btn_transcript_')) {
      await interaction.deferReply();

      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const transcriptLines = [];
        transcriptLines.push(`=======================================================`);
        transcriptLines.push(`TICKET TRANSCRIPT: #${channel.name}`);
        transcriptLines.push(`GUILD: ${guild.name} (${guild.id})`);
        transcriptLines.push(`EXPORTED AT: ${new Date().toLocaleString('en-IN')}`);
        transcriptLines.push(`=======================================================\n`);

        const sorted = Array.from(messages.values()).reverse();
        for (const msg of sorted) {
          const author = msg.author?.tag || 'Unknown';
          const time = new Date(msg.createdTimestamp).toLocaleString('en-IN');
          const content = msg.content || (msg.embeds.length > 0 ? '[Embed]' : '[Attachment]');
          transcriptLines.push(`[${time}] ${author}: ${content}`);
        }

        const buffer = Buffer.from(transcriptLines.join('\n'), 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });

        return interaction.editReply({
          content: '📑 Ticket transcript generated successfully:',
          files: [attachment]
        });
      } catch (e) {
        return interaction.editReply({ content: `Failed to create transcript: ${e.message}` });
      }
    }

    // 5. DELETE TICKET
    if (customId.startsWith('ticket_btn_delete_')) {
      await interaction.reply({
        content: '⚠️ **Ticket will be permanently deleted in 5 seconds...**'
      });

      if (ticketInfo) {
        delete data.activeTickets[channel.id];
        saveTicketData(data);
      }

      setTimeout(async () => {
        try {
          await channel.delete(`[TICKET DELETED] by ${user.tag}`);
        } catch (e) {}
      }, 5000);
    }
  }
};

module.exports = ticketManager;
