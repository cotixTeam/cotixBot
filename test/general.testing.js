const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();

const general = require('../bot/general.js');
const metaData = require('../bot.js');
const { messageReceived } = require('./helperMessage.js');

var infoo = console.info;

before(function (done) {
    this.timeout(10 * 1000);
    infoo = console.info;
    console.info = function () {};
    setTimeout(done, 4 * 1000);
});

describe('general.js suite', function () {
    describe('#toggleModerator(messageReceived)', async () => {
        let pseudoMod = '729306365562191912';
        let moderator = '730778077386506250';

        it('Roles unchanged [incorrect permissions]', async () => {
            messageReceived.deleted = false;

            expect(messageReceived.member.roles.cache).to.not.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.not.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.false;

            await general.toggleModerator(messageReceived);

            expect(messageReceived.member.roles.cache).to.not.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.not.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
        });

        it('Remove mod, add pseudoAdmin [mod]', async () => {
            messageReceived.member.roles.cache.set(moderator);
            messageReceived.deleted = false;

            expect(messageReceived.member.roles.cache).to.not.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.false;

            await general.toggleModerator(messageReceived);

            expect(messageReceived.member.roles.cache).to.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.not.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
        });

        it('Add mod [pseudoAdmin]', async () => {
            messageReceived.deleted = false;

            expect(messageReceived.member.roles.cache).to.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.not.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.false;

            await general.toggleModerator(messageReceived);

            expect(messageReceived.member.roles.cache).to.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
        });

        it('Remove mod [mod, pseudoAdmin]', async () => {
            messageReceived.deleted = false;

            expect(messageReceived.member.roles.cache).to.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.false;

            await general.toggleModerator(messageReceived);

            expect(messageReceived.member.roles.cache).to.have.any.keys(pseudoMod);
            expect(messageReceived.member.roles.cache).to.not.have.any.keys(moderator);
            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
        });
    });

    describe('>.stats', async () => {
        describe('#updateMessageStats(messageReceived)', async () => {
            it('Increments "messageCount"', async () => {
                let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get(messageReceived.channel.id)
                    .messageCount;

                await general.updateMessageStats(messageReceived);

                expect(
                    metaData.userStatsMap.get(messageReceived.author.id).get(messageReceived.channel.id).messageCount
                ).to.equal(currentCount + 1);
            });

            describe('/[l]+[m]+[f]*[a]+[o]+/gi', async () => {
                it('Increment [lmao]', async () => {
                    messageReceived.content = 'lmao';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [lmfao]', async () => {
                    messageReceived.content = 'lmfao';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [llmao]', async () => {
                    messageReceived.content = 'llmao';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [lmmao]', async () => {
                    messageReceived.content = 'lmmao';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [lmaao]', async () => {
                    messageReceived.content = 'lmaoo';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [lmaoo]', async () => {
                    messageReceived.content = 'lmaoo';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [LmaO]', async () => {
                    messageReceived.content = 'LmaO';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Does not increment [lmlao]', async () => {
                    messageReceived.content = 'lmlao';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('lmaoCount').count).to.equal(
                        currentCount
                    );
                });
            });

            // Check for different variations of lmao
            describe('/[n]+[i]+[c]+[e]+/gi', async () => {
                it('Increment [nice]', async () => {
                    messageReceived.content = 'nice';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [nnice]', async () => {
                    messageReceived.content = 'nnice';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [niice]', async () => {
                    messageReceived.content = 'niice';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [nicce]', async () => {
                    messageReceived.content = 'nicce';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Increment [nicee]', async () => {
                    messageReceived.content = 'nicee';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count).to.equal(
                        currentCount + 1
                    );
                });

                it('Does not increment [nince]', async () => {
                    messageReceived.content = 'nince';
                    let currentCount = metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count;

                    await general.updateMessageStats(messageReceived);

                    expect(metaData.userStatsMap.get(messageReceived.author.id).get('niceCount').count).to.equal(
                        currentCount
                    );
                });
            });
        });

        describe('#updateVoiceStats(oldState, newState)', async () => {
            let templateState = {
                channelID: '705758469780799502',
                id: messageReceived.author.id,
            };

            it('Check startTime update [null, newState]', async () => {
                await general.updateVoiceStats({}, templateState);

                expect(metaData.userStatsMap.get(messageReceived.author.id).get(templateState.channelID).startTime).to
                    .not.be.null;
            });

            it('Check no operation [null, null]', async () => {
                let currentOldStateTotal = metaData.userStatsMap
                    .get(messageReceived.author.id)
                    .get(templateState.channelID);

                await new Promise((res, rej) => setTimeout(res, 250));
                await general.updateVoiceStats({}, {});

                expect(
                    metaData.userStatsMap.get(messageReceived.author.id).get(templateState.channelID).totalTime
                ).to.equal(currentOldStateTotal.totalTime);
                expect(
                    metaData.userStatsMap.get(messageReceived.author.id).get(templateState.channelID).startTime
                ).to.equal(currentOldStateTotal.startTime);
            });

            it('Check both updates [oldState, newState]', async () => {
                let newState = {
                    channelID: '720347560593588305',
                    id: messageReceived.author.id,
                };

                let currentOldStateTotal = metaData.userStatsMap
                    .get(messageReceived.author.id)
                    .get(templateState.channelID).totalTime;

                await new Promise((res, rej) => setTimeout(res, 250));
                await general.updateVoiceStats(templateState, newState);

                expect(metaData.userStatsMap.get(messageReceived.author.id).get(newState.channelID).startTime).to.not.be
                    .null;
                expect(
                    metaData.userStatsMap.get(messageReceived.author.id).get(templateState.channelID).totalTime
                ).to.not.equal(currentOldStateTotal);
            });

            it('Check totalTime update [oldState, null]', async () => {
                let currentOldStateTotal = metaData.userStatsMap
                    .get(messageReceived.author.id)
                    .get(templateState.channelID).totalTime;

                await new Promise((res, rej) => setTimeout(res, 250));
                await general.updateVoiceStats(templateState, {});

                expect(metaData.userStatsMap.get(messageReceived.author.id).get(templateState.channelID).startTime).to
                    .be.null;
                expect(
                    metaData.userStatsMap.get(messageReceived.author.id).get(templateState.channelID).totalTime
                ).to.not.equal(currentOldStateTotal);
            });
        });

        describe('#stats(messageReceived, args)', async () => {
            it('Check for valid response [empty]', async () => {
                messageReceived.content = '!stats';
                messageReceived.author.receivedMessage = '';

                expect(messageReceived.author.receivedMessage).to.be.empty;

                await general.stats(messageReceived, []);

                expect(messageReceived.author.receivedMessage.content).include('Your statistics');

                messageReceived.author.receivedMessage = '';
            });

            it('Check for valid response [user w/ stats]', async () => {
                messageReceived.content = '!stats <@!705869059744333904>';
                messageReceived.author.receivedMessage = '';

                expect(messageReceived.author.receivedMessage).to.be.empty;

                await general.stats(messageReceived, ['<@!705869059744333904>']);

                expect(messageReceived.author.receivedMessage.content).to.include(
                    "<@!705869059744333904>'s statistics"
                );

                messageReceived.author.receivedMessage = '';
            });

            it('Check for valid response [user w/o stats]', async () => {
                messageReceived.content = '!stats <@!123456789123456789>';
                messageReceived.author.receivedMessage = '';

                expect(messageReceived.author.receivedMessage).to.be.empty;

                await general.stats(messageReceived, ['<@!123456789123456789>']);

                expect(messageReceived.author.receivedMessage).to.include(
                    'There are no stats on record for <@!123456789123456789>!'
                );

                messageReceived.author.receivedMessage = '';
            });
        });

        describe('#resetStats()', async () => {
            it('Checking .delete is invoked', async () => {
                messageReceived.deleted = false;

                expect(messageReceived.deleted).to.be.false;

                await general.resetStats(messageReceived);

                expect(messageReceived.deleted).to.be.true;

                messageReceived.deleted = false;
            });
        });

        describe('#stats(messageReceived, args)', async () => {
            it('After reset, check for valid response', async () => {
                messageReceived.author.receivedMessage = '';
                messageReceived.content = '!stats';

                expect(messageReceived.author.receivedMessage).to.be.empty;

                await general.stats(messageReceived, []);

                expect(messageReceived.author.receivedMessage).to.include('You have no stats on record!');

                messageReceived.author.receivedMessage = '';
            });
        });
    });

    describe('#notImplementedCommand(messageReceived, cmd)', async () => {
        it('Check for valid response', async () => {
            messageReceived.deleted = false;
            messageReceived.receivedMessage = '';
            messageReceived.author.receivedMessage = '';

            expect(messageReceived.deleted).to.be.false;
            expect(messageReceived.receivedMessage).to.be.empty;
            expect(messageReceived.author.receivedMessage).to.be.empty;

            await general.notImplementedCommand(messageReceived, '!fake');

            expect(messageReceived.author.receivedMessage).to.include(
                'Hi ' + messageReceived.author.username + ",\n'" + '!fake' + "' is not an implemented command!"
            );
            if (new Date().getDay() != 2) {
                expect(messageReceived.receivedMessage).to.include('is an idiot, they wrote the command: ');
            }
            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
            messageReceived.receivedMessage = '';
            messageReceived.author.receivedMessage = '';
        });
    });

    describe('#starWarsResponse(messageReceived)', async () => {
        it('Check for any response', async function () {
            this.timeout(10 * 1000);
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            await general.starWarsResponse(messageReceived);

            expect(messageReceived.channel.receivedMessage).to.include('Star wars!\n');

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#insultResponse(messageReceived)', () => {
        it('Check for any response', async function () {
            this.timeout(10 * 1000);
            messageReceived.receivedMessage = '';

            expect(messageReceived.receivedMessage).to.be.empty;

            await general.insultResponse(messageReceived);

            if (new Date().getDay() != 2)
                expect(messageReceived.receivedMessage).to.include('<@!' + messageReceived.author.id + '>, ');
            else expect(true).to.be.true;

            messageReceived.receivedMessage = '';
        });
    });

    describe('#bulkDelete(messageReceived, args)', () => {
        describe('>Correct permissions', () => {
            it('Check for valid response [0]', async () => {
                messageReceived.channel.messages.array = [];
                messageReceived.member.roles.cache.set('668465816894832641');
                messageReceived.member.roles.cache.set('705760947721076756');

                expect(messageReceived.channel.messages.array).to.be.empty;

                await general.bulkDelete(messageReceived, ['0']);

                expect(messageReceived.channel.messages.array).to.have.lengthOf(1);
                expect(
                    messageReceived.channel.messages.array.every(
                        (message) => !message.pinned && message.deleted == true
                    )
                ).to.be.true;

                messageReceived.channel.messages.array = [];
            });

            it('Check for valid response [35]', async () => {
                messageReceived.channel.messages.array = [];

                expect(messageReceived.channel.messages.array).to.be.empty;

                await general.bulkDelete(messageReceived, ['35']);

                expect(messageReceived.channel.messages.array).to.have.lengthOf(35);
                expect(
                    messageReceived.channel.messages.array.every(
                        (message) => !message.pinned && message.deleted == true
                    )
                ).to.be.true;

                messageReceived.channel.messages.array = [];
            });

            it('Check for valid response [105]', async () => {
                messageReceived.channel.messages.array = [];

                expect(messageReceived.channel.messages.array).to.be.empty;

                await general.bulkDelete(messageReceived, ['105']);

                expect(messageReceived.channel.messages.array).to.have.lengthOf(100);
                expect(
                    messageReceived.channel.messages.array.every(
                        (message) => !message.pinned && message.deleted == true
                    )
                ).to.be.true;

                messageReceived.channel.messages.array = [];
            });
        });
        describe('>Incorrect permissions', () => {
            it('Check for valid reponse', async () => {
                messageReceived.author.receivedMessage = '';
                messageReceived.member.roles.cache.delete('668465816894832641');
                messageReceived.member.roles.cache.delete('705760947721076756');

                expect(messageReceived.author.receivedMessage).to.be.empty;

                await general.bulkDelete(messageReceived, ['53']);

                expect(messageReceived.author.receivedMessage).to.include(
                    'Hi ' +
                        messageReceived.author.username +
                        ',\nYou do not have the permissions for the bulkDelete command!'
                );

                messageReceived.author.receivedMessage = '';
            });

            it('Check for .fetch not invoked', async () => {
                messageReceived.channel.messages.array = [];

                expect(messageReceived.channel.messages.array).to.be.empty;

                await general.bulkDelete(messageReceived, ['53']);

                expect(messageReceived.channel.messages.array).to.be.empty;

                messageReceived.channel.messages.array = [];
            });
        });
    });

    describe('#help(messageReceived)', () => {
        it('Checking for any reponse', () => {
            messageReceived.author.receivedMessage = '';

            expect(messageReceived.author.receivedMessage).to.be.empty;

            general.help(messageReceived);

            expect(messageReceived.author.receivedMessage).to.not.be.empty;

            messageReceived.author.receivedMessage = '';
        });
    });

    describe('#eightBall(messageReceived, argumentString)', () => {
        it('Check for valid response', () => {
            messageReceived.receivedMessage = '';

            expect(messageReceived.receivedMessage).to.be.empty;

            general.eightBall(messageReceived, 'does 8ball work?');

            expect(messageReceived.receivedMessage).to.include("you asked '" + 'does 8ball work?' + "'...\n");
            expect(
                [
                    'As I see it, yes.',
                    'Ask again later.',
                    'Better not tell you now.',
                    'Cannot predict now.',
                    'Concentrate and ask again.',
                    'Don’t count on it.',
                    'It is certain.',
                    'It is decidedly so.',
                    'Most likely.',
                    'My reply is no.',
                    'My sources say no.',
                    'Outlook not so good.',
                    'Outlook good.',
                    'Reply hazy, try again.',
                    'Signs point to yes.',
                    'Very doubtful.',
                    'Without a doubt.',
                    'Yes.',
                    'Yes – definitely.',
                    'You may rely on it.',
                ].some((responseString) => messageReceived.receivedMessage.includes(responseString))
            ).to.be.true;

            messageReceived.receivedMessage = '';
        });
    });

    describe('#camel(messageReceived, argumentString)', () => {
        it('Check for any response', () => {
            messageReceived.channel.receivedMessage = '';

            expect(messageReceived.channel.receivedMessage).to.be.empty;

            general.camel(messageReceived, 'camel case');

            expect(messageReceived.channel.receivedMessage).to.not.be.empty;

            messageReceived.channel.receivedMessage = '';
        });
    });

    describe('#quote(messageReceived, args)', () => {
        it('Check for .delete invoked', () => {
            // this actually sends a message in the dev channel, so check for this aswell
            messageReceived.deleted = false;

            expect(messageReceived.deleted).to.be.false;

            general.quote(messageReceived, ['<@!' + messageReceived.author.id + '>', 'test', 'quote']);

            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
        });
    });

    describe('#quoteId(messageReceived, args)', () => {
        it('Check for .delete invoked', () => {
            messageReceived.deleted = false;

            expect(messageReceived.deleted).to.be.false;

            general.quoteId(messageReceived, ['01']);

            expect(messageReceived.deleted).to.be.true;

            messageReceived.deleted = false;
        });
    });

    describe('#quoteMessage(messageReceived, argumentString)', () => {
        it('Check .fetch invoked', () => {
            messageReceived.channel.messages.array = [];

            expect(messageReceived.channel.messages.array).to.be.empty;

            general.quoteMessage(messageReceived, 'uninmportant');

            expect(messageReceived.channel.messages.array).to.have.lengthOf(20);

            messageReceived.channel.messages.array = [];
        });
    });

    describe('#toxicId(messageReceived, args)', () => {
        it('Check for .delete invoked', async () => {
            messageReceived.deleted = false;

            expect(messageReceived.deleted).to.be.false;

            await general.toxicId(messageReceived, ['01']);

            expect(messageReceived.deleted).to.be.true;

            expect(messageReceived.channel.messages.fetchedIdMessage.reacted).to.be.true;

            messageReceived.deleted = false;
        });
    });

    describe('#toxic(messageReceived, argumentString)', () => {
        it('Check .fetch invoked', async () => {
            messageReceived.channel.messages.array = [];

            expect(messageReceived.channel.messages.array).to.be.empty;

            await general.toxic(messageReceived, 'uninmportant');

            expect(messageReceived.channel.messages.array).to.have.lengthOf(20);

            messageReceived.channel.messages.array = [];
        });
    });

    describe('#sendPlaceholder(messageReceived)', () => {
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
