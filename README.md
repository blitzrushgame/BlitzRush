# BlitzRush - Real-Time Strategy Game

A browser-based real-time strategy game built with Next.js, featuring base building, unit management, alliances, and real-time combat.

## 📁 Project Structure

\`\`\`
BlitzRush/
│
├── app/                                    # Next.js App Router
│   ├── alliance/                          # Alliance management pages
│   ├── game/                              # Main game page
│   ├── profile/                           # User profile page
│   └── api/                               # API routes
│       ├── alliance/                      # Alliance operations
│       ├── auth/                          # Authentication
│       ├── chat/                          # Chat system
│       ├── game/                          # Game mechanics
│       └── profile/                       # User profiles
│
├── components/                             # React components
│   ├── game/                              # Game-specific components
│   │   ├── canvas.tsx                     # Main game canvas
│   │   ├── minimap.tsx                    # Minimap display
│   │   └── menus/                         # Game menus
│   │       ├── base-management.tsx        # Base building UI
│   │       └── main-menu.tsx              # Main menu overlay
│   ├── alliance/                          # Alliance components
│   ├── chat/                              # Chat components
│   └── ui/                                # Reusable UI (shadcn/ui)
│
├── lib/                                    # Utility libraries
│   ├── game/                              # Game logic & constants
│   │   ├── constants.ts                   # Core game settings
│   │   ├── building-constants.ts          # Building definitions
│   │   ├── unit-constants.ts              # Unit definitions
│   │   ├── combat-utils.ts                # Combat calculations
│   │   ├── movement-utils.ts              # Unit movement
│   │   └── resource-constants.ts          # Resource settings
│   ├── auth/                              # Authentication utilities
│   ├── supabase/                          # Database client config
│   └── types/                             # TypeScript definitions
│
├── hooks/                                  # Custom React hooks
│   ├── use-game-realtime.ts               # Real-time updates
│   ├── use-buildings.ts                   # Building management
│   ├── use-units.ts                       # Unit management
│   ├── use-combat.ts                      # Combat system
│   ├── use-home-base.ts                   # Home base state
│   └── use-unit-movement.ts               # Unit movement
│
├── scripts/                                # Database migrations
│   └── *.sql                              # SQL migration files
│
├── public/                                 # Static assets
│   └── images/                            # Game sprites & images
│
└── admin-panel/                            # Admin panel (separate deploy)
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
