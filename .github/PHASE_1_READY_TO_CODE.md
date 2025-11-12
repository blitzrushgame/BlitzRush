# Phase 1: Collision & Pathfinding - Ready to Code

## Design Decisions (LOCKED)

✅ **Bridges**: Static, generated once during world creation
✅ **Obstacles**: Permanent (cannot be destroyed)
✅ **Railroads**: Can extend on and cross bridges (not blocked by them)
✅ **Unit speeds**: Configurable per unit type in `UNIT_STATS` (for balancing)
✅ **Route blocking**: Real-time recalculation when path becomes blocked mid-movement

---

## Architecture Overview

When a player moves a unit:

```
1. Player sends move command
2. Server validates terrain + collision
3. Calculate A* path
4. Return path + ETA to client
5. Client interpolates smoothly
6. Unit starts moving...

IF another unit blocks the path:
  → Server detects blockage
  → Recalculate new path
  → Broadcast new path to client
  → Client switches smoothly to new route

When unit arrives:
  → Server snaps position to exact target
  → Broadcast completion
```

---

## Database Schema

### New Tables

```sql
CREATE TABLE collision_grid (
  world_id INTEGER NOT NULL,
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  
  terrain_type TEXT, -- 'land', 'river', 'bridge', 'railroad'
  is_passable BOOLEAN,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (world_id, grid_x, grid_y)
);

CREATE INDEX idx_collision_grid_world ON collision_grid(world_id);

-- Example data:
-- (world_id=1, grid_x=100, grid_y=200, terrain_type='land', is_passable=true)
-- (world_id=1, grid_x=100, grid_y=201, terrain_type='river', is_passable=false)
-- (world_id=1, grid_x=100, grid_y=202, terrain_type='bridge', is_passable=true)
-- (world_id=1, grid_x=200, grid_y=202, terrain_type='railroad', is_passable=true)
```

```sql
CREATE TABLE world_obstacles (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL,
  obstacle_type TEXT NOT NULL, -- 'rock', 'tree', 'debris'
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  radius_tiles FLOAT NOT NULL DEFAULT 2.5,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (world_id) REFERENCES game_worlds(id)
);

CREATE INDEX idx_obstacles_world_pos ON world_obstacles(world_id, x, y);

-- Example:
-- (id=1, world_id=1, obstacle_type='rock', x=500, y=300, radius_tiles=2.5)
```

### Update Existing Tables

```sql
ALTER TABLE units ADD COLUMN (
  target_x INTEGER,
  target_y INTEGER,
  departure_time TIMESTAMP,
  eta_arrival_time TIMESTAMP,
  movement_waypoints TEXT, -- JSON array of {x, y} waypoints
  is_recalculating BOOLEAN DEFAULT FALSE -- prevents infinite recalc loops
);

ALTER TABLE buildings ADD COLUMN (
  hitbox_radius FLOAT NOT NULL DEFAULT 5.0 -- in tiles
);
```

---

## Code Implementation

### 1. Unit Stats with Configurable Speeds

**File: `lib/game/unit-constants.ts`** (UPDATE)

