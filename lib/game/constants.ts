// Game world constants - pure tile-based system
export const WORLD_SIZE_TILES = 5000 // World is 5000x5000 tiles
export const TILE_SIZE_PX = 64 // Each tile is 64px for rendering
export const GRASS_TILE_RADIUS = 10 // Each grass PNG covers 10x10 tiles
export const GRASS_PNG_SIZE_TILES = GRASS_TILE_RADIUS * 2 // 20x20 tiles per grass PNG
export const GRASS_PNG_SIZE_PX = GRASS_PNG_SIZE_TILES * TILE_SIZE_PX // 1280px per grass PNG

// Camera and rendering
export const DEFAULT_ZOOM = 1.0
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3.0
export const CAMERA_MOVE_SPEED = 10 // tiles per frame when using WASD

// Coordinate conversion helpers
export function tilesToPixels(tiles: number): number {
  return tiles * TILE_SIZE_PX
}

export function pixelsToTiles(pixels: number): number {
  return Math.floor(pixels / TILE_SIZE_PX)
}

// Clamp tile coordinates to world bounds
export function clampTileCoords(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(WORLD_SIZE_TILES - 1, x)),
    y: Math.max(0, Math.min(WORLD_SIZE_TILES - 1, y)),
  }
}
