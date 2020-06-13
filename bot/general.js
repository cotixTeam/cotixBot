"use strict";

const Discord = require('discord.js');
const FileSystem = require('fs');
const request = require('request');

class GeneralClass {
    constructor(client, Channels) {
        this.bot = client;
        this.Channels = Channels;
    }

    notImplementedCommand(messageReceived, cmd) {
        console.log("-\tNot implemented!");
        messageReceived.author
            .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
            .then((sentMessage) => {
                messageReceived
                    .reply("is an idiot, he wrote the command: " + messageReceived.content)
                    .then(() => {
                        if (messageReceived.guild != null) messageReceived.delete();
                    });
            });
    }

    stats(messageReceived, userStatsMap) {
        if (userStatsMap.has(messageReceived.author.id)) {
            let fields = []
            userStatsMap.get(messageReceived.author.id).forEach((statChannel, statId) => {
                this.bot.channels.cache.forEach(serverChannel => {
                    if (serverChannel.id == statId) {
                        if (statChannel.type == "voice") {

                            function msToTime(duration) {
                                var milliseconds = parseInt((duration % 1000) / 100),
                                    seconds = Math.floor((duration / 1000) % 60),
                                    minutes = Math.floor((duration / (1000 * 60)) % 60),
                                    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

                                seconds = (seconds < 10 && (minutes > 0 || hours > 0)) ? "0" + seconds : seconds;
                                minutes = (minutes < 10 && hours > 0) ? "0" + minutes : minutes;
                                hours = (hours < 10) ? "0" + hours : hours;

                                if (seconds.valueOf() > 0) {
                                    if (minutes.valueOf() > 0) {
                                        if (hours.valueOf() > 0) {
                                            return hours + " hours, " + minutes + " minutes and " + seconds + " seconds";
                                        }
                                        return minutes + " minutes and " + seconds + " seconds";
                                    }
                                    return seconds + " seconds";
                                }
                                return milliseconds + " milliseconds";
                            }

                            fields.push({
                                name: serverChannel.name,
                                value: "You have spent a total of " + msToTime(statChannel.totalTime) + " in this channel!"
                            })
                        } else if (statChannel.type == "text") {
                            fields.push({
                                name: serverChannel.name,
                                value: "You have sent " + statChannel.messageCount + " messsages to this channel!"
                            })
                        }
                    }
                });
            });

            messageReceived.author.send({
                "content": "Your statistics",
                "embed": {
                    "title": "Stats",
                    "description": "Showing " + messageReceived.author.username + "'s Stats...",
                    "fields": fields
                }
            });
        } else {
            messageReceived.author.send("You have no stats on record!");
        }
        if (messageReceived.guild != null) messageReceived.delete();
    }

