# Collision, Pathfinding & Terrain System

## Unit Types and Collision Rules

### Unit Collision Matrix

| Unit Type | Hitbox? | Blocks other units? | Blocked by... | Special behavior |
|-----------|---------|-------------------|---------------|-----------------|
| **Tank** | Yes | Yes | Other tanks, bases, obstacles, rivers | Can pathfind around rivers via bridges |
| **Helicopter** | Yes | No | Nothing (ignores all collision) | Flies over everything |
| **Plane** | Yes | No | Nothing (ignores all collision) | Flies over everything |
| **Boat** | Yes | Yes | Other boats, bases, obstacles, land | Must stay on rivers only |
| **Train** | Yes | Yes | Other trains, bases, obstacles, land | Must stay on railroad tracks only |

---

## Terrain Features & Hitboxes

### 1. Hitbox Types (NEW table structure)

```sql
CREATE TABLE hitbox_types (
  id SERIAL PRIMARY KEY,
  hitbox_type TEXT UNIQUE NOT NULL, -- 'unit', 'terrain', 'building', 'obstacle'
  description TEXT
);

-- Reference data:
-- unit (unit body)
-- river (passable only by boats)
-- railroad (passable only by trains)
-- bridge (passable by tanks/helicopters/planes over rivers)
-- base (unit cannot occupy)
-- obstacle (unit cannot occupy, randomly scattered)
```

### 2. World Collision Grid (NEW)

Store collision data as a tiled collision map (like game engines use):

```sql
CREATE TABLE collision_grid (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id),
  
  -- Grid cell (each 64px tile = 1 cell, so 2000x2000 world = 2000x2000 grid)
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  
  -- Collision layers (JSONB for flexibility)
  collision_data JSONB NOT NULL, -- {terrain: 'river'|'railroad'|'bridge'|'land', obstacles: []}
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(world_id, grid_x, grid_y),
  INDEX idx_collision_world (world_id, grid_x, grid_y)
);

-- Example collision_data:
-- {"terrain": "land", "obstacles": []}
-- {"terrain": "river", "obstacles": []}
-- {"terrain": "bridge", "obstacles": []}
-- {"terrain": "railroad", "obstacles": []}
-- {"terrain": "land", "obstacles": [{"obstacleId": 123, "radius": 3}]}
```

### 3. Base Hitboxes (UPDATE buildings table)

```sql
ALTER TABLE buildings ADD COLUMN (
  hitbox_radius INTEGER DEFAULT 5 -- tiles (5 tiles = ~320px diameter)
);

-- Bases are centered at their position
-- When checking collision, any unit moving into this radius is blocked
```

### 4. Randomly Generated Obstacles (NEW table)

```sql
CREATE TABLE world_obstacles (
  id SERIAL PRIMARY KEY,
  world_id INTEGER NOT NULL REFERENCES game_worlds(id),
  obstacle_type TEXT NOT NULL, -- 'rock', 'tree', 'debris'
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  hitbox_radius INTEGER NOT NULL, -- tiles
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_obstacles_world (world_id, x, y)
);

-- Generated during world creation
-- Can be destroyed by units (future feature)
```

---

## Collision Detection Algorithm

### Server-Side Validation (lib/game/collision-utils.ts)

