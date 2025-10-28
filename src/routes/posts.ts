import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, generateSlug } from '../utils/auth';
import { validatePost } from '../middleware/validators';
import { handleValidationErrors, asyncHandler } from '../middleware/validation';
import { AuthRequest } from '../utils/auth';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { CACHE_CONFIG } from '../constants/cache';

const router = Router();
const prisma = new PrismaClient();

router.get('/', cacheMiddleware(CACHE_CONFIG.TTL_POSTS_LIST), asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const titleQuery = req.query.title as string;
  const skip = (page - 1) * limit;

  if (titleQuery !== undefined && (!titleQuery || titleQuery.trim().length === 0)) {
    return res.status(400).json({
      error: 'Title search query cannot be empty',
    });
  }

  const whereClause: any = { published: true };
  if (titleQuery && titleQuery.trim()) {
    whereClause.title = {
      contains: titleQuery.trim(),
      mode: 'insensitive'
    };
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  // Get like counts for each post
  const postsWithLikes = await Promise.all(
    posts.map(async (post) => {
      const likeCount = await prisma.postLike.count({
        where: { postId: post.id },
      });
      return {
        ...post,
        likeCount,
      };
    })
  );

  const total = await prisma.post.count({
    where: whereClause,
  });

  return res.json({
    posts: postsWithLikes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// Get all posts for authenticated user (including unpublished)
router.get('/my-posts', authenticateToken, cacheMiddleware(CACHE_CONFIG.TTL_POSTS_LIST), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const posts = await prisma.post.findMany({
    where: { authorId: req.user.id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  // Get like counts for each post
  const postsWithLikes = await Promise.all(
    posts.map(async (post) => {
      const likeCount = await prisma.postLike.count({
        where: { postId: post.id },
      });
      return {
        ...post,
        likeCount,
      };
    })
  );

  const total = await prisma.post.count({
    where: { authorId: req.user.id },
  });

  return res.json({
    posts: postsWithLikes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

// Get single post by slug
router.get('/:slug', cacheMiddleware(CACHE_CONFIG.TTL_POSTS_SINGLE), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!post) {
    return res.status(404).json({
      error: 'Post not found',
    });
  }

  const likeCount = await prisma.postLike.count({
    where: { postId: post.id },
  });

  if (post.published) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
    post.viewCount += 1;
  }

  const postWithLikes = {
    ...post,
    likeCount,
  };

  return res.json({ post: postWithLikes });
}));

router.get('/drafts/:slug', authenticateToken, cacheMiddleware(CACHE_CONFIG.TTL_POSTS_SINGLE), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const post = await prisma.post.findUnique({
    where: { slug, published: false },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!post) {
    return res.status(404).json({
      error: 'Post not found',
    });
  }

  if ((!req.user || req.user.id !== post.authorId)) {
    return res.status(403).json({
      error: 'Not authorized to view this post',
    });
  }

  const likeCount = await prisma.postLike.count({
    where: { postId: post.id },
  });

  const postWithLikes = {
    ...post,
    likeCount,
  };

  return res.json({ post: postWithLikes });
}));

// Create new post
router.post('/', validatePost, authenticateToken, handleValidationErrors, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const { title, content, published = false, categoryId, metaTitle, metaDescription, ogImage } = req.body;
  const slug = generateSlug(title);

  // Check if slug already exists
  const existingPost = await prisma.post.findUnique({
    where: { slug },
  });

  if (existingPost) {
    return res.status(400).json({
      error: 'A post with this title already exists',
    });
  }

  const post = await prisma.post.create({
    data: {
      title,
      content,
      slug,
      published,
      authorId: req.user.id,
      categoryId,
      metaTitle,
      metaDescription,
      ogImage,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
  invalidateCache.invalidateListCaches();
  if (req.user) {
    invalidateCache.invalidateUserCaches(req.user.id);
  }

  return res.status(201).json({
    message: 'Post created successfully',
    post,
  });
}));

// Update post
router.put('/:id', validatePost, authenticateToken, handleValidationErrors, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const { id } = req.params;
  const { title, content, published, categoryId, metaTitle, metaDescription, ogImage } = req.body;

  // Check if post exists and user owns it
  const existingPost = await prisma.post.findUnique({
    where: { id },
  });

  if (!existingPost) {
    return res.status(404).json({
      error: 'Post not found',
    });
  }

  if (existingPost.authorId !== req.user.id) {
    return res.status(403).json({
      error: 'Not authorized to update this post',
    });
  }

  // Generate new slug if title changed
  let slug = existingPost.slug;
  if (title !== existingPost.title) {
    slug = generateSlug(title);

    // Check if new slug already exists
    const slugExists = await prisma.post.findUnique({
      where: { slug },
    });

    if (slugExists && slugExists.id !== id) {
      return res.status(400).json({
        error: 'A post with this title already exists',
      });
    }
  }

  const post = await prisma.post.update({
    where: { id },
    data: {
      title,
      content,
      slug,
      published,
      categoryId,
      metaTitle,
      metaDescription,
      ogImage,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  invalidateCache.invalidateListCaches();
  invalidateCache.invalidatePostCache(post.slug);
  if (req.user) {
    invalidateCache.invalidateUserCaches(req.user.id);
  }

  return res.json({
    message: 'Post updated successfully',
    post,
  });
}));

// Delete post
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  // Check if post exists and user owns it
  const existingPost = await prisma.post.findUnique({
    where: { id },
  });

  if (!existingPost) {
    return res.status(404).json({
      error: 'Post not found',
    });
  }

  if (existingPost.authorId !== req.user.id) {
    return res.status(403).json({
      error: 'Not authorized to delete this post',
    });
  }

  await prisma.post.delete({
    where: { id },
  });

  invalidateCache.invalidateListCaches();
  invalidateCache.invalidatePostCache(existingPost.slug);
  if (req.user) {
    invalidateCache.invalidateUserCaches(req.user.id);
  }

  return res.json({
    message: 'Post deleted successfully',
  });
}));

// Like a post
router.post('/:id/like', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    return res.status(404).json({
      error: 'Post not found',
    });
  }

  // Check if user already liked this post
  const existingLike = await prisma.postLike.findUnique({
    where: {
      userId_postId: {
        userId: req.user.id,
        postId: id,
      },
    },
  });

  if (existingLike) {
    return res.status(400).json({
      error: 'You have already liked this post',
    });
  }

  // Create the like
  await prisma.postLike.create({
    data: {
      userId: req.user.id,
      postId: id,
    },
  });

  // Get updated like count
  const likeCount = await prisma.postLike.count({
    where: { postId: id },
  });

  invalidateCache.invalidateListCaches();
  invalidateCache.invalidatePostCache(post.slug);

  return res.status(201).json({
    message: 'Post liked successfully',
    likeCount,
  });
}));

// Unlike a post
router.delete('/:id/like', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const { id } = req.params;

  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    return res.status(404).json({
      error: 'Post not found',
    });
  }

  // Check if user has liked this post
  const existingLike = await prisma.postLike.findUnique({
    where: {
      userId_postId: {
        userId: req.user.id,
        postId: id,
      },
    },
  });

  if (!existingLike) {
    return res.status(400).json({
      error: 'You have not liked this post',
    });
  }

  // Delete the like
  await prisma.postLike.delete({
    where: {
      userId_postId: {
        userId: req.user.id,
        postId: id,
      },
    },
  });

  // Get updated like count
  const likeCount = await prisma.postLike.count({
    where: { postId: id },
  });

  invalidateCache.invalidateListCaches();
  invalidateCache.invalidatePostCache(post.slug);

  return res.json({
    message: 'Post unliked successfully',
    likeCount,
  });
}));

export default router;
