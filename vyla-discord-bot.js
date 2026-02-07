const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
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

function createMediaEmbed(item, type) {
    const embed = new EmbedBuilder()
        .setColor('#E50914')
        .setTitle(item.title || item.name)
        .setURL(`https://www.themoviedb.org/${type}/${item.id}`)
        .setDescription(item.overview ? (item.overview.length > 300 ? item.overview.substring(0, 297) + '...' : item.overview) : 'No description available')
        .addFields(
            { name: 'Rating', value: item.vote_average ? `${item.vote_average}/10` : 'N/A', inline: true },
            { name: 'Release', value: item.release_date || item.first_air_date || 'Unknown', inline: true },
            { name: 'ID', value: item.id.toString(), inline: true }
        )
        .setFooter({ text: `Type: ${type.toUpperCase()}` });

    if (item.backdrop) {
        embed.setImage(item.backdrop);
    } else if (item.backdrop_path) {
        embed.setImage(`https://image.tmdb.org/t/p/w780${item.backdrop_path}`);
    }

    if (item.poster) {
        embed.setThumbnail(item.poster);
    } else if (item.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${item.poster_path}`);
    }

    return embed;
}

function createDetailedEmbed(data, type) {
    const info = data.info || data.data;
    const embed = new EmbedBuilder()
        .setColor('#E50914')
        .setTitle(info.title || info.name)
        .setURL(`https://www.themoviedb.org/${type}/${info.id}`)
        .setDescription(info.overview || 'No description available');

    const fields = [
        { name: 'Rating', value: `${info.vote_average || 'N/A'}/10 (${info.vote_count || 0} votes)`, inline: true },
        { name: 'Status', value: info.status || 'Unknown', inline: true },
        { name: 'Language', value: info.original_language?.toUpperCase() || 'N/A', inline: true }
    ];

    if (type === 'movie') {
        fields.push(
            { name: 'Release Date', value: info.release_date || 'Unknown', inline: true },
            { name: 'Runtime', value: info.runtime ? `${info.runtime} min` : 'N/A', inline: true },
            { name: 'Budget', value: info.budget ? `$${info.budget.toLocaleString()}` : 'N/A', inline: true },
            { name: 'Revenue', value: info.revenue ? `$${info.revenue.toLocaleString()}` : 'N/A', inline: true }
        );
    } else {
        fields.push(
            { name: 'First Air Date', value: info.first_air_date || 'Unknown', inline: true },
            { name: 'Last Air Date', value: info.last_air_date || 'Unknown', inline: true },
            { name: 'Seasons', value: info.number_of_seasons?.toString() || 'N/A', inline: true },
            { name: 'Episodes', value: info.number_of_episodes?.toString() || 'N/A', inline: true }
        );
    }

    if (info.genres && info.genres.length > 0) {
        fields.push({ name: 'Genres', value: info.genres.map(g => g.name).join(', '), inline: false });
    }

    if (data.cast && data.cast.length > 0) {
        const topCast = data.cast.slice(0, 5).map(c => c.name).join(', ');
        fields.push({ name: 'Cast', value: topCast, inline: false });
    }

    embed.addFields(fields);

    if (info.backdrop_path) {
        embed.setImage(`https://image.tmdb.org/t/p/w1280${info.backdrop_path}`);
    }

    if (info.poster_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${info.poster_path}`);
    }

    return embed;
}

function createCastEmbed(data) {
    const person = data.person;
    const embed = new EmbedBuilder()
        .setColor('#E50914')
        .setTitle(person.name)
        .setDescription(person.biography ? (person.biography.length > 500 ? person.biography.substring(0, 497) + '...' : person.biography) : 'No biography available');

    const fields = [
        { name: 'Known For', value: person.known_for_department || 'N/A', inline: true },
        { name: 'Birthday', value: person.birthday || 'Unknown', inline: true },
        { name: 'Place of Birth', value: person.place_of_birth || 'Unknown', inline: true }
    ];

    if (person.deathday) {
        fields.push({ name: 'Died', value: person.deathday, inline: true });
    }

    if (data.known_for && data.known_for.length > 0) {
        const titles = data.known_for.slice(0, 5).map(item => item.title || item.name).join(', ');
        fields.push({ name: 'Known For', value: titles, inline: false });
    }

    embed.addFields(fields);

    if (person.profile_path) {
        embed.setThumbnail(`https://image.tmdb.org/t/p/w342${person.profile_path}`);
    }

    return embed;
}

function createEpisodeEmbed(data, tvId, season, episode) {
    const ep = data.data;
    const embed = new EmbedBuilder()
        .setColor('#E50914')
        .setTitle(`S${season}E${episode}: ${ep.name}`)
        .setDescription(ep.overview || 'No description available')
        .addFields(
            { name: 'Air Date', value: ep.air_date || 'Unknown', inline: true },
            { name: 'Rating', value: ep.rating ? `${ep.rating}/10` : 'N/A', inline: true },
            { name: 'Runtime', value: ep.runtime ? `${ep.runtime} min` : 'N/A', inline: true }
        );

    if (ep.still) {
        embed.setImage(ep.still);
    }

    if (ep.crew && ep.crew.directors && ep.crew.directors.length > 0) {
        embed.addFields({ name: 'Director', value: ep.crew.directors.map(d => d.name).join(', '), inline: false });
    }

    if (ep.crew && ep.crew.writers && ep.crew.writers.length > 0) {
        embed.addFields({ name: 'Writers', value: ep.crew.writers.map(w => w.name).join(', '), inline: false });
    }

    if (ep.guest_stars && ep.guest_stars.length > 0) {
        const guests = ep.guest_stars.slice(0, 3).map(g => `${g.name} as ${g.character}`).join(', ');
        embed.addFields({ name: 'Guest Stars', value: guests, inline: false });
    }

    return embed;
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('movies & TV shows', { type: 'WATCHING' });
    registerCommands();
});

