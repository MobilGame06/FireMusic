require("dotenv").config();

const axios = require('axios');
function getKey() {
    const keya = parseInt(process.env.KEY_A, 16);
    const keyb = parseInt(process.env.KEY_B, 16);

    const currentTime = Math.round(Date.now() / 1000);
    const key = (keya * currentTime + keyb).toString(16);
    return key
}

async function searchRadio(query) {
    const url = `http://fmstream.org/index.php?s=${query}&key=${getKey()}`;
    try {
        const response = await axios.get(url);
        const programs = response.data.data;
        const resultArray = [];

        programs.forEach(program => {
            if (program.urls && program.urls.length > 0) {
                const sortedUrls = program.urls.sort((a, b) => b.bit_rate - a.bit_rate);
                const highestBitrateUrl = sortedUrls[0];

                resultArray.push({
                    program: program.program,
                    highestBitrate: highestBitrateUrl.bit_rate,
                    url: highestBitrateUrl.url
                });
            }
        });

        return resultArray;
    } catch (error) {
        console.error('Error:', error);
        return []; // Rückgabe eines leeren Arrays im Fehlerfall
    }
}

module.exports = {
    getKey: getKey,
    searchRadio: searchRadio
}