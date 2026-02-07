# Command Reference

Complete list of all available commands with examples.

## Search & Discovery

### /search
Search for movies and TV shows
- query: Search term (required)

Examples:
```
/search query:inception
/search query:breaking bad
/search query:marvel
```

### /trending
Get currently trending content

Example:
```
/trending
```

### /random
Get a random movie or TV show
- type: Movie or TV Show (required)

Examples:
```
/random type:Movie
/random type:TV Show
```

## Content Details

### /movie
Get detailed movie information
- id: TMDB Movie ID (required)

Example:
```
/movie id:299534
```

### /tv
Get detailed TV show information
- id: TMDB TV Show ID (required)

Example:
```
/tv id:1399
```

### /cast
Get actor or crew member information
- id: TMDB Person ID (required)

Example:
```
/cast id:3223
```

## TV Show Episodes

### /season
Get TV show season details
- tvid: TMDB TV Show ID (required)
- season: Season number (required)

Example:
```
/season tvid:1399 season:1
```

### /episode
Get specific episode details
- tvid: TMDB TV Show ID (required)
- season: Season number (required)
- episode: Episode number (required)

Example:
```
/episode tvid:1399 season:1 episode:1
```

## Popular Content

### /popular
Get popular movies or TV shows
- type: Movies or TV Shows (required)

Examples:
```
/popular type:Movies
/popular type:TV Shows
```

### /toprated
Get top rated content
- type: Movies or TV Shows (required)

Examples:
```
/toprated type:Movies
/toprated type:TV Shows
```

### /upcoming
Get upcoming movies

Example:
```
/upcoming
```

### /nowplaying
Get movies in theaters now

Example:
```
/nowplaying
```

### /airingtoday
Get TV shows airing today

Example:
```
/airingtoday
```

## Genre Browsing

### /genres
Browse content by genre
- type: Movies or TV Shows (required)
- genre: Genre name (required)

Examples:
```
/genres type:Movies genre:action
/genres type:Movies genre:comedy
/genres type:TV Shows genre:drama
/genres type:TV Shows genre:sci-fi & fantasy
```

Movie Genres:
- action
- adventure
- animation
- comedy
- crime
- documentary
- drama
- fantasy
- horror
- romance
- science fiction
- thriller
- war
- western

TV Show Genres:
- action & adventure
- animation
- comedy
- crime
- documentary
- drama
- family
- kids
- mystery
- news
- reality
- sci-fi & fantasy
- soap
- talk
- war & politics
- western

## Streaming

### /watch
Get streaming links
- type: Movie or TV Show (required)
- id: TMDB ID (required)
- season: Season number (TV shows only)
- episode: Episode number (TV shows only)

Examples:
```
/watch type:Movie id:299534
/watch type:TV Show id:1399 season:1 episode:1
```

## Finding IDs

All IDs can be found using the /search command.

Step 1: Search for content
```
/search query:avengers endgame
```

Step 2: Look for the ID field in the results

Step 3: Use that ID in other commands
```
/movie id:299534
```

## Response Information

All commands return:
- Rich embeds with images
- Ratings and metadata
- Clickable links
- High quality posters and backdrops

Search results show up to 5 items
Most list commands show up to 5 items
Episode lists show up to 10 episodes

## Tips

Use /search first to discover content IDs

Genre names are case insensitive

All commands respond within a few seconds

Streaming sources include 34 different providers

Images load from TMDB CDN for fast display

TV shows require season and episode numbers for /watch

Movie IDs and TV IDs are different even for the same title

Use /random when you can't decide what to watch

Check /trending daily for fresh content

Browse /genres to discover new shows in your favorite categories