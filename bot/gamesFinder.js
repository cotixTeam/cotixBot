const rp = require('request-promise-native');

const metaData = require('../bot.js');

var cache = new Map();

// This all works as intended, but steam api randomly does not provide the results for games libraries.
// This means a work around has to be made so that when the results are missing, a cached version is used, and then that can be compared
// This should not be too difficult to do, but when an empty result is found, and a cache cannot replace it, the command should abort,
// Notifying the users that steam api is being a bitch, otherwise continue by using the cached / updated lists
// The cache will not be backed up anything (such as s3) so will be lost between restarts, but this does not seem like that big of an issue

async function getGameList(idList) {
    let gameList = [];

    for (let id of idList) {
        let gList = await rp.get("http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=" + metaData.auth.steamKey +
            "&include_appinfo=1" +
            "&include_played_free_games=1" +
            "&steamid=" + id +
            "&format=json").then(async (res) => {
            let jsonRes = JSON.parse(res);
            if (jsonRes.response.games != null) {
                cache.set(id, jsonRes.response.games);
                return jsonRes.response.games;
            } else if (cache.has(id)) {
                return cache.get(id);
            } else {
                return await rp.get("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + metaData.auth.steamKey +
                    "&steamids=" + id).then((res) => {
                    let jsonRes = JSON.parse(res);
                    return jsonRes.response.players[0].personaname
                });
            }
        });

        gameList.push(gList);
    }
    return gameList;
}

function getMatching(gameListOne, gameListTwo) {
    if (gameListOne != null) {
        let matchingGames = [];
        for (let game1 of gameListOne) {
            if (gameListTwo.some((game2) => game2.name == game1.name)) {
                matchingGames.push(game1);
            }
        }
        return matchingGames;
    } else {
        return gameListTwo;
    }
}

function chooseGame(gameList) {
    if (gameList != null && gameList.length != 0) {
        let randomGame = Math.round(Math.random() * gameList.length);
        let chosen = gameList[randomGame];
        gameList = gameList.filter((game) => {
            return chosen != game
        })
        return chosen["name"];
    } else return null;
}

async function getRandomGame(messageReceived, args) {
    let userArgs = args.map((arg) => /<@[!]*([0-9]+)>/g.exec(arg)[1]).filter((arg) => arg != null);

    if (userArgs.every(user => metaData.accesses.get(user) && metaData.accesses.get(user)["steamId"])) {
        var friendsIDs = userArgs.map((user) => metaData.accesses.get(user)["steamId"]);

        var gameLists = await getGameList(friendsIDs, (val) => {
            return val
        });

        gameLists = gameLists.filter((list) => list != null).sort((a, b) => a.length - b.length);

        if (gameLists.some((list) => typeof list != "object")) {
            let users = gameLists.filter((list) => typeof list == "string");
            setTimeout((string) => messageReceived.channel.send(string), 60 * 1000, "Steam is being weird and you don't have enough cached lists!\nA comparrison between the users who were returned are above!\nThe users who missed out is/are: " + users.join(", ") + "\nRe-try in a short time and see if it works then!");
        }

        gameLists = gameLists.filter((list) => typeof list == "object");

        let combinedResults = null;

        gameLists.forEach((list, index) => {
            combinedResults = getMatching(combinedResults, list);
        });

        combinedResults = combinedResults.sort((gamea, gameb) => {
            if (gamea.name > gameb.name) return 1;
            else if (gamea.name < gameb.name) return -1;
            else return 0;
        });

        let chosenGame = chooseGame(combinedResults);
        return new Array(chosenGame, combinedResults);
    } else {
        userArgs = userArgs.filter((user) => !(metaData.accesses.get(user) && metaData.accesses.get(user)["steamId"]));
        messageReceived.channel.send("<@!" + userArgs.join(">, <@!") + "> is / are missing linked steam accounts, head to: " + metaData.auth.root + "/steamAuthenticate to fix that!");
        return [false, false];
    }
}

exports.findGames = function (messageReceived, args) {
    messageReceived.channel.send("Finding your common games...\nThis might take a while!").then(async (message) => {
        let results = await getRandomGame(messageReceived, args);

        if (results[0] != false && results[1] != false) {
            let chosenGame = results[0];
            let list = results[1];

            let fields = [];
            if (list != null && list.length > 0 && chosenGame != null) {
                for (let game of list) {
                    fields.push({
                        name: game.name,
                        value: "... or ...",
                        inline: true
                    });
                }

                let first = true;

                while (fields.length != 0) {
                    let currentFields = fields.slice(0, 25);
                    if (first) {
                        first = false;
                        await message.edit({
                            "content": chosenGame,
                            "embed": {
                                "title": "The game chosen was :    " + chosenGame,
                                "description": "or you could have played...",
                                "fields": currentFields
                            }
                        });
                    } else {
                        await messageReceived.channel.send({
                            "content": chosenGame,
                            "embed": {
                                "title": "The game chosen was :    " + chosenGame,
                                "description": "or you could have played...",
                                "fields": currentFields
                            }
                        });
                    }
                    fields = fields.splice(25);
                    console.log(fields);
                }
            } else {
                message.edit("Based on analysis, you have no games in common on steam, sorry!");
            }
        } else {
            message.delete();
        }
    });
    if (messageReceived.content) messageReceived.delete();
}