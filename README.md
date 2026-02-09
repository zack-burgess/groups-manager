# Groups Manager

A groups management app for employees at a company. Users can log in, view profiles, create and manage groups, and search for people and groups.

Shaped and vibe-coded by [Zack Burgess](https://github.com/zack-burgess) and [Claude](https://claude.ai)

This project was shaped using [breadboarding](https://basecamp.com/shapeup/1.3-chapter-04) from Shape Up. The full design — including all flows, places, affordances, and UI sketches — is documented in [DESIGN.md](./DESIGN.md).

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Setup

1. Clone the repo and install dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

2. Create a `.env` file in `/server` (see `.env.example`):
   ```
   ADMIN_EMAIL=your@email.com
   ADMIN_PASSWORD=yourpassword
   JWT_SECRET=a-random-secret
   DATABASE_URL="file:./dev.db"
   ```

3. Run the database migration:
   ```bash
   cd server && npx prisma migrate dev
   ```

4. Start the backend:
   ```bash
   cd server && npx tsx src/index.ts
   ```

5. Start the frontend (in a separate terminal):
   ```bash
   cd client && npm run dev
   ```

6. Open http://localhost:5173

### Seed Data

On startup, the server seeds:
- Zack Burgess (admin, password required) — configured via `.env`
- Jane Smith (jane.smith@company.com) — sample user, no password needed
- An R&D group with both Zack and Jane as members

New users who sign up are automatically added to the R&D group.

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite + Prisma ORM
- **Auth:** JWT (localStorage)
