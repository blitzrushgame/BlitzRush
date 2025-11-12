# Implementation Roadmap: Event-Driven Architecture

## Phase 1: Movement System with Pathfinding (Critical for MVP)

### What's changing
- Server becomes authoritative on unit position
- Client predicts position locally for smooth visuals
- Movement completion triggers server sync
- **NEW**: Terrain-aware pathfinding (A* algorithm)
- **NEW**: Hitbox collision detection for all units/buildings/obstacles
- **NEW**: Tank river crossing logic with bridge detection
- **NEW**: Unit-specific movement constraints (boats on rivers, trains on railroads, etc.)

**See**: `.github/COLLISION_PATHFINDING_SYSTEM.md` for detailed design

### New API Endpoint: `/api/game/units/move` (Updated)

**Request**:
```typescript
{
  unitId: number,
  targetX: number,
  targetY: number
}
```

**Server logic**:
1. Validate user owns unit
2. Calculate distance from current position to target
3. Validate distance is reachable (speed * time_budget)
4. Calculate ETA (distance / speed)
5. Store: target_x, target_y, departure_time, eta_arrival_time
6. Broadcast to Realtime channel `world-{worldId}`

**Response**:
```typescript
{
  success: true,
  unit: {
    id: number,
    x: number,          // current position (not updated yet)
    y: number,
    targetX: number,    // where it's going
    targetY: number,
    departureTime: timestamp,
    etaArrivalTime: timestamp  // when server expects it to arrive
  }
}
```

**Client behavior**:
1. Receive response with ETA
2. Interpolate smoothly from current position to target
3. When local ETA is reached, lock position at target
4. When server broadcasts position update (via Realtime), apply server position

### Database changes

```sql
-- Modify units table to track movement
ALTER TABLE units ADD COLUMN (
  target_x INTEGER,
  target_y INTEGER,
  departure_time TIMESTAMP,
  eta_arrival_time TIMESTAMP
);

-- Index for cleanup queries
CREATE INDEX idx_units_eta_arrived ON units(eta_arrival_time) 
WHERE eta_arrival_time IS NOT NULL;
```

### Validation logic (lib/game/movement-utils.ts)

```typescript
export function validateMovement(
  unitType: string,
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
): { valid: boolean; error?: string; etaMs?: number } {
  // Get speed from UNIT_STATS
  const stats = UNIT_STATS[unitType];
  if (!stats) return { valid: false, error: "Invalid unit type" };

  // Calculate distance in tiles
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Clamp to world bounds
  if (targetX < 0 || targetX >= WORLD_SIZE_TILES || 
      targetY < 0 || targetY >= WORLD_SIZE_TILES) {
    return { valid: false, error: "Target outside world bounds" };
  }

  // Speed = tiles per second
  const speed = stats.movementSpeed;
  const etaSeconds = distance / speed;
  const etaMs = etaSeconds * 1000;

  // Prevent impossible speeds (anti-cheat)
  // Max 30 second movement (arbitrary safety limit)
  if (etaMs > 30000) {
    return { valid: false, error: "Target too far away" };
  }

  return { valid: true, etaMs };
}
```

### Game Tick changes (5-minute cleanup)

Instead of updating all unit positions every minute, now it only:

```typescript
async function processUnitMovementCompletion(now: Date) {
  const supabase = createServiceRoleClient();

  // Find units that should have arrived
  const { data: arrivedUnits } = await supabase
    .from("units")
    .select("*")
    .not("eta_arrival_time", "is", null)
    .lte("eta_arrival_time", now.toISOString());

  if (!arrivedUnits) return;

  for (const unit of arrivedUnits) {
    // Snap position to target
    await supabase
      .from("units")
      .update({
        x: unit.target_x,
        y: unit.target_y,
        target_x: null,
        target_y: null,
        departure_time: null,
        eta_arrival_time: null,
      })
      .eq("id", unit.id);

    // Broadcast arrival to all players in area
    // TODO: Supabase Realtime broadcast
  }
}
```

---

## Phase 2: Building Construction Redesign (Critical for MVP)

