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
            return interaction.reply("There was an error retrieving your balance.");
        }
    },
};
       
