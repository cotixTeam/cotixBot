const Discord = require('discord.js');

const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');

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
async function init() {
    if (!this.channel) {
        for (let channel of metaData.channels) {
            if (channel.name == 'Leaderboards') this.channel = channel;
        }

        let leaderboard = await awsUtils.load('store.mmrree.co.uk', 'config/Leaderboards.json');
        this.leaderboards = leaderboard;

        console.log(this.leaderboards);
    }
}

/** Adds a player to the leaderboard given in the arguments.
 * @param {Discord.Interaction} interaction The interaction used to send the channel.
 * @param {String} title The title for the leadboard.
 * @param {Discord.User} player The player to add to the leaderboard.
 */
async function addPlayer(interaction, title, player) {
    await init();

    for (let leaderboard of this.leaderboards) {
        if (title == leaderboard.name) {
            console.info("-\tAdding player '" + player.username + "' to the leaderboard '" + title + "'");
            if (!leaderboard.users) leaderboard.users = []; // Initialise if users do not exists (only used during conversion)
            if (leaderboard.users.every((user) => user.id != player.id)) {
                // If the user is not already in the users, add them to it
                leaderboard.users.push({
                    id: player.id,
                    name: player.username,
                    wins: 0,
                    games: 0,
                });

                this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;
                updateLeaderboard(leaderboard, interaction.channel, this);
                console.info(this.leaderboards);
            } else {
                console.info('User already registered!');
            }
        }
    }

    interaction.reply({
        content: 'Added ' + player.username + ' to the ' + title + ' leaderboard!',
        ephemeral: true,
    });
}

/** Removes a player from the leaderboard given in the arguments.
 * @param {Discord.Interaction} interaction The interaction used to send the channel.
 * @param {String} title The title of the leaderboard.
 * @param {Discord.User} player The player to remove from a leaderboard.
 */
async function remPlayer(interaction, title, player) {
    await init();

    let changed = false;

    for (let leaderboard of this.leaderboards) {
        if (title == leaderboard.name) {
            console.info("-\tRemoving player '" + player.username + "' from the leaderboard '" + title + "'");
            if (!leaderboard.users) leaderboard.users = []; // Initialise if users do not exists (only used during conversion)

            // remove user if exists, otherwise leave the same
            leaderboard.users = leaderboard.users.filter((value) => {
                if (value.id != player.id) {
                    changed = true;
                    return true;
                }
            });

            if (changed) {
                // Update the relevant message
                this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;

                updateLeaderboard(leaderboard, interaction.channel, this);

                console.info(this.leaderboards);
            }
        }
    }
    if (changed) {
        awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(this.leaderboards));
    }

    interaction.reply({
        content: 'Removed ' + player.username + ' from the ' + title + ' leaderboard!',
        ephemeral: true,
    });
}

/** Macro to update the leaderboard with the correct values for winners.
 * @param {Leaderboard} leaderboard The leaderboard object to update.
 * @param {Discord.Channel} channel The channel the leaderboards are held in.
 */
