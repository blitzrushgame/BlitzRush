# BlitzRush

The git repository for BlitzRush

## Project Structure

### Core Directories

- **app/** - Next.js App Router pages and API routes
  - **alliance/** - Alliance management pages
  - **game/** - Main game page
  - **profile/** - User profile page
  - **api/** - API routes
    - **alliance/** - Alliance operations
    - **auth/** - Authentication
    - **chat/** - Chat system
    - **game/** - Game mechanics
    - **profile/** - User profiles

- **components/** - React components
  - **game/** - Game-specific components
    - `canvas.tsx` - Main game canvas
    - `minimap.tsx` - Minimap display
    - **menus/** - Game menus
      - `base-management.tsx` - Base building UI
      - `main-menu.tsx` - Main menu overlay
  - **alliance/** - Alliance-related components
  - **chat/** - Chat components
  - **ui/** - Reusable UI components (shadcn/ui)

- **lib/** - Utility libraries
  - **game/** - Game logic & constants
    - `constants.ts` - Core game settings
    - `building-constants.ts` - Building definitions
    - `unit-constants.ts` - Unit definitions
    - `combat-utils.ts` - Combat calculations
    - `movement-utils.ts` - Unit movement
    - `resource-constants.ts` - Resource settings
  - **auth/** - Authentication utilities
  - **supabase/** - Database client configuration
  - **types/** - TypeScript type definitions

- **hooks/** - Custom React hooks
  - `use-game-realtime.ts` - Real-time game updates
  - `use-buildings.ts` - Building management
  - `use-units.ts` - Unit management
  - `use-combat.ts` - Combat system
  - `use-home-base.ts` - Home base state
  - `use-unit-movement.ts` - Unit movement

- **scripts/** - Database migration scripts
  - `*.sql` - SQL migration files (numbered sequentially)

- **public/** - Static assets
  - **images/** - Game sprites and images

- **admin-panel/** - Admin panel (separate deployment)


## Contributers

Mynx
Schousboe

Ellie
