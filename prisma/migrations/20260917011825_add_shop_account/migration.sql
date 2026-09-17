-- CreateTable
CREATE TABLE "ShopAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "shard" TEXT NOT NULL,
    "riotUsername" TEXT NOT NULL,
    "encryptedCookie" TEXT NOT NULL,
    "lastLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopAccount_userId_key" ON "ShopAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopAccount_puuid_key" ON "ShopAccount"("puuid");

-- CreateIndex
CREATE INDEX "ShopAccount_userId_idx" ON "ShopAccount"("userId");
