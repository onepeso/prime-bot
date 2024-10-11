const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { request } = require('undici');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Play a solo trivia game to win Prime Coins!'),

    async execute(interaction) {
        const userMentioned = interaction.user;

        const apiUrl = `https://the-trivia-api.com/v2/questions/`;

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

            // Prepare the embed message
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Trivia Question!')
                .setDescription(randomQuestion.question.text)
                .addFields(
                    { 
                        name: 'Choices', 
                        value: [
                            ...randomQuestion.incorrectAnswers.map((answer, index) => `${index + 1}. ${answer}`),
                            `${randomQuestion.incorrectAnswers.length + 1}. ${randomQuestion.correctAnswer}`
                        ].join('\n') 
                    }
                )
                .setFooter({ text: `Reply with the number of your answer, ${userMentioned.username}!` });

            await interaction.reply({ embeds: [embed] });

            // Set up a message collector to get the user's answer
            const filter = response => {
                const validAnswers = ['1', '2', '3', '4'];
                return validAnswers.includes(response.content) && response.author.id === userMentioned.id;
            };

            const collector = interaction.channel.createMessageCollector({ filter, time: 30000 });

            collector.on('collect', async response => {
                const answerIndex = parseInt(response.content) - 1;
                const correctIndex = randomQuestion.incorrectAnswers.length; // Correct answer is at index of incorrectAnswers length

                if (answerIndex === correctIndex) {
                    await interaction.followUp(`${userMentioned}, you got it right! 🎉`);
                } else {
                    await interaction.followUp(`${userMentioned}, that's incorrect. The correct answer was: ${randomQuestion.correctAnswer}`);
                }

                collector.stop(); // Stop the collector after an answer is received
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp(`${userMentioned}, time's up! You didn't answer in time.`);
                }
            });
        } catch (error) {
            console.error('Error fetching trivia questions:', error);
            await interaction.followUp('There was an error retrieving trivia questions. Please try again later.');
        }
    },
};
