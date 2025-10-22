-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert predefined categories
INSERT INTO "categories" ("id", "name", "slug", "createdAt", "updatedAt") VALUES
('cat_tech', 'Technology', 'technology', NOW(), NOW()),
('cat_tutorial', 'Tutorial', 'tutorial', NOW(), NOW()),
('cat_lifestyle', 'Lifestyle', 'lifestyle', NOW(), NOW()),
('cat_review', 'Review', 'review', NOW(), NOW()),
('cat_news', 'News', 'news', NOW(), NOW()),
('cat_opinion', 'Opinion', 'opinion', NOW(), NOW()),
('cat_tips', 'Tips & Tricks', 'tips-tricks', NOW(), NOW());
