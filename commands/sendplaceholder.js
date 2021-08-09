/** Sends a placholder message to the channel the command was sent from.
 * @param {Discord.Interaction} interaction The interaction to point to which channel.
 */
function sendPlaceholder(interaction) {
    console.info('-\tSending placeholder!');
    interaction.channel.send('Placeholder Message');
    interaction.reply({ content: 'Sent the placeholder', ephemeral: true });
}
module.exports = {
    name: 'send_placeholder',
    description: 'Sends a placeholder message that can be used for static messages for the bot to edit.',
    async execute(interaction) {
        sendPlaceholder(interaction);
    },
};
