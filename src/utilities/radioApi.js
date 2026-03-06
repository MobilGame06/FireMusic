const axios = require('axios');

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
                    url: station.url_resolved
                });
            }
        });

        return resultArray;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

module.exports = {
    searchRadio: searchRadio
}