const Discord = require('discord.js');
const SpotifyPlayer = require('./music/spotifyPlayer.js');

const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');

/**
 * @var {Map<Discord.Snowflake, SpotifyPlayer} spotifyPlayerMap The object that holds the current spotify connection.
 */
var spotifyPlayerMap = new Map();

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

/** Checks the status of the spotifyPlayer, and if doesnt exists creates one
 * @param {SpotifyPlayer} spotifyPlayer The player to check.
 */

function checkPlayer(spotifyPlayer, user) {
    // If no player object, create one and map it
    if (!spotifyPlayer) {
        spotifyPlayer = new SpotifyPlayer(metaData);
        spotifyPlayerMap.set(user.guild.id, spotifyPlayer);
    }
}

/** Checks to see if the bot is connected to the correct voice channel to play music
 * @param {SpotifyPlayer} spotifyPlayer The spotifyPlayer to check is working.
 * @param {Discord.User} user The user to check if the bot is in the same channel as.
 */
function checkConnection(spotifyPlayer, user) {
    // If not connected, try to connect
    if (!spotifyPlayer.voiceChannel) {
        if (user.voice.channel) {
            let channel = user.voice.channel;
            spotifyPlayer.join(
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                })
            );
            spotifyPlayer.voiceConnection.on('error', console.warn);
        }
    }
}

/** Event handler for playing or pausing the music (based on the current state).
 * @param {Discord.User} user The user whose channel to join.
 * @param {SpotifyPlayer} spotifyPlayer The player object for the guild.
 */
async function pausePlayPressed(user, spotifyPlayer) {
    console.info('Music: Play/Pause!');

    checkPlayer(spotifyPlayer, user);
    checkConnection(spotifyPlayer, user);

    if (spotifyPlayer.playing) {
        spotifyPlayer.audioPlayer.pause();
    } else {
        spotifyPlayer.audioPlayer.unpause();
    }
}

/** Event handler for pressing the skip button.
 */
async function skipPressed(spotifyPlayer) {
    console.info('Music: Skip!');
    if (spotifyPlayer.voiceChannel) spotifyPlayer.audioPlayer.stop();
}

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
                checkPlayer(spotifyPlayer, interaction.member);
                spotifyPlayer?.addByURL(interaction, url);
                break;
            case 'search':
                interaction.deferReply();
                checkPlayer(spotifyPlayer, interaction.member);
                spotifyPlayer?.addBySearch(interaction, search);
                break;
            case 'spotify':
                interaction.deferReply();
                checkPlayer(spotifyPlayer, interaction.member);
                spotifyPlayer?.addBySpotify(interaction, search);
                break;
            case 'play_pause':
                pausePlayPressed(interaction.member, spotifyPlayer);
                interaction.reply({ content: 'Play/paused!', ephemeral: true });
                break;
            case 'skip':
                skipPressed(spotifyPlayer);
                interaction.reply({ content: 'Skipped!', ephemeral: true });
                break;
            case 'back':
                backPressed(spotifyPlayer);
                interaction.reply({ content: 'Went back a song!', ephemeral: true });
                break;
            case 'stop':
                stopPressed(spotifyPlayer);
                interaction.reply({ content: 'Stopped the playback!', ephemeral: true });
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
    ],
};
