import { SeededRandom, PerlinNoise } from "./noise"

export interface Point {
  x: number
  y: number
}

export interface River {
  id: string
  index: number
  pathPoints: Point[]
  width: number
  flowDirection: number
  totalLength: number
}

export interface Railroad {
  id: string
  index: number
  pathPoints: Point[]
  type: "trunk" | "branch"
  totalLength: number
}

export interface Bridge {
  position: Point
  railroadId: string
  riverId: string
  rotation: number
}

export interface BaseZone {
  id: string
  zoneType: "standard" | "railroad_hub" | "river_dock" | "air_field" | "capital"
  centerX: number
  centerY: number
  radius: number
  associatedFeatureId?: string
  baseCount: number
  specialization?: string
}

export interface GeneratedWorld {
  seed: number
  mapSize: number
  rivers: River[]
  railroads: Railroad[]
  bridges: Bridge[]
  zones: BaseZone[]
}

export class WorldGenerator {
  private seed: number
  private mapSize: number
  private rng: SeededRandom
  private noise: PerlinNoise

  constructor(seed: number, mapSize = 5000) {
    this.seed = seed
    this.mapSize = mapSize
    this.rng = new SeededRandom(seed)
    this.noise = new PerlinNoise(seed)
  }

  async generateCompleteWorld(): Promise<GeneratedWorld> {
    console.log(`[WorldGen] Starting world generation with seed: ${this.seed}`)

    const rivers = this.generateRivers()
    const railroads = this.generateRailroads()
    const bridges = this.computeBridges(rivers, railroads)

    console.log(
      `[WorldGen] Generated ${rivers.length} rivers, ${railroads.length} railroads, ${bridges.length} bridges`,
    )

    return {
      seed: this.seed,
      mapSize: this.mapSize,
      rivers,
      railroads,
      bridges,
      zones: [],
    }
  }

  private generateRivers(): River[] {
    const rivers: River[] = []
    const riverCount = this.rng.range(1, 1) // Single river

    for (let i = 0; i < riverCount; i++) {
      const startEdge = this.rng.choice(["top", "left", "right", "bottom"] as const)
      const startPoint = this.getEdgePoint(startEdge)

      const path = this.generateRiverPath(startPoint)

      rivers.push({
        id: `river-${i}`,
        index: i,
        pathPoints: this.decimatePath(path, 10),
        width: this.rng.float(12, 20),
        flowDirection: this.calculateFlowDirection(path),
        totalLength: this.calculatePathLength(path),
      })
    }

    return rivers
  }

  private generateRiverPath(start: Point): Point[] {
    const targetLength = this.rng.float(this.mapSize * 1.3, this.mapSize * 2.0)
    const path: Point[] = []
    const current = { ...start }
    let currentLength = 0
    let direction = this.rng.float(0, Math.PI * 2)

    while (currentLength < targetLength && this.isInBounds(current)) {
      path.push({ ...current })

      // Perlin noise creates smooth curves
      const noiseValue = this.noise.noise(current.x / 300, current.y / 300)
      direction += (noiseValue - 0.5) * 0.15

      const stepSize = 5
      current.x += Math.cos(direction) * stepSize
      current.y += Math.sin(direction) * stepSize
      currentLength += stepSize
    }

    return path
  }

  private generateRailroads(): Railroad[] {
    const railroads: Railroad[] = []
    const targetTotalLength = this.rng.float(this.mapSize * 7.0, this.mapSize * 8.0)
    let totalLength = 0

    // Generate trunk lines
    const trunkCount = this.rng.range(4, 6)
    const edges = ["top", "bottom", "left", "right"] as const

    for (let i = 0; i < trunkCount; i++) {
      const startEdge = edges[i % edges.length]
      const startPoint = this.getEdgePoint(startEdge)
      const endPoint = this.getRandomInteriorPoint()

      const path = this.generateRailroadPath(startPoint, endPoint)

      railroads.push({
        id: `railroad-trunk-${i}`,
        index: i,
        pathPoints: this.decimatePath(path, 15),
        type: "trunk",
        totalLength: this.calculatePathLength(path),
      })

      totalLength += this.calculatePathLength(path)
    }

    // Add branch lines until target length reached
    while (totalLength < targetTotalLength && railroads.length < 20) {
      const parentRailroad = this.rng.choice(railroads)
      const branchStartIdx = this.rng.range(0, parentRailroad.pathPoints.length - 1)
      const branchStart = parentRailroad.pathPoints[branchStartIdx]

      const angle = this.rng.float(0, Math.PI * 2)
      const distance = this.rng.float(300, 600)

      const branchEnd = {
        x: Math.max(0, Math.min(this.mapSize, branchStart.x + Math.cos(angle) * distance)),
        y: Math.max(0, Math.min(this.mapSize, branchStart.y + Math.sin(angle) * distance)),
      }

      const branchPath = this.generateRailroadPath(branchStart, branchEnd)
      const branchLength = this.calculatePathLength(branchPath)

      railroads.push({
        id: `railroad-branch-${railroads.length}`,
        index: railroads.length,
        pathPoints: this.decimatePath(branchPath, 15),
        type: "branch",
        totalLength: branchLength,
      })

      totalLength += branchLength
    }

    return railroads
  }

