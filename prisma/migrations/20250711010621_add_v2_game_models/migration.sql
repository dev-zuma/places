-- CreateTable
CREATE TABLE "GameV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "villainName" TEXT NOT NULL,
    "villainTitle" TEXT NOT NULL,
    "villainGender" TEXT NOT NULL,
    "villainAge" TEXT NOT NULL,
    "villainEthnicity" TEXT NOT NULL,
    "villainDistinctiveFeature" TEXT NOT NULL,
    "villainClothingDescription" TEXT NOT NULL,
    "villainImageUrl" TEXT,
    "caseTitle" TEXT NOT NULL,
    "crimeSummary" TEXT NOT NULL,
    "interestingFact" TEXT NOT NULL,
    "finalLocationObjective" TEXT NOT NULL,
    "finalLocationNarrative" TEXT NOT NULL,
    "finalInterestingFact" TEXT NOT NULL,
    "gameCompletionMessage" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LocationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameV2Id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "timezoneOffset" REAL NOT NULL,
    "timezoneName" TEXT NOT NULL,
    "landmarks" TEXT NOT NULL,
    "additionalData" TEXT,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "imageTurn" INTEGER,
    "imageLevel" TEXT,
    "villainElement" TEXT,
    CONSTRAINT "LocationV2_gameV2Id_fkey" FOREIGN KEY ("gameV2Id") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalLocationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameV2Id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "clueConnections" TEXT NOT NULL,
    CONSTRAINT "FinalLocationV2_gameV2Id_fkey" FOREIGN KEY ("gameV2Id") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameplayTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameV2Id" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "narrative" TEXT NOT NULL,
    "isFinalLocation" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GameplayTurn_gameV2Id_fkey" FOREIGN KEY ("gameV2Id") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Clue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameplayTurnId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "description" TEXT,
    "data" TEXT NOT NULL,
    CONSTRAINT "Clue_gameplayTurnId_fkey" FOREIGN KEY ("gameplayTurnId") REFERENCES "GameplayTurn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameV2Id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStep" TEXT,
    "totalSteps" INTEGER NOT NULL DEFAULT 20,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "GenerationV2_gameV2Id_fkey" FOREIGN KEY ("gameV2Id") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerCaseV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "gameV2Id" TEXT NOT NULL,
    "solvedLocations" BOOLEAN NOT NULL DEFAULT false,
    "solvedFinal" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" DATETIME,
    "turnsUsed" INTEGER,
    "pointsEarned" INTEGER,
    CONSTRAINT "PlayerCaseV2_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerCaseV2_gameV2Id_fkey" FOREIGN KEY ("gameV2Id") REFERENCES "GameV2" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationV2_gameV2Id_position_key" ON "LocationV2"("gameV2Id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "FinalLocationV2_gameV2Id_key" ON "FinalLocationV2"("gameV2Id");

-- CreateIndex
CREATE UNIQUE INDEX "GameplayTurn_gameV2Id_turn_key" ON "GameplayTurn"("gameV2Id", "turn");

-- CreateIndex
CREATE UNIQUE INDEX "Clue_gameplayTurnId_orderIndex_key" ON "Clue"("gameplayTurnId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationV2_gameV2Id_key" ON "GenerationV2"("gameV2Id");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCaseV2_playerId_gameV2Id_key" ON "PlayerCaseV2"("playerId", "gameV2Id");
