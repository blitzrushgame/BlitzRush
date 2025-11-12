# BlitzRush - Complete Developer Guide

## 📚 Documentation Overview

Your `.github/` folder now contains complete architectural documentation:

### 1. **copilot-instructions.md** — For AI Agents
   How Copilot/Claude should approach your codebase. Current status, key patterns, where to start.

### 2. **SCALABILITY_ANALYSIS.md** — Current State
   - Current capacity: 500-1,000 players
   - Why tick-based system is the bottleneck
   - What breaks first at scale

### 3. **ARCHITECTURE_REDESIGN.md** — High-Level Strategy
   - Why you need event-driven (not tick-based)
   - Your specific requirements (building visibility, fog of war, movement desync tolerance)
   - Comparison of current vs new design

### 4. **COLLISION_PATHFINDING_SYSTEM.md** — Technical Details (Complex!)
   - Unit collision rules (5 types × 5 constraint types)
   - A* pathfinding algorithm
   - Tank bridge-crossing logic
   - Database schema for collision grid and obstacles
   - Performance considerations

### 5. **UNIT_TYPES_TERRAIN_SUMMARY.md** — Quick Reference
   - What each unit can/can't do
   - Terrain features (rivers, railroads, bridges, obstacles)
   - How movement works on server
   - Implementation checklist

### 6. **IMPLEMENTATION_ROADMAP.md** — Step-by-Step
   - Phase 1: Movement with pathfinding
   - Phase 2: Building construction
   - Phase 3: Resource generation
   - Phase 4: Fog of war
   - Testing checklist

---

## 🎯 What You've Designed

### 5 Unit Types with Terrain-Aware Pathfinding

| Unit | Speed | Special Behavior |
|------|-------|------------------|
| **Tank** | 3 t/s | Blocked by rivers, but can pathfind around via bridges |
| **Boat** | 4 t/s | Must stay on rivers only |
| **Train** | 3.5 t/s | Must stay on railroad tracks only |
| **Helicopter** | 5 t/s | Ignores all collision (flies over) |
| **Plane** | 7 t/s | Ignores all collision (flies over) |

### Persistent World with Collision

- **Buildings** visible to all players (with future fog of war)
- **Terrain features**: Rivers, railroads, bridges, obstacles
- **Hitboxes**: Every unit, building, and obstacle has one
- **Smart pathfinding**: A* algorithm finds optimal routes
- **Tank bridge logic**: If blocked by river, finds nearest bridge and detours

---

## ⚡ Quick Start: What to Code First

### Before you code, answer these 5 questions:

1. **Bridges** — Static (generated) or dynamic (player-built)?
2. **Obstacles** — Destroyable or permanent?
3. **Trains on bridges** — Can they cross rivers?
4. **Movement speed** — The values in the table above, or different?
5. **Real-time path updates** — If a unit's route gets blocked, recalculate immediately?

---

## 📊 Complexity Levels

### Easy (Start Here)
- Combat system (already done ✅)
- Building construction redesign

### Medium
- Unit movement with basic pathfinding
- Collision detection

### Hard
- A* pathfinding optimization
- Tank bridge-crossing logic
- Real-time path recalculation

### Very Hard (Post-MVP)
- Fog of war system
- Database sharding for 10k+ players
- Realtime broadcast optimization

---

## 🗂️ File Organization for Implementation

When you're ready to code:

```
lib/game/
  ├─ collision-utils.ts (NEW) — Hitbox checking, terrain validation
  ├─ pathfinding.ts (NEW) — A* algorithm, bridge detection
  ├─ unit-constants.ts (UPDATE) — Add hitboxRadius, movement constraints
  ├─ combat-utils.ts (existing)
  └─ constants.ts (existing)

app/api/game/units/
  ├─ move/route.ts (UPDATE) — Now uses pathfinding + collision checks
  ├─ stop/route.ts (existing)
  └─ attack-unit/route.ts (existing)

database/
  ├─ collision_grid (NEW table) — Terrain data per tile
  ├─ world_obstacles (NEW table) — Randomly generated obstacles
  ├─ hitbox_types (NEW table) — Reference data
  └─ units (UPDATE) — Add target_x, target_y, eta, path fields
```

