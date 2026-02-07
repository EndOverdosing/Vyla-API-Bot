# Vyla Discord Bot

A complete Discord bot integration for the Vyla Media API. Search, browse, and get detailed information about movies and TV shows directly in Discord.

## Features

Complete integration of all Vyla API features including search, detailed information, trending content, genres, cast information, streaming sources, TV seasons and episodes, and more.

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

## Available Commands

All commands are slash commands. Type `/` in Discord to see the full list.

### Search Commands

**`/search <query>`**
Search for movies and TV shows.

Example: `/search avengers`

Returns up to 5 results with posters, ratings, and descriptions.

**`/random <type>`**
Get a random movie or TV show.

Parameters:
- type: Choose "Movie" or "TV Show"

Example: `/random type:Movie`

Includes a button to get another random selection.

### Detailed Information Commands

**`/movie <id>`**
Get complete details about a movie.

Parameters:
- id: TMDB Movie ID (found in search results)

Example: `/movie id:299534`

Returns:
- Full description
- Rating and vote count
- Release date and runtime
- Budget and revenue
- Genres
- Top 5 cast members
- Poster and backdrop images
- Link to watch and TMDB page

**`/tv <id>`**
Get complete details about a TV show.

Parameters:
- id: TMDB TV Show ID

Example: `/tv id:1399`

Returns:
- Full description
- Rating and vote count
- First and last air dates
- Number of seasons and episodes
- Status (ongoing, ended, etc.)
- Genres
- Top 5 cast members
- Poster and backdrop images
- Link to TMDB page

**`/cast <id>`**
Get information about an actor or crew member.

Parameters:
- id: TMDB Person ID

Example: `/cast id:3223`

Returns:
- Biography
- Known for department
- Birthday and birthplace
- Notable works
- Profile picture

### TV Show Specific Commands

**`/season <tvid> <season>`**
Get detailed information about a specific season.

Parameters:
- tvid: TMDB TV Show ID
- season: Season number

Example: `/season tvid:1399 season:1`

Returns:
- Season overview
- Episode count and air date
- List of up to 10 episodes with ratings
- Season poster

**`/episode <tvid> <season> <episode>`**
Get detailed information about a specific episode.

Parameters:
- tvid: TMDB TV Show ID
- season: Season number
- episode: Episode number

Example: `/episode tvid:1399 season:1 episode:1`

Returns:
- Episode title and description
- Air date and runtime
- Rating
- Directors and writers
- Guest stars
- Still image
- Link to watch the episode

### Discovery Commands

**`/trending`**
Get currently trending movies and TV shows.

Example: `/trending`

Returns 5 trending items from the Vyla API home feed.

**`/popular <type>`**
Get popular content.

Parameters:
- type: Choose "Movies" or "TV Shows"

Example: `/popular type:Movies`

Returns 5 popular items of the selected type.

**`/toprated <type>`**
Get top rated content.

Parameters:
- type: Choose "Movies" or "TV Shows"

Example: `/toprated type:Movies`

Returns 5 top rated items of the selected type.

**`/upcoming`**
Get upcoming movies.

Example: `/upcoming`

Returns 5 upcoming theatrical releases.

**`/nowplaying`**
Get movies currently playing in theaters.

Example: `/nowplaying`

Returns 5 movies currently in theaters.

**`/airingtoday`**
Get TV shows airing today.

Example: `/airingtoday`

Returns 5 TV shows with episodes airing today.

### Genre Browsing Commands

**`/genres <type> <genre>`**
Browse content by genre.

Parameters:
- type: Choose "Movies" or "TV Shows"
- genre: Genre name (case insensitive)

Example: `/genres type:Movies genre:action`

Returns 5 items from the selected genre.

Available Movie Genres:
- Action
- Adventure
- Animation
- Comedy
- Crime
- Documentary
- Drama
- Fantasy
- Horror
- Romance
- Science Fiction
- Thriller
- War
- Western

Available TV Show Genres:
- Action & Adventure
- Animation
- Comedy
- Crime
- Documentary
- Drama
- Family
- Kids
- Mystery
- News
- Reality
- Sci-Fi & Fantasy
- Soap
- Talk
- War & Politics
- Western

### Streaming Commands

**`/watch <type> <id> [season] [episode]`**
Get streaming links for movies or TV show episodes.

Parameters:
- type: Choose "Movie" or "TV Show"
- id: TMDB ID
- season: Season number (required for TV shows)
- episode: Episode number (required for TV shows)

