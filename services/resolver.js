const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';
const _dep = { execFile: cp.execFile, spawn: cp.spawn };

function getCookieArgs() {
  return process.env.YT_DLP_COOKIES
    ? ['--cookies', process.env.YT_DLP_COOKIES]
    : process.env.YT_DLP_BROWSER
      ? ['--cookies-from-browser', process.env.YT_DLP_BROWSER]
      : ['--cookies-from-browser', 'firefox'];
}

function resolveReel(reelId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.instagram.com/reel/${reelId}/`;

    _dep.execFile(YT_DLP, [...getCookieArgs(), '--dump-json', url], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`yt-dlp metadata failed: ${stderr || err.message}`));
      }

      let meta;
      try {
        meta = JSON.parse(stdout);
      } catch {
        return reject(new Error('Failed to parse yt-dlp JSON output'));
      }

      resolve({
        title: meta.title || 'Instagram Reel',
        thumbnail: meta.thumbnail || '',
        duration: meta.duration || 0,
      });
    });
  });
}

function downloadAsBuffer(reelId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.instagram.com/reel/${reelId}/`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
    const tmpFile = path.join(tmpDir, `${reelId}.mp4`);
    const args = [
      ...getCookieArgs(),
      '-f', 'bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', tmpFile,
      url,
    ];

    _dep.execFile(YT_DLP, args, { timeout: 120000 }, (err, _stdout, stderr) => {
      if (err) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return reject(new Error(`yt-dlp download failed: ${stderr || err.message}`));
      }

      let buffer;
      try {
        buffer = fs.readFileSync(tmpFile);
      } catch {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return reject(new Error('Failed to read downloaded video'));
      }

      fs.rmSync(tmpDir, { recursive: true, force: true });
      resolve(buffer);
    });
  });
}

module.exports = { resolveReel, downloadAsBuffer, _dep };
