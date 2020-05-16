# ~BKKK Discord Bot

This repository is used for the Discord Bot used in ~BKKK Server. The server is dedicated to friends of the Authors. The bot is used for any features that we wanted to implement into our server without including other bots, to have a fully customisable experience.

## Contents

- [~BKKK Discord Bot](#bkkk-discord-bot)
  - [Contents](#contents)
  - [Getting Started](#getting-started)
  - [Branches and Process Flow](#branches-and-process-flow)
    - [Branches](#branches)
    - [Process Flow](#process-flow)
      - [Environment setup](#environment-setup)
      - [Process of moving from Development to Release](#process-of-moving-from-development-to-release)
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

This is a discord bot that uses "[discord.js](https://discord.js.org/#/)" library. To get started, you will need node and npm installed. Then install discord.js by using the command

```bash
npm install discord.js
```

You will then need you discord bot's authentication token (found under the "click to reveal token" on the [https://discordapp.com/developers/applications/${YOUR_APPLICATION_ID}/bot/](https://discordapp.com/developers/applications/)). Once you have this, create a folder in the bots location named "local" and place you key in a file named `auth.json` formatted as follows (this prevents others for stealing your bot):

```json
{
  "token": "authentication_token"
}
```

Once you have done this, and configured the Channels.json file to your server, you are ready to run the bot with

```bash
node bot.js
```

or

```bash
npm start
```

Further information on how to set up the Channels.json and other relevant configuration files will be produced later in the project.

## Branches and Process Flow

### Branches

- Release (Default)
- master

### Process Flow

#### Environment setup



#### Process of moving from Development to Release

1. Create a branch from master of the implementation you want to implement
2. Implement the solution
3. Merge to master
4. Request merge from master to release
5. Assign another member to review the merge
6. If approved, will be pushed to AWS
7. If deploy has failed, the old version will stay live, Eamonn will look at debugging
8. If succeeded, the bot will be live on release

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
- [ ] bulk remove messages (by MMRREE)
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