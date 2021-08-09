const metaData = require('../bot.js');

/** Macro used to create personalised statistics message fields.
 * @async
 * @param {Discord.Interaction} interaction The interaction used to identify the user who sent the message.
 * @param {Discord.User} user The user to send the stats for.
 */
async function stats(interaction, user) {
    if (metaData.userStatsMap.has(user.id)) {
        console.info(metaData.userStatsMap.get(user.id));
        let fields = statFieldsGenerator(user.id, metaData.userStatsMap, metaData.bot);

        interaction.reply({
            content: '<@!' + user.id + ">'s statistics",
            embeds: [
                {
                    title: 'Stats',
                    description: 'Showing <@!' + user.id + ">'s Stats...",
                    fields: fields,
                },
            ],
        });
    } else {
        interaction.reply({ content: 'There are no stats on record for ' + user.username + '!', ephemeral: true });
    }
}

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
                            hours = Math.floor(duration / (1000 * 60 * 60));

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

/** Resets the statistics of the invoking user.
 * @param {Discord.Interaction} interaction The interaction this command was sent on, used to identify the sender.
 * @param {Discord.Channel} channel The name or id of the channel to delete the stats from for the user.
 */
function resetStats(interaction, channelQuery) {
    metaData.bot.channels.cache.forEach((serverChannel) => {
        if (channelQuery.id == serverChannel.id) {
            metaData.userStatsMap.get(interaction.user.id).delete(serverChannel.id);
            interaction.reply({
                content:
                    'Reset your stats for: ' +
                    channelQuery.name +
                    ' ' +
                    channelQuery.type.slice(6).toLowerCase() +
                    ' channel!',
                ephemeral: true,
            });
        }
    });
}

module.exports = {
    name: 'stats',
    description: "View or reset your stats related to this server's use.",
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();
        let user = interaction.options.getUser('user');
        let channel = interaction.options.getChannel('channel');

        switch (sub_command) {
            case 'info':
                stats(interaction, user);
                break;
            case 'reset':
                resetStats(interaction, channel);
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'info',
            description: 'Provides info about a users stats that only you can see.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'user',
                    description: 'The user to query.',
                    type: 'USER',
                    required: true,
                },
            ],
        },
        {
            name: 'reset',
            description: 'Resets a certain channel statistic.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'channel',
                    description: 'The channel to reset the stats of.',
                    type: 'CHANNEL',
                    required: true,
                },
            ],
        },
    ],
};
