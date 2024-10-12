const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Coin Flipping Game by: PrimeBot'),

    async execute(interaction) {
        await interaction.deferReply();

        // Check if the balances file exists, if not create it
        if (!fs.existsSync(balancesFilePath)) {
            fs.writeFileSync(balancesFilePath, JSON.stringify({}));
        }

        // Read the balances from the JSON file
        let balances;
        try {
            const data = fs.readFileSync(balancesFilePath);
            balances = JSON.parse(data);
        } catch (error) {
            console.error("Error reading balances:", error);
            return interaction.reply("There was an error retrieving your balance.");
        }

        // Initialize player's balance if they don't have one
        if (!balances[interaction.user.id]) {
            balances[interaction.user.id] = { balance: 0 }; // Start with 0 coins
        }

        // Start the game
        startGame(interaction, balances);
    },
};

// The function to initiate the game with UI and buttons
async function startGame(interaction, balances) {
    // Embed message to show game information
    const coinFlipGameEmbed = new EmbedBuilder()
        .setTitle('🪙 Coin Flip Game 🪙')
        .setColor('#ff8800')
        .setDescription('Pick either Heads or Tails and test your luck!')
        .addFields(
            { name: 'Instructions', value: 'Pick a side: Heads or Tails. The coin will flip, and we will see if you guessed correctly!' },
            { name: 'Your Balance', value: `${balances[interaction.user.id].balance} coins` } // Show player balance
        )
        .setImage('attachment://coinflip.gif'); // Example of attaching a gif

    // Buttons for player to select heads or tails
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('heads')
            .setLabel('Heads')
            .setStyle('Primary'),
        new ButtonBuilder()
            .setCustomId('tails')
            .setLabel('Tails')
            .setStyle('Primary')
    );

    // Path to the coin flip gif (make sure this image exists in your assets)
    const imageAttachment = { attachment: path.join(__dirname, '../../images/coinflip.gif'), name: 'coinflip.gif' };

    // Send the embed and buttons to the user
    await interaction.editReply({ embeds: [coinFlipGameEmbed], components: [row], files: [imageAttachment] });

    // Proceed to game logic when user clicks a button
    handleGameLogic(interaction, balances);
}

// Function to handle the game logic and button interactions
function handleGameLogic(interaction, balances) {
    const filter = (btnInteraction) => {
        return ['heads', 'tails'].includes(btnInteraction.customId) && btnInteraction.user.id === interaction.user.id;
    };

    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000, // 15 seconds to choose
    });

    collector.on('collect', async (btnInteraction) => {
        const coin = Math.floor(Math.random() * 2);
        const coinResult = coin === 0 ? 'heads' : 'tails';
        const playerChoice = btnInteraction.customId;
        let resultMessage = '';

        if (playerChoice === coinResult) {
            balances[btnInteraction.user.id].balance += 5; // Add 5 coins for a win
            resultMessage = `🎉 Congratulations! The coin landed on **${coinResult.toUpperCase()}**. You guessed it right! You now have ${balances[btnInteraction.user.id].balance} coins.`;
        } else {
            resultMessage = `😢 Sorry, the coin landed on **${coinResult.toUpperCase()}**. Better luck next time! You still have ${balances[btnInteraction.user.id].balance} coins.`;
        }

        // Disable buttons after a selection is made
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('heads')
                .setLabel('Heads')
                .setStyle('Primary')
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('tails')
                .setLabel('Tails')
                .setStyle('Primary')
                .setDisabled(true)
        );

        // Edit the original reply to include the result and disable the buttons
        await btnInteraction.update({
            content: resultMessage,
            components: [disabledRow],
        });

        // Write updated balances back to the file
        fs.writeFileSync(balancesFilePath, JSON.stringify(balances, null, 2));

        collector.stop(); // Stop the collector after interaction
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            interaction.editReply({ content: '⏳ You didn\'t pick a side in time! Please try again.', components: [] });
        }
    });
}
