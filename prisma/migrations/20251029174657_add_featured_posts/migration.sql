-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "posts_featured_idx" ON "posts"("featured");
