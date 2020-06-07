"use strict";

const Discord = require('discord.js');
class IdeasClass {
    constructor(client, channels) {
        this.bot = client;
        for (let channel of channels) {
            if (channel.name == "Ideas") {
                this.channel = channel;
                this.majority = channel.majority;
            }
        }

        this.ideaRegex = / (\w+[\w\S ]*)`/g;
    }

    async add(messageReceived, ideaArg) {
        console.log("-\tAdding listeners to the idea: " + ideaArg + "!");
        await messageReceived.react('👍');
        messageReceived.react('👎');

        let ideaAndAuthorString = ideaArg + ' (by ' + messageReceived.author.username + ')';

        let addFilter = (reaction, user) => reaction.emoji.name == '👍' && reaction.count == (this.majority + 1);
        let addListener = messageReceived.createReactionCollector(addFilter, {
            time: 0
        });

        let rejectFilter = (reaction, user) => reaction.emoji.name == '👎' && reaction.count == (this.majority + 1);
        let rejectListener = messageReceived.createReactionCollector(rejectFilter, {
            time: 0
        });

        addListener.on('collect', reaction => {
            console.log(ideaArg + " has received enough votes to be added!");
            new Discord.Message(this.bot, {
                    id: this.channel.todo
                }, messageReceived.channel)
                .fetch()
                .then((editMessage) => {
                    editMessage
                        .edit(editMessage.content + '\n`- [ ] ' + ideaAndAuthorString + '`')
                        .then(() => {
                            messageReceived.delete();
                        });
                });
        });

        rejectListener.on('collect', reaction => {
            console.log(ideaArg + " has received enough rejections to be removed!");
            new Discord.Message(this.bot, {
                    id: this.channel.bad
                }, messageReceived.channel)
                .fetch()
                .then((editMessage) => {
                    editMessage
                        .edit(editMessage.content + '\n||`- ' + ideaAndAuthorString + '`||')
                        .then(() => {
                            messageReceived.delete();
                        });
                });
        });
    }

    addVeto(messageReceived, idea) {
        console.log("-\tBypassing votes and adding the idea: '" + ideaArg + "' to the list!");
        new Discord.Message(this.bot, {
                id: this.channel.todo
            }, messageReceived.channel)
            .fetch()
            .then((editMessage) => {
                let messageAddition = '\n`- [ ] ' + idea + ' (by ' + messageReceived.author.username + ')`';
                editMessage
                    .edit(editMessage.content + messageAddition)
                    .then(() => {
                        messageReceived.delete();
                    });
            });
    }

    completed(messageReceived, queryIdea) {
        console.log("-\tMarking anything with the string '" + queryIdea + "' as a completed idea!");
        new Discord.Message(this.bot, {
                id: this.channel.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                let ideasMatch;

                let todoStringsArray = [];
                let completedStringsArray = [];

                while (ideasMatch = this.ideaRegex.exec(todoMessage.content)) {
                    if (ideasMatch[1].includes(queryIdea)) {
                        completedStringsArray.push("||`- [x] " + ideasMatch[1] + "`||\n");
                    } else {
                        todoStringsArray.push("`- [ ] " + ideasMatch[1] + "`\n");
                    }
                }

                todoMessage
                    .edit('Ideas:\n' + todoStringsArray.join(""))
                    .then(() => {
                        new Discord.Message(this.bot, {
                                id: this.channel.completed
                            }, messageReceived.channel)
                            .fetch()
                            .then((completedMessage) => {
                                completedMessage
                                    .edit(completedMessage.content + '\n' + completedStringsArray.join(""))
                                    .then(() => {
                                        messageReceived.delete();
                                    });

                            })
                    })
            })
    }

    unfinished(messageReceived, queryIdea) {
        console.log("-\tMarking anything with the string '" + queryIdea + "' as an unfinished idea!");
        new Discord.Message(this.bot, {
                id: this.channel.completed
            }, messageReceived.channel)
            .fetch()
            .then((completedMessage) => {
                let ideasMatch;

                let todoStringsArray = [];
                let completedStringsArray = [];

                while (ideasMatch = this.ideaRegex.exec(completedMessage.content)) {
                    if (ideasMatch[1].includes(queryIdea)) {
                        todoStringsArray.push("`- [ ] " + ideasMatch[1] + "`\n");
                    } else {
                        completedStringsArray.push("||`- [x] " + ideasMatch[1] + "`||\n");
                    }
                }

                completedMessage
                    .edit("Completed:\n" + completedStringsArray.join(""))
                    .then(() => {
                        new Discord.Message(this.bot, {
                                id: this.channel.todo
                            }, messageReceived.channel)
                            .fetch()
                            .then((todoMessage) => {
                                todoMessage
                                    .edit(todoMessage.content + "\n" + todoStringsArray.join(""))
                                    .then(() => {
                                        messageReceived.delete();
                                    });
                            })
                    })
            });
    }

    remove(messageReceived, queryIdea) {
        console.log("-\tRemoving anything with the string '" + queryIdea + "' as a todo idea!");
        new Discord.Message(this.bot, {
                id: this.channel.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                let ideasMatch;

                let todoStringsArray = []

                while (ideasMatch = this.ideaRegex.exec(todoMessage.content)) {
                    if (!ideasMatch[1].includes(queryIdea)) {
                        todoStringsArray.push("`- [ ] " + ideasMatch[1] + "`\n");
                    }
                }
                todoMessage
                    .edit("Ideas:\n" + todoStringsArray.join(''))
                    .then(() => {
                        messageReceived.delete();
                    })

            });
    }

    reset(messageReceived) {
        console.log("-\tResetting the entire todo list!");
        new Discord.Message(this.bot, {
                id: this.channel.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                todoMessage.edit("Ideas:")
            });

        new Discord.Message(this.bot, {
                id: this.channel.bad
            }, messageReceived.channel)
            .fetch()
            .then((badIdeasMessage) => {
                badIdeasMessage.edit("Bad Ideas:");
            })

        new Discord.Message(this.bot, {
                id: this.channel.completed
            }, messageReceived.channel)
            .fetch()
            .then((completedMessage) => {
                completedMessage.edit("Completed:");
            })

        messageReceived.delete();
    }
}

module.exports = {
    IdeasClass: IdeasClass
};