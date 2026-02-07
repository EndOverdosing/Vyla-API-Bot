# Vyla Discord Bot

A super user-friendly Discord bot for discovering and watching movies and TV shows. No IDs, no complicated commands - just simple menus and clicks.

## Key Features

- **No IDs Required** - Search by name, select from menus, done
- **Interactive Menus** - All results in dropdown menus
- **One-Click Watching** - Streaming links as clickable buttons  
- **Smart Search** - Find any movie or show by name
- **Genre Discovery** - Browse all genres with dropdown selection
- **TV Show Navigation** - Easy season and episode selection
- **34 Streaming Sources** - Multiple options for every title
- **Help System** - Built-in `/help` command explains everything

## Quick Example

```
You: /search title:inception
Bot: [Shows results in dropdown menu]
You: [Select "Inception (2010)"]
Bot: [Shows full details with Watch Now button]
You: [Click "Watch Now"]
Bot: [Shows 5 streaming source buttons]
You: [Click any source to watch]
```

That's it. No IDs, no typing long commands, just clicking menus.

## Prerequisites

Before you begin, you need:

1. Node.js version 16 or higher installed
2. A Discord account
3. A Discord server where you have administrator permissions

## Getting Your Discord Bot Token

### Step 1: Create a Discord Application

1. Go to the Discord Developer Portal at https://discord.com/developers/applications
2. Click the "New Application" button in the top right
3. Give your application a name like "Vyla Media Bot" and click "Create"
4. You now have a Discord application

### Step 2: Create a Bot User

1. In your application page, click on "Bot" in the left sidebar
2. Click "Add Bot" and confirm by clicking "Yes, do it!"
3. Under the bot's username, you'll see a "Token" section
4. Click "Reset Token" and then "Copy" to copy your bot token
5. Save this token securely - you'll need it for the .env file

### Step 3: Configure Bot Permissions

1. Still in the "Bot" section, scroll down to "Privileged Gateway Intents"
2. Enable the following intents:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT (optional)
3. Click "Save Changes"

### Step 4: Invite Bot to Your Server

1. Click on "OAuth2" in the left sidebar, then "URL Generator"
2. Under "Scopes", check:
   - bot
   - applications.commands
3. Under "Bot Permissions", check:
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands
4. Scroll down and copy the generated URL
5. Paste this URL in your browser and select your server
6. Click "Authorize" and complete the captcha

## Installation

### Step 1: Download the Bot Files

Download all the bot files to a folder on your computer.

### Step 2: Install Dependencies

Open a terminal or command prompt in the bot folder and run:

```bash
npm install
```

This will install all required packages including discord.js, axios, and dotenv.

### Step 3: Configure Environment Variables

1. Copy the `.env.example` file and rename it to `.env`
2. Open the `.env` file in a text editor
3. Replace `your_discord_bot_token_here` with the bot token you copied earlier
4. Save the file

Your `.env` file should look like this:

```
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ1234567890
```

### Step 4: Start the Bot

Run the following command:

```bash
npm start
```

You should see a message saying "Logged in as YourBotName#1234" and "Slash commands registered successfully".

The bot is now online and ready to use in your Discord server.

## User Experience

### No Learning Curve

Users don't need to:
- Remember or type IDs
- Know genre names
- Learn complicated syntax
- Visit external websites
- Read long documentation

Everything is self-explanatory with `/help` and interactive menus.

### Simple Workflow

**Finding Content:**
```
Type command > Select from dropdown > Done
```

**Watching Content:**
```
Search > Select > Click "Watch Now" > Click source > Watch
```

**TV Shows:**
```
Search > Select show > Pick season > Pick episode > Watch
```

### Interactive Elements

- **Dropdown Menus** - All results and selections
- **Buttons** - Watch Now, streaming sources, random picks
- **Sessions** - 10-minute browsing sessions
- **Visual Feedback** - Posters, ratings, years shown

### Mobile Friendly

Works perfectly on Discord mobile app with same easy-to-use interface.

## Available Commands

All commands use simple syntax with interactive menus. No IDs needed.

### Core Commands

**`/help`** - Complete guide with examples

**`/search title:name`** - Search movies and shows by name
- Example: `/search title:avengers`
- Shows results in dropdown menu
- Select to see full details

**`/trending`** - See what is hot right now
- Interactive dropdown to browse
- Movies and TV shows together

**`/popular type:Movies/TV Shows`** - Browse popular content
- Example: `/popular type:Movies`
- Dropdown menu to select

**`/toprated type:Movies/TV Shows`** - Highest rated content
- Example: `/toprated type:TV Shows`
- Quality content guaranteed

**`/genres type:Movies/TV Shows`** - Browse by genre
- Example: `/genres type:Movies`
- Shows ALL genres in dropdown
- No need to remember genre names

**`/upcoming`** - Upcoming movie releases

**`/nowplaying`** - Movies in theaters now

**`/airingtoday`** - TV shows airing today

**`/random type:Movie/TV Show`** - Random recommendation
- Example: `/random type:Movie`
- "Get Another Random" button to keep discovering

### How It Works

1. Use any command
2. Select from dropdown menu
3. Click "Watch Now"
4. Click streaming source button
5. Start watching

For TV shows:
1. Select show from dropdown
2. Pick season from dropdown  
3. Pick episode from dropdown
4. Click streaming source
5. Watch

## Troubleshooting

### Bot Not Responding
- Check bot is online in server member list
- Verify bot has proper permissions
- Wait a moment and try again

### Commands Not Showing
- Wait 1-2 minutes after bot starts
- Check bot has "Use Application Commands" permission
- Try typing `/` to see if commands appear

### No Results from Search
- Try different search terms
- Use simpler keywords
- Check spelling

### Session Expired
- This happens after 10 minutes
- Just run the command again
- No data is lost

### Streaming Sources Not Working
- Try a different source button
- Some content may have limited sources
- Check your internet connection

## Technical Details

- Built with Discord.js v14
- Uses Vyla Media API backend
- 34 streaming sources available
- Session-based browsing (10 min timeout)
- Interactive dropdown menus
- Button-based navigation
- No database required

## Support

For help:
- Use `/help` command in Discord
- Check QUICKSTART.md for setup
- Check USER_GUIDE.md for usage
- Check COMMANDS.md for command reference

## License

MIT License - Free to use and modify