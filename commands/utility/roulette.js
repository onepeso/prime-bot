const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play a roulette game against another user.')
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
            .setTitle('🎰 Roulette Challenge!')
            .setDescription(`${opponent.toString()}, you have been challenged by ${interaction.user.toString()} for **${bet} prime coins**!`)
            .setColor(0x00AE86)
            .addFields(
                { name: 'Instructions', value: 'Click **Accept** or **Reject** within 60 seconds.' }
            )
            .setThumbnail('attachment://roulette.gif')
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
                await interaction.followUp(`${opponent.username} did not respond in time. Challenge expired.`);
            });
    },
};

async function startGame(interaction, opponent, bet, balances) {
    let messages = [];
    const user = interaction.user;

    // Simulate the roulette game
    const drawResult = Math.floor(Math.random() * 38); // Random number between 0 and 37

    if (drawResult === 0 || drawResult === 37) {
        messages.push(`The ball lands on **${drawResult === 0 ? '0' : '00'}**... **LOSE!**`);
        balances[user.id].balance -= bet; // User loses
        balances[opponent.id].balance += bet; // Opponent wins
        messages.push(`${opponent.username} wins! ${user.username} loses ${bet} prime coins.`);
    } else {
        const playerWin = Math.random() < 0.4865; // 48.65% chance to win
        if (playerWin) {
            messages.push(`The ball lands on **${drawResult}**... **WIN!**`);
            balances[user.id].balance += bet; // User wins
            balances[opponent.id].balance -= bet; // Opponent loses
            messages.push(`${user.username} wins! ${opponent.username} loses ${bet} prime coins.`);
        } else {
            messages.push(`The ball lands on **${drawResult}**... **LOSE!**`);
            balances[user.id].balance -= bet; // User loses
            balances[opponent.id].balance += bet; // Opponent wins
            messages.push(`${opponent.username} wins! ${user.username} loses ${bet} prime coins.`);
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
        .setTitle('🎲 Roulette Results')
        .setDescription(messages.join('\n'))
        .setColor(0xF1C40F)
        .addFields(
            { name: `${user.username}'s Balance`, value: `${balances[user.id].balance} prime coins`, inline: true },
            { name: `${opponent.username}'s Balance`, value: `${balances[opponent.id].balance} prime coins`, inline: true }
        )
        .setThumbnail('https://example.com/roulette_result_image.png') // Adjust this with your actual result image URL
        .setTimestamp();

    // Send the result embed
    await interaction.followUp({ embeds: [resultEmbed] });
}
