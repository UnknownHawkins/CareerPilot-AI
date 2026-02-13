# CareerPilot AI

A comprehensive AI-powered career platform built with Next.js, Node.js, Express, MongoDB, and Google Gemini AI.

## Features

- **Resume Analyzer**: Upload PDF/DOCX files and get ATS scores with detailed feedback
- **AI Mock Interviews**: Practice with AI-generated questions and receive feedback
- **LinkedIn Profile Review**: Optimize your profile for better visibility
- **Job Matching System**: Compare your skills with job roles and get match percentages
- **Skill Gap Detection**: Generate personalized career roadmaps with learning paths

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (State Management)
- React Query
- shadcn/ui components

### Backend
- Node.js
- Express.js
- TypeScript
- MongoDB (Mongoose)
- JWT Authentication
- Google Gemini AI API
- Firebase Storage
- Stripe/Razorpay Payments

## Project Structure

```
careerpilot-ai/
├── backend/
│   ├── src/
│   │   ├── config/         # Database, Firebase, Gemini, Stripe config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth, rate limiting, error handling
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic & AI integration
│   │   ├── utils/          # Utilities & validators
│   │   └── server.ts       # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/                # Next.js app router pages
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities & API client
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript types
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Firebase project
- Google Gemini API key
- Stripe account (optional)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/careerpilot_ai
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_STORAGE_BUCKET=your_bucket
STRIPE_SECRET_KEY=your_stripe_key
```

5. Start the development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

4. Update the environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/profile` - Update profile

### Resume
- `POST /api/v1/resume/upload` - Upload and analyze resume
- `GET /api/v1/resume` - Get user's analyses
- `GET /api/v1/resume/:id` - Get analysis by ID
- `POST /api/v1/resume/:id/reanalyze` - Reanalyze resume

### Interview
- `POST /api/v1/interview` - Create interview session
- `GET /api/v1/interview` - Get user's sessions
- `POST /api/v1/interview/:id/answer` - Submit answer
- `POST /api/v1/interview/:id/complete` - Complete session

### LinkedIn
- `POST /api/v1/linkedin/analyze` - Analyze LinkedIn profile
- `POST /api/v1/linkedin/suggestions/headline` - Generate headline suggestions

### Roadmap
- `POST /api/v1/roadmap` - Create career roadmap
- `GET /api/v1/roadmap` - Get user's roadmaps
- `POST /api/v1/roadmap/:id/milestones/:milestoneId/complete` - Complete milestone

### Job Matches
- `POST /api/v1/jobs` - Create job match
- `GET /api/v1/jobs` - Get user's job matches
- `PUT /api/v1/jobs/:id/status` - Update application status

### Subscription
- `GET /api/v1/subscription/plans` - Get pricing plans
- `POST /api/v1/subscription` - Create subscription
- `POST /api/v1/subscription/cancel` - Cancel subscription

## User Roles

### Free Tier
- 3 resume analyses per month
- 1 mock interview session (3 questions)
- Basic LinkedIn review
- 1 active career roadmap

### Pro Tier
- Unlimited resume analyses
- Unlimited mock interviews
- Advanced LinkedIn optimization
- 3 active career roadmaps
- Weekly job recommendations
- Priority support

## Security Features

- JWT authentication with refresh tokens
- Role-based access control
- Rate limiting
- Input validation
- Helmet security headers
- CORS configuration
- Password hashing with bcrypt

## License

MIT License
