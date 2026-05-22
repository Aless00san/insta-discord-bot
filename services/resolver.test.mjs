import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { resolveReel, downloadAsBuffer, _dep } from './resolver';

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveReel', () => {
  it('parses metadata from yt-dlp JSON', async () => {
    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      cb(null, JSON.stringify({ title: 'My Reel', thumbnail: 'https://img', duration: 15 }), '');
    });

    const result = await resolveReel('abc123');

    expect(result).toEqual({
      title: 'My Reel',
      thumbnail: 'https://img',
      duration: 15,
    });
  });

  it('uses fallback title when missing', async () => {
    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      cb(null, JSON.stringify({}), '');
    });

    const result = await resolveReel('abc123');
    expect(result.title).toBe('Instagram Reel');
  });

  it('rejects on execFile error', async () => {
    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      cb(new Error('not found'), '', 'stderr output');
    });

    await expect(resolveReel('abc123')).rejects.toThrow('yt-dlp metadata failed');
  });

  it('rejects on invalid JSON', async () => {
    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      cb(null, 'not json', '');
    });

    await expect(resolveReel('abc123')).rejects.toThrow('Failed to parse yt-dlp JSON output');
  });
});

describe('downloadAsBuffer', () => {
  it('reads file written by yt-dlp and returns buffer', async () => {
    const testData = Buffer.from('fake mp4 data');
    _dep.execFile = vi.fn((_bin, args, _opts, cb) => {
      const oIdx = args.indexOf('-o');
      const outPath = args[oIdx + 1];
      fs.writeFileSync(outPath, testData);
      cb(null, '', '');
    });

    const result = await downloadAsBuffer('abc123');

    expect(result).toEqual(testData);
  });

  it('rejects on yt-dlp error', async () => {
    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      cb(new Error('download failed'), '', 'stderr');
    });

    await expect(downloadAsBuffer('abc123')).rejects.toThrow('yt-dlp download failed');
  });
});

describe('cookie args configuration', () => {
  it('uses YT_DLP_COOKIES when set', async () => {
    vi.stubEnv('YT_DLP_COOKIES', '/path/to/cookies.txt');

    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      expect(_args).toContain('--cookies');
      expect(_args).toContain('/path/to/cookies.txt');
      cb(null, '{}', '');
    });

    await resolveReel('abc123');
  });

  it('uses YT_DLP_BROWSER when COOKIES is not set', async () => {
    vi.stubEnv('YT_DLP_BROWSER', 'chrome');

    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      expect(_args).toContain('--cookies-from-browser');
      expect(_args).toContain('chrome');
      cb(null, '{}', '');
    });

    await resolveReel('abc123');
  });

  it('defaults to Firefox when neither is set', async () => {
    _dep.execFile = vi.fn((_bin, _args, _opts, cb) => {
      expect(_args).toContain('--cookies-from-browser');
      expect(_args).toContain('firefox');
      cb(null, '{}', '');
    });

    await resolveReel('abc123');
  });
});
