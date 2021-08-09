const Express = require('express');
const http = require('http');
const Path = require('path');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const openid = require('openid');

const metaData = require('../bot.js');
const awsUtils = require('../bot/awsUtils.js');

/** Callback used for connecting a discord account and a spotify account.
 * @param {Object} req The request values used in accessing the page.
 * @param {Object} res The response values to be set before responding.
 */
function discordSpotifyCallback(req, res) {
    console.info('/discordSpotifyCallback accessed!');
    var localReq = req;

    rp.post(
        {
            url: 'https://discord.com/api/v6/oauth2/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            formData: {
                client_id: metaData.auth.discordClientId,
                client_secret: metaData.auth.discordClientSecret,
                grant_type: 'authorization_code',
                code: req.query.code,
                redirect_uri: metaData.auth.root + '/discordSpotifyCallback',
                scope: 'identify',
            },
        },
        (error, response, body) => {
            if (!error & (response.statusCode == 200)) {
                var discordAuthContent = JSON.parse(body);

                fetch(
                    'https://discord.com/api/v6/users/@me',
                    {
                        headers: {
                            Authorization: 'Bearer ' + discordAuthContent.access_token,
                        },
                    },
                    (error, response, body) => {
                        if (!error & (response.statusCode == 200)) {
                            var discordUserContent = JSON.parse(body);

                            rp.post(
                                {
                                    url: 'https://accounts.spotify.com/api/token',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        Authorization:
                                            'Basic ' +
                                            Buffer.from(
                                                metaData.auth.spotifyClientId + ':' + metaData.auth.spotifyClientSecret
                                            ).toString('base64'),
                                    },
                                    form: {
                                        grant_type: 'authorization_code',
                                        code: localReq.query.state,
                                        redirect_uri: metaData.auth.root + '/spotifyAuthenticate',
                                    },
                                },
                                (error, response, body) => {
                                    if (!error & (response.statusCode == 200)) {
                                        let spotifyAuthContent = JSON.parse(body);

                                        // This prevents overriding other data that is not these keys
                                        let updatedAcesses = metaData.accesses.has(discordUserContent.id)
                                            ? metaData.accesses.get(discordUserContent.id)
                                            : {};

                                        updatedAcesses.spotifyCode = localReq.query.state;
                                        updatedAcesses.spotifyRefresh = spotifyAuthContent.refresh_token;
                                        updatedAcesses.spotifyAccess = spotifyAuthContent.access_token;

                                        updatedAcesses.discordCode = localReq.query.code;
                                        updatedAcesses.discordRefresh = discordAuthContent.refresh_token;
                                        updatedAcesses.discordAccess = discordAuthContent.access_token;

                                        metaData.accesses.set(discordUserContent.id, updatedAcesses);

                                        awsUtils.save(
                                            'store.mmrree.co.uk',
                                            'config/AccessMaps.json',
                                            JSON.stringify(Array.from(metaData.accesses))
                                        );
                                        console.info('-\tAdded access to Map:');
                                        console.info(metaData.accesses.get(discordUserContent.id));
                                    } else {
                                        console.info('Failed at https://accounts.spotify.com/api/token');
                                        console.info(response.statusCode);
                                        console.error(error);
                                        console.info(body);
                                    }
                                }
                            );
                        } else {
                            console.info('Failed at https://discord.com/api/v6/users/@me');
                            console.info(response.statusCode);
                            console.error(error);
                            console.info(body);
                        }
                    }
                );
            } else {
                console.info('Failed at https://discord.com/api/v6/oauth2/token');
                console.info(response.statusCode);
                console.error(error);
                console.info(body);
            }
        }
    );
    res.status(200).sendFile(Path.join(__dirname + '/landing/spotifyLink.html'));
}

/** Callback used for connecting a discord account and a steam account.
 * @param {Object} req The request values used in accessing the page.
 * @param {Object} res The response values to be set before responding.
 */
