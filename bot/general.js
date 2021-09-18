const Discord = require('discord.js');
const fetch = require('node-fetch');

const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');
const fileConversion = require('./fileConversion.js');

/** Initialises the running of timed events (and runs them once).
 */
exports.init = function init() {
    hourlyUpdate();
    dailyTimeouts();

    initHourlyUpdater();
    initDailyTimeouts();
    setTimeout(hourlyUpdate, 10 * 1000);
    setTimeout(dailyTimeouts, 10 * 1000);
};

/** Setting up a daily repeated command
 */
function initDailyTimeouts() {
    // Setting up clean channels at midnight setting
    let cleanChannelDate = new Date();
    cleanChannelDate.setMilliseconds(0);
    cleanChannelDate.setSeconds(0);
    cleanChannelDate.setMinutes(0);
    cleanChannelDate.setHours(0);
    cleanChannelDate.setDate(cleanChannelDate.getDate() + 1);

    setTimeout(dailyTimeouts, cleanChannelDate.getTime() - new Date().getTime());
}

/** Setting up an hourly repeated command.
 */
function initHourlyUpdater() {
    let nextHourDate = new Date();
    nextHourDate.setMilliseconds(0);
    nextHourDate.setSeconds(0);
    nextHourDate.setMinutes(0);
    nextHourDate.setHours(nextHourDate.getHours() + 1);

    setTimeout(hourlyUpdate, nextHourDate.getTime() - new Date().getTime());
}

/**
 * @property {Bool} initialHourly Used to ensure that on the initial setup the timeout doesn't begin (to prevent having timeouts not on the hour).
 */
let initialHourly = true;

/** Wrapper for running the commands on each hour.
 */
function hourlyUpdate() {
    console.info('Running Hourly Update!');

    if (!initialHourly) {
        awsUtils.save(
            'store.mmrree.co.uk',
            'stats/Users.json',
            JSON.stringify(fileConversion.convertNestMapsToJSON(metaData.userStatsMap))
        );
        setTimeout(hourlyUpdate, 60 * 60 * 1000);
    } else {
        initialHourly = false;
    }

    updateLeaderboards();
}

/** Updates the leaderboards with the guild's user's stats.
 * @async
 */
async function updateLeaderboards() {
    try {
        let leaderboardChannel = await new Discord.Channel(metaData.bot, {
            id: metaData.channels.find((channel) => channel.name == 'Leaderboards').id,
        }).fetch();

        updateCountStat(leaderboardChannel, 'lmao', {
            content: 'Lmao Count',
            embeds: [
                {
                    title: 'LMAO 😂',
                    description: "Where's your ass now?",
                    fields: [],
                },
            ],
        });

        updateCountStat(leaderboardChannel, 'nice', {
            content: 'Nice Count',
            embeds: [
                {
                    title: 'Nice 👌',
                    description: 'Nice job getting on this leaderboard!',
                    fields: [],
                },
            ],
        });

        updateCountStat(leaderboardChannel, 'toxic', {
            content: 'Toxic Count',
            embeds: [
                {
                    title: 'Toxic ☢️',
                    description: 'Stay away from these guys',
                    fields: [],
                },
            ],
        });
    } catch (e) {
        console.warn(e);
    }
}

/** Macro to help with updating the leaderboards. Sorts the users and updates the message for the specific leaderboard.
 * @param {Discord.Channel} leaderboardChannel The channel where the leaderboards are.
 * @param {String} stat The string of the key for the stat to be checked.
 * @param {Object} message The embed template with an empty fields array to be directly sent to discord once the formatting is handled.
 * @async
 */
async function updateCountStat(leaderboardChannel, stat, message) {
    let stats = [];

    for (let [key, user] of metaData.userStatsMap) {
        let discordUser;
        try {
            discordUser = await new Discord.User(metaData.bot, {
                id: key,
            }).fetch();
        } catch (e) {
            console.warn(e);
            continue;
        }

        if (user.has(stat + 'Count')) {
            stats.push({
                name: discordUser.username,
                count: user.get(stat + 'Count').count,
            });
        }
    }

    let statsSorted = stats.sort((user1, user2) => {
        if (user1.count < user2.count) {
            return 1;
        } else if (user1.count > user2.count) {
            return -1;
        } else return 0;
    });

    message.embeds[0].fields = statsSorted.map((user, index) => {
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
            value: stat + "'d " + user.count + ' times!',
            inline: true,
        };
    });

    try {
        new Discord.Message(metaData.bot, {
            id: metaData.channels.find((channel) => channel.name == 'Leaderboards')[stat + 'Board'],
            channel_id: leaderboardChannel,
        })
            ?.fetch()
            .then((board) => board.edit(message));
    } catch (e) {
        console.warn(e);
    }
}

/** Updates the statistics of the user who has just joined or left a channel.
 * @async
 * @param {Object} oldState The meta-data for the old channel the user was in.
 * @param {Object} newState The meta-data for the new channel the user has joined.
 */

