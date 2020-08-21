// Node / Default package requirements
const Discord = require('discord.js');
const { findBestMatch } = require('string-similarity');

// Custom classes
const awsUtils = require('./bot/awsUtils');
const fileConversion = require('./bot/fileConversion.js');
const gamesFinder = require('./bot/gamesFinder.js');
const general = require('./bot/general.js');
const ideas = require('./bot/ideas.js');
const leaderboard = require('./bot/leaderboard.js');
const music = require('./bot/music.js');
const reminder = require('./bot/reminder.js');
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
        const FileSystem = require('fs');
        auth = JSON.parse(FileSystem.readFileSync('./local/auth.json'));
    }
    console.info(auth);
} catch (err) {
    console.error(err);
    process.exit();
}

// Object creation
const bot = new Discord.Client();

bot.login(auth.discordBotToken);

bot.on('ready', async () => {
    // Run init code
    console.info('Connected!');
    console.info('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')!');

    channels = await awsUtils.load('store.mmrree.co.uk', 'config/Channels.json');
    exports.channels = channels;

    let usersStorage = await awsUtils.load('store.mmrree.co.uk', 'stats/Users.json');
    userStatsMap = await fileConversion.JSONObjectToMap(usersStorage);
    exports.userStatsMap = userStatsMap;

    let accessesStorage = await awsUtils.load('store.mmrree.co.uk', 'config/AccessMaps.json');
    accesses = new Map(accessesStorage);
    exports.accesses = accesses;

    general.init();
    reminder.init();
    music.init();
    ideas.init();
    leaderboard.init();
    webHooks.init();
});

bot.on('message', async (messageReceived) => {
    // only use await if you care what order things happen in
    if (messageReceived.author.id != bot.user.id) {
        // NEED TO CHECK BECAUSE @MATT BROKE EVERYTHING
        console.info(messageReceived.author.username + " sent '" + messageReceived.content + "':");
        if (messageReceived.content.substring(0, 1) == '!') {
            // If its a command

            let args = messageReceived.content.substring(1).split(' ');
            let cmd = args[0];

            let commandList = require('./bot/commands').list;
            let justCommands = commandList.map((command) => command.name);
            let bestMatch = findBestMatch('!' + cmd, justCommands);

            if (bestMatch.bestMatch.rating > 0.7 && '!' + cmd != bestMatch.bestMatch.target) {
                console.info('Changed to closest command (' + bestMatch.bestMatch.target + ')!');
                cmd = bestMatch.bestMatch.target.substring(1, bestMatch.bestMatch.target.length);
            }

            args = args.splice(1);

            let argumentString = args.join(' ');

            switch (cmd) {
                // General server wide commands
                case 'findGames':
                    gamesFinder.findGames(messageReceived, args);
                    break;

                case 'toggleModerator':
                    general.toggleModerator(messageReceived);
                    break;

                case 'sendPlaceholder':
                    general.sendPlaceholder(messageReceived);
                    break;

                case 'resetStats':
                    general.resetStats(messageReceived);
                    break;

                case 'stats':
                    general.stats(messageReceived, args);
                    break;

                case 'toxic':
                    general.toxic(messageReceived, argumentString);
                    break;

                case 'toxicId':
                    general.toxicId(messageReceived, args);
                    break;

                case 'quote':
                    general.quote(messageReceived, argumentString);
                    break;

                case 'quoteId':
                    general.quoteId(messageReceived, args);
                    break;

                case 'quoteText':
                    general.quoteText(messageReceived, args);
                    break;

                case 'camel':
                    general.camel(messageReceived, argumentString);
                    break;

                case '8ball':
                    general.eightBall(messageReceived, argumentString);
                    break;

                case 'help':
                    general.help(messageReceived);
                    break;

                case 'bulkDelete':
                    general.bulkDelete(messageReceived, args);
                    break;

                case 'react':
                    general.react(messageReceived, argumentString);
                    break;

                default:
                    // Find the relative channel, then use to decided in the switch statement
                    let channel = channels.find((item) => {
                        return item.id === messageReceived.channel.id;
                    });

                    if (!channel)
                        channel = {
                            name: 'this is a failsafe - go to default!',
                        };

                    switch (
                        channel.name // Checking the channel for the specific commands
                    ) {
                        case 'Music':
                            switch (cmd) {
                                case 'qUrl':
                                    music.addByURL(messageReceived, args);
                                    break;

                                case 'qSearch':
                                    music.addBySearch(messageReceived, argumentString);
                                    break;

                                case 'qSpotify':
                                    music.qSpotify(messageReceived, argumentString, this.music);
                                    break;
                            }
                            break;

                        case 'Settings':
                            switch (
                                cmd // Channel specific commands
                            ) {
                                case 'listEvents':
                                    reminder.listEvents(messageReceived);
                                    break;

                                case 'joinReminder':
                                    reminder.joinReminder(messageReceived, argumentString);
                                    break;

                                case 'leaveReminder':
                                    reminder.leaveReminder(messageReceived, argumentString);
                                    break;

                                default:
                                    general.notImplementedCommand(messageReceived, cmd);
                                    break;
                            }
                            break;

                        case 'Ideas':
                            switch (
                                cmd // channel specific commands
                            ) {
                                case 'add':
                                    ideas.add(messageReceived, argumentString);
                                    break;

                                case 'addVeto':
                                    ideas.addVeto(messageReceived, argumentString);
                                    break;

                                case 'completed':
                                    ideas.completed(messageReceived, argumentString);
                                    break;

                                case 'unfinished':
                                    ideas.unfinished(messageReceived, argumentString);
                                    break;

                                case 'remove':
                                    ideas.remove(messageReceived, argumentString);
                                    break;

                                case 'reset':
                                    ideas.reset(messageReceived);
                                    break;

                                default:
                                    general.notImplementedCommand(messageReceived, cmd);
                                    break;
                            }
                            break;

                        case 'Leaderboards':
                            switch (
                                cmd // Channel specific commands
                            ) {
                                case 'clearUsers':
                                    leaderboard.clearUsers(messageReceived, args[0]);
                                    break;

                                case 'clearScores':
                                    leaderboard.clearScores(messageReceived, args[0]);
                                    break;

                                case 'addPlayer':
                                    leaderboard.addPlayer(messageReceived, args);
                                    break;

                                case 'remPlayer':
                                    leaderboard.remPlayer(messageReceived, args);
                                    break;

                                case 'addLeaderboard':
                                    leaderboard.addLeaderboard(messageReceived, args);
                                    break;

                                case 'remLeaderboard':
                                    leaderboard.remLeaderboard(messageReceived, args);
                                    break;

                                case 'win':
                                    leaderboard.win(messageReceived, args);
                                    break;

                                case 'winOther':
                                    leaderboard.winOther(messageReceived, args);
                                    break;

                                default:
                                    general.notImplementedCommand(messageReceived, cmd);
                                    break;
                            }
                            break;

                        default:
                            general.notImplementedCommand(messageReceived, cmd);
                            break;
                    }
            }
        } else {
            // If not a command
            general.updateMessageStats(messageReceived, userStatsMap);

            if (messageReceived.content.includes(bot.user.id)) {
                // Check if the message includes AFTER its been checked for a command (to not respond to a command)
                general.insultResponse(messageReceived);
            }

            let starWarsRegex = [/\bfourth\b/, /\bforce\b/, /\bstar\b/, /\bwars\b/, /\btrooper\b/];

            if (starWarsRegex.some((regex) => regex.test(messageReceived.content))) {
                // checks if any starWarsString is in messageReceived.content
                general.starWarsResponse(messageReceived);
            }
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
