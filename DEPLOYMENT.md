# 🚀 Hướng dẫn Deploy Music Bot

Hướng dẫn chi tiết từ A-Z để deploy Music Bot lên VPS production.

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Thiết lập VPS lần đầu](#2-thiết-lập-vps-lần-đầu)
3. [Deploy thủ công](#3-deploy-thủ-công)
4. [Thiết lập CI/CD tự động](#4-thiết-lập-cicd-tự-động)
5. [Quản lý & vận hành](#5-quản-lý--vận-hành)
6. [Xử lý sự cố](#6-xử-lý-sự-cố)

---

## 1. Yêu cầu hệ thống

### VPS tối thiểu

| Thông số | Tối thiểu     | Khuyến nghị      |
| -------- | ------------- | ---------------- |
| RAM      | 2GB           | 4GB              |
| CPU      | 1 vCPU        | 2 vCPU           |
| Disk     | 20GB SSD      | 40GB SSD         |
| OS       | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

> **Lưu ý:** Playwright Chromium cần ~400MB RAM. Lavalink (Java) cần ~300-500MB. Tổng cộng nên có ít nhất 2GB RAM.

### Phần mềm cần cài

- **Docker Engine** ≥ 24.0
- **Docker Compose** ≥ 2.20
- **Git** ≥ 2.30

---

## 2. Thiết lập VPS lần đầu

### 2.1. Cài đặt Docker

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Docker (script chính thức)
curl -fsSL https://get.docker.com | sudo sh

# Thêm user hiện tại vào group docker (không cần sudo nữa)
sudo usermod -aG docker $USER

# Logout rồi login lại để áp dụng
exit
# SSH lại vào VPS

# Kiểm tra
docker --version
docker compose version
```

### 2.2. Cài đặt Git

```bash
sudo apt install -y git
```

### 2.3. Clone repo

```bash
cd ~
git clone https://github.com/<your-username>/music-bot.git
cd music-bot
```

### 2.4. Tải Lavalink plugins

Lavalink plugins (`.jar` files) **không được commit** vào repo. Bạn cần tải chúng thủ công trên VPS:

```bash
mkdir -p lavalink/plugins
cd lavalink/plugins

# YouTube plugin
curl -LO https://github.com/lavalink-devs/youtube-source/releases/download/1.17.0/youtube-plugin-1.17.0.jar

# LavaSrc (Spotify, Apple Music, Deezer)
curl -LO https://github.com/topi314/LavaSrc/releases/download/4.8.1/lavasrc-plugin-4.8.1.jar

# LavaSearch
curl -LO https://github.com/topi314/LavaSearch/releases/download/1.0.0/lavasearch-plugin-1.0.0.jar

# LavaLyrics
curl -LO https://github.com/topi314/LavaLyrics/releases/download/1.1.0/lavalyrics-plugin-1.1.0.jar

# SponsorBlock
curl -LO https://github.com/topi314/Sponsorblock-Plugin/releases/download/3.0.1/sponsorblock-plugin-3.0.1.jar

cd ~/music-bot
```

### 2.5. Tạo file `.env`

```bash
cp .env.example .env
nano .env
```

**Các giá trị quan trọng cần sửa:**

```env
# Đổi password mạnh
DB_PASSWORD=<password-postgres-mạnh>
REDIS_PASSWORD=<password-redis-mạnh>
LAVALINK_SERVER_PASSWORD=<password-lavalink-mạnh>

# Đảm bảo dùng hostname Docker (KHÔNG phải localhost)
DATABASE_URL=postgresql://discordbot:<password>@postgres:5432/discord_db
REDIS_URL=redis://default:<password>@redis:6379
LAVALINK_HOST=lavalink

# Điền token Discord bot
NUMBER_OF_BOTS=1
BOT_1_CLIENT_ID=<client-id>
BOT_1_DISCORD_TOKEN=<token>

# Điền API keys cho Spotify, Apple Music, Deezer (nếu dùng)
LAVASRC_SPOTIFY_CLIENT_ID=...
LAVASRC_SPOTIFY_CLIENT_SECRET=...
```

> [!CAUTION]
> **KHÔNG** dùng `localhost` cho `DATABASE_URL`, `REDIS_URL`, hay `LAVALINK_HOST` khi chạy trong Docker. Dùng tên service (`postgres`, `redis`, `lavalink`).

### 2.6. Cấu hình Firewall (optional nhưng khuyến nghị)

```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw enable
```

> Không cần mở port cho PostgreSQL, Redis, hay Lavalink vì chúng chỉ giao tiếp qua Docker internal network.

---

## 3. Deploy thủ công

### 3.1. Build và khởi động tất cả services

```bash
cd ~/music-bot
docker compose up -d --build
```

Lần đầu sẽ mất ~3-5 phút (tải Docker images + build bot + cài Playwright Chromium).

### 3.2. Kiểm tra trạng thái

```bash
# Xem trạng thái tất cả containers
docker compose ps

# Kết quả mong đợi:
# NAME                 STATUS
# music-bot-postgres   Up (healthy)
# music-bot-redis      Up (healthy)
# music-bot-lavalink   Up
# music-bot-app        Up
```

### 3.3. Chạy database migration (nếu có)

```bash
docker compose exec bot npx prisma migrate deploy
```

### 3.4. Xem logs

```bash
# Tất cả services
docker compose logs -f

# Chỉ bot
docker compose logs -f bot

# Chỉ lavalink
docker compose logs -f lavalink
```

### 3.5. Cập nhật code mới

```bash
cd ~/music-bot
git pull origin main
docker compose up -d --build bot
docker compose exec -T bot npx prisma migrate deploy || true
```

---

## 4. Thiết lập CI/CD tự động

CI/CD sử dụng GitHub Actions: khi push code lên `main`, tự động lint → build → deploy lên VPS qua SSH.

### 4.1. Tạo SSH key cho deploy

**Trên VPS:**

```bash
# Tạo SSH key dành riêng cho deploy
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy -N ""

# Thêm public key vào authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Lấy private key (sẽ paste vào GitHub Secrets)
cat ~/.ssh/github_deploy
```

### 4.2. Thêm GitHub Secrets

Vào repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name   | Giá trị                                            | Ví dụ                                    |
| ------------- | -------------------------------------------------- | ---------------------------------------- |
| `VPS_HOST`    | IP hoặc domain của VPS                             | `203.0.113.10`                           |
| `VPS_USER`    | Username SSH                                       | `root` hoặc `deploy`                     |
| `VPS_SSH_KEY` | Nội dung file `~/.ssh/github_deploy` (private key) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_PORT`    | Port SSH                                           | `22`                                     |

### 4.3. Workflow hoạt động

```
Push to main → CI (lint + build) → Deploy (SSH → git pull → docker compose up)
```

- **CI workflow** (`.github/workflows/ci.yml`): Lint + Build kiểm tra code
- **Deploy workflow** (`.github/workflows/deploy.yml`): Chỉ chạy khi CI pass, SSH vào VPS deploy

### 4.4. Test CI/CD

```bash
# Tạo một commit nhỏ và push
git add .
git commit -m "chore: test CI/CD pipeline"
git push origin main
```

Vào GitHub → tab **Actions** để theo dõi tiến trình.

---

## 5. Quản lý & vận hành

### Xem logs

```bash
# Real-time logs
docker compose logs -f bot

# Logs 100 dòng cuối
docker compose logs --tail 100 bot

# Logs của tất cả services
docker compose logs -f
```

### Restart services

```bash
# Restart bot
docker compose restart bot

# Restart tất cả
docker compose restart

# Dừng tất cả
docker compose down

# Dừng và xóa volumes (⚠️ mất data!)
docker compose down -v
```

### Backup database

```bash
# Backup
docker compose exec postgres pg_dump -U discordbot discord_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup_20260223.sql | docker compose exec -T postgres psql -U discordbot discord_db
```

### Cập nhật Docker images

```bash
# Pull images mới nhất (postgres, redis, lavalink)
docker compose pull

# Restart với images mới
docker compose up -d
```

### Xem tài nguyên

```bash
# RAM, CPU usage
docker stats

# Disk usage
docker system df
```

### Dọn dẹp Docker

```bash
# Xóa images cũ không dùng
docker image prune -a

# Xóa tất cả cache build
docker builder prune
```

---

## 6. Xử lý sự cố

### Bot không start

```bash
# Kiểm tra logs
docker compose logs bot

# Trường hợp phổ biến:
# 1. Sai DATABASE_URL → check hostname phải là "postgres" không phải "localhost"
# 2. Sai REDIS_URL → check hostname phải là "redis"
# 3. Sai Discord token → kiểm tra BOT_x_DISCORD_TOKEN
```

### Lavalink không connect

```bash
docker compose logs lavalink

# Kiểm tra:
# 1. LAVALINK_HOST phải là "lavalink" (không phải "localhost")
# 2. LAVALINK_SERVER_PASSWORD phải khớp giữa .env và application.yml
# 3. Plugins đã được tải đúng: ls -la lavalink/plugins/
```

### Database connection refused

```bash
# Kiểm tra postgres container đã healthy chưa
docker compose ps postgres

# Kiểm tra connection từ bot container
docker compose exec bot sh -c "apt-get update && apt-get install -y postgresql-client && psql $DATABASE_URL -c 'SELECT 1'"
```

### Out of Memory

```bash
# Kiểm tra memory usage
docker stats --no-stream

# Nếu Lavalink chiếm quá nhiều RAM, giới hạn trong docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### Rebuild hoàn toàn

```bash
cd ~/music-bot
docker compose down
docker compose build --no-cache bot
docker compose up -d
```
