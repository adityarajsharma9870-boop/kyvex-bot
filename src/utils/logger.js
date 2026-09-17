const chalk = require('chalk');

const formatTime = () => {
  const now = new Date();
  return chalk.gray(`[${now.toLocaleTimeString()}]`);
};

const logger = {
  info: (msg) => {
    console.log(`${formatTime()} ${chalk.cyan('[INFO]')} ${msg}`);
  },
  success: (msg) => {
    console.log(`${formatTime()} ${chalk.green('[SUCCESS]')} ${msg}`);
  },
  warn: (msg) => {
    console.log(`${formatTime()} ${chalk.yellow('[WARN]')} ${msg}`);
  },
  error: (msg, err) => {
    console.error(`${formatTime()} ${chalk.red('[ERROR]')} ${msg}`, err || '');
  },
  music: (msg) => {
    console.log(`${formatTime()} ${chalk.hex('#F1C40F')('[MUSIC]')} ${msg}`);
  },
  ready: (botTag) => {
    console.log(`\n${chalk.hex('#5865F2').bold('==============================================')}`);
    console.log(`${chalk.hex('#5865F2').bold('          KYVEX DISCORD BOT ONLINE            ')}`);
    console.log(`${chalk.hex('#5865F2').bold('==============================================')}`);
    console.log(`${formatTime()} ${chalk.green('✔')} Logged in as: ${chalk.bold.white(botTag)}`);
    console.log(`${formatTime()} ${chalk.green('✔')} Voice DAVE E2EE protocol loaded!`);
    console.log(`${formatTime()} ${chalk.green('✔')} Audio Engine: DisTube v5 + FFmpeg Static`);
    console.log(`${chalk.hex('#F1C40F').bold('==============================================\n')}`);
  }
};

module.exports = logger;
