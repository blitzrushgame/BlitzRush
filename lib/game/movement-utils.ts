// Movement and pathfinding utilities

export interface Position {
  x: number
  y: number
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(from: Position, to: Position): number {
  return Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
}

/**
 * Calculate movement time based on distance and speed
 */
export function calculateMovementTime(distance: number, movementSpeed: number): number {
  // Movement speed is tiles per second
  return (distance / movementSpeed) * 1000 // Return milliseconds
}

/**
 * Validate if a unit can reach the target position given its speed and time elapsed
 */
export function validateMovement(
  currentPos: Position,
  targetPos: Position,
  movementSpeed: number,
  timeElapsed: number, // in milliseconds
): boolean {
  const distance = calculateDistance(currentPos, targetPos)
  const maxDistance = (movementSpeed * timeElapsed) / 1000 // Convert ms to seconds

  // Allow a small margin for floating point errors
  return distance <= maxDistance + 0.1
}

/**
 * Calculate intermediate position during movement
 */
export function calculateIntermediatePosition(
  from: Position,
  to: Position,
  progress: number, // 0 to 1
): Position {
  return {
    x: Math.round(from.x + (to.x - from.x) * progress),
    y: Math.round(from.y + (to.y - from.y) * progress),
  }
}

/**
 * Check if position is within map bounds
 */
export function isWithinBounds(pos: Position, mapWidth = 5000, mapHeight = 5000): boolean {
  return pos.x >= 0 && pos.x < mapWidth && pos.y >= 0 && pos.y < mapHeight
}

/**
 * Simple collision detection with buildings
 */
export async function checkCollisionWithBuildings(pos: Position, worldId: number, supabase: any): Promise<boolean> {
  const { data: buildings } = await supabase
    .from("buildings")
    .select("x, y, building_type")
    .eq("world_id", worldId)
    .gte("x", pos.x - 3)
    .lte("x", pos.x + 3)
    .gte("y", pos.y - 3)
    .lte("y", pos.y + 3)

  if (!buildings || buildings.length === 0) return false

  // Check if any building is too close
  return buildings.some((building) => {
    const distance = calculateDistance(pos, { x: building.x, y: building.y })
    return distance < 2 // Minimum distance from buildings
  })
}
