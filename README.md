<div align="center">

  # Music Bot Discord

  **High-performance Discord music bot designed to run multiple bots concurrently from a single setup.**

  [![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  [![Discord.js](https://img.shields.io/badge/Discord.js-14.x-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
  [![Lavalink](https://img.shields.io/badge/Lavalink-4.x-FF0000?logo=apache&logoColor=white)](https://github.com/lavalink-devs/Lavalink)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
</div>

---

## ✨ Features

- 🎧 **High-Quality Audio**: Powered by [Lavalink](https://github.com/lavalink-devs/Lavalink) for lag-free, high-quality playback.
- 🌐 **Multiple Music Sources**: Play effortlessly from YouTube, Spotify, Apple Music, Deezer, Yandex Music, and more.
- 🤖 **Multi-Bot Architecture**: Run multiple bot instances concurrently from a single codebase and database without clashing.
- 🎛️ **Rich Audio Controls**: Full playback control with volume, seek, loop, shuffle, autoplay, and audio filters.
- 📝 **Lyrics Integration**: Fetch and display synced and plain lyrics via Genius and LavaLyrics.
- ⏭️ **SponsorBlock Integration**: Automatically skip sponsors, intros, and outros in YouTube videos.
- 💾 **Database Driven**: PostgreSQL + Prisma ORM for favorites, custom settings, and leaderboards.
- 🐳 **Docker Ready**: Pre-configured `docker-compose.yml` for dead-simple deployment of bot, Lavalink, PostgreSQL, and Redis.

## 🎵 Commands Overview

The bot supports a wide array of slash (`/`) commands and text prefix commands:

| Music Playback                         | Queue Management                          | Utilities & Controls                         |
| -------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `/play`, `/search`, `/nowplaying`      | `/queue`, `/clear`, `/remove`, `/shuffle` | `/volume`, `/pause`, `/resume`, `/loop`      |
| `/skip`, `/skipto`, `/replay`, `/seek` | `/move`, `/insert`, `/autoplay`           | `/lyrics`, `/filter`, `/favorite`, `/status` |

_...and many more utilities and configuration commands via the built-in help menu!_

## 🛠️ Tech Stack

- **Framework**: [Discord.js v14](https://discord.js.org/) + [lavalink-client](https://github.com/TMUniversal/lavalink-client)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/)
- **Cache & Queue**: [Redis](https://redis.io/) + [ioredis](https://github.com/redis/ioredis)
- **Logging**: [Winston](https://github.com/winstonjs/winston)
- **Deployment**: [Docker](https://www.docker.com/) + Docker Compose

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v22+), [pnpm](https://pnpm.io/), a PostgreSQL database, a Redis server, and a Lavalink server (v4+ with plugins for full source support).

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yngpiu/music-bot-discord.git
cd music-bot-discord
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment:
```bash
cp .env.example .env
```
Fill in your Discord token(s), database URL, Redis URL, Lavalink credentials, and any external API keys.

4. Set up the database:
```bash
pnpm run postinstall
npx prisma db push
```

5. Start the bot:
```bash
pnpm run dev
```

To build and run for production without Docker:
```bash
pnpm run build
pnpm run start
```

## 🌐 Environment Variables

Copy `.env.example` to `.env` and fill in the values (Discord tokens, `DATABASE_URL`, `REDIS_URL`, Lavalink host/password, API keys for Apple Music, Deezer, Genius, Yandex, YouTube):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/6music
REDIS_URL=redis://localhost:6379
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_SERVER_PASSWORD=your-password
BOT_1_DISCORD_TOKEN=your-bot-token
DEFAULT_PREFIX=m
```

See [.env.example](./.env.example) for the full list.

## 🐳 Docker Deployment

The project includes a full Docker Compose setup to run the bot together with Lavalink, PostgreSQL, and Redis.

For the complete step-by-step production guide (including CI/CD with GitHub Actions), see:

👉 **[View Deployment Guide](./DEPLOYMENT.md)**

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
