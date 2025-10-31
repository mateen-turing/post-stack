import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

router.get('/', asyncHandler(async (req: any, res: Response) => {
  const searchQuery = req.query.search as string;

  const whereClause: any = {};

  if (searchQuery && searchQuery.trim()) {
    whereClause.name = {
      contains: searchQuery.trim(),
      mode: 'insensitive',
    };
  }

  const tags = await prisma.tag.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return res.json({
    tags,
  });
}));

export default router;

