const Discord = require('discord.js');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const metaData = require('../bot.js');

/** Checks how well the user has done, and then shows that in the channel.
 * @param {Discord.Interaction} interaction The discord interaction the command was sent with.
 * @param {Discord.User} user The user to check.
 */
async function RLStats(interaction, user, playlist_name) {
    console.log(interaction);
    console.log(user);
    console.log(playlist_name);

    let today = new Date();

    let todayISO = today.toISOString().substring(0, 10);

    let steamId = metaData.accesses.get(user.id).steamId;

    let playlist;

    switch (playlist_name) {
        case 'ones':
            playlist = 10;
            break;
        case 'twos':
            playlist = 11;
            break;
        case 'threes':
            playlist = 13;
            break;
        default:
            console.log('running default');
            playlist = 13;
            break;
    }

    if (steamId == null) {
        interaction.reply({
            content:
                'The user you have given does not have a steam linked, head to ' +
                metaData.auth.root +
                '/steamAuthenticate to fix that!',
            ephemeral: true,
        });
    } else {
        let ballchasingResponseRaw = await fetch(
            'https://ballchasing.com/?' +
                'title=' +
                '&player-name=Steam%3A' +
                steamId +
                '&season=' +
                '&min-rank=' +
                '&max-rank=' +
                '&map=' +
                '&replay-after=' +
                todayISO +
                '&replay-before=' +
                todayISO +
                '&upload-after=' +
                '&upload-before=' +
                '&playlist=' +
                playlist,
            {
                method: 'GET',
                mode: 'cors',
            }
        );

        console.log(steamId);

        // Need to figure out how to get the user id used in the tracker
        let rlTrackerUserInfo = await await fetch(
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
        console.log(rlTrackerUserInfoJSON);
        let RLTrackerUserId = rlTrackerUserInfoJSON.data.metadata.playerId;

        //https://steamcommunity.com/profiles/76561198991615060/home
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
        console.log(userStatsResponseJSON);
        let playlistArray = userStatsResponseJSON.data[playlist];
        let todaysStats = playlistArray[playlistArray.length - 1];
        let currentMMR = todaysStats.rating;
        let previousMMR = playlistArray[playlistArray.length - 2].rating;
        let mmrDifference = parseInt(currentMMR) - parseInt(previousMMR);

        let ballchasingResponse = await ballchasingResponseRaw.text();
        let $ = cheerio.load(ballchasingResponse);

        let stats = {
            wins: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            secondsPlayed: 0,
            overtimePlayed: 0,
        };

        if ($('.creplays > li').length > 0) {
            $('.creplays > li').each((index, replay) => {
                console.log(replay);
                // Scores read
                let blueScore = parseInt(/([\d]+)/g.exec(cheerio(replay).find('.score > .blue').text())[1]);
                let orangeScore = parseInt(/([\d]+)/g.exec(cheerio(replay).find('.score > .orange').text())[1]);

                // Minutes played read
                let [minutes, seconds] = cheerio(replay)
                    .find('.main > .extra-info > [title="Duration"]')
                    .text()
                    .split(':');
                stats.secondsPlayed += parseInt(minutes) * 60 + parseInt(seconds);

                // Overtime read (if exists)
                if (cheerio(replay).find('.main > .extra-info > [title="Overtime"]').length != 0) {
                    let [totalOvertime, ...ignore] = cheerio(replay)
                        .find('.main > .extra-info > [title="Overtime"]')
                        .text()
                        .split(' ');
                    let [overtimeMintes, overtimeSeconds] = totalOvertime.split(':');
                    stats.overtimePlayed += parseInt(overtimeMintes) * 60 + parseInt(overtimeSeconds);
                }

                // Win or loss recording and scores based on win or loss
                if (/Win -/g.test(cheerio(replay).find('.main > .row1 > .replay-title').text())) {
                    stats.wins++;
                    stats.goalsFor += blueScore > orangeScore ? blueScore : orangeScore;
                    stats.goalsAgainst += blueScore > orangeScore ? orangeScore : blueScore;
                } else {
                    stats.losses++;
                    stats.goalsFor += blueScore > orangeScore ? orangeScore : blueScore;
                    stats.goalsAgainst += blueScore > orangeScore ? blueScore : orangeScore;
                }

                // Average game rank (find for the latest game)
                if (!stats.rank) {
                    let [rank, ...throwaways] = cheerio(replay)
                        .find('.main > .row1 > .replay-meta > .rank > .player-rank')[0]
                        .attribs.title.split('(');
                    let rankImg = cheerio(replay).find('.main > .row1 > .replay-meta > .rank > .player-rank')[0].attribs
                        .src;
                    stats.rank = rank + ' (Average rank)';
                    stats.rank_img = 'https://ballchasing.com' + rankImg;

                    // User query rank
                    stats.userRank = cheerio(replay).find(
                        '.main > .replay-players > div > div > [href="/player/steam/' + steamId + '"] > img'
                    )[0].attribs.title;

                    stats.userRank_img =
                        'https://ballchasing.com' +
                        cheerio(replay).find(
                            '.main > .replay-players > div > div > [href="/player/steam/' + steamId + '"] > img'
                        )[0].attribs.src;

                    stats.userName = /([\w\d]+)/g.exec(
                        cheerio(replay)
                            .find('.main > .replay-players > div > div > [href="/player/steam/' + steamId + '"]')
                            .text()
                    )[1];
                }
            });

            let discordEmbed = new Discord.MessageEmbed();
            discordEmbed
                .setTitle('Rocket league stats for ' + todayISO)
                .setAuthor(stats.rank, stats.rank_img)
                .addField('Wins', stats.wins, true)
                .addField('Losses', stats.losses, true)
                .addField('MMR Change Today', mmrDifference > 0 ? '+' + mmrDifference : mmrDifference, true)
                .addField('Goals For', stats.goalsFor, true)
                .addField('Goals Against', stats.goalsAgainst, true)
                .addField(
                    'Total Time Played',
                    Math.floor(stats.secondsPlayed / 60).toString() +
                        ':' +
                        (stats.secondsPlayed - 60 * Math.floor(stats.secondsPlayed / 60)).toString(),
                    true
                )
                .setFooter(stats.userName + ' is at ' + currentMMR + ' MMR: ' + stats.userRank, stats.userRank_img);

            if (stats.overtimePlayed != 0) {
                discordEmbed.addField(
                    'Time in OT',
                    Math.floor(stats.overtimePlayed / 60).toString() +
                        ':' +
                        (stats.overtimePlayed - 60 * Math.floor(stats.overtimePlayed / 60)).toString(),
                    true
                );
            }

            interaction.reply({ content: 'Your stats for today:', embeds: [discordEmbed] });
        } else {
            let discordEmbed = new Discord.MessageEmbed();

            let rankString = user.username + ' is at ' + currentMMR + ' MMR: ' + todaysStats.tier;
            console.log(rankString);

            discordEmbed
                .setTitle('Rocket league stats for ' + todayISO)
                .addField('Rank', rankString)
                .addField('MMR Change Today', mmrDifference > 0 ? '+' + mmrDifference : mmrDifference, true);

            interaction.reply({
                content: 'You have not played any RL games today to show stats for!',
                embeds: [discordEmbed],
                ephemeral: true,
            });
        }
    }
}

module.exports = {
    name: 'rlstats',
    description: 'Searches for the rl stats for today.',
    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let playlist_name = interaction.options.getString('playlist');

        RLStats(interaction, user, playlist_name);
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
    ],
};
