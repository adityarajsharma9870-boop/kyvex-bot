const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder
} = require('discord.js');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config');

/**
 * Builds standard NPCI-compliant UPI URI
 * e.g. upi://pay?pa=aditya@paytm&pn=Aditya&am=100.00&cu=INR&tn=VIP%20Role
 */
function buildUpiUri(upiId, name, amount, note) {
  const cleanUpi = upiId.trim();
  const payeeName = (name && name.trim()) ? name.trim() : cleanUpi.split('@')[0];

  let uri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(payeeName).replace(/\+/g, '%20')}`;

  if (amount && Number(amount) > 0) {
    uri += `&am=${Number(amount).toFixed(2)}`;
  }

  uri += '&cu=INR';

  if (note && note.trim()) {
    const cleanNote = note.trim().substring(0, 50);
    uri += `&tn=${encodeURIComponent(cleanNote).replace(/\+/g, '%20')}`;
  }

  return { uri, cleanUpi, payeeName };
}

/**
 * Generates crisp QR code buffer with bot avatar in the center
 */
async function generateQrWithCenterAvatar(uri, avatarUrl) {
  const qrBuffer = await QRCode.toBuffer(uri, {
    type: 'png',
    width: 600,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'H'
  });

  if (!avatarUrl) {
    return qrBuffer;
  }

  try {
    const qrImg = await loadImage(qrBuffer);
    const canvas = createCanvas(qrImg.width, qrImg.height);
    const ctx = canvas.getContext('2d');

    // Draw main QR code
    ctx.drawImage(qrImg, 0, 0, canvas.width, canvas.height);

    // Fetch avatar
    const avatarImg = await loadImage(avatarUrl);

    // Center logo dimensions (18-20% preserves 100% scan reliability with H-level error correction)
    const logoSize = Math.floor(canvas.width * 0.19);
    const x = Math.floor((canvas.width - logoSize) / 2);
    const y = Math.floor((canvas.height - logoSize) / 2);
    const border = 5;

    // White outer border frame
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - border, y - border, logoSize + border * 2, logoSize + border * 2);

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, logoSize, logoSize);

    // Draw avatar image in center
    ctx.drawImage(avatarImg, x, y, logoSize, logoSize);

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error('Could not overlay center avatar on QR code:', err);
    return qrBuffer;
  }
}

/**
 * Generates the clean minimalist UPI Embed matching utility bot style
 */
async function generateUpiPayload({ upiId, name, amount, note, client }) {
  const { uri, cleanUpi, payeeName } = buildUpiUri(upiId, name, amount, note);

  // Retrieve static bot avatar for QR center and footer
  const botAvatarUrl = client.user.displayAvatarURL({
    extension: 'png',
    forceStatic: true,
    size: 256
  });

  const qrBuffer = await generateQrWithCenterAvatar(uri, botAvatarUrl);
  const attachment = new AttachmentBuilder(qrBuffer, { name: 'upi-qr.png' });

  const numAmount = amount ? Number(amount) : null;
  const formattedAmount = numAmount && numAmount > 0 ? `₹${numAmount.toFixed(2)}` : '₹0.00';
  const cleanNote = note && note.trim() ? note.trim().substring(0, 50) : null;

  // Build description matching exact layout:
  // **≈ UPI ID**
  // sovangg67@fam
  //
  // **≈ Amount**
  // ₹350.00
  const descriptionLines = [
    '**≈ UPI ID**',
    cleanUpi,
    '',
    '**≈ Amount**',
    formattedAmount
  ];

  if (cleanNote) {
    descriptionLines.push('', '**≈ Note**', cleanNote);
  }

  const botName = client.user?.username || 'utility';
  const footerText = `The only ${botName} bot you need`;

  const embed = new EmbedBuilder()
    .setColor('#FFFFFF')
    .setTitle('UPI · Payment QR')
    .setDescription(descriptionLines.join('\n'))
    .setImage('attachment://upi-qr.png')
    .setFooter({
      text: footerText,
      iconURL: client.user.displayAvatarURL({ extension: 'png', dynamic: true })
    });

  return { embed, attachment };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upi')
    .setDescription('Generate an instant UPI Payment QR Code')
    .addStringOption((option) =>
      option
        .setName('upi_id')
        .setDescription('Receiver UPI ID (e.g., sovangg67@fam, 9876543210@paytm)')
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName('amount')
        .setDescription('INR (₹) Amount (e.g., 350, 500)')
        .setRequired(false)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName('note')
        .setDescription('Payment transaction note / remark')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Payee Name (optional)')
        .setRequired(false)
    ),

  category: 'info',

  async execute(interaction, client) {
    await interaction.deferReply();

    const rawUpi = interaction.options.getString('upi_id').trim();
    const currentAmount = interaction.options.getNumber('amount');
    const currentNote = interaction.options.getString('note') || '';
    const currentName = interaction.options.getString('name') || '';

    // Validate UPI ID format
    if (!rawUpi.includes('@') || rawUpi.startsWith('@') || rawUpi.endsWith('@')) {
      return interaction.editReply({
        embeds: [
          createErrorEmbed(
            'Invalid UPI ID',
            '❌ Please enter a valid UPI ID (e.g., `yourname@okhdfcbank`, `sovangg67@fam`, `shop@sbi`).'
          )
        ]
      });
    }

    try {
      const payload = await generateUpiPayload({
        upiId: rawUpi,
        name: currentName,
        amount: currentAmount,
        note: currentNote,
        client
      });

      return interaction.editReply({
        embeds: [payload.embed],
        files: [payload.attachment]
      });
    } catch (err) {
      console.error('Error executing UPI command:', err);
      return interaction.editReply({
        embeds: [createErrorEmbed('QR Generation Failed', err.message || 'Could not generate UPI QR Code.')]
      });
    }
  }
};
