import { SeededRandom } from "./noise"
import type { River, Railroad, BaseZone, Point } from "./world-generator"

export interface BaseSpawnConfig {
  mapSize: number
  groundBasePercentage: number // 0.80 = 80%
  heliBasesTarget: number // 20-30
  airBasesTotal: number // 6 total
  navalBasesTotal: number // 10 total
  trainBasesTotal: number // 10 total
}

export interface BaseSpawnResult {
  zones: BaseZone[]
  totalExpectedBases: number
  baseTypeDistribution: {
    ground: number
    heli: number
    air: number
    naval: number
    train: number
  }
}

export class BaseSpawner {
  private rng: SeededRandom
  private config: BaseSpawnConfig
  private mapSize: number

  constructor(seed: number, config: BaseSpawnConfig) {
    this.rng = new SeededRandom(seed)
    this.config = config
    this.mapSize = config.mapSize
  }

  generateBaseZones(rivers: River[], railroads: Railroad[]): BaseSpawnResult {
    const zones: BaseZone[] = []
    const distribution = {
      ground: 0,
      heli: 0,
      air: 0,
      naval: 0,
      train: 0,
    }

    // STARTUP BASES: 1 heli + ground bases in center
    const startupZone = this.createStartupZone()
    zones.push(...startupZone)
    distribution.heli += 1
    distribution.ground += this.rng.range(6, 10)

    // HELI BASES: Spawn at startup and then dynamically
    // Will spawn 1 at start (done above) + 1 every 5-6 ground bases (handled in dynamic scaling)
    // For initial generation, place first round at railroad junctions
    const heliZones = this.createHeliBaseZones(railroads, Math.ceil(this.config.heliBasesTarget * 0.3))
    zones.push(...heliZones)
    distribution.heli += heliZones.length

    // NAVAL & TRAIN BASES: One every 3 heli bases (but cap at target)
    // For initial generation, place along rivers and railroads
    const navalZones = this.createNavalBaseZones(rivers, this.config.navalBasesTotal)
    zones.push(...navalZones)
    distribution.naval += navalZones.length

    const trainZones = this.createTrainBaseZones(railroads, this.config.trainBasesTotal)
    zones.push(...trainZones)
    distribution.train += trainZones.length

    // AIR BASES: Milestone-based (50%, 75%, 90% completion)
    // For initial generation, place 2 in open areas
    const airZones = this.createAirBaseZones(2)
    zones.push(...airZones)
    distribution.air += airZones.length

    // GROUND BASES: Fill remaining to reach 80% of total
    // Calculate total from special bases first
    const specialBasesCount = distribution.heli + distribution.air + distribution.naval + distribution.train
    const totalTargetBases = Math.ceil(specialBasesCount / (1 - this.config.groundBasePercentage))
    const groundBasesNeeded = Math.ceil(totalTargetBases * this.config.groundBasePercentage) - distribution.ground

    const groundZones = this.createGroundBaseZones(groundBasesNeeded, [startupZone[0]])
    zones.push(...groundZones)
    distribution.ground += groundZones.length

    const totalExpectedBases = Object.values(distribution).reduce((a, b) => a + b, 0)

    return {
      zones,
      totalExpectedBases,
      baseTypeDistribution: distribution,
    }
  }

  private createStartupZone(): BaseZone[] {
    // Startup zone in center of map with mixed bases
    const centerX = this.mapSize / 2
    const centerY = this.mapSize / 2

    return [
      {
        id: `zone-startup-ground`,
        zoneType: "standard",
        centerX,
        centerY,
        radius: 400,
        baseCount: this.rng.range(6, 10),
        specialization: "ground",
      },
      {
        id: `zone-startup-heli`,
        zoneType: "standard",
        centerX,
        centerY: centerY - 300,
        radius: 150,
        baseCount: 1,
        specialization: "heli",
      },
    ]
  }

