"use strict";

const Discord = require('discord.js');
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const awsUtils = require('./awsUtils');

class GeneralClass {
    constructor(client, Channels, userStatsMap) {
        this.bot = client;
        this.Channels = Channels;
        this.userStatsMap = userStatsMap;
    }

    async updateVoiceStats(oldState, newState) {
        if (newState.channelID != oldState.channelID) {
            if (!this.userStatsMap.has(newState.id)) this.userStatsMap.set(newState.id, new Map());

            if (newState.channelID) {
                // If a new state exists, just append the start time to it, this should never be the same as the old state, and so will have no contentions
                this.userStatsMap.get(newState.id).set(newState.channelID, {
                    totalTime: this.userStatsMap.get(newState.id).has(newState.channelID) ?
                        this.userStatsMap.get(newState.id).get(newState.channelID).totalTime : 0,
                    startTime: new Date().getTime(),
                    type: "voice"
                });
            }

            if (oldState.channelID) {
                // If an old state exists, just increment its total time
                let difference = new Date().getTime() - new Date(this.userStatsMap.get(newState.id).get(oldState.channelID).startTime).getTime();

                this.userStatsMap.get(oldState.id).set(oldState.channelID, {
                    totalTime: this.userStatsMap.get(oldState.id).has(oldState.channelID) ?
                        this.userStatsMap.get(oldState.id).get(oldState.channelID).totalTime + difference : 0 + difference,
                    startTime: null,
                    type: "voice"
                });
            }
        }
        awsUtils.save("store.mmrree.co.uk", "stats/Users.json", JSON.stringify(this.convertNestedMapsToStringify(this.userStatsMap)));
        console.log(this.userStatsMap.get(newState.id));
    }

    convertNestedMapsToStringify(map) {
        let listObjects = {};
        for (let [key, value] of map) {
            if (value instanceof Map) {
                listObjects[key] = this.convertNestedMapsToStringify(value);
            } else {
                listObjects[key] = value;
            }
        }
        return listObjects;
    }

    resetStats(messageReceived) {
        this.userStatsMap.delete(messageReceived.author.id);
        awsUtils.save("store.mmrree.co.uk", "stats/Users.json", JSON.stringify(this.convertNestedMapsToStringify(this.userStatsMap)));
        messageReceived.delete();
    }

    async updateMessageStats(messageReceived) {
        if (messageReceived.guild != null) { // If a DM
            if (!this.userStatsMap.has(messageReceived.author.id)) this.userStatsMap.set(messageReceived.author.id, new Map());
            this.userStatsMap.get(messageReceived.author.id).set(messageReceived.channel.id, {
                // If message count then increment, otherwise simply set to 1
                messageCount: this.userStatsMap.get(messageReceived.author.id).has(messageReceived.channel.id) ?
                    this.userStatsMap.get(messageReceived.author.id).get(messageReceived.channel.id).messageCount + 1 : 1,
                type: "text"
            });
        }

        if (/[n]+[i]+[c]+[e]+/gi.test(messageReceived.content)) {
            if (!this.userStatsMap.has(messageReceived.author.id)) this.userStatsMap.set(messageReceived.author.id, new Map());

            // If "niceCount" exists, increment, otherwise set to 1
            this.userStatsMap.get(messageReceived.author.id).set("niceCount", {
                count: this.userStatsMap.get(messageReceived.author.id).has("niceCount") ?
                    this.userStatsMap.get(messageReceived.author.id).get("niceCount").count + 1 : 1
            });
        }

        if (/[l]+[m]+[f]*[a]+[o]+/gi.test(messageReceived.content)) {
            if (!this.userStatsMap.has(messageReceived.author.id)) this.userStatsMap.set(messageReceived.author.id, new Map());

            // If "lmaoCount" exists, increment, otherwise set to 1
            this.userStatsMap.get(messageReceived.author.id).set("lmaoCount", {
                count: this.userStatsMap.get(messageReceived.author.id).has("lmaoCount") ?
                    this.userStatsMap.get(messageReceived.author.id).get("lmaoCount").count + 1 : 1
            });
        }

        awsUtils.save("store.mmrree.co.uk", "stats/Users.json", JSON.stringify(this.convertNestedMapsToStringify(this.userStatsMap)));
        //console.log(this.userStatsMap.get(messageReceived.author.id));
    }

