const { SlashCommandBuilder } = require('discord.js');
const { handleDMResponse } = require('../utils/dmHandler');
const { fetchMessages } = require('../utils/messageUtils');
const logger = require('../config/logger');

async function searchMessages(messages, keyword) {
  const results = [];
  const keywordLower = keyword.toLowerCase();
  let contextWindow = 2; // Number of messages before and after for context

  // First pass: find matching messages and their indices
  const matchingIndices = messages.reduce((acc, msg, index) => {
    if (msg.content.toLowerCase().includes(keywordLower)) {
      acc.push(index);
    }
    return acc;
  }, []);

  // Second pass: build results with context
  matchingIndices.forEach(index => {
    const contextMessages = [];
    const start = Math.max(0, index - contextWindow);
    const end = Math.min(messages.length - 1, index + contextWindow);

    for (let i = start; i <= end; i++) {
      const msg = messages[i];
      const isMatch = i === index;
      const timestamp = msg.createdAt.toLocaleString();
      
      let content = msg.content;
      if (isMatch) {
        // Highlight the keyword in the matching message
        const regex = new RegExp(`(${keyword})`, 'gi');
        content = content.replace(regex, '**$1**');
      }

      contextMessages.push({
        content,
        author: msg.author.username,
        timestamp,
        isMatch
      });
    }

    results.push(contextMessages);
  });

  // Format the results
  let report = `🔍 **Search Results for "${keyword}"**\n`;
  report += `Found ${matchingIndices.length} matches\n\n`;

  results.forEach((context, i) => {
    report += `**Match ${i + 1}/${matchingIndices.length}**\n`;
    context.forEach(msg => {
      const prefix = msg.isMatch ? '➡️' : '  ';
      report += `${prefix} ${msg.author} (${msg.timestamp}):\n${msg.content}\n`;
    });
    report += '\n';
  });

  if (results.length === 0) {
    report += 'No messages found containing this keyword.\n';
  }

  return report;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for specific topics or keywords')
    .addStringOption(option =>
      option.setName('keyword')
        .setDescription('Keyword or phrase to search for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Maximum number of messages to search through')
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(1000)),

  async execute(interaction) {
    const keyword = interaction.options.getString('keyword');
    const limit = interaction.options.getInteger('limit') || 100;

    try {
      await interaction.deferReply({ ephemeral: true });
      
      await interaction.editReply({
        content: `🔍 Searching for "${keyword}" in the last ${limit} messages...`,
        ephemeral: true
      });

      const messages = await fetchMessages(interaction.channel, limit);
      
      if (messages.length === 0) {
        await interaction.editReply({
          content: 'No messages found in this channel.',
          ephemeral: true
        });
        return;
      }

      const results = await searchMessages(messages, keyword);
      await handleDMResponse(interaction, results);

      logger.info(`Searched for "${keyword}" in ${messages.length} messages for user ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in search command:', error);
      await interaction.editReply({
        content: 'An error occurred while searching messages. Please try again later.',
        ephemeral: true
      });
    }
  },
}; 