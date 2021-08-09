/** Picks a random response from a set of strings for Eight Ball responses.
 * @param {Discord.Interaction} interaction Used to respond to the original interaction.
 * @param {String} question The question that was asked.
 */
function eightBall(interaction, question) {
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
    interaction.reply("You asked '" + question + "'...\n" + responses[randomNumber]);
}

module.exports = {
    name: '8ball',
    description: 'Asks the 8 ball a question.',
    async execute(interaction) {
        eightBall(interaction, interaction.options.getString('question'));
    },
    options: [
        {
            name: 'question',
            description: 'Question to be asked.',
            type: 'STRING',
            required: true,
        },
    ],
};
