# Blog Backend API

A robust blog backend API built with Express.js, TypeScript, and Prisma. Features user authentication, JWT tokens, and markdown blog post management.

## Features

- 🔐 **User Authentication**: Signup and login with JWT tokens
- 📝 **Blog Posts**: Create, read, update, and delete blog posts
- 📄 **Markdown Support**: Store blog content as markdown strings
- 🛡️ **Security**: Password hashing, input validation, and CORS protection
- 🧪 **Testing**: Comprehensive unit tests with Jest
- 📊 **Database**: PostgreSQL with Prisma ORM
- 🚀 **TypeScript**: Full type safety and modern JavaScript features

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Blog Posts
- `GET /api/posts` - Get all published posts (public)
- `GET /api/posts/my-posts` - Get user's posts (authenticated)
- `GET /api/posts/:slug` - Get single post by slug
- `POST /api/posts` - Create new post (authenticated)
- `PUT /api/posts/:id` - Update post (authenticated, owner only)
- `DELETE /api/posts/:id` - Delete post (authenticated, owner only)

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   yarn install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your database URL and JWT secret:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/blog_db?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="7d"
   PORT=3000
   NODE_ENV="development"
   ```

3. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Apply schema to database
   npm run db:migrate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Database Setup

The application uses PostgreSQL with Prisma ORM. Make sure you have PostgreSQL running and create a database for the application.

### Running Tests

The tests use a real Express server with a test database for integration testing.

```bash
# Start test database and run tests
npm run setup:test
npm run test

# Run tests in watch mode
npm run test:watch

```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRES_IN` | JWT token expiration time | `7d` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

