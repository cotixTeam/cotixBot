"use strict";

const request = require('request');
const ytdl = require('ytdl-core');
const Express = require('express');

function play(spotifyData) {
    console.log(spotifyData);
    spotifyData.player = spotifyData.connection.play(ytdl(spotifyData.songs[0], {
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
        this.spotifyData = {
            voiceChannel: null,
            connection: null,
            player: null,
            songs: [],
            volume: 5,
            playing: false,
            accesses: new Map()
        };

        /*
        WIP spotify and discord integration for music
        const webhook = Express();

        webhook.listen('3000', () => console.log(`Server running on port 3000`))
        webhook.use(Express.urlencoded());

        webhook.get('/spotifyCallback', (req, res) => {
            console.log(req.query);
            // This is ugly, but i need it to be able to pass in the query code, I have tried to look for other ways to do it like php, but none have worked so far
            res.redirect("https://discord.com/api/oauth2/authorize?client_id=" + auth.discordClientId + "&redirect_uri=" + encodeURIComponent(auth.discordCallback) + "&response_type=code&scope=identify&state=" + req.query.code)
        });

        webhook.get('/discordCallback', (req, res) => {
            console.log(req);

            request.post({
                url: 'https://discord.com/api/oauth2/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                form: {
                    client_id: auth.discordclientId,
                    client_secret: auth.discordClientSecret,
                    grant_type: "authorization_code",
                    code: req.body.code,
                    redirect_uri: auth.discordCallback,
                    scope: 'identity'
                }
            }, (error, response, body) => {
                console.error(error);
                console.log(response);
                if (!error && response.statusCode == 200) {
                    console.log(body);
                }
            });

            // This is ugly, but i need it to be able to pass in the query code, I have tried to look for other ways to do it like php, but none have worked so far
            res.status(200).send('  <!DOCTYPE html>\
                                    <html>\
                                        <head>\
                                            <title>You have succesfully linked your spotify and discord account!</title>\
                                        </head>\
                                        <body>\
                                            <h1>You have succesfully linked your spotify and discord account!</h1>\
                                        </body>\
                                    </html>');
        });

        webhook.post('/spotifySubmit', (req, res) => {
            console.log(req.body);
            // TODO: verifiy the user is in the server
            this.spotifyData.accesses.set(req.body.discordId, req.body.code);
            res.status(200).end();
        });
        */
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

    qUrl(messageReceived) {
        if (ytdl.validateURL(args[0])) this.spotifyData.songs.push(args[0]);
        messageReceived.delete();
    }

    qSearch(messageReceived, argumentString) {
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
                this.spotifyData.songs.push(content.items[0].id.videoId);
            } else {
                console.error(error);
            }
        })
        messageReceived.delete();
    }

    qClear() {
        this.spotifyData.songs = [];
        messageReceived.delete();
    }

    // TODO: rather than show the queue like this, edit a message when the queue is changed!
    qList(messageReceived) {
        Promise.all(this.spotifyData.songs.map(song => ytdl.getInfo(song)))
            .then(songArray => {
                let songTitles = songArray.map(songObject => songObject.title);
                console.log("\t\t" + sontTitles.join('\n\t\t'));
                messageReceived.channel.send("The songs in the queue are:\n" + songTitles.join('\n'))
            })

        messageReceived.delete();
    }

    qSpotify(messageReceived) {
        // Big changes needed to this section wow!
        let auth = "Bearer " + spotifyApi.getAccessToken();
        request.get({
            url: 'https://api.spotify.com/v1/users/11131862133/tracks',
            headers: {
                Authorization: auth
            }
        }, (error, response, body) => {
            console.log(body);
        })
        spotifyApi.getUserPlaylists('11131862133', {
            limit: 50
        }).then((data) => {
            console.log(data.body.items);
        });
        messageReceived.delete();
    }
}

module.exports = {
    MusicClass: MusicClass
};