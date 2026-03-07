<div align="center">
  <h1>🎵 Discord Music Bot</h1>
  <p>A feature-rich, high-performance, and scalable Discord music bot built with TypeScript, Discord.js v14, and Lavalink.</p>

  <p>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22.x-green.svg?style=flat-square" alt="Node.js" /></a>
    <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/Discord.js-v14.x-blue.svg?style=flat-square" alt="Discord.js" /></a>
    <a href="https://github.com/lavalink-devs/Lavalink"><img src="https://img.shields.io/badge/Lavalink-v4.x-red.svg?style=flat-square" alt="Lavalink" /></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16.x-blue.svg?style=flat-square" alt="PostgreSQL" /></a>
    <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-7.x-red.svg?style=flat-square" alt="Redis" /></a>
    <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Ready-blue.svg?style=flat-square" alt="Docker" /></a>
  </p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-commands-overview">Commands</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-docker-deployment">Deployment</a>
  </p>
</div>

---

## 🌟 Features

- **High-Quality Audio**: Powered by [Lavalink](https://github.com/lavalink-devs/Lavalink), ensuring lag-free and high-quality playback.
- **Multiple Music Sources**: Play music effortlessly from YouTube, Spotify, Apple Music, Deezer, Yandex Music, and more APIs.
- **Multi-Bot Architecture**: Easily run multiple bot instances from a single codebase and database without clashing.
- **Rich Audio Controls**: Full control over playback with volume adjustments, seeking, looping, shuffling, autoplay, and audio filters.
- **Lyrics Integration**: Fetch and display high-quality synced and un-synced lyrics using Genius and LavaLyrics.
- **SponsorBlock Integration**: Automatically recognize and skip non-music segments (sponsors, intros, outros) in YouTube videos.
- **Database Driven**: Uses PostgreSQL and Prisma ORM for robust data persistence (favorites, custom settings, leaderboards).
- **Docker Ready**: Pre-configured `docker-compose.yml` for scalable and dead-simple deployment of all dependent services.

## 🎵 Commands Overview

The bot supports a wide array of slash (`/`) commands and text prefix commands for quick access:

| Music Playback                         | Queue Management                          | Utilities & Controls                         |
| -------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `/play`, `/search`, `/nowplaying`      | `/queue`, `/clear`, `/remove`, `/shuffle` | `/volume`, `/pause`, `/resume`, `/loop`      |
| `/skip`, `/skipto`, `/replay`, `/seek` | `/move`, `/insert`, `/autoplay`           | `/lyrics`, `/filter`, `/favorite`, `/status` |

_...and many more available utilities and configuration commands directly via the bot's help menu!_

## 🚀 Getting Started

To run the bot locally for development, follow these steps:

### Prerequisites

- Node.js (v22.x or higher)
- [pnpm](https://pnpm.io/) package manager
- PostgreSQL Database
- Redis Server
- Lavalink Server (v4+ with proper plugins for full source support)

### 1. Clone the repository

```bash
git clone https://github.com/yngpiu/music-bot-discord.git
cd music-bot-discord
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
```

_(Make sure to provide your Discord token(s), database URL, Redis URL, Lavalink credentials, and any external API keys you wish to use.)_

### 4. Database Setup

Generate Prisma client and push the schema to your database:

```bash
pnpm run postinstall
npx prisma db push
```

### 5. Start the bot

For development mode with hot-reload:

```bash
pnpm run dev
```

To build and start for production without Docker:

```bash
pnpm run build
pnpm run start
```

## 🐳 Docker Deployment

The project provides a comprehensive Docker Compose setup for deploying the Bot, Lavalink, PostgreSQL, and Redis together seamlessly.

For the complete, step-by-step production deployment guide (including CI/CD with GitHub Actions), check out the detailed documentation here:

👉 **[View Deployment Guide (Vietnamese)](./DEPLOYMENT.md)**

## 🤝 Contributing

Contributions, issues, and feature requests are highly welcome! Feel free to check the [issues page](https://github.com/yngpiu/music-bot-discord/issues) if you want to contribute.

## 📝 License

This project is open-sourced under the [ISC License](LICENSE).
