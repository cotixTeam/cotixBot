/** Changes the users roles to have a moderator role, or a pseudo moderator role to view the server as a user without admin permissions (without risking them being removed from an admin role).
 * @param {Discord.Interaction} interaction The interaction this command was sent on, used to identify the sender.
 */
function toggleModerator(interaction) {
    console.info('-\tToggle user to normal view for ' + interaction.user.username + '!');
    let pseudoModRole;
    let modRole;
    if (process.env.DISCORD_BOT_TOKEN) {
        pseudoModRole = '730775933581263028';
        modRole = '668465816894832641';
    } else {
        pseudoModRole = '729306365562191912';
        modRole = '730778077386506250';
    }

    if (!interaction.member.roles.cache.has(modRole) && interaction.member.roles.cache.has(pseudoModRole)) {
        interaction.member.roles.add
            ? interaction.member.roles.add(modRole)
            : interaction.member.roles.cache.set(modRole);
    } else if (interaction.member.roles.cache.has(modRole) && interaction.member.roles.cache.has(pseudoModRole)) {
        interaction.member.roles.remove
            ? interaction.member.roles.remove(modRole)
            : interaction.member.roles.cache.delete(modRole);
    } else if (interaction.member.roles.cache.has(modRole) && !interaction.member.roles.cache.has(pseudoModRole)) {
        interaction.member.roles.remove
            ? interaction.member.roles.remove(modRole)
            : interaction.member.roles.cache.delete(modRole);
        interaction.member.roles.add
            ? interaction.member.roles.add(pseudoModRole)
            : interaction.member.roles.cache.set(pseudoModRole);
    }
    interaction.reply({
        content: 'You have toggled your moderator role!',
        ephemeral: true,
    });
}

module.exports = {
    name: 'toggle_moderator',
    description: 'Toggle your role between psuedo moderator and real moderator to view the server.',
    async execute(interaction) {
        toggleModerator(interaction);
    },
};