---

## 🚀 Implementation Roadmap

### Week 1-2: Phase 1A (Basic Movement)
- [ ] Create collision detection utils
- [ ] Add unit pathfinding (simplified version first)
- [ ] Update `/api/game/units/move` endpoint
- [ ] Test movement + ETA calculation

### Week 3-4: Phase 1B (Collision & Terrain)
- [ ] Implement terrain-specific constraints
- [ ] Add tank bridge-crossing logic
- [ ] Generate obstacles in world
- [ ] Test all unit types

### Week 5: Phase 2 (Building Construction)
- [ ] Instant building placement
- [ ] Construction progress tracking
- [ ] Building completion validation

### Week 6: Phase 3 (Resource Generation)
- [ ] Client-side production math
- [ ] Server validation
- [ ] Smooth resource animation

### Post-Launch: Phase 4 (Fog of War)
- [ ] Vision system
- [ ] Building visibility control
- [ ] Alliance fog sharing

---

## 🔍 Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| **Pathfinding time** | <50ms | Cache + A* optimization |
| **Collision check** | <1ms | Pre-loaded grid |
| **Movement feedback** | <100ms | Server validates, broadcasts |
| **Concurrent players** | 500 | Event-driven, not tick-based |
| **Queries per user action** | <10 | Batch operations |

---

## ⚠️ Potential Pitfalls

### Pathfinding
- **Problem**: A* is slow for 10k+ obstacles
- **Solution**: Cache paths, use spatial indexing, terminate early

### Movement Desync
- **Problem**: Client and server disagree on position during movement
- **Solution**: Client interpolates, server validates at ETA, snaps to exact position

### Bridge Detection
- **Problem**: Tank stuck because can't find bridge
- **Solution**: Fall back to "unreachable" error, player tries different route

### Collision Updates
- **Problem**: Obstacle destroyed but grid still shows it
- **Solution**: Update collision_grid on obstacle deletion, invalidate pathfinding cache

---

## 🎮 Testing Your Movement System

### Manual Testing Checklist

```
TANKS:
- [ ] Move on grassland (should work)
- [ ] Try to move into river (should fail)
- [ ] Try to move to river with bridge nearby (should pathfind to bridge)
- [ ] Try to cross bridge (should work)
- [ ] Get blocked by another unit (should fail)
- [ ] Move around rock obstacle (should pathfind around)

BOATS:
- [ ] Move on river (should work)
- [ ] Try to move on land (should fail)
- [ ] Move to adjacent boat (should fail)

TRAINS:
- [ ] Move on railroad (should work)
- [ ] Try to move on grassland (should fail)
- [ ] Try to move on bridge (should work?)

HELICOPTERS:
- [ ] Move anywhere (should always work)
- [ ] Move directly over river/railroad/obstacles (should work)

PLANES:
- [ ] Move anywhere (should always work)
- [ ] Move directly over river/railroad/obstacles (should work)

COLLISION:
- [ ] Two tanks can't occupy same space
- [ ] Unit can't occupy building space
- [ ] Unit can't occupy obstacle space
```

---

## 📝 Questions to Resolve

These are in the documents but unanswered by you:

1. Bridge generation — static or dynamic?
2. Obstacle destruction — can units destroy them?
3. Multi-type terrain — can trains cross river bridges?
4. Movement speeds — use defaults or customize?
5. Path recalculation — real-time if route blocked?

Answer these to finalize the design before coding starts.

---

## 🏁 Next Steps

**Option A**: Pick one question above and clarify it
**Option B**: Start with Phase 1A code (basic movement)
**Option C**: Ask about specific implementation details

What's your next move?
