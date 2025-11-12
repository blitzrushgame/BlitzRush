// Seeded random number generator for reproducible procedural generation
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  // Deterministic random number between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  // Random integer between min and max
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  // Random float between min and max
  float(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  // Random choice from array
  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }

  // Random boolean with probability
  boolean(probability = 0.5): boolean {
    return this.next() < probability
  }
}

// Improved Perlin noise for smooth terrain generation
export class PerlinNoise {
  private permutation: number[]
  private p: number[]

  constructor(seed: number) {
    this.permutation = this.buildPermutationTable(seed)
    this.p = [...this.permutation, ...this.permutation]
  }

  private buildPermutationTable(seed: number): number[] {
    const p: number[] = Array.from({ length: 256 }, (_, i) => i)
    const rng = new SeededRandom(seed)

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }

    return p
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 8 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise(x: number, y: number): number {
    const xi = Math.floor(x) & 255
    const yi = Math.floor(y) & 255

    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)

    const u = this.fade(xf)
    const v = this.fade(yf)

    const a = this.p[xi] + yi
    const aa = this.p[a]
    const ab = this.p[a + 1]
    const b = this.p[xi + 1] + yi
    const ba = this.p[b]
    const bb = this.p[b + 1]

    const x1 = this.lerp(u, this.grad(this.p[aa], xf, yf), this.grad(this.p[ba], xf - 1, yf))
    const x2 = this.lerp(u, this.grad(this.p[ab], xf, yf - 1), this.grad(this.p[bb], xf - 1, yf - 1))

    return this.lerp(v, x1, x2)
  }
}

// Fractional Brownian Motion for natural-looking features
export function fbm(noise: PerlinNoise, x: number, y: number, octaves = 4, persistence = 0.5, scale = 0.5): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise.noise(x * frequency, y * frequency)
    maxValue += amplitude
    amplitude *= persistence
    frequency *= 2
  }

  return value / maxValue
}
