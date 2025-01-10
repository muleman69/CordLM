const { SlashCommandBuilder } = require('discord.js');
const logger = require('../config/logger');
const { summarizeRateLimiter } = require('../config/rateLimiter');
const { fetchMessages } = require('../utils/messageUtils');
const { handleDMResponse } = require('../utils/dmHandler');
const aiService = require('../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Get an AI-powered summary of recent messages')
    .addIntegerOption(option =>
      option
        .setName('messages')
        .setDescription('Number of messages to summarize')
        .setRequired(true)
        .setMinValue(10)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    logger.info('Summarize command started', {
      userId: interaction.user.id,
      channelId: interaction.channel.id,
      messageCount: interaction.options.getInteger('messages')
    });

    const messageCount = interaction.options.getInteger('messages');
    const userId = interaction.user.id;

    try {
      // Check rate limit
      await summarizeRateLimiter.consume(userId);
      
      // Acknowledge the command
      await interaction.deferReply({ ephemeral: true });
      
      // Inform user we're working
      await interaction.editReply({
        content: `📝 Analyzing ${messageCount} messages... This may take a moment.`,
        ephemeral: true
      });

      // Fetch messages
      const messages = await fetchMessages(interaction.channel, messageCount);
      
      if (!messages || messages.length === 0) {
        await interaction.editReply({
          content: 'No messages found in this channel.',
          ephemeral: true
        });
        return;
      }

      // Generate AI summary
      const summary = await aiService.summarizeMessages(messages);

      // Format the response
      const response = [
        `📊 Summary of the last ${messages.length} messages in #${interaction.channel.name}:\n`,
        summary
      ].join('\n');

      // Send response via DM
      await handleDMResponse(interaction, [response]);

      logger.info(`Summarized ${messages.length} messages for user ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in summarize command:', {
        error: error.message,
        userId: interaction.user.id,
        channelId: interaction.channel.id
      });

      const errorMessage = error.code === 50013
        ? 'I don\'t have permission to read messages in this channel.'
        : error.code === 'RLIMIT'
          ? 'You\'re using this command too frequently. Please wait a minute and try again.'
          : 'Failed to generate summary. Please try again later.';

      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
}; 