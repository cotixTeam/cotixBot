// Node / Default package requirements
const Discord = require('discord.js');
const FileSystem = require('fs');

// Custom classes
const GeneralClass = require('./bot/general.js');
const IdeasClass = require('./bot/ideas.js');
const LeaderboardClass = require('./bot/leaderboard.js');
const ReminderClass = require('./bot/reminder.js');
const MusicClass = require('./bot/music.js');


// Parsed JSON files & prevent fatal crashes with catches
let Channels;
let auth;
try {
    if (FileSystem.existsSync("./local/auth.json")) auth = JSON.parse(FileSystem.readFileSync("./local/auth.json"));
    else {
        auth = {
            "discordBotToken": process.env.DISCORD_BOT_TOKEN,
            "discordCallback": process.env.DISCORD_CALLBACK,
            "discordClientId": process.env.DISCORD_CLIENT_ID,
            "discordClientSecret": process.env.DISCORD_CLIENT_SECRET,
            "spotifyCallback": process.env.SPOTIFY_CALLBACK,
            "spotifyClientId": process.env.SPOTIFY_CLIENT_ID,
            "spotifyClientSecret": process.env.SPOTIFY_CLIENT_SECRET,
            "spotifyDiscordConnectUrl": process.env.SPOTIFY_DISCORD_CONNECT_URL,
            "googleToken": process.env.YOUTUBE_KEY,
            "spotifyRedirect": process.env.SPOTIFY_REDIRECT
        }
    }
    console.log(auth);

    if (FileSystem.existsSync("./local/Channels.json")) {
        console.log("Using local Channels file!");
        Channels = JSON.parse(FileSystem.readFileSync("./local/Channels.json"));
    } else {
        console.log("Using ./bot/config/ Channels file!")
        Channels = JSON.parse(FileSystem.readFileSync("./bot/config/Channels.json"));
    }
} catch (err) {
    console.error(err);
    bot.destroy();
    process.exit();
}

// Object creation
const bot = new Discord.Client();
var ideas = null;
var leaderboard = null;
var reminder = null;
var general = null;
var music = null;

bot.login(auth.discordBotToken);

bot.on('ready', () => { // Run init code
    console.log('Connected!');
    console.log('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')!');

    general = new GeneralClass.GeneralClass(bot, Channels);
    ideas = new IdeasClass.IdeasClass(bot, Channels);
    leaderboard = new LeaderboardClass.LeaderboardClass(bot, Channels);
    reminder = new ReminderClass.ReminderClass(bot, Channels);
    music = new MusicClass.MusicClass(bot, Channels, auth);

    general.initCleanChannelsTimouts(bot, Channels);
});

bot.on('message', async (messageReceived) => { // only use await if you care what order things happen in
    if (messageReceived.author.id != bot.user.id) { // NEED TO CHECK BECAUSE @MATT BROKE EVERYTHING

        let starWarsRegex = [/\bfourth\b/, /\bforce\b/, /\bstar\b/, /\bwars\b/, /\btrooper\b/]

        if (messageReceived.content.substring(0, 1) == "!") { // If its a command
            console.log(messageReceived.author.username + " sent '" + messageReceived.content + "':");

            let args = messageReceived.content.substring(1).split(' ');
            let cmd = args[0];

            args = args.splice(1);

            let argumentString = args.join(' ');

            switch (cmd) { // General server wide commands
                case "sendPlaceholder":
                    general.sendPlaceholder(messageReceived);
                    break;

                case 'toxic':
                    general.toxic(messageReceived, argumentString);
                    break;

                case "toxicId":
                    general.toxicId(messageReceived, args);
                    break;

                case 'quoteMessage':
                    general.quoteMessage(messageReceived, argumentString);
                    break;

                case 'quoteId':
                    general.quoteId(messageReceived, args);
                    break;

                case 'quote':
                    general.quote(messageReceived, args);
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

                case 'qUrl':
                    music.addByUrl(messageReceived, args);
                    break;

                case 'qSearch':
                    music.addBySearch(messageReceived, argumentString);
                    break;

                case 'qSpotify':
                    music.qSpotify(messageReceived, argumentString);
                    break;

                default:
                    // Find the relative channel, then use to decided in the switch statement
                    let channel = Channels
                        .find((item) => {
                            return item.id === messageReceived.channel.id
                        });

                    if (!channel) channel = {
                        "name": "this is a failsafe - go to default!"
                    };

                    switch (channel.name) { // Checking the channel for the specific commands
                        case "Settings":
                            switch (cmd) { // Channel specific commands
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

                        case "Ideas":
                            switch (cmd) { // channel specific commands
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


                        case "Leaderboards":
                            switch (cmd) { // Channel specific commands
                                case 'reset':
                                    leaderboard.reset(messageReceived, args[0]);
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
        } else if (messageReceived.content.includes(bot.user.id)) { // Check if the message includes AFTER its been checked for a command (to not respond to a command)
            general.insultResponse(messageReceived);

        } else if (starWarsRegex.some(regex => regex.test(messageReceived.content))) { // checks if any starWarsString is in messageReceived.content
            general.starWarsResponse(messageReceived);
        }
    }
});

bot.on('voiceStateUpdate', (oldState, newState) => {
    console.log("OldState:");
    console.log(oldState);
    console.log("NewState:");
    console.log(newState);
});

// catch uncaught exceptions
process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
        process.exit(1);
    });