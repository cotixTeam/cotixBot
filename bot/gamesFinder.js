const rp = require('request-promise-native');

const metaData = require('../bot.js');

const steamKey = "2C16D2888B4E4709FCDAB4D8A33B92EE";
var me = "76561198037408655";
var friendsUsernames = ['Gavin8a2can', 'MisterE', 'thialfi'];
var cache = new Map();

// This all works as intended, but steam api randomly does not provide the results for games libraries.
// This means a work around has to be made so that when the results are missing, a cached version is used, and then that can be compared
// This should not be too difficult to do, but when an empty result is found, and a cache cannot replace it, the command should abort,
// Notifying the users that steam api is being a bitch, otherwise continue by using the cached / updated lists
// The cache will not be backed up anything (such as s3) so will be lost between restarts, but this does not seem like that big of an issue


async function fillFriendsIDList(refSteamID, friendsUsernames) {
    let foundFriends = [];

    let friends = await rp.get("http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=" + steamKey +
        "&relationship=friend" +
        "&steamid=" + refSteamID).then((res) => {
        let jsonRes = JSON.parse(res);
        return jsonRes.friendslist.friends;
    });

    friends = friends.map((friend) => {
        return friend.steamid
    });

    let steamFriends = await rp.get("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + steamKey +
        "&steamids=" + friends.join(",")).then((res) => {
        let jsonRes = JSON.parse(res);
        return jsonRes.response.players
    });

    for (let unknownFriend of steamFriends) {
        for (let knownFriendName of friendsUsernames) {
            if (unknownFriend.personaname == knownFriendName) {
                foundFriends.push(unknownFriend.steamid);
            }
        }
    }
    return foundFriends;
};

async function getGameList(refID, idList) {
    idList.push(refID);
    let gameList = [];

    for (let id of idList) {
        let gList = await rp.get("http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=" + steamKey +
            "&include_appinfo=1" +
            "&include_played_free_games=1" +
            "&steamid=" + id +
            "&format=json").then((res) => {
            let jsonRes = JSON.parse(res);
            if (jsonRes.response.games != null) {
                cache.set(id, jsonRes.response.games);
                return jsonRes.response.games;
            } else if (cache.has(id)) {
                return cache.get(id);
            } else return false;
        })
        gameList.push(gList);
    }
    return gameList;
}

function getMatching(gameListOne, gameListTwo) {
    let matchingGames = [];
    for (let game of gameListOne) {
        if (gameListTwo.some((game2) => game2.name == game.name)) {
            matchingGames.push(game);
        }
    }
    return matchingGames;
}

function chooseGame(gameList) {
    if (gameList != null && gameList.length != 0) {
        let randomGame = Math.round(Math.random() * gameList.length);
        return gameList[randomGame]["name"];
    } else return null;
}

async function getRandomGame() {



    var friendsIDs = await fillFriendsIDList(me, friendsUsernames);

    var gameLists = await getGameList(me, friendsIDs, (val) => {
        return val
    });
    gameLists = gameLists.filter((list) => list != null).sort((a, b) => a.length - b.length);

    if (gameLists.some((game) => game == false)) {
        return [false, false];
    }

    let combinedResults = gameLists[0];
    gameLists = gameLists.splice(1);

    for (let remainder of gameLists) {
        combinedResults = getMatching(combinedResults, remainder);
    }

    let chosenGame = chooseGame(combinedResults);
    return [chosenGame, combinedResults];
}

exports.findGames = function (messageReceived) {
    messageReceived.channel.send("Finding your common games...\nThis might take a while!").then(async (message) => {
        let results = await getRandomGame();

        if (results = [false, false]) {
            message.edit("Steam is being weird and you don't have enough cached lists! Re-try in a short time and see if it works then!");
        }

        let chosenGame = results[0];
        let list = results[1];

        let fields = [];
        if (list != null && chosenGame != null) {
            for (let game of list) {
                fields.push({
                    name: game.name,
                    value: "... or ...",
                    inline: true
                })
            }
            message.edit({
                "content": chosenGame,
                "embed": {
                    "title": "The game chosen was :    " + chosenGame,
                    "description": "or you could have played...",
                    "fields": fields
                }
            })
        } else {
            message.edit("You have no games in common, sorry!");
        }

    });
    messageReceived.delete();
}