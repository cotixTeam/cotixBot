const Discord = require('discord.js');

const metaData = require('../bot.js');
const awsUtils = require('./awsUtils');

/**
 * @typedef {Object} Users
 */

/**
 * @typedef {Object} Leaderboard
 * @property {String} name
 * @property {String} defaultMessage
 * @property {Users[]} users
 */

/** Initialises the static variables from the config files.
 */
exports.init = async function init() {
    for (let channel of metaData.channels) {
        if (channel.name == 'Leaderboards') this.channel = channel;
    }

    if (process.env.DISCORD_BOT_TOKEN) {
        let data = await awsUtils.load('store.mmrree.co.uk', 'config/Leaderboards.json');
        this.leaderboards = JSON.parse(data);
        console.info(this.leaderboards);
    } else {
        const FileSystem = require('fs');
        this.leaderboards = JSON.parse(FileSystem.readFileSync('./local/Leaderboards.json'));
        this.dev = true;
    }
};

/** Adds a player to the leaderboard given in the arguments.
 * @param {Discord.Message} messageReceived The message used to send the channel.
 * @param {String[]} args The array of strings used for the commands.
 */
exports.addPlayer = async function addPlayer(messageReceived, args) {
    /**@todo Change the addition of users to allow multiple to be added at once. */
    let leaderboardQuery = args[0];
    let playerQuery = /<@[!]*([0-9]+)>/g.exec(args[1])[1];

    for (let leaderboard of this.leaderboards) {
        if (leaderboardQuery == leaderboard.name) {
            console.info("-\tAdding player '" + playerQuery + "' to the leaderboard '" + leaderboardQuery + "'");
            if (!leaderboard.users) leaderboard.users = []; // Initialise if users do not exists (only used during conversion)
            if (leaderboard.users.every((user) => user.id != playerQuery)) {
                let discordUser = await new Discord.User(metaData.bot, {
                    id: playerQuery,
                }).fetch();

                // If the user is not already in the users, add them to it
                leaderboard.users.push({
                    id: playerQuery,
                    name: discordUser.username,
                    wins: 0,
                    games: 0,
                });

                this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;
                updateLeaderboard(leaderboard, messageReceived.channel, this);
                console.info(this.leaderboards);
            } else {
                console.info('User already registered!');
            }
        }
    }

    messageReceived.delete();
};

/** Removes a player from the leaderboard given in the arguments.
 * @param {Discord.Message} messageReceived The message used to send the channel.
 * @param {String[]} args The array of strings used for the commands.
 */
exports.remPlayer = function remPlayer(messageReceived, args) {
    /**@todo Change the removal of users to allow multiple to be added at once. */
    let leaderboardQuery = args[0];
    let playerQuery = args[1];
    let changed = false;

    for (let leaderboard of this.leaderboards) {
        if (leaderboardQuery == leaderboard.name) {
            console.info(
                "-\tRemoving player '" +
                    /<@[!]*([0-9]+)>/g.exec(playerQuery)[1] +
                    "' to the leaderboard '" +
                    leaderboardQuery +
                    "'"
            );
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

                console.info(this.leaderboards);
            }
        }
    }
    if (changed) {
        saveLeaderboards(this);
    }

    messageReceived.delete();
};

/** Macro to save either locally, or onto the s3 server if in production.
 * @param {Class} self The exports object, used to check if the environment is production or developper.
 */
function saveLeaderboards(self) {
    if (self.dev) {
        // Save locally
        const FileSystem = require('fs');
        FileSystem.writeFileSync('./local/Leaderboards.json', JSON.stringify(self.leaderboards));
    } else {
        // Save on s3
        awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(self.leaderboards));
    }
}

/** Macro to update the leaderboard with the correct values for winners.
 * @param {Leaderboard} leaderboard The leaderboard object to update.
 * @param {Discord.Channel} channel The channel the leaderboards are held in.
 * @param {Object} self The exports object to hold the bot object.
 */
function updateLeaderboard(leaderboard, channel, self) {
    let message = {
        content: leaderboard.name,
        embed: {
            title: leaderboard.name,
            description: leaderboard.defaultMessage,
            fields: [],
        },
    };

    let sortedUsers = leaderboard.users.sort((user1, user2) => {
        if (user1.wins / user1.games < user2.wins / user2.games) {
            return 1;
        } else if (user1.wins / user1.games > user2.wins / user2.games) {
            return -1;
        } else return 0;
    });

    message.embed.fields = sortedUsers.map((user, index) => {
        let medal;
        if (index == 0) {
            medal = '🥇';
        } else if (index == 1) {
            medal = '🥈';
        } else if (index == 2) {
            medal = '🥉';
        } else {
            medal = (index + 1).toString() + '. ';
        }
        return {
            name: medal + user.name,
            value:
                'Wins: ' +
                user.wins +
                '\nGames: ' +
                user.games +
                '\nWin percent: ' +
                (user.games && user.wins ? ((user.wins / user.games) * 100).toPrecision(4) : 0) +
                '%',
            inline: true,
        };
    });

    new Discord.Message(
        self.bot,
        {
            id: leaderboard.messageId,
        },
        channel
    )
        .fetch()
        .then((leaderboardMessage) => {
            leaderboardMessage.edit(message);
        });
}

/** Add a new leaderboard to the channel.
 * @async
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String[]} args An array of strings to be used to hold the settings for the new leaderboard.
 */
