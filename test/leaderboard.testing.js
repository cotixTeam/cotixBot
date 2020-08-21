const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

const leaderboard = require('../bot/leaderboard.js');
const metaData = require('../bot.js');
const { messageReceived } = require('./helperMessage.js');

var infoo = console.info;

before(function (done) {
    this.timeout(10 * 1000);
    infoo = console.info;
    console.info = function () {};
    setTimeout(done, 4 * 1000);
});

describe('leaderboard.js suite', function () {
    describe('#addLeaderboard(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.addLeaderboard(messageReceived, ['test', 'This is a test!']);

            expect(messageReceived.channel.receivedMessage).to.equal({
                content: 'test',
                embed: {
                    title: 'test',
                    description: 'This is a test!',
                    fields: [],
                },
            });

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#addPlayer(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.addPlayer(messageReceived, ['<@!161848310578151424>', 'test']);

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#win(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.clearScores(messageReceived, ['test', '<@!161848310578151424>']);

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#winOther(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.winOther(messageReceived, ['test', '<@!161848310578151424>']);

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#clearScores(messageReceived, argString)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.clearScores(messageReceived, 'test');

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#clearUsers(messageReceived, argString)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.clearUsers(messageReceived, 'test');

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#remPlayer(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.addPlayer(messageReceived, ['<@!161848310578151424>', 'test']);

            leaderboard.remPlayer(messageReceived, ['<@!161848310578151424>', 'test']);

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#remLeaderboard(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            leaderboard.remLeaderboard(messageReceived, ['test']);

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });
});

after(function () {
    console.info = infoo;
});
