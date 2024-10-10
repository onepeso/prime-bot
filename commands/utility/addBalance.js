const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbalance')
        .setDescription('Add balance to your account (Founder role only).')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of balance to add')
                .setRequired(true)),
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
            return interaction.reply("There was an error retrieving the balances.");
        }

        // Check if the user has the "Founder" role
        const founderRole = interaction.guild.roles.cache.find(role => role.name === 'Helper');
        if (!founderRole || !interaction.member.roles.cache.has(founderRole.id)) {
            return interaction.reply("You do not have the required role to use this command.");
        }

        // Get the amount to add from the command option
        const amount = interaction.options.getInteger('amount');

        // Update the user's balance
        if (!balances[interaction.user.id]) {
            balances[interaction.user.id] = { balance: 0 }; // Initialize user balance if not found
        }
        balances[interaction.user.id].balance += amount; // Add the specified amount

        // Write updated balances back to the JSON file
        try {
            fs.writeFileSync(balancesFilePath, JSON.stringify(balances, null, 2));
        } catch (error) {
            console.error("Error writing balances:", error);
            return interaction.reply("There was an error updating the balances.");
        }

        // Reply with the updated balance
        await interaction.reply(`Added ${amount} prime coins to your balance. Your new balance is: ${balances[interaction.user.id].balance} prime coins.`);
    },
};
