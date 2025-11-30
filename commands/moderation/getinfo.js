const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getinfo')
    .setDescription('Get moderation-focused info about a user.')
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

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const roles = member
      ? member.roles.cache
          .filter(role => role.id !== interaction.guild.id)
          .map(role => role.toString())
      : [];

    const embed = new EmbedBuilder()
      .setTitle(`User Info: ${user.tag}`)
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User ID', value: user.id, inline: false },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
      );

    if (member) {
      embed.addFields(
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
        { name: 'Roles', value: roles.length ? roles.join(', ') : 'None', inline: false },
        { name: 'Bannable', value: member.bannable ? 'Yes' : 'No', inline: true },
        { name: 'Kickable', value: member.kickable ? 'Yes' : 'No', inline: true },
        { name: 'Moderatable (for timeout)', value: member.moderatable ? 'Yes' : 'No', inline: true },
      );
    } else {
      embed.addFields({ name: 'Guild Member', value: 'Not found in this server.', inline: false });
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
