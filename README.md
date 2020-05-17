# cotix Discord Bot

This repository is used for the Discord Bot used in cotix Server. The server is dedicated to friends of the Authors. The bot is used for any features that we wanted to implement into our server without including other bots, to have a fully customisable experience.

## Contents

- [cotix Discord Bot](#cotix-discord-bot)
  - [Contents](#contents)
  - [Getting Started](#getting-started)
    - [Adding bot authentication token](#adding-bot-authentication-token)
    - [Creating the configuration files](#creating-the-configuration-files)
    - [Local environment setup](#local-environment-setup)
  - [Branches and Process Flow](#branches-and-process-flow)
    - [Branches](#branches)
    - [Pushing to release](#pushing-to-release)
  - [Todo](#todo)
    - [Un-implemented](#un-implemented)
    - [Completed](#completed)
    - [Bad Ideas](#bad-ideas)
  - [Directory Structure](#directory-structure)
  - [Readme Meta Data](#readme-meta-data)
    - [Latest Addition](#latest-addition)
    - [Contributing](#contributing)
    - [Authors](#authors)

## Getting Started

### Adding bot authentication token

This is a discord bot that uses "[`discord.js`](https://discord.js.org/#/)" library. It also uses `require` for some external api calls, `fs` for accesing files locally, and `log-timestamps` for creating clear logs on the published server. If the git is downloaded, you do not need to install these manually.

You will need to find your bot authentication token from the [discord developper dashboard](https://discordapp.com/developers/applications/). Find your bot and take the authentication token and place it in a file `./local/auth.json` formatted as follows:

```json
{
  "token": "${authentication_token}"
}
```

### Creating the configuration files

You will need to create your own `./bot/config/Channels.json` that follows an array format as follows:

```json
[
  {
        "name": "${channel_name}",
        "id": "${channel_id}",
        "keepClean": bool,
        ... Channel specific configs ...  
  }
]
```

This will be the file used on your released server. To see how to create a local environment, see [below](#local-environment-setup).

### Local environment setup

To set up a development bot, create a new server and add a new bot to it. In `./local/auth.json` place the as the token as indicated above.

Create a `./local/Channels.json` and this will override the `./bot/config/Channels.json` when you run the bot, but will not affect the Release envrionment as it will not be pushed to the git repository.

## Branches and Process Flow

### Branches

- Release (Default)
- master

### Pushing to release

1. Create a branch from master for your implementation
2. Complete the changes and push to your branch
3. Merge the branch into master
4. Request merge from master to release via [the web client](https://github.com/cotixTeam/cotixBot/compare/master?expand=1)
5. Assign another member to review the merge
6. If approved, will be pushed to AWS (assuming it works)

## Todo

### Un-implemented

- [ ] toxicity ranking (by MMRREE)
- [ ] modularity in games scoreboard (by MMRREE)
- [ ] quotes meta data (by MMRREE)
- [ ] format the quotes automatically (by MMRREE)
- [ ] call meta data stats (by MMRREE)
- [ ] reminders (by MMRREE)
- [ ] crushampton feed (by MMRREE)
- [ ] spotify integration (by MMRREE)
- [ ] create a method to interact with the channels file for admins (by MMRREE)
- [ ] game updates (by MMRREE)
- [ ] a game randomizer based on who is available (by MMRREE)
- [ ] public humiliation for incorrect command (by MMRREE)

### Completed

- [x] automatic gif replies (by MMRREE)
- [x] bot tracks ideas (by MMRREE)
- [x] ideas accountability (by MMRREE)
- [x] clean channels (by MMRREE)
- [x] macro for cAmEl CaSe (by MMRREE)
- [x] automatic reactions for TOXIC (by MMRREE)
- [x] eight ball messages (by MMRREE)
- [x] log bad ideas (by MMRREE)
- [x] insults when you at the bot (by MMRREE)
- [x] help command (by MMRREE)
- [x] add a completed ideas list in spoiler tags (by MMRREE)
- [x] bulk remove messages (by MMRREE)

### Bad Ideas

<details>

<summary>Bad Ideas</summary>

- our first bad idea

</details>

## Directory Structure

<details>

<summary>Discord Bot</summary>

```notepad
|-- package.json               [node package settings for bot]
|-- package-lock.json          [automatically node generated file]
|-- bot.js                     [main bot functionality code implementation]
|-- appspec.yml                [appspec information for codedeploy transfer of files]
|-- .gitignore                 [git ignore for the local permission keys]
|-- scripts
|    |-- install_dependencies  [node install for ubuntu (latest version, not using apt-get)]
|    |-- post_install          [npm install for required node modules]
|    |-- start_server          [forever start code for codedeploy AWS spin up]
|    `-- stop_server           [forever stop code for codedeploy AWS spin down]
`-- node_modules               [Node modules automatically generated]
```

</details>

## Readme Meta Data

<details>

<summary>Meta Data</summary>

### Latest Addition

Author: Eamonn Trim  - [ect1u17](mailto:ect1u17@soton.ac.uk)

Action: Adding process flow, branches and getting started section

Date: 02/05/2020

### Contributing

Eamonn Trim  - [ect1u17](mailto:ect1u17@soton.ac.uk)

Anurag Sahare - [aps1g17](mailto:aps1g17@soton.ac.uk)

### Authors

| Name              | Actions                                     |
| ----------------- | ------------------------------------------- |
| **Anurag Sahare** | *Edited Readme file*                        |
| **Eamonn Trim**   | *Leaderboard Functions, edited Readme file* |
| **Josh Bullock**  | *Nothing yet*                               |
| **Matt Johns**    | *Nothing yet*                               |
| **Gavin Fish**    | *Nothing yet*                               |

</details>