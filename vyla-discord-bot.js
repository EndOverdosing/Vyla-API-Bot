const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const API_BASE = 'https://vyla-api.vercel.app/api';
const ALLOWED_CHANNEL_ID = process.env.ALLOWED_CHANNEL_ID || '1469774727298941050';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000
});

api.interceptors.response.use(
    response => {
        if (response.data && response.data.success === false) {
            throw new Error(response.data.error || 'API request failed');
        }
        return response;
    },
    error => {
        return Promise.reject(error);
    }
);

const GENRE_MAP = {
    movie: {
        '28': 'Action',
        '12': 'Adventure',
        '16': 'Animation',
        '35': 'Comedy',
        '80': 'Crime',
        '99': 'Documentary',
        '18': 'Drama',
        '14': 'Fantasy',
        '27': 'Horror',
        '10749': 'Romance',
        '878': 'Science Fiction',
        '53': 'Thriller',
        '10752': 'War',
        '37': 'Western'
    },
    tv: {
        '10759': 'Action & Adventure',
        '16': 'Animation',
        '35': 'Comedy',
        '80': 'Crime',
        '99': 'Documentary',
        '18': 'Drama',
        '10751': 'Family',
        '10762': 'Kids',
        '9648': 'Mystery',
        '10763': 'News',
        '10764': 'Reality',
        '10765': 'Sci-Fi & Fantasy',
        '10766': 'Soap',
        '10767': 'Talk',
        '10768': 'War & Politics',
        '37': 'Western'
    }
};

const userSessions = new Map();

function createSourceButtons(sources) {
    const rows = [];
    const maxButtons = 25;
    const buttonsPerRow = 5;

    const displaySources = sources.slice(0, maxButtons);

    displaySources.forEach((source, index) => {
        const rowIndex = Math.floor(index / buttonsPerRow);
        if (!rows[rowIndex]) {
            rows[rowIndex] = new ActionRowBuilder();
        }

        let sourceName = source.name || 'Unknown';
        if (sourceName.length > 30) {
            sourceName = sourceName.substring(0, 27) + '...';
        }

        let quality = '';
        if (source.stream_url.includes('4k') || source.name?.includes('4K')) {
            quality = ' 🔥';
        } else if (source.stream_url.includes('1080') || source.name?.includes('1080')) {
            quality = ' ⭐';
        }

        const language = source.isFrench ? ' 🇫🇷' : '';

        rows[rowIndex].addComponents(
            new ButtonBuilder()
                .setLabel(`${sourceName}${quality}${language}`)
                .setStyle(ButtonStyle.Link)
                .setURL(source.stream_url)
        );
    });

    return rows;
}

function createMediaEmbed(item, type, index) {
    const rating = item.vote_average ?? item.rating ?? 'N/A';
    const popularity = item.popularity ? item.popularity.toFixed(1) : 'N/A';
    const embed = new EmbedBuilder()
        .setColor('White')
        .setTitle(`${index}. ${item.title || item.name}`)
        .setDescription(
            item.overview
                ? item.overview.length > 300
                    ? item.overview.slice(0, 297) + '...'
                    : item.overview
                : 'No description available'
        )
        .addFields(
            { name: 'Rating', value: `${rating}/10`, inline: true },
            {
                name: 'Year',
                value: (item.release_date || item.first_air_date || item.year || 'Unknown').toString().split('-')[0],
                inline: true
            },
            { name: 'Popularity', value: `${popularity}`, inline: true }
        );

    if (item.genre_ids && item.genre_ids.length > 0) {
        const genreMap = type === 'tv' ? GENRE_MAP.tv : GENRE_MAP.movie;
        const genreNames = item.genre_ids
            .map(id => genreMap[id.toString()])
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
        if (genreNames) {
            embed.addFields({ name: 'Genres', value: genreNames, inline: false });
        }
    }

    if (item.adult) {
        embed.addFields({ name: '⚠️', value: 'Adult Content', inline: true });
    }

    if (item.title_image) {
        embed.setThumbnail(item.title_image);
    } else if (item.poster) {
        embed.setThumbnail(item.poster);
    } else if (item.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${item.poster_path}`);
    }

    if (item.backdrop) {
        embed.setImage(item.backdrop);
    } else if (item.backdrop_path) {
        embed.setImage(`https://image.tmdb.org/t/p/w780${item.backdrop_path}`);
    }

    return embed;
}

function createDetailedEmbed(data, type) {
    const info = data.data?.info || data.info || data.data;
    if (!info) throw new Error('Missing details payload');
    const rating = info.vote_average ?? info.rating ?? 'N/A';
    const popularity = info.popularity ? info.popularity.toFixed(1) : 'N/A';
    const voteCount = info.vote_count ?? 'N/A';

    const embed = new EmbedBuilder()
        .setColor('White')
        .setTitle(info.title || info.name);

    if (info.tagline) {
        embed.setDescription(`*"${info.tagline}"*\n\n${info.overview || 'No description available'}`);
    } else {
        embed.setDescription(info.overview || 'No description available');
    }

    embed.addFields(
        { name: 'Rating', value: `${rating}/10 (${voteCount} votes)`, inline: true },
        { name: 'Status', value: info.status || 'Unknown', inline: true },
        { name: 'Popularity', value: `${popularity}`, inline: true }
    );

    if (type === 'movie') {
        embed.addFields(
            { name: 'Release', value: info.release_date || 'Unknown', inline: true },
            { name: 'Runtime', value: info.runtime ? `${info.runtime} min` : 'N/A', inline: true }
        );
        if (info.budget && info.budget > 0) {
            embed.addFields({ name: 'Budget', value: `$${(info.budget / 1000000).toFixed(1)}M`, inline: true });
        }
        if (info.revenue && info.revenue > 0) {
            embed.addFields({ name: 'Revenue', value: `$${(info.revenue / 1000000).toFixed(1)}M`, inline: true });
        }
    } else {
        embed.addFields(
            { name: 'Seasons', value: info.number_of_seasons?.toString() || 'N/A', inline: true },
            { name: 'Episodes', value: info.number_of_episodes?.toString() || 'N/A', inline: true }
        );
        if (info.first_air_date) {
            embed.addFields({ name: 'First Aired', value: info.first_air_date, inline: true });
        }
        if (info.last_air_date) {
            embed.addFields({ name: 'Last Aired', value: info.last_air_date, inline: true });
        }
        if (info.type) {
            embed.addFields({ name: 'Type', value: info.type, inline: true });
        }
    }

    if (info.genres?.length) {
        embed.addFields({
            name: 'Genres',
            value: info.genres.map(g => g.name).join(', ')
        });
    }

    if (info.original_language) {
        embed.addFields({ name: 'Language', value: info.original_language.toUpperCase(), inline: true });
    }

    if (info.production_companies?.length) {
        const companies = info.production_companies.slice(0, 3).map(c => c.name).join(', ');
        embed.addFields({ name: 'Production', value: companies });
    }

    if (info.spoken_languages?.length) {
        const languages = info.spoken_languages.slice(0, 5).map(l => l.english_name).join(', ');
        embed.addFields({ name: 'Spoken Languages', value: languages });
    }

    if (data.cast?.length) {
        const castList = data.cast.slice(0, 8).map(c => c.name).join(', ');
        embed.addFields({
            name: `Cast (${data.cast.length} total)`,
            value: castList
        });
    }

    if (data.crew?.directors?.length) {
        const directors = data.crew.directors.map(d => d.name).join(', ');
        embed.addFields({ name: 'Director(s)', value: directors });
    }

    if (data.crew?.writers?.length) {
        const writers = data.crew.writers.slice(0, 3).map(w => w.name).join(', ');
        embed.addFields({ name: 'Writer(s)', value: writers });
    }

    if (info.videos?.length) {
        const trailers = info.videos.filter(v => v.type === 'Trailer').slice(0, 2);
        const clips = info.videos.filter(v => v.type === 'Clip').slice(0, 2);

        let videoText = '';
        if (trailers.length > 0) {
            videoText += `**Trailers:**\n${trailers.map(v => `[${v.name}](${v.url})`).join('\n')}`;
        }
        if (clips.length > 0) {
            if (videoText) videoText += '\n\n';
            videoText += `**Clips:**\n${clips.map(v => `[${v.name}](${v.url})`).join('\n')}`;
        }
        if (videoText) {
            embed.addFields({ name: `Videos (${info.videos.length} total)`, value: videoText });
        }
    }

    if (info.homepage) {
        embed.addFields({ name: 'Official Site', value: `[Visit Website](${info.homepage})` });
    }

    if (info.title_image) {
        embed.setThumbnail(info.title_image);
    } else if (info.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${info.poster_path}`);
    } else if (info.poster) {
        embed.setThumbnail(info.poster);
    }

    if (info.backdrop_path) {
        embed.setImage(`https://image.tmdb.org/t/p/w1280${info.backdrop_path}`);
    } else if (info.backdrop) {
        embed.setImage(info.backdrop);
    }

    return embed;
}

