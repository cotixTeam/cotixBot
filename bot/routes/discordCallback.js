exports.post = function (req, res, auth, self) {
    const request = require('request');
    const Path = require('path');
    const FileSystem = require('fs');

    console.log("/discordCallback accessed!");
    var localReq = req;

    request.post({
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

            request.get('https://discord.com/api/v6/users/@me', {
                headers: {
                    Authorization: "Bearer " + discordAuthContent.access_token
                }
            }, (error, response, body) => {
                if (!error & response.statusCode == 200) {
                    var discordUserContent = JSON.parse(body);

                    request.post({
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

                            self.spotifyData.accesses.set(discordUserContent.id, {
                                spotifyCode: localReq.query.state,
                                spotifyRefresh: spotifyAuthContent.refresh_token,
                                spotifyAccess: spotifyAuthContent.access_token,
                                discordCode: localReq.query.code,
                                discordRefresh: discordAuthContent.refresh_token,
                                discordAccess: discordAuthContent.access_token
                            });

                            FileSystem.writeFileSync(Path.join(__dirname + "/../config/AccessMaps.json"), JSON.stringify(Array.from(self.spotifyData.accesses)));
                            console.log("-\tAdded access to Map:");
                            console.log(self.spotifyData.accesses.get(discordUserContent.id));
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
    res.status(200).sendFile(Path.join(__dirname + "/../config/spotifyLink.html"));
};