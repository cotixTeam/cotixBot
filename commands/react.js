/** React to the query message with the unique string included in the argument.
 * @param {Discord.Interaction} interaction The message to identify the channel to search in.
 * @param {String} searchString The query string to search for.
 * @param {String} reactString The string to reach with (if unique letters).
 */
function react(interaction, searchString, reactString) {
    console.info('-\tSearching for the message to quote (' + searchString + ')!');

    if (checkUnique(interaction, reactString)) {
        interaction.channel.messages
            .fetch({
                limit: 20,
            })
            .then((messageArray) => {
                messageArray.forEach(async (message) => {
                    if (message.content.includes(searchString) && message.content != interaction.content) {
                        reactMacro(message, reactString);
                        interaction.reply('The message "' + message.content + '" has been reacted to!');
                    }
                });
            });
    }
}

/** React to the message ID with the unique string included in the argument.
 * @param {Discord.Interaction} interaction The message to identify the channel to search in.
 * @param {String} id The query string to search for.
 * @param {String} reactString The string to reach with (if unique letters).
 */
function reactId(interaction, id, reactString) {
    let regexURIToxic = new RegExp(
        '(https://discord(app)?.com/channels/[1-9][0-9]{0,18}/[1-9][0-9]{0,18}/)?([1-9][0-9]{0,18})'
    );

    let matchReact = searchString.match(regexURIToxic);
    console.info(
        "-\tMarking the id'd message (" +
            matchReact[matchReact.length - 1] +
            ') with the react (' +
            reactString +
            ') [if unique]!'
    );

    if (matchReact) {
        if (checkUnique(interaction, reactString)) {
            interaction.channel.messages.fetch(matchReact[matchReact.length - 1]).then(async (reactMessage) => {
                reactMacro(reactMessage, reactString);
                interaction.reply('The message "' + reactMessage.content + '" has been reacted to!');
            });
        }
    }
}

/**
 * Checks if the reactString is unique values.
 * @param {Discord.Interaction} interaction The interaction for a reply if not unique
 * @param {String} reactString The string to query if it has unique values.
 * @returns True if the string is unique, false if they aren't.
 */
function checkUnique(interaction, reactString) {
    let hashtable = {};
    for (let i = 0, len = reactString.length; i < len; i++) {
        if (hashtable[reactString[i]] != null) {
            hashtable[reactString[i]] = 1;
            // seen another value of the same
            console.log(reactString + ' has two of the same values within it!');
            interaction.reply({
                content:
                    "Hi, unfortunately '" +
                    reactString +
                    "' has at least two of the same letters, and so cannot be made out of emojis!",
                ephemeral: true,
            });
            return false; // Returns after a duplicate
        } else {
            hashtable[reactString[i]] = 0;
        }
    }
    return true; // Finished with all unique values
}

/**
 * Macro used to speed up reacting to a message with a unique reactString.
 * @param {Discord.Message} message The message to react to.
 * @param {String} reactString The string to react with (has to ben unique).
 */
async function reactMacro(message, reactString) {
    let regionalEmojis = [
        '🇦',
        '🇧',
        '🇨',
        '🇩',
        '🇪',
        '🇫',
        '🇬',
        '🇭',
        '🇮',
        '🇯',
        '🇰',
        '🇱',
        '🇲',
        '🇳',
        '🇴',
        '🇵',
        '🇶',
        '🇷',
        '🇸',
        '🇹',
        '🇺',
        '🇻',
        '🇼',
        '🇽',
        '🇾',
        '🇿',
    ];

    await message.reactions.removeAll();
    for (let i = 0, len = reactString.length; i < len; i++) {
        let value = reactString.toLowerCase().charCodeAt(i) - 97;
        if (value < 0 || value > 26) continue;
        message.react(regionalEmojis[value]);
    }
}

module.exports = {
    name: 'react',
    description: 'Reacts to a message with a unique string.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();
        let id = interaction.options.getString('id');
        let string = interaction.options.getString('string');
        let reaction = interaction.options.getString('reaction');

        switch (sub_command) {
            case 'search':
                react(interaction, string, reaction);
                break;
            case 'id':
                reactId(interaction, id, reaction);
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'search',
            description: 'Searches the last few messages for the string, and marks with the reacts.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'string',
                    description: 'The string to search for.',
                    type: 'STRING',
                    required: true,
                },
                {
                    name: 'reaction',
                    description: 'The string to react with.',
                    type: 'STRING',
                    required: true,
                },
            ],
        },
        {
            name: 'id',
            description: 'Fetches the message with this ID, and marks with the reacts.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'id',
                    description: 'The ID of the message.',
                    type: 'STRING',
                    required: true,
                },
                {
                    name: 'reaction',
                    description: 'The string to react with.',
                    type: 'STRING',
                    required: true,
                },
            ],
        },
    ],
};
