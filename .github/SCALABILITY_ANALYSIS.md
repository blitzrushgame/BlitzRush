# BlitzRush Scalability Analysis

## Current Architecture Overview

You're using:
- **Backend**: Next.js on Vercel (serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (WebSocket-based)
- **Background Jobs**: Vercel Cron (runs every 1 minute)

---

## How Many Players Can We Support?

**Rough estimate: 500-2,000 concurrent players** with current setup before hitting limits.

Here's why:

### 1. **Game Tick System (Biggest Bottleneck)**

Every minute, the cron job:
- Fetches all inactive players (not updated in last hour)
- Applies resource production to each
- Processes building queues
- Updates unit movement

**Current implementation**: Loops through each player/building/unit sequentially.

**Scaling issue**: If you have 10,000 total players:
- Fetching + processing takes ~10-30 seconds per tick
- ✅ Still fits in 1-minute window, BUT no margin for error

**Real limit**: With complex queries, you hit database CPU limits around 5,000-10,000 concurrent players.

### 2. **Resource Generation Endpoint (Every 5 Seconds)**

Each player calls `/api/game/resources/generate` every 5 seconds.

**Rate limits built in**:
- 429 response if called < 5 seconds apart
- No global rate limiting across players

**Scaling issue**: 
- 1,000 players = ~200 API calls/second
- Vercel can handle this, but DB becomes bottleneck

### 3. **Supabase Connection Pool**

Supabase free tier has:
- **Max connections**: ~50-100 (varies by plan)
- **Each Next.js function gets 1-3 connections**

**Current implementation**: Creates new client per request (correct approach).

**Scaling issue**: At 200 concurrent API requests, you'd need enterprise tier.

### 4. **Supabase Realtime Subscriptions**

Each player subscribed to `game-world-{worldId}` channel.

**Scaling issue**:
- Free tier: ~100 concurrent subscriptions
- Pro tier: ~1,000 concurrent subscriptions
- Enterprise: Unlimited

**Current setup**: You're on the Pro plan likely, so ~1,000 is your real ceiling.

### 5. **Chat System**

Global chat has 3-second message cooldown.
Alliance chat has 3-second message cooldown.

**Not a bottleneck** for player count, but impacts feel at scale (less frequent chat).

---

## Bottleneck Hierarchy (What Breaks First)

| Players | Bottleneck | Problem |
|---------|-----------|---------|
| **500** | None | Sweet spot |
| **1,000** | Realtime subscriptions (Supabase plan limit) | New players can't subscribe |
| **2,000** | Game tick duration (> 60 seconds) | Production falls behind |
| **5,000** | DB connection pool + CPU | Queries time out, cron fails |
| **10,000+** | Supabase database tier | Hits plan limits |

---

## What's Working Well

✅ **Database schema**: Properly indexed, good use of JSONB for game state
✅ **API architecture**: Sensible error handling, rate limiting on sensitive endpoints
✅ **Real-time updates**: Using Supabase correctly, not polling
✅ **Cron system**: Background jobs properly secured with bearer token

---

## What Needs Attention Before Scaling

### High Priority (limits growth to 1,000 players)

1. **Game Tick Optimization** (CRITICAL)
   - Current: Sequential processing of all players
   - Better: Batch updates, parallel processing
   - Example: Instead of `for (user of users)`, use `INSERT ... SELECT` bulk operations
   - **Potential gain**: 10x faster, supports 10,000 players

2. **Supabase Plan Upgrade**
   - Free → Pro: $25/month, unlocks Realtime (1,000 subscriptions)
   - Pro → Team/Enterprise: Higher connection limits

3. **Connection Pooling**
   - Currently: No explicit pooling, relying on Supabase's managed pool
   - Better: Add PgBouncer middleware (Supabase can do this)
   - **Potential gain**: 3x more connections

### Medium Priority (limits growth to 5,000 players)

4. **Cache Layer**
   - Add Redis (Vercel KV) for:
     - Player positions (update less frequently)
     - Building stats (static)
     - Leaderboards (computed periodically)
   - **Potential gain**: 50% fewer DB queries

5. **Game Tick Parallelization**
   - Split by world ID instead of sequential
   - Run multiple cron jobs (need custom solution, Vercel only has 1)
   - **Potential gain**: Limited without custom job queue

### Lower Priority (nice to have)

6. **Message Queue for Events**
   - Currently: Supabase Realtime broadcasts directly
   - Better: Queue system (Bull, BullMQ) for guaranteed delivery
   - **Benefit**: Resilience, not performance

7. **CDN for Static Assets**
   - Grass textures, sprites load from edge
   - **Benefit**: Faster client startup, not player count

---

## What's Preventing Larger Scale

### Architectural Limits

**Single World Design**: 
- All 1,000 players on same "world" = all see each other
- If you split into multiple worlds, scales linearly
- World 1: 500 players, World 2: 500 players = 1,000 total players supported

**Supabase as Single Database**:
- Doesn't horizontally shard
- At 10,000 players: Need database replication (expensive)
- Alternative: Multiple Supabase projects per shard

**Vercel Cron Job (1 per project)**:
- Single cron handler processes all players
- Can't parallelize easily
- Alternative: Use external cron service (Trigger.dev, etc.)

---

## What to Do Right Now

### If targeting **500-1,000 players** (MVP):
1. ✅ You're ready. Just upgrade Supabase to Pro if not already.
2. Monitor game tick duration (should be < 30 seconds)

### If targeting **1,000-5,000 players** (Growth):
1. **Optimize game tick first** (biggest bang for buck)
2. Implement Redis caching layer
3. Upgrade Supabase plan as needed
4. Monitor database CPU during peak hours

### If targeting **5,000+ players** (Enterprise):
1. Refactor to multi-world architecture
2. Consider database read replicas or multiple DB instances
3. Switch job queue to external service (not Vercel cron)
4. Implement proper rate limiting at API gateway level

---

## How to Measure Current Health

Run these queries on Supabase to see where you are:

```sql
-- How many total players
SELECT COUNT(*) as total_players FROM users;

-- How many have played in last hour (affects cron load)
SELECT COUNT(*) FROM user_game_states 
WHERE last_played > NOW() - INTERVAL '1 hour';

-- How many units exist (cron load)
SELECT COUNT(*) as total_units FROM units;

-- Database connection usage
SELECT datname, usename, count(*) as connections 
FROM pg_stat_activity 
GROUP BY datname, usename;
```

---

## TL;DR

**Current capacity: 500-1,000 concurrent players before hitting Supabase Realtime subscription limit.**

**Main bottleneck: Game tick duration** - if it takes > 60 seconds, production falls behind.

**Next step: Optimize game tick with batch SQL operations instead of loops.**
