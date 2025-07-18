/*
  Warnings:

  - Added the required column `flagColors` to the `FinalLocationV2` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinalLocationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameV2Id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "educationalPhrase" TEXT NOT NULL,
    "categoryHint" TEXT NOT NULL,
    "interestingFact" TEXT NOT NULL,
    "flagColors" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "clueConnections" TEXT NOT NULL,
    CONSTRAINT "FinalLocationV2_gameV2Id_fkey" FOREIGN KEY ("gameV2Id") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinalLocationV2" ("categoryHint", "clueConnections", "country", "educationalPhrase", "gameV2Id", "id", "interestingFact", "latitude", "longitude", "name", "reason") SELECT "categoryHint", "clueConnections", "country", "educationalPhrase", "gameV2Id", "id", "interestingFact", "latitude", "longitude", "name", "reason" FROM "FinalLocationV2";
DROP TABLE "FinalLocationV2";
ALTER TABLE "new_FinalLocationV2" RENAME TO "FinalLocationV2";
CREATE UNIQUE INDEX "FinalLocationV2_gameV2Id_key" ON "FinalLocationV2"("gameV2Id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
