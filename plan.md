# Plan — Instagram Reel Discord Bot

## ✅ Done

- [x] Core `/reel` slash command (commands/reel.js)
- [x] URL validation (Instagram Reel regex)
- [x] `interaction.deferReply()` — prevents 3s timeout
- [x] `Promise.all` — metadata + download in parallel
- [x] Size check against `GuildPremiumTier` (25/50/100 MB)
- [x] Video upload as attachment
- [x] Error handling (invalid URL, yt-dlp failure, size limit, generic)
- [x] Instagram auth via `yt-dlp` cookies (`YT_DLP_COOKIES` / `YT_DLP_BROWSER` / Firefox fallback)
- [x] RAM-only pipeline (yt-dlp `-o -` pipe to buffer, no disk)
- [x] Updated `.env.example` with cookie vars

## ❌ Remaining

### 1. Railway hosting (Dockerfile or nixpacks)
- Create a `Dockerfile` (Debian-slim + install `yt-dlp` + `node bot.js`)
- The spec requires it; without it the project is not deployable on Railway
- Alternatively, add `nixpacks.toml`

### 2. Linter + formatter
- Add ESLint + Prettier (or a lightweight alternative)
- Keep style consistent across the codebase

### 3. Tests
- Unit tests for `services/resolver.js` (mock `child_process`)
- Unit tests for `commands/reel.js` (mock resolver + interaction)
- Decide on test runner (node:test, vitest, jest)

### 4. CI pipeline
- GitHub Actions: lint + test on push/PR

### 5. Graceful shutdown
- Handle `SIGINT`/`SIGTERM` to log out the Discord client cleanly

### 6. Interaction timeout guard
- downloadAsBuffer has a 120s timeout, but `interaction.deferReply()` has a 15min window — no immediate action, but worth noting
