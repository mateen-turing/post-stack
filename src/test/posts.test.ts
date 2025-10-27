import { prisma } from './setup';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';



describe('Blog Post Routes', () => {
  const baseUrl = `http://localhost:${process.env.PORT}/api`;
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('Password123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
      },
    });
    userId = user.id;
    authToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!);
  });

  describe('GET /api/posts', () => {
    it('should return published posts', async () => {
      // Create test posts
      await prisma.post.createMany({
        data: [
          {
            title: 'Test Post 1',
            content: '# Test Content',
            slug: 'test-post-1',
            published: true,
            authorId: userId,
          },
          {
            title: 'Test Post 2',
            content: '# Test Content 2',
            slug: 'test-post-2',
            published: true,
            authorId: userId,
          },
          {
            title: 'Draft Post',
            content: '# Draft Content',
            slug: 'draft-post',
            published: false,
            authorId: userId,
          },
        ],
      });

      const response = await fetch(`${baseUrl}/posts`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('posts');
      expect(data).toHaveProperty('pagination');
      expect(data.posts).toHaveLength(2);
      expect(data.posts[0].published).toBe(true);
      expect(data.posts[1].published).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple posts
      const posts = Array.from({ length: 15 }, (_, i) => ({
        title: `Post ${i + 1}`,
        content: `# Content ${i + 1}`,
        slug: `post-${i + 1}`,
        published: true,
        authorId: userId,
      }));

      await prisma.post.createMany({ data: posts });

      const response = await fetch(`${baseUrl}/posts?page=2&limit=5`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(5);
      expect(data.posts).toHaveLength(5);
    });

    it('should search posts by title', async () => {
      // Create test posts with various titles
      await prisma.post.createMany({
        data: [
          {
            title: 'JavaScript Tutorial',
            content: '# JavaScript Content',
            slug: 'javascript-tutorial',
            published: true,
            authorId: userId,
          },
          {
            title: 'Advanced JavaScript Concepts',
            content: '# Advanced Content',
            slug: 'advanced-javascript',
            published: true,
            authorId: userId,
          },
          {
            title: 'Python for Beginners',
            content: '# Python Content',
            slug: 'python-beginners',
            published: true,
            authorId: userId,
          },
          {
            title: 'JavaScript vs Python',
            content: '# Comparison Content',
            slug: 'javascript-vs-python',
            published: true,
            authorId: userId,
          },
          {
            title: 'React Development Guide',
            content: '# React Content',
            slug: 'react-guide',
            published: true,
            authorId: userId,
          },
        ],
      });

      const response = await fetch(`${baseUrl}/posts?title=JavaScript`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('posts');
      expect(data).toHaveProperty('pagination');
      expect(data.posts).toHaveLength(3); // Should find 3 posts with "JavaScript" in title
      expect(data.posts.every((post: any) => post.title.toLowerCase().includes('javascript'))).toBe(true);
    });

    it('should perform case-insensitive search', async () => {
      await prisma.post.create({
        data: {
          title: 'JavaScript Tutorial',
          content: '# JavaScript Content',
          slug: 'javascript-tutorial',
          published: true,
          authorId: userId,
        },
      });

      const response = await fetch(`${baseUrl}/posts?title=JAVASCRIPT`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].title).toBe('JavaScript Tutorial');
    });

    it('should support partial matching', async () => {
      await prisma.post.createMany({
        data: [
          {
            title: 'JavaScript Tutorial',
            content: '# JavaScript Content',
            slug: 'javascript-tutorial',
            published: true,
            authorId: userId,
          },
          {
            title: 'Advanced JavaScript Concepts',
            content: '# Advanced Content',
            slug: 'advanced-javascript',
            published: true,
            authorId: userId,
          },
        ],
      });

      const response = await fetch(`${baseUrl}/posts?title=Tutorial`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].title).toBe('JavaScript Tutorial');
    });

    it('should return empty results for non-matching search', async () => {
      await prisma.post.create({
        data: {
          title: 'JavaScript Tutorial',
          content: '# JavaScript Content',
          slug: 'javascript-tutorial',
          published: true,
          authorId: userId,
        },
      });

      const response = await fetch(`${baseUrl}/posts?title=NonExistent`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it('should maintain backward compatibility when no title parameter is provided', async () => {
      await prisma.post.createMany({
        data: [
          {
            title: 'JavaScript Tutorial',
            content: '# JavaScript Content',
            slug: 'javascript-tutorial',
            published: true,
            authorId: userId,
          },
          {
            title: 'Python Guide',
            content: '# Python Content',
            slug: 'python-guide',
            published: true,
            authorId: userId,
          },
        ],
      });

      const response = await fetch(`${baseUrl}/posts`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(2); // Should return all posts
      expect(data.pagination.total).toBe(2);
    });

    it('should work with pagination and search together', async () => {
      // Create multiple posts with similar titles
      const posts = Array.from({ length: 15 }, (_, i) => ({
        title: `JavaScript Post ${i + 1}`,
        content: `# JavaScript Content ${i + 1}`,
        slug: `javascript-post-${i + 1}`,
        published: true,
        authorId: userId,
      }));

      await prisma.post.createMany({ data: posts });

      const response = await fetch(`${baseUrl}/posts?title=JavaScript&page=2&limit=5`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(5);
      expect(data.posts).toHaveLength(5);
      expect(data.pagination.total).toBe(15);
      expect(data.posts.every((post: any) => post.title.toLowerCase().includes('javascript'))).toBe(true);
    });
  });

  describe('GET /api/posts/:slug', () => {
    it('should return published post by slug', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Test Post',
          content: '# Test Content',
          slug: 'test-post',
          published: true,
          authorId: userId,
        },
      });

      const response = await fetch(`${baseUrl}/posts/test-post`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('post');
      expect(data.post.slug).toBe('test-post');
      expect(data.post.published).toBe(true);
    });

    it('should return post with SEO metadata', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'SEO Test Post',
          content: '# SEO Test Content',
          slug: 'seo-test-post',
          published: true,
          authorId: userId,
          metaTitle: 'Custom SEO Title',
          metaDescription: 'Custom meta description for SEO',
          ogImage: 'https://example.com/seo-image.jpg',
        },
      });

      const response = await fetch(`${baseUrl}/posts/seo-test-post`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('post');
      expect(data.post.metaTitle).toBe('Custom SEO Title');
      expect(data.post.metaDescription).toBe('Custom meta description for SEO');
      expect(data.post.ogImage).toBe('https://example.com/seo-image.jpg');
    });

    it('should return 404 for non-existent post', async () => {
      const response = await fetch(`${baseUrl}/posts/non-existent`);

      const data: any = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Post not found');
    });

    it('should return 404 for unpublished post when not authenticated', async () => {
      await prisma.post.create({
        data: {
          title: 'Draft Post',
          content: '# Draft Content',
          slug: 'draft-post',
          published: false,
          authorId: userId,
        },
      });

      const response = await fetch(`${baseUrl}/posts/draft-post`);

      const data: any = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Post not found');
    });

    it('should return unpublished post when user is the author', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Draft Post',
          content: '# Draft Content',
          slug: 'draft-post',
          published: false,
          authorId: userId,
        },
      });

      const response = await fetch(`${baseUrl}/posts/drafts/draft-post`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('post');
      expect(data.post.slug).toBe('draft-post');
      expect(data.post.published).toBe(false);
    });
  });

  describe('POST /api/posts', () => {
    it('should create a new post when authenticated', async () => {
      const postData = {
        title: 'New Test Post',
        content: '# New Test Content',
        published: false,
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('message', 'Post created successfully');
      expect(data).toHaveProperty('post');
      expect(data.post.title).toBe(postData.title);
      expect(data.post.content).toBe(postData.content);
      expect(data.post.published).toBe(postData.published);
      expect(data.post.slug).toBe('new-test-post');

      // Verify post was created in database
      const post = await prisma.post.findUnique({
        where: { slug: 'new-test-post' },
      });
      expect(post).toBeTruthy();
      expect(post?.authorId).toBe(userId);
    });

    it('should return error when not authenticated', async () => {
      const postData = {
        title: 'New Test Post',
        content: '# New Test Content',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error', 'Access token required');
    });

    it('should return validation error for missing title', async () => {
      const postData = {
        content: '# New Test Content',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation failed');
    });

    it('should return error if post with same title already exists', async () => {
      // First create a post
      await prisma.post.create({
        data: {
          title: 'Existing Post',
          content: '# Existing Content',
          slug: 'existing-post',
          published: true,
          authorId: userId,
        },
      });

      const postData = {
        title: 'Existing Post',
        content: '# New Content',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'A post with this title already exists');
    });

    it('should create post with SEO metadata', async () => {
      const postData = {
        title: 'SEO Test Post',
        content: '# SEO Test Content',
        published: false,
        metaTitle: 'Custom SEO Title',
        metaDescription: 'This is a custom meta description for SEO purposes',
        ogImage: 'https://example.com/image.jpg',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('message', 'Post created successfully');
      expect(data).toHaveProperty('post');
      expect(data.post.metaTitle).toBe(postData.metaTitle);
      expect(data.post.metaDescription).toBe(postData.metaDescription);
      expect(data.post.ogImage).toBe(postData.ogImage);

      // Verify post was created in database
      const post = await prisma.post.findUnique({
        where: { slug: 'seo-test-post' },
      });
      expect(post).toBeTruthy();
      expect(post?.metaTitle).toBe(postData.metaTitle);
      expect(post?.metaDescription).toBe(postData.metaDescription);
      expect(post?.ogImage).toBe(postData.ogImage);
    });

    it('should create post without SEO metadata (backward compatibility)', async () => {
      const postData = {
        title: 'Backward Compatible Post',
        content: '# Backward Compatible Content',
        published: false,
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('message', 'Post created successfully');
      expect(data).toHaveProperty('post');
      expect(data.post.metaTitle).toBeNull();
      expect(data.post.metaDescription).toBeNull();
      expect(data.post.ogImage).toBeNull();
    });

    it('should validate meta title length', async () => {
      const postData = {
        title: 'Validation Test Post',
        content: '# Validation Test Content',
        metaTitle: 'This is a very long meta title that exceeds the 60 character limit and should fail validation',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation failed');
    });

    it('should validate meta description length', async () => {
      const postData = {
        title: 'Validation Test Post',
        content: '# Validation Test Content',
        metaDescription: 'This is a very long meta description that exceeds the 160 character limit and should fail validation because it is too long for search engines to display properly in search results',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation failed');
    });

    it('should validate ogImage URL format', async () => {
      const postData = {
        title: 'Validation Test Post',
        content: '# Validation Test Content',
        ogImage: 'not-a-valid-url',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation failed');
    });

    it('should accept valid ogImage URL', async () => {
      const postData = {
        title: 'Valid URL Test Post',
        content: '# Valid URL Test Content',
        ogImage: 'https://example.com/valid-image.jpg',
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('message', 'Post created successfully');
      expect(data.post.ogImage).toBe(postData.ogImage);
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update post when user owns it', async () => {
      // First create a post
      const post = await prisma.post.create({
        data: {
          title: 'Original Title',
          content: '# Original Content',
          slug: 'original-title',
          published: false,
          authorId: userId,
        },
      });

      const updateData = {
        title: 'Updated Post Title',
        content: '# Updated Content',
        published: true,
      };

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Post updated successfully');
      expect(data).toHaveProperty('post');
      expect(data.post.title).toBe(updateData.title);
      expect(data.post.content).toBe(updateData.content);
      expect(data.post.published).toBe(updateData.published);
      expect(data.post.slug).toBe('updated-post-title');

      // Verify post was updated in database
      const updatedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(updatedPost?.title).toBe(updateData.title);
      expect(updatedPost?.published).toBe(updateData.published);
    });

    it('should return error when user does not own post', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          username: 'otheruser',
          password: await bcrypt.hash('Password123', 12),
        },
      });

      // Create a post owned by the other user
      const post = await prisma.post.create({
        data: {
          title: 'Other User Post',
          content: '# Other Content',
          slug: 'other-user-post',
          published: false,
          authorId: otherUser.id,
        },
      });

      const updateData = {
        title: 'Updated Post Title',
        content: '# Updated Content',
      };

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty('error', 'Not authorized to update this post');
    });

    it('should return 404 for non-existent post', async () => {
      const updateData = {
        title: 'Updated Post Title',
        content: '# Updated Content',
      };

      const response = await fetch(`${baseUrl}/posts/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Post not found');
    });

    it('should update post with SEO metadata', async () => {
      // First create a post
      const post = await prisma.post.create({
        data: {
          title: 'Original Post',
          content: '# Original Content',
          slug: 'original-post',
          published: false,
          authorId: userId,
        },
      });

      const updateData = {
        title: 'Updated Post with SEO',
        content: '# Updated Content',
        published: true,
        metaTitle: 'Updated SEO Title',
        metaDescription: 'Updated meta description for better SEO',
        ogImage: 'https://example.com/updated-image.jpg',
      };

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Post updated successfully');
      expect(data).toHaveProperty('post');
      expect(data.post.metaTitle).toBe(updateData.metaTitle);
      expect(data.post.metaDescription).toBe(updateData.metaDescription);
      expect(data.post.ogImage).toBe(updateData.ogImage);

      // Verify post was updated in database
      const updatedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(updatedPost?.metaTitle).toBe(updateData.metaTitle);
      expect(updatedPost?.metaDescription).toBe(updateData.metaDescription);
      expect(updatedPost?.ogImage).toBe(updateData.ogImage);
    });

    it('should update post and clear SEO metadata', async () => {
      // First create a post with SEO metadata
      const post = await prisma.post.create({
        data: {
          title: 'Post with SEO',
          content: '# Content with SEO',
          slug: 'post-with-seo',
          published: false,
          authorId: userId,
          metaTitle: 'Original SEO Title',
          metaDescription: 'Original meta description',
          ogImage: 'https://example.com/original-image.jpg',
        },
      });

      const updateData = {
        title: 'Updated Post without SEO',
        content: '# Updated Content',
        published: true,
        metaTitle: null,
        metaDescription: null,
        ogImage: null,
      };

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Post updated successfully');
      expect(data).toHaveProperty('post');
      expect(data.post.metaTitle).toBeNull();
      expect(data.post.metaDescription).toBeNull();
      expect(data.post.ogImage).toBeNull();
    });

    it('should validate SEO fields on update', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Test Post',
          content: '# Test Content',
          slug: 'test-post',
          published: false,
          authorId: userId,
        },
      });

      const updateData = {
        title: 'Updated Post',
        content: '# Updated Content',
        metaTitle: 'This is a very long meta title that exceeds the 60 character limit and should fail validation',
      };

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete post when user owns it', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Test Post',
          content: '# Test Content',
          slug: 'test-post',
          published: true,
          authorId: userId,
        },
      });

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'Post deleted successfully');

      // Verify post was deleted from database
      const deletedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(deletedPost).toBeNull();
    });

    it('should return error when user does not own post', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          username: 'otheruser',
          password: await bcrypt.hash('Password123', 12),
        },
      });

      const post = await prisma.post.create({
        data: {
          title: 'Other User Post',
          content: '# Other Content',
          slug: 'other-user-post',
          published: true,
          authorId: otherUser.id,
        },
      });

      const response = await fetch(`${baseUrl}/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data: any = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty('error', 'Not authorized to delete this post');
    });

    it('should return 404 for non-existent post', async () => {
      const response = await fetch(`${baseUrl}/posts/non-existent-id`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data: any = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Post not found');
    });
  });

  describe('POST /api/posts/:slug - View Count', () => {
    it('should increment view count when viewing a published post', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Test Post',
          content: '# Test Content',
          slug: 'test-post',
          published: true,
          authorId: userId,
          viewCount: 0,
        },
      });

      expect(post.viewCount).toBe(0);

      const response = await fetch(`${baseUrl}/posts/test-post`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('post');
      expect(data.post.slug).toBe('test-post');

      // Verify view count was incremented
      const updatedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(updatedPost?.viewCount).toBe(1);
      expect(data.post.viewCount).toBe(1);
    });

    it('should return error when trying to view unpublished post', async () => {
      await prisma.post.create({
        data: {
          title: 'Draft Post',
          content: '# Draft Content',
          slug: 'a-new-unpublished-draft-post',
          published: false,
          authorId: userId,
          viewCount: 0,
        },
      });

      const response = await fetch(`${baseUrl}/posts/a-new-unpublished-draft-post`);

      const data: any = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Post not found');
    });

    it('should have initial view count of 0 for new posts', async () => {
      const postData = {
        title: 'New Post',
        content: '# New Content',
        published: false,
      };

      const response = await fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(postData),
      });

      const data: any = await response.json();

      expect(response.status).toBe(201);
      expect(data.post.viewCount).toBe(0);
    });

    it('should include viewCount in post list response', async () => {
      await prisma.post.create({
        data: {
          title: 'Viewed Post',
          content: '# Viewed Content',
          slug: 'viewed-post',
          published: true,
          authorId: userId,
          viewCount: 42,
        },
      });

      const response = await fetch(`${baseUrl}/posts`);

      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts[0]).toHaveProperty('viewCount', 42);
    });
  });
});