Example for movie: `/watch type:Movie id:299534`
Example for TV: `/watch type:TV Show id:1399 season:1 episode:1`

Returns up to 5 streaming source links from 34 available providers including:
- VidSrc
- VidLink
- VidEasy (4K)
- VidFast (4K)
- P-Stream
- MultiEmbed
- And 28+ more sources

## How to Find TMDB IDs

Use the `/search` command to find content. The search results include the TMDB ID in the embed footer.

For example:
1. Run `/search query:game of thrones`
2. Look at the "ID" field in the search results
3. Use that ID with other commands like `/tv id:1399`

## Command Response Format

All commands return rich embeds with:
- Color-coded embed (Netflix red theme)
- Title and description
- Relevant metadata (rating, release date, etc.)
- High-quality images (posters, backdrops, stills)
- Clickable links where applicable
- Interactive buttons for certain commands

## Troubleshooting

### Bot is offline
- Check that you ran `npm start`
- Verify your bot token in the `.env` file is correct
- Make sure you saved the `.env` file after editing

### Commands not showing up
- Wait a few minutes after starting the bot
- Make sure the bot has "Use Application Commands" permission
- Try kicking and re-inviting the bot with the OAuth2 URL

### "Unknown interaction" error
- The bot might have restarted - try the command again
- Check that the bot is online in your server

### API errors
- The Vyla API might be experiencing issues
- Wait a few moments and try again
- Check https://vyla-api.vercel.app/api/health

### No results from search
- Try a different search term
- Make sure you spelled the title correctly
- Some very obscure content might not be in TMDB

## Development Mode

To run the bot in development mode with auto-restart on file changes:

```bash
npm run dev
```

This uses nodemon to automatically restart the bot when you make changes to the code.

## Customization

### Changing the Embed Color

In `vyla-discord-bot.js`, find all instances of:

```javascript
.setColor('#E50914')
```

Replace `#E50914` with any hex color code you prefer.

### Changing the Number of Results

Find instances like:

```javascript
.slice(0, 5)
```

Change the `5` to show more or fewer results. Discord has a limit of 10 embeds per message.

### Adding Custom Commands

To add a new command:

1. Add the command definition in the `registerCommands()` function
2. Add a case for the command in the `interactionCreate` event handler
3. Restart the bot

### Changing Bot Status

Find this line in the `ready` event:

```javascript
client.user.setActivity('movies & TV shows', { type: 'WATCHING' });
```

Change the text or type as desired. Available types: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING.

## API Information

This bot uses the Vyla Media API hosted at:
```
https://vyla-api.vercel.app/api
```

The API provides:
- 34 streaming sources
- Complete TMDB integration
- Direct image URLs
- Enhanced metadata
- Genre filtering
- Season and episode details
- Cast and crew information

For API documentation, visit: https://github.com/endoverdosing/Vyla-API

## Rate Limiting

The Vyla API has fair usage rate limits. If you're running a large server:
- Consider caching frequently requested data
- Add delays between bulk requests
- Self-host your own Vyla API instance

## Support

For issues with:
- The Discord bot: Check this README and troubleshooting section
- The Vyla API: Visit https://github.com/endoverdosing/Vyla-API/issues
- Discord.js: Visit https://discord.js.org/

## License

MIT License - Free to use and modify

## Acknowledgments

- Vyla Media API for providing the backend
- TMDB for media data
- Discord.js for the bot framework
- All streaming providers integrated in the API

## Updates

To update the bot when new features are added:

1. Download the updated files
2. Stop the bot (Ctrl+C in terminal)
3. Run `npm install` to update dependencies
4. Start the bot again with `npm start`

## Security Notes

- Never share your bot token publicly
- Keep your `.env` file private
- Add `.env` to your `.gitignore` if using version control
- Regularly reset your bot token if you suspect it's been compromised

## Performance Tips

- The bot uses deferred replies for all commands to prevent timeout errors
- All API calls have a 10-second timeout
- Images are loaded from TMDB's CDN for fast delivery
- The bot automatically registers slash commands on startup

## Future Enhancements

Possible additions you could make:
- Pagination for search results
- Watchlist functionality using Discord's database
- Scheduled notifications for new episodes
- Movie night voting system
- User recommendations based on preferences
- Integration with other streaming APIs

Enjoy using your Vyla Discord Bot!