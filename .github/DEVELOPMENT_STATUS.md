# BlitzRush - Development Status & Next Steps

## 📊 Where We Are

### Design Phase ✅ COMPLETE

Your game architecture is now fully designed with all decisions locked in:

- ✅ **5 unit types** with unique movement constraints
- ✅ **Terrain system** (rivers, railroads, bridges, obstacles)
- ✅ **Pathfinding** (A* algorithm for optimal routes)
- ✅ **Collision detection** (hitboxes for all objects)
- ✅ **Real-time path recalculation** (when path becomes blocked)
- ✅ **Configurable unit speeds** (for balancing)
- ✅ **Event-driven movement** (instant feedback, not tick-based)

### Implementation Phase 🚧 READY TO START

You have detailed code implementations for:

1. **Collision detection** (`lib/game/collision-utils.ts`)
2. **A* Pathfinding** (`lib/game/pathfinding.ts`)
3. **Path validation & recalculation** (`lib/game/movement-service.ts`)
4. **Movement API endpoint** (`app/api/game/units/move`)
5. **Cron job for validation** (`app/api/cron/movement-validation`)
6. **Database schema** (3 new tables, 1 update)
7. **World generation** (terrain + obstacles)

---

## 📚 Documentation Index

| File | Purpose | Status |
|------|---------|--------|
| **PHASE_1_READY_TO_CODE.md** ⭐ | Complete code implementation guide | Ready now |
| **copilot-instructions.md** | AI agent guidelines | Reference |
| **README.md** | Overview of all docs | Reference |
| **SCALABILITY_ANALYSIS.md** | Current/target capacity | Reference |
| **ARCHITECTURE_REDESIGN.md** | Why event-driven | Reference |
| **COLLISION_PATHFINDING_SYSTEM.md** | Technical deep-dive | Reference |
| **UNIT_TYPES_TERRAIN_SUMMARY.md** | Quick unit reference | Reference |
| **IMPLEMENTATION_ROADMAP.md** | Phase 1-4 planning | Reference |

**Start here**: `PHASE_1_READY_TO_CODE.md`

---

## 🎯 Your Development Roadmap

### Phase 1A: Database & Utilities (Week 1-2)

**Files to create/modify:**

1. **Database migration** (`scripts/001_generate_collision_grid.sql`)
   - Create `collision_grid` table
   - Create `world_obstacles` table
   - Update `units` table schema
   - Update `buildings` table (add hitbox_radius)

2. **Collision utils** (`lib/game/collision-utils.ts`)
   - `checkTerrainPassable()` — Check if unit can move to terrain
   - `checkCircleCollision()` — Hitbox overlap detection
   - `getUnitsInArea()` — Find nearby units
   - `getBuildingsInArea()` — Find nearby buildings
   - `getObstaclesInArea()` — Find nearby obstacles
   - `isPathBlocked()` — Check if position is blocked

3. **Pathfinding** (`lib/game/pathfinding.ts`)
   - `findPath()` — A* algorithm
   - `getWalkableNeighbors()` — Helper for A*
   - Helper functions (heuristic, key, reconstructPath)

4. **Movement service** (`lib/game/movement-service.ts`)
   - `validatePathAndRecalculate()` — Detect blocked paths, trigger recalc

### Phase 1B: API & Cron (Week 2-3)

5. **Movement endpoint** (REWRITE `app/api/game/units/move/route.ts`)
   - Validate terrain
   - Calculate path
   - Store in database
   - Return path to client

6. **Movement validation cron** (`app/api/cron/movement-validation/route.ts`)
   - Run every 5-10 seconds
   - Detect blocked paths
   - Snap units to target on arrival

### Phase 1C: Testing (Week 3-4)

7. **Unit tests**
   - Collision detection logic
   - Pathfinding algorithm
   - Terrain validation

8. **Integration tests**
   - API endpoint responses
   - Database updates

9. **E2E tests**
   - Full movement flow
   - Client interpolation
   - Path recalculation

### Phase 2: Building Construction (Week 4-5)

