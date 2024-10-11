const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Coin Flipping Game by: PrimeBot'),

    async execute(interaction) {
        await interaction.deferReply();

        // Start the game, providing the interaction and logic for buttons
        startGame(interaction);
    },
};

// The function to initiate the game with UI and buttons
async function startGame(interaction, bet, balances) {
    // Embed message to show game information
    const coinFlipGameEmbed = new EmbedBuilder()
        .setTitle('🪙 Coin Flip Game 🪙')
        .setColor('#ff8800')
        .setDescription('Pick either Heads or Tails and test your luck!')
        .addFields(
            { name: 'Instructions', value: 'Pick a side: Heads or Tails. The coin will flip, and we will see if you guessed correctly!' }
        )
        .setImage('attachment://coinflip.gif'); // Example of attaching a gif

    // Buttons for player to select heads or tails
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('heads')
            .setLabel('Heads')
            .setStyle('PRIMARY'),
        new ButtonBuilder()
            .setCustomId('tails')
            .setLabel('Tails')
            .setStyle('PRIMARY')
    );

    // Path to the coin flip gif (make sure this image exists in your assets)
    const imageAttachment = { attachment: path.join(__dirname, '../images/coinflip.gif'), name: 'coinflip.gif' };

    // Send the embed and buttons to the user
    await interaction.editReply({ embeds: [coinFlipGameEmbed], components: [row], files: [imageAttachment] });

    // Proceed to game logic when user clicks a button
    handleGameLogic(interaction);
}

// Function to handle the game logic and button interactions
function handleGameLogic(interaction) {
    // Create a message component collector to capture the user's button choice
    const filter = (btnInteraction) => {
        return ['heads', 'tails'].includes(btnInteraction.customId) && btnInteraction.user.id === interaction.user.id;
    };

    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000, // 15 seconds to choose
    });

    collector.on('collect', async (btnInteraction) => {
        // Randomly decide the coin flip result (0 = heads, 1 = tails)
        const coin = Math.floor(Math.random() * 2);
        const coinResult = coin === 0 ? 'heads' : 'tails';

        // Check if player's choice matches the coin flip result
        const playerChoice = btnInteraction.customId; // Either 'heads' or 'tails'
        let resultMessage = '';

        if (playerChoice === coinResult) {
            resultMessage = `🎉 Congratulations! The coin landed on **${coinResult.toUpperCase()}**. You guessed it right!`;
        } else {
            resultMessage = `😢 Sorry, the coin landed on **${coinResult.toUpperCase()}**. Better luck next time!`;
        }

        // Disable buttons after a selection is made
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('heads')
                .setLabel('Heads')
                .setStyle('PRIMARY')
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('tails')
                .setLabel('Tails')
                .setStyle('PRIMARY')
                .setDisabled(true)
        );

        // Edit the original reply to include the result and disable the buttons
        await btnInteraction.update({
            content: resultMessage,
            components: [disabledRow],
        });

        collector.stop(); // Stop the collector after interaction
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            interaction.editReply({ content: '⏳ You didn\'t pick a side in time! Please try again.', components: [] });
        }
    });
}