```typescript
export interface UnitStats {
  name: string;
  maxHealth: number;
  constructionTime: number; // seconds
  cost: ResourceCost;
  movementSpeed: number; // tiles per second (CONFIGURABLE FOR BALANCING)
  attackDamage: number;
  attackRange: number; // tiles
  hitboxRadius: number; // tiles
}

export const UNIT_STATS = {
  tank: {
    name: "Tank",
    maxHealth: 100,
    constructionTime: 30,
    cost: { metal: 50, energy: 20, carbon: 10 },
    movementSpeed: 3, // Easy to adjust for balance
    attackDamage: 25,
    attackRange: 5,
    hitboxRadius: 2,
  },
  helicopter: {
    name: "Helicopter",
    maxHealth: 60,
    constructionTime: 45,
    cost: { metal: 40, energy: 30, carbon: 5 },
    movementSpeed: 5,
    attackDamage: 20,
    attackRange: 6,
    hitboxRadius: 1.5,
  },
  plane: {
    name: "Plane",
    maxHealth: 80,
    constructionTime: 60,
    cost: { metal: 60, energy: 40, carbon: 15 },
    movementSpeed: 7,
    attackDamage: 30,
    attackRange: 8,
    hitboxRadius: 2,
  },
  boat: {
    name: "Boat",
    maxHealth: 90,
    constructionTime: 50,
    cost: { metal: 45, energy: 25, carbon: 20 },
    movementSpeed: 4,
    attackDamage: 22,
    attackRange: 5,
    hitboxRadius: 2,
  },
  train: {
    name: "Train",
    maxHealth: 120,
    constructionTime: 40,
    cost: { metal: 55, energy: 15, carbon: 25 },
    movementSpeed: 3.5,
    attackDamage: 35,
    attackRange: 4,
    hitboxRadius: 2.5,
  },
} as const;
```

**Why this matters**: You can update `movementSpeed` values without touching code logic. During playtesting, adjust speeds easily:
- Tank too slow? Change `3` to `3.5`
- Helicopter too fast? Change `5` to `4`
- Redeploy and test

### 2. Collision Detection Utils

**File: `lib/game/collision-utils.ts`** (NEW)