exports.updateVoiceStats = async function updateVoiceStats(oldState, newState) {
    console.log(newState);
    console.log(oldState);
    if (newState.channelID != oldState.channelID) {
        if (!metaData.userStatsMap.has(newState.id)) metaData.userStatsMap.set(newState.id, new Map());

        if (newState.channelID) {
            // If a new state exists, just append the start time to it, this should never be the same as the old state, and so will have no contentions
            metaData.userStatsMap.get(newState.id).set(newState.channelID, {
                totalTime: metaData.userStatsMap.get(newState.id).has(newState.channelID)
                    ? metaData.userStatsMap.get(newState.id).get(newState.channelID).totalTime
                    : 0,
                startTime: new Date().getTime(),
                type: 'voice',
            });
        }

        if (oldState.channelID) {
            // If an old state exists, just increment its total time
            let difference =
                new Date().getTime() -
                new Date(metaData.userStatsMap.get(oldState.id).get(oldState.channelID).startTime).getTime();

            metaData.userStatsMap.get(oldState.id).set(oldState.channelID, {
                totalTime: metaData.userStatsMap.get(oldState.id).has(oldState.channelID)
                    ? metaData.userStatsMap.get(oldState.id).get(oldState.channelID).totalTime + difference
                    : 0 + difference,
                startTime: null,
                type: 'voice',
            });
            console.info(metaData.userStatsMap.get(oldState.id));
            return difference;
        }
    }
    console.info(metaData.userStatsMap.get(newState.id));
};

/** Update the users statistics based on what was included in their message.
 * @async
 * @param {Discord.Message} messageReceived The message this command was sent on, used to identify the sender and to view the content of the message.
 */

exports.updateMessageStats = async function updateMessageStats(messageReceived) {
    // If a DM
    if (messageReceived.guild != null) {
        if (!metaData.userStatsMap.has(messageReceived.author.id))
            metaData.userStatsMap.set(messageReceived.author.id, new Map());
        metaData.userStatsMap.get(messageReceived.author.id).set(messageReceived.channel.id, {
            // If message count then increment, otherwise simply set to 1
            messageCount: metaData.userStatsMap.get(messageReceived.author.id).has(messageReceived.channel.id)
                ? metaData.userStatsMap.get(messageReceived.author.id).get(messageReceived.channel.id).messageCount + 1
                : 1,
            type: 'text',
        });
    }

    if (/[n]+[i]+[c]+[e]+/gi.test(messageReceived.content)) {
        if (!metaData.userStatsMap.has(messageReceived.author.id))
            metaData.userStatsMap.set(messageReceived.author.id, new Map());

        // If "niceCount" exists, increment, otherwise set to 1
        metaData.userStatsMap.get(messageReceived.author.id).set('niceCount', {
            count: metaData.userStatsMap.get(messageReceived.author.id).has('niceCount')
                ? metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count + 1
                : 1,
        });
    }

    if (/[l]+[m]+[f]*[a]+[o]+/gi.test(messageReceived.content)) {
        if (!metaData.userStatsMap.has(messageReceived.author.id))
            metaData.userStatsMap.set(messageReceived.author.id, new Map());

        // If "lmaoCount" exists, increment, otherwise set to 1
        metaData.userStatsMap.get(messageReceived.author.id).set('lmaoCount', {
            count: metaData.userStatsMap.get(messageReceived.author.id).has('lmaoCount')
                ? metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count + 1
                : 1,
        });
    }
};

/** Sends a message with a random starwars gif to the channel of the user.
 * @async
 * @param {Discord.Message} messageReceived The message used to identify the user who sent the message.
 */
exports.starWarsResponse = async function starWarsResponse(messageReceived) {
    console.info(
        "'" +
            messageReceived.content +
            "' (by " +
            messageReceived.author.username +
            ') included a star wars string!\n\tResponding with star wars gif'
    );
    let rawResponse = await fetch(
        'https://api.tenor.com/v1/search?q=' +
            'star wars' +
            '&ar_range=standard&media_filter=minimal&api_key=RRAGVB36GEVU'
    );
    let content = await rawResponse.json();
    let item = Math.floor(Math.random() * content.results.length); // The far right number is the top X results value
    await messageReceived.channel.send('Star wars!\n' + content.results[item].url);
};

/** Sends a message with a random insult to the channel of the user.
 * @async
 * @param {Discord.Message} messageReceived The message used to identify the user who sent the message.
 */
exports.insultResponse = async function insultResponse(messageReceived) {
    console.info(
        "'" +
            messageReceived.content +
            "' (by " +
            messageReceived.author.username +
            ') mentioned the bot!\n\tResponding with insult'
    );
    if (new Date().getDay() != 2) {
        let insultResponse = await fetch('https://evilinsult.com/generate_insult.php?lang=en&type=json');
        let content = await insultResponse.json();
        await messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
    }
};

/**
 * @param {Bool} initialDaily Used to ensure that on the initial run setup the timeout doesn't begin (to prevent having timeouts not on the midnight daily).
 */
let initialDaily = true;

/** Sends a message with a random starwars gif to the channel of the user.
 * @param {Discord.Message} messageReceived The message used to identify the user who sent the message.
 */
function dailyTimeouts() {
    clean();
    if (!initialDaily) {
        setTimeout(dailyTimeouts, 24 * 60 * 60 * 1000);
    } else {
        initialDaily = false;
    }
}

/** Queries channel array for channels to be kept clean, then clean them (not pinned messages).
 * @async
 */
async function clean() {
    let cleanChannelArray = metaData.bot.channels.cache.filter((channel) => {
        if (channel.type == 'text') return channel;
    });

    for (let queryChannel of metaData.channels) {
        if (queryChannel.keepClean) {
            console.info('Cleaning channel ' + queryChannel.name + ' (' + queryChannel.id + ')!');

            let channel = await cleanChannelArray.find((item) => {
                if (item.id == queryChannel.id) return true;
            });

            if (channel) {
                channel.messages
                    .fetch({
                        limit: 100,
                    })
                    .then((messageArray) => {
                        messageArray.forEach((message) => {
                            if (!message.pinned) message.delete();
                        });
                    })
                    .catch((e) => console.warn(e));
            }
        }
    }
}
