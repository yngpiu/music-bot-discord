-- CreateTable
CREATE TABLE "FavoriteTrack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "uri" TEXT,
    "identifier" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "artworkUrl" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "isrc" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteTrack_userId_idx" ON "FavoriteTrack"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteTrack_userId_identifier_sourceName_key" ON "FavoriteTrack"("userId", "identifier", "sourceName");
