const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the leaderboard of the richest users.'),
    
    async execute(interaction) {
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
            return interaction.reply("There was an error reading the balances.");
        }

        // Sort the balances in descending order
        const sortedBalances = Object.entries(balances)
            .sort(([, a], [, b]) => b.balance - a.balance);

        // Create the leaderboard embed
        const leaderboardEmbed = new EmbedBuilder()
            .setTitle('💰 Leaderboard')
            .setDescription('Here are the top 10 richest users in the server:')
            .setColor(0x00AE86)
            .setTimestamp();

        // Add the top 10 richest users to the embed
        for (let i = 0; i < Math.min(sortedBalances.length, 10); i++) {
            const [userId, { balance }] = sortedBalances[i];
            const user = await interaction.guild.members.fetch(userId);
            leaderboardEmbed.addFields(
                { name: `${i + 1}. ${user.displayName}`, value: `Balance: ${balance} prime coins`, inline: false }
            );
        }

        // Send the leaderboard embed to the Discord channel
        await interaction.reply({ embeds: [leaderboardEmbed] });
    }
};
