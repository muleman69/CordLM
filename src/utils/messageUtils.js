const logger = require('../config/logger');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const messageFetchRateLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
});

const MAX_MESSAGE_LENGTH = 1900; // Discord's limit is 2000, leaving room for formatting

/**
 * Fetches messages from a channel with rate limiting
 * @param {TextChannel} channel - Discord channel to fetch messages from
 * @param {number} count - Number of messages to fetch
 * @returns {Promise<Message[]>} Array of messages
 */
async function fetchMessages(channel, count) {
  if (!channel) {
    logger.error('Channel is undefined or null');
    throw new Error('Channel is required');
  }

  if (!count || count < 1) {
    logger.error('Invalid count:', count);
    throw new Error('Count must be a positive number');
  }

  logger.info(`Attempting to fetch ${count} messages from channel ${channel.name} (${channel.id})`);
  logger.info(`Channel permissions for bot: ${JSON.stringify(channel.permissionsFor(channel.client.user))}`);

  const messages = [];
  let lastId = null;
  const CHUNK_SIZE = 100;

  try {
    while (messages.length < count) {
      // Check rate limit before fetching
      await messageFetchRateLimiter.consume('global');

      const options = {
        limit: Math.min(CHUNK_SIZE, count - messages.length),
        ...(lastId && { before: lastId })
      };

      logger.info(`Fetching messages with options: ${JSON.stringify(options)}`);
      const fetchedMessages = await channel.messages.fetch(options);
      
      if (fetchedMessages.size === 0) {
        logger.info('No more messages found');
        break;
      }

      logger.info(`Successfully fetched ${fetchedMessages.size} messages`);
      messages.push(...fetchedMessages.values());
      lastId = fetchedMessages.last()?.id;

      if (fetchedMessages.size < CHUNK_SIZE) {
        logger.info('Reached end of messages');
        break;
      }

      // Add delay between fetches
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    logger.info(`Total messages fetched: ${messages.length}`);
    return messages;
  } catch (error) {
    logger.error('Error fetching messages:', {
      error: error.message,
      code: error.code,
      status: error.status,
      channelId: channel.id,
      guildId: channel.guild.id
    });
    throw error;
  }
}

/**
 * Formats messages into readable chunks
 * @param {Message[]} messages - Array of Discord messages
 * @returns {string[]} Array of formatted message chunks
 */
function formatMessages(messages) {
  if (!Array.isArray(messages)) {
    logger.error('Invalid messages array:', typeof messages);
    throw new Error('Messages must be an array');
  }

  logger.info(`Formatting ${messages.length} messages`);
  const formattedMessages = messages
    .reverse()
    .map(msg => {
      const timestamp = msg.createdAt.toLocaleString();
      const attachments = msg.attachments.size > 0 ? ' [has attachments]' : '';
      const embeds = msg.embeds.length > 0 ? ' [has embeds]' : '';
      const content = msg.content.trim() || '[empty message]';
      return `[${timestamp}] ${msg.author.username}: ${content}${attachments}${embeds}`;
    });

  // Split into chunks if needed
  const chunks = [];
  let currentChunk = '';

  formattedMessages.forEach(line => {
    if (currentChunk.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
      chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  logger.info(`Split messages into ${chunks.length} chunks`);
  return chunks;
}

module.exports = {
  fetchMessages,
  formatMessages,
  MAX_MESSAGE_LENGTH,
}; 