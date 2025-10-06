import { Badge } from "@/components/ui/badge"

export function TechSection() {
  const stats = [
    { value: "60 FPS", label: "Smooth gameplay" },
    { value: "1000+", label: "Units on screen" },
    { value: "WebGL 2.0", label: "Graphics API" },
    { value: "< 100ms", label: "Network latency" },
  ]

  return (
    <section id="technology" className="py-24">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4">
              Technical Excellence
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">The complete platform to build the ultimate RTS</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Our custom rendering engine delivers unprecedented performance in the browser. Built with modern web
              standards, optimized for strategy gaming, and designed to scale from mobile to desktop.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-card border border-border rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h3 className="text-xl font-semibold mb-2">Game Engine Preview</h3>
                <p className="text-muted-foreground">Interactive demo coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
