import fs from 'fs';
import https from 'https';

const url = 'https://cdn.pixabay.com/download/audio/2022/01/26/audio_0316336e4f.mp3?filename=slow-jazz-11231.mp3';
const dest = './public/slow-jazz.mp3';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'audio/mpeg, audio/x-mpeg, audio/x-mpeg-3, audio/mpeg3',
    'Referer': 'https://pixabay.com/'
  }
};

https.get(url, options, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    https.get(res.headers.location, options, (redirectRes) => {
      const file = fs.createWriteStream(dest);
      redirectRes.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Download complete via redirect.');
      });
    });
  } else if (res.statusCode === 200) {
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Download complete.');
    });
  } else {
    console.error(`Failed to download: ${res.statusCode}`);
  }
}).on('error', (err) => {
  console.error(`Error: ${err.message}`);
});
