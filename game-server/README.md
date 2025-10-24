# RTS Game Server

Real-time game server for the RTS browser game. Runs at 20 ticks/second with WebSocket connections for zero-latency gameplay.

## Features

- **Server-Authoritative**: All game logic runs server-side
- **Real-time**: 20 ticks/second game loop (50ms intervals)
- **WebSocket**: Socket.io for bidirectional communication
- **Scalable**: Designed for Fly.io deployment

## Development

\`\`\`bash
cd game-server
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
\`\`\`

Server runs on http://localhost:8080

## Deployment to Fly.io

1. Install Fly CLI:
\`\`\`bash
curl -L https://fly.io/install.sh | sh
\`\`\`

2. Login to Fly:
\`\`\`bash
fly auth login
\`\`\`

3. Create app (first time only):
\`\`\`bash
cd game-server
fly launch
\`\`\`

4. Set environment variables:
\`\`\`bash
fly secrets set SUPABASE_URL=your_url
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
fly secrets set CLIENT_URL=https://your-vercel-app.vercel.app
\`\`\`

5. Deploy:
\`\`\`bash
fly deploy
\`\`\`

6. Check status:
\`\`\`bash
fly status
fly logs
\`\`\`

## Architecture

- **Express**: HTTP server for health checks
- **Socket.io**: WebSocket connections for real-time gameplay
- **Game Loop**: Runs at 20 ticks/second
- **Supabase**: Persistent storage for game state

## API Events

### Client → Server
- `auth`: Authenticate player
- `move_unit`: Move a unit
- `attack_unit`: Attack another unit
- `attack_building`: Attack a building
- `spawn_unit`: Spawn a new unit
- `construct_building`: Build a structure
- `upgrade_building`: Upgrade a building

### Server → Client
- `initial_state`: Initial game state on connect
- `unit_moved`: Unit position updated
- `combat_event`: Combat occurred
- `unit_spawned`: New unit created
- `building_constructed`: New building created
- `building_upgraded`: Building level increased
- `resources_updated`: Resource amounts changed
- `action_failed`: Command validation failed
