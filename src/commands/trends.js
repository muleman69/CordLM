const { SlashCommandBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const { handleDMResponse } = require('../utils/dmHandler');
const { fetchMessages } = require('../utils/messageUtils');
const logger = require('../config/logger');

async function analyzeTrends(messages, timeframe) {
  const now = DateTime.now();
  const periods = {
    '24h': { unit: 'hour', count: 24, format: 'HH:00' },
    '7d': { unit: 'day', count: 7, format: 'ccc' },
    '30d': { unit: 'day', count: 30, format: 'LLL d' }
  };

  const period = periods[timeframe];
  const buckets = new Array(period.count).fill(0);
  const userActivity = new Map();
  const contentTypes = { text: 0, attachments: 0, links: 0, reactions: 0 };

  messages.forEach(msg => {
    const msgTime = DateTime.fromJSDate(msg.createdAt);
    const diff = now.diff(msgTime, period.unit).toObject()[period.unit];
    const index = Math.floor(diff);
    
    if (index < period.count) {
      buckets[index]++;

      // Track user activity
      userActivity.set(msg.author.id, (userActivity.get(msg.author.id) || 0) + 1);

      // Track content types
      contentTypes.text += msg.content.length > 0 ? 1 : 0;
      contentTypes.attachments += msg.attachments.size;
      contentTypes.links += (msg.content.match(/https?:\/\/[^\s]+/g) || []).length;
      contentTypes.reactions += msg.reactions.cache.reduce((acc, reaction) => acc + reaction.count, 0);
    }
  });

  // Format the report
  let report = `📈 **Channel Trends Analysis (Last ${timeframe === '24h' ? '24 Hours' : 
    timeframe === '7d' ? 'Week' : 'Month'})**\n\n`;

  // Activity Timeline
  report += '**📊 Activity Timeline**\n';
  const timeLabels = [...Array(period.count)].map((_, i) => 
    DateTime.now().minus({ [period.unit]: i }).toFormat(period.format)
  ).reverse();

  buckets.reverse().forEach((count, i) => {
    const bar = '█'.repeat(Math.ceil(count / Math.max(...buckets) * 10));
    report += `${timeLabels[i]}: ${bar} (${count})\n`;
  });
  report += '\n';

  // User Engagement
  const topUsers = [...userActivity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  report += '**👥 Most Active Users**\n';
  for (const [userId, count] of topUsers) {
    const user = messages.find(m => m.author.id === userId)?.author;
    if (user) {
      report += `• ${user.username}: ${count} messages\n`;
    }
  }
  report += '\n';

  // Content Distribution
  report += '**📝 Content Distribution**\n';
  const total = messages.size;
  report += `• Text Messages: ${contentTypes.text} (${Math.round(contentTypes.text/total*100)}%)\n`;
  report += `• Attachments: ${contentTypes.attachments}\n`;
  report += `• Links Shared: ${contentTypes.links}\n`;
  report += `• Reactions: ${contentTypes.reactions}\n`;

  return report;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trends')
    .setDescription('Analyze channel trends over time')
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('Time period to analyze')
        .setRequired(true)
        .addChoices(
          { name: 'Last 24 Hours', value: '24h' },
          { name: 'Last Week', value: '7d' },
          { name: 'Last Month', value: '30d' }
        )),

  async execute(interaction) {
    const timeframe = interaction.options.getString('timeframe');
    const messageLimit = timeframe === '24h' ? 1000 : timeframe === '7d' ? 5000 : 10000;

    try {
      await interaction.deferReply({ ephemeral: true });
      
      await interaction.editReply({
        content: '📈 Analyzing channel trends... This may take a moment.',
        ephemeral: true
      });

      const messages = await fetchMessages(interaction.channel, messageLimit);
      
      if (messages.length === 0) {
        await interaction.editReply({
          content: 'No messages found in this channel.',
          ephemeral: true
        });
        return;
      }

      const analysis = await analyzeTrends(messages, timeframe);
      await handleDMResponse(interaction, analysis);

      logger.info(`Analyzed trends for ${timeframe} for user ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in trends command:', error);
      await interaction.editReply({
        content: 'An error occurred while analyzing trends. Please try again later.',
        ephemeral: true
      });
    }
  },
}; 