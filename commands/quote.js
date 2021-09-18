const Discord = require('discord.js');
const metaData = require('../bot.js');

/** Quotes the string given in the arguments, attributed to the user given in the aruments.
 * @param {Discord.Interaction} interaction The interaction the command was sent in.
 * @param {String} string The string to quote from a user.
 * @param {Discord.User} user The user to attribute the quote to.
 */
function quoteText(interaction, quoteString, user) {
    console.info('-\tQuote the string:' + quoteString + ' (by ' + user.id + ')!');

    quoteMacro(quoteString, user.id, null);
    interaction.reply({
        content: 'The message: "' + quoteString + '" has been quoted by ' + user.username + '!',
        ephemeral: true,
    });
}

/** Quotes the message indicated in the arguments, attributed to the sender of the indicated message.
 * @param {Discord.Interaction} interaction The message the command was sent in to delete it.
 * @param {String} id The string of the id.
 */
function quoteId(interaction, id) {
    let regexURIQuote = new RegExp(
        '(https://discord(app)?.com/channels/[1-9][0-9]{0,18}/[1-9][0-9]{0,18}/)?([1-9][0-9]{0,18})'
    );

    let quoteMatch = id.match(regexURIQuote);

    console.info("-\tQuoting the id'd message (" + quoteMatch + ')!');

    if (quoteMatch) {
        interaction.channel.messages
            .fetch(quoteMatch[quoteMatch.length - 1])
            .then((quoteMessage) => {
                interaction.reply({
                    content: 'The message: "' + quoteMessage.content + '" has been quoted!',
                    ephemeral: true,
                });
                quoteMacro(quoteMessage.content, quoteMessage.author.id, quoteMessage.createdAt);
            })
            .catch((e) => console.warn(e));
    }
}

/** Quotes any message from the last 20 that match a query string.
 * @param {Discord.Interaction} interaction The interaction to identify the channel to search in.
 * @param {String} searchString The query string to search for in each message.
 */
function quote(interaction, searchString) {
    console.info('-\tSearching for the message to quote (' + searchString + ')!');
    interaction.channel.messages
        .fetch({
            limit: 20,
        })
        .then((messageArray) => {
            messageArray.forEach((message) => {
                if (message.content.includes(searchString) && message != interaction) {
                    interaction.reply({
                        content: 'The message: "' + message.content + '" has been quoted!',
                        ephemeral: true,
                    });
                    quoteMacro(message.content, message.author.id, message.createdAt);
                }
            });
        })
        .catch((e) => console.warn(e));
}

/** A macro to be used for formatting the quotes.
 * @param {String} quoteMessageContent The string to be in a quotation.
 * @param {String} userId The user id to attribute the quote to.
 * @param {null|Date} time Date object for the time to attribute (if null, attribute to time of function call).
 */
function quoteMacro(quoteMessageContent, userId, time) {
    for (let channel of metaData.channels) {
        if (channel.name == 'Quotes') {
            try {
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
            } catch (e) {
                console.warn(e);
            }
        }
    }
}

module.exports = {
    name: 'quote',
    description: 'Quotes a specific message from a specific user.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();
        let user = interaction.options.getUser('user');
        let id = interaction.options.getString('id');
        let string = interaction.options.getString('string');

        switch (sub_command) {
            case 'search':
                quote(interaction, string);
                break;
            case 'id':
                quoteId(interaction, id);
                break;
            case 'text':
                quoteText(interaction, string, user);
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'search',
            description: 'Searches the last few messages for the string, and places it in the quotes.',
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
            description: 'Fetches the message with this ID, and places it in the quotes.',
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
        {
            name: 'text',
            description: 'Quotes the free text under the name of the user.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'string',
                    description: 'The string to quote.',
                    type: 'STRING',
                    required: true,
                },
                {
                    name: 'user',
                    description: 'The user to attribute the quote to.',
                    type: 'USER',
                    required: true,
                },
            ],
        },
    ],
};
