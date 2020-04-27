var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    // Launch functionality, will update when need new rank systems
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    if(channelID == '691318868475510834'){
        if (message.substring(0, 1) == '!') {
            var args = message.substring(1).split(' ');
            var cmd = args[0];
           
            args = args.splice(1);
            switch(cmd) {
                case 'resetCCS':
                    bot.editMessage({
                        channelID: '691318868475510834',
                        messageID: '691591460176527361',
                        message: 'Carcassonne! Wins (Ranked) [!winCCS (@opponent1) (@opponent2)]\n<@!161848310578151424> - 0/0\n<@!264106235681308673> - 0/0\n<@!381175528847310851> - 0/0\n<@!140452063111806976> - 0/0'
                    });
                break;
                
                case 'winCCS':
                   bot.getMessage({
                    channelID: '691318868475510834',
                    messageID: '691591460176527361'
                }, (error, message)=>{
                    var lines = message.content.split('\n');
                    lines = lines.splice(1);
                    var titleString = 'Carcassonne! Wins (Ranked) [!winCCS (@opponent1) (@opponent2)] \n';
                    var workingStrings = [];

                    lines.forEach((line, index)=>{
                        if(userID == line.substr(3, 18)){
                            line = line.substr(0, 25) + (parseInt(line.substr(25,1))+1) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                            workingStrings[index] = line;
                        } else{
                            var tempString = line + " \n";
                            workingStrings[index] = tempString;
                        }
                        
                    });

                    args.forEach((arg, indexArg)=>{
                        lines.forEach((line, indexLine)=>{
                            if(arg.substr(3,18) == line.substr(3,18)){
                                line = line.substr(0, 27) + (parseInt(line.substr(27,1))+1) + " \n";

                                workingStrings[indexLine] = line;
                            }
                        });
                    });

                    workingString = titleString.concat(workingStrings.join(''));

                    bot.editMessage({
                        channelID: '691318868475510834',
                        messageID: '691591460176527361',
                        message: workingString
                    });
                });
                break;

                case 'winOtherCCS':
                    bot.getMessage({
                        channelID: '691318868475510834',
                        messageID: '691591460176527361'
                    }, (error, message)=>{
                        var lines = message.content.split('\n');
                        lines = lines.splice(1);
                        var titleString = 'Carcassonne! Wins (Ranked) [!winCCS (@opponent1) (@opponent2)] \n';
                        var workingStrings = [];

                        var indexAdded = 0;

                        args.forEach((arg, indexArg)=>{
                            lines.forEach((line, indexLine)=>{
                                if(arg.substr(3,18) == line.substr(3,18)){
                                    if(indexAdded == 0){
                                        indexAdded++;
                                        line = line.substr(0, 25) + (parseInt(line.substr(25,1))+1) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                    } else{
                                        line = line.substr(0, 25) + (parseInt(line.substr(25,1))) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                    }
                                    workingStrings[indexLine] = line;
                                } else if (indexArg == 0) {
                                    var tempString = line + " \n";
                                    workingStrings[indexLine] = tempString;
                                }
                            });
                        });

                        workingString = titleString.concat(workingStrings.join(''));

                        bot.editMessage({
                            channelID: '691318868475510834',
                            messageID: '691591460176527361',
                            message: workingString
                        });
                    });
                break;

                case 'resetUCH':
                    bot.editMessage({
                        channelID: '691318868475510834',
                        messageID: '691591631329296434',
                        message: '"Ultimate Chicken Horse (Ranked) [!winUCH command to add win]\n<@!161848310578151424> - 0/0\n<@!264106235681308673> - 0/0\n<@!381175528847310851> - 0/0\n<@!140452063111806976> - 0/0'
                    })
                break;

                case 'winUCH':
                    bot.getMessage({
                        channelID: '691318868475510834',
                        messageID: '691591631329296434'
                    }, (error, message)=>{
                        var lines = message.content.split('\n');
                        lines = lines.splice(1);
                        var titleString = "Ultimate Chicken Horse (Ranked) [!winUCH (@opponent1) (@opponent2)] \n";
                        var workingStrings = [];

                        lines.forEach((line, index)=>{
                            if(userID == line.substr(3, 18)){
                                line = line.substr(0, 25) + (parseInt(line.substr(25,1))+1) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                workingStrings[index] = line;
                            } else{
                                var tempString = line + " \n";
                                workingStrings[index] = tempString;
                            }
                        });

                        args.forEach((arg, indexArg)=>{
                            lines.forEach((line, indexLine)=>{
                                if(arg.substr(3,18) == line.substr(3,18)){
                                    line = line.substr(0, 27) + (parseInt(line.substr(27,1))+1) + " \n";

                                    workingStrings[indexLine] = line;
                                }
                            });
                        });

                        workingString = titleString.concat(workingStrings.join(''));

                        bot.editMessage({
                            channelID: '691318868475510834',
                            messageID: '691591631329296434',
                            message: workingString
                        });
                    });
                break;

                case 'winOtherUCH':
                    bot.getMessage({
                        channelID: '691318868475510834',
                        messageID: '691591631329296434'
                    }, (error, message)=>{
                        var lines = message.content.split('\n');
                        lines = lines.splice(1);
                        var titleString = "Ultimate Chicken Horse (Ranked) [!winUCH (@opponent1) (@opponent2)] \n";
                        var workingStrings = [];

                        var indexAdded = 0;

                        args.forEach((arg, indexArg)=>{
                            lines.forEach((line, indexLine)=>{
                                if(arg.substr(3,18) == line.substr(3,18)){
                                    if(indexAdded == 0){
                                        indexAdded++;
                                        line = line.substr(0, 25) + (parseInt(line.substr(25,1))+1) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                    } else{
                                        line = line.substr(0, 25) + (parseInt(line.substr(25,1))) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                    }
                                    workingStrings[indexLine] = line;
                                } else if (indexArg == 0) {
                                    var tempString = line + " \n";
                                    workingStrings[indexLine] = tempString;
                                }
                            });
                        });

                        workingString = titleString.concat(workingStrings.join(''));

                        bot.editMessage({
                            channelID: '691318868475510834',
                            messageID: '691591631329296434',
                            message: workingString
                        });
                    });
                break;
             }
         }
    }
});