async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('search')
            .setDescription('Search for movies and TV shows')
            .addStringOption(option =>
                option.setName('query')
                    .setDescription('What to search for')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('movie')
            .setDescription('Get detailed information about a movie')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('TMDB Movie ID')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('tv')
            .setDescription('Get detailed information about a TV show')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('TMDB TV Show ID')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('trending')
            .setDescription('Get trending movies and TV shows'),

        new SlashCommandBuilder()
            .setName('popular')
            .setDescription('Get popular content')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Content type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movies', value: 'movie' },
                        { name: 'TV Shows', value: 'tv' }
                    )),

        new SlashCommandBuilder()
            .setName('genres')
            .setDescription('Browse content by genre')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Content type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movies', value: 'movie' },
                        { name: 'TV Shows', value: 'tv' }
                    ))
            .addStringOption(option =>
                option.setName('genre')
                    .setDescription('Genre name')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('cast')
            .setDescription('Get information about an actor or crew member')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('TMDB Person ID')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('watch')
            .setDescription('Get streaming links for content')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Content type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Movie', value: 'movie' },
                        { name: 'TV Show', value: 'tv' }
                    ))
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('TMDB ID')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('season')
                    .setDescription('Season number (TV shows only)')
                    .setRequired(false))
            .addIntegerOption(option =>
                option.setName('episode')
                    .setDescription('Episode number (TV shows only)')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('season')
            .setDescription('Get TV show season details')
            .addIntegerOption(option =>
                option.setName('tvid')
                    .setDescription('TMDB TV Show ID')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('season')
                    .setDescription('Season number')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('episode')
            .setDescription('Get TV show episode details')
            .addIntegerOption(option =>
                option.setName('tvid')
                    .setDescription('TMDB TV Show ID')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('season')
                    .setDescription('Season number')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('episode')
                    .setDescription('Episode number')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('toprated')
            .setDescription('Get top rated content')
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
            .setDescription('Get upcoming movies'),

        new SlashCommandBuilder()
            .setName('nowplaying')
            .setDescription('Get movies now playing in theaters'),

        new SlashCommandBuilder()
            .setName('airingtoday')
            .setDescription('Get TV shows airing today'),

        new SlashCommandBuilder()
            .setName('random')
            .setDescription('Get a random movie or TV show')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Content type')
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

    const { commandName, options } = interaction;

    try {
        await interaction.deferReply();

        switch (commandName) {
            case 'search': {
                const query = options.getString('query');
                const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('No results found for your search.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, item.media_type || 'movie')
                );

                await interaction.editReply({
                    content: `Found ${results.length} results for "${query}":`,
                    embeds
                });
                break;
            }

            case 'movie': {
                const id = options.getInteger('id');
                const response = await api.get(`/details/movie/${id}`);
                const embed = createDetailedEmbed(response.data, 'movie');

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Watch Now')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://vidsrc.xyz/embed/movie/${id}`),
                        new ButtonBuilder()
                            .setLabel('TMDB Page')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://www.themoviedb.org/movie/${id}`)
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });
                break;
            }

            case 'tv': {
                const id = options.getInteger('id');
                const response = await api.get(`/details/tv/${id}`);
                const embed = createDetailedEmbed(response.data, 'tv');

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('TMDB Page')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://www.themoviedb.org/tv/${id}`)
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });
                break;
            }

            case 'trending': {
                const response = await api.get('/home');
                const sections = response.data.data || [];
                const trendingSection = sections.find(s => s.title.includes('Trending'));

                if (!trendingSection || !trendingSection.items) {
                    await interaction.editReply('Could not fetch trending content.');
                    return;
                }

                const embeds = trendingSection.items.slice(0, 5).map(item =>
                    createMediaEmbed(item, item.media_type || 'movie')
                );

                await interaction.editReply({
                    content: 'Trending Now:',
                    embeds
                });
                break;
            }

            case 'popular': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
                const response = await api.get(`/list?endpoint=${endpoint}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch popular content.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, type)
                );

                await interaction.editReply({
                    content: `Popular ${type === 'movie' ? 'Movies' : 'TV Shows'}:`,
                    embeds
                });
                break;
            }

            case 'genres': {
                const type = options.getString('type');
                const genreName = options.getString('genre').toLowerCase();

                const genreId = Object.entries(GENRE_MAP[type]).find(
                    ([id, name]) => name.toLowerCase() === genreName
                )?.[0];

                if (!genreId) {
                    await interaction.editReply(`Genre not found. Available genres: ${Object.values(GENRE_MAP[type]).join(', ')}`);
                    return;
                }

                const response = await api.get(`/genres/${type}/${genreId}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('No content found for this genre.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, type)
                );

                await interaction.editReply({
                    content: `${GENRE_MAP[type][genreId]} ${type === 'movie' ? 'Movies' : 'TV Shows'}:`,
                    embeds
                });
                break;
            }

            case 'cast': {
                const id = options.getInteger('id');
                const response = await api.get(`/cast/${id}`);
                const embed = createCastEmbed(response.data);

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'watch': {
                const type = options.getString('type');
                const id = options.getInteger('id');
                const season = options.getInteger('season');
                const episode = options.getInteger('episode');

                let url = `/player/${type}/${id}`;
                if (type === 'tv' && season && episode) {
                    url += `?s=${season}&e=${episode}`;
                }

                const response = await api.get(url);
                const sources = response.data.sources || [];

                if (sources.length === 0) {
                    await interaction.editReply('No streaming sources available.');
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#E50914')
                    .setTitle('Streaming Sources Available')
                    .setDescription(`Found ${sources.length} streaming sources for this content.`);

                const topSources = sources.slice(0, 5);
                topSources.forEach((source, index) => {
                    embed.addFields({
                        name: `Source ${index + 1}`,
                        value: `[Watch Here](${source.stream_url})`,
                        inline: true
                    });
                });

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'season': {
                const tvId = options.getInteger('tvid');
                const season = options.getInteger('season');

                const response = await api.get(`/tv/${tvId}/season/${season}`);
                const data = response.data.data;

                const embed = new EmbedBuilder()
                    .setColor('#E50914')
                    .setTitle(`${data.name}`)
                    .setDescription(data.overview || 'No description available')
                    .addFields(
                        { name: 'Episodes', value: data.episode_count?.toString() || 'N/A', inline: true },
                        { name: 'Air Date', value: data.air_date || 'Unknown', inline: true }
                    );

                if (data.poster_path) {
                    embed.setThumbnail(`https://image.tmdb.org/t/p/w342${data.poster_path}`);
                }

                if (data.episodes && data.episodes.length > 0) {
                    const episodeList = data.episodes.slice(0, 10).map(ep =>
                        `E${ep.episode_number}: ${ep.name} (${ep.rating || 'N/A'}/10)`
                    ).join('\n');
                    embed.addFields({ name: 'Episodes', value: episodeList, inline: false });
                }

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'episode': {
                const tvId = options.getInteger('tvid');
                const season = options.getInteger('season');
                const episode = options.getInteger('episode');

                const response = await api.get(`/episodes/${tvId}/${season}/${episode}`);
                const embed = createEpisodeEmbed(response.data, tvId, season, episode);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Watch Episode')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://vidsrc.xyz/embed/tv/${tvId}/${season}/${episode}`)
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });
                break;
            }

            case 'toprated': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
                const response = await api.get(`/list?endpoint=${endpoint}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch top rated content.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, type)
                );

                await interaction.editReply({
                    content: `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'}:`,
                    embeds
                });
                break;
            }

            case 'upcoming': {
                const response = await api.get('/list?endpoint=/movie/upcoming');
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch upcoming movies.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, 'movie')
                );

                await interaction.editReply({
                    content: 'Upcoming Movies:',
                    embeds
                });
                break;
            }

            case 'nowplaying': {
                const response = await api.get('/list?endpoint=/movie/now_playing');
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch now playing movies.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, 'movie')
                );

                await interaction.editReply({
                    content: 'Now Playing in Theaters:',
                    embeds
                });
                break;
            }

            case 'airingtoday': {
                const response = await api.get('/list?endpoint=/tv/airing_today');
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch airing today shows.');
                    return;
                }

                const embeds = results.slice(0, 5).map(item =>
                    createMediaEmbed(item, 'tv')
                );

                await interaction.editReply({
                    content: 'TV Shows Airing Today:',
                    embeds
                });
                break;
            }

            case 'random': {
                const type = options.getString('type');
                const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
                const response = await api.get(`/list?endpoint=${endpoint}`);
                const results = response.data.results || [];

                if (results.length === 0) {
                    await interaction.editReply('Could not fetch random content.');
                    return;
                }

                const randomItem = results[Math.floor(Math.random() * results.length)];
                const embed = createMediaEmbed(randomItem, type);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('random_again')
                            .setLabel('Get Another Random')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.editReply({
                    content: `Random ${type === 'movie' ? 'Movie' : 'TV Show'}:`,
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
    if (!interaction.isButton()) return;

    if (interaction.customId === 'random_again') {
        await interaction.deferUpdate();

        const type = interaction.message.content.includes('Movie') ? 'movie' : 'tv';
        const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';

        try {
            const response = await api.get(`/list?endpoint=${endpoint}`);
            const results = response.data.results || [];
            const randomItem = results[Math.floor(Math.random() * results.length)];
            const embed = createMediaEmbed(randomItem, type);

            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error getting random item:', error);
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);