    notImplementedCommand(messageReceived, cmd) {
        console.log("-\tNot implemented!");
        if (new Date().getDay() != 2)
            messageReceived.author
            .send("Hi " + messageReceived.author.username + ",\n'" + cmd + "' is not an implemented command!")
            .then((sentMessage) => {
                messageReceived
                    .reply("is an idiot, he wrote the command: " + messageReceived.content)
                    .then(() => {
                        if (messageReceived.guild != null) messageReceived.delete();
                    });
            });
    }

    stats(messageReceived) {
        if (this.userStatsMap.has(messageReceived.author.id)) {
            console.log(this.userStatsMap.get(messageReceived.author.id))
            let fields = []

            fields.push({
                name: '\u200B',
                value: '\u200B'
            });

            fields.push({
                name: 'Channel Stats Below',
                value: '...'
            });
            this.bot.channels.cache.forEach(serverChannel => {
                this.userStatsMap.get(messageReceived.author.id).forEach((statChannel, statId) => {
                    if (serverChannel.id == statId) {
                        if (statChannel.type == "voice") {

                            function msToTime(duration) {
                                var milliseconds = parseInt((duration % 1000) / 100),
                                    seconds = Math.floor((duration / 1000) % 60),
                                    minutes = Math.floor((duration / (1000 * 60)) % 60),
                                    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

                                seconds = (seconds < 10 && (minutes > 0 || hours > 0)) ? "0" + seconds : seconds;
                                minutes = (minutes < 10 && hours > 0) ? "0" + minutes : minutes;
                                hours = (hours < 10) ? "0" + hours : hours;

                                if (seconds.valueOf() > 0) {
                                    if (minutes.valueOf() > 0) {
                                        if (hours.valueOf() > 0) {
                                            return hours + " hours, " + minutes + " minutes and " + seconds + " seconds";
                                        }
                                        return minutes + " minutes and " + seconds + " seconds";
                                    }
                                    return seconds + " seconds";
                                }
                                return milliseconds + " milliseconds";
                            }

                            fields.push({
                                name: serverChannel.name,
                                value: msToTime(statChannel.totalTime) + " spent in this channel!",
                                inline: true
                            })
                        } else if (statChannel.type == "text") {
                            fields.push({
                                name: serverChannel.name,
                                value: "You sent " + statChannel.messageCount + " messsages in this channel!",
                                inline: true
                            })
                        }
                    }
                });
            });

            fields.push({
                name: '\u200B',
                value: '\u200B'
            });

            fields.push({
                name: 'General Stats Below',
                value: '...'
            });

            this.userStatsMap.get(messageReceived.author.id).forEach((statChannel, statId) => {
                if (statId == "lmaoCount") {
                    fields.push({
                        name: "😂-lmao",
                        value: "You have sent " + statChannel.count + ' "lmao"s!',
                        inline: true
                    })
                } else if (statId == "niceCount") {
                    fields.push({
                        name: "👍-nice",
                        value: "You have sent " + statChannel.count + ' "nice"s!',
                        inline: true
                    })
                } else if (statId == "toxicCount") {
                    fields.push({
                        name: "☣️-toxic",
                        value: "You been toxic " + statChannel.count + ' times!',
                        inline: true
                    })
                }
            })

            messageReceived.author.send({
                "content": "Your statistics",
                "embed": {
                    "title": "Stats",
                    "description": "Showing " + messageReceived.author.username + "'s Stats...",
                    "fields": fields
                }
            });
        } else {
            messageReceived.author.send("You have no stats on record!");
        }
        if (messageReceived.guild != null) messageReceived.delete();
    }

