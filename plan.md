# Plan — Instagram Reel Discord Bot

## Future Ideas

- **Interaction timeout guard** — `downloadAsBuffer` has a 120s timeout, but `interaction.deferReply()` gives a 15min window. Worth adding a timeout wrapper to fail fast if the download hangs.
- **Slash command cooldown** — prevent users from spamming `/reel` and hitting Instagram rate limits.
- **Better error reporting** — differentiate between "private reel", "invalid URL", and "Instagram API denied" instead of a generic message.
- **Support for carousel posts and single images** — extend `/reel` to handle `instagram.com/p/` URLs.
- **Logging** — replace `console.log` with a structured logger (pino or similar).
