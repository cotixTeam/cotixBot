const Express = require('express');
const http = require('http');
const Path = require('path');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');

const music = require('./music.js');
const awsUtils = require('./awsUtils.js');

function discordCallback(req, res, auth) {
    console.log("/discordCallback accessed!");
    var localReq = req;

    rp.post({
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
            var discordAuthContent = JSON.parse(body);

            rp.get('https://discord.com/api/v6/users/@me', {
                headers: {
                    Authorization: "Bearer " + discordAuthContent.access_token
                }
            }, (error, response, body) => {
                if (!error & response.statusCode == 200) {
                    var discordUserContent = JSON.parse(body);

                    rp.post({
                        url: 'https://accounts.spotify.com/api/token',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            Authorization: "Basic " + Buffer.from(auth.spotifyClientId + ":" + auth.spotifyClientSecret).toString('base64')
                        },
                        form: {
                            grant_type: "authorization_code",
                            code: localReq.query.state,
                            redirect_uri: auth.spotifyCallback
                        }
                    }, (error, response, body) => {
                        if (!error & response.statusCode == 200) {
                            let spotifyAuthContent = JSON.parse(body);

                            music.spotifyPlayer.accesses.set(discordUserContent.id, {
                                spotifyCode: localReq.query.state,
                                spotifyRefresh: spotifyAuthContent.refresh_token,
                                spotifyAccess: spotifyAuthContent.access_token,
                                discordCode: localReq.query.code,
                                discordRefresh: discordAuthContent.refresh_token,
                                discordAccess: discordAuthContent.access_token
                            });

                            awsUtils.save("store.mmrree.co.uk", "config/AcessMaps.json", JSON.stringify(Array.from(music.spotifyPlayer.accesses)));
                            console.log("-\tAdded access to Map:");
                            console.log(music.spotifyPlayer.accesses.get(discordUserContent.id));
                        } else {
                            console.log("Failed at https://accounts.spotify.com/api/token");
                            console.log(response.statusCode);
                            console.error(error);
                            console.log(body);
                        }
                    });
                } else {
                    console.log("Failed at https://discord.com/api/v6/users/@me");
                    console.log(response.statusCode);
                    console.error(error);
                    console.log(body);
                }
            });
        } else {
            console.log("Failed at https://discord.com/api/v6/oauth2/token");
            console.log(response.statusCode);
            console.error(error);
            console.log(body);
        }
    });
    res.status(200).sendFile(Path.join(__dirname + "/landing/spotifyLink.html"));
}

exports.init = function (auth) {
    var webhook = Express();

    webhook.set('port', process.env.PORT || 3000);
    webhook.use(bodyParser.json());
    webhook.use(Express.static('public'));
    webhook.use(Express.static('files'));
    webhook.use('/', Express.static(Path.join(__dirname + "/landing/")));

    webhook.get('/spotifyAuthenticate', (req, res) => {
        console.log("/spotifyAuthenticate accessed!");
        res.redirect(auth.spotifyDiscordConnectUrl);
    })

    webhook.get('/spotifyCallback', (req, res) => {
        console.log("/spotifyCallback accessed!");
        res.redirect("https://discord.com/api/v6/oauth2/authorize?" +
            "client_id=" + auth.discordClientId +
            "&redirect_uri=" + encodeURIComponent(auth.discordCallback) +
            "&response_type=code" +
            "&scope=identify" +
            "&prompt=none" +
            "&state=" + req.query.code);
    });

    webhook.get('/discordCallback', (req, res) => discordCallback(req, res, auth));

    http.createServer(webhook).listen(webhook.get('port'), () => {
        console.log("Express server listening on port " + webhook.get("port"));
    });
}