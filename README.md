# Discord moderation / utility bot

Minimal Discord bot built on **Node.js** and **discord.js v14**. Focuses on moderation tools, DM forwarding, and debugging.

## Config surface

Edit these before running:

- `constants.js`
  - `BOT_TOKEN`
  - `CLIENT_ID`
  - `GUILD_ID`

- `index.js`
  - `DM_FORWARD_CHANNEL_ID`
  - `COMMAND_LOG_CHANNEL_ID`

- `commands/moderation/warn.js`
  - `WARN_TTL_DAYS`

## Behavior snapshot

- Slash commands:
  - Moderation: `/ban`, `/kick`, `/mute`, `/warn`, `/getinfo`, `/dm`
  - Debug / misc: `/ping`, `/help`, `/roll`, `/echo`
- DMs to the bot → forwarded to `DM_FORWARD_CHANNEL_ID`:
  - One rolling embed per user.
  - Up to 5 distinct phrases per embed.
  - Repeated phrases are compressed as `xN`.
- Every successful slash command → logged as an embed in `COMMAND_LOG_CHANNEL_ID`.
- Warns are stored per guild/user in `data/warnings.json` with TTL = `WARN_TTL_DAYS`.

## Runbook (minimal)

```bash
npm install
npm run deploy-commands   # once per guild / command change
npm start
```

Assumes you already know how to get a bot token / IDs from the Discord Developer Portal and how to manage secrets (don’t commit real tokens).
