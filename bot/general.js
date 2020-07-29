const Discord = require('discord.js');
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const { findBestMatch } = require('string-similarity');

const metaData = require('../bot.js');
const awsUtils = require('./awsUtils');
const fileConversion = require('./fileConversion.js');

/** @todo add a method to save locall if not on prod */

/** Initialises the running of timed events (and runs them once).
 */
exports.init = function init() {
    updateLeaderboards();
    hourlyUpdate();
    dailyTimeouts();

    initHourlyUpdater();
    initDailyTimeouts();
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
 * @param {Bool} initialHourly Used to ensure that on the initial setup the timeout doesn't begin (to prevent having timeouts not on the hour).
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
    } else initialHourly = false;

    getFbPosts('https://www.facebook.com/pg/Crushampton/posts/').then((posts) => {
        sendFbPosts(posts);
    });

    updateLeaderboards();
}

/** Updates the leaderboards with the guild's user's stats.
 * @async
 */
async function updateLeaderboards() {
    let leaderboardChannel = await new Discord.Channel(metaData.bot, {
        id: metaData.channels.find((channel) => channel.name == 'Leaderboards').id,
    }).fetch();

    updateCountStat(leaderboardChannel, 'lmao', {
        content: 'Lmao Count',
        embed: {
            title: 'LMAO 😂',
            description: "Where's your ass now?",
            fields: [],
        },
    });

    updateCountStat(leaderboardChannel, 'nice', {
        content: 'Nice Count',
        embed: {
            title: 'Nice 👌',
            description: 'Nice job getting on this leaderboard!',
            fields: [],
        },
    });

    updateCountStat(leaderboardChannel, 'toxic', {
        content: 'Toxic Count',
        embed: {
            title: 'Toxic ☢️',
            description: 'Stay away from these guys',
            fields: [],
        },
    });
}

/** Macro to help with updating the leaderboards. Sorts the users and updates the message for the specific leaderboard.
 * @param {Discord.Channel} leaderboardChannel The channel where the leaderboards are.
 * @param {String} stat The string of the key for the stat to be checked.
 * @param {Object} message The embed template with an empty fields array to be directly sent to discord once the formatting is handled.
 * @async
 */
