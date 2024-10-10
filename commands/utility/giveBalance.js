const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givebalance')
        .setDescription('Give prime coins to another user.')
        .addUserOption(option =>
            option.setName('recipient')
                .setDescription('The user you want to give coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of coins to give')
                .setRequired(true)),
    async execute(interaction) {
        const recipient = interaction.options.getUser('recipient');
        const amount = interaction.options.getInteger('amount');

        // Validate the amount
        if (amount <= 0) {
            return interaction.reply("You must give a positive amount of prime coins.");
        }

        // Check if the balances file exists, if not create it
        if (!fs.existsSync(balancesFilePath)) {
            fs.writeFileSync(balancesFilePath, JSON.stringify({}));
        }

        const giverId = interaction.user.id;
        const recipientId = recipient.id;

        // Read the balances from the JSON file
        let balances;
        try {
            const data = fs.readFileSync(balancesFilePath);
            balances = JSON.parse(data);
        } catch (error) {
            console.error("Error reading balances:", error);
            return interaction.reply("There was an error reading the balances.");
        }

        // Check if the giver has enough balance
        if (!balances[giverId] || balances[giverId].balance < amount) {
            return interaction.reply("You do not have enough balance to give this amount.");
        }

        // Deduct the amount from the giver and add it to the recipient
        if (!balances[recipientId]) {
            balances[recipientId] = { balance: 0 }; // Create recipient balance if it doesn't exist
        }

        balances[giverId].balance -= amount;
        balances[recipientId].balance += amount;

        // Update the balances in the JSON file
        try {
            fs.writeFileSync(balancesFilePath, JSON.stringify(balances, null, 2));
        } catch (error) {
            console.error("Error writing balances:", error);
            return interaction.reply("There was an error updating the balances.");
        }

        // Send direct messages to both giver and recipient
        const giverDM = await interaction.user.send(`You have given **${amount}** prime coins to ${recipient.username}.`);
        const recipientDM = await recipient.send(`You have received **${amount}** prime coins from ${interaction.user.username}.`);

        // Create an embed for the transaction result
        const transactionEmbed = new EmbedBuilder()
            .setTitle('💸 Transaction Successful!')
            .setDescription(`You successfully gave **${amount}** prime coins to ${recipient.username}.`)
            .setColor(0x00AE86)
            .setTimestamp();

        // Reply to the interaction
        await interaction.reply({ embeds: [transactionEmbed] });
    },
};
