const { Client, Intents, EmbedBuilder, ActionRowBuilder, ButtonBuilder, AttachmentBuilder } = require('discord.js');
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
        const imagePath = path.join(__dirname, '../../images/saw.webp');
        const imageAttachment = new AttachmentBuilder(imagePath);
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
            .setTitle(`🍿 ${movieNight.name} Movie Night! `)
            .setDescription('Get the popcorn ready! Here are the details for the next movie night:')
            .addFields(
                { name: 'Movie', value: movieNight.name || 'TBD', inline: true },
                { name: 'Date', value: movieNight.date || 'TBD', inline: true },
                { name: 'Time', value: movieNight.time || 'TBD', inline: true },
                { name: 'Attendees', value: attendees, inline: false }
            )
            .setColor('#00FF00')
            .setImage('attachment://saw.webp');

        // Create a button
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('attend')
                .setLabel('I will attend')
                .setStyle('Primary')
        );

        // Reply with the embed and button
        const message = await interaction.reply({ embeds: [embed], components: [row], files: [imageAttachment] });

        // Create a collector to handle button interactions
        const filter = i => i.customId === 'attend';
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

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

                // Update the embed with the new attendees list
                const updatedAttendees = movieNight.attendees.join(', ');
                const updatedEmbed = new EmbedBuilder()
                    .setTitle(`🍿 ${movieNight.name} Movie Night! `)
                    .setDescription('Get the popcorn ready! Here are the details for the next movie night:')
                    .addFields(
                        { name: 'Movie', value: movieNight.name || 'TBD', inline: true },
                        { name: 'Date', value: movieNight.date || 'TBD', inline: true },
                        { name: 'Time', value: movieNight.time || 'TBD', inline: true },
                        { name: 'Attendees', value: updatedAttendees, inline: false }
                    )
                    .setColor('#00FF00')
                    .setImage('attachment://saw.webp');

                await message.edit({ embeds: [updatedEmbed] });
                await i.reply({ content: 'You have been added to the attendees list!', ephemeral: true });
            }
        });
    },
};
