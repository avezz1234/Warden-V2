const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member and DM them the reason.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('Member to ban')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false),
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';

    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const callerPermissions = interaction.memberPermissions;
    if (!callerPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'You do not have permission to use this command. (Ban Members required.)',
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: 'I could not find that member in this server.', ephemeral: true });
      return;
    }

    if (!member.bannable) {
      await interaction.reply({ content: 'I cannot ban that member (insufficient permissions or higher role).', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      try {
        const embed = new EmbedBuilder()
          .setTitle(`You have been banned from ${interaction.guild.name}`)
          .setColor(0xff0000)
          .setDescription(reason)
          .setTimestamp();

        await targetUser.send({ embeds: [embed] });
      } catch {
      }

      await member.ban({ reason: `${reason} | Banned by ${interaction.user.tag}` });

      await interaction.editReply(`✅ Banned **${targetUser.tag}**. Reason: ${reason}`);
    } catch (error) {
      console.error('Error executing /ban:', error);
      await interaction.editReply('There was an error while trying to ban that member.');
    }
  },
};
