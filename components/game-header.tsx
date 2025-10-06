import { Button } from "@/components/ui/button"

export function GameHeader() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">RTS</span>
          </div>
          <span className="font-bold text-xl">StrategyForge</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#gameplay" className="text-muted-foreground hover:text-foreground transition-colors">
            Gameplay
          </a>
          <a href="#technology" className="text-muted-foreground hover:text-foreground transition-colors">
            Technology
          </a>
          <a href="#community" className="text-muted-foreground hover:text-foreground transition-colors">
            Community
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            Log in
          </Button>
          <Button size="sm">Play Now</Button>
        </div>
      </div>
    </header>
  )
}