### What's changing
- Building placement is instant
- Construction progress tracked separately
- No more waiting for game tick

### New tables

```sql
CREATE TABLE building_constructions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  world_id INTEGER NOT NULL,
  building_type TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  construction_started_at TIMESTAMP DEFAULT NOW(),
  construction_duration_ms INTEGER NOT NULL,
  construction_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'complete'
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_constructions_user_world (user_id, world_id),
  INDEX idx_constructions_eta (construction_started_at, construction_duration_ms)
);
```

### New API Endpoint: `/api/game/buildings/construct`

**Request**:
```typescript
{
  worldId: number,
  buildingType: string,
  x: number,
  y: number
}
```

**Server logic**:
1. Validate building type exists
2. Validate position is on map and not occupied
3. Calculate construction duration from BUILDING_STATS
4. Deduct resources immediately (fail if insufficient)
5. Create building_constructions record
6. Broadcast to Realtime

**Response**:
```typescript
{
  success: true,
  buildingConstruction: {
    id: number,
    buildingType: string,
    x: number,
    y: number,
    startedAt: timestamp,
    durationMs: number,
    etaCompletionTime: timestamp
  }
}
```

**Client behavior**:
1. Show construction progress bar
2. When client time reaches ETA, mark visually complete
3. Wait for server confirmation via Realtime

### Game Tick changes (5-minute validation)

```typescript
async function processBuildingConstructionCompletion(now: Date) {
  const supabase = createServiceRoleClient();

  // Find constructions that should be complete
  const { data: completedConstructions } = await supabase
    .from("building_constructions")
    .select("*")
    .eq("construction_status", "in_progress")
    .lte(
      "construction_started_at", 
      `${now.toISOString()} - INTERVAL '${MAX_CONSTRUCTION_DURATION_SECONDS} seconds'`
    );

  if (!completedConstructions) return;

  for (const construction of completedConstructions) {
    // Create actual building in buildings table
    const building = await supabase.from("buildings").insert({
      user_id: construction.user_id,
      world_id: construction.world_id,
      building_type: construction.building_type,
      x: construction.x,
      y: construction.y,
      level: 1,
      health: BUILDING_STATS[construction.building_type].maxHealth,
      production_queue: [],
    });

    // Mark construction complete
    await supabase
      .from("building_constructions")
      .update({ construction_status: "complete" })
      .eq("id", construction.id);

    // Broadcast completion
    // TODO: Supabase Realtime broadcast
  }
}
```

---

## Phase 3: Resource Generation (Can follow in patch)

### What's changing
- Production calculations happen client-side
- Server validates periodically, doesn't calculate every tick

### Client-side math (new hook: `use-resource-production.ts`)

```typescript
export function useResourceProduction(buildings: Building[]) {
  // Calculate production rate (resources per second)
  const productionRates = useMemo(() => {
    let rates = { ...BASE_PRODUCTION_RATES };

    buildings.forEach((building) => {
      const bonus = BUILDING_PRODUCTION_BONUS[building.building_type];
      if (bonus) {
        Object.entries(bonus).forEach(([resource, multiplier]) => {
          rates[resource] *= multiplier * building.level;
        });
      }
    });

    return rates;
  }, [buildings]);

  // Track accumulated resources
  const [accumulatedResources, setAccumulatedResources] = useState({
    concrete: 0,
    steel: 0,
    carbon: 0,
    fuel: 0,
  });

  useEffect(() => {
    const lastUpdateRef = useRef(Date.now());

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastUpdateRef.current) / 1000;

      setAccumulatedResources((prev) => ({
        concrete: prev.concrete + productionRates.concrete * deltaSeconds,
        steel: prev.steel + productionRates.steel * deltaSeconds,
        carbon: prev.carbon + productionRates.carbon * deltaSeconds,
        fuel: prev.fuel + productionRates.fuel * deltaSeconds,
      }));

      lastUpdateRef.current = now;
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [productionRates]);

  return accumulatedResources;
}
```

### Server validation (every 5 minutes)

