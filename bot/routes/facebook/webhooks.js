exports.get = function (req, res, auth, self) {
    console.log("/facebook/webhooks get accessed!");

    if (req.query['hub.verify_token'] == "cotixBotOk") {
        res.status(200).send(req.query['hub.challenge']);
    }
}

exports.post = async function (req, res, auth, self) {
    const Discord = require('discord.js');

    console.log("/facebook/webhooks post accessed!");

    var channel = await new Discord.Channel(self.bot, {
        id: self.crushamptonChannel.id
    }).fetch();

    for (let entry of req.body.entry) {
        for (let change of entry.changes) {
            console.log(change);
            channel.send("> " + change.value.message + "\n- " + change.value.from.name);
        }
    }

    res.status(200).send("");
}