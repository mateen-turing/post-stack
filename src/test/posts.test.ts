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
});
