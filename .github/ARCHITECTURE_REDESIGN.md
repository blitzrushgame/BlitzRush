# BlitzRush: Event-Driven Architecture for 10k MAU

## Your Target at Release

- **10,000 monthly active users**
- **500 concurrent users at peak**
- **Instant actions**: Troops move, attack, upgrade immediately (not batched)
- **No waiting**: Player expectations = RTS game (StarCraft/Age of Empires instant feedback)

Your current architecture **CANNOT support this**. Here's why and how to fix it.

---

## Problem: Current Tick-Based Design

```
Every 60 seconds:
  - Process all players sequentially
  - Update troop positions
  - Apply damage from queued attacks
  - Generate resources
  
Problem: If player A attacks player B, it takes up to 60 seconds to see the result.
```

This breaks user expectations for an RTS game.

---

## Solution: Event-Driven Architecture

Instead of batch processing, **handle game events immediately**:

```
Player Action → Validate → Update DB → Broadcast to affected players (instant)

Player A attacks Player B:
  1. Player A sends attack request (NOW)
  2. Server validates (range, health, etc.)
  3. Combat resolved immediately
  4. Player B sees unit dying in real-time
  5. Combat log saved
  6. Alliance members see news feed update

Elapsed time: 50-200ms (not 60 seconds)
```

---

## What Needs to Change

### 1. Combat System ✅ ALREADY EVENT-DRIVEN

Your `/api/game/combat/attack-unit` endpoint is correct! 
- Resolves immediately
- Updates database
- Broadcasts via Realtime

**Status**: Good. Keep this pattern.

---

### 2. Troop Movement ❌ NEEDS REDESIGN

**Current**: 
- Player clicks "move" 
- Troop position updates via game tick (~60 second delay)
- Client predicts position locally (desyncs if attacked)

**Problem**: 
- Position becomes out-of-sync if attacked mid-movement
- Speed hacking vulnerable (client controls position)
- No validation of path/collision

**Better approach** (Server-authoritative with client prediction):
```
Player clicks target:
  1. Client calculates path locally (for UX smoothness)
  2. Client sends: POST /api/units/move { unitId, targetX, targetY, arrivalTime }
  3. Server validates:
     - Does unit exist?
     - Is target in range based on speed?
     - Is path clear? (collision check)
     - Update DB with target position + ETA
  4. Supabase Realtime broadcasts { unitId, x, y, targetX, targetY, arrivalTime }
  5. All clients interpolate smoothly to target
  6. Server auto-validates arrival with separate logic

Elapsed time: 100-300ms for server confirmation
```

---

### 3. Resource Generation ❌ NEEDS REDESIGN

**Current**:
- Every 5 seconds, client pings `/api/game/resources/generate`
- Cron job applies production hourly via game tick
- Resources feel "laggy" - update every hour in batch

**Problem**:
- Resource updates not instant
- Cron job processes everyone at once (CPU spike)
- Can't show real-time production rate

**Better approach** (Continuous production with batch DB updates):
```
Option A: Streamed production (best UX)
  1. Client calculates production rate based on buildings
  2. Client renders resources increasing in real-time
  3. Every 30 seconds, sync with server
  4. Server validates production (no cheating), applies any corrections
  
Option B: Event-driven (simpler)
  1. When building completes/levels up, trigger production recalculation
  2. Every 60 seconds, apply production in batch (but with stricter validation)
  3. Show "pending resources" vs "confirmed resources" in UI

Recommendation: Option A (looks better, more game-like)
```

---

### 4. Building Construction ❌ NEEDS REDESIGN

**Current**:
- Player starts building
- Game tick completes it after timer expires
- Player doesn't see instant feedback

**Better approach**:
```
Player clicks "Build Factory":
  1. Deduct resources immediately
  2. Building placed with construction_status = 'in_progress'
  3. Store: construction_started_at, construction_duration
  4. Broadcast to all players in area
  5. Client renders construction progress bar
  6. When timer expires:
     - Server validates timer wasn't cheated
     - Mark construction_status = 'complete'
     - Broadcast completion to area
     - Increment building count for production calculations

Elapsed time: 50ms for placement, real-time progress bar
```

---

### 5. Game Tick System ❌ OPTIONAL (CAN BE REMOVED)

**Current purpose**:
- Resource generation
- Building completion
- Unit training completion
- Unit movement updates

**New purpose** (if kept):
- Validation/anti-cheat verification
- Clean-up deleted units/buildings
- Aggregate analytics
- Despawn home bases if inactive

**Recommendation**: Keep it running every 5 minutes for validation, not every minute.

---

## Data Model Changes Required

### Current: user_game_states (JSONB)
```typescript
game_data: {
  tanks: [],
  base: { x, y, health, ... },
  camera: { x, y, zoom },
  lastSaved: timestamp
}
```

### New: Separate Event Stream

Add tables for **immutable events**:

```sql
CREATE TABLE game_events (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  world_id INT,
  event_type TEXT, -- 'troop_attack', 'building_started', 'troop_moved'
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_world_event (world_id, created_at)
);

CREATE TABLE building_progress (
  id SERIAL PRIMARY KEY,
  user_id INT,
  world_id INT,
  x INT, y INT,
  building_type TEXT,
  construction_started_at TIMESTAMP,
  construction_duration_ms INT,
  status TEXT, -- 'in_progress', 'complete'
  INDEX idx_building_user_world (user_id, world_id)
);

CREATE TABLE unit_movement (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id),
  target_x INT,
  target_y INT,
  departure_time TIMESTAMP,
  eta_arrival_time TIMESTAMP,
  INDEX idx_unit_movement_eta (eta_arrival_time)
);
```

