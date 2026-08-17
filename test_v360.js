const cp = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path.replace('app.asar', 'app.asar.unpacked');

const cmd = `"${ffmpeg}" -f lavfi -i "color=black:s=400x400[c];[c]drawbox=x=0:y=300:w=400:h=100:color=red@1.0:t=fill" -vf "v360=input=equirect:output=fisheye:pitch=-90" -vframes 1 -y d:\\temp_v360.png`;

console.log("Running:", cmd);
try {
  cp.execSync(cmd, { stdio: 'inherit' });
  console.log("Success");
} catch (e) {
  console.error(e);
}
