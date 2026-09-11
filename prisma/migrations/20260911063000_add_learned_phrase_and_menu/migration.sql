-- CreateTable
CREATE TABLE "LearnedPhrase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildKey" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LearnedPhrase_guildKey_idx" ON "LearnedPhrase"("guildKey");

-- CreateIndex
CREATE UNIQUE INDEX "LearnedPhrase_guildKey_trigger_key" ON "LearnedPhrase"("guildKey", "trigger");

-- CreateIndex
CREATE INDEX "MenuItem_guildKey_idx" ON "MenuItem"("guildKey");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_guildKey_name_key" ON "MenuItem"("guildKey", "name");
