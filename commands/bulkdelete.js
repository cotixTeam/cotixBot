/** Bulk deletes any unpinned messages (up to 100) from the channel the user sent the command.
 * @async
 * @param {Discord.Interaction} interaction The interaction used to identify the user who sent the message.
 * @param {integer} messageCount The number of
 */
async function bulkDelete(interaction, messageCount) {
    console.log(interaction);
    console.info('-\tBulkDelete invoked, checking permissions!');
    let adminRoles = ['668465816894832641', '705760947721076756'];
    let permissionsFound = adminRoles.some((role) => interaction.member.roles.cache.has(role));

    if (permissionsFound) {
        if (messageCount + 1 > 100) messageCount = 100;
        else if (messageCount <= 0) messageCount = 1;

        console.info('\tPermissions are correct, deleting ' + messageCount + ' messages!');

        interaction.channel.messages
            .fetch({
                limit: messageCount,
                before: interaction.id,
            })
            .then((messageArray) => {
                messageArray.forEach((message) => {
                    if (!message.pinned) message.delete();
                });
            });
        interaction.reply({
            content: `Deleted ${messageCount} message${messageCount > 1 ? 's' : ''}!`,
            ephemeral: true,
        });
    } else {
        console.info('\tUser does not have the required permissions!');
        await interaction.user.send(
            'Hi ' + interaction.user.username + ',\nYou do not have the permissions for the bulkDelete command!'
        );
    }
}

module.exports = {
    name: 'bulk_delete',
    description: 'Removes a number of messages < 100.',
    async execute(interaction) {
        bulkDelete(interaction, interaction.options.getInteger('number_to_delete'));
    },
    options: [
        {
            name: 'number_to_delete',
            description: 'Number of questions to delete.',
            type: 'INTEGER',
            required: true,
        },
    ],
};