```typescript
import { UNIT_STATS, type UnitType } from "./unit-constants";
import { clampTileCoords, WORLD_SIZE_TILES } from "./constants";

interface Hitbox {
  x: number;
  y: number;
  radius: number; // in tiles
}

interface CollisionObject {
  type: "unit" | "building" | "obstacle";
  hitbox: Hitbox;
  unitType?: UnitType;
  passable?: boolean; // for terrain
}

export async function canUnitMoveTo(
  unitType: UnitType,
  targetX: number,
  targetY: number,
  worldId: number,
  excludeUnitId?: number
): Promise<{ canMove: boolean; error?: string }> {
  // Validate basic bounds
  if (targetX < 0 || targetX >= WORLD_SIZE_TILES || 
      targetY < 0 || targetY >= WORLD_SIZE_TILES) {
    return { canMove: false, error: "Target outside world bounds" };
  }

  const unitStats = UNIT_STATS[unitType];

  // Planes and helicopters ignore all collision
  if (unitType === "plane" || unitType === "helicopter") {
    return { canMove: true };
  }

  // Get collision objects in area (target + hitbox radius)
  const collisionObjects = await getCollisionObjectsNear(
    worldId,
    targetX,
    targetY,
    unitStats.hitboxRadius + 5 // Check nearby area
  );

  for (const obj of collisionObjects) {
    if (excludeUnitId && obj.type === "unit" && obj.id === excludeUnitId) {
      continue; // Skip self
    }

    const collides = checkCircleCollision(
      { x: targetX, y: targetY, radius: unitStats.hitboxRadius },
      obj.hitbox
    );

    if (!collides) continue;

    // Check unit-specific collision rules
    switch (unitType) {
      case "tank":
        if (obj.type === "building" || obj.type === "obstacle") {
          return { canMove: false, error: "Blocked by obstacle" };
        }
        if (obj.type === "unit") {
          const otherUnit = obj as UnitCollisionObject;
          if (otherUnit.unitType === "train" || otherUnit.unitType === "boat") {
            // Tanks can't be blocked by trains or boats, but can't overlap
            return { canMove: false, error: "Cannot occupy same space" };
          }
          return { canMove: false, error: "Blocked by unit" };
        }
        break;

      case "boat":
        if (obj.type === "building" || obj.type === "obstacle") {
          return { canMove: false, error: "Blocked by obstacle" };
        }
        if (obj.type === "terrain" && obj.terrain !== "river" && obj.terrain !== "bridge") {
          return { canMove: false, error: "Boats must stay on rivers" };
        }
        if (obj.type === "unit") {
          return { canMove: false, error: "Blocked by unit" };
        }
        break;

      case "train":
        if (obj.type === "building" || obj.type === "obstacle") {
          return { canMove: false, error: "Blocked by obstacle" };
        }
        if (obj.type === "terrain" && obj.terrain !== "railroad" && obj.terrain !== "bridge") {
          return { canMove: false, error: "Trains must stay on railroad tracks" };
        }
        if (obj.type === "unit") {
          return { canMove: false, error: "Blocked by unit" };
        }
        break;

      case "helicopter":
      case "plane":
        // These ignore all collision
        break;
    }
  }

  return { canMove: true };
}

function checkCircleCollision(circle1: Hitbox, circle2: Hitbox): boolean {
  const dx = circle1.x - circle2.x;
  const dy = circle1.y - circle2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < circle1.radius + circle2.radius;
}
```

---

## Pathfinding System

### Basic A* Pathfinding (lib/game/pathfinding.ts)

For tanks/boats/trains, use A* algorithm to find paths around obstacles:

```typescript
interface PathfindingResult {
  path: Array<{ x: number; y: number }>;
  reachable: boolean;
  distanceTiles: number;
}

export async function findPath(
  unitType: UnitType,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  worldId: number
): Promise<PathfindingResult> {
  // Planes/helicopters have straight path
  if (unitType === "plane" || unitType === "helicopter") {
    const distance = Math.sqrt(
      Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
    );
    return {
      path: [{ x: targetX, y: targetY }],
      reachable: true,
      distanceTiles: distance,
    };
  }

  // For ground units, use A* with terrain awareness
  const openSet: PathNode[] = [
    { x: startX, y: startY, g: 0, h: heuristic(startX, startY, targetX, targetY) },
  ];
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, { x: number; y: number }>();

  while (openSet.length > 0) {
    // Find node with lowest f score
    let current = openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].g + openSet[i].h < current.g + current.h) {
        current = openSet[i];
        currentIndex = i;
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
    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors (8-directional movement)
    const neighbors = getWalkableNeighbors(current.x, current.y, unitType, worldId);

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key)) continue;

      const tentativeG = current.g + 1; // Each tile = 1 unit distance
      const existing = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

      if (!existing) {
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeG,
          h: heuristic(neighbor.x, neighbor.y, targetX, targetY),
        });
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
      }

      cameFrom.set(key, current);
    }
  }

  // Unreachable
  return { path: [], reachable: false, distanceTiles: 0 };
}

function getWalkableNeighbors(
  x: number,
  y: number,
  unitType: UnitType,
  worldId: number
): Array<{ x: number; y: number }> {
  const neighbors = [];
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0], // Cardinal
    [1, 1], [1, -1], [-1, 1], [-1, -1], // Diagonal
  ];

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    // Bounds check
    if (nx < 0 || nx >= WORLD_SIZE_TILES || ny < 0 || ny >= WORLD_SIZE_TILES) {
      continue;
    }

    // Check if unit can walk here (terrain + collision)
    const canWalk = checkTerrainWalkable(nx, ny, unitType, worldId);
    if (canWalk) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  // Manhattan distance (good for grid-based pathfinding)
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
```

### Special Case: Tank River Crossing

When a tank is blocked by a river, find the nearest bridge:

