# BlitzRush Admin Panel

Standalone admin panel for managing the BlitzRush game.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Create a `.env.local` file with your Supabase credentials:
\`\`\`
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel as a separate project:

1. Push this `admin-panel` folder to a GitHub repository
2. Create a new Vercel project
3. Connect it to your GitHub repo
4. Add the environment variables in Vercel dashboard
5. Deploy!

Your admin panel will be available at `your-project-admin.vercel.app`

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `ADMIN_USERNAME` - Admin login username
- `ADMIN_PASSWORD` - Admin login password
\`\`\`

```plaintext file="admin-panel/.gitignore"
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
