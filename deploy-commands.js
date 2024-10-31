const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const deployCommands = async (clientId, guildId, token) => {
    const commands = [];
    const rest = new REST().setToken(token);

    // Optional: Fetch and delete existing commands
    try {
        const existingCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
        for (const command of existingCommands) {
            await rest.delete(Routes.applicationCommand(clientId, guildId, command.id));
            console.log(`Deleted command: ${command.name}`);
        }
    } catch (error) {
        console.error(`Error deleting existing commands: ${error}`);
    }

    // Load new commands (the rest of your existing code)
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    // Deploy your commands
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
};
module.exports = deployCommands;