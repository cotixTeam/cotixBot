const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const fetch = require('node-fetch');
const ytSearch = require('yt-search');
const {
    AudioPlayerStatus,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} = require('@discordjs/voice');

const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');

var spotifyPlayer = {
    songs: [],
    oldSongs: [],
};

/**
 * @var {Map<Discord.Snowflake, SpotifyPlayer} spotifyPlayerMap The object that holds the current spotify connection.
 */
var spotifyPlayerMap = new Map();

class SpotifyPlayer {
    constructor(voiceConnection) {
        this.voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.queue = [];
        this.history = [];
        this.queueLock = false;
        this.readyLock = false;

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

        this.audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                this.processQueue();
            } else if (newState.status === AudioPlayerStatus.Playing) {
            }
        });

        this.audioPlayer.on('error', (error) => console.error(error));

        voiceConnection.subscribe(this.audioPlayer);
    }

    addPlayableResourceToQueue(resource) {
        this.queue.push(resource);
        this.processQueue();
    }

    processQueue() {
        if (this.queueLock || this.audioPlayer.state.status != AudioPlayerStatus.Idle || this.queue.length === 0) {
            return;
        }
        this.queueLock = true;

        const nextTrack = this.queue.shift();
        try {
            this.audioPlayer.play(nextTrack);
            this.queueLock = false;
        } catch (error) {
            console.error(error);
        }
    }
}

/**
 * @var {object} default_message The default message used when restarting the client or clearing the queue.
 */
var default_message = {
    content: 'Player',
    embeds: [
        {
            title: 'Music Player',
            description: 'Showing the Queue...',
            footer: {
                text: 'The queue is ' + spotifyPlayer.songs.length + ' songs long!',
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

/** Plays music through the set up channel. Leaves if the song queue is empty, otherwise updates the meta data.
 */
async function play() {
    if (spotifyPlayer.songs.length == 0) {
        spotifyPlayer.player?.destroy();
    } else {
        spotifyPlayer.stream = ytdl(spotifyPlayer.songs[spotifyPlayer.songs.length - 1].id, {
            quality: 'highestaudio',
            filter: 'audioonly',
        });
        spotifyPlayer.resource = createAudioResource(spotifyPlayer.stream, { inputType: StreamType.Arbitrary });
        spotifyPlayer.player = createAudioPlayer();
        spotifyPlayer.player.play(spotifyPlayer.resource);

        spotifyPlayer.player.on('stateChanged', (oldState, newState) => {
            if (newState.status == AudioPlayerStatus.Idle && oldState.status != AudioPlayerStatus.Idle) {
                if (spotifyPlayer.skipped) {
                    console.info('Song Skipped, starting next song!');
                    spotifyPlayer.skipped = false;
                    spotifyPlayer.playing = true;
                    play();
                } else {
                    console.info('Song finished!');
                    spotifyPlayer.oldSongs.push(spotifyPlayer.songs.pop());
                    if (!spotifyPlayer.songs[spotifyPlayer.songs.length - 1]) {
                        console.info('-\tEnd of queue!');
                        spotifyPlayer.playing = false;
                        if (spotifyPlayer.voiceChannel) spotifyPlayer.player.destroy();
                        spotifyPlayer.voiceChannel = null;
                        spotifyPlayer.voiceConnection = null;
                        spotifyPlayer.player = null;
                        spotifyPlayer.oldSongs = [];
                    }
                }
                updateList();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                console.info('-\tPlaying next song!');
                spotifyPlayer.playing = true;
                play();
            }
        });

        spotifyPlayer.player.on('error', (error) => console.error(error));

        spotifyPlayer.voiceConnection.subscribe(spotifyPlayer.player);
    }
}
/** Initialises the static variables from the config files. Also resets the queue message to update with the empty queue (and adds listeners for the playback).
 * @async
 */
async function init() {
    if (!this.initalised) {
        this.initialised = true;

        let musicChannelLocal = metaData.channels.find((channel) => {
            if (channel.name == 'Music') return channel;
        });

        this.musicChannel = await new Discord.Channel(metaData.bot, {
            id: musicChannelLocal.id,
        }).fetch();

        let mChan = this.musicChannel;

        this.qMessage = await new Discord.Message(metaData.bot, {
            id: musicChannelLocal.embedMessage,
            channel_id: mChan.id,
        }).fetch();

        await this.qMessage.edit(default_message);

        await this.qMessage.reactions.removeAll();
        await this.qMessage.react('◀️');
        await this.qMessage.react('⏯️');
        await this.qMessage.react('🇽');
        await this.qMessage.react('▶️');
        await this.qMessage.react('🔉');
        this.qMessage.react('🔊');

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
        let decrVolListener = this.qMessage.createReactionCollector({
            time: 0,
        });

        let incrVolListener = this.qMessage.createReactionCollector({
            time: 0,
        });

        backListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '◀️' && reaction.count == 2 && user.id != metaData.bot.id) backPressed();
        });
        playPauseListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '⏯️' && reaction.count == 2 && user.id != metaData.bot.id)
                pausePlayPressed(user);
        });
        stopListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '🇽' && reaction.count == 2 && user.id != metaData.bot.id) stopPressed();
        });
        skipListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '▶️' && reaction.count == 2 && user.id != metaData.bot.id) skipPressed();
        });
        decrVolListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '🔉' && reaction.count == 2 && user.id != metaData.bot.id) decrVolPressed();
        });
        incrVolListener.on('collect', (reaction, user) => {
            if (reaction.emoji.name == '🔊' && reaction.count == 2 && user.id != metaData.bot.id) incrVolPressed();
        });
    }
}

