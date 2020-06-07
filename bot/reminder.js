"use strict";

const FileSystem = require('fs');

function timeoutReminderFunction(reminderEvent, bot) {
    for (let userId of reminderEvent.users) {
        bot.users
            .fetch(userId)
            .then((userSend) => {
                console.log("\tSending message to " + userSend.username + " for reminder " + reminderEvent.name);
                userSend
                    .send("Hi " + userSend.username + ",\nThis is your reminder for: '" + reminderEvent.name + "'\n" + reminderEvent.text)
                    .then(() => {
                        setTimeout(timeoutReminderFunction, 7 * 24 * 60 * 60 * 1000, reminderEvent, this.bot);
                    });
            }).catch(err => console.error(err));
    }
}
class ReminderClass {
    constructor(client, channels) {
        this.bot = client;
        this.channels = channels;
        try {
            this.Reminders = JSON.parse(FileSystem.readFileSync("./bot/config/Reminders.json"))
        } catch (err) {
            console.error(err);
            this.bot.destroy();
            process.exit();
        };

        let reminderDate = new Date();
        let now = new Date();
        reminderDate.setSeconds(0);
        reminderDate.setMilliseconds(0);

        for (let reminder of this.Reminders) {
            if (reminder.name) {
                reminderDate.setDate(reminderDate.getDate() + reminder.day - reminderDate.getDay());
                reminderDate.setHours(reminder.hour);
                reminderDate.setMinutes(reminder.minute);

                if (reminderDate.getTime() - now.getTime() >= 0) // If later today or this week
                    setTimeout(timeoutReminderFunction, reminderDate.getTime() - now.getTime(), reminder, this.bot);
                else // If any time before this time next week, set for next week
                    setTimeout(timeoutReminderFunction, reminderDate.getTime() - now.getTime() + 7 * 24 * 60 * 60 * 1000, reminder, this.bot);
            }
        }
    }

    listEvents(messageReceived) {
        console.log("-\tListing events that can be added to reminder!");
        let workingStrings = []
        let index = 0;
        for (let reminder of this.Reminders) {
            if (reminder.name)
                workingStrings[index++] = reminder.name;
        }

        let sendString = "The list of events are:\n" + workingStrings.join('\n');

        messageReceived.author
            .send(sendString)
            .then(() => {
                messageReceived.delete();
            }).catch(err => console.error(err));
    }

    joinReminder(messageReceived, argumentString) {
        console.log("-\tJoining notification list for event!");
        for (let reminder of this.Reminders) {
            if (reminder.name == argumentString) {
                // Add the thing to the file
                let addFlag = true;
                for (let user of reminder.users) {
                    if (user == messageReceived.author.id)
                        addFlag = false;
                }

                if (addFlag) {
                    this.Reminders[this.Reminders.indexOf(reminder)].users.push(messageReceived.author.id)
                    FileSystem.writeFile("./bot/config/Reminders.json", JSON.stringify(this.Reminders, null, '\t'), this.catchError);
                    messageReceived.author
                        .send("You have been added to the reminder: " + reminder.name)
                        .catch(err => console.error(err));
                } else {
                    messageReceived.author
                        .send("You are already registerd to the reminder: " + reminder.name)
                        .catch(err => console.error(err));
                }
            }
        }
        messageReceived.delete();
    }

    leaveReminder(messageReceived, argumentString) {
        console.log("-\tLeaving notification list for event!");
        for (let reminder of this.Reminders) {
            if (reminder.name == argumentString) {
                // Remove the thing fromm the file
                let userExists = false;
                let userIndex = null;
                for (let user of reminder.users) {
                    if (user == messageReceived.author.id) {
                        userIndex = reminder.users.indexOf(user);
                        userExists = true;
                    }
                }

                if (userExists) {
                    this.Reminders[this.Reminders.indexOf(reminder)].users.splice(userIndex, 1);
                    FileSystem.writeFile("./bot/config/Reminders.json", JSON.stringify(this.Reminders, null, '\t'), this.catchError);
                    messageReceived.author.
                    send("You have been removed from the reminder: " + reminder.name)
                        .catch(err => console.error(err));
                } else {
                    messageReceived.author
                        .send("You are not registerd to the reminder: " + reminder.name)
                        .catch(err => console.error(err));
                }
            }
        }
        messageReceived.delete();
    }

    catchError(err) {
        if (err) console.error(err);
    }

}

module.exports = {
    ReminderClass: ReminderClass
};