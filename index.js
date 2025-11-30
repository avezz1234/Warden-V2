const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');
const { BOT_TOKEN } = require('./constants');

const DM_FORWARD_CHANNEL_ID = '1406351476439126179';
const COMMAND_LOG_CHANNEL_ID = '1406351476439126178';

const dmForwardState = new Map();

if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error('Please set BOT_TOKEN in constants.js before starting the bot.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const command = require(fullPath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[WARNING] The command at ${fullPath} is missing a required "data" or "execute" property.`);
      }
    }
  }
}

const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

async function logCommandUsage(interaction) {
  try {
    const logChannel = await interaction.client.channels.fetch(COMMAND_LOG_CHANNEL_ID);
    if (!logChannel || !logChannel.isTextBased()) {
      console.warn('[command-log] Log channel not found or not text-based');
      return;
    }

    const user = interaction.user ?? interaction.member?.user ?? null;
    const userTag = user ? user.tag : 'Unknown';
    const userId = user ? user.id : 'Unknown';

    const location = interaction.guild
      ? `#${interaction.channel?.name ?? 'unknown-channel'} (${interaction.channelId}) in guild ${interaction.guild.name} (${interaction.guildId})`
      : `DM (${interaction.channelId})`;

    const optionsData = interaction.options?.data ?? [];
    const optionsSummary = optionsData.length
      ? optionsData.map(option => `${option.name}: ${option.value ?? '[subcommand]'}`).join(', ')
      : 'None';

    const embed = new EmbedBuilder()
      .setTitle('Command Used')
      .setColor(0x2b2d31)
      .addFields(
        { name: 'Command', value: `/${interaction.commandName}`, inline: true },
        { name: 'User', value: `${userTag} (${userId})`, inline: true },
        { name: 'Location', value: location, inline: false },
        { name: 'Options', value: optionsSummary.slice(0, 1024), inline: false },
      )
      .setTimestamp(interaction.createdAt ?? new Date());

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[command-log] Failed to log command usage:', error);
  }
}

async function appendDmToGroupedEmbed(message) {
  const forwardChannel = await message.client.channels.fetch(DM_FORWARD_CHANNEL_ID);
  if (!forwardChannel || !forwardChannel.isTextBased()) {
    console.warn('[dm-forward] Forward channel not found or not text-based');
    return;
  }

  const rawContent = (message.content || '').trim();
  const safeContent = rawContent || '(no text content)';
  const createdAtUnix = Math.floor(message.createdTimestamp / 1000);
  const userId = message.author.id;
  const maxUniquePhrasesPerEmbed = 5;

  const formatDescription = entries =>
    entries
      .map(entry => {
        const base = `• <t:${entry.lastAt}:T> — ${entry.text}`;
        return entry.count > 1 ? `${base} x${entry.count}` : base;
      })
      .join('\n');

  let state = dmForwardState.get(userId) || null;
  let existingMessage = null;

  if (state && state.messageId) {
    try {
      existingMessage = await forwardChannel.messages.fetch(state.messageId);
    } catch (error) {
      console.warn('[dm-forward] Stored DM embed not found, starting a new one instead:', error);
      state = null;
      dmForwardState.delete(userId);
    }
  }

  if (!state || !existingMessage) {
    const entries = [{ text: safeContent, count: 1, lastAt: createdAtUnix }];
    const description = formatDescription(entries);

    const embed = new EmbedBuilder()
      .setTitle(`DMs from ${message.author.tag}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'User', value: `${message.author.tag}`, inline: true },
        { name: 'UID', value: `${message.author.id}`, inline: true },
      )
      .setDescription(description)
      .setTimestamp();

    const sent = await forwardChannel.send({ embeds: [embed] });
    dmForwardState.set(userId, { messageId: sent.id, entries });
    return;
  }

  const entries = Array.isArray(state.entries) ? [...state.entries] : [];
  const existingEntry = entries.find(entry => entry.text === safeContent);

  if (existingEntry) {
    existingEntry.count += 1;
    existingEntry.lastAt = createdAtUnix;
  } else {
    if (entries.length >= maxUniquePhrasesPerEmbed) {
      const newEntries = [{ text: safeContent, count: 1, lastAt: createdAtUnix }];
      const description = formatDescription(newEntries);

      const embed = new EmbedBuilder()
        .setTitle(`DMs from ${message.author.tag}`)
        .setColor(0x5865f2)
        .addFields(
          { name: 'User', value: `${message.author.tag}`, inline: true },
          { name: 'UID', value: `${message.author.id}`, inline: true },
        )
        .setDescription(description)
        .setTimestamp();

      const sent = await forwardChannel.send({ embeds: [embed] });
      dmForwardState.set(userId, { messageId: sent.id, entries: newEntries });
      return;
    }

    entries.push({ text: safeContent, count: 1, lastAt: createdAtUnix });
  }

  let description = formatDescription(entries);

  if (description.length > 3800) {
    const newEntries = [{ text: safeContent, count: 1, lastAt: createdAtUnix }];
    const newDescription = formatDescription(newEntries);

    const embed = new EmbedBuilder()
      .setTitle(`DMs from ${message.author.tag}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'User', value: `${message.author.tag}`, inline: true },
        { name: 'UID', value: `${message.author.id}`, inline: true },
      )
      .setDescription(newDescription)
      .setTimestamp();

    const sent = await forwardChannel.send({ embeds: [embed] });
    dmForwardState.set(userId, { messageId: sent.id, entries: newEntries });
    return;
  }

  try {
    const embed = new EmbedBuilder()
      .setTitle(`DMs from ${message.author.tag}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'User', value: `${message.author.tag}`, inline: true },
        { name: 'UID', value: `${message.author.id}`, inline: true },
      )
      .setDescription(description)
      .setTimestamp();

    await existingMessage.edit({ embeds: [embed] });
    dmForwardState.set(userId, { messageId: existingMessage.id, entries });
  } catch (error) {
    console.warn('[dm-forward] Failed to edit existing DM embed, sending a new one instead:', error);

    const newEntries = [{ text: safeContent, count: 1, lastAt: createdAtUnix }];
    const newDescription = formatDescription(newEntries);

    const embed = new EmbedBuilder()
      .setTitle(`DMs from ${message.author.tag}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'User', value: `${message.author.tag}`, inline: true },
        { name: 'UID', value: `${message.author.id}`, inline: true },
      )
      .setDescription(newDescription)
      .setTimestamp();

    const sent = await forwardChannel.send({ embeds: [embed] });
    dmForwardState.set(userId, { messageId: sent.id, entries: newEntries });
  }
}

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
    await logCommandUsage(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
    }
  }
});
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.guild) return;

  try {
    console.log('[dm-forward] Received DM from', message.author.tag, message.author.id);
    await appendDmToGroupedEmbed(message);
  } catch (error) {
    console.error('[dm-forward] Failed to forward DM:', error);
  }
});

client.login(BOT_TOKEN);