```typescript
import { UNIT_STATS, type UnitType } from "./unit-constants";
import { WORLD_SIZE_TILES } from "./constants";
import type { Database } from "@/lib/types/database"; // Your Supabase types

interface Hitbox {
  x: number;
  y: number;
  radius: number;
}

export async function checkTerrainPassable(
  x: number,
  y: number,
  unitType: UnitType,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  // Planes and helicopters ignore terrain
  if (unitType === "plane" || unitType === "helicopter") {
    return true;
  }

  // Bounds check
  if (x < 0 || x >= WORLD_SIZE_TILES || y < 0 || y >= WORLD_SIZE_TILES) {
    return false;
  }

  // Get terrain type for this tile
  const { data: cell } = await supabase
    .from("collision_grid")
    .select("terrain_type")
    .eq("grid_x", Math.floor(x))
    .eq("grid_y", Math.floor(y))
    .maybeSingle();

  if (!cell) {
    return false; // Unknown tile, treat as impassable
  }

  const terrain = cell.terrain_type;

  // Check unit-specific terrain rules
  switch (unitType) {
    case "tank":
      // Tanks can move on land and bridges
      // Cannot move on rivers or railroads (unless bridge covers it)
      return terrain === "land" || terrain === "bridge";

    case "boat":
      // Boats can only move on rivers (and bridges over rivers, treated as river)
      return terrain === "river" || terrain === "bridge";

    case "train":
      // Trains can only move on railroads (and bridges over railroads)
      return terrain === "railroad" || terrain === "bridge";

    case "helicopter":
    case "plane":
      // Flying units ignore terrain
      return true;

    default:
      return false;
  }
}

export async function checkCircleCollision(
  circle1: Hitbox,
  circle2: Hitbox
): Promise<boolean> {
  const dx = circle1.x - circle2.x;
  const dy = circle1.y - circle2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < circle1.radius + circle2.radius;
}

export async function getUnitsInArea(
  worldId: number,
  centerX: number,
  centerY: number,
  radius: number,
  supabase: ReturnType<typeof createClient>,
  excludeUnitId?: number
): Promise<Array<{ id: number; x: number; y: number; user_id: number; unit_type: UnitType }>> {
  // Get all units near the center point
  const { data: units } = await supabase
    .from("units")
    .select("id, x, y, user_id, unit_type")
    .eq("world_id", worldId)
    .gte("x", centerX - radius)
    .lte("x", centerX + radius)
    .gte("y", centerY - radius)
    .lte("y", centerY + radius);

  if (!units) return [];

  return units.filter((u) => !excludeUnitId || u.id !== excludeUnitId);
}

export async function getBuildingsInArea(
  worldId: number,
  centerX: number,
  centerY: number,
  radius: number,
  supabase: ReturnType<typeof createClient>
): Promise<Array<{ id: number; x: number; y: number; hitbox_radius: number }>> {
  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, x, y, hitbox_radius")
    .eq("world_id", worldId)
    .gte("x", centerX - radius)
    .lte("x", centerX + radius)
    .gte("y", centerY - radius)
    .lte("y", centerY + radius);

  return buildings || [];
}

export async function getObstaclesInArea(
  worldId: number,
  centerX: number,
  centerY: number,
  radius: number,
  supabase: ReturnType<typeof createClient>
): Promise<Array<{ id: number; x: number; y: number; radius_tiles: number }>> {
  const { data: obstacles } = await supabase
    .from("world_obstacles")
    .select("id, x, y, radius_tiles")
    .eq("world_id", worldId)
    .gte("x", centerX - radius)
    .lte("x", centerX + radius)
    .gte("y", centerY - radius)
    .lte("y", centerY + radius);

  return obstacles || [];
}

export async function isPathBlocked(
  x: number,
  y: number,
  unitType: UnitType,
  worldId: number,
  supabase: ReturnType<typeof createClient>,
  excludeUnitId?: number
): Promise<{ blocked: boolean; reason?: string }> {
  // Planes/helicopters never blocked
  if (unitType === "plane" || unitType === "helicopter") {
    return { blocked: false };
  }

  const stats = UNIT_STATS[unitType];
  const searchRadius = stats.hitboxRadius + 2;

  // Check terrain
  const terrainOk = await checkTerrainPassable(x, y, unitType, supabase);
  if (!terrainOk) {
    return { blocked: true, reason: "Invalid terrain" };
  }

  // Check other units
  const units = await getUnitsInArea(worldId, x, y, searchRadius, supabase, excludeUnitId);
  for (const unit of units) {
    const collision = await checkCircleCollision(
      { x, y, radius: stats.hitboxRadius },
      { x: unit.x, y: unit.y, radius: UNIT_STATS[unit.unit_type].hitboxRadius }
    );
    if (collision) {
      return { blocked: true, reason: "Blocked by unit" };
    }
  }

  // Check buildings
  const buildings = await getBuildingsInArea(worldId, x, y, searchRadius, supabase);
  for (const building of buildings) {
    const collision = await checkCircleCollision(
      { x, y, radius: stats.hitboxRadius },
      { x: building.x, y: building.y, radius: building.hitbox_radius }
    );
    if (collision) {
      return { blocked: true, reason: "Blocked by building" };
    }
  }

  // Check obstacles
  const obstacles = await getObstaclesInArea(worldId, x, y, searchRadius, supabase);
  for (const obstacle of obstacles) {
    const collision = await checkCircleCollision(
      { x, y, radius: stats.hitboxRadius },
      { x: obstacle.x, y: obstacle.y, radius: obstacle.radius_tiles }
    );
    if (collision) {
      return { blocked: true, reason: "Blocked by obstacle" };
    }
  }

  return { blocked: false };
}
```

### 3. A* Pathfinding

**File: `lib/game/pathfinding.ts`** (NEW)

