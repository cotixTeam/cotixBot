"use strict";

const Discord = require('discord.js');
const Express = require('express');
const http = require('http');
const ytdl = require('ytdl-core');
const Path = require('path');
const rp = require('request-promise-native');
const ytSearch = require('yt-search');
const awsUtils = require('./awsUtils');

function play(spotifyPlayer, bot, musicChannel, musicClass) {
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
                play(spotifyPlayer, bot, musicChannel, musicClass);
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
                    play(spotifyPlayer, bot, musicChannel, musicClass);
                }
            }
            updateList(spotifyPlayer, bot, musicChannel);
        });

        spotifyPlayer.player.on('error', error => console.error(error));
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    }
}

exports.spotifyPlayer = {
    voiceChannel: null,
    connection: null,
    player: null,
    songs: [],
    oldSongs: [],
    volume: 5,
    playing: false,
    repeat: false,
    skipped: false,
    accesses: new Map()
};


// TODO: move all the callbacks to their own individual functions so that this init looks cleaner (scope rearrange)
exports.init = async function (bot, auth, Channels) {
    initWebhooks(auth, this);

    let data = await awsUtils.load("store.mmrree.co.uk", "config/AccessMaps.json");
    this.spotifyPlayer.accesses = new Map(JSON.parse(data.Body.toString()));

    this.bot = bot;
    this.auth = auth;

    this.generalChannel = Channels.find((channel) => {
        if (channel.name == "General") return channel;
    });

    this.musicChannel = Channels.find((channel) => {
        if (channel.name == "Music") return channel;
    });

    var self = this;

    let Channel = await new Discord.Channel(bot, {
        id: this.musicChannel.id
    }).fetch();

    var qMessage = await new Discord.Message(bot, {
        id: this.musicChannel.embedMessage
    }, Channel).fetch();

    await qMessage.edit({
        "content": "Player",
        "embed": {
            "title": "Music Player",
            "description": "Showing the Queue...",
            "footer": {
                "text": "The queue is " + this.spotifyPlayer.songs.length + " songs long!"
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

    let backFilter = (reaction, user) => reaction.emoji.name == '◀️' && reaction.count == 2;

    let backListener = qMessage.createReactionCollector(backFilter, {
        time: 0
    });
    let playPauseFilter = (reaction, user) => reaction.emoji.name == '⏯️' && reaction.count == 2;
    let playPauseListener = qMessage.createReactionCollector(playPauseFilter, {
        time: 0
    });
    let stopFilter = (reaction, user) => reaction.emoji.name == '🇽' && reaction.count == 2;
    let stopListener = qMessage.createReactionCollector(stopFilter, {
        time: 0
    });
    let skipFilter = (reaction, user) => reaction.emoji.name == '▶️' && reaction.count == 2;
    let skipListener = qMessage.createReactionCollector(skipFilter, {
        time: 0
    });
    let decrVolFilter = (reaction, user) => reaction.emoji.name == '🔉' && reaction.count == 2;
    let decrVolListener = qMessage.createReactionCollector(decrVolFilter, {
        time: 0
    });
    let incrVolFilter = (reaction, user) => reaction.emoji.name == '🔊' && reaction.count == 2;
    let incrVolListener = qMessage.createReactionCollector(incrVolFilter, {
        time: 0
    });

    backListener.on('collect', reaction => {
        console.log("Music: Previous!");
        let lastSong = self.spotifyPlayer.oldSongs.pop();
        if (lastSong) {
            console.log("-\tGoing back one song in the queue!");
            self.spotifyPlayer.songs.push(lastSong);
            self.spotifyPlayer.skipped = true;
            self.spotifyPlayer.connection.dispatcher.end();
        } else {
            console.log("-\tNo song in the old queue! Cannot go back!");
        }
    });

    playPauseListener.on('collect', async reaction => {
        console.log("Music: Play/Pause!");

        if (self.spotifyPlayer.playing && self.spotifyPlayer.connection && self.spotiftyData.connection.dispatcher) {
            console.log("-\tPausing!");
            self.spotifyPlayer.player.pause();
            self.spotifyPlayer.playing = false;

        } else if (!self.spotifyPlayer.playing) {
            if (self.spotifyPlayer.player && self.spotifyPlayer.connection && self.spotiftyData.connection.dispatcher) {
                console.log("-\tResuming!");
                self.spotifyPlayer.player.resume();
                self.spotifyPlayer.playing = true;
            } else {
                console.log("-\tJoining the channel of the user and begining playing!");
                let user = self.bot.channels.cache
                    .get(self.generalChannel.id).guild.members.cache
                    .get(reaction.users.cache.last().id);

                let voiceChannel = user.voice.channel;
                if (voiceChannel) {
                    let permissions = voiceChannel.permissionsFor(self.bot.user);
                    if (permissions.has("CONNECT") && permissions.has("SPEAK")) {

                        try {
                            self.spotifyPlayer.voiceChannel = voiceChannel;
                            self.spotifyPlayer.connection = await voiceChannel.join();
                            self.spotifyPlayer.playing = true;
                            play(self.spotifyPlayer, self.bot, self.musicChannel, self);
                        } catch (err) {
                            self.spotifyPlayer.playing = false;
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
            self.spotifyPlayer.playing = false;
            if (self.spotifyPlayer.voiceChannel) self.spotifyPlayer.voiceChannel.leave();
            self.spotifyPlayer.voiceChannel = null;
            self.spotifyPlayer.connection = null;
            self.spotifyPlayer.player = null;
        }
    });

    stopListener.on('collect', reaction => {
        console.log("Music: Stop!");
        self.spotifyPlayer.songs = [];
        self.spotifyPlayer.oldSongs = [];
        if (self.spotifyPlayer &&
            self.spotifyPlayer.connection) {
            self.spotifyPlayer.connection.dispatcher.end();
        } else {
            console.log("Dispacter is already dead!");
            self.spotifyPlayer.playing = false;
            if (self.spotifyPlayer.voiceChannel) self.spotifyPlayer.voiceChannel.leave();
            self.spotifyPlayer.voiceChannel = null;
            self.spotifyPlayer.connection = null;
            self.spotifyPlayer.player = null;
        }
    });

    skipListener.on('collect', reaction => {
        console.log("Music: Skip!");
        if (self.spotifyPlayer.connection) {
            self.spotifyPlayer.connection.dispatcher.end();
        } else {
            console.log("Dispacter is dead!");
            self.spotifyPlayer.playing = false;
            if (self.spotifyPlayer.voiceChannel) self.spotifyPlayer.voiceChannel.leave();
            self.spotifyPlayer.voiceChannel = null;
            self.spotifyPlayer.connection = null;
            self.spotifyPlayer.player = null;
        }
    });

    decrVolListener.on('collect', reaction => {
        console.log("Music: Decrease Volume!");
        if (self.spotifyPlayer.volume > 0) self.spotifyPlayer.volume -= 1;
        if (self.spotifyPlayer.player && self.spotifyPlayer.connection)
            self.spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
        else {
            console.log("Dispacter is dead!");
            self.spotifyPlayer.playing = false;
            if (self.spotifyPlayer.voiceChannel) self.spotifyPlayer.voiceChannel.leave();
            self.spotifyPlayer.voiceChannel = null;
            self.spotifyPlayer.connection = null;
            self.spotifyPlayer.player = null;
        }
    });

    incrVolListener.on('collect', reaction => {
        console.log("Music: Increase Volume!");
        if (self.spotifyPlayer.volume < 20) self.spotifyPlayer.volume += 1;
        if (self.spotifyPlayer.player && self.spotifyPlayer.connection)
            self.spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
        else {
            console.log("Dispacter is dead!");
            self.spotifyPlayer.playing = false;
            if (self.spotifyPlayer.voiceChannel) self.spotifyPlayer.voiceChannel.leave();
            self.spotifyPlayer.voiceChannel = null;
            self.spotifyPlayer.connection = null;
            self.spotifyPlayer.player = null;
        }
    });
}

async function updateList(spotifyPlayer, bot, musicChannel) {
    console.log("-\tUpdating the music list!");
    let Channel = await new Discord.Channel(bot, {
        id: musicChannel.id
    }).fetch();

    var qMessage = await new Discord.Message(bot, {
        id: musicChannel.embedMessage
    }, Channel).fetch();

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
                this.spotifyPlayer.songs.unshift({
                    id: data.video_id,
                    title: data.title,
                    image: "https://i.ytimg.com/vi/" + data.video_id + "/default.jpg"
                });
                updateList(this.spotifyPlayer, this.bot, this.musicChannel);
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
            this.spotifyPlayer.songs.unshift({
                id: r.videos[0].videoId,
                title: r.videos[0].title,
                image: "https://i.ytimg.com/vi/" + r.videos[0].videoId + "/default.jpg"
            });
            updateList(this.spotifyPlayer, this.bot, this.musicChannel);
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

    if (this.spotifyPlayer.accesses.has(messageReceived.author.id)) {
        console.log("-\tThe user already has a token!");
        getPlaylists(0, this, messageReceived.author.id, argumentString);
    } else {
        console.log("-\tRequesting the token for the user!");
        messageReceived.author.send("Connect your spotify account!", {
            embed: {
                "title": "Connect your spotify account",
                "description": "[Click here to link your spotify account](" + this.auth.spotifyRedirect + ")",
                "thumbnail": {
                    "url": "https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif"
                },
                "url": this.auth.spotifyDiscordConnectUrl
            }
        });
    }
    messageReceived.delete();
}

function addPlaylistToQ(playlistUrl, userId, self) {
    rp.get(playlistUrl, {
        headers: {
            Authorization: "Bearer " + self.spotifyPlayer.accesses.get(userId).spotifyAccess
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
                        self.spotifyPlayer.songs.unshift({
                            id: r.videos[0].videoId,
                            title: r.videos[0].title,
                            image: track.track.album.images[1].url
                        });
                    } else {
                        console.log(err);
                        console.error("-\t*\t\tCould not find the query song (" + track.track.name + ")!");
                    }
                    if (playlistObject.tracks.items[playlistObject.tracks.items.length - 1] == track) updateList(self.spotifyPlayer, self.bot, self.musicChannel);
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

function getPlaylists(offset, self, userId, argumentString) {
    rp.get("https://api.spotify.com/v1/me/playlists?limit=50&offset=" + offset, {
        headers: {
            Authorization: "Bearer " + self.spotifyPlayer.accesses.get(userId).spotifyAccess
        }
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let playlistsContent = JSON.parse(body);


            let result = playlistsContent.items.find((playlist) => {
                if (playlist.name.includes(argumentString)) return playlist;
            });

            if (result) {
                console.log("-\tAdding songs of playlist:'" + result.name + "' to queue!");
                addPlaylistToQ(result.href, userId, self);
            } else {
                getPlaylists(offset + 50, self, userId, argumentString);
            }
        } else if (response.statusCode == 401) {
            console.log("-\tToken expired, refreshing!");
            refreshToken(userId, self);
            getPlaylists(offset, self, userId, argumentString);
        } else {
            console.log(response.statusCode);
            console.error(error);
            console.log(body);
        }
    })
}

function refreshToken(userId, self) {
    rp.post('https://accounts.spotify.com/api/token', {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: "Basic " + Buffer.from(self.auth.spotifyClientId + ":" + self.auth.spotifyClientSecret).toString('base64')
        },
        form: {
            grant_type: "refresh_token",
            refresh_token: self.spotifyPlayer.accesses.get(userId).spotifyRefresh
        }
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let spotifyAuthContent = JSON.parse(body);

            self.spotifyPlayer.accesses.set(userId, {
                spotifyCode: self.spotifyPlayer.accesses.get(userId).spotifyCode,
                spotifyRefresh: self.spotifyPlayer.accesses.get(userId).spotifyRefresh,
                spotifyAccess: spotifyAuthContent.access_token,
                discordCode: self.spotifyPlayer.accesses.get(userId).discordCode,
                discordRefresh: self.spotifyPlayer.accesses.get(userId).discordRefresh,
                discordAccess: self.spotifyPlayer.accesses.get(userId).discordAccess
            });

            awsUtils.save("store.mmrree.co.uk", "config/AccessMaps.json", JSON.stringify(Array.from(self.spotifyPlayer.accesses)));

            console.log("-\tUpdated the user token!");
        } else {
            console.log(response.statusCode);
            console.error(error);
            console.log(body);
        }
    });
}

function initWebhooks(auth, self) {
    var webhook = Express();
    const bodyParser = require('body-parser');

    webhook.set('port', process.env.PORT || 3000);
    webhook.use(bodyParser.json());
    webhook.use(Express.static('public'));
    webhook.use(Express.static('files'));
    webhook.use('/', Express.static(Path.join(__dirname + "/landing/")));

    webhook.get('/spotifyAuthenticate', (req, res) => {
        console.log("/spotifyAuthenticate accessed!");
        res.redirect(auth.spotifyDiscordConnectUrl);
    })

    webhook.get('/spotifyCallback', (req, res) => {
        console.log("/spotifyCallback accessed!");
        res.redirect("https://discord.com/api/v6/oauth2/authorize?" +
            "client_id=" + auth.discordClientId +
            "&redirect_uri=" + encodeURIComponent(auth.discordCallback) +
            "&response_type=code" +
            "&scope=identify" +
            "&prompt=none" +
            "&state=" + req.query.code);
    });

    const discordCallback = require('./routes/discordCallback.js');

    webhook.get('/discordCallback', (req, res) => discordCallback.get(req, res, auth, self));

    http.createServer(webhook).listen(webhook.get('port'), () => {
        console.log("Express server listening on port " + webhook.get("port"));
    });
}