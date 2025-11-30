const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const WARN_TTL_DAYS = 30;
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const WARN_FILE = path.join(DATA_DIR, 'warnings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadWarnings() {
  ensureDataDir();
  if (!fs.existsSync(WARN_FILE)) return {};

  try {
    const raw = fs.readFileSync(WARN_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Failed to read warnings.json, starting fresh:', error);
    return {};
  }
}

function saveWarnings(store) {
  ensureDataDir();
  try {
    fs.writeFileSync(WARN_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write warnings.json:', error);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Send a warning DM to a member and track active warns.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Member to warn')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(false),
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';

    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const now = Date.now();
    const warnTtlMs = WARN_TTL_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = now + warnTtlMs;
    const expiresAtUnix = Math.floor(expiresAt / 1000);

    const guildId = interaction.guild.id;
    const userId = targetUser.id;

    const store = loadWarnings();
    if (!store[guildId]) store[guildId] = {};
    if (!store[guildId][userId]) store[guildId][userId] = [];

    const existing = store[guildId][userId].filter(entry => {
      if (!entry.expiresAt) return true;
      const ts = Date.parse(entry.expiresAt);
      return Number.isFinite(ts) && ts > now;
    });

    const newWarn = {
      reason,
      issuedBy: interaction.user.id,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };

    existing.push(newWarn);
    store[guildId][userId] = existing;

    const activeCount = existing.length;

    saveWarnings(store);

    try {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`You have been warned in ${interaction.guild.name}`)
          .setColor(0xffcc00)
          .setDescription(reason)
          .addFields(
            { name: 'Active warnings (this server)', value: String(activeCount), inline: true },
            { name: 'Expires', value: `<t:${expiresAtUnix}:F> (<t:${expiresAtUnix}:R>)`, inline: true },
          )
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
      }

      await interaction.editReply(
        `⚠️ Warned **${targetUser.tag}**. Active warnings in this server: ${activeCount}. Expires <t:${expiresAtUnix}:F> (<t:${expiresAtUnix}:R>). Reason: ${reason}`,
      );
    } catch (error) {
      console.error('Error executing /warn:', error);
      await interaction.editReply('There was an error while trying to warn that member.');
    }
  },
};
