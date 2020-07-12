"use strict";

const Discord = require('discord.js');

const metaData = require('../bot.js');
const awsUtils = require('./awsUtils');

exports.init = async function () {
    for (let channel of metaData.channels) {
        if (channel.name == "Leaderboards") this.channel = channel;
    }

    if (process.env.DISCORD_BOT_TOKEN) {
        let data = await awsUtils.load("store.mmrree.co.uk", "config/Leaderboards.json");
        this.leaderboards = JSON.parse(data.Body.toString());
        console.log(this.leaderboards);
    } else {
        const FileSystem = require('fs');
        this.leaderboards = JSON.parse(FileSystem.readFileSync("./local/Leaderboards.json"));
        this.dev = true;
    }
}

exports.addPlayer = async function (messageReceived, args) {
    let playerQuery = /<@[!]*([0-9]+)>/g.exec(args[0])[1];
    let leaderboardQuery = args[1];

    for (let leaderboard of this.leaderboards) {
        if (leaderboardQuery == leaderboard.name) {
            console.log("-\tAdding player '" + playerQuery + "' to the leaderboard '" + leaderboardQuery + "'");
            if (!leaderboard.users) leaderboard.users = []; // Initialise if users do not exists (only used during conversion)
            if (leaderboard.users.every((user) => user.id != playerQuery)) {
                let discordUser = await new Discord.User(metaData.bot, {
                    "id": playerQuery
                }).fetch();

                // If the user is not already in the users, add them to it
                leaderboard.users.push({
                    "id": playerQuery,
                    "name": discordUser.username,
                    "wins": 0,
                    "games": 0
                });

                this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;
                updateLeaderboard(leaderboard, messageReceived.channel, this);
                console.log(this.leaderboards);
            } else {
                console.log("User already registered!");
            }
        }
    }


    messageReceived.delete();
}

exports.remPlayer = function (messageReceived, args) {
    let playerQuery = args[0];
    let leaderboardQuery = args[1];
    let changed = false;

    for (let leaderboard of this.leaderboards) {
        if (leaderboardQuery == leaderboard.name) {
            console.log("-\tRemoving player '" + /<@[!]*([0-9]+)>/g.exec(playerQuery)[1] + "' to the leaderboard '" + leaderboardQuery + "'");
            if (!leaderboard.users) leaderboard.users = []; // Initialise if users do not exists (only used during conversion)

            // remove user if exists, otherwise leave the same
            leaderboard.users = leaderboard.users.filter((value) => {
                if (value.id != /<@[!]*([0-9]+)>/g.exec(playerQuery)[1]) {
                    changed = true;
                    return true;
                }
            });

            if (changed) {
                // Update the relevant message
                this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;

                updateLeaderboard(leaderboard, messageReceived.channel, this);

                console.log(this.leaderboards);
            }
        }
    }
    if (changed) {
        saveLeaderboards(this);
    }

    messageReceived.delete();
}

function saveLeaderboards(self) {
    if (self.dev) {
        // Save locally
        const FileSystem = require('fs');
        FileSystem.writeFileSync("./local/Leaderboards.json", JSON.stringify(self.leaderboards));
    } else {
        // Save on s3
        awsUtils.save("store.mmrree.co.uk", "config/Leaderboards.json", JSON.stringify(self.leaderboards));
    }
}

function updateLeaderboard(leaderboard, channel, self) {
    let message = {
        "content": leaderboard.name,
        "embed": {
            "title": leaderboard.name,
            "description": leaderboard.defaultMessage,
            "fields": []
        }
    }

    let sortedUsers = leaderboard.users.sort((user1, user2) => {
        if ((user1.wins / user1.games) < (user2.wins / user2.games)) {
            return 1;
        } else if ((user1.wins / user1.games) > (user2.wins / user2.games)) {
            return -1;
        } else return 0;
    });

    message.embed.fields = sortedUsers.map((user, index) => {
        let medal;
        if (index == 0) {
            medal = "🥇";
        } else if (index == 1) {
            medal = "🥈";
        } else if (index == 2) {
            medal = "🥉";
        } else {
            medal = (index + 1).toString() + ". ";
        }
        return {
            "name": medal + user.name,
            "value": "Wins: " + user.wins + "\nGames: " + user.games + "\nWin percent: " + ((user.games && user.wins) ? (user.wins / user.games * 100).toPrecision(4) : 0) + "%",
            "inline": true
        }
    });

    new Discord.Message(self.bot, {
        id: leaderboard.messageId
    }, channel).fetch().then((leaderboardMessage) => {
        leaderboardMessage.edit(message);
    });
}