### Keep: user_game_states (for snapshot, not events)

Use JSONB for final state snapshot (current resources, unit counts), updated less frequently (every 5 minutes).

---

## WebSocket vs Polling

Your current setup polls `/api/game/resources/generate` every 5 seconds.

**For 500 concurrent users:**
- 500 users × 12 requests/minute = 6,000 requests/minute = 100 requests/second
- Adds latency to action responses
- Supabase Realtime (WebSocket) is faster

**Recommendation**: 
- Keep HTTP for game actions (attack, build, move)
- Use Supabase Realtime for **broadcasting results** to all players in area
- Real-time resource generation calculations done client-side, validated on server periodically

---

## New Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                                                                   │
│  - Predicts unit positions (smooth interpolation)               │
│  - Calculates production rates locally (shows pending)          │
│  - Detects out-of-range clicks (prevents invalid requests)    │
│  - Subscribes to Realtime for all events                       │
└────────────────┬────────────────────────────────────┬───────────┘
                 │                                    │
            HTTP API                            WebSocket
         (game actions)                      (broadcasts)
                 │                                    │
                 ▼                                    ▼
        ┌──────────────────┐                ┌──────────────────┐
        │  Next.js Handlers│                │ Supabase Realtime│
        │  - Validate      │                │ Channels:        │
        │  - Update DB     │───────────────▶│ - world-X        │
        │  - Log event     │                │ - user-X-alerts  │
        └────────┬─────────┘                │ - alliance-X     │
                 │                          └──────────────────┘
                 ▼
        ┌──────────────────────┐
        │  PostgreSQL Database │
        │  ├─ units           │ (position, target, ETA)
        │  ├─ buildings       │ (type, level, progress)
        │  ├─ game_events     │ (immutable log)
        │  ├─ combat_logs     │
        │  └─ game_worlds     │
        └──────────────────────┘

Game Tick (every 5 min):
  - Anti-cheat validation
  - Cleanup dead units
  - Backup snapshot to user_game_states
```

---

## Implementation Priority

### Phase 1 (MVP - Instant Feedback)
1. **Unit movement** with server-side position validation
   - Client predicts locally
   - Server validates ETA on regular checks
2. **Combat** already works, keep it
3. **Building construction** with instant placement feedback
4. Keep cron job running (safety net)

### Phase 2 (Optimization)
1. Move resource generation to client-side calculations
2. Server validates production rates periodically (not every tick)
3. Add anti-cheat event logging
4. Reduce cron job to 5-minute cleanup

### Phase 3 (Scale to 10k MAU)
1. Add Redis cache for:
   - Unit positions (leaderboards, area queries)
   - Building stats (read-heavy)
   - Cached production rates
2. Database read replicas for leaderboards/stats
3. Message queue for non-critical events (analytics, notifications)

---

## Performance Targets

| Action | Current | Target | How |
|--------|---------|--------|-----|
| Unit attack | 50-200ms | 50-100ms | Already instant ✅ |
| Unit movement feedback | 60s (waits for tick) | 100ms (server confirm) | New endpoint with validation |
| Building start | 60s | 50ms | Event-driven |
| Resource update UI | 60s | 1s (client predicts) | Client-side math, validated 5m |
| Troop arrives at target | 60s batched | Exact (validated on ETA) | Server runs validation when ETA reached |

---

## Database Load Comparison

### Current (500 concurrent, 60-second tick)

```
Game Tick (1x/minute):
  - 10k users × 1 query = 10k queries
  - 50k units × position updates = 50k queries
  - Total: ~100k queries/minute = 1,666 queries/second

Peak: ~1,666 QPS
```

### New Event-Driven (500 concurrent)

```
Constant operations (spread evenly):
  - Combat: ~10 attacks/second (100 QPS)
  - Movement: ~20 units arriving/second (20 QPS)
  - Construction: ~5 buildings completing/second (5 QPS)
  - Resource validation: 50 users validating/second (50 QPS)
  - Game Tick (5 min): ~200 QPS

Peak: ~500 QPS (constant, never spikes)
```

**Result**: 3-4x fewer queries, spread evenly (no spikes = better stability).

---

## What Breaks First at 10k MAU?

1. **Current system**: Cron job takes > 60s (tick cascades fail)
2. **New system**: Database write locks on units/buildings table (needs sharding)
3. **Realtime broadcasts**: > 500 concurrent subscriptions without plan upgrade

---

## TL;DR - Your Action Items

✅ **Combat**: Already correct, keep it.

❌ **Movement**: Need server-authoritative position validation.

❌ **Resources**: Need client-side prediction + periodic server validation.

❌ **Building**: Need instant placement feedback instead of 60s wait.

⚠️ **Cron Job**: Keep for anti-cheat, reduce to 5-minute intervals.

**Recommendation**: Start with Movement + Building fixes before launch. Combat and Resources can follow in patches.

---

## Your Specific Architecture Requirements

✅ **Buildings**: All players see every building on map (persistent world).

✅ **Fog of War System** (future, but design for it now):
- Allied players in same alliance share vision of areas
- Fog-covered bases show only:
  - Minimap icon (base exists)
  - Generic "Enemy base hidden in fog" PNG
  - No building details visible
- Non-fogged bases show full details to all players

✅ **Unit Movement Desync**: OK for movement interpolation to differ client-side, but must sync exactly when movement completes. Players see smooth local interpolation, server has authoritative final position.

**Not required**: No collision detection between units. No replay system needed.
