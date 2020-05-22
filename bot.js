// Node / Default package requirements
const Discord = require('discord.js');
const FileSystem = require('fs');
const request = require('request');
const ytdl = require('ytdl-core');
const express = require('express');

// Custom classes
const IdeasClass = require('./bot/ideas.js');
const LeaderboardClass = require('./bot/leaderboard.js');
const ReminderClass = require('./bot/reminder.js');
const GeneralClass = require('./bot/general.js');
const webHook = express();

webHook.listen('3000', () => console.log(`🚀 Server running on port 3000`))
webHook.use(express.urlencoded());

webHook.get('/spotifyCallback', (req, res) => {
    console.log(req.query);
    res.status(200).send('<!DOCTYPE html>\
    <html>\
    <head>\
    <title>Link your discord account!</title>\
    </head>\
    <h1>To link your discord account enter it below, otherwise it will not work!</h1>\
    <form method="POST" action="/spotifySubmit">\
    <input type="hidden" id="code" name="code" value="' + req.query.code + '">\
    <label>DiscordId: </label>\
    <input type="text" id="discordId" name="discordId">\
    <input type="submit">\
    </form>');
});

var spotifyData = {
    voiceChannel: null,
    connection: null,
    player: null,
    songs: [],
    volume: 5,
    playing: false,
    accesses: []
};

webHook.post('/spotifySubmit', (req, res) => {
    // do the thing to link the account to the user
    res.status(200).end();
});

// Parsed JSON files & prevent fatal crashes with catches
let Channels;
let auth;
try {
    auth = JSON.parse(FileSystem.readFileSync("./local/auth.json"));

    if (FileSystem.existsSync("./local/Channels.json")) {
        console.log("Using local Channels file!");
        Channels = JSON.parse(FileSystem.readFileSync("./local/Channels.json"));
    } else {
        require('log-timestamp');
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

bot.login(auth.discordToken);

bot.on('ready', () => { // Run init code
    console.log('Connected!');
    console.log('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')!');

    bot.user.setPresence({
        activity: {
            name: "music"
        },
        status: "online"
    });

    ideas = new IdeasClass.IdeasClass(bot, Channels);
    leaderboard = new LeaderboardClass.LeaderboardClass(bot, Channels);
    reminder = new ReminderClass.ReminderClass(bot, Channels);
    general = new GeneralClass.GeneralClass(bot);

    // Setting up clean channels at midnight setting (Used for the bulk delete WIP )
    let cleanChannelDate = new Date();
    cleanChannelDate.setSeconds(cleanChannelDate.getSeconds() + 10);
    cleanChannelDate.setMilliseconds(0);
    cleanChannelDate.setDate(cleanChannelDate.getDate() + 1);
    cleanChannelDate.setHours(0);
    cleanChannelDate.setMinutes(0);


    if (cleanChannelDate.getTime() - (new Date()).getTime() >= 0)
        setTimeout(cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime());
    else
        setTimeout(cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime() + 24 * 60 * 60 * 1000);

    let authString = Buffer.from(auth.spotifyClientId + ":" + auth.spotifyClientSecret).toString('base64');

    /*request.post({
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            Authorization: 'Basic ' + authString
        },
        form: {
            grant_type: "client_credentials"
        }
    }, (error, response, body) => {
        spotifyData.accesses['General'] = JSON.parse(body).access_token;
    });*/

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
                })
                .then((messageArray) => {
                    messageArray.each(message => {
                        if (!message.pinned) message.delete();
                    });
                }).then(() => {
                    // Create a timer for 24 hours to repeat the task
                    setTimeout(cleanChannels, 24 * 60 * 60 * 1000);
                }).catch((err) => {
                    console.error(err);
                });
        }
    }
}

