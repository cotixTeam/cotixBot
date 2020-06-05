"use strict";

const request = require('request');
const ytdl = require('ytdl-core');
const Express = require('express');
const Path = require('path');
const FileSystem = require('fs');
const http = require('http');
const ytSearch = require('yt-search');
const Discord = require('discord.js');

function play(spotifyData, bot, musicChannel, musicClass) {
    if (spotifyData.songs.length == 0) {
        spotifyData.voiceChannel.leave();
    } else {
        spotifyData.player = spotifyData.connection.play(ytdl(spotifyData.songs[spotifyData.songs.length-1].id, {
            quality: "highestaudio",
            filter: "audioonly"
        })).on("finish", () => {
            if(spotifyData.skipped) {
                spotifyData.skipped = false;
                play(spotifyData, bot, musicChannel, musicClass);
            } else {
                spotifyData.oldSongs.push(spotifyData.songs.pop());    
                if (!spotifyData.songs[spotifyData.songs.length-1]) {
                    spotifyData.playing = false;
                    spotifyData.voiceChannel.leave();
                } else {
                    play(spotifyData, bot, musicChannel, musicClass);
                }
            }
        });
        spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
    }
    musicClass.updateList(spotifyData, bot, musicChannel);
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

        if (FileSystem.existsSync(Path.join(__dirname + "/config/AccessMaps.json"))) {
            this.spotifyData.accesses = new Map(JSON.parse(FileSystem.readFileSync(Path.join(__dirname + "/config/AccessMaps.json"))))
        }

        var self = this;

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

        webhook.get('/discordCallback', (req, res) => {
            console.log("/discordCallback accessed!");
            var localReq = req;

            request.post({
                url: 'https://discord.com/api/v6/oauth2/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                formData: {
                    'client_id': auth.discordClientId,
                    'client_secret': auth.discordClientSecret,
                    'grant_type': 'authorization_code',
                    'code': req.query.code,
                    'redirect_uri': auth.discordCallback,
                    'scope': 'identify'
                }
            }, (error, response, body) => {
                if (!error & response.statusCode == 200) {
                    var discordAuthContent = JSON.parse(body);

                    request.get('https://discord.com/api/v6/users/@me', {
                        headers: {
                            Authorization: "Bearer " + discordAuthContent.access_token
                        }
                    }, (error, response, body) => {
                        if (!error & response.statusCode == 200) {
                            var discordUserContent = JSON.parse(body);

                            request.post({
                                url: 'https://accounts.spotify.com/api/token',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    Authorization: "Basic " + Buffer.from(auth.spotifyClientId + ":" + auth.spotifyClientSecret).toString('base64')
                                },
                                form: {
                                    grant_type: "authorization_code",
                                    code: localReq.query.state,
                                    redirect_uri: auth.spotifyCallback
                                }
                            }, (error, response, body) => {
                                if (!error & response.statusCode == 200) {
                                    let spotifyAuthContent = JSON.parse(body);

                                    self.spotifyData.accesses.set(discordUserContent.id, {
                                        spotifyCode: localReq.query.state,
                                        spotifyRefresh: spotifyAuthContent.refresh_token,
                                        spotifyAccess: spotifyAuthContent.access_token,
                                        discordCode: localReq.query.code,
                                        discordRefresh: discordAuthContent.refresh_token,
                                        discordAccess: discordAuthContent.access_token
                                    });

                                    FileSystem.writeFileSync(Path.join(__dirname + "/config/AccessMaps.json"), JSON.stringify(Array.from(self.spotifyData.accesses)));
                                    console.log("Added access to Map:");
                                    console.log(self.spotifyData.accesses.get(discordUserContent.id));
                                }
                            });
                        }
                    });
                }
            });
            res.status(200).sendFile(Path.join(__dirname + "/config/spotifyLink.html"));
        });

        http.createServer(webhook).listen(webhook.get('port'), () => {
            console.log("Express server listening on port " + webhook.get("port"));
        });

        this.initList(this.spotifyData, this.bot, this.musicChannel);
    }

    async initList(spotifyData, bot, musicChannel) {
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
        await qMessage.react('⏹️');
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
        let stopFilter = (reaction, user) => reaction.emoji.name == '⏹️' && reaction.count == 2;
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


        // TODO: Find a way to delete the users reaction automatically without re-ordering the whole message, for now, have the bot check only on adding a react

        backListener.on('collect', reaction => {
            console.log("Music player, back pressed!");
            let lastSong = this.spotifyData.oldSongs.pop();
            if(lastSong) {
                this.spotifyData.songs.push(lastSong);
                if (this.spotifyData.connection.dispatcher) {
                    this.updateList(this.spotifyData, this.bot, this.musicChannel);
                    this.spotifyData.skipped = true;
                    this.spotifyData.connection.dispatcher.end();
                }
            }
        });

        playPauseListener.on('collect', async reaction => {
            console.log("Music player, playPause pressed! (currently playing: " + this.spotifyData.playing + ")");

            if (this.spotifyData.playing) {
                // Pause
                this.spotifyData.player.pause();
                this.spotifyData.playing = false;

            } else {
                // Play
                if (this.spotifyData.player) {
                    this.spotifyData.player.resume();
                    this.spotifyData.playing = true;
                } else {
                    let user = this.bot.channels.cache
                        .get(this.generalChannel.id).guild.members.cache
                        .get(reaction.users.cache.last().id);

                    let voiceChannel = user.voice.channel;
                    if (voiceChannel) {
                        let permissions = voiceChannel.permissionsFor(this.bot.user);
                        if (permissions.has("CONNECT") && permissions.has("SPEAK")) {

                            try {
                                this.spotifyData.voiceChannel = voiceChannel;
                                this.spotifyData.connection = await voiceChannel.join();
                                this.spotifyData.playing = true;
                                play(this.spotifyData, this.bot, this.musicChannel, this);
                            } catch (err) {
                                this.spotifyData.playing = false;
                                console.error(err);
                            }
                        } else {
                            user.send("I need permissions to be able to join the voice channel!");
                        }
                    } else {
                        user.send("You need to be in a voice channel for me to join!");
                    }
                    this.updateList(this.spotifyData, this.bot, this.musicChannel);
                }
            }
        });

        stopListener.on('collect', reaction => {
            console.log("Music player, stop pressed!");
            this.spotifyData.songs = [];
            if (this.spotifyData.connection) {
                this.spotifyData.connection.dispatcher.end();
            }

            this.updateList(this.spotifyData, this.bot, this.musicChannel);
        });

        skipListener.on('collect', reaction => {
            console.log("Music player, skip pressed!");
            if (this.spotifyData.connection.dispatcher) {
                this.spotifyData.connection.dispatcher.end();
            }
            this.updateList(this.spotifyData, this.bot, this.musicChannel);
        });

        decrVolListener.on('collect', reaction => {
            console.log("Music player, decrVol pressed!");
            this.spotifyData.volume -= 1;
            if(this.spotifyData.player)
            this.spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
        });

        incrVolListener.on('collect', reaction => {
            console.log("Music player, incrVol pressed!");
            this.spotifyData.volume += 1;
            if(this.spotifyData.player)
            this.spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
        });

    }

    async updateList(spotifyData, bot, musicChannel) {
        var self = this;
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
                        "value": spotifyData.songs[spotifyData.songs.length-1].title
                    }],
                    "image": {
                        "url": spotifyData.songs[spotifyData.songs.length-1].image
                    }
                }
            });
        } else {
            let songLists = [];
            let workingString = "";

            for (let song of spotifyData.songs) {
                if (song != spotifyData.songs[spotifyData.songs.length-1]) {
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

            // Always run once so that if not exceeded the length, there is still a list to show
            songLists.push({
                "name": "Up Next:",
                "value": workingString
            });

            // Append with the currently playing
            songLists.push({
                "name": "Now Playing:",
                "value": spotifyData.songs[spotifyData.songs.length-1].title
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
                            "url": spotifyData.songs[spotifyData.songs.length-1].image
                        }
                    }
                });
        }
    }

    qList(messageReceived) {
        this.updateList(this.spotifyData, this.bot, this.musicChannel);
        messageReceived.delete();
    }

    async qPlay(messageReceived) {
        let voiceChannel = messageReceived.member.voice.channel;

        if (voiceChannel) {
            let permissions = voiceChannel.permissionsFor(messageReceived.client.user);
            if (permissions.has("CONNECT") && permissions.has("SPEAK")) {

                try {
                    this.spotifyData.voiceChannel = voiceChannel;
                    this.spotifyData.connection = await voiceChannel.join();
                    this.spotifyData.playing = true;
                    play(this.spotifyData, this.bot, this.musicChannel, this);
                } catch (err) {
                    this.spotifyData.playing = false;
                    console.error(err);
                }
            } else {
                messageReceived.author.send("I need permissions to be able to join the voice channel!");
            }
        } else {
            this.updateList(this.spotifyData, this.bot, this.musicChannel);
            messageReceived.author.send("You need to be in a voice channel for me to join!");
        }
        messageReceived.delete();
    }

    qSkip(messageReceived) {
        if (!messageReceived.member.voice.channel) {
            messageReceived.channel.send("You have to be in a voice channel to stop the music!");
            return;
        }
        if (!this.spotifyData) {
            messageReceived.channel.send("There is no song that I could skip!");
            return;
        }
        if (this.spotifyData.connection.dispatcher) {
            this.spotifyData.connection.dispatcher.end();
            return;
        }
        messageReceived.delete();
    }

    qStop(messageReceived) {
        if (!messageReceived.member.voice.channel) {
            messageReceived.channel.send("You have to be in a voice channel to stop the music!");
            return;
        }
        this.spotifyData.songs = [];
        if (this.spotifyData.connection) {
            this.spotifyData.connection.dispatcher.end();
        }

        this.updateList(this.spotifyData, this.bot, this.musicChannel);
        messageReceived.delete();
    }

    addByUrl(messageReceived, args) {
        if (ytdl.validateURL(args[0])) {
            ytdl.getInfo(args[0], (err, data) => {
                console.log("\t-\tAdding " + data.title + " to the queue!");
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
        console.log("\t\tSearching for term on youtube (" + argumentString + ")!");

        ytSearch({
            query: argumentString,
            pageStart: 1,
            pageEnd: 1,
            category: "music"
        }, (err, r) => {
            if (!err) {
                console.log("\t-\tAdding " + r.videos[0].title + " to the queue!");
                this.spotifyData.songs.unshift({
                    id: r.videos[0].videoId,
                    title: r.videos[0].title,
                    image: "https://i.ytimg.com/vi/" + r.videos[0].videoId + "/default.jpg"
                });
                this.updateList(this.spotifyData, this.bot, this.musicChannel);
            }
        });
        messageReceived.delete();
    }

    qClear(messageReceived) {
        this.spotifyData.songs = [];
        this.updateList(this.spotifyData, this.bot, this.musicChannel);
        messageReceived.delete();
    }

    qSpotify(messageReceived, argumentString) {
        var self = this;

        function addPlaylistToQ(playlistUrl) {

            request.get(playlistUrl, {
                headers: {
                    Authorization: "Bearer " + self.spotifyData.accesses.get(messageReceived.author.id).spotifyAccess
                }
            }, (error, response, body) => {
                if (!error & response.statusCode == 200) {
                    let playlistObject = JSON.parse(body);
                    for (let track of playlistObject.tracks.items) {

                        ytSearch({
                            query: track.track.name + " " + track.track.artists[0].name,
                            pageStart: 1,
                            pageEnd: 1,
                            category: "music"
                        }, (err, r) => {
                            if (!err) {
                                console.log("\t-\tAdding " + r.videos[0].title + " to the queue!");
                                self.spotifyData.songs.unshift({
                                    id: r.videos[0].videoId,
                                    title: r.videos[0].title,
                                    image: track.track.album.images[1].url
                                });
                            }
                        });
                    }
                    self.updateList(self.spotifyData, self.bot, self.musicChannel);
                }
            })
        }

        if (self.spotifyData.accesses.has(messageReceived.author.id)) {
            console.log("\tThe user already has a token!");

            function getPlaylists(offset) {
                console.log("getPlaylists ran!");
                request.get("https://api.spotify.com/v1/me/playlists?limit=50&offset=" + offset, {
                    headers: {
                        Authorization: "Bearer " + self.spotifyData.accesses.get(messageReceived.author.id).spotifyAccess
                    }
                }, (error, response, body) => {
                    if (!error & response.statusCode == 200) {
                        console.log("\tAdding songs to queue!");

                        let playlistsContent = JSON.parse(body);

                        let result = playlistsContent.items.find((playlist) => {
                            if (playlist.name.includes(argumentString)) return playlist;
                        });

                        if (result) {
                            addPlaylistToQ(result.href);
                            self.updateList(self.spotifyData, self.bot, self.musicChannel);
                        } else getPlaylist(offset + 50);
                    } else if (response.statusCode == 401) {
                        console.log("\tToken expired, refreshing!");
                        self.refreshToken(messageReceived, self);
                        getPlaylists(offset);
                    } else {
                        console.error(error);
                        console.log(body);
                    }
                });
            }

            getPlaylists(0);

        } else {
            console.log("\tRequesting the token for the user!");
            messageReceived.author.send(".", {
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
            if (!error & response.statusCode == 200) {
                // Refresh access token
                let spotifyAuthContent = JSON.parse(body);

                console.log(spotifyAuthContent);

                self.spotifyData.accesses.set(messageReceived.author.id, {
                    spotifyCode: self.spotifyData.accesses.get(messageReceived.author.id).spotifyCode,
                    spotifyRefresh: self.spotifyData.accesses.get(messageReceived.author.id).spotifyRefresh,
                    spotifyAccess: spotifyAuthContent.access_token,
                    discordCode: self.spotifyData.accesses.get(messageReceived.author.id).discordCode,
                    discordRefresh: self.spotifyData.accesses.get(messageReceived.author.id).discordRefresh,
                    discordAccess: self.spotifyData.accesses.get(messageReceived.author.id).discordAccess
                });

                FileSystem.writeFileSync(Path.join(__dirname + "/config/AccessMaps.json"), JSON.stringify(Array.from(self.spotifyData.accesses)));
            } else {
                console.error(error);
                console.log(body);
            }
        });
    }
}

module.exports = {
    MusicClass: MusicClass
};