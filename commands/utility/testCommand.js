const { SlashCommandBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test Command Nothing Useful'),

    async execute(interaction) {
        await interaction.reply('Test Command! Seeing if something works.');
    },
};