    starWarsResponse(messageReceived) {
        console.log("'" + messageReceived.content + "' (by " + messageReceived.author.username + ") included a star wars string!\n\tResponding with star wars gif");
        rp.get('https://api.tenor.com/v1/search?q=' + "star wars" + '&ar_range=standard&media_filter=minimal&api_key=RRAGVB36GEVU', (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let content = JSON.parse(body)
                let item = Math.floor(Math.random() * content.results.length) // The far right number is the top X results value
                messageReceived.channel.send("Star wars!\n" + content.results[item].url);
            } else {
                console.error(error + " " + response);
            }
        });
    }

    insultResponse(messageReceived) {
        console.log("'" + messageReceived.content + "' (by " + messageReceived.author.username + ") mentioned the bot!\n\tResponding with insult");
        if (new Date().getDay() != 2)
            rp.get('https://evilinsult.com/generate_insult.php?lang=en&type=json', (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    let content = JSON.parse(body)
                    messageReceived.reply(content.insult[0].toLowerCase() + content.insult.slice(1));
                } else {
                    console.error(error + " " + response)
                }
            });
    }

    initCleanChannelsTimouts() {
        // Setting up clean channels at midnight setting
        let cleanChannelDate = new Date();
        cleanChannelDate.setMilliseconds(0);
        cleanChannelDate.setSeconds(0);
        cleanChannelDate.setMinutes(0);
        cleanChannelDate.setHours(0);
        cleanChannelDate.setDate(cleanChannelDate.getDate() + 1);

        setTimeout(this.cleanChannels, cleanChannelDate.getTime() - (new Date()).getTime());
    }

    async initHourlyUpdater() {
        // Setting up an hourly repeated command
        let nextHourDate = new Date();
        nextHourDate.setMilliseconds(0);
        nextHourDate.setSeconds(0);
        nextHourDate.setMinutes(0);
        nextHourDate.setHours(nextHourDate.getHours() + 1);

        setTimeout(this.hourlyUpdate, nextHourDate.getTime() - (new Date()).getTime(), this.hourlyUpdate, this.getFbPosts, this.sendFbPosts, this.Channels, this.bot);
    }


    async getFbPosts(pageUrl, Channels, bot) {
        let requestOptions = {
            url: pageUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:64.0) Gecko/20100101 Firefox/64.0'
            }
        };

        let channel = Channels
            .find((item) => {
                return item.name === "Crushampton"
            });

        if (channel) { // Just make sure the config has been set up properly
            let crushamptonChannel = await new Discord.Channel(bot, {
                id: channel.id
            }).fetch();

            let lastMessage = await new Discord.Message(bot, {
                id: crushamptonChannel.lastMessageId
            }, crushamptonChannel).fetch();

            lastMessage = lastMessage.first();

            if (lastMessage == null) {
                let posts = [];

                let recentPosts = [];
                return rp.get(requestOptions).then(async (postsHtml) => {
                    let $ = cheerio.load(postsHtml);
                    let timeLinePostEls = $('.userContentWrapper').map((i, el) => $(el)).get();
                    let htmlPosts = timeLinePostEls.filter(postObject => {
                        let $post = cheerio.load(postObject.html());
                        let post = $post('.userContent');
                        if (post.text().includes("#Crushampton")) {
                            posts.unshift({
                                text: cheerio.load(post.html().replace(/<(?:p)*?>/gm, '\n').replace(/<(?:br)*?>/gm, '\n').replace(/<(?:.)*?>/gm, '')).text(),
                                url: "https://www.facebook.com" + $post("[data-testid=story-subtitle]")[0].firstChild.firstChild.firstChild.attribs.href,
                                image: $post('.uiScaledImageContainer')[0] ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src : null
                            });
                        };
                    });
                    let morePosts = $('.uiMorePager').map((i, el) => $(el)).get();
                    let link = morePosts.map((link) => {
                        return "https://www.facebook.com" + encodeURI(/ajaxify="([\s\S]+)" href/.exec(link)[1].replace(" ", "").replace(/\"www_/g, "www_"))
                            .replace(/,/g, "%2C")
                            .replace(/&amp;/g, "&")
                            .replace(/%25/g, "%")
                            .replace(/:/g, "%3A")
                            .replace("unit_count=8", "unit_count=100") +
                            "&fb_dtsg_ag" +
                            "&__user=0" +
                            "&__a=1" +
                            "&__dyn=7AgNe5Gmawgrolg9odoyGxu4QjFwn8S2Sq2i5U4e1qzEjyQdxK5WAx-bxWUW16whoS2S4ogU9EdEO0w8kwUx61cw9yEuxm0wpk2u2-263WWwSxu15wgE46fw9C48sz-0JohwKx-8wgolzUOmVo7y1NwRz8cHAy8aEaoGqfwl8cE5S5o9kbxSEtx-2y2O0B8bUbGwCxe1lwlE-7Eoxmm1jxe3C0D888cobEaUe85m" +
                            "&__csr=" +
                            "&__req=4" +
                            "&__beoa=0" +
                            "&__pc=PHASED%3ADEFAULT" +
                            "&dpr=1" +
                            "&__ccg=EXCELLENT" +
                            "&__rev=1002311505" +
                            "&__s=p08z8l%3Aa6jad3%3Azkci3v" +
                            "&__hsi=6844080780314694399-0" +
                            "&__comet_req=0" +
                            "&__spin_r=1002311505" +
                            "&__spin_b=trunk" +
                            "&__spin_t=1593511733";
                    });
                    link = link[0];

                    await rp.get(link, {
                        "credentials": "include",
                        "headers": {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:79.0) Gecko/20100101 Firefox/79.0",
                            "Accept": "*/*",
                            "Accept-Language": "en-US,en;q=0.5"
                        },
                        "referrer": "https://www.facebook.com/pg/Crushampton/posts/",
                        "method": "GET",
                        "mode": "cors"
                    }, (err, res, body) => {
                        if (!err && res.statusCode == 200) {
                            ajax(body);
                        }
                    });

                    async function ajax(body) {
                        let $ = cheerio.load(unescape(JSON.parse('"' + /\_\_html\"\:\"([\s\S]+)\"}]],\"jsmods\"/g.exec(body)[1] + '"')));
                        let timeLinePostEls = $('.userContentWrapper').map((i, el) => $(el)).get();
                        timeLinePostEls.forEach(postObject => {
                            let $post = cheerio.load(postObject.html());
                            let post = $post('.userContent');

                            if (post.text().includes("#Crushampton")) {
                                recentPosts.unshift({
                                    text: cheerio.load(post.html().replace(/<(?:p)*?>/gm, '\n').replace(/<(?:br)*?>/gm, '\n').replace(/<(?:.)*?>/gm, '')).text(),
                                    url: "https://www.facebook.com" + $post("[data-testid=story-subtitle]")[0].firstChild.firstChild.firstChild.attribs.href,
                                    image: $post('.uiScaledImageContainer')[0] ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src : null
                                });
                            };
                        });
                    }

                    for (let post of recentPosts) {
                        htmlPosts.push(post);
                    }

                    return htmlPosts;
                });
            } else {
                return rp.get(requestOptions).then(async (postsHtml) => {
                    let reachedLast = false;
                    let $ = cheerio.load(postsHtml);

                    let posts = [];

                    let recentPosts = [];

                    let timeLinePostEls = $('.userContentWrapper').map((i, el) => $(el)).get();
                    timeLinePostEls.forEach(postObject => {
                        let $post = cheerio.load(postObject.html());
                        let post = $post('.userContent');

                        if (post.text().includes("#Crushampton")) {
                            let regExp = /(?:#Crushampton)*([0-9]+)/;
                            if (regExp.exec(post.text())[1] > regExp.exec(lastMessage.content)[1]) {
                                recentPosts.unshift({
                                    text: cheerio.load(post.html().replace(/<(?:p)*?>/gm, '\n').replace(/<(?:br)*?>/gm, '\n').replace(/<(?:.)*?>/gm, '')).text(),
                                    url: "https://www.facebook.com" + $post("[data-testid=story-subtitle]")[0].firstChild.firstChild.firstChild.attribs.href,
                                    image: $post('.uiScaledImageContainer')[0] ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src : null
                                });
                            } else if (parseInt(regExp.exec(post.text()))[1] > (parseInt(regExp.exec(lastMessage.content)[1]) + 1)) {
                                recentPosts.unshift({
                                    text: cheerio.load(post.html().replace(/<(?:p)*?>/gm, '\n').replace(/<(?:br)*?>/gm, '\n').replace(/<(?:.)*?>/gm, '')).text(),
                                    url: "https://www.facebook.com" + $post("[data-testid=story-subtitle]")[0].firstChild.firstChild.firstChild.attribs.href,
                                    image: $post('.uiScaledImageContainer')[0] ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src : null
                                });
                                reachedLast = true;
                                return;
                            } else {
                                reachedLast = true;
                                return;
                            }
                        };
                    });

                    if (!reachedLast) {
                        // Ajax request for more posts
                        let morePosts = $('.uiMorePager').map((i, el) => $(el)).get();
                        let link = morePosts.map((link) => {
                            return "https://www.facebook.com" + encodeURI(/ajaxify="([\s\S]+)" href/.exec(link)[1].replace(" ", "").replace(/\"www_/g, "www_"))
                                .replace(/,/g, "%2C")
                                .replace(/&amp;/g, "&")
                                .replace(/%25/g, "%")
                                .replace(/:/g, "%3A")
                                .replace("unit_count=8", "unit_count=100") +
                                "&fb_dtsg_ag" +
                                "&__user=0" +
                                "&__a=1" +
                                "&__dyn=7AgNe5Gmawgrolg9odoyGxu4QjFwn8S2Sq2i5U4e1qzEjyQdxK5WAx-bxWUW16whoS2S4ogU9EdEO0w8kwUx61cw9yEuxm0wpk2u2-263WWwSxu15wgE46fw9C48sz-0JohwKx-8wgolzUOmVo7y1NwRz8cHAy8aEaoGqfwl8cE5S5o9kbxSEtx-2y2O0B8bUbGwCxe1lwlE-7Eoxmm1jxe3C0D888cobEaUe85m" +
                                "&__csr=" +
                                "&__req=4" +
                                "&__beoa=0" +
                                "&__pc=PHASED%3ADEFAULT" +
                                "&dpr=1" +
                                "&__ccg=EXCELLENT" +
                                "&__rev=1002311505" +
                                "&__s=p08z8l%3Aa6jad3%3Azkci3v" +
                                "&__hsi=6844080780314694399-0" +
                                "&__comet_req=0" +
                                "&__spin_r=1002311505" +
                                "&__spin_b=trunk" +
                                "&__spin_t=1593511733";
                        });
                        link = link[0];

                        await rp.get(link, {
                            "credentials": "include",
                            "headers": {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:79.0) Gecko/20100101 Firefox/79.0",
                                "Accept": "*/*",
                                "Accept-Language": "en-US,en;q=0.5"
                            },
                            "referrer": "https://www.facebook.com/pg/Crushampton/posts/",
                            "method": "GET",
                            "mode": "cors"
                        }, (err, res, body) => {
                            if (!err && res.statusCode == 200) {
                                ajax(body);
                            }
                        });

                        async function ajax(body) {
                            let $ = cheerio.load(unescape(JSON.parse('"' + /\_\_html\"\:\"([\s\S]+)\"}]],\"jsmods\"/g.exec(body)[1] + '"')));
                            let timeLinePostEls = $('.userContentWrapper').map((i, el) => $(el)).get();
                            timeLinePostEls.forEach(postObject => {
                                let $post = cheerio.load(postObject.html());
                                let post = $post('.userContent');

                                if (post.text().includes("#Crushampton")) {
                                    let regExp = /(?:#Crushampton)*([0-9]+)/;
                                    if (regExp.exec(post.text())[1] > regExp.exec(lastMessage.content)[1]) {
                                        recentPosts.unshift({
                                            text: cheerio.load(post.html().replace(/<(?:p)*?>/gm, '\n').replace(/<(?:br)*?>/gm, '\n').replace(/<(?:.)*?>/gm, '')).text(),
                                            url: "https://www.facebook.com" + $post("[data-testid=story-subtitle]")[0].firstChild.firstChild.firstChild.attribs.href,
                                            image: $post('.uiScaledImageContainer')[0] ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src : null
                                        });
                                    } else if (parseInt(regExp.exec(post.text()))[1] > (parseInt(regExp.exec(lastMessage.content)[1]) + 1)) {
                                        recentPosts.unshift({
                                            text: cheerio.load(post.html().replace(/<(?:p)*?>/gm, '\n').replace(/<(?:br)*?>/gm, '\n').replace(/<(?:.)*?>/gm, '')).text(),
                                            url: "https://www.facebook.com" + $post("[data-testid=story-subtitle]")[0].firstChild.firstChild.firstChild.attribs.href,
                                            image: $post('.uiScaledImageContainer')[0] ? $post('.uiScaledImageContainer')[0].firstChild.attribs.src : null
                                        });
                                        reachedLast = true;
                                        return;
                                    } else {
                                        reachedLast = true;
                                        return;
                                    }
                                };
                            });
                        }
                    }

                    for (let post of recentPosts) {
                        posts.push(post);
                    }
                    return posts;
                });
            }

        } else {
            console.error("No such channel, check the config files!");
        }
    }

    hourlyUpdate(hourlyUpdate, getFbPosts, sendFbPosts, Channels, bot) {
        console.log("Running Hourly Update!");

        getFbPosts('https://www.facebook.com/pg/Crushampton/posts/', Channels, bot).then(posts => {
            sendFbPosts(posts, Channels, bot);
        });
        setTimeout(hourlyUpdate, 60 * 60 * 1000, hourlyUpdate, getFbPosts, sendFbPosts, Channels, bot);
    }

    async sendFbPosts(posts, Channels, bot) {
        let channel = Channels
            .find((item) => {
                return item.name === "Crushampton"
            });

        if (channel) { // Just make sure the config has been set up properly
            let crushamptonChannel = await new Discord.Channel(bot, {
                id: channel.id
            }).fetch();

            let regExp = /(?:#Crushampton)*([0-9]+)/;

            for (let post of posts) {
                console.log("Sending Crushampton post #" + regExp.exec(post.text)[1] + " to the channel!\n" + post.text);
                crushamptonChannel.send({
                    "content": "Crushampton #" + regExp.exec(post.text)[1],
                    "embed": {
                        "title": "#" + regExp.exec(post.text)[1],
                        "description": post.text.replace("#Crushampton" + regExp.exec(post.text)[1], "").replace("Mehr ansehen", "").replace("See more", ""),
                        "url": post.url,
                        "author": {
                            "name": "Crushampton",
                            "icon_url": "https://scontent.fzrh3-1.fna.fbcdn.net/v/t1.0-9/61258631_2477108982524094_1497858827888885760_n.png?_nc_cat=106&_nc_sid=85a577&_nc_oc=AQn8bVmgCgcTE0Ufn8mCp2dNhOHBhwn9fcg5WL4ZQxGgqa2eMFbe37JnEglgns9K1JONfjsXcrek0Hm524JxhsGy&_nc_ht=scontent.fzrh3-1.fna&oh=cf2fafc50f5afe2c6185056c09300032&oe=5F20EA6A"
                        },
                        "image": {
                            "url": post.image
                        }
                    }
                });
            }

        } else {
            console.error("No such channel, check the config files!");
        }
    }

    cleanChannels() {
        async function clean(bot, Channels) {
            let cleanChannelArray = bot.channels.cache.filter(channel => {
                if (channel.type == "text") return channel;
            });

            for (let queryChannel of Channels) {
                if (queryChannel.keepClean) {
                    console.log("Cleaning channel " + queryChannel.name + " (" + queryChannel.id + ")!");

                    await cleanChannelArray.find((item) => {
                            if (item.id == queryChannel.id) return true;
                        }).messages.fetch({
                            limit: 100
                        })
                        .then((messageArray) => {
                            messageArray.each(message => {
                                if (!message.pinned) message.delete();
                            });
                        }).then(() => {
                            // Create a timer for 24 hours to repeat the task
                            setTimeout(clean, 24 * 60 * 60 * 1000, bot, Channels);
                        }).catch((err) => {
                            console.error(err);
                        });
                }
            }
        }
        clean(this.bot, this.Channels);
    }

    bulkDelete(messageReceived, args) {
        console.log("-\tBulkDelete invoked, checking permissions!");
        let adminRoles = ["668465816894832641", "705760947721076756"]
        let permissionsFound = messageReceived.member.roles._roles.array().some((role) => adminRoles.includes(role.id));

        if (messageReceived.guild != null) messageReceived.delete();

        if (permissionsFound) {
            let messageCount = parseInt(args[0]);

            // Plus one to the message count to INCLUDE the message just sent
            if (messageCount + 1 > 100) messageCount = 100;
            else if (messageCount <= 0) messageCount = 1;

            console.log("\tPermissions are correct, deleting " + messageCount + " messages!");

            messageReceived.channel.messages
                .fetch({
                    limit: messageCount,
                    before: messageReceived.id
                })
                .then((messageArray) => {
                    messageArray.each(message => {
                        if (!message.pinned) message.delete();
                    });
                }).catch((err) => {
                    console.error(err);
                });
        } else {
            console.log("\tUser does not have the required permissions!")
            messageReceived.author
                .send("Hi " + messageReceived.author.username + ",\nYou do not have the permissions for the bulkDelete command!");
        }
    }

    help(messageReceived) {
        console.log("-\tSending a help list of all the commands to the user!");
        let message = "List of commands:";
        let commandList = require('./commands').list;

        let lastChannel = commandList[0].channel;

        for (let command of commandList) {
            if (message.length + 250 < 2000) {
                if (command.channel != lastChannel) {
                    message += "\n";
                    lastChannel = command.channel;
                }
                message += "\n`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
            } else {
                messageReceived.author
                    .send(message);
                message = "`" + command.channel + "`-`" + command.name + " " + command.arguments + "` = " + command.description;
            }
        }
        messageReceived.author
            .send(message);
        if (messageReceived.guild != null) messageReceived.delete();
    }

    eightBall(messageReceived, argumentString) {
        console.log("-\tResponding with an 8 ball prediction!");
        let responses = ["As I see it, yes.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.", "Don’t count on it.", "It is certain.", "It is decidedly so.", "Most likely.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Outlook good.", "Reply hazy, try again.", "Signs point to yes.", "Very doubtful.", "Without a doubt.", "Yes.", "Yes – definitely.", "You may rely on it."]
        let randomNumber = Math.floor(Math.random() * responses.length);
        messageReceived
            .reply("you asked '" + argumentString + "'...\n" + responses[randomNumber]);
    }

    camel(messageReceived, argumentString) {
        console.log("-\tResponding with cAmEl FoNt!");
        let camelString = "";
        let camelIndex = 0;

        for (let i = 0; i < argumentString.length; i++) {
            if (argumentString.charAt(i) == " ") {
                camelString += " ";
            } else if (camelIndex % 2 == 0) {
                camelIndex++;
                camelString += argumentString.charAt(i).toLowerCase();
            } else {
                camelIndex++;
                camelString += argumentString.charAt(i).toUpperCase();
            }
        }

        messageReceived.channel
            .send("> " + camelString + "\n- <@!" + messageReceived.author.id + ">");

        if (messageReceived.guild != null) messageReceived.delete();
    }

    quote(messageReceived, args) {
        let userId = args[0].substring(3, 21);
        args = args.splice(1);
        let quoteString = args.join(' ');

        console.log("-\tQuote the string:" + quoteSting + " (by " + userId + ")!");

        this.quoteMacro(quoteString, userId, null);
        if (messageReceived.guild != null) messageReceived.delete();
    }

    quoteId(messageReceived, args) {
        let regexURIQuote = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

        let quoteMatch = args[0].match(regexURIQuote)

        console.log("-\tQuoting the id'd message (" + quoteMatch + ")!");

        if (quoteMatch) {
            messageReceived.channel.messages
                .fetch(quoteMatch[quoteMatch.length - 1])
                .then((toxicMessage) => {
                    this.quoteMacro(toxicMessage.content, toxicMessage.author.id, toxicMessage.createdAt);
                }).catch((err) => {
                    console.error(err)
                })
        }

        if (messageReceived.guild != null) messageReceived.delete();
    }

    quoteMessage(messageReceived, argumentString) {
        console.log("-\tSearching for the message to quote (" + argumentString + ")!");
        messageReceived.channel.messages
            .fetch({
                limit: 20
            })
            .then((messageArray) => {
                messageArray.each((message) => {
                    if (message.content.includes(argumentString) && message != messageReceived) {
                        this.quoteMacro(message.content, message.author.id, message.createdAt);
                    }
                });
            }).catch(err => console.error(err));
        if (messageReceived.guild != null) messageReceived.delete();
    }

    quoteMacro(quoteMessageContent, userId, time) {
        for (let channel of this.Channels) {
            if (channel.name == "Quotes") {
                new Discord.Channel(this.bot, {
                        id: channel.id
                    })
                    .fetch()
                    .then((quotesChannel) => {
                        let today = time ? time : new Date();
                        let dateString = today.getHours() + ":" + today.getMinutes() + " on " + today.getDate() + "/" + (today.getMonth() + 1) + "/" + today.getFullYear();
                        quoteMessageContent = quoteMessageContent.split("\n").join("\n> "); // Looks dumb, is the best way to replace all instances of "\n" by something else strangely
                        quotesChannel.send("> " + quoteMessageContent + "\nBy <@!" + userId + "> at " + dateString);
                    }).catch(err => {
                        console.log(err);
                    })
            }
        }
    }

    async toxicMacro(toxicMessage) {
        console.log(toxicMessage.author.id);

        if (!this.userStatsMap.has(toxicMessage.author.id)) this.userStatsMap.set(toxicMessage.author.id, new Map());
        this.userStatsMap.get(toxicMessage.author.id).set("toxicCount", {
            count: this.userStatsMap.get(toxicMessage.author.id).has("toxicCount") ?
                this.userStatsMap.get(toxicMessage.author.id).get("toxicCount").count + 1 : 1
        });

        await toxicMessage.react('🇹');
        await toxicMessage.react('🇴');
        await toxicMessage.react('🇽');
        await toxicMessage.react('🇮');
        await toxicMessage.react('🇨');
    }

    toxicId(messageReceived, args) {
        let regexURIToxic = new RegExp("(https:\/\/discordapp\.com\/channels\/[1-9][0-9]{0,18}\/[1-9][0-9]{0,18}\/)?([1-9][0-9]{0,18})")

        let matchToxic = args[0].match(regexURIToxic)
        console.log("-\tMarking the id'd message as toxic (" + matchToxic[1] + ")!");

        if (matchToxic) {
            messageReceived.channel.messages
                .fetch(matchToxic[matchToxic.length - 1])
                .then((toxicMessage) => {
                    this.toxicMacro(toxicMessage);
                }).catch((err) => {
                    console.error(err)
                })
        }
        if (messageReceived.guild != null) messageReceived.delete();
    }

    toxic(messageReceived, argumentString) {
        console.log("-\tSearching for the message to mark as toxic (" + argumentString + ")!");
        messageReceived.channel.messages
            .fetch({
                limit: 20
            })
            .then((messageArray) => {
                messageArray.each((message) => {
                    if (message.content.includes(argumentString) && message != messageReceived) {
                        this.toxicMacro(message);
                    }
                });
            }).catch(err => console.error(err));
        if (messageReceived.guild != null) messageReceived.delete();
    }

    sendPlaceholder(messageReceived) {
        console.log("-\tSending placeholder!");
        messageReceived.channel.send('Placeholder Message');
        if (messageReceived.guild != null) messageReceived.delete();
    }
}

module.exports = {
    GeneralClass: GeneralClass
};