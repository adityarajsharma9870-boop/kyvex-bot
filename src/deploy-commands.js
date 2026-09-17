require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error(chalk.red('\n[ERROR] BOT_TOKEN or CLIENT_ID is missing in your .env file!'));
  console.log(chalk.yellow('Please edit the .env file with your Discord Bot credentials first.\n'));
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`${chalk.gray('•')} Loaded command: ${chalk.cyan('/' + command.data.name)}`);
    } else {
      console.warn(chalk.yellow(`[WARN] The command at ${filePath} is missing "data" or "execute".`));
    }
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`\n${chalk.hex('#F1C40F')('Started refreshing')} ${chalk.bold(commands.length)} ${chalk.hex('#F1C40F')('application (/) commands globally...')}`);

    // If a guildId was configured previously, clear its guild commands so there are no duplicate entries
    if (guildId) {
      try {
        console.log(chalk.cyan(`Clearing old guild-specific commands from Guild (${guildId}) to prevent duplicates...`));
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      } catch (clearErr) {
        console.warn(chalk.yellow(`[WARN] Could not clear guild commands for ${guildId}: ${clearErr.message}`));
      }
    }

    // Deploy globally so all servers (present and future) receive all slash commands!
    console.log(chalk.cyan('Deploying application commands GLOBALLY to all servers...'));
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log(chalk.green(`\n✔ Successfully registered ${chalk.bold(data.length)} slash commands globally across ALL servers!\n`));
  } catch (error) {
    console.error(chalk.red('[ERROR] Failed to register slash commands:'), error);
  }
})();