```typescript
import { WORLD_SIZE_TILES } from "./constants";
import { UNIT_STATS, type UnitType } from "./unit-constants";
import { isPathBlocked } from "./collision-utils";
import type { ReturnType as SupabaseReturnType } from "@/lib/supabase/server";

interface PathNode {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to end
}

interface PathfindingResult {
  path: Array<{ x: number; y: number }>;
  reachable: boolean;
  distanceTiles: number;
  error?: string;
}

export async function findPath(
  unitType: UnitType,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  worldId: number,
  supabase: SupabaseReturnType
): Promise<PathfindingResult> {
  // Validate inputs
  if (startX < 0 || startX >= WORLD_SIZE_TILES || startY < 0 || startY >= WORLD_SIZE_TILES) {
    return { path: [], reachable: false, distanceTiles: 0, error: "Start out of bounds" };
  }

  if (targetX < 0 || targetX >= WORLD_SIZE_TILES || targetY < 0 || targetY >= WORLD_SIZE_TILES) {
    return { path: [], reachable: false, distanceTiles: 0, error: "Target out of bounds" };
  }

  // Planes and helicopters take direct path
  if (unitType === "plane" || unitType === "helicopter") {
    const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
    return {
      path: [{ x: targetX, y: targetY }],
      reachable: true,
      distanceTiles: distance,
    };
  }

  // A* for ground units
  const openSet: PathNode[] = [
    {
      x: startX,
      y: startY,
      g: 0,
      h: heuristic(startX, startY, targetX, targetY),
    },
  ];
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, { x: number; y: number }>();
  const gScores = new Map<string, number>();

  gScores.set(key(startX, startY), 0);

  while (openSet.length > 0) {
    // Find node with lowest f score
    let current = openSet[0];
    let currentIndex = 0;
    let lowestF = current.g + current.h;

    for (let i = 1; i < openSet.length; i++) {
      const f = openSet[i].g + openSet[i].h;
      if (f < lowestF) {
        current = openSet[i];
        currentIndex = i;
        lowestF = f;
      }
    }

    // Goal reached
    if (current.x === targetX && current.y === targetY) {
      return {
        path: reconstructPath(cameFrom, current),
        reachable: true,
        distanceTiles: current.g,
      };
    }

    openSet.splice(currentIndex, 1);
    closedSet.add(key(current.x, current.y));

    // Check all neighbors (8-directional)
    const neighbors = await getWalkableNeighbors(
      current.x,
      current.y,
      unitType,
      worldId,
      supabase
    );

    for (const neighbor of neighbors) {
      const neighborKey = key(neighbor.x, neighbor.y);

      if (closedSet.has(neighborKey)) {
        continue;
      }

      // Calculate distance to neighbor
      const dx = neighbor.x - current.x;
      const dy = neighbor.y - current.y;
      const isdiagonal = dx !== 0 && dy !== 0;
      const distance = isdiagonal ? 1.414 : 1; // √2 for diagonal

      const tentativeG = current.g + distance;

      // Check if this path to neighbor is better
      const neighborG = gScores.get(neighborKey);
      if (neighborG !== undefined && tentativeG >= neighborG) {
        continue;
      }

      // This is the best path so far
      gScores.set(neighborKey, tentativeG);
      cameFrom.set(neighborKey, current);

      const existing = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);
      if (!existing) {
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeG,
          h: heuristic(neighbor.x, neighbor.y, targetX, targetY),
        });
      } else {
        existing.g = tentativeG;
      }
    }
  }

  // Unreachable
  return { path: [], reachable: false, distanceTiles: 0, error: "No path found" };
}

async function getWalkableNeighbors(
  x: number,
  y: number,
  unitType: UnitType,
  worldId: number,
  supabase: SupabaseReturnType
): Promise<Array<{ x: number; y: number }>> {
  const neighbors: Array<{ x: number; y: number }> = [];

  // 8 directions: cardinal + diagonal
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0], // cardinal
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1], // diagonal
  ];

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    // Bounds check
    if (nx < 0 || nx >= WORLD_SIZE_TILES || ny < 0 || ny >= WORLD_SIZE_TILES) {
      continue;
    }

    // Check if passable
    const blocked = await isPathBlocked(nx, ny, unitType, worldId, supabase);
    if (!blocked.blocked) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  // Chebyshev distance (works well for 8-directional movement)
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

function reconstructPath(
  cameFrom: Map<string, { x: number; y: number }>,
  current: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [current];

  while (cameFrom.has(key(current.x, current.y))) {
    current = cameFrom.get(key(current.x, current.y))!;
    path.unshift(current);
  }

  return path;
}

function key(x: number, y: number): string {
  return `${Math.floor(x)},${Math.floor(y)}`;
}
```

