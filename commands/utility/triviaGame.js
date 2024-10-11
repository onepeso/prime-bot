const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { request } = require('undici');
const fs = require('fs');
const path = require('path');

const balancesFilePath = path.join(__dirname, '../../balances.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Play a solo trivia game to win Prime Coins!'),

    async execute(interaction) {
        const userMentioned = interaction.user;
        const apiUrl = `https://the-trivia-api.com/v2/questions/`;

        // Read the balances from the JSON file
        let balances;
        try {
            const data = fs.readFileSync(balancesFilePath);
            balances = JSON.parse(data);
        } catch (error) {
            console.error("Error reading balances:", error);
            return interaction.reply("There was an error reading the balances.");
        }

        try {
            // Fetch trivia questions from the API
            const { body } = await request(apiUrl);
            const data = await body.json();

            // Check if data is not empty
            if (data.length === 0) {
                return interaction.followUp('No trivia questions available at the moment. Please try again later.');
            }

            // Pick a random trivia question
            const randomQuestion = data[Math.floor(Math.random() * data.length)];

            // Shuffle the answers (to ensure the correct answer isn't always last)
            const allAnswers = [...randomQuestion.incorrectAnswers, randomQuestion.correctAnswer].sort(() => Math.random() - 0.5);

            // Create buttons for the answers
            const buttons = allAnswers.map((answer, index) =>
                new ButtonBuilder()
                    .setCustomId(`answer_${index}`)
                    .setLabel(`${index + 1}. ${answer}`)
                    .setStyle(ButtonStyle.Primary)
            );

            // Prepare the embed message
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Trivia Question!')
                .setDescription(randomQuestion.question.text)
                .setFooter({ text: `Select the correct answer using the buttons below, ${userMentioned.username}!` });

            // Create a row for the buttons
            const row = new ActionRowBuilder().addComponents(buttons);

            // Send the initial interaction reply with the embed and buttons
            await interaction.reply({ embeds: [embed], components: [row] });

            // Create a button collector to listen for the user's answer
            const filter = i => i.user.id === userMentioned.id; // Ensure only the user who triggered the command can interact with the buttons
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                const selectedAnswerIndex = parseInt(i.customId.split('_')[1]);
                const correctAnswerIndex = allAnswers.indexOf(randomQuestion.correctAnswer);

                if (selectedAnswerIndex === correctAnswerIndex) {

                    // Update the user's balance with the reward
                    const reward = 100; // Reward for answering correctly
                    balances[userMentioned.id] = { balance: (balances[userMentioned.id]?.balance || 0) + reward };

                    // Write the updated balances to the JSON file
                    fs.writeFileSync(balancesFilePath, JSON.stringify(balances));

                    await i.update({ content: `${userMentioned}, you got it right! 🎉 You won ${reward}💵`, components: [] });




                } else {
                    await i.update({ content: `${userMentioned}, that's incorrect. The correct answer was: ${randomQuestion.correctAnswer}`, components: [] });
                }

                collector.stop(); // Stop the collector after an answer is received
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: `${userMentioned}, time's up! You didn't answer in time.`, components: [] });
                }
            });

        } catch (error) {
            console.error('Error fetching trivia questions:', error);
            await interaction.followUp('There was an error retrieving trivia questions. Please try again later.');
        }
    },
};
