"use strict";

class GeneralClass {
    constructor(client) {
        this.bot = client;
    }

    notImplementedCommand(messageReceived, cmd) {
        messageReceived.author
            .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
            .then((sentMessage) => {
                messageReceived
                    .reply("is an idiot, he wrote the command: " + messageReceived.content)
                    .then(() => {
                        messageReceived.delete();
                    });
            });
    }
}

module.exports = {
    GeneralClass: GeneralClass
};