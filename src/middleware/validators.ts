import { body } from "express-validator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const validateSignup = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("username")
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username must be 3-30 characters and contain only letters, numbers, and underscores"
    ),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must be at least 8 characters with uppercase, lowercase, and number"
    ),
];

export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const validatePost = [
  body("title")
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),
  body("content").isLength({ min: 1 }).withMessage("Content is required"),
  body("published")
    .optional()
    .isBoolean()
    .withMessage("Published must be a boolean"),
  body("featured")
    .optional()
    .isBoolean()
    .withMessage("Featured must be a boolean"),
  body("categoryId")
    .optional()
    .custom(async (value) => {
      if (value !== null && value !== undefined) {
        if (typeof value !== "string") {
          throw new Error("Category ID must be a string");
        }
        const category = await prisma.category.findUnique({
          where: { id: value },
        });
        if (!category) {
          throw new Error("Category not found");
        }
      }
      return true;
    }),
  body("metaTitle")
    .optional()
    .isLength({ max: 60 })
    .withMessage("Meta title must be 60 characters or less"),
  body("metaDescription")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Meta description must be 160 characters or less"),
  body("ogImage")
    .optional({ nullable: true })
    .isURL()
    .withMessage("OG image must be a valid URL"),
];
