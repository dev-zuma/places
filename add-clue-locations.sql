-- Add locationPositions field to Clue table to store which locations each clue applies to
-- This will be a JSON array of location positions (e.g., "[1, 3]" means clue applies to locations 1 and 3)

ALTER TABLE Clue ADD COLUMN locationPositions TEXT;