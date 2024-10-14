const { SlashCommandBuilder} = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('annoybot')
        .setDescription('Use this command to annoy the bot. You might get an insult back!'),

    async execute(interaction) {

        const userMentioned = interaction.user;
        
        const apiUrl = `https://evilinsult.com/generate_insult.php?lang=en&type=json`;
        try {
            const { body } = await request(apiUrl);
            const data = await body.json();
            await interaction.followUp(`${data.insult} ${userMentioned}`);
        } catch (error) {
            console.error('Error fetching insult:', error);
            await interaction.followUp('There was an error retrieving the insult. Please try again later.');
        }
    },
};
