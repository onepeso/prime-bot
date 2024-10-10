const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Get a motivational quote of the day.'),

    async execute(interaction) {
        try {
            // Defer the reply to give the bot more time to fetch the quote
            await interaction.deferReply();

            // Make the request to the API
            const response = await request('https://zenquotes.io/api/today');
            const { statusCode, body } = response;

            if (statusCode !== 200) {
                return interaction.editReply('Sorry, I couldn\'t fetch a quote right now. Try again later.');
            }

            // Parse the API response
            const responseData = await body.json();
            const quoteData = responseData[0]; // The API returns an array

            // Create an embed message to display the quote
            const quoteEmbed = new EmbedBuilder()
                .setTitle('Quote of the Day')
                .setDescription(`"${quoteData.q}"\n— *${quoteData.a}*`)
                .setColor(0x00AE86)
                .setTimestamp();

            // Send the embed to the Discord channel
            await interaction.editReply({ embeds: [quoteEmbed] });

        } catch (error) {
            console.error('Error fetching the quote:', error);
            await interaction.editReply('There was an error retrieving the quote. Please try again later.');
        }
    },
};