```typescript
export async function validateResourceProduction(userId: number, worldId: number) {
  const supabase = createServiceRoleClient();

  // Get user's current resources and last validated time
  const { data: gameState } = await supabase
    .from("user_game_states")
    .select("game_data, last_validated_at")
    .eq("user_id", userId)
    .eq("world_id", worldId)
    .single();

  if (!gameState) return;

  // Calculate what production should be
  const expectedProduction = await calculateProductionRates(userId, worldId);
  const lastValidated = new Date(gameState.last_validated_at || gameState.created_at);
  const hoursElapsed = (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60);

  const expectedResources = {
    concrete: expectedProduction.concrete * hoursElapsed,
    steel: expectedProduction.steel * hoursElapsed,
    carbon: expectedProduction.carbon * hoursElapsed,
    fuel: expectedProduction.fuel * hoursElapsed,
  };

  // If client is way off, correct it
  const clientResources = gameState.game_data.resources;
  const tolerance = 0.1; // 10% tolerance

  for (const resource of ['concrete', 'steel', 'carbon', 'fuel']) {
    const diff = Math.abs(
      clientResources[resource] - expectedResources[resource]
    ) / expectedResources[resource];

    if (diff > tolerance) {
      // Cheating detected or significant desync, correct it
      clientResources[resource] = Math.min(
        expectedResources[resource],
        STORAGE_CAPACITY[resource]
      );
    }
  }

  // Update validation timestamp
  await supabase
    .from("user_game_states")
    .update({
      game_data: gameState.game_data,
      last_validated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("world_id", worldId);
}
```

---

## Phase 4: Fog of War System (Post-launch feature)

### New tables

```sql
CREATE TABLE fog_of_war (
  id SERIAL PRIMARY KEY,
  alliance_id INTEGER NOT NULL REFERENCES alliances(id),
  world_id INTEGER NOT NULL,
  center_x INTEGER NOT NULL,
  center_y INTEGER NOT NULL,
  radius_tiles INTEGER NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_fog_alliance_world (alliance_id, world_id)
);

CREATE TABLE building_visibility (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id),
  alliance_id INTEGER NOT NULL REFERENCES alliances(id),
  is_visible BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### Building visibility check (in canvas rendering)

```typescript
function getBuildingVisibility(building: Building, playerAlliance: Alliance) {
  // Check if building is in any fog of war area the alliance controls
  const fog = await supabase
    .from("fog_of_war")
    .select("*")
    .eq("alliance_id", playerAlliance.id)
    .eq("world_id", currentWorld);

  for (const fogArea of fog) {
    const distance = Math.sqrt(
      Math.pow(building.x - fogArea.center_x, 2) +
      Math.pow(building.y - fogArea.center_y, 2)
    );

    if (distance <= fogArea.radius_tiles) {
      return { visible: true, details: true };
    }
  }

  // Building is not in fog, show generic icon
  return { visible: false, details: false, genericIcon: true };
}
```

---

## Implementation Order for MVP Launch

### Priority 1 (Must have for release)
1. ✅ Combat system (already done)
2. ⏳ Movement system redesign
3. ⏳ Building construction redesign

### Priority 2 (Post-launch patches)
4. Resource generation optimization
5. Fog of war system

### Priority 3 (Scaling for 10k MAU)
6. Database connection pooling
7. Redis caching layer
8. Multi-world sharding

---

## Testing Checklist

### Movement System
- [ ] Unit moves and reaches target at correct ETA
- [ ] Client interpolation doesn't exceed bounds
- [ ] Position syncs exactly when movement completes
- [ ] Movement cancellation works
- [ ] Anti-cheat: Can't move unit > speed limit

### Building Construction
- [ ] Building placed instantly
- [ ] Resources deducted immediately
- [ ] Construction progress visible
- [ ] Building completes at correct ETA
- [ ] Cannot place building on occupied space
- [ ] Cannot build if insufficient resources

### Realtime Broadcasts
- [ ] Other players see unit start moving
- [ ] Other players see unit arrive
- [ ] Other players see building construction start
- [ ] Other players see building completion
