const Discord = require('discord.js');
const auth = require('./local/auth.json');
const bot = new Discord.Client();

bot.login(auth.token);

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

bot.on('ready', () => {
    console.log('Connected');
    console.log('Logged in as: ' + bot.user.username + ' (' + bot.user.id + ')');
});

bot.on('message', (messageReceived) => {
    let receivedContent = messageReceived.content;
    let channelID = messageReceived.channel;
    let guildID = messageReceived.guild;
    let receivedUserId = messageReceived.userID;
    
        if(channelID == Channels.Leaderboards.id){
            let leaderboardChannel = new Discord.TextChannel(guildID, {id: Channels.Leaderboards.id});
        if (receivedContent.substring(0, 1) == '!') {
            let args = receivedContent.substring(1).split(' ');
            let cmd = args[0];
           
            args = args.splice(1);

            switch(cmd) {
                case 'reset':
                    for(let game of Channels.Leaderboards.games){
                        if(args[0] == game.name){
                            new Discord.Message(bot, {id: game.messageId}, leaderboardChannel).edit(game.defaultMessage).then(()=>{
                                messageReceived.delete()
                                .then(()=>console.log("Deleted the sent message!"))
                                .then(()=>console.log("Reset message " + game.messageId + " to " + game.defaultMessage));
                            });
                        }  
                    }
                break;
                
                case 'win':
                for(let game of Channels.Leaderboards.games){
                    if(args[0] == game.name){

                        let editMessage = new Discord.Message(bot, {id: game.messageId}, leaderboardChannel);
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

                        editMessage.edit(workingString).then(()=>{
                            messageReceived.delete()
                            .then(()=>console.log("Deleted the sent message!"))
                            .then(()=>console.log("Updated message " + editMessage.id + " to " + workingString));
                        });
                    }
                }
                break;

                case 'winOther':
                for(let game of Channels.Leaderboards.games){
                    if(args[0] == game.name){

                        let editMessage = new Discord.Message(bot, {id: game.messageId}, leaderboardChannel);
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

                        editMessage.edit(workingString).then(()=>{
                            messageReceived.delete()
                            .then(()=>console.log("Deleted the command"))
                            .then(()=>console.log("Updated message " + editMessage.id + " to " + workingString));
                        });

                    }
                }
                break;

                default:
                    messageReceived.author.send("Hi " + messageReceived.username + ",\n'" + cmd + "' is not an implemented command!").then((sentMessage)=>{
                        logger.info(messageReceived.deletable);
                        messageReceived.delete().then(()=>console.log("Delete the message!"));
                    });
                break;
             }
         }
    }
});