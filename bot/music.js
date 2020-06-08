"use strict";

const request = require('request');
const ytdl = require('ytdl-core');
const Express = require('express');
const Path = require('path');
const FileSystem = require('fs');
const http = require('http');
const ytSearch = require('yt-search');
const Discord = require('discord.js');
const AWS = require('aws-sdk');

function play(spotifyData, bot, musicChannel, musicClass) {
    if (spotifyData.songs.length == 0) {
        spotifyData.voiceChannel.leave();
    } else {
        spotifyData.player = spotifyData.connection.play(ytdl(spotifyData.songs[spotifyData.songs.length - 1].id, {
            quality: "highestaudio",
            filter: "audioonly"
        })).on("finish", () => {
            if (spotifyData.skipped) {
                console.log("Song Skipped, starting next song!");
                spotifyData.skipped = false;
                spotifyData.playing = true;
                play(spotifyData, bot, musicChannel, musicClass);
            } else {
                console.log("Song finished!");
                spotifyData.oldSongs.push(spotifyData.songs.pop());
                if (!spotifyData.songs[spotifyData.songs.length - 1]) {
                    console.log("-\tEnd of queue!");
                    spotifyData.playing = false;
                    spotifyData.voiceChannel.leave();
                    spotifyData.voiceChannel = null;
                    spotifyData.connection = null;
                    spotifyData.player = null;
                    spotifyData.oldSongs = [];
                } else {
                    console.log("-\tPlaying next song!")
                    spotifyData.playing = true;
                    play(spotifyData, bot, musicChannel, musicClass);
                }
            }
            musicClass.updateList(spotifyData, bot, musicChannel);
        });
        spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
    }
}

