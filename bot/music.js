"use strict";

const request = require('request');
const ytdl = require('ytdl-core');
const Express = require('express');
const Path = require('path');
const FileSystem = require('fs');
const http = require('http');
const ytSearch = require('yt-search');
const Discord = require('discord.js')

function play(spotifyData, bot, Channels) {
    var musicChannel = Channels.find((chan) => {
        if (chan.name == "Music") return chan;
    });

    let songLists = [];
    let workingString = "";

    for (let song of spotifyData.songs) {
        if (song != spotifyData.songs[0]) {
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

    console.log(spotifyData)

    songLists.push({
        "name": "Now Playing:",
        "value": spotifyData.songs[0].title
    });

    new Discord.Message(bot, {
            id: musicChannel.embedMessage
        }, new Discord.Channel(bot, {
            id: musicChannel.id
        }))
        .edit({
            "content": "Player",
            "embed": {
                "title": "Music Player",
                "description": "Showing the Queue...",
                "footer": {
                    "text": "The queue is " + spotifyData.songs.length + " songs long!"
                },
                "image": {
                    "url": spotifyData.songs[0].image
                },
                "fields": songLists
            }
        });


    spotifyData.player = spotifyData.connection.play(ytdl(spotifyData.songs[0].id, {
        quality: "highestaudio",
        filter: "audioonly"
    })).on("finish", () => {
        spotifyData.songs.shift();

        if (!spotifyData.songs[0]) {
            spotifyData.voiceChannel.leave();
        } else {
            play(spotifyData, bot, Channels);
        }
    });
    spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
}

class MusicClass {
    constructor(client, Channels, auth) {
        this.bot = client;
        this.Channels = Channels;
        this.googleToken = auth.googleToken;
        this.spotifyRedirect = auth.spotifyRedirect;

        this.spotifyClientId = auth.spotifyClientId;
        this.spotifyClientSecret = auth.spotifyClientSecret;

        this.spotifyData = {
            voiceChannel: null,
            connection: null,
            player: null,
            songs: [],
            volume: 5,
            playing: false,
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
        })
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
                    play(this.spotifyData, this.bot, this.Channels);
                } catch (err) {
                    this.spotifyData.playing = false;
                    console.error(err);
                }
            } else {
                messageReceived.send("I need permissions to be able to join the voice channel!");
            }
        } else {
            messageReceived.send("You need to be in a voice channel for me to join!");
        }
        messageReceived.delete();
    }

    qSkip(messageReceived) {
        if (!messageReceived.member.voice.channel)
            return messageReceived.channel.send(
                "You have to be in a voice channel to stop the music!"
            );
        if (!this.spotifyData)
            return messageReceived.channel.send("There is no song that I could skip!");
        this.spotifyData.connection.dispatcher.end();
        messageReceived.delete();
    }

    qStop(messageReceived) {
        if (!messageReceived.member.voice.channel)
            return messageReceived.channel.send(
                "You have to be in a voice channel to stop the music!"
            );
        this.spotifyData.songs = [];
        this.spotifyData.connection.dispatcher.end();
        messageReceived.delete();
    }

    addByUrl(messageReceived, args) {
        if (ytdl.validateURL(args[0])) {
            ytdl.getInfo(args[0], (err, data) => {
                console.log("\t-\tAdding " + data.title + " to the queue!");
                this.spotifyData.songs.push({
                    id: data.video_id,
                    title: data.title
                });
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
                self.spotifyData.songs.push({
                    id: r.videos[0].videoId,
                    title: r.videos[0].title
                });
            }
        });

        /*
        Rate limited youtube api method

        let options = {
            part: "id,snippet",
            type: "video",
            q: argumentString,
            key: this.googleToken
        }

        var self = this;

        function fixedEncodeURIComponent(str) {
            return encodeURIComponent(str).replace(/[-_.!~*'()]/g, function (c) {
                return '%' + c.charCodeAt(0).toString(16);
            });
        }

        let queryString = Object.keys(options)
            .map(param => fixedEncodeURIComponent(param) + "=" + fixedEncodeURIComponent(options[param])).join('&');

        request('https://www.googleapis.com/youtube/v3/search?' + queryString, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body);
                console.log("\t-\tAdding " + content.items[0].snippet.title + " to the queue!");
                this.spotifyData.songs.push({
                    id: content.items[0].id.videoId,
                    title: content.items[0].snippet.title
                });
            } else {
                console.error(error);
            }
        })*/
        messageReceived.delete();
    }

    qClear(messageReceived) {
        this.spotifyData.songs = [];
        messageReceived.delete();
    }

    // TODO: rather than show the queue like this, edit a message when the queue is changed!  (At the moment there is a small improvement to how it shows)
    qList(messageReceived) {
        let songTitles = this.spotifyData.songs.map(song => song.title);
        console.log("\t\t" + songTitles.join('\n\t\t'));
        messageReceived.channel.send("The songs in the queue are:\n" + songTitles.join('\n'))
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
                                self.spotifyData.songs.push({
                                    id: r.videos[0].videoId,
                                    title: r.videos[0].title,
                                    image: track.track.album.images[1].url
                                });
                            }
                        });

                        /*
                        Old api method
                        
                        var options = {
                            part: "id,snippet",
                            type: "video",
                            q: track.track.name + " " + track.track.artists[0].name,
                            key: self.googleToken,
                            maxResults: 1, // To keep the quota search low for the key
                            type: "video", // Set to only return videos
                            videoCategoryId: 10 // The code for music
                        }

                        function fixedEncodeURIComponent(str) {
                            return encodeURIComponent(str).replace(/[-_.!~*'()]/g, function (c) {
                                return '%' + c.charCodeAt(0).toString(16);
                            });
                        }

                        let queryString = Object.keys(options)
                            .map(param => fixedEncodeURIComponent(param) + "=" + fixedEncodeURIComponent(options[param])).join('&');

                        request('https://www.googleapis.com/youtube/v3/search?' + queryString, (error, response, body) => {
                            if (!error && response.statusCode == 200) {
                                let content = JSON.parse(body);
                                console.log("\t-\tAdding " + content.items[0].snippet.title + " to the queue!");
                                self.spotifyData.songs.push({
                                    id: content.items[0].id.videoId,
                                    title: content.items[0].snippet.title
                                });
                            } else {
                                console.error(error);
                                console.log(body);
                            }
                        })*/
                    }
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

                        if (result) addPlaylistToQ(result.href);
                        else getPlaylist(offset + 50);
                    } else if (response.statusCode == 401) {
                        console.log("\tToken expired, refreshing!");
                        self.refreshToken(messageReceived, self);
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