const { execFile, spawn } = require('child_process');

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';
const COOKIE_ARGS = process.env.YT_DLP_COOKIES
  ? ['--cookies', process.env.YT_DLP_COOKIES]
  : process.env.YT_DLP_BROWSER
    ? ['--cookies-from-browser', process.env.YT_DLP_BROWSER]
    : ['--cookies-from-browser', 'firefox'];

function resolveReel(reelId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.instagram.com/reel/${reelId}/`;

    execFile(YT_DLP, [...COOKIE_ARGS, '--dump-json', url], { timeout: 30000 }, (err, stdout, stderr) => {
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
    const args = [
      ...COOKIE_ARGS,
      '-f', 'bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', '-',
      url,
    ];

    const proc = spawn(YT_DLP, args, { timeout: 120000 });
    const chunks = [];
    let stderr = '';

    proc.stdout.on('data', (chunk) => chunks.push(chunk));
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp download failed: ${stderr || `exit code ${code}`}`));
      }
      resolve(Buffer.concat(chunks));
    });

    proc.on('error', reject);
  });
}

module.exports = { resolveReel, downloadAsBuffer };