class MusicClass {
    constructor(client, Channels, auth) {
        this.bot = client;
        this.Channels = Channels;
        this.googleToken = auth.googleToken;
        this.spotifyRedirect = auth.spotifyRedirect;

        this.spotifyClientId = auth.spotifyClientId;
        this.spotifyClientSecret = auth.spotifyClientSecret;

        this.generalChannel = Channels.find((channel) => {
            if (channel.name == "General") return channel;
        });

        this.musicChannel = Channels.find((channel) => {
            if (channel.name == "Music") return channel;
        });

        this.spotifyData = {
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

        const SESConfig = {
            apiVersion: "2006-03-01",
            region: "eu-west-2"
        }
        AWS.config.update(SESConfig);

        this.initFileSystem();

        var webhook = Express();

        webhook.set('port', process.env.PORT || 3000);
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

        webhook.get('/discordCallback', (req, res) => discordCallback.post(req, res, auth, this));

        http.createServer(webhook).listen(webhook.get('port'), () => {
            console.log("Express server listening on port " + webhook.get("port"));
        });

        this.initList(this.spotifyData, this.bot, this.musicChannel);
    }

    async initFileSystem() {
        let s3 = new AWS.S3({
            apiVersion: '2006-03-01'
        });
        if (await s3.headObject({
                Bucket: "cotixbotstorage",
                Key: Path.basename(__dirname + "/config/AccessMaps.json")
            }, (err, data) => {
                if (err && err.code === 'NotFound') {
                    return false;
                } else {
                    return true;
                }
            }).promise().catch((err) => console.error(err))) {
            let data = await s3.getObject({
                Bucket: "cotixbotstorage",
                Key: Path.basename(__dirname + "/config/AccessMaps.json")
            }, (err, data) => {
                if (err && err.code === 'NotFound') {
                    console.error(err);
                    console.log("Not Found");
                } else {
                    return JSON.parse(data.Body.toString());
                }
            }).promise();
            this.spotifyData.accesses = new Map(JSON.parse(data.Body.toString()));
        }
    }

    async initList(spotifyData, bot, musicChannel) {
        var self = this;

        let Channel = await new Discord.Channel(bot, {
            id: musicChannel.id
        }).fetch();

        var qMessage = await new Discord.Message(bot, {
            id: musicChannel.embedMessage
        }, Channel).fetch();

        await qMessage.edit({
            "content": "Player",
            "embed": {
                "title": "Music Player",
                "description": "Showing the Queue...",
                "footer": {
                    "text": "The queue is " + spotifyData.songs.length + " songs long!"
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
            let lastSong = self.spotifyData.oldSongs.pop();
            if (lastSong) {
                console.log("-\tGoing back one song in the queue!");
                self.spotifyData.songs.push(lastSong);
                self.spotifyData.skipped = true;
                self.spotifyData.connection.dispatcher.end();
            } else {
                console.log("-\tNo song in the old queue! Cannot go back!");
            }
        });

        playPauseListener.on('collect', async reaction => {
            console.log("Music: Play/Pause!");

            if (self.spotifyData.playing && self.spotifyData.connection && self.spotiftyData.connection.dispatcher) {
                console.log("-\tPausing!");
                self.spotifyData.player.pause();
                self.spotifyData.playing = false;

            } else if (!self.spotifyData.playing) {
                if (self.spotifyData.player && self.spotifyData.connection && self.spotiftyData.connection.dispatcher) {
                    console.log("-\tResuming!");
                    self.spotifyData.player.resume();
                    self.spotifyData.playing = true;
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
                                self.spotifyData.voiceChannel = voiceChannel;
                                self.spotifyData.connection = await voiceChannel.join();
                                self.spotifyData.playing = true;
                                play(self.spotifyData, self.bot, self.musicChannel, self);
                            } catch (err) {
                                self.spotifyData.playing = false;
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
                self.spotifyData.playing = false;
                self.spotifyData.voiceChannel.leave();
                self.spotifyData.voiceChannel = null;
                self.spotifyData.connection = null;
                self.spotifyData.player = null;
            }
        });

        stopListener.on('collect', reaction => {
            console.log("Music: Stop!");
            self.spotifyData.songs = [];
            self.spotifyData.oldSongs = [];
            if (self.spotifyData &&
                self.spotifyData.connection) {
                self.spotifyData.connection.dispatcher.end();
            } else {
                console.log("Dispacter is already dead!");
                self.spotifyData.playing = false;
                if (self.spotifyData.voiceChannel) self.spotifyData.voiceChannel.leave();
                self.spotifyData.voiceChannel = null;
                self.spotifyData.connection = null;
                self.spotifyData.player = null;
            }
        });

        skipListener.on('collect', reaction => {
            console.log("Music: Skip!");
            if (self.spotifyData.connection) {
                self.spotifyData.connection.dispatcher.end();
            } else {
                console.log("Dispacter is dead!");
                self.spotifyData.playing = false;
                self.spotifyData.voiceChannel.leave();
                self.spotifyData.voiceChannel = null;
                self.spotifyData.connection = null;
                self.spotifyData.player = null;
            }
        });

        decrVolListener.on('collect', reaction => {
            console.log("Music: Decrease Volume!");
            if (self.spotifyData.volume > 0) self.spotifyData.volume -= 1;
            if (self.spotifyData.player && self.spotifyData.connection)
                self.spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
            else {
                console.log("Dispacter is dead!");
                self.spotifyData.playing = false;
                self.spotifyData.voiceChannel.leave();
                self.spotifyData.voiceChannel = null;
                self.spotifyData.connection = null;
                self.spotifyData.player = null;
            }
        });

        incrVolListener.on('collect', reaction => {
            console.log("Music: Increase Volume!");
            if (self.spotifyData.volume < 20) self.spotifyData.volume += 1;
            if (self.spotifyData.player && self.spotifyData.connection)
                self.spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
            else {
                console.log("Dispacter is dead!");
                self.spotifyData.playing = false;
                self.spotifyData.voiceChannel.leave();
                self.spotifyData.voiceChannel = null;
                self.spotifyData.connection = null;
                self.spotifyData.player = null;
            }
        });

    }

    async updateList(spotifyData, bot, musicChannel) {
        console.log("-\tUpdating the music list!");
        let Channel = await new Discord.Channel(bot, {
            id: musicChannel.id
        }).fetch();

        var qMessage = await new Discord.Message(bot, {
            id: musicChannel.embedMessage
        }, Channel).fetch();

        if (spotifyData.songs.length == 0) {
            qMessage.edit({
                "content": "Player",
                "embed": {
                    "title": "Music Player",
                    "description": "Showing the Queue...",
                    "footer": {
                        "text": "The queue is " + spotifyData.songs.length + " songs long!"
                    },
                    "fields": [{
                        "name": "There are no songs in the queue!",
                        "value": "Add one by using !qSearch or !qSpotify"
                    }]
                }
            });
        } else if (spotifyData.songs.length == 1) {
            qMessage.edit({
                "content": "Player",
                "embed": {
                    "title": "Music Player",
                    "description": "Showing the Queue...",
                    "footer": {
                        "text": "The queue is " + spotifyData.songs.length + " songs long!"
                    },
                    "fields": [{
                        "name": "Now Playing:",
                        "value": spotifyData.songs[spotifyData.songs.length - 1].title
                    }],
                    "image": {
                        "url": spotifyData.songs[spotifyData.songs.length - 1].image
                    }
                }
            });
        } else {
            let songLists = [];
            let workingString = "";

            for (let song of spotifyData.songs) {
                if (song != spotifyData.songs[spotifyData.songs.length - 1]) {
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
                "value": spotifyData.songs[spotifyData.songs.length - 1].title
            });

            qMessage
                .edit({
                    "content": "Player",
                    "embed": {
                        "title": "Music Player",
                        "description": "Showing the Queue...",
                        "footer": {
                            "text": "The queue is " + spotifyData.songs.length + " songs long!"
                        },
                        "fields": songLists,
                        "image": {
                            "url": spotifyData.songs[spotifyData.songs.length - 1].image
                        }
                    }
                });
        }
    }

    addByUrl(messageReceived, args) {
        console.log("-\tAdding the youtube url to queue (if valid) [" + args[0] + "]!");
        if (ytdl.validateURL(args[0])) {
            ytdl.getInfo(args[0], (err, data) => {
                console.log("-\t*\tAdding " + data.title + " to the queue! (From url " + data.video_url + ")");
                this.spotifyData.songs.unshift({
                    id: data.video_id,
                    title: data.title,
                    image: "https://i.ytimg.com/vi/" + data.video_id + "/default.jpg"
                });
                this.updateList(this.spotifyData, this.bot, this.musicChannel);
            });
        }
        messageReceived.delete();
    }

    addBySearch(messageReceived, argumentString) {
        console.log("-\t*\tSearching for term on youtube (" + argumentString + ")!");

        ytSearch({
            query: argumentString,
            pageStart: 1,
            pageEnd: 1,
            category: "music"
        }, (err, r) => {
            if (!err) {
                console.log("-\t*\t\tAdding " + r.videos[0].title + " to the queue!");
                this.spotifyData.songs.unshift({
                    id: r.videos[0].videoId,
                    title: r.videos[0].title,
                    image: "https://i.ytimg.com/vi/" + r.videos[0].videoId + "/default.jpg"
                });
                this.updateList(this.spotifyData, this.bot, this.musicChannel);
            } else {
                console.error("Could not find the query song (" + argumentString + ")!");
            }
        });
        messageReceived.delete();
    }

    qSpotify(messageReceived, argumentString) {
        console.log("-\tQueuing spotify closest matching string (" + argumentString + ")!");
        var self = this;

        function addPlaylistToQ(playlistUrl) {
            request.get(playlistUrl, {
                headers: {
                    Authorization: "Bearer " + self.spotifyData.accesses.get(messageReceived.author.id).spotifyAccess
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
                                self.spotifyData.songs.unshift({
                                    id: r.videos[0].videoId,
                                    title: r.videos[0].title,
                                    image: track.track.album.images[1].url
                                });
                            } else {
                                console.error("-\t*\t\tCould not find the query song (" + track.track.name + ")!");
                            }
                            if (playlistObject.tracks.items[playlistObject.tracks.items.length - 1] == track) self.updateList(self.spotifyData, self.bot, self.musicChannel);
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

        if (self.spotifyData.accesses.has(messageReceived.author.id)) {
            console.log("-\tThe user already has a token!");

            function getPlaylists(offset) {
                request.get("https://api.spotify.com/v1/me/playlists?limit=50&offset=" + offset, {
                    headers: {
                        Authorization: "Bearer " + self.spotifyData.accesses.get(messageReceived.author.id).spotifyAccess
                    }
                }, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        let playlistsContent = JSON.parse(body);


                        let result = playlistsContent.items.find((playlist) => {
                            if (playlist.name.includes(argumentString)) return playlist;
                        });

                        if (result) {
                            console.log("-\tAdding songs of playlist:'" + result.name + "' to queue!");
                            addPlaylistToQ(result.href);
                        } else {
                            getPlaylists(offset + 50);
                        }
                    } else if (response.statusCode == 401) {
                        console.log("-\tToken expired, refreshing!");
                        self.refreshToken(messageReceived, self);
                        getPlaylists(offset);
                    } else {
                        console.log(response.statusCode);
                        console.error(error);
                        console.log(body);
                    }
                })
            }

            getPlaylists(0);

        } else {
            console.log("-\tRequesting the token for the user!");
            messageReceived.author.send("Connect your spotify account!", {
                embed: {
                    "title": "Connect your spotify account",
                    "description": "[Click here to link your spotify account](" + this.spotifyRedirect + ")",
                    "thumbnail": {
                        "url": "https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif"
                    },
                    "url": this.spotifyDiscordConnectUrl
                }
            });
        }
        messageReceived.delete();
    }

    refreshToken(messageReceived, self) {
        request.post('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: "Basic " + Buffer.from(self.spotifyClientId + ":" + self.spotifyClientSecret).toString('base64')
            },
            form: {
                grant_type: "refresh_token",
                refresh_token: self.spotifyData.accesses.get(messageReceived.author.id).spotifyRefresh
            }
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let spotifyAuthContent = JSON.parse(body);

                self.spotifyData.accesses.set(messageReceived.author.id, {
                    spotifyCode: self.spotifyData.accesses.get(messageReceived.author.id).spotifyCode,
                    spotifyRefresh: self.spotifyData.accesses.get(messageReceived.author.id).spotifyRefresh,
                    spotifyAccess: spotifyAuthContent.access_token,
                    discordCode: self.spotifyData.accesses.get(messageReceived.author.id).discordCode,
                    discordRefresh: self.spotifyData.accesses.get(messageReceived.author.id).discordRefresh,
                    discordAccess: self.spotifyData.accesses.get(messageReceived.author.id).discordAccess
                });

                let s3 = new AWS.S3({
                    apiVersion: '2006-03-01'
                });

                s3.upload({
                    Bucket: "cotixbotstorage",
                    Key: Path.basename(__dirname + "/config/AccessMaps.json"),
                    Body: JSON.stringify(Array.from(self.spotifyData.accesses))
                }, (err, data) => {
                    if (err) {
                        console.log("Error", err);
                    }
                    if (data) {
                        console.log("Upload Success", data);
                    }
                });

                console.log("-\tUpdated the user token!");
            } else {
                console.log(response.statusCode);
                console.error(error);
                console.log(body);
            }
        });
    }
}

module.exports = {
    MusicClass: MusicClass
};