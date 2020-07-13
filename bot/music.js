const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const rp = require('request-promise-native');
const ytSearch = require('yt-search');

const metaData = require('../bot.js');
const awsUtils = require('./awsUtils');

var spotifyPlayer = {
    voiceChannel: null,
    connection: null,
    player: null,
    songs: [],
    oldSongs: [],
    volume: 5,
    playing: false,
    repeat: false,
    skipped: false
};

function play() {
    if (spotifyPlayer.songs.length == 0) {
        spotifyPlayer.voiceChannel.leave();
    } else {
        spotifyPlayer.player = spotifyPlayer.connection.play(ytdl(spotifyPlayer.songs[spotifyPlayer.songs.length - 1].id, {
            quality: "highestaudio",
            filter: "audioonly"
        }));

        spotifyPlayer.player.on("finish", () => {
            if (spotifyPlayer.skipped) {
                console.log("Song Skipped, starting next song!");
                spotifyPlayer.skipped = false;
                spotifyPlayer.playing = true;
                play(spotifyPlayer, musicChannel);
            } else {
                console.log("Song finished!");
                spotifyPlayer.oldSongs.push(spotifyPlayer.songs.pop());
                if (!spotifyPlayer.songs[spotifyPlayer.songs.length - 1]) {
                    console.log("-\tEnd of queue!");
                    spotifyPlayer.playing = false;
                    if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
                    spotifyPlayer.voiceChannel = null;
                    spotifyPlayer.connection = null;
                    spotifyPlayer.player = null;
                    spotifyPlayer.oldSongs = [];
                } else {
                    console.log("-\tPlaying next song!")
                    spotifyPlayer.playing = true;
                    play();
                }
            }
            updateList();
        });

        spotifyPlayer.player.on('error', error => console.error(error));
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    }
}

exports.init = async function () {
    let musicChannel = metaData.channels.find((channel) => {
        if (channel.name == "Music") return channel;
    });

    let musicChannelID = musicChannel.id;

    let discordMusicChannel = await new Discord.Channel(metaData.bot, {
        id: musicChannel.id
    }).fetch();

    var qMessage = await new Discord.Message(metaData.bot, {
        id: musicChannel.embedMessage
    }, discordMusicChannel).fetch();

    await qMessage.edit({
        "content": "Player",
        "embed": {
            "title": "Music Player",
            "description": "Showing the Queue...",
            "footer": {
                "text": "The queue is " + spotifyPlayer.songs.length + " songs long!"
            },
            "fields": [{
                "name": "There are no songs in the queue!",
                "value": "Add one by using !qSearch or !qSpotify"
            }]
        }
    });

    await qMessage.reactions.removeAll();
    await qMessage.react('◀️');
    await qMessage.react('⏯️');
    await qMessage.react('🇽');
    await qMessage.react('▶️');
    await qMessage.react('🔉');
    qMessage.react('🔊');

    let backListener = qMessage.createReactionCollector((reaction, user) => reaction.emoji.name == '◀️' && reaction.count == 2, {
        time: 0
    });
    let playPauseListener = qMessage.createReactionCollector((reaction, user) => reaction.emoji.name == '⏯️' && reaction.count == 2, {
        time: 0
    });
    let stopListener = qMessage.createReactionCollector((reaction, user) => reaction.emoji.name == '🇽' && reaction.count == 2, {
        time: 0
    });
    let skipListener = qMessage.createReactionCollector((reaction, user) => reaction.emoji.name == '▶️' && reaction.count == 2, {
        time: 0
    });
    let decrVolListener = qMessage.createReactionCollector((reaction, user) => reaction.emoji.name == '🔉' && reaction.count == 2, {
        time: 0
    });

    let incrVolListener = qMessage.createReactionCollector((reaction, user) => reaction.emoji.name == '🔊' && reaction.count == 2, {
        time: 0
    });

    backListener.on('collect', (reaction) => backPressed());
    playPauseListener.on('collect', (reaction) => pausePlayPressed(reaction, musicChannelID));
    stopListener.on('collect', (reaction) => stopPressed());
    skipListener.on('collect', (reaction) => skipPressed());
    decrVolListener.on('collect', (reaction) => decrVolPressed());
    incrVolListener.on('collect', (reaction) => incrVolPressed());
}

