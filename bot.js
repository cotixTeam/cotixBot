const Discord = require('discord.js');
const FileSystem = require('fs');
const AbortController = require('abort-controller');

const awsUtils = require('./bot/awsUtils');
const fileConversion = require('./bot/fileConversion.js');
const general = require('./bot/general.js');
const webHooks = require('./bot/webHooks.js');

let channels;
let auth;
let accesses = new Map();
var userStatsMap = new Map();

/**Environment check and assigning correct keys per environment.
 */
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

/**Bot creation and login.
 */
const bot = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
    ],
});
bot.login(auth.discordBotToken);

/**Bot command registering from files.
 */
bot.commands = new Discord.Collection();
const commandFiles = FileSystem.readdirSync('./commands').filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}

/**Interaction handler, which passes the commands through to the handlers in the respective files.
 */
bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (!bot.commands.has(interaction.commandName)) return;

    try {
        let command_name = interaction.commandName;
        let group_name = interaction.options._subcommand;
        let sub_command_name = interaction.options._group;

        let console_string = command_name + ': ';

        if (group_name) console_string = console_string + group_name + ': ';
        if (sub_command_name) console_string = console_string + sub_command_name + ': ';

        if (
            interaction.options.data &&
            interaction.options.data[0].options &&
            interaction.options.data[0].options[0].options
        )
            console_string =
                console_string +
                interaction.options.data[0].options[0].options
                    .map((option) => option.name + ': ' + option.value)
                    .join(', ');

        console.log(console_string);
        await bot.commands.get(interaction.commandName).execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

/**Message handler, which is used to check for keywords and used to keep stats up to date.
 */
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

// Comment to update backend structure
/**When voice channel updates, use to update the stats.
 */
bot.on('voiceStateUpdate', (oldState, newState) => {
    general.updateVoiceStats(oldState, newState);
});

/**Initialisation code for the bot to ensure the correct information on load.
 */
bot.on('ready', async () => {
    console.info('Connected!');
    console.info('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')!');

    // Register commands per guild (faster than bot wide, which takes up to 1 hr)
    bot.guilds.cache.forEach((guild) => {
        bot.guilds.cache.get(guild.id).commands.set(bot.commands);
    });

    // Download and store the current variables
    channels = await awsUtils.load('store.mmrree.co.uk', 'config/Channels.json');

    let usersStorage = await awsUtils.load('store.mmrree.co.uk', 'stats/Users.json');
    userStatsMap = await fileConversion.JSONObjectToMap(usersStorage);

    let accessesStorage = await awsUtils.load('store.mmrree.co.uk', 'config/AccessMaps.json');
    accesses = new Map(accessesStorage);

    // Exports to ensure up to date informaiton.
    exports.bot = bot;
    exports.auth = auth;
    exports.channels = channels;
    exports.accesses = accesses;
    exports.userStatsMap = userStatsMap;

    // Initialisers for other classes.
    general.init();
    webHooks.init();
});
