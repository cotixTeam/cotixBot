// Node / Default package requirements
const Discord = require('discord.js');
const FileSystem = require('fs');
const AbortController = require('abort-controller');

// Custom classes
const awsUtils = require('./bot/awsUtils');
const fileConversion = require('./bot/fileConversion.js');
const general = require('./bot/general.js');
const webHooks = require('./bot/webHooks.js');

// Parsed JSON files & prevent fatal crashes with catches
let channels;
let auth;
let accesses = new Map();
var userStatsMap = new Map();

try {
    if (process.env.DISCORD_BOT_TOKEN) {
        console.log('Production Env');
        auth = {
            discordBotToken: process.env.DISCORD_BOT_TOKEN,
            discordClientId: process.env.DISCORD_CLIENT_ID,
            discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
            root: process.env.ROOT,
            spotifyDiscordConnectUrl: process.env.SPOTIFY_DISCORD_CONNECT_URL,
            googleToken: process.env.GOOGLE_KEY,
            spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
            steamKey: process.env.STEAMKEY,
        };
    } else {
        console.log('Local Dev Env');
        auth = JSON.parse(FileSystem.readFileSync('./local/auth.json'));
    }
    console.info(auth);
} catch (err) {
    console.error(err);
    process.exit();
}

// Object creation
const bot = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
    ],
});

bot.commands = new Discord.Collection();
const commandFiles = FileSystem.readdirSync('./commands').filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}

bot.login(auth.discordBotToken);

bot.on('ready', async () => {
    // Run init code
    console.info('Connected!');
    console.info('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')!');

    bot.guilds.cache.forEach((guild) => {
        bot.guilds.cache.get(guild.id).commands.set(bot.commands);
    });

    channels = await awsUtils.load('store.mmrree.co.uk', 'config/Channels.json');
    exports.channels = channels;

    let usersStorage = await awsUtils.load('store.mmrree.co.uk', 'stats/Users.json');
    userStatsMap = await fileConversion.JSONObjectToMap(usersStorage);
    exports.userStatsMap = userStatsMap;

    let accessesStorage = await awsUtils.load('store.mmrree.co.uk', 'config/AccessMaps.json');
    accesses = new Map(accessesStorage);
    exports.accesses = accesses;

    general.init();
    webHooks.init();
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (!bot.commands.has(interaction.commandName)) return;

    try {
        console.log(interaction.commandName + ': ' + interaction.options.data.map((option) => option.value).join(', '));
        await bot.commands.get(interaction.commandName).execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

bot.on('message', async (messageReceived) => {
    // only use await if you care what order things happen in
    if (messageReceived.author.id != bot.user.id) {
        // NEED TO CHECK BECAUSE @MATT BROKE EVERYTHING
        console.info(messageReceived.author.username + " sent '" + messageReceived.content + "':");

        // If not a command
        general.updateMessageStats(messageReceived, userStatsMap);

        if (messageReceived.content.includes(bot.user.id)) {
            // Check if the message includes AFTER its been checked for a command (to not respond to a command)
            general.insultResponse(messageReceived);
        }

        let starWarsRegex = [/\bfourth\b/, /\bforce\b/, /\bstar\b/, /\bwars\b/, /\bstorm\b/, /\btrooper\b/];

        if (starWarsRegex.some((regex) => regex.test(messageReceived.content))) {
            // checks if any starWarsString is in messageReceived.content
            general.starWarsResponse(messageReceived);
        }
    }
});

bot.on('voiceStateUpdate', (oldState, newState) => {
    general.updateVoiceStats(oldState, newState);
});

// catch uncaught exceptions
process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', (err) => {
        console.error(err, 'Uncaught Exception thrown');
        process.exit(1);
    });

exports.bot = bot;
exports.auth = auth;
