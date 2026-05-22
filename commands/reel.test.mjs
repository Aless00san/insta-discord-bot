import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('discord.js', () => ({
  SlashCommandBuilder: vi.fn(() => ({
    setName: vi.fn().mockReturnThis(),
    setDescription: vi.fn().mockReturnThis(),
    addStringOption: vi.fn().mockReturnThis(),
  })),
  GuildPremiumTier: { None: 0, Tier1: 1, Tier2: 2, Tier3: 3 },
}));

import { execute, _dep } from './reel';

const mockResolveReel = vi.fn();
const mockDownloadAsBuffer = vi.fn();

function makeInteraction({ url, premiumTier } = {}) {
  return {
    options: { getString: vi.fn(() => url || 'https://www.instagram.com/reel/abc123/') },
    guild: premiumTier !== undefined ? { premiumTier } : null,
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  _dep.resolver = { resolveReel: mockResolveReel, downloadAsBuffer: mockDownloadAsBuffer };
});

describe('URL validation', () => {
  it('rejects invalid URLs', async () => {
    const interaction = makeInteraction({ url: 'not-a-url' });
    await execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'That does not look like a valid Instagram reel URL.',
      ephemeral: true,
    });
  });

  it('accepts www.instagram.com/reel/ URLs', async () => {
    const interaction = makeInteraction({ url: 'https://www.instagram.com/reel/DEinFzTxlw7/' });
    mockResolveReel.mockResolvedValue({ title: 'Test' });
    mockDownloadAsBuffer.mockResolvedValue(Buffer.alloc(1024));

    await execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
  });

  it('accepts instagram.com/reel/ URLs without www', async () => {
    const interaction = makeInteraction({ url: 'https://instagram.com/reel/DEinFzTxlw7/' });
    mockResolveReel.mockResolvedValue({ title: 'Test' });
    mockDownloadAsBuffer.mockResolvedValue(Buffer.alloc(1024));

    await execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
  });
});

describe('successful download', () => {
  it('uploads video as attachment', async () => {
    const interaction = makeInteraction({ url: 'https://www.instagram.com/reel/abc123/' });
    const buffer = Buffer.alloc(1024);
    mockResolveReel.mockResolvedValue({ title: 'My Cool Reel' });
    mockDownloadAsBuffer.mockResolvedValue(buffer);

    await execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: '📥 My Cool Reel',
      files: [{ attachment: buffer, name: 'abc123.mp4' }],
    });
  });
});

describe('size limit', () => {
  it('replies with size warning when video is too large', async () => {
    const interaction = makeInteraction({
      url: 'https://www.instagram.com/reel/abc123/',
      premiumTier: 0,
    });
    const buffer = Buffer.alloc(26 * 1024 * 1024);
    mockResolveReel.mockResolvedValue({ title: 'Big Reel' });
    mockDownloadAsBuffer.mockResolvedValue(buffer);

    await execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringMatching(/too large.*26.*MB.*25MB/),
    );
  });

  it('uses correct limit per premium tier', async () => {
    const interaction = makeInteraction({
      url: 'https://www.instagram.com/reel/abc123/',
      premiumTier: 2,
    });
    const buffer = Buffer.alloc(51 * 1024 * 1024);
    mockResolveReel.mockResolvedValue({ title: 'Big Reel' });
    mockDownloadAsBuffer.mockResolvedValue(buffer);

    await execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringMatching(/too large.*51.*MB.*50MB/),
    );
  });
});

describe('error handling', () => {
  it('returns generic message on resolver failure', async () => {
    const interaction = makeInteraction({ url: 'https://www.instagram.com/reel/abc123/' });
    mockResolveReel.mockRejectedValue(new Error('yt-dlp failed'));

    await execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Could not fetch this reel'),
    );
  });

  it('returns generic message on download failure', async () => {
    const interaction = makeInteraction({ url: 'https://www.instagram.com/reel/abc123/' });
    mockResolveReel.mockResolvedValue({ title: 'Test' });
    mockDownloadAsBuffer.mockRejectedValue(new Error('download failed'));

    await execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Could not fetch this reel'),
    );
  });
});
