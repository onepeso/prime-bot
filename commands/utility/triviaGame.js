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

        let reward = 20; // Initial reward
        let totalReward = 0; // Track total reward
        let questionCount = 0; // Counter for the number of questions asked

        const askNextQuestion = async () => {
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
                    .setTitle('🧠 Trivia Question! 🧠')
                    .setDescription(randomQuestion.question.text)
                    .setFooter({ text: `Select the correct answer using the buttons below, ${userMentioned.username}!` });

                // Create a row for the buttons
                const row = new ActionRowBuilder().addComponents(buttons);

                // Send the question
                await interaction.reply({ embeds: [embed], components: [row] });

                // Create a button collector to listen for the user's answer
                const filter = i => i.user.id === userMentioned.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

                collector.on('collect', async i => {
                    const selectedAnswerIndex = parseInt(i.customId.split('_')[1]);
                    const correctAnswerIndex = allAnswers.indexOf(randomQuestion.correctAnswer);

                    if (selectedAnswerIndex === correctAnswerIndex) {
                        totalReward += reward;
                        await i.update({ content: `${userMentioned}, you got it right! 🎉 You've won ${reward} Prime Coins so far.`, components: [] });

                        // Increment the reward for the next question
                        reward += 20;
                        questionCount++;

                        // Check if the user has answered 3 questions
                        if (questionCount < 3) {
                            // Ask if the user wants to continue
                            const continueRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('continue')
                                    .setLabel('Continue to next question')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId('stop')
                                    .setLabel('End the game')
                                    .setStyle(ButtonStyle.Danger)
                            );

                            await interaction.followUp({ content: 'Do you want to continue to the next question?', components: [continueRow] });

                            const continueCollector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

                            continueCollector.on('collect', async btn => {
                                if (btn.customId === 'continue') {
                                    await btn.update({ content: 'Great! Here comes the next question...', components: [] });
                                    await askNextQuestion(); // Ask the next question
                                } else {
                                    await btn.update({ content: `Game over! You've won a total of ${totalReward} Prime Coins.`, components: [] });

                                    // Update the user's balance with the total reward
                                    balances[userMentioned.id] = { balance: (balances[userMentioned.id]?.balance || 0) + totalReward };

                                    // Write the updated balances to the JSON file
                                    fs.writeFileSync(balancesFilePath, JSON.stringify(balances));
                                }
                                continueCollector.stop(); // Stop the collector after user decision
                            });

                            continueCollector.on('end', collected => {
                                if (collected.size === 0) {
                                    interaction.editReply({ content: `${userMentioned}, time's up!`, components: [] });
                                }
                            });
                        } else {
                            await interaction.followUp({ content: `You've answered ${questionCount} questions! Game over! You've won a total of ${totalReward} Prime Coins.`, components: [] });

                            // Update the user's balance with the total reward
                            balances[userMentioned.id] = { balance: (balances[userMentioned.id]?.balance || 0) + totalReward };

                            // Write the updated balances to the JSON file
                            fs.writeFileSync(balancesFilePath, JSON.stringify(balances));
                        }

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
        };

        await askNextQuestion(); // Start the first question
    },
};
