const ytdl = require('ytdl-core');
const { createAudioResource, demuxProbe } = require('@discordjs/voice');

module.exports = class Track {
    constructor({ id, title, img, onStart, onFinish, onError }) {
        this.id = id;
        this.title = title;
        this.img = img;
        this.onStart = onStart;
        this.onFinish = onFinish;
        this.onError = onError;
    }

    /**
     * Creates an AudioResource from this Track.
     * @returns A promise containing the audio resource as a payload.
     */
    createAudioResource() {
        return new Promise((resolve, reject) => {
            let process = ytdl(this.id, {
                quality: 'highestaudio',
                filter: 'audioonly',
            });

            resolve(createAudioResource(process, { metadata: this }));
        });
    }

    /**
     * Creates a Track from a video URL and lifecycle callback methods.
     * @param url The URL of the video
     * @param methods Lifecycle callbacks
     * @returns The created Track
     */
    async from(url, methods) {
        const info = await getInfo(url);
        const wrappedMethods = {
            onStart() {
                wrappedMethods.onStart = noop;
                methods.onStart();
            },
            onFinish() {
                wrappedMethods.onFinish = noop;
                methods.onFinish();
            },
            onError(error) {
                wrappedMethods.onError = noop;
                methods.onError(error);
            },
        };

        return new Track({
            title: info.videoDetails.title,
            url,
            ...wrappedMethods,
        });
    }
};