  private generateRailroadPath(start: Point, end: Point): Point[] {
    // A* pathfinding with curves
    const path: Point[] = [start]
    const current = { ...start }
    const stepSize = 5
    let steps = 0
    const maxSteps = (this.distance(start, end) / stepSize) * 1.5

    while (this.distance(current, end) > stepSize * 2 && steps < maxSteps) {
      // Direction toward end + noise
      const dirToEnd = Math.atan2(end.y - current.y, end.x - current.x)
      const noiseValue = this.noise.noise(current.x / 200, current.y / 200)
      const curve = (noiseValue - 0.5) * 0.2
      const direction = dirToEnd + curve

      current.x += Math.cos(direction) * stepSize
      current.y += Math.sin(direction) * stepSize

      // Keep in bounds
      current.x = Math.max(0, Math.min(this.mapSize, current.x))
      current.y = Math.max(0, Math.min(this.mapSize, current.y))

      path.push({ ...current })
      steps++
    }

    path.push(end)
    return path
  }

  private computeBridges(rivers: River[], railroads: Railroad[]): Bridge[] {
    const bridges: Bridge[] = []
    const targetBridgeCount = 13

    // Find all intersections
    const intersections: Array<{ point: Point; river: River; railroad: Railroad }> = []

    for (const river of rivers) {
      for (const railroad of railroads) {
        for (let i = 0; i < river.pathPoints.length - 1; i++) {
          for (let j = 0; j < railroad.pathPoints.length - 1; j++) {
            const intersection = this.lineIntersection(
              river.pathPoints[i],
              river.pathPoints[i + 1],
              railroad.pathPoints[j],
              railroad.pathPoints[j + 1],
            )

            if (intersection) {
              intersections.push({ point: intersection, river, railroad })
            }
          }
        }
      }
    }

    // Distribute bridges evenly
    const spacing = Math.max(1, Math.floor(intersections.length / targetBridgeCount))
    for (let i = 0; i < intersections.length && bridges.length < targetBridgeCount; i += spacing) {
      const inter = intersections[i]
      bridges.push({
        position: inter.point,
        railroadId: inter.railroad.id,
        riverId: inter.river.id,
        rotation: this.calculateAngle(inter.railroad.pathPoints[0], inter.railroad.pathPoints[1]),
      })
    }

    return bridges
  }

  private decimatePath(path: Point[], factor: number): Point[] {
    return path.filter((_, i) => i % factor === 0)
  }

  private calculatePathLength(path: Point[]): number {
    let length = 0
    for (let i = 0; i < path.length - 1; i++) {
      length += this.distance(path[i], path[i + 1])
    }
    return length
  }

  private calculateFlowDirection(path: Point[]): number {
    if (path.length < 2) return 0
    return this.calculateAngle(path[0], path[path.length - 1])
  }

  private calculateAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private getEdgePoint(edge: "top" | "bottom" | "left" | "right"): Point {
    switch (edge) {
      case "top":
        return { x: this.rng.float(0, this.mapSize), y: 0 }
      case "bottom":
        return { x: this.rng.float(0, this.mapSize), y: this.mapSize }
      case "left":
        return { x: 0, y: this.rng.float(0, this.mapSize) }
      case "right":
        return { x: this.mapSize, y: this.rng.float(0, this.mapSize) }
    }
  }

  private getRandomInteriorPoint(): Point {
    return {
      x: this.rng.float(this.mapSize * 0.2, this.mapSize * 0.8),
      y: this.rng.float(this.mapSize * 0.2, this.mapSize * 0.8),
    }
  }

  private isInBounds(point: Point): boolean {
    return point.x >= 0 && point.x <= this.mapSize && point.y >= 0 && point.y <= this.mapSize
  }

  private lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const x1 = p1.x,
      y1 = p1.y,
      x2 = p2.x,
      y2 = p2.y
    const x3 = p3.x,
      y3 = p3.y,
      x4 = p4.x,
      y4 = p4.y

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 0.0001) return null

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      }
    }

    return null
  }
}
