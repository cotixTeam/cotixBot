"use strict";

const Discord = require('discord.js');
const FileSystem = require('fs');

class ReminderClass {
    constructor(client, channels) {
        this.bot = client;
        this.channels = channels;
    }

    listEvents(messageReceived, Reminders) {
        let workingStrings = []
        let index = 0;
        for (let reminder of Reminders) {
            workingStrings[index++] = reminder.name;
        }

        let sendString = "The list of events are:\n" + workingStrings.join('\n');

        messageReceived.author
            .send(sendString)
            .then(() => {
                messageReceived.delete();
            });
    }

    joinReminder(messageReceived, argumentString, Reminders) {
        for (let reminder of Reminders) {
            if (reminder.name == argumentString) {
                // Add the thing to the file
                let addFlag = true;
                for (let user of reminder.users) {
                    if (user == messageReceived.author.id)
                        addFlag = false;
                }

                if (addFlag) {
                    Reminders[Reminders.indexOf(reminder)].users.push(messageReceived.author.id)
                    FileSystem.writeFile("./bot/config/Reminders.json", JSON.stringify(Reminders, null, '\t'), this.catchError);
                    messageReceived.author.send("You have been added to the reminder: " + reminder.name);
                } else {
                    messageReceived.author.send("You are already registerd to the reminder: " + reminder.name);
                }
            }
        }
        messageReceived.delete();
    }

    leaveReminder(messageReceived, argumentString, Reminders) {
        for (let reminder of Reminders) {
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
                    Reminders[Reminders.indexOf(reminder)].users.splice(userIndex, 1);
                    FileSystem.writeFile("./bot/config/Reminders.json", JSON.stringify(Reminders, null, '\t'), this.catchError);
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