// constants.js

// Fill these in with your own values before running the bot or the deploy-commands script.
// IMPORTANT: Do not commit real tokens to a public repository.

const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';       // Bot token from https://discord.com/developers
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';       // Application (bot) client ID
const GUILD_ID = 'YOUR_GUILD_ID_HERE';         // Development guild ID for registering commands

const DM_FORWARD_CHANNEL_ID = '1406351476439126179';       // Channel that receives forwarded DMs
const COMMAND_LOG_CHANNEL_ID = '1406351476439126178';      // Channel that receives command log embeds

module.exports = {
  BOT_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  DM_FORWARD_CHANNEL_ID,
  COMMAND_LOG_CHANNEL_ID,
};
