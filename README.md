# BlitzRush - Real-Time Strategy Game

A browser-based real-time strategy game built with Next.js, featuring base building, unit management, alliances, and real-time combat.

## 📁 Project Structure

\`\`\`
├── app/                          # Next.js App Router pages
│   ├── alliance/                 # Alliance management pages
│   ├── api/                      # API routes
│   │   ├── alliance/            # Alliance operations
│   │   ├── auth/                # Authentication
│   │   ├── chat/                # Chat system
│   │   ├── game/                # Game mechanics
│   │   └── profile/             # User profiles
│   ├── game/                    # Main game page
│   └── profile/                 # User profile page
│
├── components/                   # React components
│   ├── alliance/                # Alliance-related components
│   ├── chat/                    # Chat components
│   ├── game/                    # Game components
│   │   ├── canvas.tsx           # Main game canvas
│   │   ├── minimap.tsx          # Minimap display
│   │   └── menus/               # Game menus
│   └── ui/                      # Reusable UI components (shadcn/ui)
│
├── lib/                         # Utility libraries
│   ├── auth/                    # Authentication utilities
│   ├── game/                    # Game logic and constants
│   │   ├── building-constants.ts
│   │   ├── combat-utils.ts
│   │   ├── constants.ts
│   │   ├── movement-utils.ts
│   │   ├── resource-constants.ts
│   │   └── unit-constants.ts
│   ├── supabase/                # Supabase client configurations
│   └── types/                   # TypeScript type definitions
│
├── hooks/                       # Custom React hooks
│   ├── use-buildings.ts         # Building management
│   ├── use-combat.ts            # Combat system
│   ├── use-game-realtime.ts     # Real-time game updates
│   ├── use-home-base.ts         # Home base management
│   ├── use-units.ts             # Unit management
│   └── use-unit-movement.ts     # Unit movement
│
├── scripts/                     # Database migration scripts
│   └── *.sql                    # SQL migration files
│
├── public/                      # Static assets
│   └── images/                  # Game images and sprites
│
└── admin-panel/                 # Separate admin panel (deploy independently)
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   pnpm install
   \`\`\`

3. Set up environment variables (see Supabase integration in v0)

4. Run database migrations from the `scripts/` folder

5. Start the development server:
   \`\`\`bash
   pnpm dev
   \`\`\`

## 🎮 Game Features

- **Base Building**: Construct and upgrade buildings
- **Unit Management**: Train and command military units
- **Real-Time Combat**: Attack other players and defend your base
- **Alliance System**: Form alliances with other players
- **Chat System**: Global and alliance chat
- **Resource Management**: Gather and manage resources
- **Minimap**: Navigate the game world

## 🗂️ Key Files for Beginners

### Pages
- `app/page.tsx` - Landing/login page
- `app/game/page.tsx` - Main game interface
- `app/alliance/page.tsx` - Alliance management

### Game Components
- `components/game/canvas.tsx` - Main game canvas with all game logic
- `components/game/minimap.tsx` - Minimap component
- `components/game/menus/base-management.tsx` - Base building menu
- `components/game/menus/main-menu.tsx` - Main game menu overlay

### Game Logic
- `lib/game/constants.ts` - Core game constants
- `lib/game/building-constants.ts` - Building definitions
- `lib/game/unit-constants.ts` - Unit definitions
- `lib/game/combat-utils.ts` - Combat calculations

### Hooks
- `hooks/use-game-realtime.ts` - Real-time game state updates
- `hooks/use-buildings.ts` - Building operations
- `hooks/use-units.ts` - Unit operations

## 🔧 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Real-time**: Supabase Realtime

## 📦 Admin Panel

The admin panel is located in the `admin-panel/` directory and should be deployed as a separate Vercel project. See `admin-panel/README.md` for details.

## 🤝 Contributing

This codebase is organized for easy navigation:
- All game logic is in `lib/game/`
- All game components are in `components/game/`
- All API routes follow RESTful patterns in `app/api/`
- Database migrations are numbered sequentially in `scripts/`

## 📝 License

[Your License Here]
