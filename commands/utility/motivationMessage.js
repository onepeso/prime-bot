const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Get a motivational quote of the day.'),

    async execute(interaction) {
        try {
            // Defer the reply to give the bot more time to fetch the quote
            console.log('Deferring reply...');
            await interaction.deferReply();

            // Make the request to the API
            console.log('Sending request to ZenQuotes API...');
            const response = await request('https://zenquotes.io/api/today');

            console.log(`Received response with status: ${response.statusCode}`);

            if (response.statusCode !== 200) {
                console.log('API did not return a 200 OK response.');
                return interaction.editReply('Sorry, I couldn\'t fetch a quote right now. Try again later.');
            }

            // Read and parse the response stream
            const responseData = await response.body.text();
            console.log('Response body received:', responseData);

            const quoteData = JSON.parse(responseData)[0]; // The API returns an array

            // Check if the data structure is valid
            if (!quoteData || !quoteData.q || !quoteData.a) {
                console.error('Quote data is missing expected fields:', quoteData);
                return interaction.editReply('Sorry, I couldn\'t retrieve a valid quote.');
            }

            // Create an embed message to display the quote
            console.log('Building embed message...');
            const quoteEmbed = new EmbedBuilder()
                .setTitle('Quote of the Day')
                .setDescription(`"${quoteData.q}"\n— *${quoteData.a}*`)
                .setColor(0x00AE86)
                .setTimestamp();

            // Send the embed to the Discord channel
            console.log('Sending embed to Discord...');
            await interaction.editReply({ embeds: [quoteEmbed] });

        } catch (error) {
            // Catch any errors and log them
            console.error('Error occurred while executing the quote command:', error);
            await interaction.editReply('There was an error retrieving the quote. Please try again later.');
        }
    },
};