### 4. Real-time Path Recalculation Logic

**File: `lib/game/movement-service.ts`** (NEW)

This handles detecting when a path becomes blocked and recalculating:

```typescript
import { findPath } from "./pathfinding";
import { isPathBlocked } from "./collision-utils";
import type { UnitType } from "./unit-constants";
import type { ReturnType as SupabaseReturnType } from "@/lib/supabase/server";

interface MovingUnit {
  id: number;
  unitType: UnitType;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  currentWaypoint: number; // index in path
  path: Array<{ x: number; y: number }>;
  departureTime: Date;
  etaArrivalTime: Date;
  worldId: number;
}

export async function validatePathAndRecalculate(
  unit: MovingUnit,
  supabase: SupabaseReturnType
): Promise<{
  valid: boolean;
  newPath?: Array<{ x: number; y: number }>;
  reason?: string;
}> {
  // Check the next waypoint on the path
  if (unit.currentWaypoint >= unit.path.length) {
    // Already at target
    return { valid: true };
  }

  const nextWaypoint = unit.path[unit.currentWaypoint];

  // Check if next waypoint is still passable
  const blocked = await isPathBlocked(nextWaypoint.x, nextWaypoint.y, unit.unitType, unit.worldId, supabase);

  if (!blocked.blocked) {
    // Path is still good
    return { valid: true };
  }

  // Path is blocked! Recalculate from current position
  console.log(`[Pathfinding] Unit ${unit.id} path blocked, recalculating...`);

  const result = await findPath(
    unit.unitType,
    Math.floor(unit.currentX),
    Math.floor(unit.currentY),
    unit.targetX,
    unit.targetY,
    unit.worldId,
    supabase
  );

  if (!result.reachable) {
    return { valid: false, reason: "No path found (destination unreachable)" };
  }

  // Recalculation successful
  return {
    valid: true,
    newPath: result.path,
    reason: "Path recalculated due to blockage",
  };
}
```

---

## Migration: Generate Terrain on World Creation

**File: `scripts/001_generate_collision_grid.sql`** (NEW MIGRATION)

Run this once when a new world is created:

```sql
-- Generate collision grid for a new world
-- This creates a 2000x2000 tile grid with terrain type

-- First, populate all tiles as "land"
INSERT INTO collision_grid (world_id, grid_x, grid_y, terrain_type, is_passable)
SELECT 
  1 as world_id,
  x.x,
  y.y,
  'land' as terrain_type,
  true as is_passable
FROM generate_series(0, 1999) AS x(x)
CROSS JOIN generate_series(0, 1999) AS y(y);

-- Now carve out rivers (horizontal band, y = 900-1100)
UPDATE collision_grid
SET terrain_type = 'river', is_passable = false
WHERE world_id = 1
  AND grid_y BETWEEN 900 AND 1100;

-- Place bridges across river (every 200 tiles)
-- These are where river meets railroad
UPDATE collision_grid
SET terrain_type = 'bridge', is_passable = true
WHERE world_id = 1
  AND grid_y BETWEEN 900 AND 1100
  AND grid_x IN (100, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900);

-- Add railroads (vertical band with bridges)
UPDATE collision_grid
SET terrain_type = 'railroad', is_passable = true
WHERE world_id = 1
  AND grid_x BETWEEN 800 AND 850;

-- Make sure railroads can cross the river (via bridge)
-- (Already handled above since we set bridges after)

-- Generate random obstacles
INSERT INTO world_obstacles (world_id, obstacle_type, x, y, radius_tiles)
SELECT
  1 as world_id,
  CASE floor(random() * 3)
    WHEN 0 THEN 'rock'
    WHEN 1 THEN 'tree'
    ELSE 'debris'
  END as obstacle_type,
  floor(random() * 2000)::int as x,
  floor(random() * 2000)::int as y,
  (1.5 + random() * 2)::float as radius_tiles
FROM generate_series(1, 500);

-- Add some obstacles to collision grid for faster lookups
-- (optional, for future optimization)
```

