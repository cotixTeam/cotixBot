"use strict";

const Discord = require('discord.js');
const awsUtils = require('./awsUtils');

class LeaderboardClass {
    constructor(client, channels) {
        this.bot = client;
        for (let channel of channels) {
            if (channel.name == "Leaderboards") this.channel = channel;
        }
    }

    addPlayer(messageReceived, player, game) {
        console.log("-\tAdding player " + player.substring(3, 21) + " to the leaderboard " + game);

        messageReceived.delete();
    }

    reset(messageReceived, gameCheck) {
        console.log("-\tResetting leaderboard (" + gameCheck + ")!");
        for (let game of this.channel.games) {
            if (gameCheck == game.name) {
                new Discord.Message(this.bot, {
                        id: game.messageId
                    }, messageReceived.channel)
                    .edit(game.defaultMessage);
            }
        }
        messageReceived.delete();
    }

    win(messageReceived, args) {
        for (let game of this.channel.games) {
            if (args[0] == game.name) {
                new Discord.Message(this.bot, {
                        id: game.messageId
                    }, messageReceived.channel)
                    .fetch()
                    .then((editMessage) => {
                        let lines = editMessage.content.split('\n');
                        let titleString = lines[0] + '\n';
                        lines = lines.splice(1);
                        let workingStrings = [];
                        let losers = [];

                        lines.forEach((line, indexLine) => {
                            if (messageReceived.author.id == line.substr(3, 18)) {
                                workingStrings[indexLine] = line.substr(0, 25) + (parseInt(line.substr(25, 1)) + 1) + "/" + (parseInt(line.substr(27, 1)) + 1) + " \n";
                            } else {
                                args.forEach((arg, indexArg) => {
                                    if (arg.substr(3, 18) == line.substr(3, 18)) {
                                        workingStrings[indexLine] = line.substr(0, 27) + (parseInt(line.substr(27, 1)) + 1) + " \n";
                                        losers.push(line.substr(3, 18));
                                    } else {
                                        workingStrings[indexLine] = line + " \n";
                                    }
                                });
                            }
                        });

                        workingStrings = titleString.concat(workingStrings.join(''));

                        console.log("-\tAdding win for " + messageReceived.author.id + " for " + game.name + " agaisnt " + losers.join(' & ') + "!");

                        editMessage
                            .edit(workingStrings);
                    });
            }
        }
        messageReceived.delete();
    }


    winOther(messageReceived, args) {
        for (let game of this.channel.games) {
            if (args[0] == game.name) {

                new Discord.Message(this.bot, {
                        id: game.messageId
                    }, messageReceived.channel)
                    .fetch()
                    .then((editMessage) => {
                        let lines = editMessage.content.split('\n');
                        let titleString = lines[0] + '\n';
                        lines = lines.splice(1);
                        let workingStrings = [];
                        let first = true;
                        let losers = [];
                        let winner = "";

                        args = args.splice(1);

                        args.forEach((arg, indexArg) => {
                            lines.forEach((line, indexLine) => {
                                if (arg.substr(3, 18) == line.substr(3, 18)) {
                                    if (first == true) {
                                        first = false;
                                        workingStrings[indexLine] = line.substr(0, 25) + (parseInt(line.substr(25, 1)) + 1) + "/" + (parseInt(line.substr(27, 1)) + 1) + " \n";
                                        winner = line.substr(3, 18);
                                    } else {
                                        workingStrings[indexLine] = line.substr(0, 25) + (parseInt(line.substr(25, 1))) + "/" + (parseInt(line.substr(27, 1)) + 1) + " \n";
                                        losers.push(line.substr(3, 18));
                                    }
                                } else if (indexArg == 0) {
                                    workingStrings[indexLine] = line + " \n";
                                }
                            });
                        });

                        workingStrings = titleString.concat(workingStrings.join(''));
                        console.log("-\tAdding win for " + winner + " for " + game.name + " agaisnt " + losers.join(' & ') + "!");

                        editMessage
                            .edit(workingStrings);
                    });
            }
        }
        messageReceived.delete();
    }
}

module.exports = {
    LeaderboardClass: LeaderboardClass
};