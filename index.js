const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Add environment check logging
console.log('Environment check:', {
  node_env: process.env.NODE_ENV,
  has_openai_key: !!process.env.OPENAI_API_KEY,
  key_starts_with: process.env.OPENAI_API_KEY?.substring(0, 8)
});

const logger = require('./src/config/logger');

// Create a new client instance with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ]
});

// Create commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'src', 'commands');
logger.info(`Loading commands from: ${commandsPath}`);
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

logger.info(`Found command files: ${commandFiles.join(', ')}`);

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  } else {
    logger.warn(`Invalid command file: ${filePath}`);
  }
}

// Create REST instance for registering commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  logger.info(`Logged in as ${client.user.tag}`);
  
  try {
    // List all registered commands
    const commands = await client.application.commands.fetch();
    logger.info('Registered commands:', commands.map(cmd => cmd.name));

    // Get the guild
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
      logger.error('Guild not found! Make sure GUILD_ID is correct in .env');
      return;
    }

    logger.info(`Registering commands for guild: ${guild.name} (${guild.id})`);
    
    // Get all command data
    const commandData = Array.from(client.commands.values()).map(command => command.data.toJSON());
    logger.info(`Registering commands: ${commandData.map(cmd => cmd.name).join(', ')}`);

    // Register commands with Discord
    const data = await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commandData },
    );

    logger.info(`Successfully registered ${data.length} application commands.`);
  } catch (error) {
    logger.error('Error registering commands:', error);
  }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  logger.info(`Received interaction of type: ${interaction.type} - Command: ${interaction.commandName}`);
  
  if (!interaction.isCommand()) {
    logger.debug('Interaction is not a command, ignoring');
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.error(`Command not found: ${interaction.commandName}`);
    return;
  }

  try {
    logger.info(`Executing command: ${interaction.commandName}`);
    await command.execute(interaction);
    logger.info(`Command executed successfully: ${interaction.commandName}`);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorMessage = 'There was an error executing this command!';
    if (interaction.deferred) {
      await interaction.editReply({ content: errorMessage, ephemeral: true });
    } else if (interaction.replied) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Login to Discord
logger.info('Attempting to log in to Discord...');
client.login(process.env.DISCORD_TOKEN)
  .then(() => logger.info('Successfully logged in to Discord'))
  .catch(error => {
    logger.error('Failed to login:', error);
    process.exit(1);
  }); 