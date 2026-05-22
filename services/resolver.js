const cp = require('child_process');

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';
const _dep = { execFile: cp.execFile, spawn: cp.spawn };

function getCookieArgs() {
  return process.env.YT_DLP_COOKIES
    ? ['--cookies', process.env.YT_DLP_COOKIES]
    : process.env.YT_DLP_BROWSER
      ? ['--cookies-from-browser', process.env.YT_DLP_BROWSER]
      : ['--cookies-from-browser', 'firefox'];
}

function resolveReel(reelId, cookieArgs) {
  if (!cookieArgs) cookieArgs = getCookieArgs();
  return new Promise((resolve, reject) => {
    const url = `https://www.instagram.com/reel/${reelId}/`;

    _dep.execFile(YT_DLP, [...cookieArgs, '--dump-json', url], { timeout: 30000 }, (err, stdout, stderr) => {
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

function downloadAsBuffer(reelId, cookieArgs) {
  if (!cookieArgs) cookieArgs = getCookieArgs();
  return new Promise((resolve, reject) => {
    const url = `https://www.instagram.com/reel/${reelId}/`;
    const args = [
      ...cookieArgs,
      '-S', 'codec:h264',
      '-f', 'best',
      '-o', '-',
      url,
    ];

    const proc = _dep.spawn(YT_DLP, args, { timeout: 120000 });
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

module.exports = { resolveReel, downloadAsBuffer, _dep };
