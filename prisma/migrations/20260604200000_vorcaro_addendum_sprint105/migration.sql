-- Aditivo Sprint 10.5: tom BALANCED + histórico leve (sem coluna tone)

ALTER TYPE "VorcaroTone" ADD VALUE IF NOT EXISTS 'BALANCED' AFTER 'DIRECT';

ALTER TABLE "VorcaroMessageHistory" DROP COLUMN IF EXISTS "tone";
