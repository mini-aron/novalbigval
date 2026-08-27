-- CreateTable
CREATE TABLE "ServiceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puuid" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "shard" TEXT NOT NULL,
    "encryptedCookie" TEXT NOT NULL,
    "lastLoginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
