const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wipe')
    .setDescription('Wipe recent messages from a user in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName('player')
        .setDescription('User whose recent messages to wipe')
        .setRequired(true),
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('player', true);

    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const callerPermissions = interaction.memberPermissions;
    if (!callerPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: 'You do not have permission to use this command. (Manage Messages required.)',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: 'This command can only be used in a text-based channel in a server.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const fetchedMessages = await channel.messages.fetch({ limit: 100 });

      const messagesToDelete = fetchedMessages.filter(
        message => message.author.id === targetUser.id && !message.pinned,
      );

      if (messagesToDelete.size === 0) {
        await interaction.editReply(
          `I couldn't find any recent, unpinned messages from **${targetUser.tag}** in this channel to delete.`,
        );
        return;
      }

      const deleted = await channel.bulkDelete(messagesToDelete, true);
      const deletedCount = deleted.size;

      if (deletedCount === 0) {
        await interaction.editReply(
          `I couldn't delete any messages for **${targetUser.tag}**. This might be because their messages are too old (Discord only allows bulk deleting messages newer than 14 days).`,
        );
        return;
      }

      await interaction.editReply(
        `✅ Deleted **${deletedCount}** message(s) from **${targetUser.tag}** in this channel (from the last 100 messages I can see).`,
      );
    } catch (error) {
      console.error('Error executing /wipe:', error);
      await interaction.editReply(
        'There was an error while trying to wipe messages for that user.',
      );
    }
  },
};
