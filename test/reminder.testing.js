const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

const general = require('../bot/leaderboard.js');
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
    describe('#addPlayer(messageReceived, args)', () => {
        it('Check for valid response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            general.sendPlaceholder(messageReceived);

            expect(messageReceived.channel.receivedMessage).to.equal('Placeholder Message');

            messageReceived.channel.receivedMessage = '';
        });
    });
});

after(function () {
    console.info = infoo;
});