  private createHeliBaseZones(railroads: Railroad[], count: number): BaseZone[] {
    const zones: BaseZone[] = []

    // Place heli bases near railroad junctions and important nodes
    const importantPoints = this.extractImportantRailroadPoints(railroads)

    for (let i = 0; i < Math.min(count, importantPoints.length); i++) {
      const point = importantPoints[i]

      zones.push({
        id: `zone-heli-${i}`,
        zoneType: "railroad_hub",
        centerX: point.x + this.rng.float(-100, 100),
        centerY: point.y + this.rng.float(-100, 100),
        radius: 150,
        associatedFeatureId: `railroad-${i}`,
        baseCount: 1,
        specialization: "heli",
      })
    }

    return zones
  }

  private createNavalBaseZones(rivers: River[], count: number): BaseZone[] {
    const zones: BaseZone[] = []

    // Sample points along river (not at start/end)
    for (const river of rivers) {
      const riverPoints = this.samplePointsAlongPath(river.pathPoints, Math.min(count, 5), true)

      for (let i = 0; i < riverPoints.length && zones.length < count; i++) {
        const point = riverPoints[i]

        zones.push({
          id: `zone-naval-${zones.length}`,
          zoneType: "river_dock",
          centerX: point.x,
          centerY: point.y,
          radius: 180,
          associatedFeatureId: river.id,
          baseCount: 1,
          specialization: "naval",
        })
      }
    }

    return zones
  }

  private createTrainBaseZones(railroads: Railroad[], count: number): BaseZone[] {
    const zones: BaseZone[] = []

    // Place train bases along railroads
    for (const railroad of railroads) {
      // Sample 2-3 points per railroad
      const sampledCount = Math.min(2, count - zones.length)
      if (sampledCount <= 0) break

      const trainPoints = this.samplePointsAlongPath(railroad.pathPoints, sampledCount, false)

      for (const point of trainPoints) {
        zones.push({
          id: `zone-train-${zones.length}`,
          zoneType: "railroad_hub",
          centerX: point.x,
          centerY: point.y,
          radius: 150,
          associatedFeatureId: railroad.id,
          baseCount: 1,
          specialization: "train",
        })
      }
    }

    return zones
  }

  private createAirBaseZones(count: number): BaseZone[] {
    const zones: BaseZone[] = []

    // Air bases in open areas, far from other infrastructure
    for (let i = 0; i < count; i++) {
      let point: Point
      let attempts = 0

      // Keep trying until we find an open area
      do {
        point = {
          x: this.rng.float(this.mapSize * 0.15, this.mapSize * 0.85),
          y: this.rng.float(this.mapSize * 0.15, this.mapSize * 0.85),
        }
        attempts++
      } while (attempts < 10 && this.isTooCloseToOther(point, zones, 400))

      zones.push({
        id: `zone-air-${i}`,
        zoneType: "air_field",
        centerX: point.x,
        centerY: point.y,
        radius: 300,
        baseCount: 1,
        specialization: "air",
      })
    }

    return zones
  }

  private createGroundBaseZones(totalCount: number, excludeZones: BaseZone[]): BaseZone[] {
    const zones: BaseZone[] = []

    // Divide map into regions for even distribution
    const regionCount = Math.ceil(Math.sqrt(totalCount / 15)) // ~15 bases per region
    const regionSize = this.mapSize / regionCount

    for (let rx = 0; rx < regionCount; rx++) {
      for (let ry = 0; ry < regionCount; ry++) {
        const regionX = rx * regionSize
        const regionY = ry * regionSize

        // Distribute bases in this region
        const basesInRegion = Math.ceil(totalCount / (regionCount * regionCount))

        for (let i = 0; i < basesInRegion && zones.length < totalCount; i++) {
          const centerX = regionX + this.rng.float(0, regionSize)
          const centerY = regionY + this.rng.float(0, regionSize)

          const point = {
            x: Math.max(0, Math.min(this.mapSize, centerX)),
            y: Math.max(0, Math.min(this.mapSize, centerY)),
          }

          // Make sure not too close to special zones
          if (!this.isTooCloseToOther(point, excludeZones, 300)) {
            zones.push({
              id: `zone-ground-${zones.length}`,
              zoneType: "standard",
              centerX: point.x,
              centerY: point.y,
              radius: 200,
              baseCount: this.rng.range(5, 12),
              specialization: "ground",
            })
          }
        }
      }
    }

    return zones
  }