```typescript
export async function findBridgeCrossing(
  tankX: number,
  tankY: number,
  targetX: number,
  targetY: number,
  worldId: number
): Promise<{ bridgeX: number; bridgeY: number } | null> {
  // Query all bridge tiles near the river between tank and target
  const { data: bridges } = await supabase
    .from("collision_grid")
    .select("grid_x, grid_y")
    .eq("world_id", worldId)
    .contains("collision_data", { terrain: "bridge" });

  if (!bridges) return null;

  // Find closest bridge that's on a path toward target
  let closestBridge = null;
  let closestDistance = Infinity;

  for (const bridge of bridges) {
    const distance = Math.sqrt(
      Math.pow(bridge.grid_x - tankX, 2) + Math.pow(bridge.grid_y - tankY, 2)
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestBridge = { bridgeX: bridge.grid_x, bridgeY: bridge.grid_y };
    }
  }

  return closestBridge;
}

export async function findPathWithBridgeDetour(
  tankX: number,
  tankY: number,
  targetX: number,
  targetY: number,
  worldId: number
): Promise<PathfindingResult> {
  // Try direct path first
  let result = await findPath("tank", tankX, tankY, targetX, targetY, worldId);

  if (result.reachable) {
    return result;
  }

  // Path blocked, check if river is in the way
  const bridge = await findBridgeCrossing(tankX, tankY, targetX, targetY, worldId);

  if (!bridge) {
    return { path: [], reachable: false, distanceTiles: 0 };
  }

  // Go to bridge, then to target
  const pathToBridge = await findPath("tank", tankX, tankY, bridge.bridgeX, bridge.bridgeY, worldId);

  if (!pathToBridge.reachable) {
    return { path: [], reachable: false, distanceTiles: 0 };
  }

  const pathFromBridge = await findPath("tank", bridge.bridgeX, bridge.bridgeY, targetX, targetY, worldId);

  if (!pathFromBridge.reachable) {
    return { path: [], reachable: false, distanceTiles: 0 };
  }

  // Combine paths
  return {
    path: [...pathToBridge.path, ...pathFromBridge.path.slice(1)], // Avoid duplicate bridge point
    reachable: true,
    distanceTiles: pathToBridge.distanceTiles + pathFromBridge.distanceTiles,
  };
}
```

---

## World Generation: Obstacles & Terrain

### Generate on World Creation (scripts/new migration)

```sql
-- Called once when game world is initialized

-- Generate random obstacles across map
INSERT INTO world_obstacles (world_id, obstacle_type, x, y, hitbox_radius)
SELECT 
  1 as world_id,
  CASE floor(random() * 3)
    WHEN 0 THEN 'rock'
    WHEN 1 THEN 'tree'
    ELSE 'debris'
  END as obstacle_type,
  floor(random() * 2000) as x,
  floor(random() * 2000) as y,
  2 as hitbox_radius  -- 2 tile radius
FROM generate_series(1, 500); -- 500 obstacles total

-- Generate rivers (diagonal pattern or random lines)
-- Generate railroads (grid pattern)
-- Both stored in collision_grid as terrain type

-- Populate collision_grid for all tiles
INSERT INTO collision_grid (world_id, grid_x, grid_y, collision_data)
SELECT 
  1 as world_id,
  x.x,
  y.y,
  jsonb_build_object(
    'terrain', CASE
      -- River: horizontal band across map
      WHEN y.y BETWEEN 900 AND 1100 THEN 'river'
      -- Railroad: vertical band across map
      WHEN x.x BETWEEN 800 AND 850 THEN 'railroad'
      ELSE 'land'
    END,
    'obstacles', '[]'::jsonb
  ) as collision_data
FROM generate_series(0, 1999) AS x(x)
CROSS JOIN generate_series(0, 1999) AS y(y);
```

---

## Updated Movement Endpoint

### `/api/game/units/move` (UPDATE to support pathfinding)

**Request** (same as before):

```typescript
{
  unitId: number,
  targetX: number,
  targetY: number
}
```

**Server logic**:

```typescript
export async function POST(request: NextRequest) {
  const { unitId, targetX, targetY } = await request.json();

  // ... existing validation ...

  const unit = await supabase.from("units").select("*").eq("id", unitId).single();

  // 1. Validate target is reachable
  const canReach = await canUnitMoveTo(
    unit.unit_type,
    targetX,
    targetY,
    unit.world_id,
    unit.id
  );

  if (!canReach.canMove) {
    return NextResponse.json({ error: canReach.error }, { status: 400 });
  }

  // 2. Find path (handles bridges for tanks, straight line for planes)
  const pathResult = 
    unit.unit_type === "tank"
      ? await findPathWithBridgeDetour(unit.x, unit.y, targetX, targetY, unit.world_id)
      : await findPath(unit.unit_type, unit.x, unit.y, targetX, targetY, unit.world_id);

  if (!pathResult.reachable) {
    return NextResponse.json({ error: "Target unreachable" }, { status: 400 });
  }

  // 3. Calculate movement duration based on path distance + speed
  const speed = UNIT_STATS[unit.unit_type].movementSpeed; // tiles per second
  const movementDurationMs = (pathResult.distanceTiles / speed) * 1000;

  // 4. Store movement waypoints
  const departure = new Date();
  const eta = new Date(departure.getTime() + movementDurationMs);

  await supabase
    .from("units")
    .update({
      target_x: targetX,
      target_y: targetY,
      departure_time: departure.toISOString(),
      eta_arrival_time: eta.toISOString(),
      // Store full path for server-side validation
      movement_path: JSON.stringify(pathResult.path),
    })
    .eq("id", unitId);

  // 5. Broadcast to all players in world
  // TODO: Supabase Realtime

  return NextResponse.json({
    success: true,
    unit: {
      id: unitId,
      x: unit.x,
      y: unit.y,
      targetX,
      targetY,
      etaArrivalTime: eta,
      path: pathResult.path,
    },
  });
}
```

