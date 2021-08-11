const {
    AudioPlayerStatus,
    AudioPlayer,
    createAudioPlayer,
    joinVoiceChannel,
    entersState,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    StreamType,
    createAudioResource,
} = require('@discordjs/voice');
const { promisify } = require('util');
const Track = require('./Track.js');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const fetch = require('node-fetch');
const ytSearch = require('yt-search');
const awsUtils = require('../../bot/awsUtils.js');

const wait = promisify(setTimeout);

module.exports = class SpotifyPlayer {
    // By nature only runs once on init
    constructor(metaData, interaction) {
        this.build(metaData, interaction);
    }

    /** Hacky way to handle not being have an async constructor.
     * @param {object} metaData The metadata of the bot
     */
    async build(metaData, interaction) {
        this.metaData = metaData;

        this.voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.queue = [];
        this.history = [];
        this.queueLock = false;
        this.readyLock = false;
        this.playing = false;
        this.initialised = true;
        this.musicChannel;
        this.qMessage;

        this.default_message = {
            content: 'Player',
            embeds: [
                {
                    title: 'Music Player',
                    description: 'Showing the Queue...',
                    footer: {
                        text: 'The queue is 0 songs long!',
                    },
                    fields: [
                        {
                            name: 'There are no songs in the queue!',
                            value: 'Add one by using /music',
                        },
                    ],
                },
            ],
        };

        let musicChannelLocal = this.metaData.channels.find((channel) => {
            if (channel.name == 'Music') return channel;
        });

        this.musicChannel = await new Discord.Channel(this.metaData.bot, {
            id: musicChannelLocal.id,
        }).fetch();

        this.qMessage = await new Discord.Message(this.metaData.bot, {
            id: musicChannelLocal.embedMessage,
            channel_id: this.musicChannel.id,
        }).fetch();

        await this.qMessage.edit(this.default_message);

        await this.qMessage.reactions.removeAll();
        await this.qMessage.react('◀️');
        await this.qMessage.react('⏯️');
        await this.qMessage.react('🇽');
        await this.qMessage.react('▶️');
        //await this.qMessage.react('🔉');
        //this.qMessage.react('🔊');

        let backListener = this.qMessage.createReactionCollector({
            time: 0,
        });
        let playPauseListener = this.qMessage.createReactionCollector({
            time: 0,
        });
        let stopListener = this.qMessage.createReactionCollector({
            time: 0,
        });
        let skipListener = this.qMessage.createReactionCollector({
            time: 0,
        });

        backListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '◀️' && reaction.count == 2 && user.id != this.metaData.bot.id)
                this.backPressed();
        });
        playPauseListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '⏯️' && reaction.count == 2 && user.id != this.metaData.bot.id)
                this.pausePlayPressed(user);
        });
        stopListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '🇽' && reaction.count == 2 && user.id != this.metaData.bot.id)
                this.stopPressed();
        });
        skipListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '▶️' && reaction.count == 2 && user.id != this.metaData.bot.id)
                this.skipPressed();
        });

        this.audioPlayer.on('stateChange', (oldState, newState) => {
            console.log(this.audioPlayer);
            if (newState.status == AudioPlayerStatus.Idle && oldState.status != AudioPlayerStatus.Idle) {
                console.log('Audio player going to next song!');
                // Next song for debug is loop
                let resource = createAudioResource('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', {
                    inputType: StreamType.Arbitrary,
                });
                console.log(resource);
                this.audioPlayer.play(resource);
                //this.processQueue();
            } else if (newState.status == AudioPlayerStatus.Playing) {
                console.log('Audio player playing!');
                this.playing = true;
            } else {
                console.log('Audio player paused!');
                console.log(newState.status);
                console.log(this.audioPlayer.state.resource);

                this.playing = false;
                if (newState.status == AudioPlayerStatus.Idle || newState.status == AudioPlayerStatus.Paused) {
                    let resource = createAudioResource(
                        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        {
                            inputType: StreamType.Arbitrary,
                        }
                    );
                    console.log(resource);
                    this.audioPlayer.play(resource);
                }
            }
        });

        this.audioPlayer.on('error', (error) => console.error(error));

        let resource = createAudioResource('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', {
            inputType: StreamType.Arbitrary,
        });
        console.log(resource);
        this.audioPlayer.play(resource);
        this.voiceConnection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.member.voice.channel.guild.id,
            adapterCreator: interaction.member.voice.channel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });
        this.voiceConnection.subscribe(this.audioPlayer);
        //this.checkConnection(interaction.member);
        // Used to debug the next commands to check

        /*await this.addBySearch(interaction, 'traitor');
        this.pausePlayPressed(interaction.member);*/
    }

    /** Checks to see if the bot is connected to the correct voice channel to play music
     * @param {SpotifyPlayer} spotifyPlayer The spotifyPlayer to check is working.
     * @param {Discord.User} user The user to check if the bot is in the same channel as.
     */
    checkConnection(user) {
        // If not connected, try to connect
        if (!this.voiceChannel) {
            if (user.voice.channel) {
                let channel = user.voice.channel;
                this.join(
                    joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                        selfDeaf: false,
                    })
                );
                this.voiceConnection.on('error', console.warn);
            }
        }
        if (this.audioPlayer.subscribers.length == 0) this.voiceConnection.subscribe(this.audioPlayer);
    }

    /** Event handler for playing or pausing the music (based on the current state).
     * @param {Discord.User} user The user whose channel to join.
     * @param {SpotifyPlayer} spotifyPlayer The player object for the guild.
     */
    async pausePlayPressed(user) {
        console.info('Music: Play/Pause!');

        this.checkConnection(user);

        /*if (this.playing) {
            this.audioPlayer.pause();
        } else {
            this.audioPlayer.unpause();
        }*/
    }

    /** Event handler for pressing the skip button.
     */
    async skipPressed() {
        console.info('Music: Skip!');
        if (this.voiceChannel) this.audioPlayer.stop();
    }

    /** Event handler for pressing the previous song.
     */
    backPressed() {
        console.info('Music: Previous!');
        let lastSong = spotifyPlayer.oldSongs.pop();
        if (lastSong) {
            console.info('-\tGoing back one song in the queue!');
            spotifyPlayer.songs.push(lastSong);
            spotifyPlayer.skipped = true;
        } else {
            console.info('-\tNo song in the old queue! Cannot go back!');
        }
    }

    /** Adds a youtube url to the queue.
     * @param {Discord.Interacton} interaction The message the command was sent in.
     * @param {String} url The url or the id to be used.
     */
    async addByURL(interaction, url) {
        console.info('-\tAdding the youtube url to queue (if valid) [' + url + ']!');

        if (ytdl.validateURL(url)) {
            let result = await ytdl.getInfo(url);
            if (result) {
                console.info('-\t*\tAdding ' + result.title + ' to the queue! (From url ' + result.video_url + ')');
                spotifyPlayer.songs.unshift({
                    id: result.video_id,
                    title: result.title,
                    img: 'https://i.ytimg.com/vi/' + result.video_id + '/default.jpg',
                });
                interaction.editReply({
                    content: 'Added ' + result.title + ' to the queue!',
                    ephemeral: true,
                });
                this.updateList();
            } else {
                interaction.editReply({ content: 'And error occured: ' + err.toString(), ephemeral: true });
                console.info(err);
            }
        } else {
            interaction.editReply({
                content: 'Not a valid url  ' + argumentString + ', so nothing added!',
                ephemeral: true,
            });
            console.info('Not a valid url');
        }
    }

    /** Searches youtube for music that matches the query, taking the top result.
     * @param {Discord.Interaction} interaction The message the command was sent in.
     * @param {String} argumentString The search term to query youtube for music.
     */
    async addBySearch(interaction, argumentString) {
        console.info('-\t*\tSearching for term on youtube (' + argumentString + ')!');

        let result = await ytSearch({
            query: argumentString,
            pageStart: 1,
            pageEnd: 1,
            category: 'music',
        });

        if (result.videos.length > 0) {
            console.info('-\t*\t\tAdding ' + result.videos[0].title + ' to the queue!');
            this.queue.push(
                new Track({
                    id: result.videos[0].videoId,
                    title: result.videos[0].title,
                    img: 'https://i.ytimg.com/vi/' + result.videos[0].videoId + '/default.jpg',
                })
            );
            console.log(this.queue);
            interaction.editReply({
                content: 'Added ' + result.videos[0].title + ' to the queue!',
                ephemeral: true,
            });
            this.updateList();
        } else {
            interaction.editReply({
                content: 'Could not find a song for  ' + argumentString + ', so nothing added!',
                ephemeral: true,
            });
            console.error('Could not find the query song (' + argumentString + ')!');
        }
    }

    /** Adds the spotify playlist whose name matches the argument string the closest. If no spotify account is associated with the discord account, asks the user to validate it.
     * @param {Discord.Interaction} interaction The interaction the command was sent in.
     * @param {String} argumentString The argument used to try and match to a spotify playlist.
     */
    addBySpotify(interaction, argumentString) {
        console.info('-\tQueuing spotify closest matching string (' + argumentString + ')!');

        if (metaData.accesses.has(interaction.user.id)) {
            console.info('-\tThe user already has a token!');
            interaction.reply({ content: 'Getting your playlist and adding it to the queue!', ephemeral: true });
            getPlaylists(0, interaction, argumentString);
        } else {
            console.info('-\tRequesting the token for the user!');
            interaction.editReply({
                content: 'Connect your spotify account!',
                embeds: [
                    {
                        title: 'Connect your spotify account',
                        description:
                            '[Click here to link your spotify account](' + metaData.auth.root + '/spotifyAuthenticate)',
                        thumbnail: {
                            url: 'https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif',
                        },
                        url: metaData.auth.spotifyDiscordConnectUrl,
                    },
                ],
                ephemeral: true,
            });
        }
    }

    /** A macro to search for (and add if a result is found) songs from a spotify playlist to the queue.
     * @param {String} playlistUrl The spotify api url for the playlist to add the songs from.
     * @param {String} userId The user ID sending the message to get their authentication for their spotify.
     */
    addPlaylistToQ(playlistUrl, userId) {
        fetch(
            playlistUrl,
            {
                headers: {
                    Authorization: 'Bearer ' + metaData.accesses.get(userId).spotifyAccess,
                },
            },
            (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let playlistObject = JSON.parse(body);
                    for (let track of playlistObject.tracks.items) {
                        ytSearch(
                            {
                                query: track.track.name + ' ' + track.track.artists[0].name,
                                pageStart: 1,
                                pageEnd: 1,
                                category: 'music',
                            },
                            (err, r) => {
                                if (!err && r.videos[0]) {
                                    console.info(
                                        '-\t*\t\tAdding ' +
                                            r.videos[0].title +
                                            " to the queue! (From query '" +
                                            track.track.name +
                                            "')"
                                    );
                                    spotifyPlayer.songs.unshift({
                                        id: r.videos[0].videoId,
                                        title: r.videos[0].title,
                                        img: track.track.album.images[1].url,
                                    });
                                } else {
                                    console.info(err);
                                    console.error('-\t*\t\tCould not find the query song (' + track.track.name + ')!');
                                }
                                if (playlistObject.tracks.items[playlistObject.tracks.items.length - 1] == track)
                                    this.updateList();
                            }
                        );
                    }
                } else {
                    console.info('Accessing the users track failed!');
                    console.info(response.statusCode);
                    console.error(error);
                    console.info(body);
                }
            }
        );
    }

    /** Macro for retreiving the list of discord playlists from a given user.
     * @async
     * @param {Number} offset The offset from which to start the search (should start with 0), this is used for recursion.
     * @param {Discord.Interaction} interaction The interaction to get the user sending the message to get their authentication for their spotify.
     * @param {String} argumentString The string used to identify if one of the playlists match the query string.
     */
    async getPlaylists(offset, interaction, argumentString) {
        let userId = interaction.user.id;
        let spotifyResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50&offset=' + offset, {
            headers: {
                Authorization: 'Bearer ' + metaData.accesses.get(userId).spotifyAccess,
            },
        });

        // TODO: fix the spotify bug by using fetches -> and make sure there are no more depreciated rp / request gets in the app, use node fetch throughout

        console.log(spotifyResponse);

        if (spotifyResponse.status == 200) {
            let playlistsContent = await spotifyResponse.json();

            let result = playlistsContent.items.find((playlist) => {
                if (playlist.name.includes(argumentString)) return playlist;
            });

            if (result) {
                console.info("-\tAdding songs of playlist:'" + result.name + "' to queue!");
                addPlaylistToQ(result.href, userId);
            } else {
                await getPlaylists(offset + 50, messageReceived, argumentString);
            }
        } else if (spotifyResponse.status == 401) {
            // if status code 401 token expired, refresh
            if (await refreshToken(userId)) await getPlaylists(offset, messageReceived, argumentString);
            else
                interaction.reply({
                    content: 'Connect your spotify account!',
                    embeds: [
                        {
                            title: 'Connect your spotify account',
                            description:
                                '[Click here to link your spotify account](' +
                                metaData.auth.root +
                                '/spotifyAuthenticate)',
                            thumbnail: {
                                url: 'https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif',
                            },
                            url: metaData.auth.spotifyDiscordConnectUrl,
                        },
                    ],
                    ephemeral: true,
                });
        }
    }

    /** Macro used to refresh the token of the user before they request their playlist.
     * @async
     * @param {String} userId The user ID of the token to refresh.
     */
    async refreshToken(userId) {
        let refreshTokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization:
                    'Basic ' +
                    Buffer.from(metaData.auth.spotifyClientId + ':' + metaData.auth.spotifyClientSecret).toString(
                        'base64'
                    ),
            },
            form: {
                grant_type: 'refresh_token',
                refresh_token: metaData.accesses.get(userId).spotifyRefresh,
            },
            method: 'POST',
        });

        console.log(refreshTokenResponse);

        if (refreshTokenResponse.status == 200) {
            let spotifyAuthContent = await refreshTokenResponse.json();

            let updateAccess = metaData.accesses.get(userId);
            updateAccess.spotifyAccess = spotifyAuthContent.access_token;

            console.info(updateAccess);

            metaData.accesses.set(userId, updateAccess);
            await awsUtils.save(
                'store.mmrree.co.uk',
                'config/AccessMaps.json',
                JSON.stringify(Array.from(metaData.accesses))
            );
            console.info('-\tUpdated the user token!');
            return true;
        } else return false;
    }

    /** Macro for handling updating the message with the player status.
     */
    updateList() {
        console.info('-\tUpdating the music list!');

        if (this.queue.length == 0) {
            this.qMessage.edit(default_message);
        } else if (this.queue.length == 1) {
            this.qMessage.edit({
                content: 'Player',
                embeds: [
                    {
                        title: 'Music Player',
                        description: 'Showing the Queue...',
                        footer: {
                            text: 'The queue is ' + this.queue.length + ' songs long!',
                        },
                        fields: [
                            {
                                name: 'Now Playing:',
                                value: this.queue[this.queue.length - 1].title,
                            },
                        ],
                        image: {
                            url: this.queue[this.queue.length - 1].img,
                        },
                    },
                ],
            });
        } else {
            let songLists = [];
            let workingString = '';

            for (let song of this.queue) {
                if (song != this.queue[this.queue.length - 1]) {
                    if (workingString.length + song.title.length + 5 < 1024) {
                        workingString += '`- ' + song.title + '`\n';
                    } else {
                        songLists.push({
                            name: 'Up Next:',
                            value: workingString,
                        });
                        workingString = '';
                    }
                }
            }

            if (workingString.length > 0) {
                songLists.push({
                    name: 'Up Next:',
                    value: workingString,
                });
            }

            songLists.push({
                name: 'Now Playing:',
                value: this.queue[this.queue.length - 1].title,
            });

            this.qMessage.edit({
                content: 'Player',
                embeds: [
                    {
                        title: 'Music Player',
                        description: 'Showing the Queue...',
                        footer: {
                            text: 'The queue is ' + this.queue.length + ' songs long!',
                        },
                        fields: songLists,
                        image: {
                            url: this.queue[this.queue.length - 1].img,
                        },
                    },
                ],
            });
        }
    }

    initVoiceConnection(voiceConnection) {
        this.voiceConnection = voiceConnection;

        this.voiceConnection.on('stateChange', async (_, newState) => {
            if (newState.status == VoiceConnectionStatus.Disconnected) {
                if (newState.reason == VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                    try {
                        await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
                    } catch {
                        this.voiceConnection.destroy();
                    }
                } else if (this.voiceConnection.rejoinAttempts < 5) {
                    await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
                    this.voiceConnection.rejoin();
                } else {
                    this.voiceConnection.destroy();
                }
            } else if (newState.status == VoiceConnectionStatus.Destroyed) {
                this.stop();
            } else if (
                !this.readyLock &&
                (newState.status == VoiceConnectionStatus.Connecting ||
                    newState.status == VoiceConnectionStatus.Signalling)
            ) {
                this.readyLock = true;
                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (this.voiceConnection.state.status != VoiceConnectionStatus.Destroyed)
                        this.voiceConnection.destroy();
                } finally {
                    this.readyLock = false;
                }
            }
        });
    }

    stop() {
        this.queueLock = true;
        this.queue = [];
        this.audioPlayer.stop(true);
    }

    join(voiceConnection) {
        this.initVoiceConnection(voiceConnection);
        this.voiceConnection.subscribe(this.audioPlayer);
        this.processQueue();
    }

    addPlayableResourceToQueue(resource) {
        this.queue.push(resource);
        this.processQueue();
    }

    async processQueue() {
        if (this.queueLock || this.audioPlayer.state.status != AudioPlayerStatus.Idle || this.queue.length === 0) {
            return;
        }
        this.queueLock = true;

        const nextTrack = this.queue.shift();
        try {
            let resource = await nextTrack.createAudioResource();
            console.log(resource);
            this.audioPlayer.play(resource);
            if (this.audioPlayer.subscribers.length < 1) this.voiceConnection.subscribe(this.audioPlayer);
            this.queueLock = false;
        } catch (error) {
            console.error(error);
        }
    }
};
