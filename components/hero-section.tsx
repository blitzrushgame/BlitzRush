import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="container relative z-10 text-center">
        <Badge variant="secondary" className="mb-6">
          New: Custom WebGL Rendering Engine
        </Badge>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance">
          Command your forces in the <span className="text-primary">ultimate browser RTS</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance">
          Experience real-time strategy gaming like never before with our custom rendering engine. Build, command, and
          conquer entirely in your browser.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="text-lg px-8 py-6">
            PLAY
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent">
            Watch Trailer
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">No downloads required • Runs in any modern browser</p>
      </div>
    </section>
  )
}
