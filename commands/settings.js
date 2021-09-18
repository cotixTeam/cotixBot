const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');

/**
 * @typedef {Object} Reminder
 * @property {String} name
 * @property {String} text
 */

/** Runs the timeout to send users a message for their reminder. Also resets the reminder for the next week.
 * @param {Reminder} reminderEvent The event the timeout has been setup for.
 * @param {Discord.Bot} bot The client used to send the messages from.
 */
function reminderTimeouts(reminderEvent, bot) {
    setTimeout(reminderTimeouts, 7 * 24 * 60 * 60 * 1000, reminderEvent, bot);
    for (let userId of reminderEvent.users) {
        bot.users
            .fetch(userId)
            .then((userSend) => {
                console.info('\tSending message to ' + userSend.username + ' for reminder ' + reminderEvent.name);
                userSend.send(
                    'Hi ' +
                        userSend.username +
                        ",\nThis is your reminder for: '" +
                        reminderEvent.name +
                        "'\n" +
                        reminderEvent.text
                );
            })
            .catch((e) => console.warn(e));
    }
}

/** Initialises the timeouts for all the unique reminders after loading it from the storage.
 */
async function init() {
    if (!this.remindersArray) {
        this.remindersArray = await awsUtils.load('store.mmrree.co.uk', 'config/Reminders.json');
        let reminderDate = new Date();
        let now = new Date();
        reminderDate.setSeconds(0);
        reminderDate.setMilliseconds(0);

        for (let reminder of this.remindersArray) {
            if (reminder.name) {
                reminderDate.setDate(reminderDate.getDate() + reminder.day - reminderDate.getDay());
                reminderDate.setHours(reminder.hour);
                reminderDate.setMinutes(reminder.minute);

                if (reminderDate.getTime() - now.getTime() >= 0)
                    // If later today or this week
                    setTimeout(reminderTimeouts, reminderDate.getTime() - now.getTime(), reminder, metaData.bot);
                // If any time before this time next week, set for next week
                else
                    setTimeout(
                        reminderTimeouts,
                        reminderDate.getTime() - now.getTime() + 7 * 24 * 60 * 60 * 1000,
                        reminder,
                        metaData.bot
                    );
            }
        }
    }
}

/** Sends the user who invoked a message with a list of all the commands for all the channels.
 * @param {Discord.Interaction} interaction The interaction the command was sent from.
 */
async function listEvents(interaction) {
    await init();
    console.info('-\tListing events that can be added to reminder!');
    let message = {
        content: 'The list of events are:',
        embeds: [
            {
                title: 'Events',
                fields: [],
            },
        ],
    };

    for (let reminder of this.remindersArray) {
        if (reminder.name) {
            let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            let minute = reminder.minute;

            if (reminder.minute < 10) minute = '0' + reminder.minute;
            else minute = reminder.minute.toString();

            message.embeds[0].fields.push({
                name: reminder.name,
                value: days[reminder.day - 1] + ' at ' + reminder.hour + ':' + minute,
                inline: true,
            });
        }
    }

    interaction.reply({
        ...message,
        ephemeral: true,
    });
}

/** Function used to add the user to messaging list for the reminder.
 * @param {Discord.Interaction} interaction The interaction the command was sent from.
 * @param {String} reminderString The string to be queried matching the reminder name.
 */
async function joinReminder(interaction, reminderString) {
    await init();
    console.info('-\tJoining notification list for event!');
    for (let reminder of this.remindersArray) {
        if (reminder.name.toLowerCase().includes(reminderString.toLowerCase())) {
            if (!reminder.users.some((user) => user == interaction.user.id)) {
                this.remindersArray[this.remindersArray.indexOf(reminder)].users.push(interaction.user.id);
                awsUtils.save(
                    'store.mmrree.co.uk',
                    'config/Reminders.json',
                    JSON.stringify(this.remindersArray, null, '\t')
                );
                interaction.reply({
                    content: 'You have been added to the reminder: ' + reminder.name,
                    ephemeral: true,
                });
            } else {
                interaction.reply({
                    content: 'You are already registerd to the reminder: ' + reminder.name,
                    ephemeral: true,
                });
            }
        }
    }
    interaction.reply({
        content: 'There is no event: ' + reminderString,
        ephemeral: true,
    });
}

/** Function used to remove the user to messaging list for the reminder.
 * @param {Discord.Interaction} interaction The interaction the command was sent from.
 * @param {String} reminderString The string to be queried matching the reminder name.
 */
async function leaveReminder(interaction, reminderString) {
    await init();
    console.info('-\tLeaving notification list for event!');
    for (let reminder of this.remindersArray) {
        if (reminder.name.toLowerCase().includes(reminderString.toLowerCase())) {
            if (reminder.users.some((user) => user == interaction.user.id)) {
                this.remindersArray[this.remindersArray.indexOf(reminder)].users.splice(
                    reminder.users.indexOf(interaction.user.id),
                    1
                );
                awsUtils.save(
                    'store.mmrree.co.uk',
                    'config/Reminders.json',
                    JSON.stringify(this.remindersArray, null, '\t')
                );
                interaction.reply({
                    content: 'You have been removed from the reminder: ' + reminder.name,
                    ephemeral: true,
                });
            } else {
                interaction.reply({
                    content: 'You are not registerd to the reminder: ' + reminder.name,
                    ephemeral: true,
                });
            }
        }
    }
    interaction.reply({
        content: 'There is no event: ' + reminderString,
        ephemeral: true,
    });
}

/** @todo Add a method to be able to create a new reminder / delete a reminder etc. */

module.exports = {
    name: 'settings',
    description: 'A commands suite for the settings for your account.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();
        let reminder = interaction.options.getString('name');

        switch (sub_command) {
            case 'join':
                joinReminder(interaction, reminder);
                break;
            case 'leave':
                leaveReminder(interaction, reminder);
                break;
            case 'list':
                listEvents(interaction);
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'reminder',
            description: 'Used to manage your reminders.',
            type: 'SUB_COMMAND_GROUP',
            options: [
                {
                    name: 'join',
                    description: 'Join a reminder.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'name',
                            description: 'The name of the reminder.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'leave',
                    description: 'Leave a reminder.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'name',
                            description: 'The name of the reminder.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'list',
                    description: 'List the reminders that exist.',
                    type: 'SUB_COMMAND',
                },
            ],
        },
    ],
};
