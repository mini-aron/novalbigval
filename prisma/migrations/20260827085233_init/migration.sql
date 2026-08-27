-- CreateTable
CREATE TABLE "User" (
    "discordId" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RiotAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "shard" TEXT NOT NULL,
    "riotUsername" TEXT NOT NULL,
    "encryptedCookie" TEXT NOT NULL,
    "lastLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiotAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riotAccountId" TEXT NOT NULL,
    "skinUuid" TEXT NOT NULL,
    "skinName" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_riotAccountId_fkey" FOREIGN KEY ("riotAccountId") REFERENCES "RiotAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RiotAccount_puuid_key" ON "RiotAccount"("puuid");

-- CreateIndex
CREATE INDEX "RiotAccount_userId_idx" ON "RiotAccount"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_riotAccountId_idx" ON "WishlistItem"("riotAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_riotAccountId_skinUuid_key" ON "WishlistItem"("riotAccountId", "skinUuid");