/** Event handler for pressing the previous song.
 */
function backPressed() {
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

/** Event handler for playing or pausing the music (based on the current state).
 * @param {Discord.User} user The user whose channel to join.
 */
async function pausePlayPressed(user) {
    console.info('Music: Play/Pause!');

    if (!spotifyPlayer) {
    }
    let spotifyPlayer = new SpotifyPlayer(
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        })
    );

    if (!spotifyPlayer.voiceConnection) {
        console.info('-\tJoining the channel of the user and begining playing!');

        let voiceChannel = this.musicChannel.members.get(user.id).voice.channel;

        if (voiceChannel) {
            let permissions = voiceChannel.permissionsFor(metaData.bot.user);
            if (permissions.has('CONNECT') && permissions.has('SPEAK')) {
                try {
                    spotifyPlayer.voiceChannel = voiceChannel;
                    spotifyPlayer.playing = true;
                    spotifyPlayer.voiceConnection.on('stateChanged', async (_, newState) => {
                        if (newState.status == VoiceConnectionStatus.Disconnected) {
                            if (
                                newState.reason == VoiceConnectionDisconnectReason.WebSocketClose &&
                                newState.closeCode === 4014
                            ) {
                                // Wait to see if it resolves itself (should not try manual recconnection)
                                try {
                                    await entersState(
                                        spotifyPlayer.voiceConnection,
                                        VoiceConnectionStatus.Connecting,
                                        5_000
                                    );
                                } catch {
                                    spotifyPlayer.voiceConnection.destroy();
                                }
                            } else if (spotifyPlayer.voiceConnection.rejoinAttempts < 5) {
                                await wait((spotifyPlayer.voiceConnection.rejoinAttempts + 1) * 5_000);
                                spotifyPlayer.voiceConnection.rejoin();
                            } else {
                                spotifyPlayer.voiceConnection.destroy();
                            }
                        } else if (newState.status == VoiceConnectionStatus.Destroyed) {
                            spotifyPlayer.player.stop(true);
                        } else if (
                            newState.status == VoiceConnectionStatus.Connecting ||
                            newState.status == VoiceConnectionStatus.Signalling
                        ) {
                            try {
                                await entersState(spotifyPlayer.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                            } catch {
                                if (spotifyPlayer.voiceConnection.state.status != VoiceConnectionStatus.Destroyed)
                                    spotifyPlayer.voiceConnection.destroy();
                            }
                        }
                    });

                    play();
                } catch (err) {
                    spotifyPlayer.playing = false;
                    console.error(err);
                }
            } else {
                console.info('-\tUser is not in a channel with permissions for bot! Cannot join!');
                if (user.id != metaData.bot.id)
                    user.send({ content: 'I need permissions to be able to join the voice channel!' });
            }
        } else {
            console.info('-\tUser is not in a channel with permissions for bot! Cannot join!');
            if (user.id != metaData.bot.id) user.send({ content: 'You need to be in a voice channel for me to join!' });
        }
    }
    /*if (spotifyPlayer.playing) {
        console.info('-\tPausing!');
        spotifyPlayer.player.pause();
        spotifyPlayer.playing = false;
    } else if (!spotifyPlayer.playing) {
        console.info('-\tResuming!');
        spotifyPlayer.player.play();
        spotifyPlayer.playing = true;
    }*/
}

