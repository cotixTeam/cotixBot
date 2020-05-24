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
        messageReceived.author
            .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
            .then((sentMessage) => {
                messageReceived
                    .reply("is an idiot, he wrote the command: " + messageReceived.content)
                    .then(() => {
                        messageReceived.delete();
                    });
            });
    }

    starWarsResponse(messageReceived) {
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
        request('https://evilinsult.com/generate_insult.php?lang=en&type=json', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body)
                messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
            } else {
                console.error(error + " " + response)
            }
        });
    }

    initCleanChannelsTimouts() {
        // Setting up clean channels at midnight setting (Used for the bulk delete WIP )
        let cleanChannelDate = new Date();
        cleanChannelDate.setSeconds(cleanChannelDate.getSeconds() + 10);
        cleanChannelDate.setMilliseconds(0);
        cleanChannelDate.setDate(cleanChannelDate.getDate() + 1);
        cleanChannelDate.setHours(0);
        cleanChannelDate.setMinutes(0);


        if (cleanChannelDate.getTime() - (new Date()).getTime() >= 0)
            setTimeout(this.cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime());
        else
            setTimeout(this.cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime() + 24 * 60 * 60 * 1000);
    }

    // Bulk delete, by filtering - will not delete any pinned
    async cleanChannels() {
        let cleanChannelArray = this.bot.channels.cache.filter(channel => {
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

    bulkDelete(messageReceived, args) {
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
        messageReceived.delete();
    }

    help(messageReceived) {
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
    }

    eightBall(messageReceived, argumentString) {
        let responses = ["As I see it, yes.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don’t count on it.", "It is certain.", "It is decidedly so.", "Most likely.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Outlook good.", "Reply hazy, try again.", "Signs point to yes.", "Very doubtful.", "Without a doubt.", "Yes.", "Yes – definitely.", "You may rely on it."]
        let randomNumber = Math.floor(Math.random() * responses.length);
        messageReceived
            .reply("you asked '" + argumentString + "'...\n" + responses[randomNumber]);
    }

    camel(messageReceived, argumentString) {
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

        messageReceived.delete();
    }

    quote(messageReceived, args) {
        let userId = args[0].substring(3, 21);
        args = args.splice(1);
        let quoteString = args.join(' ');

        this.quoteMacro(quoteString, userId, null);
        messageReceived.delete();
    }

    quoteId(messageReceived, args) {
        // Checks for 3 numbers, doesn't check yet if the channel or server are correct.
        let regexURIQuote = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

        let quoteMatch = args[0].match(regexURIQuote)

        if (quoteMatch) {
            messageReceived.channel.messages
                .fetch(quoteMatch[quoteMatch.length - 1])
                .then((toxicMessage) => {
                    this.quoteMacro(toxicMessage.content, toxicMessage.author.id, toxicMessage.createdAt);
                }).catch((err) => {
                    console.error(err)
                })
        }

        messageReceived.delete();
    }

    quoteMessage(messageReceived, argumentString) {
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
        messageReceived.delete();
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
    }

    toxic(messageReceived, argumentString) {
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
    }

    sendPlaceholder(messageReceived) {
        messageReceived.channel.send('Placeholder Message');
        messageReceived.delete();
    }
}

module.exports = {
    GeneralClass: GeneralClass
};