---

## API Endpoint: `/api/game/units/move` (NEW)

**File: `app/api/game/units/move/route.ts`** (REWRITE)

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findPath } from "@/lib/game/pathfinding";
import { isPathBlocked } from "@/lib/game/collision-utils";
import { UNIT_STATS } from "@/lib/game/unit-constants";

export async function POST(request: NextRequest) {
  try {
    const { unitId, targetX, targetY } = await request.json();

    if (!unitId || targetX === undefined || targetY === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get user session
    const sessionResponse = await fetch(new URL("/api/auth/session", request.url).toString(), {
      headers: request.headers,
    });
    const sessionData = await sessionResponse.json();

    if (!sessionData.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get the unit
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("*")
      .eq("id", unitId)
      .eq("user_id", sessionData.userId)
      .single();

    if (unitError || !unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Validate target is reachable
    const blocked = await isPathBlocked(targetX, targetY, unit.unit_type, unit.world_id, supabase, unit.id);

    if (blocked.blocked) {
      return NextResponse.json({ error: blocked.reason || "Target unreachable" }, { status: 400 });
    }

    // Find path
    const pathResult = await findPath(unit.unit_type, unit.x, unit.y, targetX, targetY, unit.world_id, supabase);

    if (!pathResult.reachable) {
      return NextResponse.json({ error: pathResult.error || "No path found" }, { status: 400 });
    }

    // Calculate movement duration
    const unitStats = UNIT_STATS[unit.unit_type];
    const movementDurationMs = (pathResult.distanceTiles / unitStats.movementSpeed) * 1000;

    const now = new Date();
    const eta = new Date(now.getTime() + movementDurationMs);

    // Update unit movement
    const { error: updateError } = await supabase
      .from("units")
      .update({
        target_x: targetX,
        target_y: targetY,
        departure_time: now.toISOString(),
        eta_arrival_time: eta.toISOString(),
        movement_waypoints: JSON.stringify(pathResult.path),
        is_recalculating: false,
      })
      .eq("id", unitId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
    }

    // Broadcast to realtime
    // TODO: Supabase Realtime broadcast to world-{worldId} channel

    return NextResponse.json({
      success: true,
      unit: {
        id: unitId,
        x: unit.x,
        y: unit.y,
        targetX,
        targetY,
        departureTime: now.toISOString(),
        etaArrivalTime: eta.toISOString(),
        path: pathResult.path,
        distanceTiles: pathResult.distanceTiles,
        movementDurationMs,
      },
    });
  } catch (error) {
    console.error("Error in move endpoint:", error);
    return NextResponse.json({ error: "Failed to process movement" }, { status: 500 });
  }
}
```

---

## Cron Job: Path Validation & Arrival Detection

**File: `app/api/cron/movement-validation/route.ts`** (NEW)

Run every 5-10 seconds to:
1. Detect blocked paths and trigger recalculation
2. Snap units to target when ETA reached

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { validatePathAndRecalculate } from "@/lib/game/movement-service";
import { findPath } from "@/lib/game/pathfinding";

export async function POST(request: NextRequest) {
  try {
    // Security check
    if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const now = new Date();

    // 1. Check for blocked paths (recalculate if needed)
    const { data: movingUnits } = await supabase
      .from("units")
      .select("*")
      .not("target_x", "is", null)
      .eq("is_recalculating", false); // Skip if already recalculating

    if (movingUnits) {
      for (const unit of movingUnits) {
        const validation = await validatePathAndRecalculate(unit, supabase);

        if (!validation.valid) {
          // Can't reach target, stop movement
          await supabase
            .from("units")
            .update({
              target_x: null,
              target_y: null,
              movement_waypoints: null,
            })
            .eq("id", unit.id);

          // Broadcast error
          // TODO: Realtime notification
        } else if (validation.newPath) {
          // Path was recalculated, update unit
          const recalcResult = await findPath(
            unit.unit_type,
            Math.floor(unit.x),
            Math.floor(unit.y),
            unit.target_x,
            unit.target_y,
            unit.world_id,
            supabase
          );

          if (recalcResult.reachable) {
            const unitStats = UNIT_STATS[unit.unit_type];
            const newDurationMs = (recalcResult.distanceTiles / unitStats.movementSpeed) * 1000;
            const newEta = new Date(now.getTime() + newDurationMs);

            await supabase
              .from("units")
              .update({
                movement_waypoints: JSON.stringify(recalcResult.path),
                eta_arrival_time: newEta.toISOString(),
              })
              .eq("id", unit.id);

            // Broadcast path change
            // TODO: Realtime notification with new path
          }
        }
      }
    }

    // 2. Snap units to target when ETA reached
    const { data: arrivedUnits } = await supabase
      .from("units")
      .select("*")
      .not("eta_arrival_time", "is", null)
      .lte("eta_arrival_time", now.toISOString());

    if (arrivedUnits) {
      for (const unit of arrivedUnits) {
        await supabase
          .from("units")
          .update({
            x: unit.target_x,
            y: unit.target_y,
            target_x: null,
            target_y: null,
            movement_waypoints: null,
            eta_arrival_time: null,
            is_recalculating: false,
          })
          .eq("id", unit.id);

        // Broadcast arrival
        // TODO: Realtime notification
      }
    }

    return NextResponse.json({
      success: true,
      processed: {
        validatedMovement: movingUnits?.length || 0,
        arrivedUnits: arrivedUnits?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error in movement validation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Testing Checklist

### Unit Tests (lib/game/)
- [ ] Collision detection: Two units with overlapping hitboxes
- [ ] Terrain checking: Tank on river returns false
- [ ] Pathfinding: A* finds shortest path
- [ ] Pathfinding: Diagonal movement costs correctly
- [ ] Bridge detection: Tank can cross river at bridge

### Integration Tests (api/)
- [ ] POST /api/game/units/move returns path
- [ ] Path is returned in order
- [ ] ETA matches distance/speed calculation
- [ ] Unit not found returns 404

### E2E Tests
- [ ] Tank moves and interpolates smoothly
- [ ] Helicopter ignores obstacles
- [ ] Boat blocks on land, moves on river
- [ ] Train blocks on land, moves on railroad
- [ ] Unit path recalculates when blocked
- [ ] Unit snaps to target on arrival

---

## Performance Notes

### Pathfinding Cache

Add optional caching for repeated queries:

```typescript
const pathCache = new Map<string, PathfindingResult>();
const CACHE_TTL = 10000; // 10 seconds

export async function findPathCached(...): Promise<PathfindingResult> {
  const cacheKey = `${worldId}:${startX},${startY}:${targetX},${targetY}`;
  
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey)!;
  }

  const result = await findPath(...);
  pathCache.set(cacheKey, result);
  
  setTimeout(() => pathCache.delete(cacheKey), CACHE_TTL);
  return result;
}
```

### Database Queries

All queries use indexes:
- `collision_grid`: Indexed on (world_id, grid_x, grid_y)
- `world_obstacles`: Indexed on (world_id, x, y)
- `units`: Existing indices on (world_id, user_id)
- `buildings`: Ensure spatial index on (world_id, x, y)

---

## Ready to Code!

This document has everything you need to implement Phase 1. Start with:

1. Create database tables (migration script)
2. Write `collision-utils.ts`
3. Write `pathfinding.ts`
4. Write `movement-service.ts`
5. Update `/api/game/units/move`
6. Add cron job for validation
7. Test!

**Estimated time**: 25-35 hours of development