  private extractImportantRailroadPoints(railroads: Railroad[]): Point[] {
    const points: Point[] = []

    for (const railroad of railroads) {
      // Get start, end, and middle points
      if (railroad.pathPoints.length > 0) {
        points.push(railroad.pathPoints[0])
        points.push(railroad.pathPoints[Math.floor(railroad.pathPoints.length / 2)])
        points.push(railroad.pathPoints[railroad.pathPoints.length - 1])
      }
    }

    return points
  }

  private samplePointsAlongPath(pathPoints: Point[], count: number, excludeEnds = false): Point[] {
    const result: Point[] = []

    const startIdx = excludeEnds ? Math.floor(pathPoints.length * 0.2) : 0
    const endIdx = excludeEnds ? Math.floor(pathPoints.length * 0.8) : pathPoints.length - 1

    const spacing = Math.floor((endIdx - startIdx) / Math.max(1, count - 1))

    for (let i = 0; i < count && startIdx + i * spacing <= endIdx; i++) {
      result.push(pathPoints[startIdx + i * spacing])
    }

    return result
  }

  private isTooCloseToOther(point: Point, zones: BaseZone[], minDistance: number): boolean {
    for (const zone of zones) {
      const dx = zone.centerX - point.x
      const dy = zone.centerY - point.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        return true
      }
    }

    return false
  }
}

// Dynamic spawning calculation for ongoing gameplay
export function calculateDynamicSpawns(
  totalBases: number,
  claimedBases: number,
  heliBaseCount: number,
  airBaseCount: number,
  completionPercentage: number,
): {
  heliSpawn: number
  airSpawn: number
  navalSpawn: number
  trainSpawn: number
  groundSpawn: number
} {
  const unclaimed = totalBases - claimedBases
  const targetUnclaimedPercentage = 0.15
  const targetUnclaimedCount = totalBases * targetUnclaimedPercentage

  // HELI: 1 every 5-6 ground bases
  const groundBases = totalBases * 0.8
  const expectedHeliCount = Math.ceil(1 + groundBases / 5.5)
  const heliSpawn = Math.max(0, Math.min(1, expectedHeliCount - heliBaseCount))

  // AIR: Milestone-based
  let airSpawn = 0
  if (completionPercentage >= 50 && airBaseCount < 2) {
    airSpawn = 2 - airBaseCount
  } else if (completionPercentage >= 75 && airBaseCount < 4) {
    airSpawn = 2
  } else if (completionPercentage >= 90 && airBaseCount < 6) {
    airSpawn = 2
  }

  // NAVAL & TRAIN: 1 every 3 heli bases
  const expectedNavalCount = Math.floor(heliBaseCount / 3)
  const navalSpawn = Math.max(0, expectedNavalCount - Math.floor(totalBases * 0.05))

  const trainSpawn = navalSpawn // Same logic

  // GROUND: Fill remaining if unclaimed is below threshold
  let groundSpawn = 0
  if (unclaimed < targetUnclaimedCount) {
    groundSpawn = Math.ceil(targetUnclaimedCount - unclaimed)
  }

  return {
    heliSpawn: Math.floor(heliSpawn),
    airSpawn: Math.floor(airSpawn),
    navalSpawn: Math.floor(navalSpawn),
    trainSpawn: Math.floor(trainSpawn),
    groundSpawn: Math.floor(groundSpawn),
  }
}
