const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const ytSearch = require('yt-search');

const metaData = require('../bot.js');
const awsUtils = require('./awsUtils');

/**
 * @var {object} spotifyPlayer Used to hold the meta-data of the current playback state of the discord music player.
 */
var spotifyPlayer = {
    /** @type {Discord.VoiceChannel} */
    voiceChannel: null,
    /** @type {Discord.VoiceConnection} */
    connection: null,
    /** @type  {Discord.StreamDispatcher} */
    player: null,
    /** @type {object[]} */
    songs: [],
    /** @type {object[]} */
    oldSongs: [],
    /** @type {number} */
    volume: 5,
    /** @type {boolean} */
    playing: false,
    /** @type {boolean} */
    repeat: false,
    /** @type {boolean} */
    skipped: false,
};

/** Plays music through the set up channel. Leaves if the song queue is empty, otherwise updates the meta data.
 */
function play() {
    if (spotifyPlayer.songs.length == 0) {
        spotifyPlayer.voiceChannel.leave();
    } else {
        spotifyPlayer.player = spotifyPlayer.connection.play(
            ytdl(spotifyPlayer.songs[spotifyPlayer.songs.length - 1].id, {
                quality: 'highestaudio',
                filter: 'audioonly',
            })
        );

        spotifyPlayer.player.on('finish', () => {
            if (spotifyPlayer.skipped) {
                console.info('Song Skipped, starting next song!');
                spotifyPlayer.skipped = false;
                spotifyPlayer.playing = true;
                play(spotifyPlayer, musicChannel);
            } else {
                console.info('Song finished!');
                spotifyPlayer.oldSongs.push(spotifyPlayer.songs.pop());
                if (!spotifyPlayer.songs[spotifyPlayer.songs.length - 1]) {
                    console.info('-\tEnd of queue!');
                    spotifyPlayer.playing = false;
                    if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
                    spotifyPlayer.voiceChannel = null;
                    spotifyPlayer.connection = null;
                    spotifyPlayer.player = null;
                    spotifyPlayer.oldSongs = [];
                } else {
                    console.info('-\tPlaying next song!');
                    spotifyPlayer.playing = true;
                    play();
                }
            }
            updateList();
        });

        spotifyPlayer.player.on('error', (error) => console.error(error));
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    }
}
/** Initialises the static variables from the config files. Also resets the queue message to update with the empty queue (and adds listeners for the playback).
 * @async
 */
exports.init = async function init() {
    let musicChannel = metaData.channels.find((channel) => {
        if (channel.name == 'Music') return channel;
    });

    let musicChannelID = musicChannel.id;

    let discordMusicChannel = await new Discord.Channel(metaData.bot, {
        id: musicChannel.id,
    }).fetch();

    var qMessage = await new Discord.Message(
        metaData.bot,
        {
            id: musicChannel.embedMessage,
        },
        discordMusicChannel
    ).fetch();

    await qMessage.edit({
        content: 'Player',
        embed: {
            title: 'Music Player',
            description: 'Showing the Queue...',
            footer: {
                text: 'The queue is ' + spotifyPlayer.songs.length + ' songs long!',
            },
            fields: [
                {
                    name: 'There are no songs in the queue!',
                    value: 'Add one by using !qSearch or !qSpotify',
                },
            ],
        },
    });

    await qMessage.reactions.removeAll();
    await qMessage.react('◀️');
    await qMessage.react('⏯️');
    await qMessage.react('🇽');
    await qMessage.react('▶️');
    await qMessage.react('🔉');
    qMessage.react('🔊');

    let backListener = qMessage.createReactionCollector(
        (reaction, user) => reaction.emoji.name == '◀️' && reaction.count == 2,
        {
            time: 0,
        }
    );
    let playPauseListener = qMessage.createReactionCollector(
        (reaction, user) => reaction.emoji.name == '⏯️' && reaction.count == 2,
        {
            time: 0,
        }
    );
    let stopListener = qMessage.createReactionCollector(
        (reaction, user) => reaction.emoji.name == '🇽' && reaction.count == 2,
        {
            time: 0,
        }
    );
    let skipListener = qMessage.createReactionCollector(
        (reaction, user) => reaction.emoji.name == '▶️' && reaction.count == 2,
        {
            time: 0,
        }
    );
    let decrVolListener = qMessage.createReactionCollector(
        (reaction, user) => reaction.emoji.name == '🔉' && reaction.count == 2,
        {
            time: 0,
        }
    );

    let incrVolListener = qMessage.createReactionCollector(
        (reaction, user) => reaction.emoji.name == '🔊' && reaction.count == 2,
        {
            time: 0,
        }
    );

    backListener.on('collect', (reaction) => backPressed());
    playPauseListener.on('collect', (reaction) => pausePlayPressed(reaction, musicChannelID));
    stopListener.on('collect', (reaction) => stopPressed());
    skipListener.on('collect', (reaction) => skipPressed());
    decrVolListener.on('collect', (reaction) => decrVolPressed());
    incrVolListener.on('collect', (reaction) => incrVolPressed());
};
/** Event handler for pressing the previous song.
 */
