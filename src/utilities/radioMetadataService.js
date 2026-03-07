const { fetchInlineMetadata } = require('./icecastMetadata');

class RadioMetadataService {
    constructor() {
        this.watchers = new Map();
    }

    startWatching(guildId, streamUrl, metadataInterval, onUpdate, updateInterval = 30000) {
        this.stopWatching(guildId);

        if (!metadataInterval || metadataInterval <= 0) return;

        const interval = setInterval(async () => {
            try {
                const song = await fetchInlineMetadata(streamUrl, metadataInterval);
                const watcher = this.watchers.get(guildId);

                if (song && watcher && watcher.lastSong !== song) {
                    watcher.lastSong = song;
                    onUpdate(song);
                }
            } catch {}
        }, updateInterval);

        this.watchers.set(guildId, {
            interval,
            lastSong: null
        });
    }

    stopWatching(guildId) {
        const watcher = this.watchers.get(guildId);
        if (!watcher) return;

        clearInterval(watcher.interval);
        this.watchers.delete(guildId);
    }

    stopAll() {
        for (const id of this.watchers.keys()) {
            this.stopWatching(id);
        }
    }

    isWatching(guildId) {
        return this.watchers.has(guildId);
    }

    getCurrentSong(guildId) {
        return this.watchers.get(guildId)?.lastSong ?? null;
    }
}

module.exports = new RadioMetadataService();