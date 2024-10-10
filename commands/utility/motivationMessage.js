const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Get a motivational quote of the day.'),
        
    async execute(interaction) {
        try {
            // Make the request to the API
            const response = await request('https://zenquotes.io/api/today');
            const { statusCode, body } = response;

            if (statusCode !== 200) {
                return interaction.reply('Sorry, I couldn\'t fetch a quote right now. Try again later.');
            }

            // Parse the API response (body will be a stream, so we need to read it)
            const responseData = await body.json();
            const quoteData = responseData[0]; // The API returns an array

            // Create an embed message to display the quote
            const quoteEmbed = new EmbedBuilder()
                .setTitle('Quote of the Day')
                .setDescription(`"${quoteData.q}"\n— *${quoteData.a}*`)
                .setColor(0x00AE86)
                .setTimestamp();

            // Send the embed to the Discord channel
            await interaction.reply({ embeds: [quoteEmbed] });

        } catch (error) {
            console.error('Error fetching the quote:', error);
            await interaction.reply('There was an error retrieving the quote. Please try again later.');
        }
    },
};