function backPressed() {
    console.log("Music: Previous!");
    let lastSong = spotifyPlayer.oldSongs.pop();
    if (lastSong) {
        console.log("-\tGoing back one song in the queue!");
        spotifyPlayer.songs.push(lastSong);
        spotifyPlayer.skipped = true;
        spotifyPlayer.connection.dispatcher.end();
    } else {
        console.log("-\tNo song in the old queue! Cannot go back!");
    }
}

async function pausePlayPressed(reaction, musicChannelID) {
    console.log("Music: Play/Pause!");

    if (spotifyPlayer.playing && spotifyPlayer.connection && spotifyPlayer.connection.dispatcher) {
        console.log("-\tPausing!");
        spotifyPlayer.player.pause();
        spotifyPlayer.playing = false;

    } else if (!spotifyPlayer.playing) {
        if (spotifyPlayer.player && spotifyPlayer.connection && spotifyPlayer.connection.dispatcher) {
            console.log("-\tResuming!");
            spotifyPlayer.player.resume();
            spotifyPlayer.playing = true;
        } else {
            console.log("-\tJoining the channel of the user and begining playing!");
            let user = metaData.bot.channels.cache
                .get(musicChannelID).guild.members.cache
                .get(reaction.users.cache.last().id);

            let voiceChannel = user.voice.channel;
            if (voiceChannel) {
                let permissions = voiceChannel.permissionsFor(metaData.bot.user);
                if (permissions.has("CONNECT") && permissions.has("SPEAK")) {

                    try {
                        spotifyPlayer.voiceChannel = voiceChannel;
                        spotifyPlayer.connection = await voiceChannel.join();
                        spotifyPlayer.playing = true;
                        play();
                    } catch (err) {
                        spotifyPlayer.playing = false;
                        console.error(err);
                    }
                } else {
                    console.log("-\tUser is not in a channel with permissions for bot! Cannot join!");
                    user.send("I need permissions to be able to join the voice channel!");
                }
            } else {
                console.log("-\tUser is not in a channel with permissions for bot! Cannot join!");
                user.send("You need to be in a voice channel for me to join!");
            }
        }
    } else {
        console.log("Dispacter is dead!");
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

let stopPressed = function () {
    console.log("Music: Stop!");
    spotifyPlayer.songs = [];
    spotifyPlayer.oldSongs = [];
    if (spotifyPlayer &&
        spotifyPlayer.connection) {
        spotifyPlayer.connection.dispatcher.end();
    } else {
        console.log("Dispacter is already dead!");
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

let skipPressed = function () {
    console.log("Music: Skip!");
    if (spotifyPlayer.connection) {
        spotifyPlayer.connection.dispatcher.end();
    } else {
        console.log("Dispacter is dead!");
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

let decrVolPressed = function () {
    console.log("Music: Decrease Volume!");
    if (spotifyPlayer.volume > 0) spotifyPlayer.volume -= 1;
    if (spotifyPlayer.player && spotifyPlayer.connection)
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    else {
        console.log("Dispacter is dead!");
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

let incrVolPressed = function () {
    console.log("Music: Increase Volume!");
    if (spotifyPlayer.volume < 20) spotifyPlayer.volume += 1;
    if (spotifyPlayer.player && spotifyPlayer.connection)
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    else {
        console.log("Dispacter is dead!");
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

async function updateList() {
    console.log("-\tUpdating the music list!");

    let musicChannel = metaData.channels.find((channel) => {
        if (channel.name == "Music") return channel;
    });

    let discordMusicChannel = await new Discord.Channel(metaData.bot, {
        id: musicChannel.id
    }).fetch();

    var qMessage = await new Discord.Message(metaData.bot, {
        id: musicChannel.embedMessage
    }, discordMusicChannel).fetch();

    if (spotifyPlayer.songs.length == 0) {
        qMessage.edit({
            "content": "Player",
            "embed": {
                "title": "Music Player",
                "description": "Showing the Queue...",
                "footer": {
                    "text": "The queue is " + spotifyPlayer.songs.length + " songs long!"
                },
                "fields": [{
                    "name": "There are no songs in the queue!",
                    "value": "Add one by using !qSearch or !qSpotify"
                }]
            }
        });
    } else if (spotifyPlayer.songs.length == 1) {
        qMessage.edit({
            "content": "Player",
            "embed": {
                "title": "Music Player",
                "description": "Showing the Queue...",
                "footer": {
                    "text": "The queue is " + spotifyPlayer.songs.length + " songs long!"
                },
                "fields": [{
                    "name": "Now Playing:",
                    "value": spotifyPlayer.songs[spotifyPlayer.songs.length - 1].title
                }],
                "image": {
                    "url": spotifyPlayer.songs[spotifyPlayer.songs.length - 1].image
                }
            }
        });
    } else {
        let songLists = [];
        let workingString = "";

        for (let song of spotifyPlayer.songs) {
            if (song != spotifyPlayer.songs[spotifyPlayer.songs.length - 1]) {
                if (workingString.length + song.title.length + 5 < 1024) {
                    workingString += "`- " + song.title + "`\n";
                } else {
                    songLists.push({
                        "name": "Up Next:",
                        "value": workingString
                    });
                    workingString = "";
                }
            }
        }

        if (workingString.length > 0) {
            songLists.push({
                "name": "Up Next:",
                "value": workingString
            });
        }

        songLists.push({
            "name": "Now Playing:",
            "value": spotifyPlayer.songs[spotifyPlayer.songs.length - 1].title
        });

        qMessage
            .edit({
                "content": "Player",
                "embed": {
                    "title": "Music Player",
                    "description": "Showing the Queue...",
                    "footer": {
                        "text": "The queue is " + spotifyPlayer.songs.length + " songs long!"
                    },
                    "fields": songLists,
                    "image": {
                        "url": spotifyPlayer.songs[spotifyPlayer.songs.length - 1].image
                    }
                }
            });
    }
}

exports.addByURL = function (messageReceived, args) {
    console.log("-\tAdding the youtube url to queue (if valid) [" + args[0] + "]!");
    if (ytdl.validateURL(args[0])) {
        ytdl.getInfo(args[0], (err, data) => {
            if (!err) {
                console.log("-\t*\tAdding " + data.title + " to the queue! (From url " + data.video_url + ")");
                spotifyPlayer.songs.unshift({
                    id: data.video_id,
                    title: data.title,
                    image: "https://i.ytimg.com/vi/" + data.video_id + "/default.jpg"
                });
                updateList();
            }
        });
    }
    messageReceived.delete();
}

exports.addBySearch = function (messageReceived, argumentString) {
    console.log("-\t*\tSearching for term on youtube (" + argumentString + ")!");

    ytSearch({
        query: argumentString,
        pageStart: 1,
        pageEnd: 1,
        category: "music"
    }, (err, r) => {
        if (!err && r.videos.length > 0) {
            console.log("-\t*\t\tAdding " + r.videos[0].title + " to the queue!");
            spotifyPlayer.songs.unshift({
                id: r.videos[0].videoId,
                title: r.videos[0].title,
                image: "https://i.ytimg.com/vi/" + r.videos[0].videoId + "/default.jpg"
            });
            updateList();
        } else {
            console.log(err);
            console.log(r);
            console.error("Could not find the query song (" + argumentString + ")!");
        }
    });
    messageReceived.delete();
}

exports.qSpotify = function (messageReceived, argumentString) {
    console.log("-\tQueuing spotify closest matching string (" + argumentString + ")!");

    if (metaData.accesses.has(messageReceived.author.id)) {
        console.log("-\tThe user already has a token!");
        getPlaylists(0, messageReceived.author.id, argumentString);
    } else {
        console.log("-\tRequesting the token for the user!");
        messageReceived.author.send("Connect your spotify account!", {
            embed: {
                "title": "Connect your spotify account",
                "description": "[Click here to link your spotify account](" + metaData.auth.root + "/spotifyAuthenticate)",
                "thumbnail": {
                    "url": "https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif"
                },
                "url": metaData.auth.spotifyDiscordConnectUrl
            }
        });
    }
    messageReceived.delete();
}

function addPlaylistToQ(playlistUrl, userId) {
    rp.get(playlistUrl, {
        headers: {
            Authorization: "Bearer " + metaData.accesses.get(userId).spotifyAccess
        }
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let playlistObject = JSON.parse(body);
            for (let track of playlistObject.tracks.items) {

                ytSearch({
                    query: track.track.name + " " + track.track.artists[0].name,
                    pageStart: 1,
                    pageEnd: 1,
                    category: "music"
                }, (err, r) => {
                    if (!err && r.videos[0]) {
                        console.log("-\t*\t\tAdding " + r.videos[0].title + " to the queue! (From query '" + track.track.name + "')");
                        spotifyPlayer.songs.unshift({
                            id: r.videos[0].videoId,
                            title: r.videos[0].title,
                            image: track.track.album.images[1].url
                        });
                    } else {
                        console.log(err);
                        console.error("-\t*\t\tCould not find the query song (" + track.track.name + ")!");
                    }
                    if (playlistObject.tracks.items[playlistObject.tracks.items.length - 1] == track) updateList();
                });
            }
        } else {
            console.log("Accessing the users track failed!");
            console.log(response.statusCode);
            console.error(error);
            console.log(body);
        }
    })
}

function getPlaylists(offset, userId, argumentString) {
    rp.get("https://api.spotify.com/v1/me/playlists?limit=50&offset=" + offset, {
        headers: {
            Authorization: "Bearer " + metaData.accesses.get(userId).spotifyAccess
        }
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let playlistsContent = JSON.parse(body);


            let result = playlistsContent.items.find((playlist) => {
                if (playlist.name.includes(argumentString)) return playlist;
            });

            if (result) {
                console.log("-\tAdding songs of playlist:'" + result.name + "' to queue!");
                addPlaylistToQ(result.href, userId);
            } else {
                getPlaylists(offset + 50, userId, argumentString);
            }
        } else if (response.statusCode == 401) {
            console.log("-\tToken expired, refreshing!");
            refreshToken(userId);
            getPlaylists(offset, userId, argumentString);
        } else {
            console.log(response.statusCode);
            console.error(error);
            console.log(body);
        }
    })
}

function refreshToken(userId) {
    rp.post('https://accounts.spotify.com/api/token', {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: "Basic " + Buffer.from(metaData.auth.spotifyClientId + ":" + metaData.auth.spotifyClientSecret).toString('base64')
        },
        form: {
            grant_type: "refresh_token",
            refresh_token: metaData.accesses.get(userId).spotifyRefresh
        }
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let spotifyAuthContent = JSON.parse(body);

            let updateAccess = metaData.accesses.get(userId);
            updateAccess.spotifyAccess = spotifyAuthContent.access_token;

            console.log(updateAccess);

            metaData.accesses.set(userId, updateAccess);
            awsUtils.save("store.mmrree.co.uk", "config/AccessMaps.json", JSON.stringify(Array.from(metaData.accesses)));

            console.log("-\tUpdated the user token!");
        } else {
            console.log(response.statusCode);
            console.error(error);
            console.log(body);
        }
    });
}


exports.spotifyPlayer = spotifyPlayer;