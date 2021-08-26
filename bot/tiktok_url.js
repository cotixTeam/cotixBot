const fetch = require('node-fetch');
const tiktok = require('tiktok-scraper');
const fs = require('fs');
const tiktokDownload = require('node-tiktok-web-api');

let tiktokClient = new tiktokDownload();

module.exports = async function (result) {
    let wholeURL = result[0];
    let shortURL = result[2] != null;
    let url;

    if (shortURL) {
        url = result[2];

        let redirectShortURL = await fetch(wholeURL);

        let redirectURL = redirectShortURL.url;

        let videoResponse = await fetch('https://www.tiktok.com/oembed?url=' + redirectURL);

        let videoResponseJson = await videoResponse.json();

        let videoURLRegex = /((?:https:\/\/)(?:(?:www)|(?:vm))(?:\.tiktok\.com\/)(?:(?:@(\w+)))(?:(?:\/video\/\d+)))/g;

        url = videoURLRegex.exec(videoResponseJson.html)[0];
    } else {
        // Long url, and so has info in it already
        url = result[1];
    }
    console.log(url);

    let tiktokVideo = await tiktok.getVideoMeta(url);

    console.log(tiktokVideo);

    console.log(tiktokVideo.collector[0].videoMeta);

    let data = await tiktokClient.getVideoBase64AndBufferByUrl(url);
    await fs.writeFileSync('test.mp4', data.base64, 'base64');
};
