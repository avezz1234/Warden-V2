const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const WARN_FILE = path.join(DATA_DIR, 'warnings.json');

function loadWarningsSafe() {
  if (!fs.existsSync(WARN_FILE)) return {};

  try {
    const raw = fs.readFileSync(WARN_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Failed to read warnings.json for /whois:', error);
    return {};
  }
}

function getWarnsForMember(guildId, userId, now) {
  const store = loadWarningsSafe();
  const guildStore = store[guildId] || {};
  const entries = Array.isArray(guildStore[userId]) ? guildStore[userId] : [];
  const active = entries.filter(entry => {
    if (!entry.expiresAt) return true;
    const ts = Date.parse(entry.expiresAt);
    return Number.isFinite(ts) && ts > now;
  });
  return { entries, active };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Show detailed moderation and account info about a user.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('User to inspect (defaults to you)')
        .setRequired(false),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('target') ?? interaction.user;

    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const now = Date.now();
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const roles = member
      ? member.roles.cache
          .filter(role => role.id !== interaction.guild.id)
          .map(role => role.toString())
      : [];

    const accountCreatedUnix = Math.floor(user.createdTimestamp / 1000);
    const joinedUnix = member && member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

    const timeoutUntilTs = member && typeof member.communicationDisabledUntilTimestamp === 'number'
      ? member.communicationDisabledUntilTimestamp
      : null;
    const timeoutUnix = timeoutUntilTs && timeoutUntilTs > now ? Math.floor(timeoutUntilTs / 1000) : null;
    const isTimedOut = Boolean(timeoutUnix);

    const warns = getWarnsForMember(interaction.guild.id, user.id, now);
    const totalWarns = warns.entries.length;
    const activeWarns = warns.active.length;

    const warnLines = warns.active.slice(0, 5).map((entry, index) => {
      const issuedTs = Date.parse(entry.issuedAt || '');
      const issuedUnix = Number.isFinite(issuedTs) ? Math.floor(issuedTs / 1000) : null;
      const when = issuedUnix ? `<t:${issuedUnix}:F>` : 'unknown time';
      const reason = entry.reason || 'No reason recorded.';
      return `${index + 1}. ${when} — ${reason}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`WhoIs: ${user.tag}`)
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User ID', value: user.id, inline: false },
        { name: 'Account Created', value: `<t:${accountCreatedUnix}:F>`, inline: false },
      )
      .setTimestamp();

    if (joinedUnix) {
      embed.addFields({ name: 'Joined Server', value: `<t:${joinedUnix}:F>`, inline: false });
    }

    if (roles.length) {
      const rolesValue = roles.join(', ');
      embed.addFields({
        name: 'Roles',
        value: rolesValue.length > 1024 ? `${rolesValue.slice(0, 1010)}…` : rolesValue,
        inline: false,
      });
    } else {
      embed.addFields({ name: 'Roles', value: 'None', inline: false });
    }

    if (member) {
      embed.addFields(
        { name: 'Bannable', value: member.bannable ? 'Yes' : 'No', inline: true },
        { name: 'Kickable', value: member.kickable ? 'Yes' : 'No', inline: true },
        { name: 'Moderatable (timeout)', value: member.moderatable ? 'Yes' : 'No', inline: true },
      );
    } else {
      embed.addFields({ name: 'Guild Member', value: 'Not found in this server.', inline: false });
    }

    embed.addFields(
      {
        name: 'Current Timeout',
        value: isTimedOut ? `Yes, until <t:${timeoutUnix}:F> (<t:${timeoutUnix}:R>)` : 'No active timeout',
        inline: false,
      },
      {
        name: 'Warnings',
        value: `Active: ${activeWarns}\nTotal known: ${totalWarns}`,
        inline: false,
      },
    );

    if (warnLines.length) {
      embed.addFields({
        name: 'Active warning details',
        value: warnLines.join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