After Phase 1 is working, implement instant building placement with progress tracking.

---

## 🔑 Key Features by Unit Type

### TANK
```
Movement: 3 tiles/second
Terrain:  Can move on land and bridges
Blocked:  Rivers (unless bridge), obstacles, bases, units
Special:  Auto-detours via nearest bridge when river blocks path
```

### BOAT
```
Movement: 4 tiles/second
Terrain:  Can ONLY move on rivers (and bridges over rivers)
Blocked:  Land, obstacles, bases, units
Special:  Fast water travel
```

### TRAIN
```
Movement: 3.5 tiles/second
Terrain:  Can ONLY move on railroad tracks (can cross via bridges)
Blocked:  Land (unless railroad), obstacles, bases, units
Special:  High cargo capacity (future feature)
```

### HELICOPTER
```
Movement: 5 tiles/second
Terrain:  Can move ANYWHERE
Blocked:  Nothing (ignores all collision)
Special:  Direct line to target (no pathfinding needed)
```

### PLANE
```
Movement: 7 tiles/second
Terrain:  Can move ANYWHERE
Blocked:  Nothing (ignores all collision)
Special:  Direct line to target (no pathfinding needed)
```

---

## 💡 Implementation Tips

### Start Small
1. Get collision detection working first (easier to test)
2. Then add pathfinding (can test with pre-set paths)
3. Then integrate into movement API

### Testing Strategy
- Unit tests for collision/pathfinding (no DB needed)
- Mock Supabase for initial testing
- Use dev database for integration tests
- Test each unit type separately

### Common Issues & Fixes

**Issue**: A* pathfinding too slow
- **Fix**: Cache paths, use heuristic to terminate early

**Issue**: Path recalculation causes loops
- **Fix**: Set `is_recalculating` flag to prevent re-triggering

**Issue**: Hitbox calculations wrong
- **Fix**: Remember X,Y is tile coordinate, not pixel; radius is in tiles

**Issue**: Bridge logic not working
- **Fix**: Ensure railroad tiles that cross rivers have `terrain='bridge'`

---

## 📊 Database Changes Summary

### New Tables

```sql
collision_grid (2,000,000 rows)
├─ world_id
├─ grid_x, grid_y
├─ terrain_type (land, river, bridge, railroad)
└─ is_passable

world_obstacles (~500 rows)
├─ world_id
├─ x, y, radius_tiles
└─ obstacle_type (rock, tree, debris)
```

### Updated Tables

```sql
units
├─ target_x, target_y (where unit is going)
├─ departure_time, eta_arrival_time (movement timing)
├─ movement_waypoints (JSON path)
└─ is_recalculating (prevent loops)

buildings
└─ hitbox_radius (collision size)
```

---

## ⚡ Performance Targets

| Action | Target | Status |
|--------|--------|--------|
| Pathfinding (A*) | <50ms | Need caching |
| Collision check | <1ms | DB indexed |
| Movement broadcast | <100ms | Realtime |
| Path recalculation | <50ms | Real-time trigger |
| Unit arrival validation | <5 seconds | Cron job |

---

## 🚀 Quick Start Checklist

- [ ] Read `PHASE_1_READY_TO_CODE.md` fully
- [ ] Create database migration script
- [ ] Implement `collision-utils.ts`
- [ ] Implement `pathfinding.ts`
- [ ] Implement `movement-service.ts`
- [ ] Update movement API endpoint
- [ ] Create movement validation cron job
- [ ] Test collision detection
- [ ] Test pathfinding algorithm
- [ ] Test full movement flow
- [ ] Test all 5 unit types
- [ ] Test path recalculation

---

## 🎮 Next Action

**Pick one:**

**Option A**: Start implementation
- Open `PHASE_1_READY_TO_CODE.md`
- Create database migration
- Start writing `collision-utils.ts`

**Option B**: Clarify anything
- Ask questions about the design
- Request code examples for specific parts
- Need help debugging issues

**Option C**: Review specific section
- Architecture decisions
- Database design
- API contracts
- Testing strategy

What would you like to do?
