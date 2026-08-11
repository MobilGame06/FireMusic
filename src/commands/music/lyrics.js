const {
    ApplicationCommandOptionType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const { genericChecks } = require("../../utilities/checks.js");
const { errorEmbed, simpleEmbed } = require("../../utilities/embeds.js");
const { msToHMS } = require("../../utilities/lavalink.js");
const {
    fetchLyrics,
    parseSyncedLyrics,
    findLineIndex,
    splitArtistTitle
} = require("../../utilities/lrclib.js");
const liveLyrics = require("../../utilities/liveLyricsService.js");
const radioMetadataService = require("../../utilities/radioMetadataService.js");

const LINES_BEFORE = 3;
const LINES_AFTER = 4;
const CHUNK_SIZE = 3800;
// The session stops the collector itself, so this only bounds an abandoned message.
const COLLECTOR_IDLE = 18000000;

/**
 * Determines what to search for: for radio streams the track title is the station name,
 * so the ICY metadata ("Artist - Title") is the only usable source.
 */
function resolveQuery(player, guildId) {
    const track = player.queue.current;
    const info = track.info;
    const isStream = Boolean(info.isStream);

    if (isStream) {
        const song = radioMetadataService.getCurrentSong(guildId) || player.radioMetadata?.currentSong;
        const split = song ? splitArtistTitle(song) : null;

        if (split?.title) {
            return { title: split.title, artist: split.artist, durationMs: null, isStream };
        }
        if (song) {
            return { title: song, artist: null, durationMs: null, isStream };
        }
        return { title: info.title, artist: info.author, durationMs: null, isStream };
    }

    return {
        title: info.title,
        artist: info.author,
        durationMs: info.duration,
        isStream
    };
}

function baseEmbed(lyrics, track, client) {
    const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle((lyrics.trackName || track.info.title).slice(0, 256))
        .setFooter({ text: "FireMusic · lyrics by lrclib.net", iconURL: client.user.displayAvatarURL() });

    const artist = lyrics.artistName || track.info.author;
    if (artist) {
        embed.setAuthor({ name: artist.slice(0, 256) });
    }
    if (track.info.artworkUrl) {
        embed.setThumbnail(track.info.artworkUrl);
    }
    return embed;
}

/**
 * Renders the scrolling window around the currently sung line.
 */
function renderWindow(lines, index) {
    const from = Math.max(0, index - LINES_BEFORE);
    const to = Math.min(lines.length, Math.max(index, 0) + LINES_AFTER + 1);

    const rendered = [];
    for (let i = from; i < to; i += 1) {
        const text = lines[i].text || "♪";
        rendered.push(i === index ? `**▶ ${text}**` : text);
    }

    if (index < 0) {
        rendered.unshift("*♪ intro ...*");
    }
    return rendered.join("\n");
}

/**
 * Nudge buttons for the sync offset — timestamps describe the album version, so a music
 * video with an intro needs the lines pushed later ("+").
 */
const SYNC_STEPS = [
    { id: "lyrics_sync_-5", label: "−5s", delta: -5000 },
    { id: "lyrics_sync_-1", label: "−1s", delta: -1000 },
    { id: "lyrics_sync_+1", label: "+1s", delta: 1000 },
    { id: "lyrics_sync_+5", label: "+5s", delta: 5000 }
];

function liveComponents({ disabled = false, hasPlain = false } = {}) {
    const syncRow = new ActionRowBuilder().setComponents(
        SYNC_STEPS.map((step) =>
            new ButtonBuilder()
                .setCustomId(step.id)
                .setLabel(step.label)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        )
    );

    const controls = [
        new ButtonBuilder()
            .setCustomId("lyrics_stop")
            .setEmoji("⏹️")
            .setLabel("Stop live")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ];

    if (hasPlain) {
        controls.push(
            new ButtonBuilder()
                .setCustomId("lyrics_full")
                .setEmoji("📄")
                .setLabel("Full lyrics")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );
    }

    return [syncRow, new ActionRowBuilder().setComponents(controls)];
}

function formatOffset(offsetMs) {
    const seconds = offsetMs / 1000;
    return `${seconds >= 0 ? "+" : "−"}${Math.abs(seconds).toFixed(1)}s`;
}

/**
 * Music videos carry intros, extended edits or live versions, so their length rarely
 * matches the album version the timestamps were made for. Saying so up front explains
 * why the sync buttons exist.
 */
function lengthHint(lyrics, track) {
    if (!lyrics.duration || !track.info.duration) return null;

    const deltaMs = track.info.duration - lyrics.duration;
    if (Math.abs(deltaMs) < 3000) return null;

    const seconds = Math.round(Math.abs(deltaMs) / 1000);
    const relation = deltaMs > 0 ? "longer" : "shorter";
    return `This version is ${seconds}s ${relation} than the one the timestamps belong to — nudge with −/+ if the lines drift.`;
}

/**
 * Splits plain lyrics into embed-sized chunks without cutting lines in half.
 */
function chunkLyrics(text) {
    const chunks = [];
    let current = "";

    for (const line of text.split(/\r?\n/)) {
        const candidate = current ? `${current}\n${line}` : line;
        if (candidate.length > CHUNK_SIZE) {
            if (current) chunks.push(current);
            current = line.slice(0, CHUNK_SIZE);
        } else {
            current = candidate;
        }
    }
    if (current) chunks.push(current);

    return chunks;
}

async function sendPlainLyrics(interaction, lyrics, track) {
    const client = interaction.client;
    const chunks = chunkLyrics(lyrics.plainLyrics);

    const first = baseEmbed(lyrics, track, client).setDescription(chunks[0]);
    await interaction.editReply({ embeds: [first], components: [] });

    for (const chunk of chunks.slice(1)) {
        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ff0000")
                    .setDescription(chunk)
                    .setFooter({ text: "FireMusic · lyrics by lrclib.net", iconURL: client.user.displayAvatarURL() })
            ]
        });
    }
}