    starWarsResponse(messageReceived) {
        console.log("'" + messageReceived.content + "' (by " + messageReceived.author.username + ") included a star wars string!\n\tResponding with star wars gif");
        request('https://api.tenor.com/v1/search?q=' + "star wars" + '&ar_range=standard&media_filter=minimal&api_key=RRAGVB36GEVU', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body)
                let item = Math.floor(Math.random() * content.results.length) // The far right number is the top X results value
                messageReceived.channel.send("Star wars!\n" + content.results[item].url);
            } else {
                console.error(error + " " + response);
            }
        });
    }

    insultResponse(messageReceived) {
        console.log("'" + messageReceived.content + "' (by " + messageReceived.author.username + ") mentioned the bot!\n\tResponding with insult");
        request('https://evilinsult.com/generate_insult.php?lang=en&type=json', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body)
                messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
            } else {
                console.error(error + " " + response)
            }
        });
    }

    initCleanChannelsTimouts(bot, Channels) {
        // Setting up clean channels at midnight setting (Used for the bulk delete WIP )
        let cleanChannelDate = new Date();
        cleanChannelDate.setMilliseconds(0);
        cleanChannelDate.setSeconds(0);
        cleanChannelDate.setMinutes(0);
        cleanChannelDate.setHours(0);
        cleanChannelDate.setDate(cleanChannelDate.getDate() + 1);


        if (cleanChannelDate.getTime() - (new Date()).getTime() >= 0)
            setTimeout(this.cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime(), bot, Channels);
        else
            setTimeout(this.cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime() + 24 * 60 * 60 * 1000, bot, Channels);
    }

    // Bulk delete, by filtering - will not delete any pinned
    cleanChannels(bot, Channels) {
        async function clean(bot, Channels) {
            let cleanChannelArray = bot.channels.cache.filter(channel => {
                if (channel.type == "text") return channel;
            });

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
                            setTimeout(clean, 24 * 60 * 60 * 1000, bot, Channels);
                        }).catch((err) => {
                            console.error(err);
                        });
                }
            }
        }
        clean(bot, Channels);
    }

    bulkDelete(messageReceived, args) {
        console.log("-\tBulkDelete invoked, checking permissions!");
        let adminRoles = ["668465816894832641", "705760947721076756"]
        let permissionsFound = messageReceived.member.roles._roles.array().some((role) => adminRoles.includes(role.id));


        if (permissionsFound) {
            let messageCount = parseInt(args[0]);

            // Plus one to the message count to INCLUDE the message just sent
            if (messageCount + 1 > 100) messageCount = 100;
            else if (messageCount <= 0) messageCount = 1;
            else messageCount = messageCount + 1;

            console.log("\tPermissions are correct, deleting " + messageCount + " messages!");

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
            console.log("\tUser does not have the required permissions!")
            messageReceived.author
                .send("Hi " + messageReceived.author.username + ",\nYou do not have the permissions for the bulkDelete command!");
        }
        if (messageReceived.guild != null) messageReceived.delete();
    }

    help(messageReceived) {
        console.log("-\tSending a help list of all the commands to the user!");
        let message = "List of commands:";
        let commandList;

        try {
            commandList = JSON.parse(FileSystem.readFileSync("./bot/config/Commands.json"));
        } catch (err) {
            console.error(err)
        }

        let lastChannel = commandList[0].channel;

        for (let command of commandList) {
            if (message.length + 250 < 2000) {
                if (command.channel != lastChannel) {
                    message += "\n";
                    lastChannel = command.channel;
                }
                message += "\n`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
            } else {
                messageReceived.author
                    .send(message);
                message = "`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
            }
        }
        messageReceived.author
            .send(message);
        if (messageReceived.guild != null) messageReceived.delete();
    }

    eightBall(messageReceived, argumentString) {
        console.log("-\tResponding with an 8 ball prediction!");
        let responses = ["As I see it, yes.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don’t count on it.", "It is certain.", "It is decidedly so.", "Most likely.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Outlook good.", "Reply hazy, try again.", "Signs point to yes.", "Very doubtful.", "Without a doubt.", "Yes.", "Yes – definitely.", "You may rely on it."]
        let randomNumber = Math.floor(Math.random() * responses.length);
        messageReceived
            .reply("you asked '" + argumentString + "'...\n" + responses[randomNumber]);
    }

    camel(messageReceived, argumentString) {
        console.log("-\tResponding with cAmEl FoNt!");
        let camelString = "";
        let camelIndex = 0;

        for (let i = 0; i < argumentString.length; i++) {
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

        if (messageReceived.guild != null) messageReceived.delete();
    }

    quote(messageReceived, args) {
        let userId = args[0].substring(3, 21);
        args = args.splice(1);
        let quoteString = args.join(' ');

        console.log("-\tQuote the string:" + quoteSting + " (by " + userId + ")!");

        this.quoteMacro(quoteString, userId, null);
        if (messageReceived.guild != null) messageReceived.delete();
    }

    quoteId(messageReceived, args) {
        let regexURIQuote = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

        let quoteMatch = args[0].match(regexURIQuote)

        console.log("-\tQuoting the id'd message (" + quoteMatch + ")!");

        if (quoteMatch) {
            messageReceived.channel.messages
                .fetch(quoteMatch[quoteMatch.length - 1])
                .then((toxicMessage) => {
                    this.quoteMacro(toxicMessage.content, toxicMessage.author.id, toxicMessage.createdAt);
                }).catch((err) => {
                    console.error(err)
                })
        }

        if (messageReceived.guild != null) messageReceived.delete();
    }

    quoteMessage(messageReceived, argumentString) {
        console.log("-\tSearching for the message to quote (" + argumentString + ")!");
        messageReceived.channel.messages
            .fetch({
                limit: 20
            })
            .then((messageArray) => {
                messageArray.each((message) => {
                    if (message.content.includes(argumentString) && message != messageReceived) {
                        this.quoteMacro(message.content, message.author.id, message.createdAt);
                    }
                });
            }).catch(err => console.error(err));
        if (messageReceived.guild != null) messageReceived.delete();
    }

    quoteMacro(quoteMessageContent, userId, time) {
        for (let channel of this.Channels) {
            if (channel.name == "Quotes") {
                new Discord.Channel(this.bot, {
                        id: channel.id
                    })
                    .fetch()
                    .then((quotesChannel) => {
                        let today = time ? time : new Date();
                        let dateString = today.getHours() + ":" + today.getMinutes() + " on " + today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear();
                        quoteMessageContent = quoteMessageContent.split("\n").join("\n> "); // Looks dumb, is the best way to replace all instances of "\n" by something else strangely
                        quotesChannel.send("> " + quoteMessageContent + "\nBy <@!" + userId + "> at " + dateString);
                    }).catch(err => {
                        console.log(err);
                    })
            }
        }
    }

    toxicId(messageReceived, args) {
        let regexURIToxic = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

        let matchToxic = args[0].match(regexURIToxic)
        console.log("-\tMarking the id'd message as toxic (" + matchToxic + ")!");

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
        if (messageReceived.guild != null) messageReceived.delete();
    }

    toxic(messageReceived, argumentString) {
        console.log("-\tSearching for the message to mark as toxic (" + argumentString + ")!");
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
        if (messageReceived.guild != null) messageReceived.delete();
    }

    sendPlaceholder(messageReceived) {
        console.log("-\tSending placeholder!");
        messageReceived.channel.send('Placeholder Message');
        if (messageReceived.guild != null) messageReceived.delete();
    }
}

module.exports = {
    GeneralClass: GeneralClass
};