async function updateLeaderboard(leaderboard, channel) {
    let message = {
        content: leaderboard.name,
        embeds: [
            {
                title: leaderboard.name,
                description: leaderboard.defaultMessage,
                fields: [],
            },
        ],
    };

    let sortedUsers = leaderboard.users.sort((user1, user2) => {
        if (user1.wins / user1.games < user2.wins / user2.games) {
            return 1;
        } else if (user1.wins / user1.games > user2.wins / user2.games) {
            return -1;
        } else return 0;
    });

    message.embeds[0].fields = sortedUsers.map((user, index) => {
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

    try {
        new Discord.Message(metaData.bot, {
            id: leaderboard.messageId,
            channel_id: channel.id,
        })
            .fetch()
            .then((leaderboardMessage) => {
                console.log(leadboardMessage);
                leaderboardMessage.edit(message);
            });
    } catch (e) {
        console.warn(e);
    }
}

/** Add a new leaderboard to the channel.
 * @async
 * @param {Discord.Interaction} interaction The message the command was sent in.
 * @param {String} title Title of the new leaderboard.
 * @param {String} Description Description of the new leaderboard.
 */
async function addLeaderboard(interaction, title, description) {
    await init();
    // Do a check to see if the leaderboard already exists
    let exists = false;
    for (let leaderboard of this.leaderboards) {
        if (leaderboard.name == title) exists = true;
    }

    if (!exists) {
        let newLeaderboard = {
            name: title,
            defaultMessage: description,
            messageId: null,
            users: [],
        };

        let message = {
            content: newLeaderboard.name,
            embeds: [
                {
                    title: newLeaderboard.name,
                    description: newLeaderboard.defaultMessage,
                    fields: [],
                },
            ],
        };

        await interaction.channel.send(message).then((sentMessage) => {
            console.log('Leaderboard');
            console.log(sentMessage.receivedMessage);
            sentMessage.pin();
            newLeaderboard.messageId = sentMessage.id;
        });

        console.info(newLeaderboard);

        this.leaderboards.push(newLeaderboard);

        awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(this.leaderboards));
    } else {
        console.info('Already exists!');
        interaction.reply({
            content: "Sorry, '" + title + "' is already being used for another leaderboard!",
            ephemeral: true,
        });
    }

    interaction.reply({
        content: 'Added the ' + title + ' leaderboard, with description of ' + description + '!',
        ephemeral: true,
    });
}

/** Remove a leaderboard to the channel.
 * @async
 * @param {Discord.Interaction} interaction The message the command was sent in.
 * @param {String} title Title of the leaderboard to delete.
 */
async function remLeaderboard(interaction, title) {
    await init();

    // Do a check to see if the leaderboard already exists
    let found = this.leaderboards.find((leaderboard) => {
        return leaderboard.name == title;
    });

    if (found) {
        // Remove the message
        console.log(found);

        try {
            new Discord.Message(metaData.bot, {
                id: found.messageId,
                channel_id: interaction.channel,
            })
                .fetch()
                .then((leaderboardMessage) => {
                    leaderboardMessage.delete();
                });
        } catch (e) {
            console.warn(e);
        }

        this.leaderboards = this.leaderboards.filter((leaderboard) => {
            return leaderboard != found;
        });

        awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(this.leaderboards));
        console.info(this.leaderboards);
        interaction.reply({
            content: 'Removed the ' + title + ' leaderboard!',
            ephemeral: true,
        });
    } else {
        console.info('Does not exists!');
        interaction.reply({
            content: "Sorry, '" + title + "' does not exist and so can't be removed!",
            ephemeral: true,
        });
    }
}

/** Clears the score of all the users on a leaderboard.
 * @param {Discord.Interaction} interaction The message the command was sent in.
 * @param {String} title The string used to query the leaderboards to reset the scores in.
 */
async function clearScores(interaction, title) {
    await init();
    console.info('-\tClearing users from leaderboard (' + title + ')!');
    for (let leaderboard of this.leaderboards) {
        if (title == leaderboard.name) {
            leaderboard.users = leaderboard.users.map((leaderboardUser) => {
                leaderboardUser.wins = 0;
                leaderboardUser.games = 0;
                return leaderboardUser;
            });

            this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;

            updateLeaderboard(leaderboard, interaction.channel, this);
        }
    }

    awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(this.leaderboards));

    interaction.reply({
        content: 'You have removed the scores on leaderboard ' + title,
        ephemeral: true,
    });
}

/** Clears the users from one of the leaderbaords.
 * @param {Discord.Interaction} interaction The message the command was sent in.
 * @param {String} title The string used to query the leaderboards to reset the users in.
 */
async function clearUsers(interaction, title) {
    await init();
    console.info('-\tResetting leaderboard (' + title + ')!');
    for (let leaderboard of this.leaderboards) {
        if (title == leaderboard.name) {
            leaderboard.users = [];
            this.leaderboards[this.leaderboards.indexOf(leaderboard)] = leaderboard;
            updateLeaderboard(leaderboard, interaction.channel, this);
        }
    }

    awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(this.leaderboards));

    interaction.reply({
        content: 'You have removed the users on leaderboard ' + title,
        ephemeral: true,
    });
}

/** Adds a win to the winner and a loss for each loser on the leaderboard chosen.
 * @param {Discord.Interaction} interaction The interaction the command was sent in.
 * @param {String} queryLeaderboard The title of the leaderboard.
 * @param {Discord.User} winner The winner of the game.
 * @param {Discord.User[]} losers An array of the losers of the game.
 */
async function win(interaction, queryLeaderboard, winner, losers) {
    await init();

    losers = losers.filter((loser) => loser != null);
    console.log(losers);

    for (let leaderboard of this.leaderboards) {
        if (queryLeaderboard == leaderboard.name) {
            for (let user of leaderboard.users) {
                if (user.id == winner.id) {
                    console.info('User gained point ' + winner.username);
                    leaderboard.users[leaderboard.users.indexOf(user)] = {
                        id: user.id,
                        name: user.name,
                        games: user.games + 1,
                        wins: user.wins + 1,
                    };
                    continue;
                }

                for (let loser of losers) {
                    if (user.id == loser.id) {
                        console.info('User lost a game ' + loser.username);
                        leaderboard.users[leaderboard.users.indexOf(user)] = {
                            id: user.id,
                            name: user.name,
                            games: user.games + 1,
                            wins: user.wins,
                        };
                    }
                }
            }

            updateLeaderboard(leaderboard, interaction.channel, this);
            awsUtils.save('store.mmrree.co.uk', 'config/Leaderboards.json', JSON.stringify(this.leaderboards));
        }
    }
    console.info(this.leaderboards);
    interaction.reply({
        content: 'Added a win for the marked user!',
        ephemeral: true,
    });
}

