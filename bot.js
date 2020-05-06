// Node / Default package requirements
const Discord = require('discord.js');
const FileSystem = require('fs');

// Custom classes
const IdeasClass = require('./bot/ideas.js');
const LeaderboardClass = require('./bot/leaderboard.js');
const ReminderClass = require('./bot/reminder.js');

// Parsed JSON files & prevent fatal crashes with catches
let Reminders = null
try {
    Reminders = JSON.parse(FileSystem.readFileSync("./bot/config/Reminders.json"));
} catch (err) {
    console.error(err);
}

let Channels = null
try {
    Channels = JSON.parse(FileSystem.readFileSync("./bot/config/Channels.json"));
} catch (err) {
    console.error(err);
}

// Object creation
const bot = new Discord.Client();
const ideas = new IdeasClass.IdeasClass(bot, Channels);
const leaderboard = new LeaderboardClass.LeaderboardClass(bot, Channels);
const reminder = new ReminderClass.ReminderClass(bot, Channels);

// Environment check based on if pre-processor setting is made
if (process.env.botToken != null) bot.login(process.env.botToken);
else {
    const auth = require('./local/auth.json');
    bot.login(auth.token);
}


bot.on('ready', () => { // Run init code
    console.log('Connected');
    console.log('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')');

    bot.user.setPresence({
        activity: {
            name: "music"
        },
        status: "online"
    });

    let reminderDate = new Date();
    reminderDate.setSeconds(0);
    reminderDate.setMilliseconds(0);

    for (let reminder of Reminders) {
        reminderDate.setDate(reminderDate.getDate() + reminder.day - reminderDate.getDay());
        reminderDate.setHours(reminder.hour);
        reminderDate.setMinutes(reminder.minute);
        if (reminderDate.getTime() - (new Date()).getTime() >= 0) // If later today or this week
            setTimeout(timeoutReminderFunction, reminderDate.getTime() - (new Date()).getTime(), reminder, reminderDate);
        else // If any time before this time next week, set for next week
            setTimeout(timeoutReminderFunction, reminderDate.getTime() - (new Date()).getTime() + 7 * 24 * 60 * 60 * 1000, reminder, reminderDate);
    }
});

function timeoutReminderFunction(reminder, reminderDate) {
    for (let user of reminder.users) {
        bot.users.fetch(user)
            .then((userSend) => {
                userSend.send("Hi " + userSend.username + ",\n This is your reminder for: '" + reminder.name + "'\n" + reminder.text);
            }).then(() => {
                setTimeout(timeoutReminderFunction.bind(user, reminder, reminderDate), reminderDate.getTime() + 7 * 24 * 60 * 60 * 1000 - (new Date()).getTime()); // Once started once, the reminder will go weekly
            });
    }
}

function notImplementedCommand(messageReceived, cmd) {
    messageReceived.author
        .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
        .then((sentMessage) => {
            messageReceived.delete();
        });
}

function sendPlaceholderMessage(messageReceived) {
    messageReceived.channel
        .send('Placeholder Message')
        .then(() => {
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
            sendPlaceholderMessage(messageReceived);
        } else {
            switch (messageReceived.channel.id) {
                case Channels.Settings.id:
                    switch (cmd) {
                        case 'listEvents':
                            console.log("Listing events that can be added to reminder!");
                            reminder.listEvents(messageReceived, Reminders);
                            break;

                        case 'joinReminder':
                            console.log("Joining notification list for event!");
                            reminder.joinReminder(messageReceived, argumentString, Reminders);
                            break;

                        case 'leaveReminder':
                            console.log("Leaving notification list for event!");
                            reminder.leaveReminder(messageReceived, argumentString, Reminders);
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