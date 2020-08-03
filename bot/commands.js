module.exports = {
    list: [
        {
            channel: 'All',
            name: '!findGames',
            arguments: '[User to query] [Other user to query] ...',
            description: 'Sends a placeholder message, used for development.',
        },
        {
            channel: 'All',
            name: '!toggleModerator',
            description:
                "Adds a pseudo role to your account that can't be removed if you have an admin permission. The bot will then quickly toggle the actual admin and the pseudo admin to view the server from a normal users view.",
        },
        {
            channel: 'All',
            name: '!sendPlaceholder',
            description: 'Sends a placeholder message, used for development.',
        },
        {
            channel: 'All',
            name: '!resetStats',
            description: 'Removes all the statistics for your account (Server time, messages sent, toxic count, etc).',
        },
        {
            channel: 'All',
            name: '!stats',
            arguments: '[null] | [User to query] [Other user to query] ...',
            description:
                'Sends a message of your own stats if no other users are provided, otherwise sends the stats for every user queried.',
        },
        {
            channel: 'All',
            name: '!toxic',
            arguments: '[Unique string the the message]',
            description: 'Reacts to the selected message with the TOXIC letters (if within the last 20 messages).',
        },
        {
            channel: 'All',
            name: '!toxicId',
            arguments: '[Link to message in this channel]',
            description: 'Reacts to the selected message with the TOXIC letters.',
        },
        {
            channel: 'All',
            name: '!quoteMessage',
            arguments: '[Unique string the the message]',
            description:
                'Formats the message to the quotes page with the time and date appended (if within the last 20 messages).',
        },
        {
            channel: 'All',
            name: '!quoteId',
            arguments: '[Link to message in this channel]',
            description: 'Formats the message to the quotes page with the time and date appended.',
        },
        {
            channel: 'All',
            name: '!quote',
            arguments: '[@User] [The quote to format]',
            description: 'Quotes the message of the tagged user with the current date and time.',
        },
        {
            channel: 'All',
            name: '!camel',
            arguments: '[String to be formatted]',
            description: 'Replaces the message with a cAmEl FoRmAtTeD one from the bot.',
        },
        {
            channel: 'All',
            name: '!8ball',
            arguments: '[Question to be asked]',
            description: 'Answers your question with an 8-ball response.',
        },
        {
            channel: 'All',
            name: '!help',
            description: 'This command to get information about commands.',
        },
        {
            channel: 'All',
            name: '!bulkDelete',
            arguments: '[Number <=100]',
            description: 'Deletes all unpinned messages (up to 100 in the chat) (needs moderator/admin permissions).',
        },
        {
            channel: 'Music',
            name: '!qUrl',
            arguments: '[YouTube URL]',
            description: 'Adds the youtube url video to the queue for songs played.',
        },
        {
            channel: 'Music',
            name: '!qSearch',
            arguments: '[Search query]',
            description: 'Searches youtube for your query and adds it to the song queue.',
        },
        {
            channel: 'Music',
            name: '!qSpotify',
            arguments: '[Playlist name]',
            description: 'Adds a spotify playlist to the queue for music playing.',
        },
        {
            channel: 'Ideas',
            name: '!add',
            arguments: '[Idea to be voted on]',
            description:
                'Adds a poll to the message, if the idea passes, moves to the todo list, otherwise joins the pile of shame.',
        },
        {
            channel: 'Ideas',
            name: '!addVeto',
            arguments: '[Idea to be placed into the todo without passing a vote]',
            description:
                'Used to bypass the voting procedure and add an idea to the list, only to be used for bot errors.',
        },
        {
            channel: 'Ideas',
            name: '!completed',
            arguments: '[Idea in message that is completed]',
            description:
                'Ticks a todo result on the list as complete [WIP: move it to another message under a spoiler].',
        },
        {
            channel: 'Ideas',
            name: '!unfinished',
            arguments: '[Idea in message that is not completed]',
            description: 'Removes the tick of a todo result. [WIP: move from the completed list back to the tood list]',
        },
        {
            channel: 'Ideas',
            name: '!remove',
            arguments: '[Idea in message to be removed]',
            description:
                'Removes an item from the todo list altogether. Does not interact with either the bad ideas or the completed ideas.',
        },
        {
            channel: 'Ideas',
            name: '!reset',
            description: 'Resets the three message groups removing ALL THE ENTRIES! BE CAREFUL!',
        },
        {
            channel: 'Leaderboards',
            name: '!clearUsers',
            arguments: '[Leaderboard Name]',
            description: 'Clears the users from the leaderboard specified.',
        },
        {
            channel: 'Leaderboards',
            name: '!clearScores',
            arguments: '[Leaderboard Name]',
            description: 'Clears the scores from the leaderboard specified.',
        },
        {
            channel: 'Leaderboards',
            name: '!addPlayer',
            arguments: '[Leaderboard Name] [@User]',
            description: 'Adds a user to speicifed leaderboard.',
        },
        {
            channel: 'Leaderboards',
            name: '!remPlayer',
            arguments: '[Leaderboard Name] [@User]',
            description: 'Removes a user to speicifed leaderboard.',
        },
        {
            channel: 'Leaderboards',
            name: '!addLeaderboard',
            arguments: '[Leaderboard Name] [Leaderboard Description]',
            description: 'Adds a new leaderboard message to the channel with the specified name and description.',
        },
        {
            channel: 'Leaderboards',
            name: '!remLeaderoard',
            arguments: '[Leaderboard Name]',
            description: 'Removes a leaderboard message from the channel.',
        },
        {
            channel: 'Leaderboards',
            name: '!win',
            arguments: '[Game Tag] [Other Player] [Other Player] ...',
            description: "Adds a win for the sender of the message, and a loss for those @'d in the arguments.",
        },
        {
            channel: 'Leaderboards',
            name: '!winOther',
            arguments: '[Game Tag] [Winning Player] [Other Player] [Other Player] ...',
            description:
                "Adds a win for the @'d 'Winning Player' argument, and a loss for the others @'d in the arguments.",
        },
        {
            channel: 'Settings',
            name: '!listEvents',
            description: 'Lists the events available to be reminded on the server.',
        },
        {
            channel: 'Settings',
            name: '!joinReminder',
            arguments: '[ReminderName]',
            description: 'Joins a list to be reminded of an event from the server.',
        },
        {
            channel: 'Settings',
            name: '!leaveReminder',
            arguments: '[ReminderName]',
            description: 'Leaves a list, as to not be reminded of an event from the server.',
        },
    ],
};
