const logger = require('../config/logger');

/**
 * Handles sending a response via DM and providing a confirmation in the channel
 * @param {CommandInteraction} interaction - The interaction to respond to
 * @param {string|string[]} content - The content to send via DM (can be a single message or array of messages)
 */
async function handleDMResponse(interaction, content) {
  try {
    // First, defer the initial reply as ephemeral
    if (!interaction.deferred) {
      await interaction.deferReply({ ephemeral: true });
    }
    
    // Create DM channel and send message(s)
    const dmChannel = await interaction.user.createDM();
    
    if (Array.isArray(content)) {
      for (let i = 0; i < content.length; i++) {
        await dmChannel.send(content[i]);
        if (i < content.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else {
      await dmChannel.send(content);
    }
    
    // Send a discreet confirmation in the channel
    await interaction.editReply({ 
      content: "✅ Check your DMs for the response!", 
      ephemeral: true 
    });

    logger.info(`Sent DM response to user ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error sending DM:', error);
    
    const errorMessage = error.code === 50007
      ? "❌ Unable to send you a DM. Please make sure your DMs are open."
      : "❌ There was an error sending the DM. Please try again later.";
    
    await interaction.editReply({ 
      content: errorMessage,
      ephemeral: true 
    });
  }
}

module.exports = {
  handleDMResponse
}; 