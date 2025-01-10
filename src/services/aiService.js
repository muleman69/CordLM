const OpenAI = require('openai');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.openai = null;
    this.initializeOpenAI();
  }

  initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY not found in environment variables');
      throw new Error('OPENAI_API_KEY is required but not found in environment variables');
    }

    // Add logging to check API key format
    logger.info('API Key check:', {
      expected_prefix: apiKey.substring(0, 8), // Should show "sk-proj-"
      length: apiKey.length
    });

    try {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
      
      logger.info('OpenAI client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI client:', error);
      throw error;
    }
  }

  async summarizeMessages(messages) {
    try {
      logger.info('summarizeMessages called with', {
        messageCount: messages.length
      });

      if (!this.openai) {
        this.initializeOpenAI();
      }

      // Format messages for the AI
      logger.debug('Formatting messages for OpenAI');
      const formattedMessages = messages.map(msg => ({
        role: 'user',
        content: `${msg.author.username}: ${msg.content}`
      }));

      // Add system message to guide the AI
      const systemMessage = {
        role: 'system',
        content: `You are a helpful Discord chat summarizer. Your task is to analyze the conversation and provide:
1. A concise summary of the main topics and discussions
2. Key points and decisions made
3. Important questions raised or issues discussed
4. Notable links or resources shared
5. Action items or next steps mentioned

Focus on the substance of the conversation and extract meaningful insights. Ignore casual chatter unless it's relevant to the main discussion.
Format the response in clear sections with bullet points for easy reading.`
      };

      logger.debug('Making API call to OpenAI');
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [systemMessage, ...formattedMessages],
        temperature: 0.7,
        max_tokens: 1000
      });

      logger.debug('Successfully received OpenAI response');
      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error in AI summarization:', {
        error: error.message,
        name: error.name,
        status: error.status,
        stack: error.stack
      });

      if (error.status === 401) {
        throw new Error('OpenAI authentication failed. Check API key format and permissions.');
      }
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }
}

module.exports = new AIService();