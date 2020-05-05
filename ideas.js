"use strict";

const Discord = require('discord.js');
const Channels = require('./Channels.json');

class IdeasClass {
    constructor(client) {
        this.bot = client;
    }

    add(messageReceived, idea) {
        messageReceived
            .react('👍')
            .then(() => {
                messageReceived
                    .react('👎')
                    .then(() => {
                        messageReceived.channel.members.forEach((guildMem) => {
                            //console.log(guildMem); // for debugging
                        });
                        let filterUp = (reaction, user) => reaction.emoji.name == '👍' && reaction.count == (Channels.Ideas.majority+1);
                        let collectorUp = messageReceived.createReactionCollector(filterUp, {
                            time: 0
                        });
                        collectorUp.on('collect', reaction => {
                            // Add to todo then delete
                            new Discord.Message(this.bot, {
                                    id: Channels.Ideas.todo
                                }, messageReceived.channel)
                                .fetch()
                                .then((editMessage) => {
                                    if (editMessage.content != 'Placeholder Message') {
                                        editMessage
                                            .edit(editMessage.content + '\n`- [ ] ' + idea + '`')
                                            .then(() => {
                                                messageReceived.delete();
                                            });
                                    } else {
                                        editMessage
                                            .edit("Ideas:\n`- [ ] " + idea + '`')
                                            .then(() => {
                                                messageReceived.delete();
                                            });
                                    }
                                });
                        });

                        let filterDown = (reaction, user) => reaction.emoji.name == '👎' && reaction.count == (Channels.Ideas.majority+1);
                        let collectorDown = messageReceived.createReactionCollector(filterDown, {
                            time: 0
                        });
                        collectorDown.on('collect', reaction => {
                            // Just delete the idea
                            reaction.message.delete();
                        });
                    });
            });
    }

    addVeto(messageReceived, idea) {
        new Discord.Message(this.bot, {
                id: Channels.Ideas.todo
            }, messageReceived.channel)
            .fetch()
            .then((editMessage) => {
                if (editMessage.content != 'Placeholder Message') {
                    editMessage
                        .edit(editMessage.content + '\n`- [ ] ' + idea + '`')
                        .then(() => {
                            messageReceived.delete();
                        });
                } else {
                    editMessage
                        .edit("Ideas:\n`- [ ] " + idea + '`')
                        .then(() => {
                            messageReceived.delete();
                        });
                }
            });
    }

    completed(messageReceived, idea) {
        new Discord.Message(this.bot, {
                id: Channels.Ideas.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                let lines = todoMessage.content.split('\n');
                let titleString = lines[0];
                lines = lines.splice(1);
                let workingStrings = [];

                lines.forEach((line, index) => {
                    if (idea + '`' == line.substring(7)) {
                        workingStrings[index] = "`- [x] " + line.substring(7);
                    } else {
                        workingStrings[index] = line;
                    }
                });

                workingStrings = (titleString + '\n').concat(workingStrings.join('\n'));

                todoMessage
                    .edit(workingStrings)
                    .then(() => {
                        messageReceived.delete();
                    })

            });
    }

    unfinished(messageReceived, idea) {
        new Discord.Message(this.bot, {
                id: Channels.Ideas.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                let lines = todoMessage.content.split('\n');
                let titleString = lines[0];
                lines = lines.splice(1);
                let workingStrings = [];

                lines.forEach((line, index) => {
                    if (idea + '`' == line.substring(7)) {
                        workingStrings[index] = "`- [ ] " + line.substring(7);
                    } else {
                        workingStrings[index] = line;
                    }
                });

                workingStrings = (titleString + '\n').concat(workingStrings.join('\n'));

                todoMessage
                    .edit(workingStrings)
                    .then(() => {
                        messageReceived.delete();
                    })

            });
    }

    remove(messageReceived, idea) {
        new Discord.Message(this.bot, {
                id: Channels.Ideas.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                let lines = todoMessage.content.split('\n');
                let titleString = lines[0];
                lines = lines.splice(1);
                let workingStrings = [];
                let indexOffset = 0;

                lines.forEach((line, index) => {
                    if (idea + '`' == line.substring(7)) {
                        indexOffset++;
                    } else {
                        workingStrings[index - indexOffset] = line;
                    }
                });

                workingStrings = (titleString + '\n').concat(workingStrings.join('\n'));

                todoMessage
                    .edit(workingStrings)
                    .then(() => {
                        messageReceived.delete();
                    })

            });
    }

    reset(messageReceived) {
        new Discord.Message(this.bot, {
                id: Channels.Ideas.todo
            }, messageReceived.channel)
            .fetch()
            .then((todoMessage) => {
                todoMessage
                    .edit("Ideas:\n")
                    .then(() => {
                        messageReceived.delete();
                    });
            });
    }
}

module.exports = {
    IdeasClass: IdeasClass
};