function discordSteamCallback(req, res) {
    console.info('/discordSteamCallback accessed!');
    var localReq = req;

    rp.post(
        {
            url: 'https://discord.com/api/v6/oauth2/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            formData: {
                client_id: metaData.auth.discordClientId,
                client_secret: metaData.auth.discordClientSecret,
                grant_type: 'authorization_code',
                code: req.query.code,
                redirect_uri: metaData.auth.root + '/discordSteamCallback',
                scope: 'identify',
            },
        },
        (error, response, body) => {
            if (!error & (response.statusCode == 200)) {
                var discordAuthContent = JSON.parse(body);

                fetch(
                    'https://discord.com/api/v6/users/@me',
                    {
                        headers: {
                            Authorization: 'Bearer ' + discordAuthContent.access_token,
                        },
                    },
                    (error, response, body) => {
                        if (!error & (response.statusCode == 200)) {
                            var discordUserContent = JSON.parse(body);

                            // This prevents overriding other data that is not these keys
                            let updatedAcesses = metaData.accesses.has(discordUserContent.id)
                                ? metaData.accesses.get(discordUserContent.id)
                                : {};

                            updatedAcesses.steamId = localReq.query.state;

                            updatedAcesses.discordCode = localReq.query.code;
                            updatedAcesses.discordRefresh = discordAuthContent.refresh_token;
                            updatedAcesses.discordAccess = discordAuthContent.access_token;

                            metaData.accesses.set(discordUserContent.id, updatedAcesses);

                            awsUtils.save(
                                'store.mmrree.co.uk',
                                'config/AccessMaps.json',
                                JSON.stringify(Array.from(metaData.accesses))
                            );
                            console.info('-\tAdded access to Map:');
                            console.info(metaData.accesses.get(discordUserContent.id));
                        } else {
                            console.info('Failed at https://discord.com/api/v6/users/@me');
                            console.info(response.statusCode);
                            console.error(error);
                            console.info(body);
                        }
                    }
                );
            } else {
                console.info('Failed at https://discord.com/api/v6/oauth2/token');
                console.info(response.statusCode);
                console.error(error);
                console.info(body);
            }
        }
    );

    res.status(200).sendFile(Path.join(__dirname + '/landing/steamLink.html'));
}

/** Initialises the webhooks used to authenticate different accounts with their discord account.
 */
exports.init = function () {
    var webhook = Express();

    webhook.set('port', process.env.PORT || 3000);
    webhook.use(bodyParser.json());

    webhook.get('/', (req, res) => {
        res.send("Thanks for checking I'm alive!");
    });

    webhook.get('/spotifyAuthenticate', (req, res) => {
        console.info('/spotifyAuthenticate accessed!');
        res.redirect(metaData.auth.spotifyDiscordConnectUrl);
    });

    webhook.get('/spotifyCallback', (req, res) => {
        console.info('/spotifyCallback accessed!');
        res.redirect(
            'https://discord.com/api/v6/oauth2/authorize?' +
                'client_id=' +
                metaData.auth.discordClientId +
                '&redirect_uri=' +
                encodeURIComponent(metaData.auth.root + '/discordCallback') +
                '&response_type=code' +
                '&scope=identify' +
                '&prompt=none' +
                '&state=' +
                req.query.code
        );
    });

    webhook.get('/discordSpotifyCallback', (req, res) => discordSpotifyCallback(req, res));

    let relyParty = new openid.RelyingParty(metaData.auth.root + '/steamCallback', metaData.auth.root, true, true, []);
    relyParty.authenticate('https://steamcommunity.com/openid', false, (error, authURL) =>
        webhook.get('/steamAuthenticate', (req, res) => {
            res.redirect(authURL);
        })
    );

    webhook.get('/steamCallback', (req, res) => {
        console.info('/steamCallback accessed!');
        let regExp = /https:\/\/steamcommunity.com\/openid\/id\/([0-9]+)/g;
        let steamProfile = regExp.exec(req.query['openid.identity'])[1];
        res.redirect(
            'https://discord.com/api/oauth2/authorize?' +
                'client_id=' +
                metaData.auth.discordClientId +
                '&redirect_uri=' +
                encodeURIComponent(metaData.auth.root + '/discordSteamCallback') +
                '&response_type=code' +
                '&scope=identify' +
                '&prompt=none' +
                '&state=' +
                steamProfile
        );
    });

    webhook.get('/discordSteamCallback', (req, res) => discordSteamCallback(req, res));

    http.createServer(webhook).listen(webhook.get('port'), () => {
        console.info('Express server listening on port ' + webhook.get('port'));
    });
};
