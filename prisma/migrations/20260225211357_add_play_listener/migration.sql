-- Migration: add_play_listener
-- Safe migration: tạo bảng PlayListener, migrate data cũ từ PlayHistory.userId, rồi drop cột

-- Bước 1: Tạo bảng PlayListener
CREATE TABLE "PlayListener" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PlayListener_pkey" PRIMARY KEY ("id")
);

-- Bước 2: Migrate data cũ — mỗi PlayHistory cũ có userId → tạo PlayListener tương ứng
-- Dùng gen_random_uuid() để tạo id mới cho mỗi listener
INSERT INTO "PlayListener" ("id", "historyId", "userId")
SELECT gen_random_uuid()::text, ph."id", ph."userId"
FROM "PlayHistory" ph
WHERE ph."userId" IS NOT NULL AND ph."userId" != '' AND ph."userId" != 'unknown';

-- Bước 3: Thêm unique constraint và indexes
CREATE UNIQUE INDEX "PlayListener_historyId_userId_key" ON "PlayListener"("historyId", "userId");
CREATE INDEX "PlayListener_userId_idx" ON "PlayListener"("userId");
CREATE INDEX "PlayListener_historyId_idx" ON "PlayListener"("historyId");

-- Bước 4: Thêm Foreign Key
ALTER TABLE "PlayListener" ADD CONSTRAINT "PlayListener_historyId_fkey"
    FOREIGN KEY ("historyId") REFERENCES "PlayHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bước 5: Drop index cũ và cột userId khỏi PlayHistory
DROP INDEX "PlayHistory_userId_idx";
ALTER TABLE "PlayHistory" DROP COLUMN "userId";
