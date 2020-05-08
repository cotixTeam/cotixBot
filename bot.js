// Node / Default package requirements
const Discord = require('discord.js');
const FileSystem = require('fs');

// Custom classes
const IdeasClass = require('./bot/ideas.js');
const LeaderboardClass = require('./bot/leaderboard.js');
const ReminderClass = require('./bot/reminder.js');


// Parsed JSON files & prevent fatal crashes with catches
let Channels = null
try {
    Channels = JSON.parse(FileSystem.readFileSync("./bot/config/Channels.json"));
} catch (err) {
    console.error(err);
    process.exit();
}

// Object creation
const bot = new Discord.Client();

// Environment check based on if pre-processor setting is made
if (process.env.botToken != null) bot.login(process.env.botToken);
else {
    try {
        let auth = JSON.parse(FileSystem.readFileSync("./local/auth.json"))
        bot.login(auth.token);
    } catch (err) {
        console.error(err);
        bot.destroy();
        process.exit();
    }
}

// Functional Blocks
const ideas = new IdeasClass.IdeasClass(bot, Channels);
const leaderboard = new LeaderboardClass.LeaderboardClass(bot, Channels);
const reminder = new ReminderClass.ReminderClass(bot, Channels);

bot.on('ready', () => { // Run init code
    console.log('Connected');
    console.log('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')');

    bot.user.setPresence({
        activity: {
            name: "music"
        },
        status: "online"
    });
});

function notImplementedCommand(messageReceived, cmd) {
    messageReceived.author
        .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
        .then((sentMessage) => {
            messageReceived.delete();
        });
}

bot.on('message', (messageReceived) => {
    let messageContent = messageReceived.content;

    if (messageContent.substring(0, 1) == "!") {
        let args = messageContent.substring(1).split(' ');
        let cmd = args[0];

        args = args.splice(1);

        let argumentString = args.join(' ');

        if (messageContent == "!sendPlaceholder") {
            console.log("Sending placeholder!");
            messageReceived.channel
                .send('Placeholder Message')
                .then(() => {
                    messageReceived.delete();
                });
        } else {
            switch (messageReceived.channel.id) {
                case Channels.Settings.id:
                    switch (cmd) {
                        case 'listEvents':
                            console.log("Listing events that can be added to reminder!");
                            reminder.listEvents(messageReceived);
                            break;

                        case 'joinReminder':
                            console.log("Joining notification list for event!");
                            reminder.joinReminder(messageReceived, argumentString);
                            break;

                        case 'leaveReminder':
                            console.log("Leaving notification list for event!");
                            reminder.leaveReminder(messageReceived, argumentString);
                            break;

                        default:
                            console.log("Not implemented!");
                            notImplementedCommand(messageReceived, cmd);
                            break;
                    }
                    break;

                case Channels.Ideas.id:
                    switch (cmd) {
                        case 'add':
                            console.log("Adding idea!");
                            ideas.add(messageReceived, argumentString);
                            break;

                        case 'addVeto':
                            console.log("Adding (without vote) idea!");
                            ideas.addVeto(messageReceived, argumentString);
                            break;

                        case 'completed':
                            console.log("Completing idea!");
                            ideas.completed(messageReceived, argumentString);
                            break;

                        case 'unfinished':
                            console.log("Unfinishing idea!");
                            ideas.unfinished(messageReceived, argumentString);
                            break;

                        case 'remove':
                            console.log("Removing idea!");
                            ideas.remove(messageReceived, argumentString);
                            break;

                        case 'reset':
                            console.log("Clearing todo list!");
                            ideas.reset(messageReceived);
                            break;

                        default:
                            console.log("Not implemented!");
                            notImplementedCommand(messageReceived, cmd);
                            break;
                    }
                    break;


                case Channels.Leaderboards.id:
                    switch (cmd) {
                        case 'reset':
                            console.log("Resetting leaderboard!");
                            leaderboard.reset(messageReceived, args[0]);
                            break;

                        case 'win':
                            console.log("Adding win to leaderboard!");
                            leaderboard.win(messageReceived, args);
                            break;

                        case 'winOther':
                            console.log("Adding win to leaderboard for other!");
                            leaderboard.winOther(messageReceived, args);
                            break;

                        default:
                            console.log("Not implemented!");
                            notImplementedCommand(messageReceived, cmd);
                            break;
                    }
                    break;
            }
        }
    }

});