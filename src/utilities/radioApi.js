const axios = require('axios');
const { fetchIcecastMetadata } = require('./icecastMetadata');

async function searchRadio(query) {
    const url = `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=25&order=votes&reverse=true`;
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'FireMusic-DiscordBot/1.0'
            }
        });
        const stations = response.data;
        const resultArray = [];

        stations.forEach(station => {
            if (station.url_resolved && station.url_resolved.length > 0) {
                resultArray.push({
                    program: station.name,
                    highestBitrate: station.bitrate,
                    url: station.url_resolved,
                    favicon: station.favicon || null
                });
            }
        });

        return resultArray;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function getEnhancedRadioMetadata(streamUrl, stationName) {
    try {
        const metadata = await fetchIcecastMetadata(streamUrl);

        if (!metadata.stationName && stationName) {
            metadata.stationName = stationName;
        }

        return metadata;
    } catch (error) {
        console.error('Error getting enhanced metadata:', error);
        return {
            stationName: stationName || 'Unknown Station',
            stationDescription: null,
            currentSong: null,
            bitrate: null,
            sampleRate: null,
            audioCodec: null,
            url: streamUrl
        };
    }
}

module.exports = {
    searchRadio: searchRadio,
    getEnhancedRadioMetadata: getEnhancedRadioMetadata
}