-- AlterTable: Make GuildConfig.prefix nullable (null = use env default)
ALTER TABLE "GuildConfig" ALTER COLUMN "prefix" DROP NOT NULL;
ALTER TABLE "GuildConfig" ALTER COLUMN "prefix" DROP DEFAULT;

-- CreateTable: UserConfig for per-user prefix
CREATE TABLE "UserConfig" (
    "userId" TEXT NOT NULL,
    "prefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("userId")
);
