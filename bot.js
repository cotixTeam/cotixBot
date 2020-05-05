const Discord = require('discord.js');
const auth = require('./local/auth.json');
const Channels = require('./bot/Channels.json');
const IdeasClass = require('./bot/ideas');
const LeaderboardClass = require('./bot/leaderboard');
const bot = new Discord.Client();
const ideas = new IdeasClass.IdeasClass(bot);
const leaderboard = new LeaderboardClass.LeaderboardClass(bot);

bot.login(auth.token);

bot.on('ready', () => {
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
        .send("Hi " + messageReceived.username + ",\n'" + cmd + "' is not an implemented command!")
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

    if (messageContent == "!sendPlaceholder") {
        console.log("Sending placeholder!");
        sendPlaceholderMessage(messageReceived);
    } else {
        switch (messageReceived.channel.id) {
            case Channels.Ideas.id:
                if (messageContent.substring(0, 1) == "!") {
                    let args = messageContent.substring(1).split(' ');
                    let cmd = args[0];

                    args = args.splice(1);

                    let idea = args.join(' ');

                    switch (cmd) {
                        case 'add':
                            console.log("Adding idea!");
                            ideas.add(messageReceived, idea);
                            break;

                        case 'addVeto':
                            console.log("Adding (without vote) idea!");
                            ideas.addVeto(messageReceived, idea);
                            break;

                        case 'completed':
                            console.log("Completing idea!");
                            ideas.completed(messageReceived, idea);
                            break;

                        case 'unfinished':
                            console.log("Unfinishing idea!");
                            ideas.unfinished(messageReceived, idea);
                            break;

                        case 'remove':
                            console.log("Removing idea!");
                            ideas.remove(messageReceived, idea);
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
                }
                break;


            case Channels.Leaderboards.id:
                if (messageContent.substring(0, 1) == '!') { // If its a command
                    let args = messageContent.substring(1).split(' ');
                    let cmd = args[0];

                    args = args.splice(1);

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
                }
                break;
        }
    }
});