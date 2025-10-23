import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

router.get('/', asyncHandler(async (req: any, res: Response) => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return res.json({
    categories,
  });
}));

export default router;
