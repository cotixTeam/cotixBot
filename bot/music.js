"use strict";

const request = require('request');
const ytdl = require('ytdl-core');
const Express = require('express');
const Path = require('path');

function play(spotifyData) {
    console.log(spotifyData);
    spotifyData.player = spotifyData.connection.play(ytdl(spotifyData.songs[0].id, {
        quality: "highestaudio",
        filter: "audioonly"
    })).on("finish", () => {
        spotifyData.songs.shift();
        if (!spotifyData.songs[0]) {
            spotifyData.voiceChannel.leave();
        } else {
            play(spotifyData);
        }
    });
    spotifyData.player.setVolumeLogarithmic(spotifyData.volume / 10);
}

class MusicClass {
    constructor(client, Channels, auth) {
        this.bot = client;
        this.Channels = Channels;
        this.spotifyClientSecret = auth.spotifyClientSecret;
        this.spotifyClientId = auth.spotifyClientId;
        this.googleToken = auth.googleToken;
        this.discordShortUrl = auth.discordShortUrl
        this.spotifyData = {
            voiceChannel: null,
            connection: null,
            player: null,
            songs: [],
            volume: 5,
            playing: false,
            accesses: new Map()
        };

        var self = this;

        const webhook = Express();

        webhook.listen('3000', () => console.log(`Server running on port 3000`))
        webhook.use(Express.urlencoded());

        webhook.get('/spotifyCallback', (req, res) => {
            res.redirect("https://discord.com/api/v6/oauth2/authorize?" +
                "client_id=" + auth.discordClientId +
                "&redirect_uri=" + encodeURIComponent(auth.discordCallback) +
                "&response_type=code" +
                "&scope=identify" +
                "&prompt=none" +
                "&state=" + req.query.code)
        });

        webhook.get('/discordCallback', (req, res) => {
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
                    var authContent = JSON.parse(body);

                    request.get('https://discord.com/api/v6/users/@me', {
                        headers: {
                            Authorization: "Bearer " + authContent.access_token
                        }
                    }, (error, response, body) => {
                        if (!error & response.statusCode == 200) {
                            let userContent = JSON.parse(body);

                            self.spotifyData.accesses.set(userContent.id, {
                                spotifyCode: localReq.query.state,
                                discordCode: localReq.query.code,
                                discordRefresh: authContent.refresh_token
                            });
                        }
                    });
                }
            });
            res.status(200).sendFile(Path.join(__dirname + "/config/spotifyLink.html"));
        });
    }

    async play(messageReceived) {
        let voiceChannel = messageReceived.member.voice.channel;

        if (voiceChannel) {
            let permissions = voiceChannel.permissionsFor(messageReceived.client.user);
            if (permissions.has("CONNECT") && permissions.has("SPEAK")) {

                try {
                    this.spotifyData.voiceChannel = voiceChannel;
                    this.spotifyData.connection = await voiceChannel.join();
                    this.spotifyData.playing = true;
                    play(this.spotifyData);
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

    skip(messageReceived) {
        if (!messageReceived.member.voice.channel)
            return messageReceived.channel.send(
                "You have to be in a voice channel to stop the music!"
            );
        if (!this.spotifyData)
            return messageReceived.channel.send("There is no song that I could skip!");
        this.spotifyData.connection.dispatcher.end();
        messageReceived.delete();
    }

    stop(messageReceived) {
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
        let options = {
            part: "id,snippet",
            type: "video",
            q: argumentString,
            key: this.googleToken
        }

        function fixedEncodeURIComponent(str) {
            return encodeURIComponent(str).replace(/[-_.!~*'()]/g, function (c) {
                return '%' + c.charCodeAt(0).toString(16);
            });
        }

        let queryString = Object.keys(options)
            .map(param => fixedEncodeURIComponent(param) + "=" + fixedEncodeURIComponent(options[param])).join('&');

        console.log("\t\tSearching for term on youtube (" + argumentString + ")!");

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
        })
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

    qSpotify(messageReceived) { // STILL WIP, can get codes but does nothing with it
        if (this.spotifyData.accesses.has(messageReceived.author.id)) {
            console.log("\tThe user already has a token!");
            console.log(this.spotifyData.accesses.get(messageReceived.author.id));
        } else {
            console.log("\tRequesting the token for the user!");
            messageReceived.author.send(".", {
                embed: {
                    "title": "Connect your spotify account",
                    "description": "[Click here to link your spotify account](" + this.discordShortUrl + ")",
                    "thumbnail": {
                        "url": "https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif"
                    },
                    "url": this.discordShortUrl
                }
            });
        }
        messageReceived.delete();
    }
}

module.exports = {
    MusicClass: MusicClass
};