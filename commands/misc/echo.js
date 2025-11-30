const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Echo text publicly while confirming to you ephemerally.')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Text to echo publicly')
        .setRequired(true),
    ),
  async execute(interaction) {
    const text = interaction.options.getString('text', true);

    await interaction.reply({
      content: 'Your message has been echoed publicly.',
      ephemeral: true,
    });

    if (interaction.channel && text) {
      await interaction.channel.send(text);
    }
  },
};
