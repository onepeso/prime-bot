const { SlashCommandBuilder } = require('discord.js');
const { request } = require('undici');

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shark')
        .setDescription('Get live score for Sharks vs Blues game'),
    
    async execute(interaction) {
        // Dynamically get today's date for the API query
        const todayDate = getTodayDate();
        const apiUrl = `https://nhl-score-api.herokuapp.com/api/scores?startDate=${todayDate}&endDate=${todayDate}`;

        try {
            // Make the API request using undici
            const { body } = await request(apiUrl);
            const data = await body.json();

            // Ensure the API response contains game data
            if (!data || !data.games || data.games.length === 0) {
                await interaction.reply('No NHL games found today.');
                return;
            }

            // Find the Sharks vs Blues game
            const sharksGame = data.games.find(game => 
                (game.teams.away.abbreviation === 'SJS' && game.teams.home.abbreviation === 'STL') ||
                (game.teams.home.abbreviation === 'SJS' && game.teams.away.abbreviation === 'STL')
            );

            // If no Sharks vs Blues game is found
            if (!sharksGame) {
                await interaction.reply('No Sharks vs Blues game found today.');
                return;
            }

            // Extract relevant information
            const { home, away } = sharksGame.teams;
            const homeTeam = home.teamName;
            const awayTeam = away.teamName;
            const homeScore = sharksGame.scores[home.abbreviation] || 0;
            const awayScore = sharksGame.scores[away.abbreviation] || 0;

            // Check if the game is live or has scores
            const gameState = sharksGame.status.state === 'PREVIEW' ? 'Game has not started yet' : `${awayScore} - ${homeScore}`;

            // Reply with the current score or game status
            await interaction.reply(`${awayTeam} vs ${homeTeam}: ${gameState}`);
        } catch (error) {
            console.error('Error fetching score:', error);
            await interaction.reply('There was an error retrieving the score. Please try again later.');
        }
    },
};
