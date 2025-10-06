import { Button } from "@/components/ui/button"

export function CTASection() {
  return (
    <section className="py-24 bg-primary/5">
      <div className="container text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to command your army?</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of strategists already playing StrategyForge. No downloads, no waiting - start your campaign
          now.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="text-lg px-8 py-6">
            Play Free Now
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-6 bg-transparent">
            Join Discord
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">Over 50,000 commanders already enlisted</p>
      </div>
    </section>
  )
}
