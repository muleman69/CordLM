const { DateTime } = require('luxon');

class ChannelAnalyzer {
  static async analyzeMessages(messages, options = {}) {
    const analysis = {
      messageCount: messages.size,
      userStats: new Map(),
      timeStats: {
        mostActiveHour: null,
        mostActiveDay: null,
      },
      contentStats: {
        avgMessageLength: 0,
        topEmojis: new Map(),
        links: [],
        attachments: 0,
      },
      keywordFrequency: new Map(),
    };

    let totalLength = 0;
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    messages.forEach(msg => {
      // User statistics
      if (!analysis.userStats.has(msg.author.id)) {
        analysis.userStats.set(msg.author.id, {
          username: msg.author.username,
          messageCount: 0,
          totalLength: 0,
          attachments: 0,
        });
      }
      const userStats = analysis.userStats.get(msg.author.id);
      userStats.messageCount++;
      userStats.totalLength += msg.content.length;
      userStats.attachments += msg.attachments.size;

      // Time analysis
      const timestamp = DateTime.fromJSDate(msg.createdAt);
      hourCounts[timestamp.hour]++;
      dayCounts[timestamp.weekday % 7]++;

      // Content analysis
      totalLength += msg.content.length;
      if (msg.attachments.size > 0) {
        analysis.contentStats.attachments += msg.attachments.size;
      }

      // Extract links
      const links = msg.content.match(/https?:\/\/[^\s]+/g);
      if (links) {
        analysis.contentStats.links.push(...links);
      }

      // Emoji analysis
      const emojis = msg.content.match(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}]/gu);
      if (emojis) {
        emojis.forEach(emoji => {
          analysis.contentStats.topEmojis.set(emoji, 
            (analysis.contentStats.topEmojis.get(emoji) || 0) + 1);
        });
      }

      // Keyword frequency (simple word count)
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Skip short words
          analysis.keywordFrequency.set(word,
            (analysis.keywordFrequency.get(word) || 0) + 1);
        }
      });
    });

    // Calculate averages and sort data
    analysis.contentStats.avgMessageLength = totalLength / messages.size;
    analysis.timeStats.mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
    analysis.timeStats.mostActiveDay = dayCounts.indexOf(Math.max(...dayCounts));

    // Sort and limit data for readability
    analysis.keywordFrequency = new Map([...analysis.keywordFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10));

    return this.formatAnalysis(analysis);
  }

  static formatAnalysis(analysis) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let report = '📊 **Channel Analysis Report**\n\n';

    // General Stats
    report += '**📈 General Statistics**\n';
    report += `• Total Messages: ${analysis.messageCount}\n`;
    report += `• Average Message Length: ${Math.round(analysis.contentStats.avgMessageLength)} characters\n`;
    report += `• Total Attachments: ${analysis.contentStats.attachments}\n\n`;

    // Time Stats
    report += '**⏰ Activity Patterns**\n';
    report += `• Most Active Hour: ${analysis.timeStats.mostActiveHour}:00\n`;
    report += `• Most Active Day: ${days[analysis.timeStats.mostActiveDay]}\n\n`;

    // Top Contributors
    report += '**👥 Top Contributors**\n';
    const topUsers = [...analysis.userStats.values()]
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);
    
    topUsers.forEach((user, index) => {
      report += `${index + 1}. ${user.username}: ${user.messageCount} messages\n`;
    });
    report += '\n';

    // Top Keywords
    report += '**🔍 Most Used Keywords**\n';
    [...analysis.keywordFrequency.entries()]
      .slice(0, 5)
      .forEach(([word, count]) => {
        report += `• "${word}": ${count} times\n`;
      });
    report += '\n';

    // Emoji Usage
    if (analysis.contentStats.topEmojis.size > 0) {
      report += '**😀 Most Used Emojis**\n';
      [...analysis.contentStats.topEmojis.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([emoji, count]) => {
          report += `${emoji}: ${count} times\n`;
        });
    }

    return report;
  }
}

module.exports = ChannelAnalyzer; 