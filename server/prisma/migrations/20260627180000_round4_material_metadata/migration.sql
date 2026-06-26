-- AlterTable: Add metadata JSON column to Material
ALTER TABLE "materials" ADD COLUMN "metadata" JSONB;
