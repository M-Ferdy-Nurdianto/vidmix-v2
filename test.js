const ffmpeg = require('fluent-ffmpeg');

const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

let command = ffmpeg();
const photoPath = 'D:\\Githab\\vidmix v2\\assets\\android-chrome-192x192.png';
const outputPath = 'D:\\Githab\\vidmix v2\\scratch\\test.mp4';
const encoderToUse = 'libx264';
const durationSec = 10;

command.input(photoPath).inputOptions(['-loop', '1', '-framerate', '30']);

let filterParts = [];
let lastOutputLabel = '0:v';

filterParts.push(`[${lastOutputLabel}]format=yuv420p,scale=trunc(iw/2)*2:trunc(ih/2)*2[main_v_even]`);
lastOutputLabel = 'main_v_even';

let outputOpts = [
  `-map [${lastOutputLabel}]`,
  `-c:v ${encoderToUse}`,
  '-pix_fmt yuv420p',
  '-threads 0',
  '-y',
  `-t ${durationSec}`
];

if (encoderToUse === 'libx264') {
  outputOpts.push('-preset', 'ultrafast');
}

command.complexFilter(filterParts.join(';'));
command.outputOptions(outputOpts);

command.on('start', (cmd) => console.log('CMD:', cmd));
command.on('error', (err, stdout, stderr) => {
    console.error('ERR:', err.message);
    console.error('STDERR:', stderr);
});
command.on('end', () => console.log('Done'));
command.save(outputPath);