async function replyWithFullLyrics(buttonInteraction, lyrics) {
    if (!lyrics.plainLyrics) {
        return buttonInteraction.reply(errorEmbed("No plain lyrics available for this track.", true));
    }

    const chunks = chunkLyrics(lyrics.plainLyrics);
    await buttonInteraction.reply({
        embeds: [new EmbedBuilder().setColor("#ff0000").setDescription(chunks[0])],
        flags: MessageFlags.Ephemeral
    });

    for (const chunk of chunks.slice(1)) {
        await buttonInteraction.followUp({
            embeds: [new EmbedBuilder().setColor("#ff0000").setDescription(chunk)],
            flags: MessageFlags.Ephemeral
        });
    }
}

async function startLiveLyrics(interaction, player, lyrics, lines, initialOffset) {
    const client = interaction.client;
    const guildId = interaction.guild.id;
    const track = player.queue.current;
    const hasPlain = Boolean(lyrics.plainLyrics);
    const hint = lengthHint(lyrics, track);

    const render = (index, { finished, position, offset }) => {
        const embed = baseEmbed(lyrics, track, client)
            .setDescription(renderWindow(lines, index))
            .addFields({
                name: finished ? "Live lyrics ended" : "🔴 Live",
                value: `${msToHMS(position)} / ${msToHMS(track.info.duration)}${offset ? ` · sync ${formatOffset(offset)}` : ""}`,
                inline: true
            });

        if (hint && !finished) {
            embed.addFields({ name: "ℹ️ Sync", value: hint });
        }

        return { embeds: [embed], components: liveComponents({ disabled: finished, hasPlain }) };
    };

    // Starting from the live position means a mid-song `/lyrics` opens on the right line.
    const startPosition = player.position ?? 0;
    const startIndex = findLineIndex(lines, startPosition - initialOffset);
    const message = await interaction.editReply(
        render(startIndex, { finished: false, position: startPosition, offset: initialOffset })
    );

    const collector = message.createMessageComponentCollector({ idle: COLLECTOR_IDLE });
    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.customId === "lyrics_full") {
            await replyWithFullLyrics(buttonInteraction, lyrics);
            return;
        }

        if (buttonInteraction.member.voice.channel?.id !== player.voiceChannelId) {
            await buttonInteraction.reply(
                errorEmbed("You need to be in the same voice channel as the bot to use this command!", true)
            );
            return;
        }

        const step = SYNC_STEPS.find((entry) => entry.id === buttonInteraction.customId);
        if (step) {
            liveLyrics.adjustOffset(guildId, step.delta);
            await buttonInteraction.deferUpdate();
            return;
        }

        if (buttonInteraction.customId === "lyrics_stop") {
            await liveLyrics.finish(guildId, "user-stopped");
            await buttonInteraction.reply(simpleEmbed("⏹️ Stopped live lyrics.", true, client));
        }
    });
    collector.on("end", () => liveLyrics.finish(guildId, "collector-ended"));

    liveLyrics.start(guildId, {
        getPlayer: () => client.lavalink.getPlayer(guildId),
        message,
        lines,
        trackId: liveLyrics.trackIdOf(track),
        render,
        initialIndex: startIndex,
        offset: initialOffset,
        onStop: () => collector.stop("session-ended")
    });
}

module.exports = {
    name: "lyrics",
    description: "shows the lyrics of the current track, synced live when available",
    inVc: true,
    sameVc: true,
    options: [
        {
            name: "offset",
            type: ApplicationCommandOptionType.Number,
            description: "Sync offset in seconds, e.g. 12 for a music video with a 12s intro",
            required: false,
            minValue: -300,
            maxValue: 300
        }
    ],
    run: async (client, interaction) => {
        if (!genericChecks(interaction)) return;

        const player = interaction.client.lavalink.getPlayer(interaction.guild.id);
        if (!player?.queue?.current) {
            return interaction.editReply(simpleEmbed("There is no song playing.", true, interaction.client));
        }

        const track = player.queue.current;
        const query = resolveQuery(player, interaction.guild.id);

        const lyrics = await fetchLyrics(query);
        if (!lyrics) {
            return interaction.editReply(simpleEmbed("Lyrics not found.", true, interaction.client));
        }
        if (lyrics.instrumental) {
            return interaction.editReply(
                simpleEmbed(`🎼 **${lyrics.trackName || track.info.title}** is instrumental.`, true, interaction.client)
            );
        }

        // A previous live view in this guild is closed out before a new one takes over.
        await liveLyrics.finish(interaction.guild.id, "replaced");

        const lines = query.isStream ? [] : parseSyncedLyrics(lyrics.syncedLyrics);
        if (lines.length) {
            const offsetSeconds = interaction.options?.getNumber?.("offset") ?? 0;
            return startLiveLyrics(interaction, player, lyrics, lines, Math.round(offsetSeconds * 1000));
        }

        if (!lyrics.plainLyrics) {
            return interaction.editReply(simpleEmbed("Lyrics not found.", true, interaction.client));
        }
        return sendPlainLyrics(interaction, lyrics, track);
    }
};
