# FireMusic Discord Music Bot

FireMusic is a Discord music bot written in Node.js that allows you to play music in your Discord server. It utilizes the Discord.js library for interacting with the Discord API and requires a Discord Bot Token and Client ID.

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/firemusic-bot.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory of the project and add the following:

   ```
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_client_id
   ```

   Replace `your_discord_bot_token` and `your_client_id` with your Discord Bot Token and Client ID.

## Usage

1. Start the bot:

   ```bash
   npm start
   ```

2. Invite the bot to your Discord server using the following link:

   ```
   https://discord.com/oauth2/authorize?client_id=your_client_id&scope=bot&permissions=your_permissions
   ```

   Replace `your_client_id` with your bot's Client ID and `your_permissions` with the necessary bot permissions.

3. Use the bot commands to play music in your server.

## Lavalink Integration

FireMusic uses Lavalink to handle audio playback. Lavalink is a standalone audio sending node based on Lavaplayer and JDA-Audio. It allows for smooth and efficient audio playback in Discord bots.

### Setting Up Lavalink

Setup [Lavalink](https://lavalink.dev/getting-started/index.html).

### Configuring FireMusic to Use Lavalink

1. Update your `lavaConfig.js` file to include Lavalink configuration:

   ```js
   const nodes = {
     host: "loox.kreikels.space",
     port: 27000,
     authenticaion: "betterVenusBot",
     secure: false,
   };
   ```

   Replace `your_lavalink_password` with the password you set in the `application.yml` file.

2. Ensure that your bot code connects to the Lavalink node using these environment variables.
