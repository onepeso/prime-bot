const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance.'),
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
            return interaction.reply("There was an error retrieving your balance.");
        }

        // Get the user's balance or set it to 0 if it doesn't exist
        const balance = balances[interaction.user.id]?.balance || 0;

        // Reply with the user's balance
        await interaction.reply(`Your balance is: ${balance} prime coins.`);
    },
};
