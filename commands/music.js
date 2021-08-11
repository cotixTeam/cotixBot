const Discord = require('discord.js');
const SpotifyPlayer = require('./music/spotifyPlayer.js');

const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');

/**
 * @var {Map<Discord.Snowflake, SpotifyPlayer} spotifyPlayerMap The object that holds the current spotify connection.
 */
var spotifyPlayerMap = new Map();

/** Checks the status of the spotifyPlayer, and if doesnt exists creates one
 * @param {SpotifyPlayer} spotifyPlayer The player to check.
 */

function checkPlayer(spotifyPlayer, interaction) {
    // If no player object, create one and map it
    if (!spotifyPlayer) {
        spotifyPlayer = new SpotifyPlayer(metaData, interaction);
        spotifyPlayerMap.set(interaction.member.guild.id, spotifyPlayer);
        return true;
    }
    return false;
}

module.exports = {
    name: 'music',
    description: 'A commands suite for music controls.',
    async execute(interaction) {
        let sub_command = interaction.options.getSubcommand();

        let spotifyPlayer = spotifyPlayerMap.get(interaction.guildId);

        let url = interaction.options.getString('url_string');
        let search = interaction.options.getString('search_string');

        let playerCreated = checkPlayer(spotifyPlayer, interaction);
        await interaction.deferReply();

        switch (sub_command) {
            case 'url':
                spotifyPlayer?.addByURL(interaction, url);
                break;
            case 'search':
                spotifyPlayer?.addBySearch(interaction, search);
                break;
            case 'spotify':
                spotifyPlayer?.addBySpotify(interaction, search);
                break;
            case 'play_pause':
                spotifyPlayer?.pausePlayPressed(interaction.member);
                interaction.editReply({ content: 'Play/paused!', ephemeral: true });
                break;
            case 'skip':
                spotifyPlayer?.skipPressed();
                interaction.editReply({ content: 'Skipped!', ephemeral: true });
                break;
            case 'back':
                spotifyPlayer?.backPressed();
                interaction.editReply({ content: 'Went back a song!', ephemeral: true });
                break;
            case 'stop':
                spotifyPlayer?.stopPressed();
                interaction.editReply({ content: 'Stopped the playback!', ephemeral: true });
                break;
            case 'test':
                interaction.editReply('Testing with constructor!');
                break;
            default:
                interaction.editReply('Not yet implemented!');
        }

        if (playerCreated) {
            interaction.editReply({
                content: 'Music Initialised!',
                ephemeral: true,
            });
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
            name: 'test',
            description: 'tests.',
            type: 'SUB_COMMAND',
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
