const { SlashCommandBuilder} = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test Command Nothing Useful'),

    async execute(interaction) {
        await interaction.reply('Test Command! Seeing if something works.');
        const apiUrl = `https://evilinsult.com/generate_insult.php?lang=en&type=json`;
        try {
            const { body } = await request(apiUrl);
            const data = await body.json();
            await interaction.followUp(data.insult);
        } catch (error) {
            console.error('Error fetching insult:', error);
            await interaction.followUp('There was an error retrieving the insult. Please try again later.');
        }
    },
};
