// Node / Default package requirements
const Discord = require('discord.js');
const FileSystem = require('fs');
const request = require('request');

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

var ideas = null;
var leaderboard = null;
var reminder = null;

bot.on('ready', () => { // Run init code
    console.log('Connected');
    console.log('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')');

    bot.user.setPresence({
        activity: {
            name: "music"
        },
        status: "online"
    });

    ideas = new IdeasClass.IdeasClass(bot, Channels);
    leaderboard = new LeaderboardClass.LeaderboardClass(bot, Channels);
    reminder = new ReminderClass.ReminderClass(bot, Channels);

    // Setting up clean channels at midnight setting (Used for the bulk delete WIP )
    let cleanChannelDate = new Date();
    cleanChannelDate.setSeconds(cleanChannelDate.getSeconds() + 10);
    cleanChannelDate.setMilliseconds(0);
    cleanChannelDate.setDate(cleanChannelDate.getDate() + 1);
    cleanChannelDate.setHours(0);
    cleanChannelDate.setMinutes(0);


    if (cleanChannelDate.getTime() - (new Date()).getTime() >= 0)
        setInterval(cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime());
    else
        setInterval(cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime() + 24 * 60 * 60 * 1000);
});

// Bulk delete, by filtering - will not delete any bot messages, so these will still have to be deleted manually
// TODO: add a !cleanChannels command ONLY accessible by admins / moderators (not too hard to check permissions like that)
async function cleanChannels() {
    let cleanChannelArray = bot.channels.cache.filter(channel => {
        if (channel.type == "text") return channel;
    })

    for (let queryChannel of Channels) {
        if (queryChannel.keepClean) {
            console.log("Cleaning channel " + queryChannel.name + " (" + queryChannel.id + ")!");
            await cleanChannelArray.find((item) => {
                if (item.id == queryChannel.id) return true;
            }).messages.fetch({
                limit: 100
            }).then((messageArray) => {
                messageArray.each(message => {
                    if (message.author.id != bot.user.id) message.delete();
                });
            }).catch((err) => {
                console.error(err);
            });
        }
    }
}

function notImplementedCommand(messageReceived, cmd) {
    messageReceived.author
        .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
        .then((sentMessage) => {
            messageReceived.delete();
        });
}

bot.on('message', (messageReceived) => {
    if (messageReceived.author.id != bot.user.id) { // NEED TO CHECK BECAUSE @MATT BROKE EVERYTHING

        let messageContent = messageReceived.content;

        let starWarsStrings = ["may the fourth", "the force", "star wars", "trooper"]


        if (messageContent.substring(0, 1) == "!") { // If its a command
            let args = messageContent.substring(1).split(' ');
            let cmd = args[0];

            args = args.splice(1);

            let argumentString = args.join(' ');

            switch (cmd) { // General server wide commands
                case "sendPlaceholder":
                    console.log("Sending placeholder!");
                    messageReceived.channel
                        .send('Placeholder Message')
                        .then(() => {
                            messageReceived.delete();
                        });
                    break;

                case "toxic":
                    console.log("Marking the quoted message as toxic!");

                    // Checks for 3 numbers, doesn't check yet if the channel or server are correct.
                    let regexURI = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

                    let match = args[0].match(regexURI)

                    if (match) {
                        messageReceived.channel.messages.fetch(match[match.length - 1]).then(toxicMessage => {
                            toxicMessage.react('🇹').then(() => {
                                toxicMessage.react('🇴').then(() => {
                                    toxicMessage.react('🇽').then(() => {
                                        toxicMessage.react('🇮').then(() => {
                                            toxicMessage.react('🇨')
                                        })
                                    })
                                })
                            })
                        }).catch((err) => {
                            console.error(err)
                        })
                    }
                    messageReceived.delete();
                    break;

                case 'camel':
                    console.log("Responding with cAmEl FoNt!");
                    let camelString = "";
                    let camelIndex = 0;

                    for (i = 0; i < argumentString.length; i++) {
                        if (argumentString.charAt(i) == " ") {
                            camelString += " ";
                        } else if (camelIndex % 2 == 0) {
                            camelIndex++;
                            camelString += argumentString.charAt(i).toLowerCase();
                        } else {
                            camelIndex++;
                            camelString += argumentString.charAt(i).toUpperCase();
                        }
                    }

                    messageReceived.channel.send("> " + camelString + "\n- <@!" + messageReceived.author.id + ">").then(() => {
                        messageReceived.delete();
                    });
                    break;

                case '8ball':
                    console.log("Responding with an 8 ball prediction!");
                    let responses = ["As I see it, yes.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don’t count on it.", "It is certain.", "It is decidedly so.", "Most likely.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Outlook good.", "Reply hazy, try again.", "Signs point to yes.", "Very doubtful.", "Without a doubt.", "Yes.", "Yes – definitely.", "You may rely on it."]
                    let randomNumber = Math.floor(Math.random() * responses.length);
                    messageReceived.reply("you asked '" + argumentString + "'...\n" + responses[randomNumber]);
                    break;

                case 'help':
                    console.log("Sending a help list of all the commands to the user!");
                    let message = "List of commands:";
                    let commandList = null
                    try {
                        commandList = JSON.parse(FileSystem.readFileSync("./bot/config/Commands.json"));
                    } catch (err) {
                        console.error(err);
                        bot.destroy();
                        process.exit();
                    }
                    for (let command of commandList) {
                        if (message.length + 300 < 2000)
                            message += "\n`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
                        else {
                            messageReceived.author.send(message);
                            message = ".\n`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
                        }
                    }
                    messageReceived.author.send(message)
                        .then((sentMessage) => {
                            messageReceived.delete();
                        })
                    break;



                default:
                    // Find the relative channel, then use to decided in the switch statement
                    let channel = Channels.find((item) => {
                        return item.id === messageReceived.channel.id
                    });

                    switch (channel.name) { // Checking the channel for the specific commands
                        case "Settings":
                            switch (cmd) { // Channel specific commands
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

                        case "Ideas":
                            switch (cmd) { // channel specific commands
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


                        case "Leaderboards":
                            switch (cmd) { // Channel specific commands
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
                        default:
                            console.log("Not implemented!");
                            notImplementedCommand(messageReceived, cmd);
                            break;
                    }
            }
        } else if (messageContent.includes(bot.user.id)) { // Check if the message includes AFTER its been checked for a command (to not respond to a command)
            console.log("Responding with insult!")

            request('https://evilinsult.com/generate_insult.php?lang=en&type=json', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    content = JSON.parse(body)
                    messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
                }
            });

        } else if (starWarsStrings.some(testString => messageContent.includes(testString))) {
            console.log("Responding with star wars gif");
            request('http://api.giphy.com/v1/gifs/search?q=' + "star wars" + '&rating=r&api_key=dc6zaTOxFJmzC', function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    content = JSON.parse(body)
                    item = Math.floor(Math.random() * 5) // The far right number is the top X results value
                    messageReceived.channel.send(content.data[item].bitly_gif_url);
                }
            });
        }
    }
});
