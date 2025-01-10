const { SlashCommandBuilder } = require('discord.js');
const { handleDMResponse } = require('../utils/dmHandler');
const ChannelAnalyzer = require('../utils/analysisHandler');
const { fetchMessages } = require('../utils/messageUtils');
const logger = require('../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Perform detailed analysis of channel messages')
    .addIntegerOption(option =>
      option
        .setName('messages')
        .setDescription('Number of messages to analyze')
        .setRequired(true)
        .setMinValue(10)
        .setMaxValue(1000)),

  async execute(interaction) {
    const messageCount = interaction.options.getInteger('messages');

    try {
      await interaction.deferReply({ ephemeral: true });
      
      logger.info(`Starting analysis for ${messageCount} messages in channel ${interaction.channel.name} (${interaction.channel.id})`);
      
      // Check bot permissions
      const permissions = interaction.channel.permissionsFor(interaction.client.user);
      logger.info(`Bot permissions in channel: ${JSON.stringify(permissions.serialize())}`);
      
      if (!permissions.has(['ViewChannel', 'ReadMessageHistory'])) {
        logger.error('Missing required permissions:', {
          channel: interaction.channel.id,
          permissions: permissions.serialize()
        });
        await interaction.editReply({
          content: 'I don\'t have permission to read messages in this channel. Please make sure I have the "View Channel" and "Read Message History" permissions.',
          ephemeral: true
        });
        return;
      }

      await interaction.editReply({
        content: `📊 Analyzing ${messageCount} messages... This may take a moment.`,
        ephemeral: true
      });

      const messages = await fetchMessages(interaction.channel, messageCount);
      
      if (!messages || messages.length === 0) {
        logger.info('No messages found in channel');
        await interaction.editReply({
          content: 'No messages found in this channel.',
          ephemeral: true
        });
        return;
      }

      logger.info(`Successfully fetched ${messages.length} messages, starting analysis`);
      const analysis = await ChannelAnalyzer.analyzeMessages(messages);
      
      logger.info('Analysis complete, sending results via DM');
      await handleDMResponse(interaction, analysis);

      logger.info(`Analyzed ${messages.length} messages for user ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in analyze command:', {
        error: error.message,
        code: error.code,
        status: error.status,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id
      });

      const errorMessage = error.code === 50001 
        ? 'I don\'t have permission to read messages in this channel. Please make sure I have the correct permissions.'
        : error.code === 50013
          ? 'I don\'t have permission to perform this action. Please check my role permissions.'
          : 'An error occurred while analyzing messages. Please try again later.';

      await interaction.editReply({
        content: errorMessage,
        ephemeral: true
      });
    }
  },
}; 