module.exports = {
    name: 'leaderboards',
    description: 'A commands suite for the leaderboards page.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();
        let sub_command_group = interaction.options.getSubcommandGroup();

        let title = interaction.options.getString('title');

        // Automatically pick between if the win is for another player or for the interaction writer
        let winner = interaction.options.getUser('winner') ? interaction.options.getUser('winner') : interaction.user;

        let leadboardDescription = interaction.options.getString('description');

        let player = interaction.options.getUser('user');

        let losers = [];
        for (let i = 1; i < 7; i++) {
            losers.push(interaction.options.getUser('loser_' + i));
        }

        switch (sub_command_group) {
            case 'win':
                switch (sub_command) {
                    case 'me':
                    case 'other':
                        win(interaction, title, winner, losers);
                        break;
                    default:
                        interaction.reply('Not yet implemented!');
                }
                break;
            case 'add':
                switch (sub_command) {
                    case 'leaderboard':
                        addLeaderboard(interaction, title, leadboardDescription);
                        break;
                    case 'player':
                        addPlayer(interaction, title, player);
                        break;
                    default:
                        interaction.reply('Not yet implemented!');
                }
                break;
            case 'remove':
                switch (sub_command) {
                    case 'leaderboard':
                        remLeaderboard(interaction, title);
                        break;
                    case 'player':
                        remPlayer(interaction, title, player);
                        break;
                    default:
                        interaction.reply('Not yet implemented!');
                }
                break;
            case 'clear':
                switch (sub_command) {
                    case 'users':
                        clearUsers(interaction, title);
                        break;
                    case 'score':
                        clearScores(interaction, title);
                        break;
                    default:
                        interaction.reply('Not yet implemented!');
                }
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'win',
            description: 'Used to mark a win o nthe leaderboard.',
            type: 'SUB_COMMAND_GROUP',
            options: [
                {
                    name: 'me',
                    description: 'Marks a win for you against the other players listed.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'Title of the leaderboard.',
                            type: 'STRING',
                            required: true,
                        },
                        {
                            name: 'loser_1',
                            description: 'One of the losers.',
                            type: 'USER',
                            required: true,
                        },
                        {
                            name: 'loser_2',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_3',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_4',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_5',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_6',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                    ],
                },
                {
                    name: 'other',
                    description: 'Marks a win for the other player to win.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'Title of the leaderboard.',
                            type: 'STRING',
                            required: true,
                        },
                        {
                            name: 'winner',
                            description: 'The winner of the game.',
                            type: 'USER',
                            required: true,
                        },
                        {
                            name: 'loser_1',
                            description: 'One of the losers.',
                            type: 'USER',
                            required: true,
                        },
                        {
                            name: 'loser_2',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_3',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_4',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_5',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                        {
                            name: 'loser_6',
                            description: 'One of the losers.',
                            type: 'USER',
                        },
                    ],
                },
            ],
        },
        {
            name: 'add',
            description: 'Commands to add users or leaderboards.',
            type: 'SUB_COMMAND_GROUP',
            options: [
                {
                    name: 'leaderboard',
                    description: 'Add a new leaderboard to the channel.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'The title of the leaderboard to add.',
                            type: 'STRING',
                            required: true,
                        },
                        {
                            name: 'description',
                            description: 'The description of the leaderboard.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'player',
                    description: 'Adds a user to play on the leaderboard.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'The title of the leaderboard.',
                            type: 'STRING',
                            required: true,
                        },
                        {
                            name: 'user',
                            description: 'The user to add to the leaderboard.',
                            type: 'USER',
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: 'remove',
            description: 'Commands to remove users or leaderboards.',
            type: 'SUB_COMMAND_GROUP',
            options: [
                {
                    name: 'leaderboard',
                    description: 'Remove a new leaderboard to the channel.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'The title of the leaderboard to remove.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'player',
                    description: 'Removes a user to play on the leaderboard.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'The title of the leaderboard.',
                            type: 'STRING',
                            required: true,
                        },
                        {
                            name: 'user',
                            description: 'The user to add to the leaderboard.',
                            type: 'USER',
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: 'clear',
            description: 'Used to clear stats from custom leaderboards.',
            type: 'SUB_COMMAND_GROUP',
            options: [
                {
                    name: 'users',
                    description: 'Clears all users from the leaderboard specified.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'The title of the leaderboard to clear.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'scores',
                    description: 'Clears all scores from the leaderboard specified.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'title',
                            description: 'The title of the leaderboard to clear.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
};
