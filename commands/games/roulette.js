async function startGame(interaction, opponent, bet, balances) {
    let messages = [];
    const user = interaction.user;
    const userId = user.id;
    const opponentId = opponent.id;

    // Set up the revolver with 6 chambers, randomly load 1 bullet
    const chambers = [0, 0, 0, 0, 0, 1]; // 0 means no bullet, 1 means bullet
    shuffleArray(chambers); // Shuffle the chambers to randomize the bullet position

    let turn = 0; // 0 for user, 1 for opponent
    let bulletFound = false;

    while (!bulletFound) {
        const currentPlayer = turn === 0 ? user : opponent;
        const playerId = turn === 0 ? userId : opponentId;

        // Prompt the current player to pull the trigger
        const pullEmbed = new EmbedBuilder()
            .setTitle('🔫 Pull the Trigger!')
            .setDescription(`${currentPlayer.username}, it's your turn to pull the trigger!`)
            .setColor(0x00AE86);

        // Send the pull prompt
        await interaction.followUp({ embeds: [pullEmbed] });

        // Await user's response
        const filter = i => i.user.id === playerId;
        try {
            const response = await interaction.channel.awaitMessageComponent({ filter, time: 60000 });

            if (response.customId === 'pull_trigger') {
                // Simulate pulling the trigger (get the next chamber)
                const chamberResult = chambers.pop(); // Get the next chamber from the revolver

                if (chamberResult === 1) {
                    // Bullet found! The current player loses.
                    bulletFound = true;
                    messages.push(`${currentPlayer.username} pulled the trigger and... 💥 **Bullet found!**`);
                    messages.push(`${currentPlayer.username} loses ${bet} prime coins!`);

                    // Update balances
                    balances[playerId].balance -= bet;
                    balances[turn === 0 ? opponentId : userId].balance += bet;
                } else {
                    // No bullet, continue to the next player's turn
                    messages.push(`${currentPlayer.username} pulled the trigger and... 😅 **No bullet**. Passing the gun...`);
                    turn = 1 - turn; // Switch turns
                }

                // Update the response message
                await response.update({ content: `${currentPlayer.username} pulled the trigger!`, components: [] });
            }
        } catch (error) {
            // Handle timeout or other errors
            await interaction.followUp(`${currentPlayer.username} did not respond in time. Game over!`);
            return;
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
        .setTitle('🔫 Russian Roulette Results')
        .setDescription(messages.join('\n'))
        .setColor(0xF1C40F)
        .addFields(
            { name: `${user.username}'s Balance`, value: `${balances[userId].balance} prime coins`, inline: true },
            { name: `${opponent.username}'s Balance`, value: `${balances[opponentId].balance} prime coins`, inline: true }
        )
        .setTimestamp();

    // Send the result embed
    await interaction.followUp({ embeds: [resultEmbed] });
}
