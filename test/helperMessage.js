exports.messageReceived = {
    content: 'default content',
    guild: '705758469780799498',
    pinned: false,
    deleted: false,
    reacted: false,
    createdAt: new Date(),
    id: '001',
    channel: {
        id: '705758469780799501',
        messages: {
            array: [],
            fetch: function (options) {
                let messageObject = {
                    content: 'generated by fetch',
                    guild: '705758469780799498',
                    pinned: false,
                    deleted: false,
                    reacted: false,
                    createdAt: new Date(),
                    id: '002',
                    author: {
                        id: '161848310578151424',
                    },
                    react: function () {
                        this.reacted = true;
                    },
                    delete: function () {
                        this.deleted = true;
                    },
                };

                if (typeof options == 'string') {
                    this.fetchedIdMessage = messageObject;
                    return new Promise((resolve, reject) => {
                        resolve(this.fetchedIdMessage);
                    });
                } else {
                    this.array = [];
                    for (let x = 0; x < options.limit; x++) {
                        this.array.push(messageObject);
                    }
                    return new Promise((resolve, reject) => {
                        resolve(this.array);
                    });
                }
            },
        },
        send: function (string) {
            this.receivedMessage = string;
            return new Promise(function (resolve, reject) {
                resolve(this);
            });
        },
    },
    member: {
        roles: {
            cache: new Map(),
        },
    },
    author: {
        username: 'MMRREE',
        id: '161848310578151424',
        send: function (string) {
            this.receivedMessage = string;
            return new Promise(function (resolve, reject) {
                resolve(this);
            });
        },
    },
    delete: function () {
        this.deleted = true;
        return new Promise(function (resolve, reject) {
            resolve(this);
        });
    },
    reply: function (string) {
        this.receivedMessage = '<@!' + this.author.id + '>, ' + string;
        return new Promise(function (resolve, reject) {
            resolve(this);
        });
    },
};
