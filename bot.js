var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./local/auth.json');

const Channels = { 
    "Leaderboards": {
        "id": "691318868475510834",
        "games": [{
            "name": "CCS",
            "messageId": "691591460176527361",
            "defaultMessage": "Carcassonne! Wins (Ranked) [!win CCS (@opponent1) (@opponent2)]\n<@!161848310578151424> - 0/0\n<@!264106235681308673> - 0/0\n<@!381175528847310851> - 0/0\n<@!140452063111806976> - 0/0\n"
        },
        {
            "name": "UCH", 
            "messageId": "691591631329296434", 
            "defaultMessage": "Ultimate Chicken Horse (Ranked) [!win UCH command to add win]\n<@!161848310578151424> - 0/0\n<@!264106235681308673> - 0/0\n<@!381175528847310851> - 0/0\n<@!140452063111806976> - 0/0\n" 
        }]
    }
}

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

bot.on('message', function (user, userID, channelID, messageReceived, evt) {
    if(channelID == Channels.Leaderboards.id){
        if (messageReceived.substring(0, 1) == '!') {
            let args = messageReceived.substring(1).split(' ');
            let cmd = args[0];
            let messageReceivedId = evt.d.id;
           
            args = args.splice(1);

            switch(cmd) {
                case 'reset':
                    for(let game of Channels.Leaderboards.games){
                        if(args[0] == game.name){
                            bot.editMessage({
                                channelID: Channels.Leaderboards.id,
                                messageID: game.messageId,
                                message: game.defaultMessage
                            }, (error, response)=>{
                                bot.deleteMessage({
                                    channelID: Channels.Leaderboards.id,
                                    messageID: messageReceivedId
                                }, (error, response)=>{
                                    if(error == null) logger.info("Succesfully delete the message");
                                });
                            });
                                
                            logger.info("Reset message " + game.messageId + " to " + game.defaultMessage);
                        }
                    }
                break;
                
                case 'win':
                for(let game of Channels.Leaderboards.games){
                    if(args[0] == game.name){
                        bot.getMessage({
                            channelID: Channels.Leaderboards.id,
                            messageID: game.messageId
                        }, (error, editMessage)=>{
                            let lines = editMessage.content.split('\n');
                            let titleString = lines[0] + '\n';
                            lines = lines.splice(1);
                            let workingStrings = [];
        
                            lines.forEach((line, index)=>{
                                if(userID == line.substr(3, 18)){
                                    line = line.substr(0, 25) + (parseInt(line.substr(25,1))+1) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                    workingStrings[index] = line;
                                } else{
                                    let tempString = line + " \n";
                                    workingStrings[index] = tempString;
                                }
                                
                            });
        
                            args.forEach((arg, indexArg)=>{
                                if(indexArg != 0){
                                    lines.forEach((line, indexLine)=>{
                                        if(arg.substr(3,18) == line.substr(3,18)){
                                            line = line.substr(0, 27) + (parseInt(line.substr(27,1))+1) + " \n";
                                            workingStrings[indexLine] = line;
                                        }
                                    });
                                }
                            });
        
                            workingString = titleString.concat(workingStrings.join(''));
        
                            bot.editMessage({
                                channelID: Channels.Leaderboards.id,
                                messageID: editMessage.id,
                                message: workingString
                            }).then(()=>{
                                bot.deleteMessage({
                                    channelID: Channels.Leaderboards.id,
                                    messageID: messageReceivedId
                                }, (error, response)=>{
                                    if(error == null) logger.info("Succesfully delete the message");
                                });
                            });

                            logger.info("Updated message " + editMessage.id + " to " + workingString);
                        });
                    }
                }
                break;

                case 'winOther':
                for(let game of Channels.Leaderboards.games){
                    if(args[0] == game.name){
                        bot.getMessage({
                            channelID: Channels.Leaderboards.id,
                            messageID: game.messageId
                        }, (error, editMessage)=>{
                            let lines = editMessage.content.split('\n');
                            let titleString = lines[0] + '\n';
                            lines = lines.splice(1);
                            let workingStrings = [];
    
                            let indexAdded = 0;
    
                            args.forEach((arg, indexArg)=>{
                                lines.forEach((line, indexLine)=>{
                                    if(indexArg != 0){
                                        if(arg.substr(3,18) == line.substr(3,18)){
                                            if(indexAdded == 0){
                                                indexAdded++;
                                                line = line.substr(0, 25) + (parseInt(line.substr(25,1))+1) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                            } else{
                                                line = line.substr(0, 25) + (parseInt(line.substr(25,1))) + "/" + (parseInt(line.substr(27,1))+1) + " \n";
                                            }
                                            workingStrings[indexLine] = line;
                                        } else if (indexArg == 0) {
                                            let tempString = line + " \n";
                                            workingStrings[indexLine] = tempString;
                                        }
                                    }
                                });
                            });
    
                            workingString = titleString.concat(workingStrings.join(''));
    
                            bot.editMessage({
                                channelID: Channels.Leaderboards.id,
                                messageID: editMessage.id,
                                message: workingString
                            });

                            logger.info("Updated message " + editMessage.id + " to " + workingString);
                        }).then(()=>{
                            bot.deleteMessage({
                                channelID: Channels.Leaderboards.id,
                                messageID: messageReceivedId
                            }, (error, response)=>{
                                if(error == null) logger.info("Succesfully delete the message");
                            })
                        });
                    }
                }
                break;

                default:
                bot.sendMessage({
                    to: userID,
                    message: "Hi " + user + ",\n'" + messageReceived + "' is not an implemented command!"
                }, (error, response)=>{
                    logger.info(response); 
                    if(error == null){
                        bot.deleteMessage({
                            channelID: Channels.Leaderboards.id,
                            messageID: messageReceivedId
                        }, (error, response)=>{
                            if(error == null) logger.info("Succesfully delete the message");
                        })
                    }
                });
                break;
             }
         }
    }
});