# Instagram Reel Discord Bot

> **⚠️ Disclaimer**
>
> This project is for **personal and educational purposes only**.
>
> - It uses automated tools (`yt-dlp`) to access Instagram content,
>   which may violate Instagram's Terms of Service.
> - By default, it reads **your own Firefox cookies** to authenticate
>   with Instagram. Your Instagram account may be subject to rate limits
>   or action blocks as a result.
> - Cookies are read locally and **never transmitted, stored, or shared**.
> - Do not deploy this as a public bot, service, or API.
> - The authors are not responsible for any account restrictions, data loss,
>   or legal issues arising from the use of this software.

A Discord bot that fetches Instagram reel videos and posts them directly in chat.
All in-memory — no files written to disk.

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env`, fill in `DISCORD_TOKEN` and `GUILD_ID`
3. Run `node bot.js`

## Usage

Use the `/reel` slash command:

```
/reel https://www.instagram.com/reel/XXXX
```

## Cookie Configuration

The bot reads cookies from your browser to authenticate with Instagram. Set the browser name in `.env` by changing the following line:

```
YT_DLP_BROWSER=firefox   # chrome, edge, brave, firefox
```

For containerized environments (Railway, Docker), export cookies to a file and uncomment:

```
# YT_DLP_COOKIES=/path/to/cookies.txt
```

## Testing

Run tests with:

```sh
pnpm test
```

Tests use [Vitest](https://vitest.dev) and cover the resolver (yt-dlp wrapper) and the `/reel` command handler. Dependencies are injected for testing — no external services required.

## How it works

1. Bot receives `/reel` with an Instagram reel URL
2. `yt-dlp` fetches the video metadata and pipes the MP4 to memory
3. Bot uploads the buffer directly to Discord as an attachment
4. No files are ever written to disk
