# Midnight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Midnight is your ultimate destination for free novels, manga, and anime. Discover thousands of stories from independent creators, build your reading list, and enjoy high-quality content without any cost.

## Features

- **Read Novels**: Immerse yourself in captivating web novels and light novels.
- **Browse Manga**: Explore a vast collection of manga and manhwa.
- **Watch Anime**: Stream anime episodes for free.
- **User Authentication**: Secure login and profile management.
- **Creator Dashboard**: Upload and manage your own content.
- **Admin Panel**: Moderate content, manage users, and handle reports.
- **Responsive Design**: Optimized for desktop and mobile devices.
- **Real-time Notifications**: Stay updated with new content and interactions.

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript**
- **Supabase** for database and authentication
- **Zod** for validation
- **Puppeteer** for web scraping (if applicable)

### Frontend
- **React** with **Vite**
- **TypeScript**
- **Tailwind CSS** for styling
- **Radix UI** for components
- **React Router** for navigation
- **Supabase** client for API interactions

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or bun (for frontend)
- Supabase account (for database setup)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. Run database migrations (if using local Supabase):
   ```bash
   npx supabase db reset
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
   bun install
   # or npm install
   ```

3. Create a `.env` file in the frontend directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   bun run dev
   # or npm run dev
   ```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3000` (or as configured).

## Usage

1. Open your browser and go to `http://localhost:5173`.
2. Sign up or log in to access the platform.
3. Browse content, create reading lists, and enjoy!

### Admin Features
- Access the admin panel at `/admin` (requires admin privileges).
- Manage users, content, and reports.

### Creator Features
- Access the creator dashboard at `/creator` to upload and manage your stories.

Please ensure your code follows our linting rules and includes tests where applicable.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.