exports.addLeaderboard = async function (messageReceived, args) {
    // Do a check to see if the leaderboard already exists
    let exists = false;
    for (let leaderboard of this.leaderboards) {
        if (leaderboard.name == args[0]) exists = true;
    }

    if (!exists) {
        let newLeaderboard = {
            "name": args[0],
            "defaultMessage": args.splice(1).join(' '),
            "messageId": null,
            "users": []
        }

        let message = {
            "content": newLeaderboard.name,
            "embed": {
                "title": newLeaderboard.name,
                "description": newLeaderboard.defaultMessage,
                "fields": []
            }
        }

        await messageReceived.channel.send(message).then((sentMessage) => {
            sentMessage.pin();
            newLeaderboard.messageId = sentMessage.id;
        });

        console.log(newLeaderboard);

        this.leaderboards.push(newLeaderboard);

        saveLeaderboards(this);
    } else {
        console.log("Already exists!");
        messageReceived.author.send("Sorry, '" + args[0] + "' is already being used for another leaderboard!");
    }

    messageReceived.delete();
}

exports.remLeaderboard = function (messageReceived, args) {
    // Do a check to see if the leaderboard already exists
    let found = this.leaderboards.find((leaderboard) => {
        return leaderboard.name == args[0]
    })

    if (found) {
        // Remove the message
        new Discord.Message(metaData.bot, {
            id: found.messageId
        }, messageReceived.channel).fetch().then((leaderboardMessage) => {
            leaderboardMessage.delete();
        });


        this.leaderboards = this.leaderboards.filter((leaderboard) => {
            return leaderboard != found
        });

        saveLeaderboards(this);
        console.log(this.leaderboards);
    } else {
        console.log("Does not exists!");
        messageReceived.author.send("Sorry, '" + args[0] + "' does not exist and so can't be removed!");
    }
    messageReceived.delete();
}

exports.clearScores = function (messageReceived, argString) {
    console.log("-\tClearing users from leaderboard (" + argString + ")!");
    for (let leaderboard of this.leaderboards) {
        if (argString == leaderboard.name) {

            leaderboard.users = leaderboard.users.map((leaderboardUser) => {
                leaderboardUser.wins = 0;
                leaderboardUser.games = 0;
                return leaderboardUser;
            });

            this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;

            updateLeaderboard(leaderboard, messageReceived.channel, this);
            saveLeaderboards(this);
        }
    }
    messageReceived.delete();
}


exports.clearUsers = function (messageReceived, argString) {
    console.log("-\tResetting leaderboard (" + argString + ")!");
    for (let leaderboard of this.leaderboards) {
        if (argString == leaderboard.name) {

            leaderboard.users = [];
            this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;
            updateLeaderboard(leaderboard, messageReceived.channel, this);
            saveLeaderboards(this);
        }
    }

    saveLeaderboards(this);
    messageReceived.delete();
}

exports.win = function (messageReceived, args) {

    let queryLeaderboard = args[0];
    let losers = args.map((arg) => {
        if (arg != queryLeaderboard) {
            return /<@[!]*([0-9]+)>/g.exec(arg)[1];
        }
    }).filter((arg) => arg != null);

    for (let leaderboard of this.leaderboards) {
        if (queryLeaderboard == leaderboard.name) {
            for (let user of leaderboard.users) {
                if (user.id == messageReceived.author.id) {
                    console.log("User gained point " + messageReceived.author.id);
                    leaderboard.users[leaderboard.users.indexOf(user)] = {
                        id: user.id,
                        name: user.name,
                        games: user.games + 1,
                        wins: user.wins + 1
                    }
                }
            }

            for (let user of leaderboard.users) {
                for (let loser of losers) {
                    if (user.id == loser) {
                        console.log("User lost a game " + loser);
                        leaderboard.users[leaderboard.users.indexOf(user)] = {
                            id: user.id,
                            name: user.name,
                            games: user.games + 1,
                            wins: user.wins
                        }
                    }
                }
            }
            // load the message and then edit with the new responses (do through embed)
            updateLeaderboard(leaderboard, messageReceived.channel, this);
            saveLeaderboards(this);
        }
    }
    console.log(this.leaderboards);
    messageReceived.delete();
}


exports.winOther = function (messageReceived, args) {
    let queryLeaderboard = args[0];
    let winner = /<@[!]*([0-9]+)>/g.exec(args[1])[1];
    let losers = args.map((arg) => {
        if (arg != queryLeaderboard && arg != args[1]) {
            return /<@[!]*([0-9]+)>/g.exec(arg)[1];
        }
    }).filter((arg) => arg != null);

    for (let leaderboard of this.leaderboards) {
        if (queryLeaderboard == leaderboard.name) {

            for (let user of leaderboard.users) {
                if (user.id == winner) {
                    console.log("User gained point " + winner);
                    leaderboard.users[leaderboard.users.indexOf(user)] = {
                        id: user.id,
                        name: user.name,
                        games: user.games + 1,
                        wins: user.wins + 1
                    }
                } else {
                    for (let loser of losers) {
                        if (user.id == loser) {
                            console.log("User lost a game " + loser);
                            leaderboard.users[leaderboard.users.indexOf(user)] = {
                                id: user.id,
                                name: user.name,
                                games: user.games + 1,
                                wins: user.wins
                            }
                        }
                    }
                }
            }
            // load the message and then edit with the new responses (do through embed)
            updateLeaderboard(leaderboard, messageReceived.channel, this);
            saveLeaderboards(this);
        }
    }
    console.log(this.leaderboards);
    messageReceived.delete();
}