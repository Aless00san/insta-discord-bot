import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  function makeMockProc() {
    const stdoutHandlers = {};
    const stderrHandlers = {};
    const procHandlers = {};
    return {
      stdout: { on: vi.fn((evt, fn) => { stdoutHandlers[evt] = fn; }) },
      stderr: { on: vi.fn((evt, fn) => { stderrHandlers[evt] = fn; }) },
      on: vi.fn((evt, fn) => { procHandlers[evt] = fn; }),
      _stdout: stdoutHandlers,
      _stderr: stderrHandlers,
      _proc: procHandlers,
    };
  }

  it('buffers stdout and resolves', async () => {
    const proc = makeMockProc();
    _dep.spawn = vi.fn(() => proc);

    const promise = downloadAsBuffer('abc123');
    const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];

    proc._stdout.data(chunks[0]);
    proc._stdout.data(chunks[1]);
    proc._proc.close(0);

    const result = await promise;
    expect(result).toEqual(Buffer.concat(chunks));
  });

  it('rejects on non-zero exit code', async () => {
    const proc = makeMockProc();
    _dep.spawn = vi.fn(() => proc);

    const promise = downloadAsBuffer('abc123');

    proc._stderr.data('error message');
    proc._proc.close(1);

    await expect(promise).rejects.toThrow('yt-dlp download failed');
  });

  it('rejects on spawn error', async () => {
    const proc = makeMockProc();
    _dep.spawn = vi.fn(() => proc);

    const promise = downloadAsBuffer('abc123');

    proc._proc.error(new Error('spawn failed'));

    await expect(promise).rejects.toThrow('spawn failed');
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