exports.addLeaderboard = async function addLeaderboard(messageReceived, args) {
    // Do a check to see if the leaderboard already exists
    let exists = false;
    for (let leaderboard of this.leaderboards) {
        if (leaderboard.name == args[0]) exists = true;
    }

    if (!exists) {
        let newLeaderboard = {
            name: args[0],
            defaultMessage: args.splice(1).join(' '),
            messageId: null,
            users: [],
        };

        let message = {
            content: newLeaderboard.name,
            embed: {
                title: newLeaderboard.name,
                description: newLeaderboard.defaultMessage,
                fields: [],
            },
        };

        await messageReceived.channel.send(message).then((sentMessage) => {
            sentMessage.pin();
            newLeaderboard.messageId = sentMessage.id;
        });

        console.info(newLeaderboard);

        this.leaderboards.push(newLeaderboard);

        saveLeaderboards(this);
    } else {
        console.info('Already exists!');
        messageReceived.author.send("Sorry, '" + args[0] + "' is already being used for another leaderboard!");
    }

    messageReceived.delete();
};

/** Remove a leaderboard to the channel.
 * @async
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String[]} args An array of strings to be used to hold the settings for the new leaderboard.
 */
exports.remLeaderboard = function remLeaderboard(messageReceived, args) {
    // Do a check to see if the leaderboard already exists
    let found = this.leaderboards.find((leaderboard) => {
        return leaderboard.name == args[0];
    });

    if (found) {
        // Remove the message
        new Discord.Message(
            metaData.bot,
            {
                id: found.messageId,
            },
            messageReceived.channel
        )
            .fetch()
            .then((leaderboardMessage) => {
                leaderboardMessage.delete();
            });

        this.leaderboards = this.leaderboards.filter((leaderboard) => {
            return leaderboard != found;
        });

        saveLeaderboards(this);
        console.info(this.leaderboards);
    } else {
        console.info('Does not exists!');
        messageReceived.author.send("Sorry, '" + args[0] + "' does not exist and so can't be removed!");
    }
    messageReceived.delete();
};

/** Clears the score of all the users on a leaderboard.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String} argString The string used to query the leaderboards to reset the scores in.
 */
exports.clearScores = function clearScores(messageReceived, argString) {
    console.info('-\tClearing users from leaderboard (' + argString + ')!');
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
};

/** Clears the users from one of the leaderbaords.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String} argString The string used to query the leaderboards to reset the users in.
 */
exports.clearUsers = function clearUsers(messageReceived, argString) {
    console.info('-\tResetting leaderboard (' + argString + ')!');
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
};

/** Adds a win to the author and a loss to each of the users included in the message.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String[]} args The array of strings containing the leaderboard and losing users.
 */
exports.win = function win(messageReceived, args) {
    let queryLeaderboard = args[0];
    let losers = args
        .map((arg) => {
            if (arg != queryLeaderboard && /<@[!]*([0-9]+)>/g.exec(arg)[1] != messageReceived.author.id) {
                return /<@[!]*([0-9]+)>/g.exec(arg)[1];
            }
        })
        .filter((arg) => arg != null);

    for (let leaderboard of this.leaderboards) {
        if (queryLeaderboard == leaderboard.name) {
            for (let user of leaderboard.users) {
                if (user.id == messageReceived.author.id) {
                    console.info('User gained point ' + messageReceived.author.id);
                    leaderboard.users[leaderboard.users.indexOf(user)] = {
                        id: user.id,
                        name: user.name,
                        games: user.games + 1,
                        wins: user.wins + 1,
                    };
                }
            }

            for (let user of leaderboard.users) {
                for (let loser of losers) {
                    if (user.id == loser) {
                        console.info('User lost a game ' + loser);
                        leaderboard.users[leaderboard.users.indexOf(user)] = {
                            id: user.id,
                            name: user.name,
                            games: user.games + 1,
                            wins: user.wins,
                        };
                    }
                }
            }
            // load the message and then edit with the new responses (do through embed)
            updateLeaderboard(leaderboard, messageReceived.channel, this);
            saveLeaderboards(this);
        }
    }
    console.info(this.leaderboards);
    messageReceived.delete();
};

/** Adds a win for the first user listed, and a loss to every other user afterwards.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String[]} args The array of strings containing the leaderboard, the winning user and the losing users.
 */
exports.winOther = function winOther(messageReceived, args) {
    let queryLeaderboard = args[0];
    let winner = /<@[!]*([0-9]+)>/g.exec(args[1])[1];
    let losers = args
        .map((arg) => {
            if (arg != queryLeaderboard && arg != args[1] && winner != /<@[!]*([0-9]+)>/g.exec(arg)[1]) {
                return /<@[!]*([0-9]+)>/g.exec(arg)[1];
            }
        })
        .filter((arg) => arg != null);

    for (let leaderboard of this.leaderboards) {
        if (queryLeaderboard == leaderboard.name) {
            for (let user of leaderboard.users) {
                if (user.id == winner) {
                    console.info('User gained point ' + winner);
                    leaderboard.users[leaderboard.users.indexOf(user)] = {
                        id: user.id,
                        name: user.name,
                        games: user.games + 1,
                        wins: user.wins + 1,
                    };
                } else {
                    for (let loser of losers) {
                        if (user.id == loser) {
                            console.info('User lost a game ' + loser);
                            leaderboard.users[leaderboard.users.indexOf(user)] = {
                                id: user.id,
                                name: user.name,
                                games: user.games + 1,
                                wins: user.wins,
                            };
                        }
                    }
                }
            }
            // load the message and then edit with the new responses (do through embed)
            updateLeaderboard(leaderboard, messageReceived.channel, this);
            saveLeaderboards(this);
        }
    }
    console.info(this.leaderboards);
    messageReceived.delete();
};
