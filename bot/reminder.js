"use strict";

const Discord = require('discord.js');
const FileSystem = require('fs');

class ReminderClass {
    constructor(client, channels) {
        this.bot = client;
        this.channels = channels;

        this.Reminders = null
        try {
            this.Reminders = JSON.parse(FileSystem.readFileSync("./bot/config/Reminders.json"));
        } catch (err) {
            console.error(err);
            this.bot.destroy();
            process.exit();
        }

        let reminderDate = new Date();
        reminderDate.setSeconds(0);
        reminderDate.setMilliseconds(0);

        for (let reminder of this.Reminders) {
            reminderDate.setDate(reminderDate.getDate() + reminder.day - reminderDate.getDay());
            reminderDate.setHours(reminder.hour);
            reminderDate.setMinutes(reminder.minute);
            if (reminderDate.getTime() - (new Date()).getTime() >= 0) // If later today or this week
                setTimeout(this.timeoutReminderFunction, reminderDate.getTime() - (new Date()).getTime(), reminder, reminderDate);
            else // If any time before this time next week, set for next week
                setTimeout(this.timeoutReminderFunction, reminderDate.getTime() - (new Date()).getTime() + 7 * 24 * 60 * 60 * 1000, reminder, reminderDate);
        }
    }

    timeoutReminderFunction(reminder, reminderDate) {
        for (let user of reminder.users) {
            this.bot.users.fetch(user)
                .then((userSend) => {
                    userSend.send("Hi " + userSend.username + ",\n This is your reminder for: '" + reminder.name + "'\n" + reminder.text);
                }).then(() => {
                    setTimeout(this.timeoutReminderFunction.bind(user, reminder, reminderDate), reminderDate.getTime() + 7 * 24 * 60 * 60 * 1000 - (new Date()).getTime()); // Once started once, the reminder will go weekly
                });
        }
    }

    listEvents(messageReceived) {
        let workingStrings = []
        let index = 0;
        for (let reminder of this.Reminders) {
            workingStrings[index++] = reminder.name;
        }

        let sendString = "The list of events are:\n" + workingStrings.join('\n');

        messageReceived.author
            .send(sendString)
            .then(() => {
                messageReceived.delete();
            });
    }

    joinReminder(messageReceived, argumentString) {
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
                    FileSystem.writeFile("./bot/config/this.Reminders.json", JSON.stringify(this.Reminders, null, '\t'), this.catchError);
                    messageReceived.author.send("You have been added to the reminder: " + reminder.name);
                } else {
                    messageReceived.author.send("You are already registerd to the reminder: " + reminder.name);
                }
            }
        }
        messageReceived.delete();
    }

    leaveReminder(messageReceived, argumentString) {
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
                    FileSystem.writeFile("./bot/config/this.Reminders.json", JSON.stringify(this.Reminders, null, '\t'), this.catchError);
                    messageReceived.author.send("You have been removed from the reminder: " + reminder.name);
                } else {
                    messageReceived.author.send("You are not registerd to the reminder: " + reminder.name);
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