# Quick Start Guide

Get your user-friendly Vyla Discord Bot running in 5 minutes. No complicated IDs or syntax - just simple commands and menus.

## What You Need

1. Node.js installed on your computer
2. A Discord account
3. A server where you are an administrator

## Setup Steps

### 1. Get Your Bot Token

Go to https://discord.com/developers/applications

Click "New Application" and name it "Vyla Media Bot"

Click "Bot" on the left sidebar, then "Add Bot"

Click "Reset Token" then "Copy" to get your token

Save this token - you will need it soon

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

This installs all required packages.

### 4. Configure Bot Token

Create a file named `.env` and add:
```
DISCORD_BOT_TOKEN=paste_your_token_here
```

Replace "paste_your_token_here" with the token you copied earlier.

### 5. Start the Bot

Run:
```bash
npm start
```

You should see "Logged in as Vyla" in the terminal.

The bot is now online in your Discord server.

## Test It Out

Go to your Discord server and try these commands:

### First Command
```
/help
```

This shows you everything the bot can do.

### Search for Something
```
/search title:avengers
```

You will see:
- Results with posters and ratings
- A dropdown menu to select what you want
- Click to see full details

### Browse Trending
```
/trending
```

See what is hot right now with an easy dropdown menu.

### Try a Genre
```
/genres type:Movies
```

All movie genres appear in a menu - just click what you want.

### Get Random Pick
```
/random type:Movie
```

Can't decide? Let the bot pick for you. Click "Get Another Random" to keep discovering.

## How It Works

### Step 1: Use a Command
Type any command like `/search`, `/trending`, or `/genres`

### Step 2: See Results
Bot shows results in dropdown menus - no IDs needed

### Step 3: Select What You Want
Click on items in the dropdown to see details

### Step 4: Watch
Click "Watch Now" to get streaming links as buttons

### Step 5: Start Watching
Click any streaming source button to watch in your browser

## Key Features

### No IDs Required
You never type or remember any IDs. Everything uses names and menus.

### Interactive Menus
All results appear in dropdown menus - just point and click.

### Multiple Streaming Sources
Get up to 5 different streaming sources for every movie or episode.

### Easy TV Shows
For TV shows:
1. Search for the show
2. Select it from dropdown
3. Pick your season
4. Pick your episode
5. Watch

## Common Commands to Try

### Find Specific Content
```
/search title:batman
/search title:stranger things
/search title:the office
```

### Browse by Popularity
```
/trending
/popular type:Movies
/toprated type:TV Shows
```

### Explore Genres
```
/genres type:Movies
(Select Action, Comedy, Horror, etc from menu)

/genres type:TV Shows
(Select Drama, Sci-Fi, etc from menu)
```

### Special Lists
```
/upcoming (upcoming movies)
/nowplaying (movies in theaters)
/airingtoday (TV shows on today)
```

### Random Pick
```
/random type:Movie
/random type:TV Show
```

## Understanding the Interface

### When You Search
- Shows up to 10 results at a time
- Each shows title, rating, and year
- Dropdown menu appears to select

### When You Select Something
- Full details appear
- Cast, genres, description shown
- "Watch Now" button appears

### When You Click Watch Now
- For movies: Streaming source buttons appear
- For TV shows: Season menu appears first

### TV Show Flow
```
Select show > Pick season > Pick episode > Get streaming links
```

All done through dropdown menus - no typing needed.

## What Makes This Bot Different

### Old Way (Complicated)
```
Search for content
Find the ID number
Use ID in another command
Remember season and episode numbers
Type long commands
```

### New Way (Simple)
```
Search by name
Select from dropdown
Click Watch Now
Click streaming source
Done
```

## Tips for Best Experience

### Searching
- Use simple terms: "batman" works better than full titles
- Works for both movies and TV shows
- Partial names work fine

### Browsing
- Try /trending first to see what is popular
- Use /genres to explore categories
- Use /random when you can't decide

### Watching TV Shows
- All seasons and episodes are in menus
- Ratings help you find best episodes
- Air dates show you latest content

## Need Help?

Type `/help` anytime to see:
- All available commands
- How each command works
- Example usage
- Step-by-step guides

## Troubleshooting

### Bot Not Responding
- Check if bot is online in server members list
- Make sure you typed the command correctly
- Wait a moment and try again

### No Results Found
- Try different search terms
- Check your spelling
- Use simpler keywords

### Session Expired
- This happens after 10 minutes of inactivity
- Just run the command again
- Your browsing history is not stored

## What to Explore First

Day 1: Learn the basics
```
/help (see all commands)
/search title:your favorite movie
/trending (see what is hot)
```

Day 2: Explore categories
```
/genres type:Movies (explore genres)
/popular type:TV Shows (find popular shows)
/random type:Movie (discover something new)
```

Day 3: Master TV shows
```
Search for a TV show
Navigate seasons and episodes
Binge watch your favorite series
```

## Advanced Usage

### Creating Watchlists
Use `/search` to find content, then bookmark the Discord messages for later.

### Discovering New Content
1. Start with `/trending`
2. See what genres you like
3. Use `/genres` to find more
4. Use `/random` for surprises

### Binge Watching
1. Search for your show once
2. Navigate through seasons easily
3. Pick up where you left off anytime

## Privacy

The bot does not store:
- Your viewing history
- Personal information
- Search history

Sessions expire after 10 minutes automatically.

## Next Steps

Now that your bot is running:

1. Type `/help` to see everything it can do
2. Try `/trending` to see popular content
3. Search for your favorite movie or show
4. Explore genres you love
5. Share the bot with friends in your server

Enjoy discovering and watching content with your new Vyla Discord Bot!

No IDs, no complicated commands - just simple browsing and watching.