function createPaginationButtons(page, hasNext, hasPrev, sessionId) {
    const row = new ActionRowBuilder();
    if (hasPrev || page > 1) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${sessionId}_prev`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
        );
    }
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${sessionId}_page`)
            .setLabel(`Page ${page}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
    if (hasNext) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${sessionId}_next`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
        );
    }
    return row;
}

function createSelectionButtons(sessionId, items) {
    const options = items.slice(0, 10).map((item, index) => ({
        label: `${index + 1}. ${(item.title || item.name).substring(0, 90)}`,
        description: `${item.vote_average ?? item.rating ?? 'N/A'}/10 - ${(item.release_date || item.first_air_date || item.year || 'Unknown').toString().split('-')[0]}`,
        value: `select_${sessionId}_${index}`
    }));
    return new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`selection_${sessionId}`)
                .setPlaceholder('Choose a movie or TV show')
                .addOptions(options)
        );
}

async function updatePresence() {
    try {
        const randomType = Math.random() > 0.5 ? 'movie' : 'tv';
        const endpoint = randomType === 'movie' ? '/movie/popular' : '/tv/popular';
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const response = await api.get(`/list?endpoint=${endpoint}&page=${randomPage}`);
        const results = response.data.results || [];

        if (results.length > 0) {
            const randomItem = results[Math.floor(Math.random() * results.length)];
            const title = randomItem.title || randomItem.name;
            const rating = randomItem.vote_average ?? randomItem.rating ?? 0;
            const year = (randomItem.release_date || randomItem.first_air_date || '').split('-')[0];

            const statusMessages = [
                `${title} (${year})`,
                `${title} ⭐${rating}/10`,
                `🎬 ${title}`,
                `📺 ${title}`,
                `🍿 ${title} (${year})`,
                `Now streaming: ${title}`,
                `Trending: ${title}`,
                `Popular: ${title}`,
                `${title} • ${rating}⭐`,
                `Watch ${title}`,
                `${year} • ${title}`,
                `⭐ ${title}`,
                `🎥 ${title} • ${year}`,
                `${title} is trending!`,
                `Just added: ${title}`
            ];
            const randomMessage = statusMessages[Math.floor(Math.random() * statusMessages.length)];
            await client.user.setActivity(randomMessage, { type: 3 });
        } else {
            await client.user.setActivity('/help for commands', { type: 3 });
        }
    } catch (error) {
        console.error('Status update error:', error.message);
        await client.user.setActivity('/help for commands', { type: 3 });
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await updatePresence();
    setInterval(updatePresence, 10000);
    registerCommands();
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.mentions.has(client.user)) {
        const responses = [
            "What's up? Need help finding something to watch? Use `/help` to see what I can do!",
            "Hey there! Looking for movies or shows? Try `/search` or `/trending`!",
            "Hi! I'm here to help you discover awesome content. Use `/help` to get started!",
            "Ready to watch something amazing? Check out `/random` for a surprise pick!",
            "Hey! I've got thousands of movies and shows ready for you. Use `/help` to explore!",
            "What's good? Want recommendations? Try `/popular` or `/toprated`!",
            "Yo! Need entertainment? Use `/genres` to browse by category!",
            "Hello! Can't decide what to watch? Let me help with `/random`!"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        await message.reply(randomResponse);
    }
});

