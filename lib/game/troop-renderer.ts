// Troop rendering system with layered hull + turret sprites

export interface TroopSprite {
  hull: HTMLImageElement | null
  turret: HTMLImageElement | null
  frameCount: number
  frameWidth: number
  frameHeight: number
  loaded: boolean
}

export interface TroopRenderData {
  x: number // Tile coordinates
  y: number // Tile coordinates
  hullRotation: number // 0-71 (direction of movement)
  turretRotation: number // 0-71 (direction turret is aiming)
  scale?: number // Optional scale multiplier
}

export class TroopRenderer {
  private sprites: Map<string, TroopSprite> = new Map()

  constructor() {
    this.loadHowitzerSprites()
    this.loadAPCSprites()
  }

  private loadHowitzerSprites() {
    const howitzerSprite: TroopSprite = {
      hull: null,
      turret: null,
      frameCount: 72,
      frameWidth: 512,
      frameHeight: 512,
      loaded: false,
    }

    // Load hull spritesheet
    const hullImg = new Image()
    hullImg.crossOrigin = "anonymous"
    hullImg.onload = () => {
      console.log("[v0] Howitzer hull spritesheet loaded")
      howitzerSprite.hull = hullImg
      this.checkHowitzerLoaded(howitzerSprite)
    }
    hullImg.onerror = () => {
      console.error("[v0] Failed to load Howitzer hull spritesheet")
    }
    hullImg.src = "/images/BlitzRushArt/BlitzRush_HowitzerHull.png"

    // Load turret spritesheet
    const turretImg = new Image()
    turretImg.crossOrigin = "anonymous"
    turretImg.onload = () => {
      console.log("[v0] Howitzer turret spritesheet loaded")
      howitzerSprite.turret = turretImg
      this.checkHowitzerLoaded(howitzerSprite)
    }
    turretImg.onerror = () => {
      console.error("[v0] Failed to load Howitzer turret spritesheet")
    }
    turretImg.src = "/images/BlitzRushArt/BlitzRush_HowitzerTurret.png"

    this.sprites.set("howitzer", howitzerSprite)
  }

  private checkHowitzerLoaded(sprite: TroopSprite) {
    if (sprite.hull && sprite.turret) {
      sprite.loaded = true
      console.log("[v0] Howitzer sprites fully loaded and ready")
    }
  }

  private loadAPCSprites() {
    const apcSprite: TroopSprite = {
      hull: null,
      turret: null,
      frameCount: 72,
      frameWidth: 512,
      frameHeight: 512,
      loaded: false,
    }

    // Load APC spritesheet (single image with all rotations)
    const apcImg = new Image()
    apcImg.crossOrigin = "anonymous"
    apcImg.onload = () => {
      console.log("[v0] APC spritesheet loaded")
      apcSprite.hull = apcImg
      apcSprite.turret = apcImg // Use same image for both hull and turret
      apcSprite.loaded = true
      console.log("[v0] APC sprites fully loaded and ready")
    }
    apcImg.onerror = () => {
      console.error("[v0] Failed to load APC spritesheet")
    }
    apcImg.src = "/images/BlitzRushArt/BlitzRush_APC.png"

    this.sprites.set("apc", apcSprite)
  }

  public renderTroop(
    ctx: CanvasRenderingContext2D,
    troopType: string,
    renderData: TroopRenderData,
    camera: { x: number; y: number; zoom: number },
    canvasWidth: number,
    canvasHeight: number,
  ) {
    const sprite = this.sprites.get(troopType)
    if (!sprite || !sprite.loaded || !sprite.hull) {
      return
    }

    const TILE_SIZE_PX = 64
    const scale = (renderData.scale || 1.0) * camera.zoom
    const renderWidth = sprite.frameWidth * scale
    const renderHeight = sprite.frameHeight * scale

    // Calculate screen position
    const screenX = (renderData.x - camera.x) * TILE_SIZE_PX * camera.zoom + canvasWidth / 2
    const screenY = (renderData.y - camera.y) * TILE_SIZE_PX * camera.zoom + canvasHeight / 2

    // Clamp rotations to valid frame range
    const hullFrame = Math.floor(renderData.hullRotation) % sprite.frameCount
    const turretFrame = Math.floor(renderData.turretRotation) % sprite.frameCount

    // Calculate source rectangle for hull frame
    const hullSourceX = hullFrame * sprite.frameWidth
    const hullSourceY = 0

    // For APC, turret rendering depends on sprite structure
    let turretSourceX = 0
    let turretSourceY = 0

    if (troopType === "apc") {
      // APC only uses single image, no turret layer
      ctx.drawImage(
        sprite.hull,
        hullSourceX,
        hullSourceY,
        sprite.frameWidth,
        sprite.frameHeight,
        screenX - renderWidth / 2,
        screenY - renderHeight / 2,
        renderWidth,
        renderHeight,
      )
    } else {
      // Howitzer rendering (original code)
      turretSourceX = turretFrame * sprite.frameWidth
      turretSourceY = 0

      // Draw hull (base layer)
      ctx.drawImage(
        sprite.hull,
        hullSourceX,
        hullSourceY,
        sprite.frameWidth,
        sprite.frameHeight,
        screenX - renderWidth / 2,
        screenY - renderHeight / 2,
        renderWidth,
        renderHeight,
      )

      // Draw turret (top layer)
      if (sprite.turret) {
        ctx.drawImage(
          sprite.turret,
          turretSourceX,
          turretSourceY,
          sprite.frameWidth,
          sprite.frameHeight,
          screenX - renderWidth / 2,
          screenY - renderHeight / 2,
          renderWidth,
          renderHeight,
        )
      }
    }
  }

  public isLoaded(troopType: string): boolean {
    const sprite = this.sprites.get(troopType)
    return sprite?.loaded || false
  }
}
