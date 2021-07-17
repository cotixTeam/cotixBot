# cotix Discord Bot

This repository is used for the Discord Bot used in cotix Server. The server is dedicated to friends of the Developer. The bot is used for any features that we wanted to implement into our server without including other bots, to have a fully customisable experience.

## Contents

- [cotix Discord Bot](#cotix-discord-bot)
  - [Contents](#contents)
  - [Getting Started](#getting-started)
    - [Adding bot authentication token](#adding-bot-authentication-token)
    - [Creating the configuration files](#creating-the-configuration-files)

## Getting Started

### Adding bot authentication token

This is a discord bot that uses "[`discord.js`](https://discord.js.org/#/)" for interacting with discord. There are many other node packages used in order to improve the functionality which can be seen in the `package.json`.

The repository is setup to work with an [AWS EB](https://aws.amazon.com/elasticbeanstalk/) server, but the easiest way to run is through a local server (running on your local laptop).

To use the code, you will need to find your bot authentication token from the [discord developper dashboard](https://discord.com/developers/applications/). Find your bot and take the authentication token and place it in a file `./local/auth.json` formatted as follows:

```json
{
    "discordBotToken": "...", // Used to log your bot in
    "discordClientId": "...", // Used for your user authentication online
    "discordClientSecret": "...", // Used for your user authentication online
    "root": "http://localhost:3000", // The root server of the host (this will change for prod)
    "spotifyDiscordConnectUrl": "...", // Used to authenticate spotify user
    "googleToken": "...", // Unused
    "spotifyClientSecret": "...", // Used to authenticate spotify user
    "spotifyClientId": "...", // Used to authenticate spotify user
    "steamKey": "..." // Used for openID
}
```

The only token REQUIRED for basic functionality is `discordBotToken` but the others will open up the more fun functionality.

### Creating the configuration files

You will need to create your own `./local/Channels.json` that follows an array format as follows:

```json
[
  {
        "name": "${channel_name}",
        "id": "${channel_id}",
        "keepClean": true|false,
        ... Channel specific configs ...  
  }
]
```

The channel specific settings are listed below:

```json
// For Leaderboards channel:
{
  ...
  "lmaoBoard": "messageID", // Shows the top users of lmao usage
  "niceBoard": "messageID", // Shows the top users of nice usage
  "toxicBoard": "messageID" // Shows the top toxic users
}

// For Ideas channel:
{
  ...
  "todo": "messageID", // Shows the todo ideas
  "bad": "messageID", // Shows the bad ideas
  "completed": "messageID", // Shows the completed ideas
  "majority": number // Used to determine how many reacts are required to pass an idea
}

// For Music channel:
{
  ...
  "embedMessage": "messageID" // This is used to have the reacts of the music player and the queue to be shown.
}
```
