const axios = require('axios');
const readline = require('readline');
require("dotenv").config();

const keya = parseInt(process.env.KEY_A, 16);
const keyb = parseInt(process.env.KEY_B, 16);

const currentTime = Math.round(Date.now() / 1000);
const key = (keya * currentTime + keyb).toString(16);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


rl.question('Search (s=): ', (searchQuery) => {
  rl.close();
  searchQuery = searchQuery
  const url = `http://fmstream.org/index.php?s=${searchQuery}&key=${key}`;

  axios.get(url)
    .then(response => {
      const programs = response.data.data;
      programs.forEach(program => {
        if (program.urls && program.urls.length > 0) {
          const sortedUrls = program.urls.sort((a, b) => b.bit_rate - a.bit_rate);
          const highestBitrateUrl = sortedUrls[0];
          
          console.log('Programm:', program.program);
          console.log('Highest Bitrate:', highestBitrateUrl.bit_rate);
          console.log('URL:', highestBitrateUrl.url);
          console.log('-------------------------------------------');
        } else {
          console.log('Programm:', program.program);
          console.log('No URLs found');
          console.log('-------------------------------------------');
        }
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });
});