async function updateCountStat(leaderboardChannel, stat, message) {
    let stats = [];

    await metaData.userStatsMap.forEach(async (user, key) => {
        let discordUser = await new Discord.User(metaData.bot, {
            id: key,
        }).fetch();

        if (user.has(stat + 'Count')) {
            stats.push({
                name: discordUser.username,
                count: user.get(stat + 'Count').count,
            });
        }
    });

    let statsSorted = stats.sort((user1, user2) => {
        if (user1.count < user2.count) {
            return 1;
        } else if (user1.count > user2.count) {
            return -1;
        } else return 0;
    });

    message.embed.fields = statsSorted.map((user, index) => {
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

    new Discord.Message(
        metaData.bot,
        {
            id: metaData.channels.find((channel) => channel.name == 'Leaderboards')[stat + 'Board'],
        },
        leaderboardChannel
    )
        .fetch()
        .then((board) => board.edit(message));
}

/** Macro to send an array of fb posts to the 'crushampton' chanenl.
 * @param {Array} posts Posts retrieved from any source, with properies of 'text', 'url' and 'image'.
 * @async
 */
async function sendFbPosts(posts) {
    let channel = metaData.channels.find((item) => {
        return item.name === 'Crushampton';
    });

    if (channel) {
        // Just make sure the config has been set up properly
        let crushamptonChannel = await new Discord.Channel(metaData.bot, {
            id: channel.id,
        }).fetch();

        let regExp = /(?:#Crushampton)*([0-9]+)/;

        for (let post of posts) {
            console.info('Sending Crushampton post #' + regExp.exec(post.text)[1] + ' to the channel!\n' + post.text);
            crushamptonChannel.send({
                content: 'Crushampton #' + regExp.exec(post.text)[1],
                embed: {
                    title: '#' + regExp.exec(post.text)[1],
                    description: post.text
                        .replace('#Crushampton' + regExp.exec(post.text)[1], '')
                        .substring(0, 2048)
                        .replace('Mehr ansehen', '')
                        .replace('See more', '')
                        .replace('See More', ''),
                    url: post.url,
                    author: {
                        name: 'Crushampton',
                        icon_url:
                            'https://scontent.fzrh3-1.fna.fbcdn.net/v/t1.0-9/61258631_2477108982524094_1497858827888885760_n.png?_nc_cat=106&_nc_sid=85a577&_nc_oc=AQn8bVmgCgcTE0Ufn8mCp2dNhOHBhwn9fcg5WL4ZQxGgqa2eMFbe37JnEglgns9K1JONfjsXcrek0Hm524JxhsGy&_nc_ht=scontent.fzrh3-1.fna&oh=cf2fafc50f5afe2c6185056c09300032&oe=5F20EA6A',
                    },
                    image: {
                        url: post.image,
                    },
                },
            });
        }
    } else {
        console.error('No such channel, check the config files!');
    }
}

/** Macro to help with retrieving the last unseen posts from a url.
 * @async
 * @param {String} pageUrl The facebook url from which the posts will be retrieved.
 * @returns {Promise} Containing an array of the posts retrieved.
 */

async function getFbPosts(pageUrl) {
    let channel = metaData.channels.find((item) => {
        return item.name === 'Crushampton';
    });

    if (channel) {
        // Just make sure the config has been set up properly
        let crushamptonChannel = await new Discord.Channel(metaData.bot, {
            id: channel.id,
        }).fetch();

        let lastMessage = await new Discord.Message(
            metaData.bot,
            {
                id: crushamptonChannel.lastMessageId,
            },
            crushamptonChannel
        ).fetch();

        lastMessage = lastMessage.first();
        let regExp = /(?:#Crushampton)*([0-9]+)/;
        let lastMessageNumber = parseInt(regExp.exec(lastMessage.content ? lastMessage.content : '0')[1]);

        return rp
            .get({
                url: pageUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:64.0) Gecko/20100101 Firefox/64.0',
                },
            })
            .then(async (postsHtml) => {
                let reachedLast = false;
                let $ = cheerio.load(postsHtml);

                let posts = [];

                let recentPosts = [];

                let timeLinePostEls = $('.userContentWrapper')
                    .map((i, el) => $(el))
                    .get();
                timeLinePostEls.forEach((postObject) => {
                    let $post = cheerio.load(postObject.html());
                    let post = $post('.userContent');

                    if (post.text().startsWith('#Crushampton')) {
                        let postNumber = parseInt(regExp.exec(post.text())[1]);

                        if (postNumber > lastMessageNumber) {
                            recentPosts.unshift({
                                text: cheerio
                                    .load(
                                        post
                                            .html()
                                            .replace(/<(?:p)*?>/gm, '\n')
                                            .replace(/<(?:br)*?>/gm, '\n')
                                            .replace(/<(?:.)*?>/gm, '')
                                    )
                                    .text(),
                                url:
                                    'https://www.facebook.com' +
                                    $post('[data-testid=story-subtitle]')[0].firstChild.firstChild.firstChild.attribs
                                        .href,
                                image: $post('.uiScaledImageContainer')[0]
                                    ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src
                                    : null,
                            });
                        }

                        if (postNumber <= lastMessageNumber + 1) {
                            reachedLast = true;
                            return;
                        }
                    }
                });

                if (!reachedLast) {
                    // Ajax request for more posts
                    let morePosts = $('.uiMorePager')
                        .map((i, el) => $(el))
                        .get();
                    let link = morePosts.map((link) => {
                        return (
                            encodeURI(
                                'https://www.facebook.com' +
                                    /ajaxify="([\s\S]+)" href/.exec(link)[1].replace(/&amp;/g, '&')
                            )
                                .replace(/%25/g, '%')
                                .replace('unit_count=8', 'unit_count=100') +
                            '&fb_dtsg_ag' +
                            '&__user=0' +
                            '&__a=1' +
                            '&__dyn=7AgNe5Gmawgrolg9odoyGxu4QjFwn8S2Sq2i5U4e1qzEjyQdxK5WAx-bxWUW16whoS2S4ogU9EdEO0w8kwUx61cw9yEuxm0wpk2u2-263WWwSxu15wgE46fw9C48sz-0JohwKx-8wgolzUOmVo7y1NwRz8cHAy8aEaoGqfwl8cE5S5o9kbxSEtx-2y2O0B8bUbGwCxe1lwlE-7Eoxmm1jxe3C0D888cobEaUe85m'
                        );
                    });
                    link = link[0];

                    await rp
                        .get({
                            url: link,
                            credentials: 'omit',
                            headers: {
                                'User-Agent':
                                    'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:64.0) Gecko/20100101 Firefox/64.0',
                                Accept: '*/*',
                                'Accept-Language': 'en-US,en;q=0.5',
                            },
                            referrer: 'https://www.facebook.com/pg/Crushampton/posts/',
                            method: 'GET',
                            mode: 'cors',
                        })
                        .then(async (res) => {
                            await ajax(res, lastMessageNumber, recentPosts);
                        });
                }

                for (let post of recentPosts) {
                    posts.push(post);
                }
                return posts;
            });
    } else {
        console.error('No such channel, check the config files!');
    }
}

/** Macro to help query facebook as if a browser was open (for more posts).
 * @async
 * @param {String} body Unformatted response from the ajax request payload.
 * @param {Integer} lastMessageNumber The value of the last post seen to know when to end the search.
 * @param {Array} posts The array of posts that have currently been found.
 */

async function ajax(body, lastMessageNumber, posts) {
    let $ = cheerio.load(unescape(JSON.parse('"' + /\_\_html\"\:\"([\s\S]+)\"}]],\"jsmods\"/g.exec(body)[1] + '"')));
    let timeLinePostEls = $('.userContentWrapper')
        .map((i, el) => $(el))
        .get();

    let finished = false;

    timeLinePostEls.forEach((postObject) => {
        if (!finished) {
            let $post = cheerio.load(postObject.html());
            let post = $post('.userContent');

            if (post.text().startsWith('#Crushampton')) {
                let regExp = /(?:Crushampton #)*([0-9]+)/;
                let postNumber = parseInt(regExp.exec(post.text())[1]);

                if (postNumber > lastMessageNumber) {
                    posts.unshift({
                        text: cheerio
                            .load(
                                post
                                    .html()
                                    .replace(/<(?:p)*?>/gm, '\n')
                                    .replace(/<(?:br)*?>/gm, '\n')
                                    .replace(/<(?:.)*?>/gm, '')
                            )
                            .text(),
                        url:
                            'https://www.facebook.com' +
                            $post('[data-testid=story-subtitle]')[0].firstChild.firstChild.firstChild.attribs.href,
                        image: $post('.uiScaledImageContainer')[0]
                            ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src
                            : null,
                    });
                }

                if (postNumber <= lastMessageNumber + 1) {
                    reachedLast = true;
                    return;
                }
            }
        }
    });
}

/** Updates the statistics of the user who has just joined or left a channel.
 * @async
 * @param {Object} oldState The meta-data for the old channel the user was in.
 * @param {Object} newState The meta-data for the new channel the user has joined.
 */

exports.updateVoiceStats = async function updateVoiceStats(oldState, newState) {
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

/** Changes the users roles to have a moderator role, or a psudo moderator role to view the server as a user without admin permissions (without risking them being removed from an admin role).
 * @param {Discord.Message} messageReceived The message this command was sent on, used to identify the sender.
 */

exports.toggleModerator = function toggleModerator(messageReceived) {
    console.info('-\tToggle user to normal view for ' + messageReceived.author.username + '!');
    let psudoModRole;
    let modRole;
    if (process.env.DISCORD_BOT_TOKEN) {
        psudoModRole = '730775933581263028';
        modRole = '668465816894832641';
    } else {
        psudoModRole = '729306365562191912';
        modRole = '730778077386506250';
    }

    if (!messageReceived.member.roles.cache.has(modRole) && messageReceived.member.roles.cache.has(psudoModRole)) {
        messageReceived.member.roles.add
            ? messageReceived.member.roles.add(modRole)
            : messageReceived.member.roles.cache.set(modRole);
    } else if (
        messageReceived.member.roles.cache.has(modRole) &&
        messageReceived.member.roles.cache.has(psudoModRole)
    ) {
        messageReceived.member.roles.remove
            ? messageReceived.member.roles.remove(modRole)
            : messageReceived.member.roles.cache.delete(modRole);
    } else if (
        messageReceived.member.roles.cache.has(modRole) &&
        !messageReceived.member.roles.cache.has(psudoModRole)
    ) {
        messageReceived.member.roles.remove
            ? messageReceived.member.roles.remove(modRole)
            : messageReceived.member.roles.cache.delete(modRole);
        messageReceived.member.roles.add
            ? messageReceived.member.roles.add(psudoModRole)
            : messageReceived.member.roles.cache.set(psudoModRole);
    }
    messageReceived.delete();
};

/** Resets the statistics of the invoking user.
 * @param {Discord.Message} messageReceived The message this command was sent on, used to identify the sender.
 */

exports.resetStats = function resetStats(messageReceived) {
    metaData.userStatsMap.delete(messageReceived.author.id);
    messageReceived.delete();
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

/** The default case if the user has input a command, but it was not identified.
 * @param {Discord.Message} messageReceived The message this command was sent on, used to identify the sender, and view the message content.
 */

exports.notImplementedCommand = function notImplementedCommand(messageReceived, cmd) {
    console.info('-\tNot implemented!');
    let commandList = require('./commands').list;
    let justCommands = commandList.map((command) => command.name);
    let bestMatching = findBestMatch('!' + cmd, justCommands);
    let workingString = 'Hi ' + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!";

    if (bestMatching.bestMatch.rating > 0.5) {
        workingString += '\nPerhaps you meant: ' + bestMatching.bestMatch.target;
    }
    messageReceived.author.send(workingString);
    if (new Date().getDay() != 2)
        messageReceived.reply('is an idiot, they wrote the command: ' + messageReceived.content);
    messageReceived.delete();
};

/** Macro used to create personalised statistics message fields.
 * @param {String} userId The user id used to identify the statistics owner.
 * @returns {Array} An array of fields generated for the users stats.
 */

function statFieldsGenerator(userId) {
    let fields = [];

    fields.push({
        name: '\u200B',
        value: '\u200B',
    });

    fields.push({
        name: 'Channel Stats Below',
        value: '...',
    });

    metaData.bot.channels.cache.forEach((serverChannel) => {
        metaData.userStatsMap.get(userId).forEach((statChannel, statId) => {
            if (serverChannel.id == statId) {
                if (statChannel.type == 'voice') {
                    function msToTime(duration) {
                        var milliseconds = parseInt((duration % 1000) / 100),
                            seconds = Math.floor((duration / 1000) % 60),
                            minutes = Math.floor((duration / (1000 * 60)) % 60),
                            hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

                        seconds = seconds < 10 && (minutes > 0 || hours > 0) ? '0' + seconds : seconds;
                        minutes = minutes < 10 && hours > 0 ? '0' + minutes : minutes;
                        hours = hours < 10 ? '0' + hours : hours;

                        if (seconds.valueOf() > 0) {
                            if (minutes.valueOf() > 0) {
                                if (hours.valueOf() > 0) {
                                    return hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
                                }
                                return minutes + ' minutes and ' + seconds + ' seconds';
                            }
                            return seconds + ' seconds';
                        }
                        return milliseconds + ' milliseconds';
                    }

                    fields.push({
                        name: serverChannel.name,
                        value: msToTime(statChannel.totalTime) + ' spent in this channel!',
                        inline: true,
                    });
                } else if (statChannel.type == 'text') {
                    fields.push({
                        name: serverChannel.name,
                        value: 'You sent ' + statChannel.messageCount + ' messsages in this channel!',
                        inline: true,
                    });
                }
            }
        });
    });

    fields.push({
        name: '\u200B',
        value: '\u200B',
    });

    fields.push({
        name: 'General Stats Below',
        value: '...',
    });

    metaData.userStatsMap.get(userId).forEach((statChannel, statId) => {
        if (statId == 'lmaoCount') {
            fields.push({
                name: '😂-lmao',
                value: 'You have sent ' + statChannel.count + ' "lmao"s!',
                inline: true,
            });
        } else if (statId == 'niceCount') {
            fields.push({
                name: '👍-nice',
                value: 'You have sent ' + statChannel.count + ' "nice"s!',
                inline: true,
            });
        } else if (statId == 'toxicCount') {
            fields.push({
                name: '☣️-toxic',
                value: 'You been toxic ' + statChannel.count + ' times!',
                inline: true,
            });
        }
    });

    return fields;
}

/** Macro used to create personalised statistics message fields.
 * @async
 * @param {Discord.Message} messageReceived The message used to identify the user who sent the message.
 * @param {String[]} args The arguments of the message, used to identify which users to send a message for.
 */
exports.stats = async function stats(messageReceived, args) {
    if (args.length == 0) {
        if (metaData.userStatsMap.has(messageReceived.author.id)) {
            console.info(metaData.userStatsMap.get(messageReceived.author.id));
            let fields = statFieldsGenerator(messageReceived.author.id, metaData.userStatsMap, metaData.bot);

            messageReceived.author.send({
                content: 'Your statistics',
                embed: {
                    title: 'Stats',
                    description: 'Showing ' + messageReceived.author.username + "'s Stats...",
                    fields: fields,
                },
            });
        } else {
            messageReceived.author.send('You have no stats on record!');
        }
    } else {
        let userList = args.map((arg) => /<@[!]*([0-9]+)>/g.exec(arg)[1]).filter((arg) => arg != null);

        for (let user of userList) {
            if (metaData.userStatsMap.has(user)) {
                console.info(metaData.userStatsMap.get(user));
                let fields = statFieldsGenerator(user, metaData.userStatsMap, metaData.bot);

                messageReceived.author.send({
                    content: '<@!' + user + ">'s statistics",
                    embed: {
                        title: 'Stats',
                        description: 'Showing <@!' + user + ">'s Stats...",
                        fields: fields,
                    },
                });
            } else {
                messageReceived.author.send('There are no stats on record for <@!' + user + '>!');
            }
        }
    }
    if (messageReceived.guild != null) messageReceived.delete();
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
    await rp.get(
        'https://api.tenor.com/v1/search?q=' +
            'star wars' +
            '&ar_range=standard&media_filter=minimal&api_key=RRAGVB36GEVU',
        async (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body);
                let item = Math.floor(Math.random() * content.results.length); // The far right number is the top X results value
                await messageReceived.channel.send('Star wars!\n' + content.results[item].url);
            } else {
                console.error(error + ' ' + response);
            }
        }
    );
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
    if (new Date().getDay() != 2)
        await rp.get('https://evilinsult.com/generate_insult.php?lang=en&type=json', async (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body);
                await messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
            } else {
                console.error(error + ' ' + response);
            }
        });
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
    if (!initialDaily) setTimeout(dailyTimeouts, 24 * 60 * 60 * 1000);
    else initialDaily = false;
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

            channel.messages
                .fetch({
                    limit: 100,
                })
                .then((messageArray) => {
                    messageArray.forEach((message) => {
                        if (!message.pinned) message.delete();
                    });
                });
        }
    }
}

/** Bulk deletes any unpinned messages (up to 100) from the channel the user sent the command.
 * @async
 * @param {Discord.Message} messageReceived The message used to identify the user who sent the message.
 * @param {String[]} args The first value of which is used for the number of messages to delete
 */
exports.bulkDelete = async function bulkDelete(messageReceived, args) {
    console.info('-\tBulkDelete invoked, checking permissions!');
    let adminRoles = ['668465816894832641', '705760947721076756'];
    let permissionsFound = adminRoles.some((role) => messageReceived.member.roles.cache.has(role));

    if (messageReceived.guild != null) messageReceived.delete();

    if (permissionsFound) {
        let messageCount = parseInt(args[0]);
        if (messageCount + 1 > 100) messageCount = 100;
        else if (messageCount <= 0) messageCount = 1;

        console.info('\tPermissions are correct, deleting ' + messageCount + ' messages!');

        messageReceived.channel.messages
            .fetch({
                limit: messageCount,
                before: messageReceived.id,
            })
            .then((messageArray) => {
                messageArray.forEach((message) => {
                    if (!message.pinned) message.delete();
                });
            });
    } else {
        console.info('\tUser does not have the required permissions!');
        await messageReceived.author.send(
            'Hi ' + messageReceived.author.username + ',\nYou do not have the permissions for the bulkDelete command!'
        );
    }
};

/** Runs through the documentation for the commands and sends a formatted message to the user.
 * @param {Discord.Message} messageReceived The message used to identify the user who sent the message.
 */
exports.help = function help(messageReceived) {
    console.info('-\tSending a help list of all the commands to the user!');
    let message = {
        content: 'List of commands:',
        embeds: {
            title: 'List of commands:',
            fields: [],
        },
    };
    let commandList = require('./commands').list;

    let lastChannel = commandList[0].channel;

    let currentField = {};

    for (let command of commandList) {
        if (message.length + 250 < 2000) {
            if (command.channel != lastChannel) {
                message.embeds;
                lastChannel = command.channel;
            }
            message +=
                '\n`' + command.channel + '`-`' + command.name + ' ' + command.arguments + '` = ' + command.description;
        } else {
            messageReceived.author.send(message);
            message =
                '`' + command.channel + '`-`' + command.name + ' ' + command.arguments + '` = ' + command.description;
        }
    }
    messageReceived.author.send(message);
    if (messageReceived.guild != null) messageReceived.delete();
};

/** Picks a random response from a set of strings for Eight Ball responses.
 * @param {Discord.Message} messageReceived Used to identify the channel where the user sent the command.
 * @param {String} argumentString Used to see the content of the question asked in the command.
 */
exports.eightBall = function eightBall(messageReceived, argumentString) {
    console.info('-\tResponding with an 8 ball prediction!');
    let responses = [
        'As I see it, yes.',
        'Ask again later.',
        'Better not tell you now.',
        'Cannot predict now.',
        'Concentrate and ask again.',
        'Don’t count on it.',
        'It is certain.',
        'It is decidedly so.',
        'Most likely.',
        'My reply is no.',
        'My sources say no.',
        'Outlook not so good.',
        'Outlook good.',
        'Reply hazy, try again.',
        'Signs point to yes.',
        'Very doubtful.',
        'Without a doubt.',
        'Yes.',
        'Yes – definitely.',
        'You may rely on it.',
    ];
    let randomNumber = Math.floor(Math.random() * responses.length);
    messageReceived.reply("you asked '" + argumentString + "'...\n" + responses[randomNumber]);
};

/** Automatically performs a cAmEl CaSe transformation on the string provided and sends it back to the channel attributed to the user.
 * @param {*} messageReceived The message the command is sent in to identify the user and the channel.
 * @param {*} argumentString The string to be transformed into camel case.
 */
exports.camel = function camel(messageReceived, argumentString) {
    console.info('-\tResponding with cAmEl FoNt!');
    let camelString = '';
    let camelIndex = 0;

    for (let i = 0; i < argumentString.length; i++) {
        if (argumentString.charAt(i) == ' ') {
            camelString += ' ';
        } else if (camelIndex % 2 == 0) {
            camelIndex++;
            camelString += argumentString.charAt(i).toLowerCase();
        } else {
            camelIndex++;
            camelString += argumentString.charAt(i).toUpperCase();
        }
    }

    messageReceived.channel.send('> ' + camelString + '\n- <@!' + messageReceived.author.id + '>');

    if (messageReceived.guild != null) messageReceived.delete();
};

/** Quotes the string given in the arguments, attributed to the user given in the aruments.
 * @param {Discord.Message} messageReceived The message the command to delete it.
 * @param {String[]} args Array where the first element is the @ of the user to attribute the quote to and the rest are the individual words in the string.
 */
exports.quote = function quote(messageReceived, args) {
    let userId = /<@[!]*([0-9]+)>/g.exec(args[0])[1];
    args = args.splice(1);
    let quoteString = args.join(' ');

    console.info('-\tQuote the string:' + quoteString + ' (by ' + userId + ')!');

    quoteMacro(quoteString, userId, null);
    if (messageReceived.guild != null) messageReceived.delete();
};

/** Quotes the message indicated in the arguments, attributed to the sender of the indicated message.
 * @param {Discord.Message} messageReceived The message the command was sent in to delete it.
 * @param {String[]} args The first element indicating the id of the message to be quoted.
 */
exports.quoteId = function quoteId(messageReceived, args) {
    let regexURIQuote = new RegExp(
        '(https://discordapp.com/channels/[1-9][0-9]{0,18}/[1-9][0-9]{0,18}/)?([1-9][0-9]{0,18})'
    );

    let quoteMatch = args[0].match(regexURIQuote);

    console.info("-\tQuoting the id'd message (" + quoteMatch + ')!');

    if (quoteMatch) {
        messageReceived.channel.messages.fetch(quoteMatch[quoteMatch.length - 1]).then((toxicMessage) => {
            quoteMacro(toxicMessage.content, toxicMessage.author.id, toxicMessage.createdAt);
        });
    }

    if (messageReceived.guild != null) messageReceived.delete();
};

/** Quotes any message from the last 20 that match a query string.
 * @param {Discord.Message} messageReceived The message to identify the channel to search in.
 * @param {String} argumentString The query string to search for in each message.
 */
exports.quoteMessage = function quoteMessage(messageReceived, argumentString) {
    console.info('-\tSearching for the message to quote (' + argumentString + ')!');
    messageReceived.channel.messages
        .fetch({
            limit: 20,
        })
        .then((messageArray) => {
            messageArray.forEach((message) => {
                if (message.content.includes(argumentString) && message != messageReceived) {
                    quoteMacro(message.content, message.author.id, message.createdAt);
                }
            });
        });
    if (messageReceived.guild != null) messageReceived.delete();
};

/** A macro to be used for formatting the quotes.
 * @param {String} quoteMessageContent The string to be in a quotation.
 * @param {String} userId The user id to attribute the quote to.
 * @param {null|Date} time Date object for the time to attribute (if null, attribute to time of function call).
 */
function quoteMacro(quoteMessageContent, userId, time) {
    for (let channel of metaData.channels) {
        if (channel.name == 'Quotes') {
            new Discord.Channel(metaData.bot, {
                id: channel.id,
            })
                .fetch()
                .then((quotesChannel) => {
                    let today = time ? time : new Date();
                    let dateString =
                        today.getHours() +
                        ':' +
                        today.getMinutes() +
                        ' on ' +
                        today.getDate() +
                        '/' +
                        (today.getMonth() + 1) +
                        '/' +
                        today.getFullYear();
                    quoteMessageContent = quoteMessageContent.replace(/\n/g, '\n> ');
                    quotesChannel.send('> ' + quoteMessageContent + '\nBy <@!' + userId + '> at ' + dateString);
                });
        }
    }
}

/** Macro used to react to the message marked as toxic, also increments the user who sent that message's toxicCount.
 * @async
 * @param {Discord.Message} toxicMessage The message to be marked as toxic.
 */
async function toxicMacro(toxicMessage) {
    if (toxicMessage.author.bot) {
        let originalUser = /<@[!]*([0-9]+)>$/g.exec(toxicMessage.content)[1];
        if (!metaData.userStatsMap.has(originalUser)) metaData.userStatsMap.set(originalUser, new Map());
        metaData.userStatsMap.get(originalUser).set('toxicCount', {
            count: metaData.userStatsMap.get(originalUser).has('toxicCount')
                ? metaData.userStatsMap.get(originalUser).get('toxicCount').count + 1
                : 1,
        });
    } else {
        if (!metaData.userStatsMap.has(toxicMessage.author.id))
            metaData.userStatsMap.set(toxicMessage.author.id, new Map());
        metaData.userStatsMap.get(toxicMessage.author.id).set('toxicCount', {
            count: metaData.userStatsMap.get(toxicMessage.author.id).has('toxicCount')
                ? metaData.userStatsMap.get(toxicMessage.author.id).get('toxicCount').count + 1
                : 1,
        });
    }

    await toxicMessage.react('🇹');
    await toxicMessage.react('🇴');
    await toxicMessage.react('🇽');
    await toxicMessage.react('🇮');
    await toxicMessage.react('🇨');
}

/** Marks the message indicated in the arguments as toxic.
 * @param {Discord.Message} messageReceived The message the command was sent in to be marked toxic.
 * @param {String[]} args The first element indicating the id of the message to be quoted.
 */
exports.toxicId = function toxicId(messageReceived, args) {
    let regexURIToxic = new RegExp(
        '(https://discordapp.com/channels/[1-9][0-9]{0,18}/[1-9][0-9]{0,18}/)?([1-9][0-9]{0,18})'
    );

    let matchToxic = args[0].match(regexURIToxic);
    console.info("-\tMarking the id'd message as toxic (" + matchToxic[1] + ')!');

    if (matchToxic) {
        messageReceived.channel.messages.fetch(matchToxic[matchToxic.length - 1]).then((toxicMessage) => {
            toxicMacro(toxicMessage);
        });
    }
    if (messageReceived.guild != null) messageReceived.delete();
};

/** Marks any message from the last 20 that match a query string as toxic.
 * @param {Discord.Message} messageReceived The message to identify the channel to search in.
 * @param {String} argumentString The query string to search for in each message.
 */
exports.toxic = async function toxic(messageReceived, argumentString) {
    console.info('-\tSearching for the message to mark as toxic (' + argumentString + ')!');
    let toxicTest = new RegExp(argumentString, 'gi');
    await messageReceived.channel.messages
        .fetch({
            limit: 20,
        })
        .then((messageArray) => {
            messageArray.forEach((message) => {
                if (toxicTest.test(message.content) && message.id != messageReceived.id) {
                    toxicMacro(message);
                }
            });
        });
    if (messageReceived.guild != null) messageReceived.delete();
};

/** Sends a placholder message to the channel the command was sent from.
 * @param {Discord.Message} messageReceived The message to point to which channel.
 */
exports.sendPlaceholder = function sendPlaceholder(messageReceived) {
    console.info('-\tSending placeholder!');
    messageReceived.channel.send('Placeholder Message');
    if (messageReceived.guild != null) messageReceived.delete();
};
