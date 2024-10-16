const { Client, Intents, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

const movieNightFilePath = path.join(__dirname, '../../movienight.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('movienight')
        .setDescription('Get details about the next movie night'),

    async execute(interaction) {
        // Read the movie night details from the JSON file
        let movieNight;
        try {
            const data = fs.readFileSync(movieNightFilePath, 'utf8');
            movieNight = JSON.parse(data);
        } catch (error) {
            console.error("Error reading movie night file:", error);
            return interaction.reply("There was an error retrieving the movie night details.");
        }

        // Determine the attendees list
        const attendees = movieNight.attendees && movieNight.attendees.length > 0
            ? movieNight.attendees.join(', ')
            : 'No attendees yet. Be the first to attend!';

        // Create an embed with the movie night details
        const embed = new EmbedBuilder()
            .setTitle('Movie Night')
            .setDescription('Here are the details for the next movie night!')
            .addFields(
                { name: 'Movie', value: movieNight.movie || 'TBD', inline: true },
                { name: 'Date', value: movieNight.date || 'TBD', inline: true },
                { name: 'Time', value: movieNight.time || 'TBD', inline: true },
                { name: 'Attendees', value: attendees, inline: false }
            )
            .setColor('#00FF00');

        // Create a button
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('attend')
                .setLabel('I will attend')
                .setStyle('Primary')
        );

        // Reply with the embed and button
        await interaction.reply({ embeds: [embed], components: [row] });

        // Create a collector to handle button interactions
        const filter = i => i.customId === 'attend' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'attend') {
                // Add the user to the attendees array
                if (!movieNight.attendees) {
                    movieNight.attendees = [];
                }
                if (!movieNight.attendees.includes(i.user.username)) {
                    movieNight.attendees.push(i.user.username);
                }

                // Save the updated movie night details to the JSON file
                try {
                    fs.writeFileSync(movieNightFilePath, JSON.stringify(movieNight, null, 2));
                } catch (error) {
                    console.error("Error writing movie night file:", error);
                    return i.reply("There was an error updating the movie night details.");
                }

                await i.reply({ content: 'You have been added to the attendees list!', ephemeral: true });
            }
        });
    },
};
