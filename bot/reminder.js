"use strict";

const awsUtils = require('./awsUtils');

function reminderTimeouts(reminderEvent, bot) {
    for (let userId of reminderEvent.users) {
        setTimeout(reminderTimeouts, 7 * 24 * 60 * 60 * 1000, reminderEvent, bot);
        bot.users
            .fetch(userId)
            .then((userSend) => {
                console.log("\tSending message to " + userSend.username + " for reminder " + reminderEvent.name);
                userSend
                    .send("Hi " + userSend.username + ",\nThis is your reminder for: '" + reminderEvent.name + "'\n" + reminderEvent.text);
            });
    }
}

exports.init = async function (bot) {
    let data = await awsUtils.load("store.mmrree.co.uk", "config/Reminders.json");
    this.remindersArray = JSON.parse(data.Body.toString());
    let reminderDate = new Date();
    let now = new Date();
    reminderDate.setSeconds(0);
    reminderDate.setMilliseconds(0);

    for (let reminder of this.remindersArray) {
        if (reminder.name) {
            reminderDate.setDate(reminderDate.getDate() + reminder.day - reminderDate.getDay());
            reminderDate.setHours(reminder.hour);
            reminderDate.setMinutes(reminder.minute);

            if (reminderDate.getTime() - now.getTime() >= 0) // If later today or this week
                setTimeout(reminderTimeouts, reminderDate.getTime() - now.getTime(), reminder, bot);
            else // If any time before this time next week, set for next week
                setTimeout(reminderTimeouts, reminderDate.getTime() - now.getTime() + 7 * 24 * 60 * 60 * 1000, reminder, bot);
        }
    }
}

// TODO: change this to send using an embed instead
exports.listEvents = function (messageReceived) {
    console.log("-\tListing events that can be added to reminder!");
    let workingStrings = []
    let index = 0;
    console.log(this);
    for (let reminder of this.remindersArray) {
        if (reminder.name)
            workingStrings[index++] = reminder.name;
    }

    let sendString = "The list of events are:\n" + workingStrings.join('\n');

    messageReceived.author.send(sendString);
    messageReceived.delete();
}

exports.joinReminder = function (messageReceived, argumentString) {
    console.log("-\tJoining notification list for event!");
    for (let reminder of this.remindersArray) {
        if (reminder.name == argumentString) {
            if (reminder.users.some((user) => user == messageReceived.author.id)) {
                this.remindersArray[this.remindersArray.indexOf(reminder)].users.push(messageReceived.author.id)
                awsUtils.save("store.mmrree.co.uk", "config/Reminders.json", JSON.stringify(reminderObj, null, '\t'));
                messageReceived.author.send("You have been added to the reminder: " + reminder.name);
            } else {
                messageReceived.author.send("You are already registerd to the reminder: " + reminder.name);
            }
        }
    }
    messageReceived.delete();
}

exports.leaveReminder = function (messageReceived, argumentString) {
    console.log("-\tLeaving notification list for event!");
    for (let reminder of this.remindersArray) {
        if (reminder.name == argumentString) {
            if (reminder.users.some((user, index) => {
                    console.log(user, index);
                })) {
                this.remindersArray[this.remindersArray.indexOf(reminder)].users.splice(userIndex, 1);
                awsUtils.save("store.mmrree.co.uk", "config/Reminders.json", JSON.stringify(this.remindersArray, null, '\t'));
                messageReceived.author.send("You have been removed from the reminder: " + reminder.name);
            } else {
                messageReceived.author.send("You are not registerd to the reminder: " + reminder.name);
            }
        }
    }
    messageReceived.delete();
}