function quoteMessage(quoteMessageContent, userId) {
    for (let channel of Channels) {
        if (channel.name == "Quotes") {
            new Discord.Channel(bot, {
                    id: channel.id
                })
                .fetch()
                .then((quotesChannel) => {
                    let today = new Date();
                    let dateString = today.getHours() + ":" + today.getMinutes() + " on " + today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear();
                    quoteMessageContent = quoteMessageContent.split("\n").join("\n> "); // Looks dumb, is the best way to replace all instances of "\n" by something else strangely
                    quotesChannel.send("> " + quoteMessageContent + "\nBy <@!" + userId + "> at " + dateString);
                }).catch(err => {
                    console.log(err);
                })
        }
    }
}

bot.on('message', async (messageReceived) => { // only use await if you care what order things happen in
    if (messageReceived.author.id != bot.user.id) { // NEED TO CHECK BECAUSE @MATT BROKE EVERYTHING
        let starWarsRegex = [/\bfourth\b/, /\bforce\b/, /\bstar\b/, /\bwars\b/, /\btrooper\b/]

        if (messageReceived.content.substring(0, 1) == "!") { // If its a command
            let args = messageReceived.content.substring(1).split(' ');
            let cmd = args[0];

            args = args.splice(1);

            let argumentString = args.join(' ');

            switch (cmd) { // General server wide commands
                case "sendPlaceholder":
                    console.log("Sending placeholder!");

                    messageReceived.channel.send('Placeholder Message');
                    messageReceived.delete();
                    break;

                case 'toxic':
                    console.log("Searching for the message to mark as toxic!");

                    messageReceived.channel.messages
                        .fetch({
                            limit: 20
                        })
                        .then((messageArray) => {
                            messageArray.each(async (message) => {
                                if (message.content.includes(argumentString) && message != messageReceived) {
                                    await message.react('🇹');
                                    await message.react('🇴');
                                    await message.react('🇽');
                                    await message.react('🇮');
                                    await message.react('🇨');
                                }
                            });
                        }).catch(err => console.error(err));
                    messageReceived.delete();
                    break;

                case "toxicId":
                    console.log("Marking the id'd message as toxic!");

                    // Checks for 3 numbers, doesn't check yet if the channel or server are correct.
                    let regexURIToxic = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

                    let matchToxic = args[0].match(regexURIToxic)

                    if (matchToxic) {
                        messageReceived.channel.messages
                            .fetch(matchToxic[matchToxic.length - 1])
                            .then(async (toxicMessage) => {
                                await toxicMessage.react('🇹');
                                await toxicMessage.react('🇴');
                                await toxicMessage.react('🇽');
                                await toxicMessage.react('🇮');
                                await toxicMessage.react('🇨');
                            }).catch((err) => {
                                console.error(err)
                            })
                    }
                    messageReceived.delete();
                    break;

                case 'quoteMessage':
                    console.log("Searching for the message to quote!");

                    messageReceived.channel.messages
                        .fetch({
                            limit: 20
                        })
                        .then((messageArray) => {
                            messageArray.each((message) => {
                                if (message.content.includes(argumentString) && message != messageReceived) {
                                    quoteMessage(message.content, message.author.id);
                                }
                            });
                        }).catch(err => console.error(err));
                    messageReceived.delete();
                    break;

                case 'quoteId':
                    console.log("Quoting the id'd message!");

                    // Checks for 3 numbers, doesn't check yet if the channel or server are correct.
                    let regexURIQuote = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

                    let quoteMatch = args[0].match(regexURIQuote)

                    if (quoteMatch) {
                        messageReceived.channel.messages
                            .fetch(quoteMatch[quoteMatch.length - 1])
                            .then((toxicMessage) => {
                                quoteMessage(toxicMessage.content, toxicMessage.author.id);
                            }).catch((err) => {
                                console.error(err)
                            })
                    }

                    messageReceived.delete();
                    break;

                case 'quote':
                    console.log("Quote the string (not mentioned by anyone)!");

                    let userId = args[0].substring(3, 21);
                    args = args.splice(1);
                    let quoteString = args.join(' ');

                    quoteMessage(quoteString, userId);
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

                    messageReceived.channel
                        .send("> " + camelString + "\n- <@!" + messageReceived.author.id + ">");

                    messageReceived.delete();
                    break;

                case '8ball':
                    console.log("Responding with an 8 ball prediction!");

                    let responses = ["As I see it, yes.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don’t count on it.", "It is certain.", "It is decidedly so.", "Most likely.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Outlook good.", "Reply hazy, try again.", "Signs point to yes.", "Very doubtful.", "Without a doubt.", "Yes.", "Yes – definitely.", "You may rely on it."]
                    let randomNumber = Math.floor(Math.random() * responses.length);
                    messageReceived
                        .reply("you asked '" + argumentString + "'...\n" + responses[randomNumber]);
                    break;

                case 'help':
                    console.log("Sending a help list of all the commands to the user!");

                    let message = "List of commands:";
                    let commandList;

                    try {
                        commandList = JSON.parse(FileSystem.readFileSync("./bot/config/Commands.json"));
                    } catch (err) {
                        console.error(err)
                    }

                    for (let command of commandList) {
                        if (message.length + 300 < 2000)
                            message += "\n`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
                        else {
                            messageReceived.author
                                .send(message);
                            message = ".\n`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
                        }
                    }
                    messageReceived.author
                        .send(message);
                    messageReceived.delete();
                    break;

                case 'bulkDelete':
                    let adminRoles = ["668465816894832641", "705760947721076756"]
                    let permissionsFound = messageReceived.member.roles._roles.array().some((role) => adminRoles.includes(role.id));


                    if (permissionsFound) {
                        let messageCount = parseInt(args[0]);

                        // Plus one to the message count to INCLUDE the message just sent
                        if (messageCount + 1 > 100) messageCount = 100;
                        else if (messageCount <= 0) messageCount = 1;
                        else messageCount = messageCount + 1;

                        console.log("Bulk deleting " + messageCount + " messages!");

                        messageReceived.channel.messages
                            .fetch({
                                limit: messageCount,
                                before: messageReceived.id
                            })
                            .then((messageArray) => {
                                messageArray.each(message => {
                                    if (!message.pinned) message.delete();
                                });
                            }).catch((err) => {
                                console.error(err);
                            });
                    } else {
                        messageReceived.author
                            .send("Hi " + messageReceived.author.username + ",\nYou do not have the permissions for the bulkDelete command!");
                    }
                    messageReceived.delete();
                    break;

                case 'playMusic':
                    console.log("Joining the channel of the user!");

                    let voiceChannel = messageReceived.member.voice.channel;

                    if (voiceChannel) {
                        let permissions = voiceChannel.permissionsFor(messageReceived.client.user);
                        if (permissions.has("CONNECT") && permissions.has("SPEAK")) {

                            try {
                                spotifyData.connection = await voiceChannel.join();

                                spotifyData.playing = true;

                                function play() {
                                    spotifyData.player = spotifyData.connection.play(ytdl(spotifyData.songs[0], {
                                        quality: "highestaudio",
                                        filter: "audioonly"
                                    })).on("finish", () => {
                                        spotifyData.songs.shift();
                                        if (!spotifyData.songs[0]) {
                                            voiceChannel.leave();
                                        } else {
                                            play();
                                        }
                                    });
                                    spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
                                }
                                play();

                            } catch (err) {
                                spotifyData.playing = false;
                                console.error(err);
                            }
                        } else {
                            messageReceived.send("I need permissions to be able to join the voice channel!");
                        }
                    } else {
                        messageReceived.send("You need to be in a voice channel for me to join!");
                    }
                    messageReceived.delete();
                    break;

                case 'qSkip':
                    console.log("Skipping the current song!");
                    if (!messageReceived.member.voice.channel)
                        return messageReceived.channel.send(
                            "You have to be in a voice channel to stop the music!"
                        );
                    if (!spotifyData)
                        return messageReceived.channel.send("There is no song that I could skip!");
                    spotifyData.connection.dispatcher.end();
                    messageReceived.delete();
                    break;

                case 'qStop':
                    console.log("Stopping the music playing!");
                    if (!messageReceived.member.voice.channel)
                        return messageReceived.channel.send(
                            "You have to be in a voice channel to stop the music!"
                        );
                    spotifyData.songs = [];
                    spotifyData.connection.dispatcher.end();
                    messageReceived.delete();
                    break;

                case 'qUrl':
                    console.log("Adding the youtube url to queue (if valid)!");

                    if (ytdl.validateURL(args[0])) spotifyData.songs.push(args[0]);
                    messageReceived.delete();
                    break;

                case 'qSearch':
                    console.log("Searching for term on youtube!");

                    let options = {
                        part: "id",
                        type: "video",
                        q: argumentString,
                        key: auth.googleToken
                    }

                    let queryString = Object.keys(options)
                        .map(param => encodeURIComponent(param) + "=" + encodeURIComponent(options[param])).join('&');

                    request('https://www.googleapis.com/youtube/v3/search?' + queryString, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            content = JSON.parse(body);
                            spotifyData.songs.push(content.items[0].id.videoId);
                        } else {
                            console.error(error);
                        }
                    })
                    messageReceived.delete();
                    break;

                case 'qClear':
                    console.log("Clearing the queue!");
                    spotifyData.songs = [];
                    messageReceived.delete();
                    break;

                case 'qList':
                    console.log("Showing the songs in the queue!");

                    Promise.all(spotifyData.songs.map(song => ytdl.getInfo(song)))
                        .then(songArray => {
                            let songTitles = songArray.map(songObject => songObject.title);
                            messageReceived.channel.send("The songs in the queue are:\n" + songTitles.join('\n'))
                        })

                    messageReceived.delete();
                    break;

                /*case 'qSpotify':
                    console.log("Queuing spotify if the user has a token, if not, then request one!");
                    let auth = "Bearer " + spotifyApi.getAccessToken();
                    request.get({
                        url: 'https://api.spotify.com/v1/users/11131862133/tracks',
                        headers: {
                            Authorization: auth
                        }
                    }, (error, response, body) => {
                        console.log(body);
                    })
                    /*spotifyApi.getUserPlaylists('11131862133', {
                        limit: 50
                    }).then((data) => {
                        console.log(data.body.items);
                    });
                    messageReceived.delete();
                    break;*/

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

                                    general.notImplementedCommand(messageReceived, cmd);
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

                                    general.notImplementedCommand(messageReceived, cmd);
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

                                    general.notImplementedCommand(messageReceived, cmd);
                                    break;
                            }
                            break;

                        default:
                            console.log("Not implemented!");

                            general.notImplementedCommand(messageReceived, cmd);
                            break;
                    }
            }
        } else if (messageReceived.content.includes(bot.user.id)) { // Check if the message includes AFTER its been checked for a command (to not respond to a command)
            console.log("Responding with insult!")

            request('https://evilinsult.com/generate_insult.php?lang=en&type=json', (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    content = JSON.parse(body)
                    messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
                } else {
                    console.error(error + " " + response)
                }
            });

        } else if (starWarsRegex.some(regex => regex.test(messageReceived.content))) { // checks if any starWarsString is in messageReceived.content
            console.log("Responding with star wars gif");

            request('https://api.tenor.com/v1/search?q=' + "star wars" + '&ar_range=standard&media_filter=minimal&api_key=RRAGVB36GEVU', (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    content = JSON.parse(body)
                    item = Math.floor(Math.random() * content.results.length) // The far right number is the top X results value
                    messageReceived.channel.send("Star wars!\n" + content.results[item].url);
                } else {
                    console.error(error + " " + response);
                }
            });
        }
    }
});