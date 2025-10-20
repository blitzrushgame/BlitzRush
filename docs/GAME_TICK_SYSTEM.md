# Game Tick System

The game tick system is a background process that runs every minute to handle passive game updates.

## What it does

### 1. Resource Production
- Applies resource production for all players based on their buildings
- Respects storage capacity limits
- Only processes players who haven't been updated in the last hour (optimization)

### 2. Building Construction/Upgrades
- Checks all buildings with active production queues
- Completes construction when timer expires (sets health to max)
- Completes upgrades when timer expires (increases level)
- Removes completed items from production queue

### 3. Unit Training
- Spawns completed units near their training building
- Removes completed training from building production queue
- Sets proper stats based on unit type

### 4. Unit Movement
- Updates positions of all moving units
- Calculates new position based on movement speed and time elapsed
- Stops units when they reach their target
- Prevents speed hacking by validating movement distance

## Setup

### Vercel Cron Job
The system uses Vercel Cron Jobs to run every minute. Configuration is in `vercel.json`:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/game-tick",
      "schedule": "* * * * *"
    }
  ]
}
\`\`\`

### Environment Variables
Add `CRON_SECRET` to your environment variables for security:
\`\`\`
CRON_SECRET=your-random-secret-here
\`\`\`

### Manual Trigger (Testing)
For testing, you can manually trigger a game tick:
\`\`\`bash
POST /api/game/tick/manual
\`\`\`

This endpoint requires authentication and should be removed or protected in production.

## Performance Considerations

- Resource production only processes inactive players (not updated in last hour)
- Building production only processes buildings with active queues
- Unit movement only processes moving units
- All operations use database indexes for efficient queries

## Future Improvements

- Add rate limiting to prevent abuse
- Implement batch processing for large player bases
- Add monitoring and alerting for failed ticks
- Consider using a dedicated job queue for scalability
