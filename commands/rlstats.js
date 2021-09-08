const Discord = require('discord.js');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const metaData = require('../bot.js');
const e = require('express');

/** Checks how well the user has done, and then shows that in the channel.
 * @param {Discord.Interaction} interaction The discord interaction the command was sent with.
 * @param {Discord.User} user The user to check.
 */
async function RLStats(interaction, user, playlist_name, username) {
    let today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    let yesterday = new Date();
    yesterday.setUTCHours(0, 0, 0, 0);
    let yesterdayISO = yesterday.toISOString();
    console.log(yesterdayISO);
    let yesterdayISOWeb = yesterdayISO.substring(0, 10);

    let todayISO = today.toISOString();
    console.log(todayISO);
    let todayISOWeb = todayISO.substring(0, 10);

    let steamId = metaData.accesses.get(user.id).steamId;

    let playlistId;
    let playlistName;

    switch (playlist_name) {
        case 'solos':
            playlistId = 10;
            playlistName = 'ranked-duels';
            break;
        case 'twos':
            playlistId = 11;
            playlistName = 'ranked-doubles';
            break;
        case 'threes':
            playlistId = 13;
            playlistName = 'ranked-standard';
            break;
        default:
            console.log('running default');
            playlistId = 13;
            playlistName = 'ranked-standard';
            break;
    }

    if (steamId == null) {
        user.send({
            content:
                'The user you have given does not have a steam linked, head to ' +
                metaData.auth.root +
                '/steamAuthenticate to fix that!',
        });
        interaction.reply({
            content: 'The user queried has to link their steam account to do this!',
            ephemeral: true,
        });
    } else {
        interaction.deferReply();

        /**
         * Start of MMR Difference
         */
        let rlTrackerUserInfo = await fetch(
            'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/' + steamId + '?',
            {
                credentials: 'include',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language': 'en',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'Cache-Control': 'max-age=0',
                },
                referrer: 'https://rocketleague.tracker.network/',
                method: 'GET',
                mode: 'cors',
            }
        );
        let rlTrackerUserInfoJSON = await rlTrackerUserInfo.json();
        let RLTrackerUserId = rlTrackerUserInfoJSON.data.metadata.playerId;

        // then user the user id for the stats and to find the mmr gained or lost
        let userStatsResponse = await fetch(
            'https://api.tracker.gg/api/v1/rocket-league/player-history/mmr/' + RLTrackerUserId,
            {
                credentials: 'include',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
                    Accept: 'application/json, text/plain, */*',
                    'Accept-Language': 'en',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'Cache-Control': 'max-age=0',
                },
                referrer: 'https://rocketleague.tracker.network/',
                method: 'GET',
                mode: 'cors',
            }
        );
        let userStatsResponseJSON = await userStatsResponse.json();

        let playlistArray = userStatsResponseJSON.data[playlistId];
        let todaysStats = playlistArray[playlistArray.length - 1];
        let currentMMR = todaysStats.rating;
        let previousMMR = playlistArray[playlistArray.length - 2].rating;
        let mmrDifference = parseInt(currentMMR) - parseInt(previousMMR);

        /**
         * End of MMR Difference
         */

        /**
         * Start of Replay Analysis
         */

        let uri =
            '&replay-date-after=' + yesterdayISO + '&replay-date-before=' + todayISO + '&playlist=' + playlistName;

        if (username) uri += '&player-name="' + username + '"';
        else uri += '&player-id=Steam%3A' + steamId;

        let ballchasingAPIResponseRaw = await fetch('https://ballchasing.com/api/replays/?' + uri, {
            headers: {
                Authorization: 'ZZrm3Av50XYFihxOW8t24pMeDRgHopHfwJJovVRF',
            },
        });
        let ballchasingAPIResponse = await ballchasingAPIResponseRaw.json();

        let stats = {
            userName: null,
            wins: 0,
            losses: 0,
            assists: 0,
            saves: 0,
            points: 0,
            mvps: 0,
            shots: 0,
            averageFullBoost: 0,
            averageZeroBoost: 0,
            shootingPercent: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalsForTeam: 0,
            goalsAgainstTeam: 0,
            secondsPlayed: 0,
            overtimePlayed: 0,
            rank: null,
            rank_img: null,
            userRank: null,
            userRank_img: null,
        };

        console.log(ballchasingAPIResponse);

        if (ballchasingAPIResponse.list.length <= 0) {
            let discordEmbed = new Discord.MessageEmbed();

            let rankString = user.username + ' is at ' + currentMMR + ' MMR: ' + todaysStats.tier;

            discordEmbed.setTitle('Rocket league stats for ' + todayISOWeb).addField('Rank', rankString);

            if (mmrDifference != 0) {
                discordEmbed.addField(
                    'MMR Change Today',
                    mmrDifference > 0 ? '+' + mmrDifference.toString() : mmrDifference.toString(),
                    true
                );
            }

            interaction.editReply({
                content: 'You have not played any RL games today to show stats for!',
                embeds: [discordEmbed],
                ephemeral: true,
            });
        } else {
            let hasSeenHash = new Map();
            for (let replayOverview of ballchasingAPIResponse.list) {
                await new Promise((resolve) => setTimeout(resolve, 500)); // Sleep for 500 ms before each so as to not overload calls
                let replayFetch = await fetch(replayOverview.link, {
                    headers: {
                        Authorization: 'ZZrm3Av50XYFihxOW8t24pMeDRgHopHfwJJovVRF',
                    },
                });
                let replayFetchJson = await replayFetch.json();
                if (hasSeenHash.has(replayFetchJson.match_guid)) continue;
                else hasSeenHash.set(replayFetchJson.match_guid, true);
                console.log(replayFetchJson);

                // Do the stats addition in here
                stats.secondsPlayed += replayFetchJson.duration;
                if (replayFetchJson.overtime_seconds) stats.overtimePlayed += replayFetchJson.overtime_seconds;

                // Check what team the user was on
                let player;
                if (replayFetchJson.blue.players.some((player) => player.id.id == steamId)) {
                    player = replayFetchJson.blue.players.find((player) => player.id.id == steamId);

                    // Player was on the blue team
                    stats.goalsForTeam += replayFetchJson.blue.stats.core.goals;
                    stats.goalsAgainstTeam += replayFetchJson.orange.stats.core.goals;
                    if (replayFetchJson.blue.stats.core.goals > replayFetchJson.orange.stats.core.goals) {
                        // Blue won
                        stats.wins++;
                    } else {
                        // Orange won
                        stats.losses++;
                    }

                    if (!stats.userName) {
                        stats.userName = player.name;
                        stats.userRank = player.rank.name;
                        stats.userRank_img = 'https://ballchasing.com/static/f2p-ranks-32/' + player.rank.tier + '.png';
                    }
                } else if (replayFetchJson.orange.players.some((player) => player.id.id == steamId)) {
                    player = replayFetchJson.orange.players.find((player) => player.id.id == steamId);

                    // Player was on the orange team
                    stats.goalsForTeam += replayFetchJson.orange.stats.core.goals;
                    stats.goalsAgainstTeam += replayFetchJson.blue.stats.core.goals;
                    if (replayFetchJson.blue.stats.core.goals > replayFetchJson.orange.stats.core.goals) {
                        // Blue won
                        stats.losses++;
                    } else {
                        // Orange won
                        stats.wins++;
                    }
                    if (!stats.userName) {
                        stats.userName = player.name;
                        stats.userRank = player.rank.name;
                        stats.userRank_img = 'https://ballchasing.com/static/f2p-ranks-32/' + player.rank.tier + '.png';
                    }
                }

                stats.goalsFor += player.stats.core.goals;
                stats.assists += player.stats.core.assists;
                stats.points += player.stats.core.score;
                stats.mvps += player.stats.core.mvp ? 1 : 0;
                stats.shots += player.stats.core.shots;
                stats.saves += player.stats.core.saves;
                stats.averageZeroBoost += player.stats.boost.percent_zero_boost;
                stats.averageFullBoost += player.stats.boost.percent_full_boost;

                if (!stats.rank) {
                    stats.rank = replayFetchJson.max_rank.name;
                    stats.rank_img =
                        'https://ballchasing.com/static/f2p-ranks-32/' + replayFetchJson.max_rank.tier + '.png';
                }
            }

            stats.averageFullBoost = stats.averageFullBoost / hasSeenHash.size;
            stats.averageZeroBoost = stats.averageFullBoost / hasSeenHash.size;
            stats.shootingPercent = (stats.goalsFor / stats.shots) * 100;

            let discordEmbed = new Discord.MessageEmbed();

            console.log(stats);
            discordEmbed
                .setTitle('Rocket league stats for ' + todayISOWeb)
                .setAuthor(stats.rank, stats.rank_img)
                .addField('Wins : Losses', stats.wins + ' : ' + stats.losses, true);
            if (mmrDifference != 0) {
                discordEmbed.addField(
                    'MMR Change Today',
                    mmrDifference > 0 ? '+' + mmrDifference.toString() : mmrDifference.toString(),
                    true
                );
            }

            let timePlayedTitle = 'Time Played (mm:ss) ';
            let timePlayedContent =
                Math.floor(stats.secondsPlayed / 60).toString() +
                ':' +
                (stats.secondsPlayed - 60 * Math.floor(stats.secondsPlayed / 60)).toString();
            if (stats.overtimePlayed != 0) {
                timePlayedTitle += '[OT]';
                timePlayedContent +=
                    ' [' +
                    Math.floor(stats.overtimePlayed / 60).toString() +
                    ':' +
                    (stats.overtimePlayed - 60 * Math.floor(stats.overtimePlayed / 60)).toString() +
                    ']';
            }

            discordEmbed
                .addField('Goals For : Against (Team)', stats.goalsForTeam + ' : ' + stats.goalsAgainstTeam, true)
                .addField(
                    'Goals : Shots [%])',
                    stats.goalsFor + ' : ' + stats.shots + ' [' + stats.shootingPercent.toFixed(1) + '%]',
                    true
                )
                .addField(timePlayedTitle, timePlayedContent, true)
                .setFooter(stats.userName + ' is at ' + currentMMR + ' MMR: ' + stats.userRank, stats.userRank_img);

            discordEmbed.addField(
                'Average % at Zero : Full Boost',
                stats.averageZeroBoost.toFixed(1) + ' : ' + stats.averageFullBoost.toFixed(1),
                true
            );

            interaction.editReply({ content: 'Your stats for today:', embeds: [discordEmbed] });
        }
    }
}

module.exports = {
    name: 'rlstats',
    description: 'Searches for the rl stats for today.',
    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let playlist_name = interaction.options.getString('playlist');
        let username = interaction.options.getString('username');

        RLStats(interaction, user, playlist_name, username);
    },
    options: [
        {
            name: 'user',
            description: 'The user to look for their rocket league stats.',
            type: 'USER',
            required: true,
        },
        {
            name: 'playlist',
            description: 'The playlist to check.',
            type: 'STRING',
            required: true,
            choices: [
                {
                    name: 'ones',
                    value: 'solos',
                },
                {
                    name: 'twos',
                    value: 'twos',
                },
                {
                    name: 'threes',
                    value: 'threes',
                },
            ],
        },
        {
            name: 'username',
            description: 'An exact username to search for (overides user).',
            type: 'STRING',
        },
    ],
};