/** Event handler for pressing the stop button (it clears the queue).
 */
async function stopPressed() {
    console.info('Music: Stop!');
    spotifyPlayer.songs = [];
    spotifyPlayer.oldSongs = [];
}

/** Event handler for pressing the skip button.
 */
async function skipPressed() {
    console.info('Music: Skip!');
}

/** Event handler for pressing the decrease volume button.
 */
function decrVolPressed() {
    console.info('Music: Decrease Volume!');
    if (spotifyPlayer.volume > 0) spotifyPlayer.volume -= 1;
    //spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
}

/** Event handler for pressing the increase volume button.
 */
async function incrVolPressed() {
    console.info('Music: Increase Volume!');
    if (spotifyPlayer.volume < 20) spotifyPlayer.volume += 1;
    //spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
}

/** Macro for handling updating the message with the player status.
 */
async function updateList() {
    console.info('-\tUpdating the music list!');

    if (spotifyPlayer.songs.length == 0) {
        this.qMessage.edit(default_message);
    } else if (spotifyPlayer.songs.length == 1) {
        this.qMessage.edit({
            content: 'Player',
            embeds: [
                {
                    title: 'Music Player',
                    description: 'Showing the Queue...',
                    footer: {
                        text: 'The queue is ' + spotifyPlayer.songs.length + ' songs long!',
                    },
                    fields: [
                        {
                            name: 'Now Playing:',
                            value: spotifyPlayer.songs[spotifyPlayer.songs.length - 1].title,
                        },
                    ],
                    image: {
                        url: spotifyPlayer.songs[spotifyPlayer.songs.length - 1].image,
                    },
                },
            ],
        });
    } else {
        let songLists = [];
        let workingString = '';

        for (let song of spotifyPlayer.songs) {
            if (song != spotifyPlayer.songs[spotifyPlayer.songs.length - 1]) {
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
            value: spotifyPlayer.songs[spotifyPlayer.songs.length - 1].title,
        });

        this.qMessage.edit({
            content: 'Player',
            embeds: [
                {
                    title: 'Music Player',
                    description: 'Showing the Queue...',
                    footer: {
                        text: 'The queue is ' + spotifyPlayer.songs.length + ' songs long!',
                    },
                    fields: songLists,
                    image: {
                        url: spotifyPlayer.songs[spotifyPlayer.songs.length - 1].image,
                    },
                },
            ],
        });
    }
}

/** Adds a youtube url to the queue.
 * @param {Discord.Interacton} interaction The message the command was sent in.
 * @param {String} url The url or the id to be used.
 */
