const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member and DM them the reason.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Member to kick')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false),
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';

    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({ content: 'I cannot kick that member (insufficient permissions or higher role).', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      try {
        const embed = new EmbedBuilder()
          .setTitle(`You have been kicked from ${interaction.guild.name}`)
          .setColor(0xffa500)
          .setDescription(reason)
          .setTimestamp();

        await targetUser.send({ embeds: [embed] });
      } catch {
      }

      await member.kick(`${reason} | Kicked by ${interaction.user.tag}`);

      await interaction.editReply(`✅ Kicked **${targetUser.tag}**. Reason: ${reason}`);
    } catch (error) {
      console.error('Error executing /kick:', error);
      await interaction.editReply('There was an error while trying to kick that member.');
    }
  },
};
