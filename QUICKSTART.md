# Quick Start Guide

Get your Vyla Discord Bot running in 5 minutes.

## What You Need

1. Node.js installed on your computer
2. A Discord account
3. A server where you're an administrator

## Setup Steps

### 1. Get Your Bot Token

Go to https://discord.com/developers/applications

Click "New Application" and name it "Vyla Media Bot"

Click "Bot" on the left sidebar, then "Add Bot"

Click "Reset Token" then "Copy" to get your token

Enable "MESSAGE CONTENT INTENT" under Privileged Gateway Intents

Click "Save Changes"

### 2. Invite Bot to Server

Click "OAuth2" then "URL Generator"

Check these boxes under Scopes:
- bot
- applications.commands

Check these boxes under Bot Permissions:
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands

Copy the generated URL at the bottom

Paste it in your browser and select your server

Click "Authorize"

### 3. Install the Bot

Open terminal in the bot folder

Run:
```bash
npm install
```

Create a file named `.env` and add:
```
DISCORD_BOT_TOKEN=paste_your_token_here
```

Replace "paste_your_token_here" with the token you copied

### 4. Start the Bot

Run:
```bash
npm start
```

You should see "Logged in as YourBotName"

## Test It Out

Go to your Discord server

Type `/search avengers`

You should see movie results appear

## Common Commands to Try

```
/search query:batman
/trending
/popular type:Movies
/genres type:Movies genre:action
/movie id:299534
/watch type:Movie id:299534
```

## Getting IDs

Use `/search` to find content

The ID is shown in the search results

Use that ID with `/movie`, `/tv`, or `/watch`

## Need Help?

Check the full README.md for:
- Complete command list
- Troubleshooting
- Customization options
- Advanced features

## Next Steps

Try these commands to explore:
- `/trending` - See what's popular now
- `/random type:Movie` - Get a random movie
- `/upcoming` - See upcoming releases
- `/toprated type:Movies` - Best rated content
- `/genres` - Browse by genre

Have fun discovering movies and TV shows in Discord!