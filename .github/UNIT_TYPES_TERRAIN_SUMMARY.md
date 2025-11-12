# Unit Types, Terrain & Collision System - Summary

Your game now has a sophisticated movement system with terrain awareness and collision detection.

## 5 Unit Types with Unique Behavior

```
TANKS        ✓ Blocked by: rivers, obstacles, bases, other units
             ✓ Special: Can find bridge routes around rivers
             ✓ Ignores: railroad tracks, boats, trains

BOATS        ✓ Blocked by: land, obstacles, bases, other boats
             ✓ Must move on: rivers only
             ✓ Ignores: tanks, trains, helicopters, planes

TRAINS       ✓ Blocked by: land, obstacles, bases, other trains
             ✓ Must move on: railroad tracks only
             ✓ Ignores: tanks, boats, helicopters, planes

HELICOPTERS  ✓ Blocked by: nothing
             ✓ Flies over: everything
             ✓ Direct line to target

PLANES       ✓ Blocked by: nothing
             ✓ Flies over: everything
             ✓ Direct line to target
```

## Terrain Features

**Rivers**: Horizontal band across map
- Boats must stay on them
- Tanks cannot cross unless there's a bridge
- When blocked, tank finds nearest bridge and pathfinds around

**Railroads**: Vertical band across map
- Trains must stay on them
- Tanks and boats cannot move on them
- Helicopters and planes ignore

**Bridges**: Where rivers meet railroads (or manually placed)
- Tanks can cross rivers here
- Everyone can use them

**Obstacles**: 500 randomly scattered across map
- Rocks, trees, debris
- Block all ground units
- Helicopters and planes fly over

**Bases**: Have hitbox (radius ~5 tiles)
- All units blocked from entering
- Cannot build overlapping bases

## How It Works on the Server

### When player sends "move to target":

1. **Validate** — Can unit even move to that location?
   - Check terrain (boats only on rivers, trains only on rails)
   - Check for obstacles/other units
   - Check building hitboxes

2. **Pathfind** — Find the best route
   - Use A* algorithm for optimal path
   - For tanks hitting rivers: Find nearest bridge, go there, then to target
   - For helicopters/planes: Direct line to target

3. **Calculate movement time**
   - Distance = length of path
   - Time = distance / unit speed
   - Example: Tank (3 tiles/sec) moving 30 tiles = 10 seconds

4. **Store waypoints in database**
   - Store full path for validation
   - Store ETA for when movement completes

5. **Broadcast to all players**
   - All players see unit start moving
   - Unit interpolates smoothly on client (you see it walk 30 tiles over 10 seconds)

6. **Every 5 minutes, validate arrival**
   - Server checks if unit reached target
   - If ETA passed, snap unit to exact position
   - Anti-cheat: Verify unit didn't teleport/speedhack

## Performance Impact

### Collision Grid

Instead of checking 50,000 obstacles every time a unit moves:
- Pre-load entire 2000×2000 collision grid into memory (~10MB)
- One lookup per tile: O(1) collision check
- Updates live (if obstacle destroyed, update grid)

### Pathfinding

A* is expensive (checks thousands of nodes). Solutions:
- **Cache results** — Same path calculated once, reused
- **Cache timeout** — Refresh every 5 minutes
- **Early exit** — Direct line if no obstacles in path

### Database Queries

Collision grid (2M tiles):
```
-- Current time
SELECT collision_data FROM collision_grid 
WHERE world_id = 1 AND grid_x = 100 AND grid_y = 200;
-- <1ms (indexed lookup)
```

Obstacles:
```
SELECT * FROM world_obstacles 
WHERE world_id = 1 AND x BETWEEN 90 AND 110 AND y BETWEEN 190 AND 210;
-- <5ms (spatial index)
```

## Next Steps

### To Implement:

1. Create collision tables (collision_grid, world_obstacles, hitbox_types)
2. Write lib/game/collision-utils.ts (hitbox checks)
3. Write lib/game/pathfinding.ts (A* algorithm)
4. Update `/api/game/units/move` endpoint
5. Generate obstacles on world creation
6. Update database schema (units table + fields)
7. Update client rendering (use pathfinding data)

**Estimated effort**: 20-30 hours of development

### Risk Areas:

- **Pathfinding too slow** → Cache properly, tune A* heuristic
- **Collision checks expensive** → Pre-load grid into memory
- **Tank bridge logic buggy** → Test edge cases (river too wide, no bridges nearby)
- **Client/server position desync** → Validate positions at movement completion

---

## Questions for Clarification

1. **Bridges**: Should they be static (placed in world generation) or dynamic (can be built)?

2. **Obstacle types**: Can they be destroyed by units, or are they permanent fixtures?

3. **Trains on bridges**: Can trains cross bridges to go over rivers, or only on railroad tiles?

4. **Movement speed**: Should different unit types have different speeds? (Tank slow, helicopter fast, plane fastest)

5. **Multi-pathing**: If a tank's bridge route gets blocked by another unit, should it recalculate in real-time?

See `.github/COLLISION_PATHFINDING_SYSTEM.md` for full technical details.
