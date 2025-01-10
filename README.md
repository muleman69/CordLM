# Discord Summary Bot

A Discord bot that summarizes channel content and provides interactive features using AI.

## Features (Phase 1)
- `/summarize` - Summarize the last N messages in a channel
- `/help` - Display list of available commands

## Setup Instructions

1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a Discord Application and Bot:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the Bot section and create a bot
   - Copy the bot token

5. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Add your Discord bot token to `DISCORD_TOKEN`
   - Add your Discord server ID to `GUILD_ID`

6. Run the bot:
   ```bash
   node index.js
   ```

## Required Permissions
The bot needs the following permissions:
- Read Messages/View Channels
- Send Messages
- Read Message History
- Use Slash Commands

## Development Phases
- Phase 1: Basic Bot Setup (Current)
- Phase 2: AI Integration (Upcoming)
- Phase 3: Enhanced Features (Planned) 