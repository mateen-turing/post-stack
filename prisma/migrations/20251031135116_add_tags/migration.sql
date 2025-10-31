-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");


-- CreateIndex
CREATE UNIQUE INDEX "post_tags_postId_tagId_key" ON "post_tags"("postId", "tagId");

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert predefined tags
INSERT INTO "tags" ("id", "name", "createdAt", "updatedAt") VALUES
('tag_tech', 'technology', NOW(), NOW()),
('tag_tutorial', 'tutorial', NOW(), NOW()),
('tag_news', 'news', NOW(), NOW()),
('tag_tips', 'tips', NOW(), NOW()),
('tag_review', 'review', NOW(), NOW()),
('tag_guide', 'guide', NOW(), NOW()),
('tag_howto', 'how-to', NOW(), NOW()),
('tag_programming', 'programming', NOW(), NOW()),
('tag_design', 'design', NOW(), NOW()),
('tag_business', 'business', NOW(), NOW()),
('tag_lifestyle', 'lifestyle', NOW(), NOW()),
('tag_personal', 'personal', NOW(), NOW());
