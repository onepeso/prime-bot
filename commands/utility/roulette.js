const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play a Russian Roulette game against another user.')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('The user you want to compete against')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet on the roulette (must be positive)')
                .setRequired(true)),
    async execute(interaction) {
        const opponent = interaction.options.getUser('opponent');
        const bet = interaction.options.getInteger('bet');

        // Validate that the bet is positive
        if (bet <= 0) {
            return interaction.reply("You must place a positive bet.");
        }

        // Check if the balances file exists, if not create it
        if (!fs.existsSync(balancesFilePath)) {
            fs.writeFileSync(balancesFilePath, JSON.stringify({}));
        }

        const userId = interaction.user.id;
        const opponentId = opponent.id;

        // Read the balances from the JSON file
        let balances;
        try {
            const data = fs.readFileSync(balancesFilePath);
            balances = JSON.parse(data);
        } catch (error) {
            console.error("Error reading balances:", error);
            return interaction.reply("There was an error reading the balances.");
        }

        // Check if both users have enough balance to place the bet
        if (!balances[userId] || balances[userId].balance < bet) {
            return interaction.reply("You do not have enough balance to place this bet.");
        }
        if (!balances[opponentId] || balances[opponentId].balance < bet) {
            return interaction.reply(`${opponent.username} does not have enough balance to place this bet.`);
        }

        // Create an embed for the challenge
        const imagePath = path.join(__dirname, '../../images/roulette.gif');
        const imageAttachment = new AttachmentBuilder(imagePath);

        const challengeEmbed = new EmbedBuilder()
            .setTitle('🔫 Russian Roulette Challenge!')
            .setDescription(`${opponent.toString()}, you have been challenged by ${interaction.user.toString()} for **${bet} prime coins**!`)
            .setColor(0x00AE86)
            .addFields(
                { name: 'Instructions', value: 'Click **Accept** or **Reject** within 60 seconds.' }
            )
            .setImage('attachment://roulette.gif')
            .setTimestamp();

        // Create buttons for accepting or rejecting
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept')
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('reject')
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
            );

        // Send the challenge embed with buttons and attach the image
        await interaction.reply({ embeds: [challengeEmbed], components: [row], files: [imageAttachment] });

        // Await opponent's button interaction
        const filter = i => i.user.id === opponentId;
        interaction.channel.awaitMessageComponent({ filter, time: 60000 })
            .then(async i => {
                if (i.customId === 'accept') {
                    await startGame(interaction, opponent, bet, balances);
                    await i.update({ content: `${opponent.username} accepted the challenge!`, components: [] });
                } else if (i.customId === 'reject') {
                    await i.update({ content: `${opponent.username} has rejected the challenge.`, components: [] });
                }
            })
            .catch(async () => {
                await interaction.followUp(`${opponent.username} did not respond in time. ⚠️ Challenge expired ⚠️`);
                const message = await interaction.fetchReply();
                await message.delete(); // Ensure this does not throw an error if already deleted
            });
    },
};

async function startGame(interaction, opponent, bet, balances) {
    const user = interaction.user;
    const userId = user.id;
    const opponentId = opponent.id;

    // Set up the revolver with 6 chambers, randomly load 1 bullet
    const chambers = [0, 0, 0, 0, 0, 1]; // 0 means no bullet, 1 means bullet
    shuffleArray(chambers); // Shuffle the chambers to randomize the bullet position

    let turn = 0; // 0 for user, 1 for opponent
    let bulletFound = false;

    while (!bulletFound) {
        const currentPlayer = turn === 0 ? user : opponent;
        const playerId = turn === 0 ? userId : opponentId;

        // Create Pull Trigger button
        const pullRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pull_trigger')
                    .setLabel('Pull Trigger')
                    .setStyle(ButtonStyle.Primary)
            );

        const pullEmbed = new EmbedBuilder()
            .setTitle('🔫 Pull the Trigger!')
            .setDescription(`${currentPlayer.username}, it's your turn to pull the trigger!`)
            .setColor(0x00AE86);

        // Send the pull prompt with the pull button
        await interaction.followUp({ embeds: [pullEmbed], components: [pullRow] });

        // Await user's response
        const filter = i => i.user.id === playerId;
        try {
            const response = await interaction.channel.awaitMessageComponent({ filter, time: 60000 });

            if (response.customId === 'pull_trigger') {
                // Simulate pulling the trigger (get the next chamber)
                const chamberResult = chambers.pop(); // Get the next chamber from the revolver

                if (chamberResult === 1) {
                    // Bullet found! The current player loses.
                    bulletFound = true;
                    const message = `${currentPlayer.username} pulled the trigger and... 💥 **Bullet found!**`;
                    await response.update({ content: message, components: [] });
                    balances[playerId].balance -= bet;
                    balances[turn === 0 ? opponentId : userId].balance += bet;
                } else {
                    // No bullet, continue to the next player's turn
                    await response.update({ content: `${currentPlayer.username} pulled the trigger and... 😅 **No bullet**. Passing the gun...`, components: [] });
                    turn = 1 - turn; // Switch turns
                }
            }
        } catch (error) {
            await interaction.followUp(`${currentPlayer.username} did not respond in time. Game over!`);
            return;
        }
    }

    // Update the balances in the JSON file
    try {
        fs.writeFileSync(balancesFilePath, JSON.stringify(balances, null, 2));
    } catch (error) {
        console.error("Error writing balances:", error);
    }

    // Create an embed for the game result
    const resultEmbed = new EmbedBuilder()
        .setTitle('🔫 Russian Roulette Results')
        .setDescription(`${user.username} lost ${bet} prime coins!`)
        .setColor(0xF1C40F)
        .addFields(
            { name: `${user.username}'s Balance`, value: `${balances[userId].balance} prime coins`, inline: true },
            { name: `${opponent.username}'s Balance`, value: `${balances[opponentId].balance} prime coins`, inline: true }
        )
        .setTimestamp();

    // Send the result embed
    await interaction.followUp({ embeds: [resultEmbed] });
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
