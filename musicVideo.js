function generateMusicVideo(videoName, videoPath, audioPath) {
  const child_process = require('child_process');
  //-c:v copy -c:a aac
  child_process.spawnSync(
    'ffmpeg',
    [
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-c:v',
      'copy',
      '-c:a',
      'copy',
      videoName,
      '-y',
    ],
    {
      stdio: 'inherit',
    }
  );
}
let videoName = 'musicvideo';
if (process.argv.length > 2) {
  videoName = process.argv[2];
}
let videoPath = 'video.mov';
if (process.argv.length > 3) {
  videoPath = process.argv[3];
}
let audioPath = 'music.wav';
if (process.argv.length > 4) {
  audioPath = process.argv[4];
}
generateMusicVideo(videoName, videoPath, audioPath);