---

## Database Schema Updates Summary

```sql
-- New table: hitbox types reference
CREATE TABLE hitbox_types (...)

-- New table: collision grid (terrain + obstacles per tile)
CREATE TABLE collision_grid (...)

-- New table: world obstacles (randomly generated)
CREATE TABLE world_obstacles (...)

-- Update existing tables:
ALTER TABLE units ADD COLUMN (
  movement_path TEXT,  -- JSON array of waypoints
  target_x INTEGER,
  target_y INTEGER,
  departure_time TIMESTAMP,
  eta_arrival_time TIMESTAMP
);

ALTER TABLE buildings ADD COLUMN (
  hitbox_radius INTEGER DEFAULT 5
);
```

---

## Unit Stats Update

### Updated UNIT_CONSTANTS (lib/game/unit-constants.ts)

```typescript
export interface UnitStats {
  maxHealth: number;
  constructionTime: number; // seconds
  cost: ResourceCost;
  movementSpeed: number; // tiles per second
  attackDamage: number;
  attackRange: number; // tiles
  hitboxRadius: number; // tiles (NEW)
}

export const UNIT_STATS = {
  tank: {
    maxHealth: 100,
    constructionTime: 30,
    cost: { metal: 50, energy: 20, carbon: 10 },
    movementSpeed: 3, // tiles per second
    attackDamage: 25,
    attackRange: 5,
    hitboxRadius: 2, // 2 tile radius
  },
  helicopter: {
    maxHealth: 60,
    constructionTime: 45,
    cost: { metal: 40, energy: 30, carbon: 5 },
    movementSpeed: 5,
    attackDamage: 20,
    attackRange: 6,
    hitboxRadius: 1.5,
  },
  plane: {
    maxHealth: 80,
    constructionTime: 60,
    cost: { metal: 60, energy: 40, carbon: 15 },
    movementSpeed: 7,
    attackDamage: 30,
    attackRange: 8,
    hitboxRadius: 2,
  },
  boat: {
    maxHealth: 90,
    constructionTime: 50,
    cost: { metal: 45, energy: 25, carbon: 20 },
    movementSpeed: 4,
    attackDamage: 22,
    attackRange: 5,
    hitboxRadius: 2,
  },
  train: {
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

---

## Performance Considerations

### Pathfinding Caching

A* pathfinding is expensive. Cache results:

```typescript
const pathfindingCache = new Map<string, PathfindingResult>();

const cacheKey = `${worldId}:${unitType}:${startX},${startY}:${targetX},${targetY}`;

if (pathfindingCache.has(cacheKey)) {
  return pathfindingCache.get(cacheKey)!;
}

const result = await findPath(...);
pathfindingCache.set(cacheKey, result);

// Clear cache every 5 minutes (obstacles may change)
setInterval(() => pathfindingCache.clear(), 5 * 60 * 1000);
```

### Grid Queries

Pre-load collision grid on game start (entire world fits in memory):

```typescript
const collisionGridCache = new Map<number, Map<string, CollisionCell>>();

// Load once at world init
const { data } = await supabase
  .from("collision_grid")
  .select("*")
  .eq("world_id", worldId);

for (const cell of data) {
  const key = `${cell.grid_x},${cell.grid_y}`;
  collisionGridCache.get(worldId)?.set(key, cell);
}
```

---

## Testing Checklist

- [ ] Tank blocked by river, finds bridge path
- [ ] Tank can move around obstacles
- [ ] Boat can only move on rivers
- [ ] Train can only move on railroad
- [ ] Helicopter ignores all collision
- [ ] Plane ignores all collision
- [ ] Unit collision detection accurate
- [ ] Building hitbox prevents unit overlap
- [ ] Pathfinding finds optimal route
- [ ] Movement completes at correct ETA
