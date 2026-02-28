-- CreateTable
CREATE TABLE "CustomAlias" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "aliasName" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomAlias_userId_aliasName_key" ON "CustomAlias"("userId", "aliasName");

-- CreateIndex
CREATE INDEX "CustomAlias_userId_idx" ON "CustomAlias"("userId");
