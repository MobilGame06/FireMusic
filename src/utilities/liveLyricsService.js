const { findLineIndex } = require("./lrclib");

const MIN_EDIT_INTERVAL = 2500;
const MAX_EDIT_INTERVAL = 5000;
const MIN_FORCED_EDIT_INTERVAL = 1000;
const MAX_SESSION_DURATION = 20 * 60 * 1000;

/**
 * Keeps one live lyrics message per guild in sync with the player position.
 *
 * The session re-schedules itself for the next lyric line instead of polling on a fixed
 * tick, and it edits the message only when the highlighted line actually changes so we
 * stay well clear of Discord's edit rate limits.
 *
 * Timestamps come from the album version of a track, while playback may be a music video
 * with an intro, an extended edit or a live recording. The session therefore carries a
 * user-adjustable offset: lyric time + offset is the position it is expected at.
 */
class LiveLyricsService {
    constructor() {
        this.sessions = new Map();
    }

    /**
     * @param guildId guild the player belongs to
     * @param options.getPlayer resolves the current lavalink player, re-checked on every tick
     * @param options.message message to keep updating
     * @param options.lines timestamped lines from `parseSyncedLyrics`
     * @param options.trackId identifier of the track the lyrics belong to
     * @param options.render `(index, { finished, position, offset }) => messageEditPayload`
     * @param options.initialIndex line index the message already shows, so it is not re-sent
     * @param options.offset initial lyric offset in ms (positive = lyrics land later)
     * @param options.onStop optional callback, receives the stop reason
     */
    start(guildId, { getPlayer, message, lines, trackId, render, initialIndex, offset = 0, onStop }) {
        this.stop(guildId, "restarted");

        if (!lines?.length) return;

        const session = {
            getPlayer,
            message,
            lines,
            trackId,
            render,
            onStop,
            offset,
            lastIndex: initialIndex ?? null,
            lastEditAt: 0,
            forceEdit: false,
            timer: null,
            deadline: Date.now() + MAX_SESSION_DURATION,
            stopped: false
        };

        this.sessions.set(guildId, session);
        this.tick(guildId);
    }

    async tick(guildId) {
        const session = this.sessions.get(guildId);
        if (!session || session.stopped) return;

        const player = session.getPlayer();
        const current = player?.queue?.current;

        if (!current || this.trackIdOf(current) !== session.trackId) {
            await this.finish(guildId, "track-ended");
            return;
        }
        if (Date.now() > session.deadline) {
            await this.finish(guildId, "timeout");
            return;
        }

        const position = player.position ?? 0;
        session.lastPosition = position;

        const lyricPosition = position - session.offset;
        const index = findLineIndex(session.lines, lyricPosition);

        if (index !== session.lastIndex || session.forceEdit) {
            session.lastIndex = index;
            session.forceEdit = false;
            if (!await this.edit(session, index, false)) {
                await this.finish(guildId, "message-gone");
                return;
            }
        }

        if (session.stopped) return;
        session.timer = setTimeout(() => this.tick(guildId), nextDelay(session, index, lyricPosition));
    }

    /**
     * Shifts the lyrics against playback, e.g. to compensate a music video intro.
     * Positive values make the lines appear later.
     */
    adjustOffset(guildId, deltaMs) {
        const session = this.sessions.get(guildId);
        if (!session) return null;

        session.offset += deltaMs;
        session.forceEdit = true;

        if (session.timer) clearTimeout(session.timer);
        const sinceLastEdit = Date.now() - session.lastEditAt;
        const delay = Math.max(0, MIN_FORCED_EDIT_INTERVAL - sinceLastEdit);
        session.timer = setTimeout(() => this.tick(guildId), delay);

        return session.offset;
    }

    getOffset(guildId) {
        return this.sessions.get(guildId)?.offset ?? 0;
    }

    async edit(session, index, finished) {
        try {
            await session.message.edit(session.render(index, {
                finished,
                position: session.lastPosition ?? 0,
                offset: session.offset
            }));
            session.lastEditAt = Date.now();
            return true;
        } catch (error) {
            console.warn(`[LiveLyrics] Failed to update message: ${error.message}`);
            return false;
        }
    }

    /**
     * Ends the session and leaves the message in its final state.
     */
    async finish(guildId, reason = "finished") {
        const session = this.sessions.get(guildId);
        if (!session) return;

        this.detach(guildId, session);
        await this.edit(session, session.lastIndex ?? -1, true);
        session.onStop?.(reason);
    }

    /**
     * Ends the session without touching the message.
     */
    stop(guildId, reason = "stopped") {
        const session = this.sessions.get(guildId);
        if (!session) return;

        this.detach(guildId, session);
        session.onStop?.(reason);
    }

    detach(guildId, session) {
        session.stopped = true;
        if (session.timer) clearTimeout(session.timer);
        this.sessions.delete(guildId);
    }

    stopAll() {
        for (const guildId of [...this.sessions.keys()]) {
            this.stop(guildId, "shutdown");
        }
    }

    isRunning(guildId) {
        return this.sessions.has(guildId);
    }

    /**
     * Stable identity of a track, so a session notices when playback moved on.
     */
    trackIdOf(track) {
        return track?.encoded ?? track?.info?.identifier ?? track?.info?.uri ?? null;
    }
}

function nextDelay(session, index, position) {
    const next = session.lines[index + 1];
    if (!next) return MAX_EDIT_INTERVAL;

    return Math.min(MAX_EDIT_INTERVAL, Math.max(MIN_EDIT_INTERVAL, next.time - position));
}

module.exports = new LiveLyricsService();
