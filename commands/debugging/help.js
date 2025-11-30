const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available debug commands for this bot.'),
  async execute(interaction) {
    const wsPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setTitle('Debug Command Help')
      .setColor(0x00ffcc)
      .setDescription('Available debug-focused slash commands:')
      .addFields(
        {
          name: '/ping',
          value: 'Shows network stats (WebSocket ping, API latency, response delay) in an ephemeral embed.',
        },
        {
          name: '/echo',
          value: 'Echoes back text you provide along with user/channel/guild info and latency stats (ephemeral).',
        },
        {
          name: '/roll',
          value: 'Rolls a die with an optional number of sides and reports the result plus latency stats (ephemeral).',
        },
      )
      .addFields({ name: 'WebSocket Ping', value: `${wsPing} ms`, inline: true })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
