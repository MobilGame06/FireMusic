const axios = require('axios');

async function fetchIcecastMetadata(streamUrl) {
    try {
        const headResponse = await axios.head(streamUrl, {
            headers: {
                'Icy-MetaData': '1',
                'User-Agent': 'FireMusic-DiscordBot/1.0'
            },
            timeout: 5000
        }).catch(() => null);

        const metadata = {
            stationName: null,
            stationDescription: null,
            currentSong: null,
            bitrate: null,
            sampleRate: null,
            audioCodec: null,
            url: streamUrl
        };

        if (headResponse && headResponse.headers) {
            metadata.stationName = headResponse.headers['icy-name'] || null;
            metadata.stationDescription = headResponse.headers['icy-description'] || null;
            metadata.bitrate = headResponse.headers['icy-bitrate'] ? parseInt(headResponse.headers['icy-bitrate']) : null;
            metadata.audioCodec = headResponse.headers['icy-audio-codec'] || null;
            metadata.sampleRate = headResponse.headers['icy-sample-rate'] ? parseInt(headResponse.headers['icy-sample-rate']) : null;

            if (headResponse.headers['icy-metaint']) {
                metadata.metadataInterval = parseInt(headResponse.headers['icy-metaint']);
            }
        }

        if (metadata.metadataInterval > 0) {
            const currentSong = await fetchInlineMetadata(streamUrl, metadata.metadataInterval);
            if (currentSong) {
                metadata.currentSong = currentSong;
            }
        }

        return metadata;
    } catch (error) {
        console.error('Error fetching Icecast metadata:', error.message);
        return {
            stationName: null,
            stationDescription: null,
            currentSong: null,
            bitrate: null,
            sampleRate: null,
            audioCodec: null,
            url: streamUrl
        };
    }
}

/**
 * Fetch inline metadata from Icecast stream
 * @param {string} streamUrl - The URL of the radio stream
 * @param {number} metadataInterval - Bytes between metadata chunks
 * @returns {Promise<string|null>} Current song title or null
 */
async function fetchInlineMetadata(streamUrl, metadataInterval) {
    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'Icy-MetaData': '1',
                'User-Agent': 'FireMusic-DiscordBot/1.0'
            },
            timeout: 5000
        });

        return new Promise((resolve) => {
            let buffer = Buffer.alloc(0);
            let currentPosition = 0;
            let metadataFound = false;

            const onData = (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);

                if (!metadataFound && buffer.length >= metadataInterval) {
                    currentPosition = metadataInterval;
                    const metadataLength = buffer[currentPosition] * 16;

                    if (metadataLength > 0 && buffer.length >= currentPosition + 1 + metadataLength) {
                        const metadataBuffer = buffer.slice(currentPosition + 1, currentPosition + 1 + metadataLength);
                        const metadataString = metadataBuffer.toString('utf-8').trim();
                        const songTitle = extractSongTitle(metadataString);

                        response.data.removeListener('data', onData);
                        response.data.destroy();
                        metadataFound = true;
                        resolve(songTitle);
                    }
                }
            };

            response.data.on('data', onData);
            response.data.on('error', () => {
                response.data.removeListener('data', onData);
                resolve(null);
            });

            setTimeout(() => {
                if (!metadataFound) {
                    try {
                        response.data.removeListener('data', onData);
                        response.data.destroy();
                    } catch (e) {
                    }
                    resolve(null);
                }
            }, 3000);
        });
    } catch (error) {
        console.error('Error fetching inline metadata:', error.message);
        return null;
    }
}

/**
 * Extract song title from Icecast metadata string
 * Expected format: "StreamTitle='Song Name';"
 * @param {string} metadataString - Raw metadata string
 * @returns {string|null} Extracted song title or null
 */
function extractSongTitle(metadataString) {
    const match = metadataString.match(/StreamTitle='([^']*)'[;]?/);
    if (match && match[1]) {
        const title = match[1].trim();
        return title.length > 0 ? title : null;
    }
    return null;
}

module.exports = {
    fetchIcecastMetadata,
    fetchInlineMetadata,
    extractSongTitle
};

