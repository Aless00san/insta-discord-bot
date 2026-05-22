const { SlashCommandBuilder, GuildPremiumTier } = require('discord.js');
const resolver = require('../services/resolver');

const _dep = { resolver };

const MAX_BYTES = {
  [GuildPremiumTier.None]: 25 * 1024 * 1024,
  [GuildPremiumTier.Tier1]: 25 * 1024 * 1024,
  [GuildPremiumTier.Tier2]: 50 * 1024 * 1024,
  [GuildPremiumTier.Tier3]: 100 * 1024 * 1024,
};
const DEFAULT_MAX = 25 * 1024 * 1024;

module.exports = {
  _dep,
  data: new SlashCommandBuilder()
    .setName('reel')
    .setDescription('Fetch an Instagram reel video')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Instagram reel URL')
        .setRequired(true)),

  async execute(interaction) {
    const url = interaction.options.getString('url');
    const match = url.match(
      /https?:\/\/(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
    );

    if (!match) {
      return interaction.reply({
        content: 'That does not look like a valid Instagram reel URL.',
        ephemeral: true,
      });
    }

    const reelId = match[1];
    await interaction.deferReply();

    try {
      const [meta, buffer] = await Promise.all([
        _dep.resolver.resolveReel(reelId),
        _dep.resolver.downloadAsBuffer(reelId),
      ]);

      const maxBytes = MAX_BYTES[interaction.guild?.premiumTier] ?? DEFAULT_MAX;

      if (buffer.byteLength > maxBytes) {
        const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(1);
        const maxMB = (maxBytes / 1024 / 1024).toFixed(0);
        return interaction.editReply(
          `Video is too large (${sizeMB}MB) — max is ${maxMB}MB for this server.`,
        );
      }

      await interaction.editReply({
        content: `📥 ${meta.title}`,
        files: [{ attachment: buffer, name: `${reelId}.mp4` }],
      });
    } catch (err) {
      console.error(`Failed to process reel ${reelId}:`, err.message);
      await interaction.editReply(
        'Could not fetch this reel — it may be private, restricted, or the URL is invalid.',
      );
    }
  },
};