function backPressed() {
    console.info('Music: Previous!');
    let lastSong = spotifyPlayer.oldSongs.pop();
    if (lastSong) {
        console.info('-\tGoing back one song in the queue!');
        spotifyPlayer.songs.push(lastSong);
        spotifyPlayer.skipped = true;
        spotifyPlayer.connection.dispatcher.end();
    } else {
        console.info('-\tNo song in the old queue! Cannot go back!');
    }
}

/** Event handler for playing or pausing the music (based on the current state).
 * @param {Discord.MessageReaction} reaction The reaction object to identifiy the user whose channel to join.
 * @param {Discord.VoiceChannel} musicChannelID The channel id to indentify for the music channel to identify who could have clicked the button.
 */
async function pausePlayPressed(reaction, musicChannelID) {
    console.info('Music: Play/Pause!');

    if (spotifyPlayer.playing && spotifyPlayer.connection && spotifyPlayer.connection.dispatcher) {
        console.info('-\tPausing!');
        spotifyPlayer.player.pause();
        spotifyPlayer.playing = false;
    } else if (!spotifyPlayer.playing) {
        if (spotifyPlayer.player && spotifyPlayer.connection && spotifyPlayer.connection.dispatcher) {
            console.info('-\tResuming!');
            spotifyPlayer.player.resume();
            spotifyPlayer.playing = true;
        } else {
            console.info('-\tJoining the channel of the user and begining playing!');
            let user = metaData.bot.channels.cache
                .get(musicChannelID)
                .guild.members.cache.get(reaction.users.cache.last().id);

            let voiceChannel = user.voice.channel;
            if (voiceChannel) {
                let permissions = voiceChannel.permissionsFor(metaData.bot.user);
                if (permissions.has('CONNECT') && permissions.has('SPEAK')) {
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
                    console.info('-\tUser is not in a channel with permissions for bot! Cannot join!');
                    user.send('I need permissions to be able to join the voice channel!');
                }
            } else {
                console.info('-\tUser is not in a channel with permissions for bot! Cannot join!');
                user.send('You need to be in a voice channel for me to join!');
            }
        }
    } else {
        console.info('Dispacter is dead!');
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

/** Event handler for pressing the stop button (it clears the queue).
 */
function stopPressed() {
    console.info('Music: Stop!');
    spotifyPlayer.songs = [];
    spotifyPlayer.oldSongs = [];
    if (spotifyPlayer && spotifyPlayer.connection) {
        spotifyPlayer.connection.dispatcher.end();
    } else {
        console.info('Dispacter is already dead!');
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

/** Event handler for pressing the skip button.
 */
function skipPressed() {
    console.info('Music: Skip!');
    if (spotifyPlayer.connection) {
        spotifyPlayer.connection.dispatcher.end();
    } else {
        console.info('Dispacter is dead!');
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

/** Event handler for pressing the decrease volume button.
 */
function decrVolPressed() {
    console.info('Music: Decrease Volume!');
    if (spotifyPlayer.volume > 0) spotifyPlayer.volume -= 1;
    if (spotifyPlayer.player && spotifyPlayer.connection)
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    else {
        console.info('Dispacter is dead!');
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

/** Event handler for pressing the increase volume button.
 */
function incrVolPressed() {
    console.info('Music: Increase Volume!');
    if (spotifyPlayer.volume < 20) spotifyPlayer.volume += 1;
    if (spotifyPlayer.player && spotifyPlayer.connection)
        spotifyPlayer.player.setVolumeLogarithmic(spotifyPlayer.volume / 10);
    else {
        console.info('Dispacter is dead!');
        spotifyPlayer.playing = false;
        if (spotifyPlayer.voiceChannel) spotifyPlayer.voiceChannel.leave();
        spotifyPlayer.voiceChannel = null;
        spotifyPlayer.connection = null;
        spotifyPlayer.player = null;
    }
}

/** Macro for handling updating the message with the player status.
 */
async function updateList() {
    console.info('-\tUpdating the music list!');

    let musicChannel = metaData.channels.find((channel) => {
        if (channel.name == 'Music') return channel;
    });

    let discordMusicChannel = await new Discord.Channel(metaData.bot, {
        id: musicChannel.id,
    }).fetch();

    var qMessage = await new Discord.Message(
        metaData.bot,
        {
            id: musicChannel.embedMessage,
        },
        discordMusicChannel
    ).fetch();

    if (spotifyPlayer.songs.length == 0) {
        qMessage.edit({
            content: 'Player',
            embed: {
                title: 'Music Player',
                description: 'Showing the Queue...',
                footer: {
                    text: 'The queue is ' + spotifyPlayer.songs.length + ' songs long!',
                },
                fields: [
                    {
                        name: 'There are no songs in the queue!',
                        value: 'Add one by using !qSearch or !qSpotify',
                    },
                ],
            },
        });
    } else if (spotifyPlayer.songs.length == 1) {
        qMessage.edit({
            content: 'Player',
            embed: {
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

        qMessage.edit({
            content: 'Player',
            embed: {
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
        });
    }
}

/** Adds a youtube url to the queue.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String[]} args The list of arguments (the first being a valid youtube url or id).
 */
exports.addByURL = function addByURL(messageReceived, args) {
    console.info('-\tAdding the youtube url to queue (if valid) [' + args[0] + ']!');
    if (ytdl.validateURL(args[0])) {
        ytdl.getInfo(args[0], (err, data) => {
            if (!err) {
                console.info('-\t*\tAdding ' + data.title + ' to the queue! (From url ' + data.video_url + ')');
                spotifyPlayer.songs.unshift({
                    id: data.video_id,
                    title: data.title,
                    image: 'https://i.ytimg.com/vi/' + data.video_id + '/default.jpg',
                });
                updateList();
            }
        });
    }
    messageReceived.delete();
};

/** Searches youtube for music that matches the query, taking the top result.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String} argumentString The search term to query youtube for music.
 */
exports.addBySearch = function addBySearch(messageReceived, argumentString) {
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
                updateList();
            } else {
                console.info(err);
                console.info(r);
                console.error('Could not find the query song (' + argumentString + ')!');
            }
        }
    );
    messageReceived.delete();
};

/** Adds the spotify playlist whose name matches the argument string the closest. If no spotify account is associated with the discord account, asks the user to validate it.
 * @param {Discord.Message} messageReceived The message the command was sent in.
 * @param {String} argumentString The argument used to try and match to a spotify playlist.
 */
exports.qSpotify = function qSpotify(messageReceived, argumentString) {
    console.info('-\tQueuing spotify closest matching string (' + argumentString + ')!');

    if (metaData.accesses.has(messageReceived.author.id)) {
        console.info('-\tThe user already has a token!');
        getPlaylists(0, messageReceived.author.id, argumentString);
    } else {
        console.info('-\tRequesting the token for the user!');
        messageReceived.author.send('Connect your spotify account!', {
            embed: {
                title: 'Connect your spotify account',
                description:
                    '[Click here to link your spotify account](' + metaData.auth.root + '/spotifyAuthenticate)',
                thumbnail: {
                    url: 'https://www.designtagebuch.de/wp-content/uploads/mediathek//2015/06/spotify-logo.gif',
                },
                url: metaData.auth.spotifyDiscordConnectUrl,
            },
        });
    }
    messageReceived.delete();
};

/** A macro to search for (and add if a result is found) songs from a spotify playlist to the queue.
 * @param {String} playlistUrl The spotify api url for the playlist to add the songs from.
 * @param {String} userId The user ID sending the message to get their authentication for their spotify.
 */
function addPlaylistToQ(playlistUrl, userId) {
    rp.get(
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
 * @param {String} userId The user ID sending the message to get their authentication for their spotify.
 * @param {String} argumentString The string used to identify if one of the playlists match the query string.
 */
async function getPlaylists(offset, userId, argumentString) {
    await rp.get(
        'https://api.spotify.com/v1/me/playlists?limit=50&offset=' + offset,
        {
            headers: {
                Authorization: 'Bearer ' + metaData.accesses.get(userId).spotifyAccess,
            },
        },
        async (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let playlistsContent = JSON.parse(body);

                let result = playlistsContent.items.find((playlist) => {
                    if (playlist.name.includes(argumentString)) return playlist;
                });

                if (result) {
                    console.info("-\tAdding songs of playlist:'" + result.name + "' to queue!");
                    addPlaylistToQ(result.href, userId);
                } else {
                    await getPlaylists(offset + 50, userId, argumentString);
                }
            } else if (response.statusCode == 401) {
                console.info('-\tToken expired, refreshing!');
                await refreshToken(userId);
                await getPlaylists(offset, userId, argumentString);
            } else {
                console.info(response.statusCode);
                console.error(error);
                console.info(body);
            }
        }
    );
}

/** Macro used to refresh the token of the user before they request their playlist.
 * @async
 * @param {String} userId The user ID of the token to refresh.
 */
async function refreshToken(userId) {
    await rp.post(
        'https://accounts.spotify.com/api/token',
        {
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
        },
        async (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let spotifyAuthContent = JSON.parse(body);

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
            } else {
                console.info(response.statusCode);
                console.error(error);
                console.info(body);
            }
        }
    );
}

exports.spotifyPlayer = spotifyPlayer;
