-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "isrc" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "normalizedArtist" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "uri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_isrc_idx" ON "Track"("isrc");

-- CreateIndex
CREATE INDEX "Track_normalizedTitle_normalizedArtist_idx" ON "Track"("normalizedTitle", "normalizedArtist");

-- CreateIndex
CREATE INDEX "PlayHistory_guildId_idx" ON "PlayHistory"("guildId");

-- CreateIndex
CREATE INDEX "PlayHistory_userId_idx" ON "PlayHistory"("userId");

-- CreateIndex
CREATE INDEX "PlayHistory_trackId_idx" ON "PlayHistory"("trackId");

-- CreateIndex
CREATE INDEX "PlayHistory_playedAt_idx" ON "PlayHistory"("playedAt");

-- AddForeignKey
ALTER TABLE "PlayHistory" ADD CONSTRAINT "PlayHistory_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
