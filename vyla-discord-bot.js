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

function createMediaEmbed(item, type, index) {
    const rating = item.vote_average ?? item.rating ?? 'N/A';
    const embed = new EmbedBuilder()
        .setColor('White')
        .setTitle(`${index}. ${item.title || item.name}`)
        .setDescription(
            item.overview
                ? item.overview.length > 200
                    ? item.overview.slice(0, 197) + '...'
                    : item.overview
                : 'No description available'
        )
        .addFields(
            { name: 'Rating', value: `${rating}/10`, inline: true },
            {
                name: 'Year',
                value: (item.release_date || item.first_air_date || item.year || 'Unknown').toString().split('-')[0],
                inline: true
            }
        );

    if (item.title_image) {
        embed.setThumbnail(item.title_image);
    } else if (item.poster) {
        embed.setThumbnail(item.poster);
    } else if (item.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${item.poster_path}`);
    }

    return embed;
}

function createDetailedEmbed(data, type) {
    const info = data.data?.info || data.info || data.data;
    if (!info) throw new Error('Missing details payload');
    const rating = info.vote_average ?? info.rating ?? 'N/A';
    const embed = new EmbedBuilder()
        .setColor('White')
        .setTitle(info.title || info.name)
        .setDescription(info.overview || 'No description available')
        .addFields(
            { name: 'Rating', value: `${rating}/10`, inline: true },
            { name: 'Status', value: info.status || 'Unknown', inline: true }
        );

    if (type === 'movie') {
        embed.addFields(
            { name: 'Release', value: info.release_date || 'Unknown', inline: true },
            { name: 'Runtime', value: info.runtime ? `${info.runtime} min` : 'N/A', inline: true }
        );
    } else {
        embed.addFields(
            { name: 'Seasons', value: info.number_of_seasons?.toString() || 'N/A', inline: true },
            { name: 'Episodes', value: info.number_of_episodes?.toString() || 'N/A', inline: true }
        );
    }

    if (info.genres?.length) {
        embed.addFields({
            name: 'Genres',
            value: info.genres.map(g => g.name).join(', ')
        });
    }

    if (data.cast?.length) {
        embed.addFields({
            name: 'Cast',
            value: data.cast.slice(0, 5).map(c => c.name).join(', ')
        });
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
            console.log(`Status updated: ${randomMessage}`);
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
                    ))
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
    if (interaction.channelId !== '1469774727298941050') {
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
                            name: 'How It Works',
                            value: 'Just use the commands above. When I show results, you can:\n- Use the dropdown menu to select what interests you\n- Click Next/Previous to browse more results\n- Click Watch to get streaming links\n\nNo IDs or complicated stuff needed!',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'All content powered by TMDB and Vyla API' });
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
                userSessions.set(sessionId, {
                    type: 'search',
                    query: query,
                    currentPage: 1,
                    maxPageReached: 1,
                    hasMore: response.data.meta?.has_next || false
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.type || item.media_type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                await interaction.editReply({
                    content: `Found ${results.length} results for "${query}" on page 1. Select one to see details:`,
                    embeds,
                    components
                });
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
                userSessions.set(sessionId, {
                    type: 'trending',
                    results: results,
                    currentPage: 1,
                    totalPages: Math.ceil(results.length / 10)
                });
                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.media_type || item.type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (results.length > 10) {
                    components.push(createPaginationButtons(1, true, false, sessionId));
                }
                await interaction.editReply({
                    content: 'Trending now - Select one to see details:',
                    embeds,
                    components
                });
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
                userSessions.set(sessionId, {
                    type: 'popular',
                    contentType: type,
                    endpoint: endpoint,
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1
                });
                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                await interaction.editReply({
                    content: `Popular ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                    embeds,
                    components
                });
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
                userSessions.set(sessionId, {
                    type: 'toprated',
                    contentType: type,
                    endpoint: endpoint,
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1
                });
                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, type, index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                await interaction.editReply({
                    content: `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                    embeds,
                    components
                });
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
                userSessions.set(sessionId, {
                    type: 'upcoming',
                    contentType: 'movie',
                    endpoint: '/movie/upcoming',
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1
                });
                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'movie', index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                await interaction.editReply({
                    content: 'Upcoming Movies - Select one to see details:',
                    embeds,
                    components
                });
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
                userSessions.set(sessionId, {
                    type: 'nowplaying',
                    contentType: 'movie',
                    endpoint: '/movie/now_playing',
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1
                });
                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'movie', index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                await interaction.editReply({
                    content: 'Now Playing in Theaters - Select one to see details:',
                    embeds,
                    components
                });
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
                userSessions.set(sessionId, {
                    type: 'airingtoday',
                    contentType: 'tv',
                    endpoint: '/tv/airing_today',
                    currentPage: 1,
                    totalPages: response.data.meta?.total_pages || 1
                });
                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'tv', index + 1)
                );
                const components = [createSelectionButtons(sessionId, results)];
                if (response.data.meta?.has_next) {
                    components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
                }
                await interaction.editReply({
                    content: 'Airing Today - Select one to see details:',
                    embeds,
                    components
                });
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
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`watch_${type}_${randomItem.id}`)
                            .setLabel('Watch Now')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`random_${type}`)
                            .setLabel('Get Another Random')
                            .setStyle(ButtonStyle.Primary)
                    );
                await interaction.editReply({
                    content: `Random ${type === 'movie' ? 'Movie' : 'TV Show'} Pick:`,
                    embeds: [embed],
                    components: [row]
                });
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
            const message = interaction.message;
            const sessionId = Object.keys(userSessions).find(key =>
                message.content.includes(key.split('_')[0]) ||
                message.embeds?.[0]?.title?.includes('Results') ||
                message.embeds?.[0]?.description?.includes('results')
            );

            if (!sessionId) {
                const sessionKey = Object.keys(userSessions).find(key => {
                    const session = userSessions.get(key);
                    return session && (
                        session.type === 'search' ||
                        session.type === 'trending' ||
                        session.type === 'popular' ||
                        session.type === 'toprated' ||
                        session.type === 'genre' ||
                        session.type === 'upcoming' ||
                        session.type === 'nowplaying' ||
                        session.type === 'airingtoday'
                    );
                });

                if (sessionKey) {
                    const session = userSessions.get(sessionKey);
                    let content = '';
                    let embeds = [];
                    let components = [];

                    try {
                        if (session.type === 'search') {
                            const response = await api.get(`/search?q=${encodeURIComponent(session.query)}&page=${session.currentPage}`);
                            const results = response.data.results || [];
                            embeds = results.slice(0, 10).map((item, index) =>
                                createMediaEmbed(item, item.type || item.media_type, (session.currentPage - 1) * 10 + index + 1)
                            );
                            content = `Found ${results.length} results for "${session.query}" on page ${session.currentPage}. Select one to see details:`;
                            components = [createSelectionButtons(sessionKey, results)];
                            if (response.data.meta?.has_next || session.currentPage < (session.maxPageReached || 1)) {
                                components.push(createPaginationButtons(session.currentPage, response.data.meta?.has_next || false, session.currentPage > 1, sessionKey));
                            }
                        } else if (session.type === 'trending' && session.results) {
                            const startIndex = (session.currentPage - 1) * 10;
                            const results = session.results.slice(startIndex, startIndex + 10);
                            embeds = results.map((item, index) =>
                                createMediaEmbed(item, item.media_type || item.type, startIndex + index + 1)
                            );
                            content = 'Trending now - Select one to see details:';
                            components = [createSelectionButtons(sessionKey, results)];
                            if (session.results.length > startIndex + 10 || session.currentPage < session.totalPages) {
                                components.push(createPaginationButtons(session.currentPage, true, session.currentPage > 1, sessionKey));
                            }
                        } else if (session.endpoint) {
                            const response = await api.get(`/list?endpoint=${session.endpoint}&page=${session.currentPage}`);
                            const results = response.data.results || [];
                            embeds = results.slice(0, 10).map((item, index) =>
                                createMediaEmbed(item, session.contentType, (session.currentPage - 1) * 10 + index + 1)
                            );
                            let typeText = '';
                            if (session.type === 'popular' || session.type === 'toprated') {
                                typeText = `${session.type.charAt(0).toUpperCase() + session.type.slice(1)} ${session.contentType === 'movie' ? 'Movies' : 'TV Shows'}`;
                            } else if (session.type === 'upcoming') {
                                typeText = 'Upcoming Movies';
                            } else if (session.type === 'nowplaying') {
                                typeText = 'Now Playing in Theaters';
                            } else if (session.type === 'airingtoday') {
                                typeText = 'Airing Today';
                            }
                            content = `${typeText} - Page ${session.currentPage}`;
                            components = [createSelectionButtons(sessionKey, results)];
                            if (response.data.meta?.has_next) {
                                components.push(createPaginationButtons(session.currentPage, true, session.currentPage > 1, sessionKey));
                            }
                        } else if (session.type === 'genre') {
                            const response = await api.get(`/genres/${session.contentType}/${session.genreId}?page=${session.currentPage}&sort_by=popularity.desc`);
                            const results = response.data.results || [];
                            embeds = results.slice(0, 10).map((item, index) =>
                                createMediaEmbed(item, session.contentType, (session.currentPage - 1) * 10 + index + 1)
                            );
                            const genreName = GENRE_MAP[session.contentType][session.genreId] || 'Selected Genre';
                            content = `${genreName} ${session.contentType === 'movie' ? 'Movies' : 'TV Shows'} - Page ${session.currentPage}`;
                            components = [createSelectionButtons(sessionKey, results)];
                            if (response.data.meta?.has_next) {
                                components.push(createPaginationButtons(session.currentPage, true, session.currentPage > 1, sessionKey));
                            }
                        }

                        await interaction.editReply({
                            content: content,
                            embeds: embeds,
                            components: components
                        });
                        return;
                    } catch (error) {
                        console.error('Back to results error:', error);
                    }
                }

                await interaction.editReply({
                    content: 'Use the command again to browse results.',
                    embeds: [],
                    components: []
                });
                return;
            }
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
                        .setTitle('Streaming Sources Available')
                        .setDescription('Click on any link below to start watching:');
                    const buttons = [];
                    sources.slice(0, 5).forEach((source, index) => {
                        const sourceName = source.name ||
                            (source.stream_url.includes('vidsrc') ? 'VidSrc' :
                                source.stream_url.includes('vidlink') ? 'VidLink' :
                                    source.stream_url.includes('2embed') ? '2Embed' :
                                        `Source ${index + 1}`);
                        buttons.push(
                            new ButtonBuilder()
                                .setLabel(sourceName)
                                .setStyle(ButtonStyle.Link)
                                .setURL(source.stream_url)
                        );
                    });
                    const rows = [];
                    for (let i = 0; i < buttons.length; i += 5) {
                        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
                    }
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
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`watch_${type}_${randomItem.id}`)
                            .setLabel('Watch Now')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`random_${type}`)
                            .setLabel('Get Another Random')
                            .setStyle(ButtonStyle.Primary)
                    );
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

                await interaction.editReply({
                    content: content,
                    embeds,
                    components
                });
            } catch (error) {
                console.error('Pagination error:', error);
                await interaction.followUp({ content: 'Could not load more content. Please try again.', ephemeral: true });
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
                .setDescription('Click on any link below to start watching:');
            const buttons = [];
            sources.slice(0, 5).forEach((source, index) => {
                const sourceName = source.name ||
                    (source.stream_url.includes('vidsrc') ? 'VidSrc' :
                        source.stream_url.includes('vidlink') ? 'VidLink' :
                            source.stream_url.includes('2embed') ? '2Embed' :
                                `Source ${index + 1}`);
                buttons.push(
                    new ButtonBuilder()
                        .setLabel(sourceName)
                        .setStyle(ButtonStyle.Link)
                        .setURL(source.stream_url)
                );
            });
            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }
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
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`watch_${type}_${item.id}`)
                    .setLabel('Watch Now')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('back_to_results')
                    .setLabel('Back to Results')
                    .setStyle(ButtonStyle.Secondary)
            );
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
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
            userSessions.set(sessionId, {
                type: 'genre',
                contentType: type,
                genreId: genreId,
                currentPage: 1,
                totalPages: response.data.meta?.total_pages || 1
            });
            const genreName = GENRE_MAP[type][genreId] || 'Selected Genre';
            const embeds = results.slice(0, 10).map((item, index) =>
                createMediaEmbed(item, type, index + 1)
            );
            const components = [createSelectionButtons(sessionId, results)];
            if (response.data.meta?.has_next) {
                components.push(createPaginationButtons(1, response.data.meta.has_next, false, sessionId));
            }
            await interaction.editReply({
                content: `${genreName} ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                embeds,
                components
            });
            setTimeout(() => userSessions.delete(sessionId), 3600000);
        } catch (error) {
            await interaction.followUp({ content: 'Could not load genre content. Please try again.', ephemeral: true });
        }
        return;
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);