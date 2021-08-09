const metaData = require('../bot.js');

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

    await toxicMessage.reactions.removeAll();
    await toxicMessage.react('🇹');
    await toxicMessage.react('🇴');
    await toxicMessage.react('🇽');
    await toxicMessage.react('🇮');
    await toxicMessage.react('🇨');
}

/** Marks the message indicated in the arguments as toxic.
 * @param {Discord.Interaction} interaction The message the command was sent in to be marked toxic.
 * @param {String} id The id of the message to mark as toxic.
 */
exports.toxicId = function toxicId(messageReceived, id) {
    let regexURIToxic = new RegExp(
        '(https://discord(app)?.com/channels/[1-9][0-9]{0,18}/[1-9][0-9]{0,18}/)?([1-9][0-9]{0,18})'
    );

    let matchToxic = id.match(regexURIToxic);
    console.info("-\tMarking the id'd message as toxic (" + matchToxic[1] + ')!');

    if (matchToxic) {
        interaction.channel.messages.fetch(matchToxic[matchToxic.length - 1]).then((toxicMessage) => {
            toxicMacro(toxicMessage);
            interaction.reply({
                content: 'Marked the message "' + message.content + '" by ' + message.author.username + ' as toxic!',
                ephemeral: true,
            });
            return;
        });
    }
    interaction.reply({ content: 'No message marked as toxic!', ephemeral: true });
};

/** Marks any message from the last 20 that match a query string as toxic.
 * @param {Discord.Interaction} interaction The message to identify the channel to search in.
 * @param {String} searchString The query string to search for in each message.
 */
async function toxic(interaction, searchString) {
    console.info('-\tSearching for the message to mark as toxic (' + searchString + ')!');
    let toxicTest = new RegExp(searchString, 'gi');
    await interaction.channel.messages
        .fetch({
            limit: 20,
        })
        .then((messageArray) => {
            messageArray.forEach((message) => {
                if (toxicTest.test(message.content) && message.id != interaction.id) {
                    console.log(message);
                    toxicMacro(message);
                    interaction.reply({
                        content:
                            'Marked the message "' + message.content + '" by ' + message.author.username + ' as toxic!',
                        ephemeral: true,
                    });
                    return;
                }
            });
        });
    interaction.reply({ content: 'No message marked as toxic!', ephemeral: true });
}

module.exports = {
    name: 'toxic',
    description: 'Marks a message as toxic.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();
        let search = interaction.options.getString('string');
        let id = interaction.options.getString('id');

        switch (sub_command) {
            case 'search':
                toxic(interaction, search);
                break;
            case 'id':
                toxicId(interaction, id);
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'search',
            description: 'Searches the last few messages for the string, and marks as TOXIC.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'string',
                    description: 'The string to search for.',
                    type: 'STRING',
                    required: true,
                },
            ],
        },
        {
            name: 'id',
            description: 'Fetches the message with this ID, and marks as TOXIC.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'id',
                    description: 'The ID of the message.',
                    type: 'STRING',
                    required: true,
                },
            ],
        },
    ],
};
