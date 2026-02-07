const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const API_BASE = 'https://vyla-api.vercel.app/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000
});

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
                value: (item.release_date || item.first_air_date || 'Unknown').split('-')[0],
                inline: true
            }
        );

    if (item.poster) {
        embed.setThumbnail(item.poster);
    } else if (item.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${item.poster_path}`);
    }

    return embed;
}

function createDetailedEmbed(data, type) {
    const info = data.info ?? data.data;
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

    if (info.backdrop_path) {
        embed.setImage(`https://image.tmdb.org/t/p/w1280${info.backdrop_path}`);
    } else if (info.backdrop) {
        embed.setImage(info.backdrop);
    }

    if (info.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${info.poster_path}`);
    } else if (info.poster) {
        embed.setThumbnail(info.poster);
    }

    return embed;
}

function createPaginationButtons(page, totalPages, prefix) {
    const row = new ActionRowBuilder();

    if (page > 1) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${prefix}_prev_${page}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`${prefix}_page`)
            .setLabel(`Page ${page}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );

    if (page < totalPages) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${prefix}_next_${page}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
        );
    }

    return row;
}

function createSelectionButtons(sessionId, items) {
    const options = items.slice(0, 10).map((item, index) => ({
        label: `${index + 1}. ${(item.title || item.name).substring(0, 90)}`,
        description: `${item.vote_average ?? item.rating ?? 'N/A'}/10 - ${(item.release_date || item.first_air_date || 'Unknown').split('-')[0]}`,
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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('/help for commands', { type: 3 });
    registerCommands();
});

async function registerCommands() {
    const ALLOWED_CHANNEL_ID = '1469774727298941050';

    const defaultPermission = {
        id: ALLOWED_CHANNEL_ID,
        type: 'CHANNEL',
        permission: true
    };

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
            content: '❌ This bot can only be used in the designated channel.',
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
                const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply(`No results found for "${query}". Try a different search term.`);
                    return;
                }

                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'search',
                    results: results,
                    query: query
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.type, index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `search_${sessionId}`));
                }

                await interaction.editReply({
                    content: `Found ${results.length} results for "${query}". Select one to see details:`,
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'trending': {
                const response = await api.get('/home');
                const sections = response.data.data || [];
                const trendingSection = sections.find(s => s.title.includes('Trending'));

                if (!trendingSection || !trendingSection.items) {
                    await interaction.editReply('Could not fetch trending content right now.');
                    return;
                }

                const results = trendingSection.items;
                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'trending',
                    results: results
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, item.type, index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `trending_${sessionId}`));
                }

                await interaction.editReply({
                    content: 'Trending now - Select one to see details:',
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'popular': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
                const response = await api.get(`/list?endpoint=${endpoint}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch popular content right now.');
                    return;
                }

                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'popular',
                    results: results,
                    contentType: type
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, type, index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `popular_${sessionId}`));
                }

                await interaction.editReply({
                    content: `Popular ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'toprated': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
                const response = await api.get(`/list?endpoint=${endpoint}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch top rated content right now.');
                    return;
                }

                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'toprated',
                    results: results,
                    contentType: type
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, type, index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `toprated_${sessionId}`));
                }

                await interaction.editReply({
                    content: `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'genres': {
                const type = options.getString('type');
                const genreOptions = Object.entries(GENRE_MAP[type]).map(([id, name]) => ({
                    label: name,
                    value: `genre_${type}_${id}`,
                    description: `Browse ${name} ${type === 'movie' ? 'movies' : 'TV shows'}`
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
                break;
            }

            case 'upcoming': {
                const response = await api.get('/list?endpoint=/movie/upcoming');
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch upcoming movies right now.');
                    return;
                }

                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'upcoming',
                    results: results,
                    contentType: 'movie'
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'movie', index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `upcoming_${sessionId}`));
                }

                await interaction.editReply({
                    content: 'Upcoming Movies - Select one to see details:',
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'nowplaying': {
                const response = await api.get('/list?endpoint=/movie/now_playing');
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch movies in theaters right now.');
                    return;
                }

                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'nowplaying',
                    results: results,
                    contentType: 'movie'
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'movie', index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `nowplaying_${sessionId}`));
                }

                await interaction.editReply({
                    content: 'Now Playing in Theaters - Select one to see details:',
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'airingtoday': {
                const response = await api.get('/list?endpoint=/tv/airing_today');
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch shows airing today right now.');
                    return;
                }

                const sessionId = Date.now().toString();
                userSessions.set(sessionId, {
                    type: 'airingtoday',
                    results: results,
                    contentType: 'tv'
                });

                const embeds = results.slice(0, 10).map((item, index) =>
                    createMediaEmbed(item, 'tv', index + 1)
                );

                const components = [createSelectionButtons(sessionId, results)];

                if (results.length > 10) {
                    components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `airingtoday_${sessionId}`));
                }

                await interaction.editReply({
                    content: 'Airing Today - Select one to see details:',
                    embeds,
                    components
                });

                setTimeout(() => userSessions.delete(sessionId), 600000);
                break;
            }

            case 'random': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
                const response = await api.get(`/list?endpoint=${endpoint}`);
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
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('genre_select_')) {
        await interaction.deferUpdate();

        const selectedValue = interaction.values[0];
        const parts = selectedValue.split('_');
        const type = parts[1];
        const genreId = parts[2];

        try {
            const response = await api.get(`/list?endpoint=discover/${type}&with_genres=${genreId}`);
            const results = response.data.results || [];

            if (results.length === 0) {
                await interaction.followUp({ content: 'No content found for this genre.', ephemeral: true });
                return;
            }

            const sessionId = Date.now().toString();
            userSessions.set(sessionId, {
                type: 'genre',
                results: results,
                contentType: type
            });

            const genreName = GENRE_MAP[type][genreId] || 'Selected Genre';
            const embeds = results.slice(0, 10).map((item, index) =>
                createMediaEmbed(item, type, index + 1)
            );

            const components = [createSelectionButtons(sessionId, results)];

            if (results.length > 10) {
                components.push(createPaginationButtons(1, Math.ceil(results.length / 10), `genre_${sessionId}`));
            }

            await interaction.editReply({
                content: `${genreName} ${type === 'movie' ? 'Movies' : 'TV Shows'} - Select one to see details:`,
                embeds,
                components
            });

            setTimeout(() => userSessions.delete(sessionId), 600000);
        } catch (error) {
            await interaction.followUp({ content: 'Could not load genre content. Please try again.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);