async function addByURL(interaction, url) {
    await init();
    console.info('-\tAdding the youtube url to queue (if valid) [' + url + ']!');
    if (ytdl.validateURL(url)) {
        ytdl.getInfo(url, (err, data) => {
            if (!err) {
                console.info('-\t*\tAdding ' + data.title + ' to the queue! (From url ' + data.video_url + ')');
                spotifyPlayer.songs.unshift({
                    id: data.video_id,
                    title: data.title,
                    image: 'https://i.ytimg.com/vi/' + data.video_id + '/default.jpg',
                });
                interaction.editReply({ content: 'Added ' + r.videos[0].title + ' to the queue!', ephemeral: true });
                updateList();
            } else {
                interaction.editReply({ content: 'And error occured: ' + err.toString(), ephemeral: true });
                console.info(err);
            }
        });
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
async function addBySearch(interaction, argumentString) {
    await init();
    console.info('-\t*\tSearching for term on youtube (' + argumentString + ')!');

    ytSearch(
        {
            query: argumentString,
            pageStart: 1,
            pageEnd: 1,
            category: 'music',
        },
        (err, r) => {
            if (!err && r.videos.length > 0) {
                console.info('-\t*\t\tAdding ' + r.videos[0].title + ' to the queue!');
                spotifyPlayer.songs.unshift({
                    id: r.videos[0].videoId,
                    title: r.videos[0].title,
                    image: 'https://i.ytimg.com/vi/' + r.videos[0].videoId + '/default.jpg',
                });
                interaction.editReply({ content: 'Added ' + r.videos[0].title + ' to the queue!', ephemeral: true });
                updateList();
            } else {
                console.info(err);
                console.info(r);
                interaction.editReply({
                    content: 'Could not find a song for  ' + argumentString + ', so nothing added!',
                    ephemeral: true,
                });
                console.error('Could not find the query song (' + argumentString + ')!');
            }
        }
    );
}

/** Adds the spotify playlist whose name matches the argument string the closest. If no spotify account is associated with the discord account, asks the user to validate it.
 * @param {Discord.Interaction} interaction The interaction the command was sent in.
 * @param {String} argumentString The argument used to try and match to a spotify playlist.
 */
async function addBySpotify(interaction, argumentString) {
    await init();
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
async function addPlaylistToQ(playlistUrl, userId) {
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
                                    image: track.track.album.images[1].url,
                                });
                            } else {
                                console.info(err);
                                console.error('-\t*\t\tCould not find the query song (' + track.track.name + ')!');
                            }
                            if (playlistObject.tracks.items[playlistObject.tracks.items.length - 1] == track)
                                updateList();
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
async function getPlaylists(offset, interaction, argumentString) {
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

/** Macro used to refresh the token of the user before they request their playlist.
 * @async
 * @param {String} userId The user ID of the token to refresh.
 */
async function refreshToken(userId) {
    let refreshTokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
                'Basic ' +
                Buffer.from(metaData.auth.spotifyClientId + ':' + metaData.auth.spotifyClientSecret).toString('base64'),
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

/** @TODO HAVE TO IMPLEMENT THE MUSIC INTO THIS SECTION -> ALSO LOOK INTO WHY OPUS IS/ IS NOT WORKING */

module.exports = {
    name: 'music',
    description: 'A commands suite for music controls.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();

        let spotifyPlayer = spotifyPlayerMap.get(interaction.guildId);

        let url = interaction.options.getString('url_string');
        let search = interaction.options.getString('search_string');

        switch (sub_command) {
            case 'url':
                interaction.deferReply();
                addByURL(interaction, url);
                break;
            case 'search':
                interaction.deferReply();
                addBySearch(interaction, search);
                break;
            case 'spotify':
                interaction.deferReply();
                addBySpotify(interaction, search);
                break;
            case 'play_pause':
                pausePlayPressed(interaction.user);
                interaction.reply({ content: 'Play/paused!', ephemeral: true });
                break;
            case 'skip':
                skipPressed();
                interaction.reply({ content: 'Skipped!', ephemeral: true });
                break;
            case 'back':
                backPressed();
                interaction.reply({ content: 'Went back a song!', ephemeral: true });
                break;
            case 'stop':
                stopPressed();
                interaction.reply({ content: 'Stopped the playback!', ephemeral: true });
                break;
            case 'volume_up':
                decrVolPressed();
                interaction.reply({ content: "This doesn't work right now!", ephemeral: true });
                break;
            case 'volume_down':
                incrVolPressed();
                interaction.reply({ content: "This doesn't work right now!", ephemeral: true });
                break;
            default:
                interaction.reply('Not yet implemented!');
        }
    },
    options: [
        {
            name: 'queue',
            description: 'Adds a song or songs to the queue to be played.',
            type: 'SUB_COMMAND_GROUP',
            options: [
                {
                    name: 'search',
                    description: 'Add a song from a search query.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'search_string',
                            description: 'The string to search on youtube to add a song from.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'url',
                    description: 'Add a song from a URL.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'url_string',
                            description: 'The url to add a song from.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'spotify',
                    description: 'Adds a playlist from your public spotify playlists.',
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: 'search_string',
                            description: 'The spotify playlist name.',
                            type: 'STRING',
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: 'play_pause',
            description: 'Plays or pauses the song.',
            type: 'SUB_COMMAND',
        },
        {
            name: 'skip',
            description: 'Goes to the next song in the queue.',
            type: 'SUB_COMMAND',
        },
        {
            name: 'back',
            description: 'Goes to the last song played.',
            type: 'SUB_COMMAND',
        },
        {
            name: 'stop',
            description: 'Stops the player and clears the queue.',
            type: 'SUB_COMMAND',
        },
        {
            name: 'volume_up',
            description: 'Turns the player volume up.',
            type: 'SUB_COMMAND',
        },
        {
            name: 'volume_down',
            description: 'Turns the player volume down.',
            type: 'SUB_COMMAND',
        },
    ],
};