async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show all available commands and how to use the bot')
            .setDefaultMemberPermissions(PermissionFlagsBits.None),
        new SlashCommandBuilder()
            .setName('search')
            .setDescription('Search for movies and TV shows by name')
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('Movie or TV show name')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('trending')
            .setDescription('See what is trending right now'),
        new SlashCommandBuilder()
            .setName('popular')
            .setDescription('Browse popular movies or TV shows')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('What to browse')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movies', value: 'movie' },
                        { name: 'TV Shows', value: 'tv' }
                    )),
        new SlashCommandBuilder()
            .setName('toprated')
            .setDescription('Browse top rated content')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('What to browse')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movies', value: 'movie' },
                        { name: 'TV Shows', value: 'tv' }
                    )),
        new SlashCommandBuilder()
            .setName('genres')
            .setDescription('Browse movies or TV shows by genre')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Content type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movies', value: 'movie' },
                        { name: 'TV Shows', value: 'tv' }
                    )),
        new SlashCommandBuilder()
            .setName('upcoming')
            .setDescription('See upcoming movie releases'),
        new SlashCommandBuilder()
            .setName('nowplaying')
            .setDescription('See movies currently in theaters'),
        new SlashCommandBuilder()
            .setName('airingtoday')
            .setDescription('See TV shows airing today'),
        new SlashCommandBuilder()
            .setName('random')
            .setDescription('Get a random movie or TV show recommendation')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('What type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movie', value: 'movie' },
                        { name: 'TV Show', value: 'tv' }
                    )),
        new SlashCommandBuilder()
            .setName('cast')
            .setDescription('Get detailed information about an actor or actress')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('Actor/Actress TMDB ID')
                    .setRequired(true))
    ];
    try {
        console.log('Registering slash commands...');
        await client.application.commands.set(commands);
        console.log('Slash commands registered successfully');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
        return interaction.reply({
            content: 'This bot can only be used in the designated channel.',
            ephemeral: true
        });
    }
    const { commandName, options } = interaction;
    try {
        await interaction.deferReply();
        switch (commandName) {
            case 'help': {
                const embed = new EmbedBuilder()
                    .setColor('White')
                    .setTitle('Vyla Bot - Help Guide')
                    .setDescription('I help you discover and watch movies and TV shows. Here is how to use me:')
                    .addFields(
                        {
                            name: 'Search for Content',
                            value: '`/search title:avengers` - Find movies or shows by name. I will show you results and you can select what you want to see.',
                            inline: false
                        },
                        {
                            name: 'Browse by Category',
                            value: '`/trending` - See what is hot right now\n`/popular type:Movies` - Browse popular content\n`/toprated type:TV Shows` - See highest rated content',
                            inline: false
                        },
                        {
                            name: 'Browse by Genre',
                            value: '`/genres type:Movies` - I will show you all genres to choose from. No need to remember genre names!',
                            inline: false
                        },
                        {
                            name: 'Special Lists',
                            value: '`/upcoming` - Upcoming movies\n`/nowplaying` - Movies in theaters\n`/airingtoday` - TV shows on today',
                            inline: false
                        },
                        {
                            name: 'Random Pick',
                            value: '`/random type:Movie` - Can\'t decide? Let me pick something for you!',
                            inline: false
                        },
                        {
                            name: 'Cast Information',
                            value: '`/cast id:3223` - Get detailed info about actors and actresses',
                            inline: false
                        },
                        {
                            name: 'Streaming Sources',
                            value: '**34+ sources available** including:\n• VidSrc • VidLink • 2Embed • P-Stream • MultiEmbed\n• VidEasy (4K) • VidFast (4K) • SmashyStream\n• AutoEmbed • VidPrime • And 25+ more!\n\nAll quality levels: SD, 720p, 1080p, 4K',
                            inline: false
                        },
                        {
                            name: 'How It Works',
                            value: 'Just use the commands above. When I show results, you can:\n- Use the dropdown menu to select what interests you\n- Click Next/Previous to browse more results\n- Click Watch to get ALL streaming links\n- Choose from multiple sources and qualities\n\nNo IDs or complicated stuff needed!',
                            inline: false
                        }
                    )
                    .setFooter({ text: '34+ streaming sources • All quality levels • Powered by Vyla API' });
                await interaction.editReply({ embeds: [embed] });
                break;
            }
            case 'search': {
                const query = options.getString('title');
                const response = await api.get(`/search?q=${encodeURIComponent(query)}&page=1`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply(`No results found for "${query}". Try a different search term.`);
                    return;
                }

                const sessionId = `search_${Date.now()}`;
                const sessionData = {
                    type: 'search',
                    query: query,
                    currentPage: 1,
                    maxPageReached: 1,
                    hasMore: response.data.meta?.has_next || false,
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.type || item.media_type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: `Found ${results.length} results for "${query}" on page 1. Select one to see details:`,
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'trending': {
                const response = await api.get('/home');
                const sections = response.data.data || [];
                const trendingSection = sections.find(s => s.title && s.title.toLowerCase().includes('trending'));
                if (!trendingSection || !trendingSection.items) {
                    await interaction.editReply('Could not fetch trending content right now.');
                    return;
                }
                const results = trendingSection.items;
                const sessionId = `trending_${Date.now()}`;
                const sessionData = {
                    type: 'trending',
                    results: results,
                    currentPage: 1,
                    totalPages: Math.ceil(results.length / 10),
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.media_type || item.type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (results.length > 10) {
                    components.push(createPaginationButtons(1, true, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: 'Trending now - Select one to see details:',
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'popular': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
                const response = await api.get(`/list?endpoint=${endpoint}&page=1`);
                const results = response.data.results || [];
                if (results.length === 0) {
                    await interaction.editReply('Could not fetch popular content right now.');
                    return;
                }
                const sessionId = `popular_${Date.now()}`;
                const sessionData = {
                    type: 'popular',
                    contentType: type,
                    endpoint: endpoint,
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1,
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: `Popular ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'toprated': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
                const response = await api.get(`/list?endpoint=${endpoint}&page=1`);
                const results = response.data.results || [];
                if (results.length === 0) {
                    await interaction.editReply('Could not fetch top rated content right now.');
                    return;
                }
                const sessionId = `toprated_${Date.now()}`;
                const sessionData = {
                    type: 'toprated',
                    contentType: type,
                    endpoint: endpoint,
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1,
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'genres': {
                const type = options.getString('type');
                try {
                    const response = await api.get(`/genres/${type}`);
                    const genres = response.data.genres || [];
                    const genreOptions = genres.map(genre => ({
                        label: genre.name,
                        value: `genre_${type}_${genre.id}`,
                        description: `Browse ${genre.name} ${type === 'movie' ? 'movies' : 'TV shows'}`
                    }));
                    const rows = [];
                    for (let i = 0; i < genreOptions.length; i += 25) {
                        rows.push(
                            new ActionRowBuilder()
                                .addComponents(
                                    new StringSelectMenuBuilder()
                                        .setCustomId(`genre_select_${i}`)
                                        .setPlaceholder(`Choose a genre ${i > 0 ? `(Part ${Math.floor(i / 25) + 1})` : ''}`)
                                        .addOptions(genreOptions.slice(i, i + 25))
                                )
                        );
                    }
                    await interaction.editReply({
                        content: `Select a genre to browse ${type === 'movie' ? 'movies' : 'TV shows'}:`,
                        components: rows
                    });
                } catch (error) {
                    await interaction.editReply(`Error fetching genres: ${error.message}`);
                }
                break;
            }
            case 'upcoming': {
                const response = await api.get('/list?endpoint=/movie/upcoming&page=1');
                const results = response.data.results || [];
                if (results.length === 0) {
                    await interaction.editReply('Could not fetch upcoming movies right now.');
                    return;
                }
                const sessionId = `upcoming_${Date.now()}`;
                const sessionData = {
                    type: 'upcoming',
                    contentType: 'movie',
                    endpoint: '/movie/upcoming',
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1,
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'movie', index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: 'Upcoming Movies - Select one to see details:',
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'nowplaying': {
                const response = await api.get('/list?endpoint=/movie/now_playing&page=1');
                const results = response.data.results || [];
                if (results.length === 0) {
                    await interaction.editReply('Could not fetch movies in theaters right now.');
                    return;
                }
                const sessionId = `nowplaying_${Date.now()}`;
                const sessionData = {
                    type: 'nowplaying',
                    contentType: 'movie',
                    endpoint: '/movie/now_playing',
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1,
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'movie', index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: 'Now Playing in Theaters - Select one to see details:',
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'airingtoday': {
                const response = await api.get('/list?endpoint=/tv/airing_today&page=1');
                const results = response.data.results || [];
                if (results.length === 0) {
                    await interaction.editReply('Could not fetch shows airing today right now.');
                    return;
                }
                const sessionId = `airingtoday_${Date.now()}`;
                const sessionData = {
                    type: 'airingtoday',
                    contentType: 'tv',
                    endpoint: '/tv/airing_today',
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1,
                    interactionId: interaction.id
                };
                userSessions.set(sessionId, sessionData);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'tv', index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                const reply = await interaction.editReply({
                    content: 'Airing Today - Select one to see details:',
                    embeds,
                    components
                });

                sessionData.messageId = reply.id;
                userSessions.set(sessionId, sessionData);
                setTimeout(() => userSessions.delete(sessionId), 3600000);
                break;
            }
            case 'random': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
                const response = await api.get(`/list?endpoint=${endpoint}&page=1`);
                const results = response.data.results || [];
                if (results.length === 0) {
                    await interaction.editReply('Could not get random content right now.');
                    return;
                }
                const randomItem = results[Math.floor(Math.random() * results.length)];
                const detailsResponse = await api.get(`/details/${type}/${randomItem.id}`);
                const embed = createDetailedEmbed(detailsResponse.data, type);

                const sourcesResponse = await api.get(`/player/${type}/${randomItem.id}`);
                const sourcesCount = sourcesResponse.data.sources?.length || 0;

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`watch_${type}_${randomItem.id}`)
                            .setLabel(`Watch Now (${sourcesCount} sources)`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`random_${type}`)
                            .setLabel('Get Another Random')
                            .setStyle(ButtonStyle.Primary)
                    );

                if (sourcesCount > 0) {
                    embed.addFields({
                        name: 'Streaming Sources',
                        value: `${sourcesCount} sources available (SD to 4K)`
                    });
                }

                await interaction.editReply({
                    content: `Random ${type === 'movie' ? 'Movie' : 'TV Show'} Pick:`,
                    embeds: [embed],
                    components: [row]
                });
                break;
            }
            case 'cast': {
                const castId = options.getInteger('id');
                const response = await api.get(`/cast/${castId}`);
                const castData = response.data.data;

                const embed = new EmbedBuilder()
                    .setColor('White')
                    .setTitle(castData.name)
                    .setDescription(castData.biography ?
                        (castData.biography.length > 500 ? castData.biography.slice(0, 497) + '...' : castData.biography)
                        : 'No biography available')
                    .addFields(
                        { name: 'Known For', value: castData.known_for_department || 'N/A', inline: true },
                        { name: 'Birthday', value: castData.birthday || 'N/A', inline: true },
                        { name: 'Place of Birth', value: castData.place_of_birth || 'N/A', inline: false }
                    );

                if (castData.profile) {
                    embed.setThumbnail(castData.profile);
                }

                if (castData.known_for?.movies?.length) {
                    const movies = castData.known_for.movies.slice(0, 5).map(m =>
                        `${m.title} (${m.year}) - ${m.character}`
                    ).join('\n');
                    embed.addFields({ name: 'Notable Movies', value: movies });
                }

                if (castData.known_for?.shows?.length) {
                    const shows = castData.known_for.shows.slice(0, 5).map(s =>
                        `${s.name} (${s.year}) - ${s.character}`
                    ).join('\n');
                    embed.addFields({ name: 'Notable TV Shows', value: shows });
                }

                await interaction.editReply({ embeds: [embed] });
                break;
            }
            default:
                await interaction.editReply('Unknown command.');
        }
    } catch (error) {
        console.error('Error executing command:', error);
        const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
        await interaction.editReply(`Error: ${errorMessage}`);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'back_to_results') {
            await interaction.deferUpdate();

            let foundSession = null;
            let foundSessionKey = null;

            for (const [sessionKey, session] of userSessions.entries()) {
                if (session && session.detailMessageId === interaction.message.id) {
                    foundSession = session;
                    foundSessionKey = sessionKey;
                    break;
                }
            }

            if (!foundSession) {
                for (const [sessionKey, session] of userSessions.entries()) {
                    if (session && session.messageId === interaction.message.id) {
                        foundSession = session;
                        foundSessionKey = sessionKey;
                        break;
                    }
                }
            }

            if (!foundSession) {
                await interaction.editReply({
                    content: 'Session not found. Please use the command again.',
                    embeds: [],
                    components: []
                });
                return;
            }

            try {
                if (foundSession.type === 'search') {
                    const response = await api.get(`/search?q=${encodeURIComponent(foundSession.query)}&page=${foundSession.currentPage}`);
                    const results = response.data.results || [];
                    const embeds = results.slice(0, 10).map((item, index) =>
                        createMediaEmbed(item, item.type || item.media_type, (foundSession.currentPage - 1) * 10 + index + 1)
                    );
                    const content = `Found ${results.length} results for "${foundSession.query}" on page ${foundSession.currentPage}. Select one to see details:`;
                    const components = [createSelectionButtons(foundSessionKey, results)];
                    if (response.data.meta?.has_next || foundSession.currentPage < (foundSession.maxPageReached || 1)) {
                        components.push(createPaginationButtons(foundSession.currentPage, response.data.meta?.has_next || false, foundSession.currentPage > 1, foundSessionKey));
                    }

                    const reply = await interaction.editReply({ content, embeds, components });
                    foundSession.messageId = reply.id;
                    delete foundSession.detailMessageId;
                    userSessions.set(foundSessionKey, foundSession);
                    return;

                } else if (foundSession.type === 'trending' && foundSession.results) {
                    const startIndex = (foundSession.currentPage - 1) * 10;
                    const results = foundSession.results.slice(startIndex, startIndex + 10);
                    const embeds = results.map((item, index) =>
                        createMediaEmbed(item, item.media_type || item.type, startIndex + index + 1)
                    );
                    const components = [createSelectionButtons(foundSessionKey, results)];
                    if (foundSession.results.length > startIndex + 10 || foundSession.currentPage < foundSession.totalPages) {
                        components.push(createPaginationButtons(foundSession.currentPage, true, foundSession.currentPage > 1, foundSessionKey));
                    }

                    const reply = await interaction.editReply({ content: 'Trending now - Select one to see details:', embeds, components });
                    foundSession.messageId = reply.id;
                    delete foundSession.detailMessageId;
                    userSessions.set(foundSessionKey, foundSession);
                    return;

                } else if (foundSession.endpoint) {
                    const response = await api.get(`/list?endpoint=${foundSession.endpoint}&page=${foundSession.currentPage}`);
                    const results = response.data.results || [];
                    const embeds = results.slice(0, 10).map((item, index) =>
                        createMediaEmbed(item, foundSession.contentType, (foundSession.currentPage - 1) * 10 + index + 1)
                    );
                    let content = '';
                    if (foundSession.type === 'popular') {
                        content = `Popular ${foundSession.contentType === 'movie' ? 'Movies' : 'TV Shows'} - Page ${foundSession.currentPage}`;
                    } else if (foundSession.type === 'toprated') {
                        content = `Top Rated ${foundSession.contentType === 'movie' ? 'Movies' : 'TV Shows'} - Page ${foundSession.currentPage}`;
                    } else if (foundSession.type === 'upcoming') {
                        content = `Upcoming Movies - Page ${foundSession.currentPage}`;
                    } else if (foundSession.type === 'nowplaying') {
                        content = `Now Playing in Theaters - Page ${foundSession.currentPage}`;
                    } else if (foundSession.type === 'airingtoday') {
                        content = `Airing Today - Page ${foundSession.currentPage}`;
                    }
                    const components = [createSelectionButtons(foundSessionKey, results)];
                    if (response.data.meta?.has_next) {
                        components.push(createPaginationButtons(foundSession.currentPage, true, foundSession.currentPage > 1, foundSessionKey));
                    }

                    const reply = await interaction.editReply({ content, embeds, components });
                    foundSession.messageId = reply.id;
                    delete foundSession.detailMessageId;
                    userSessions.set(foundSessionKey, foundSession);
                    return;

                } else if (foundSession.type === 'genre') {
                    const response = await api.get(`/genres/${foundSession.contentType}/${foundSession.genreId}?page=${foundSession.currentPage}&sort_by=popularity.desc`);
                    const results = response.data.results || [];
                    const embeds = results.slice(0, 10).map((item, index) =>
                        createMediaEmbed(item, foundSession.contentType, (foundSession.currentPage - 1) * 10 + index + 1)
                    );
                    const genreName = GENRE_MAP[foundSession.contentType][foundSession.genreId] || 'Selected Genre';
                    const content = `${genreName} ${foundSession.contentType === 'movie' ? 'Movies' : 'TV Shows'} - Page ${foundSession.currentPage}`;
                    const components = [createSelectionButtons(foundSessionKey, results)];
                    if (response.data.meta?.has_next) {
                        components.push(createPaginationButtons(foundSession.currentPage, true, foundSession.currentPage > 1, foundSessionKey));
                    }

                    const reply = await interaction.editReply({ content, embeds, components });
                    foundSession.messageId = reply.id;
                    delete foundSession.detailMessageId;
                    userSessions.set(foundSessionKey, foundSession);
                    return;
                }
            } catch (error) {
                console.error('Back to results error:', error);
                await interaction.editReply({
                    content: 'Error loading results. Please try again.',
                    embeds: [],
                    components: []
                });
                return;
            }

            await interaction.editReply({
                content: 'Session type not supported for back navigation.',
                embeds: [],
                components: []
            });
            return;
        }

        if (interaction.customId.startsWith('watch_')) {
            await interaction.deferUpdate();
            const parts = interaction.customId.split('_');
            const type = parts[1];
            const id = parts[2];

            try {
                if (type === 'tv') {
                    const tvResponse = await api.get(`/details/tv/${id}`);
                    const seasons = tvResponse.data.info?.number_of_seasons || tvResponse.data.data?.info?.number_of_seasons || 1;
                    const seasonOptions = Array.from({ length: Math.min(seasons, 25) }, (_, i) => ({
                        label: `Season ${i + 1}`,
                        value: `season_${id}_${i + 1}`,
                        description: `View episodes for Season ${i + 1}`
                    }));
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('season_select')
                                .setPlaceholder('Choose a season')
                                .addOptions(seasonOptions)
                        );
                    await interaction.editReply({
                        content: 'Select a season to see episodes:',
                        components: [row]
                    });
                } else {
                    const playerResponse = await api.get(`/player/${type}/${id}`);
                    const sources = playerResponse.data.sources || [];

                    if (sources.length === 0) {
                        await interaction.followUp({ content: 'No streaming sources available right now.', ephemeral: true });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setColor('White')
                        .setTitle('Streaming Sources')
                        .setDescription(`**${sources.length} sources available**\nSelect a source to start watching:`)
                        .addFields(
                            { name: 'Quality Range', value: 'SD to 4K available', inline: true },
                            { name: 'Languages', value: sources.some(s => s.isFrench) ? 'Multi-language' : 'English', inline: true },
                            { name: 'Configuration', value: 'Click and play - No setup needed', inline: true }
                        );

                    const rows = createSourceButtons(sources);
                    await interaction.editReply({
                        embeds: [embed],
                        components: rows
                    });
                }
            } catch (error) {
                await interaction.followUp({ content: 'Could not load streaming sources. Please try again.', ephemeral: true });
            }
            return;
        }

        if (interaction.customId.startsWith('random_')) {
            await interaction.deferUpdate();
            const type = interaction.customId.split('_')[1];
            const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
            try {
                const response = await api.get(`/list?endpoint=${endpoint}&page=1`);
                const results = response.data.results || [];
                const randomItem = results[Math.floor(Math.random() * results.length)];
                const detailsResponse = await api.get(`/details/${type}/${randomItem.id}`);
                const embed = createDetailedEmbed(detailsResponse.data, type);

                const sourcesResponse = await api.get(`/player/${type}/${randomItem.id}`);
                const sourcesCount = sourcesResponse.data.sources?.length || 0;

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`watch_${type}_${randomItem.id}`)
                            .setLabel(`Watch Now (${sourcesCount} sources)`)
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`random_${type}`)
                            .setLabel('Get Another Random')
                            .setStyle(ButtonStyle.Primary)
                    );

                if (sourcesCount > 0) {
                    embed.addFields({
                        name: 'Streaming Sources',
                        value: `${sourcesCount} sources available`
                    });
                }

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            } catch (error) {
                await interaction.followUp({ content: 'Could not get random content. Please try again.', ephemeral: true });
            }
            return;
        }

        if (interaction.customId.includes('_prev') || interaction.customId.includes('_next')) {
            await interaction.deferUpdate();

            const parts = interaction.customId.split('_');
            const sessionId = `${parts[0]}_${parts[1]}`;
            const session = userSessions.get(sessionId);

            if (!session) {
                await interaction.followUp({ content: 'Session expired. Please run the command again.', ephemeral: true });
                return;
            }

            let page = session.currentPage || 1;
            if (interaction.customId.includes('_prev')) {
                page = Math.max(1, page - 1);
            } else if (interaction.customId.includes('_next')) {
                page = page + 1;
            }

            try {
                let results = [];
                let hasNext = false;
                let hasPrev = page > 1;

                if (session.type === 'search') {
                    const response = await api.get(`/search?q=${encodeURIComponent(session.query)}&page=${page}`);
                    results = response.data.results || [];

                    if (results.length === 0) {
                        await interaction.followUp({ content: 'No more results available on this page.', ephemeral: true });
                        return;
                    }

                    hasNext = response.data.meta?.has_next || false;
                } else if (session.type === 'genre') {
                    const response = await api.get(`/genres/${session.contentType}/${session.genreId}?page=${page}&sort_by=popularity.desc`);
                    results = response.data.results || [];
                    hasNext = response.data.meta?.has_next || false;
                } else if (session.type === 'trending') {
                    const startIndex = (page - 1) * 10;
                    results = session.results.slice(startIndex, startIndex + 10);
                    hasNext = startIndex + 10 < session.results.length;
                } else if (session.endpoint) {
                    const response = await api.get(`/list?endpoint=${session.endpoint}&page=${page}`);
                    results = response.data.results || [];
                    hasNext = response.data.meta?.has_next || false;
                }

                if (results.length === 0 && page > 1) {
                    await interaction.followUp({ content: 'No more pages available.', ephemeral: true });
                    return;
                }

                session.currentPage = page;
                if (page > (session.maxPageReached || 1)) {
                    session.maxPageReached = page;
                }
                userSessions.set(sessionId, session);

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.type || item.media_type || session.contentType, (page - 1) * 10 + index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];
                components.push(createPaginationButtons(page, hasNext, hasPrev, sessionId));

                let content = '';
                if (session.type === 'search') {
                    content = `Found ${results.length} results for "${session.query}" on page ${page}. Select one to see details:`;
                } else if (session.type === 'genre') {
                    const genreName = GENRE_MAP[session.contentType][session.genreId] || 'Selected Genre';
                    content = `${genreName} ${session.contentType === 'movie' ? 'Movies' : 'TV Shows'} - Page ${page}`;
                } else {
                    content = `Page ${page} - Select an item:`;
                }

                const reply = await interaction.editReply({
                    content: content,
                    embeds,
                    components
                });

                session.messageId = reply.id;
                userSessions.set(sessionId, session);
            } catch (error) {
                console.error('Pagination error:', error);
                await interaction.followUp({ content: 'Could not load more content. Please try again.', ephemeral: true });
            }
            return;
        }

        if (interaction.customId.startsWith('view_cast_')) {
            await interaction.deferUpdate();
            const parts = interaction.customId.split('_');
            const type = parts[2];
            const id = parts[3];
            const page = parseInt(parts[4]) || 1;

            try {
                const detailsResponse = await api.get(`/details/${type}/${id}`);
                const cast = detailsResponse.data.cast || [];
                const crew = detailsResponse.data.crew || {};

                if (cast.length === 0 && (!crew.directors || crew.directors.length === 0)) {
                    await interaction.followUp({ content: 'No cast information available.', ephemeral: true });
                    return;
                }

                const castPerPage = 5;
                const totalPages = Math.ceil(cast.length / castPerPage);
                const startIndex = (page - 1) * castPerPage;
                const endIndex = Math.min(startIndex + castPerPage, cast.length);
                const castSlice = cast.slice(startIndex, endIndex);

                const embeds = [];

                if (page === 1) {
                    const crewEmbed = new EmbedBuilder()
                        .setColor('White')
                        .setTitle(`Cast & Crew - ${detailsResponse.data.info?.title || detailsResponse.data.info?.name}`);

                    const crewFields = [];

                    if (crew.directors?.length) {
                        crewFields.push({
                            name: 'Director(s)',
                            value: crew.directors.map(d => d.name).join(', '),
                            inline: false
                        });
                    }

                    if (crew.writers?.length) {
                        crewFields.push({
                            name: 'Writer(s)',
                            value: crew.writers.slice(0, 3).map(w => w.name).join(', '),
                            inline: false
                        });
                    }

                    if (crewFields.length > 0) {
                        crewEmbed.addFields(crewFields);
                        crewEmbed.setDescription(`Showing ${startIndex + 1}-${endIndex} of ${cast.length} cast members`);
                        embeds.push(crewEmbed);
                    }
                }

                castSlice.forEach(member => {
                    const castEmbed = new EmbedBuilder()
                        .setColor('White')
                        .setTitle(member.name)
                        .addFields(
                            { name: 'Character', value: member.character || 'Unknown', inline: true },
                            { name: 'Known For', value: member.known_for_department || 'Acting', inline: true }
                        );

                    if (member.profile) {
                        castEmbed.setImage(member.profile);
                    }

                    embeds.push(castEmbed);
                });

                const buttons = [];

                if (page > 1) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`view_cast_${type}_${id}_${page - 1}`)
                            .setLabel('◀ Previous')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                if (page < totalPages) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`view_cast_${type}_${id}_${page + 1}`)
                            .setLabel('Next ▶')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`back_to_detail_${type}_${id}`)
                        .setLabel('Back to Details')
                        .setStyle(ButtonStyle.Secondary)
                );

                const row = new ActionRowBuilder().addComponents(...buttons);

                await interaction.editReply({
                    content: page === 1 && embeds.length > 1 ? null : `Showing ${startIndex + 1}-${endIndex} of ${cast.length} cast members`,
                    embeds: embeds,
                    components: [row]
                });
            } catch (error) {
                console.error('View cast error:', error);
                await interaction.followUp({ content: 'Could not load cast information. Please try again.', ephemeral: true });
            }
            return;
        }

        if (interaction.customId.startsWith('view_trailers_')) {
            await interaction.deferUpdate();
            const parts = interaction.customId.split('_');
            const type = parts[2];
            const id = parts[3];

            try {
                const detailsResponse = await api.get(`/details/${type}/${id}`);
                const info = detailsResponse.data.info || detailsResponse.data.data?.info;
                const videos = info?.videos || [];

                if (videos.length === 0) {
                    await interaction.followUp({ content: 'No videos available.', ephemeral: true });
                    return;
                }

                const trailers = videos.filter(v => v.type === 'Trailer');
                const teasers = videos.filter(v => v.type === 'Teaser');
                const clips = videos.filter(v => v.type === 'Clip');
                const featurettes = videos.filter(v => v.type === 'Featurette');
                const behindScenes = videos.filter(v => v.type === 'Behind the Scenes');

                const embed = new EmbedBuilder()
                    .setColor('White')
                    .setTitle(`Videos - ${info.title || info.name}`)
                    .setDescription(`${videos.length} total videos available`);

                if (info.title_image) {
                    embed.setThumbnail(info.title_image);
                } else if (info.poster) {
                    embed.setThumbnail(info.poster);
                }

                if (trailers.length > 0) {
                    const trailerList = trailers.slice(0, 5).map(v =>
                        `[${v.name}](${v.url})`
                    ).join('\n');
                    embed.addFields({ name: `Trailers (${trailers.length})`, value: trailerList, inline: false });
                }

                if (teasers.length > 0) {
                    const teaserList = teasers.slice(0, 3).map(v =>
                        `[${v.name}](${v.url})`
                    ).join('\n');
                    embed.addFields({ name: `Teasers (${teasers.length})`, value: teaserList, inline: false });
                }

                if (clips.length > 0) {
                    const clipList = clips.slice(0, 5).map(v =>
                        `[${v.name}](${v.url})`
                    ).join('\n');
                    embed.addFields({ name: `Clips (${clips.length})`, value: clipList, inline: false });
                }

                if (featurettes.length > 0) {
                    const featuretteList = featurettes.slice(0, 3).map(v =>
                        `[${v.name}](${v.url})`
                    ).join('\n');
                    embed.addFields({ name: `Featurettes (${featurettes.length})`, value: featuretteList, inline: false });
                }

                if (behindScenes.length > 0) {
                    const behindList = behindScenes.slice(0, 3).map(v =>
                        `[${v.name}](${v.url})`
                    ).join('\n');
                    embed.addFields({ name: `Behind the Scenes (${behindScenes.length})`, value: behindList, inline: false });
                }

                const buttons = [];

                if (info.trailer_url) {
                    buttons.push(
                        new ButtonBuilder()
                            .setLabel('Watch Main Trailer')
                            .setStyle(ButtonStyle.Link)
                            .setURL(info.trailer_url)
                    );
                }

                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`back_to_detail_${type}_${id}`)
                        .setLabel('Back to Details')
                        .setStyle(ButtonStyle.Secondary)
                );

                const backButton = new ActionRowBuilder().addComponents(...buttons);

                await interaction.editReply({
                    content: null,
                    embeds: [embed],
                    components: [backButton]
                });
            } catch (error) {
                console.error('View trailers error:', error);
                await interaction.followUp({ content: 'Could not load videos. Please try again.', ephemeral: true });
            }
            return;
        }
        if (interaction.customId.startsWith('view_clips_')) {
            await interaction.deferUpdate();
            const parts = interaction.customId.split('_');
            const type = parts[2];
            const id = parts[3];

            try {
                const detailsResponse = await api.get(`/details/${type}/${id}`);
                const info = detailsResponse.data.info || detailsResponse.data.data?.info;
                const videos = info?.videos || [];
                const clips = videos.filter(v => v.type === 'Clip');

                if (clips.length === 0) {
                    await interaction.followUp({ content: 'No clips available.', ephemeral: true });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('White')
                    .setTitle(`Clips - ${info.title || info.name}`)
                    .setDescription(`${clips.length} clips available`);

                if (info.title_image) {
                    embed.setThumbnail(info.title_image);
                } else if (info.poster) {
                    embed.setThumbnail(info.poster);
                }

                const clipList = clips.slice(0, 10).map(v =>
                    `[${v.name}](${v.url})`
                ).join('\n');
                embed.addFields({ name: `All Clips`, value: clipList, inline: false });

                const buttons = [
                    new ButtonBuilder()
                        .setCustomId(`back_to_detail_${type}_${id}`)
                        .setLabel('Back to Details')
                        .setStyle(ButtonStyle.Secondary)
                ];

                const row = new ActionRowBuilder().addComponents(...buttons);

                await interaction.editReply({
                    content: null,
                    embeds: [embed],
                    components: [row]
                });
            } catch (error) {
                console.error('View clips error:', error);
                await interaction.followUp({ content: 'Could not load clips. Please try again.', ephemeral: true });
            }
            return;
        }

        if (interaction.customId.startsWith('back_to_detail_')) {
            await interaction.deferUpdate();
            const parts = interaction.customId.split('_');
            const type = parts[3];
            const id = parts[4];

            try {
                const detailsResponse = await api.get(`/details/${type}/${id}`);
                const embed = createDetailedEmbed(detailsResponse.data, type);

                const buttons = [
                    new ButtonBuilder()
                        .setCustomId(`watch_${type}_${id}`)
                        .setLabel('Watch Now')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('back_to_results')
                        .setLabel('Back to Results')
                        .setStyle(ButtonStyle.Secondary)
                ];

                if (detailsResponse.data.cast && detailsResponse.data.cast.length > 0) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`view_cast_${type}_${id}_1`)
                            .setLabel(`View Cast (${detailsResponse.data.cast.length})`)
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                const info = detailsResponse.data.info || detailsResponse.data.data?.info;

                if (info?.videos && info.videos.length > 0) {
                    const trailers = info.videos.filter(v => v.type === 'Trailer' || v.type === 'Teaser');
                    if (trailers.length > 0) {
                        buttons.push(
                            new ButtonBuilder()
                                .setCustomId(`view_trailers_${type}_${id}`)
                                .setLabel(`Trailers (${trailers.length})`)
                                .setStyle(ButtonStyle.Primary)
                        );
                    }

                    const clips = info.videos.filter(v => v.type === 'Clip');
                    if (clips.length > 0) {
                        buttons.push(
                            new ButtonBuilder()
                                .setCustomId(`view_clips_${type}_${id}`)
                                .setLabel(`Clips (${clips.length})`)
                                .setStyle(ButtonStyle.Primary)
                        );
                    }
                }

                if (info?.homepage) {
                    buttons.push(
                        new ButtonBuilder()
                            .setLabel('Official Website')
                            .setStyle(ButtonStyle.Link)
                            .setURL(info.homepage)
                    );
                }

                const rows = [];
                for (let i = 0; i < buttons.length; i += 5) {
                    rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
                }

                await interaction.editReply({
                    content: null,
                    embeds: [embed],
                    components: rows
                });
            } catch (error) {
                console.error('Back to detail error:', error);
                await interaction.followUp({ content: 'Could not load details. Please try again.', ephemeral: true });
            }
            return;
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'season_select') {
        await interaction.deferUpdate();
        const selectedValue = interaction.values[0];
        const parts = selectedValue.split('_');
        const tvId = parts[1];
        const seasonNum = parts[2];
        try {
            const seasonResponse = await api.get(`/tv/${tvId}/season/${seasonNum}`);
            const episodes = seasonResponse.data.data?.episodes || [];
            if (episodes.length === 0) {
                await interaction.followUp({ content: 'No episodes found for this season.', ephemeral: true });
                return;
            }
            const episodeOptions = episodes.slice(0, 25).map(ep => ({
                label: `E${ep.episode_number}: ${ep.name.substring(0, 80)}`,
                value: `episode_${tvId}_${seasonNum}_${ep.episode_number}`,
                description: `${ep.vote_average || ep.rating || 'N/A'}/10 - ${ep.air_date || 'Unknown'}`
            }));
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('episode_select')
                        .setPlaceholder('Choose an episode to watch')
                        .addOptions(episodeOptions)
                );
            await interaction.editReply({
                content: `Season ${seasonNum} Episodes - Select one to watch:`,
                components: [row]
            });
        } catch (error) {
            await interaction.followUp({ content: 'Could not load episodes. Please try again.', ephemeral: true });
        }
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'episode_select') {
        await interaction.deferUpdate();
        const selectedValue = interaction.values[0];
        const parts = selectedValue.split('_');
        const tvId = parts[1];
        const season = parts[2];
        const episode = parts[3];

        try {
            const playerResponse = await api.get(`/player/tv/${tvId}?s=${season}&e=${episode}`);
            const sources = playerResponse.data.sources || [];

            if (sources.length === 0) {
                await interaction.followUp({ content: 'No streaming sources available for this episode.', ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('White')
                .setTitle(`Season ${season} Episode ${episode}`)
                .setDescription(`**${sources.length} sources available**\nSelect a source to start watching:`)
                .addFields(
                    { name: 'Episode', value: `Season ${season}, Episode ${episode}`, inline: true },
                    { name: 'Sources', value: `${sources.length} available`, inline: true },
                    { name: 'Playback', value: 'Direct streaming', inline: true }
                );

            const rows = createSourceButtons(sources);
            await interaction.editReply({
                embeds: [embed],
                components: rows
            });
        } catch (error) {
            await interaction.followUp({ content: 'Could not load streaming sources. Please try again.', ephemeral: true });
        }
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('selection_')) {
        await interaction.deferUpdate();
        const sessionId = interaction.customId.replace('selection_', '');
        const session = userSessions.get(sessionId);
        if (!session) {
            await interaction.followUp({ content: 'Session expired.', ephemeral: true });
            return;
        }
        const selectedIndex = parseInt(interaction.values[0].split('_').pop());

        try {
            let item;
            const startIndex = (session.currentPage - 1) * 10;

            if (session.type === 'search') {
                const response = await api.get(`/search?q=${encodeURIComponent(session.query)}&page=${session.currentPage}`);
                const currentResults = response.data.results || [];
                item = currentResults[selectedIndex];
            } else if (session.type === 'genre') {
                const response = await api.get(`/genres/${session.contentType}/${session.genreId}?page=${session.currentPage}&sort_by=popularity.desc`);
                const currentResults = response.data.results || [];
                item = currentResults[selectedIndex];
            } else if (session.type === 'trending' && session.results) {
                const allResults = session.results || [];
                item = allResults[startIndex + selectedIndex];
            } else if (session.endpoint) {
                const response = await api.get(`/list?endpoint=${session.endpoint}&page=${session.currentPage}`);
                const currentResults = response.data.results || [];
                item = currentResults[selectedIndex];
            } else if (session.results) {
                const allResults = session.results || [];
                item = allResults[startIndex + selectedIndex];
            }

            if (!item) {
                await interaction.followUp({ content: 'Item not found. Please select again.', ephemeral: true });
                return;
            }

            const type = item.type || item.media_type || session.contentType;
            const detailsResponse = await api.get(`/details/${type}/${item.id}`);
            const embed = createDetailedEmbed(detailsResponse.data, type);

            const buttons = [
                new ButtonBuilder()
                    .setCustomId(`watch_${type}_${item.id}`)
                    .setLabel('Watch Now')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_results')
                    .setLabel('Back to Results')
                    .setStyle(ButtonStyle.Secondary)
            ];

            if (detailsResponse.data.cast && detailsResponse.data.cast.length > 0) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`view_cast_${type}_${item.id}_1`)
                        .setLabel(`View Cast (${detailsResponse.data.cast.length})`)
                        .setStyle(ButtonStyle.Primary)
                );
            }

            const info = detailsResponse.data.info || detailsResponse.data.data?.info;

            if (info?.videos && info.videos.length > 0) {
                const trailers = info.videos.filter(v => v.type === 'Trailer' || v.type === 'Teaser');
                if (trailers.length > 0) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`view_trailers_${type}_${item.id}`)
                            .setLabel(`Trailers (${trailers.length})`)
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                const clips = info.videos.filter(v => v.type === 'Clip');
                if (clips.length > 0) {
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`view_clips_${type}_${item.id}`)
                            .setLabel(`Clips (${clips.length})`)
                            .setStyle(ButtonStyle.Primary)
                    );
                }
            }

            if (info?.homepage) {
                buttons.push(
                    new ButtonBuilder()
                        .setLabel('Official Website')
                        .setStyle(ButtonStyle.Link)
                        .setURL(info.homepage)
                );
            }

            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
            }

            const reply = await interaction.editReply({
                embeds: [embed],
                components: rows
            });

            session.detailMessageId = reply.id;
            userSessions.set(sessionId, session);
        } catch (error) {
            console.error('Selection error:', error);
            await interaction.followUp({
                content: 'Could not load details. Please try again.',
                ephemeral: true
            });
        }
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('genre_select_')) {
        await interaction.deferUpdate();
        const selectedValue = interaction.values[0];
        const parts = selectedValue.split('_');
        const type = parts[1];
        const genreId = parts[2];
        try {
            const response = await api.get(`/genres/${type}/${genreId}?page=1&sort_by=popularity.desc`);
            const results = response.data.results || [];
            if (results.length === 0) {
                await interaction.followUp({ content: 'No content found for this genre.', ephemeral: true });
                return;
            }
            const sessionId = `genre_${Date.now()}`;
            const sessionData = {
                type: 'genre',
                contentType: type,
                genreId: genreId,
                currentPage: 1,
                totalPages: response.data.meta?.total_pages || 1,
                interactionId: interaction.id
            };
            userSessions.set(sessionId, sessionData);

            const genreName = GENRE_MAP[type][genreId] || 'Selected Genre';
            const embeds = results.slice(0, 10).map((item, index) =>
                createMediaEmbed(item, type, index + 1)
            );
            const components = [createSelectionButtons(sessionId, results)];
            if (response.data.meta?.has_next) {
                components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
            }
            const reply = await interaction.editReply({
                content: `${genreName} ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                embeds,
                components
            });

            sessionData.messageId = reply.id;
            userSessions.set(sessionId, sessionData);
            setTimeout(() => userSessions.delete(sessionId), 3600000);
        } catch (error) {
            await interaction.followUp({ content: 'Could not load genre content. Please try again.', ephemeral: true });
        }
        return;
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);