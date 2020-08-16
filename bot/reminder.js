const metaData = require('../bot.js');
const awsUtils = require('./awsUtils');

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
        bot.users.fetch(userId).then((userSend) => {
            console.info('\tSending message to ' + userSend.username + ' for reminder ' + reminderEvent.name);
            userSend.send(
                'Hi ' +
                    userSend.username +
                    ",\nThis is your reminder for: '" +
                    reminderEvent.name +
                    "'\n" +
                    reminderEvent.text
            );
        });
    }
}

/** Initialises the timeouts for all the unique reminders after loading it from the storage.
 */
exports.init = async function init() {
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
};

/** Sends the user who invoked a message with a list of all the commands for all the channels.
 * @param {Discord.Message} messageReceived The message the command was sent from.
 */
exports.listEvents = function listEvents(messageReceived) {
    console.info('-\tListing events that can be added to reminder!');
    let message = {
        content: 'The list of events are:',
        embed: {
            title: 'Events',
            fields: [],
        },
    };

    for (let reminder of this.remindersArray) {
        if (reminder.name) {
            let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            let minute = reminder.minute;

            if (reminder.minute < 10) minute = '0' + reminder.minute;
            else minute = reminder.minute.toString();

            message.embed.fields.push({
                name: reminder.name,
                value: days[reminder.day - 1] + ' at ' + reminder.hour + ':' + minute,
                inline: true,
            });
        }
    }

    messageReceived.author.send(message);
    messageReceived.delete();
};

/** Function used to add the user to messaging list for the reminder.
 * @param {Discord.Message} messageReceived The message the command was sent from.
 * @param {Strring} argumentString The string to be queried matching the reminder name.
 */
exports.joinReminder = function joinReminder(messageReceived, argumentString) {
    console.info('-\tJoining notification list for event!');
    for (let reminder of this.remindersArray) {
        if (reminder.name == argumentString) {
            if (!reminder.users.some((user) => user == messageReceived.author.id)) {
                this.remindersArray[this.remindersArray.indexOf(reminder)].users.push(messageReceived.author.id);
                awsUtils.save('store.mmrree.co.uk', 'config/Reminders.json', JSON.stringify(reminderObj, null, '\t'));
                messageReceived.author.send('You have been added to the reminder: ' + reminder.name);
            } else {
                messageReceived.author.send('You are already registerd to the reminder: ' + reminder.name);
            }
        }
    }
    messageReceived.delete();
};

/** Function used to remove the user to messaging list for the reminder.
 * @param {Discord.Message} messageReceived The message the command was sent from.
 * @param {Strring} argumentString The string to be queried matching the reminder name.
 */
exports.leaveReminder = function leaveReminder(messageReceived, argumentString) {
    console.info('-\tLeaving notification list for event!');
    for (let reminder of this.remindersArray) {
        if (reminder.name == argumentString) {
            if (reminder.users.some((user) => user == messageReceived.author.id)) {
                this.remindersArray[this.remindersArray.indexOf(reminder)].users.splice(userIndex, 1);
                awsUtils.save(
                    'store.mmrree.co.uk',
                    'config/Reminders.json',
                    JSON.stringify(this.remindersArray, null, '\t')
                );
                messageReceived.author.send('You have been removed from the reminder: ' + reminder.name);
            } else {
                messageReceived.author.send('You are not registerd to the reminder: ' + reminder.name);
            }
        }
    }
    messageReceived.delete();
};

/** @todo Add a method to be able to create a new reminder / delete a reminder etc. */
