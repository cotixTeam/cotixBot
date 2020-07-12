const Discord = require('discord.js');

const metaData = require('../bot.js');

exports.add = async function (messageReceived, ideaArg) {
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
        new Discord.Message(metaData.bot, {
                id: this.ideasChannel.todo
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
        new Discord.Message(metaData.bot, {
                id: this.ideasChannel.bad
            }, messageReceived.channel)
            .fetch()
            .then((editMessage) => {
                if (editMessage.content.substring(editMessage.content.length - 2) == "||") {
                    editMessage
                        .edit(editMessage.content.substring(0, editMessage.content.length - 2) + '\n`- ' + ideaAndAuthorString + '`||')
                        .then(() => {
                            messageReceived.delete();
                        });
                } else {
                    editMessage
                        .edit(editMessage.content + '\n||`- ' + ideaAndAuthorString + '`||')
                        .then(() => {
                            messageReceived.delete();
                        });
                }
            });
    });
}

exports.addVeto = function (messageReceived, idea) {
    console.log("-\tBypassing votes and adding the idea: '" + idea + "' to the list!");
    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.todo
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

exports.completed = function (messageReceived, queryIdea) {
    console.log("-\tMarking anything with the string '" + queryIdea + "' as a completed idea!");
    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.todo
        }, messageReceived.channel)
        .fetch()
        .then((todoMessage) => {
            let ideasMatch;

            let todoStringsArray = [];
            let completedStringsArray = [];

            while (ideasMatch = this.ideaRegex.exec(todoMessage.content)) {
                if (ideasMatch[1].includes(queryIdea)) {
                    completedStringsArray.push("\n`- [x] " + ideasMatch[1] + "`");
                } else {
                    todoStringsArray.push("`- [ ] " + ideasMatch[1] + "`\n");
                }
            }

            todoMessage
                .edit('Ideas:\n' + todoStringsArray.join(""))
                .then(() => {
                    new Discord.Message(metaData.bot, {
                            id: this.ideasChannel.completed
                        }, messageReceived.channel)
                        .fetch()
                        .then((completedMessage) => {
                            if (completedMessage.content.substring(completedMessage.content.length - 2) == "||") {
                                completedMessage
                                    .edit(completedMessage.content.substring(0, completedMessage.content.length - 2) + completedStringsArray.join("") + "||")
                                    .then(() => {
                                        messageReceived.delete();
                                    });
                            } else {
                                completedMessage
                                    .edit(completedMessage.content + "||" + completedStringsArray.join("") + "||")
                                    .then(() => {
                                        messageReceived.delete();
                                    })
                            }
                        })
                })
        })
}

exports.unfinished = function (messageReceived, queryIdea) {
    console.log("-\tMarking anything with the string '" + queryIdea + "' as an unfinished idea!");
    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.completed
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
                    completedStringsArray.push("\n`- [x] " + ideasMatch[1] + "`");
                }
            }

            completedMessage
                .edit("Completed:\n" + completedStringsArray.join(""))
                .then(() => {
                    new Discord.Message(metaData.bot, {
                            id: this.ideasChannel.todo
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

exports.remove = function (messageReceived, queryIdea) {
    console.log("-\tRemoving anything with the string '" + queryIdea + "' as a todo idea!");
    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.todo
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

exports.reset = function (messageReceived) {
    console.log("-\tResetting the entire todo list!");
    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.todo
        }, messageReceived.channel)
        .fetch()
        .then((todoMessage) => {
            todoMessage.edit("Ideas:")
        });

    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.bad
        }, messageReceived.channel)
        .fetch()
        .then((badIdeasMessage) => {
            badIdeasMessage.edit("Bad Ideas:");
        })

    new Discord.Message(metaData.bot, {
            id: this.ideasChannel.completed
        }, messageReceived.channel)
        .fetch()
        .then((completedMessage) => {
            completedMessage.edit("Completed:");
        })

    messageReceived.delete();
}

exports.init = function () {
    for (let channel of metaData.channels) {
        if (channel.name == "Ideas") {
            this.ideasChannel = channel;
            this.majority = channel.majority;
        }
    }

    this.ideaRegex = /(?:`- \[ \] )([\w \S]+)(?:`)/g;
}