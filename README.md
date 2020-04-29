# ~BKKK Discord Bot

This repository is used for the Discord Bot used in ~BKKK Server. The server is dedicated to friends of the Authors. The bot is used for any features that we wanted to implement into our server without including other bots, to have a fully customisable experience.

## Contents

- [~BKKK Discord Bot](#bkkk-discord-bot)
  - [Contents](#contents)
  - [Getting Started](#getting-started)
  - [Todo](#todo)
  - [Directory Structure](#directory-structure)
  - [Latest Addition](#latest-addition)
  - [Contributing](#contributing)
  - [Authors](#authors)

## Getting Started

This is not public at the moment, as such a getting started is not included. For information purposes, the bot is hosted on an AWS server and the development environment is automatically deployed on the server using AWS's CodeDeploy.

## Todo

- [ ] Toxicity Ranking
- [ ] Modularise the leaderboards chat
- [ ] Auto-format quotes page
- [ ] Spotify integration?
- [ ] Automatic Gifs for certain phrases
- [ ] Salty points?
- [ ] Non-toxic Tuesday reminders (and other reminds - stags Friday)

## Directory Structure

``` 
Discord Bot
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

## Latest Addition

Author: Eamonnn Trim  - [ect1u17](mailto:ect1u17@soton.ac.uk)

Action: Moving todo to readme, adding file directory list and reformatting authors section

Date: 29/04/2020

## Contributing

Eamonnn Trim  - [ect1u17](mailto:ect1u17@soton.ac.uk)

Anurag Sahare - [aps1g17](mailto:aps1g17@soton.ac.uk)

## Authors

Name | Actions
--- | ---
**Anurag Sahare** | *Edited Readme file*
**Eamonn Trim** | *Leaderboard Functions, edited Readme file*
**Josh Bullock** | *Nothing yet*
**Matt Johns** | *Nothing yet*
**Gavin Fish** | *Nothing yet*
