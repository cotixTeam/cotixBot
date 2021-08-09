/** Automatically performs a cAmEl CaSe transformation on the string provided and sends it back to the channel attributed to the user.
 * @param {Discord.Interaction} interaction The interaction the command is sent in to identify the user and the channel.
 * @param {String} string The string to be transformed into camel case.
 */
function camel(interaction, string) {
    console.info('-\tResponding with cAmEl FoNt!');
    let camelString = '';
    let camelIndex = 0;

    for (let i = 0; i < string.length; i++) {
        if (string.charAt(i) == ' ') {
            camelString += ' ';
        } else if (camelIndex % 2 == 0) {
            camelIndex++;
            camelString += string.charAt(i).toLowerCase();
        } else {
            camelIndex++;
            camelString += string.charAt(i).toUpperCase();
        }
    }

    interaction.reply('> ' + camelString);
}

module.exports = {
    name: 'reformat',
    description: 'Reformats the text in a certain way.',
    async execute(interaction) {
        let reformatString = interaction.options.getString('string');
        camel(interaction, reformatString);
    },
    options: [
        {
            name: 'camel',
            description: 'Reformats the text in the "cAmEl CaSe" method.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'string',
                    description: 'The string to reformat.',
                    type: 'STRING',
                    required: true,
                },
            ],
        },
    ],
};
