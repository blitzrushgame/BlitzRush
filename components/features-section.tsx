import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function FeaturesSection() {
  const features = [
    {
      title: "Custom WebGL Engine",
      description: "Built from the ground up for maximum performance and visual fidelity in the browser.",
      icon: "⚡",
    },
    {
      title: "Real-time Multiplayer",
      description: "Command armies alongside friends in massive multiplayer battles with low latency.",
      icon: "🌐",
    },
    {
      title: "Advanced AI",
      description: "Challenge sophisticated AI opponents that adapt to your strategies and playstyle.",
      icon: "🤖",
    },
    {
      title: "Dynamic Campaigns",
      description: "Experience procedurally generated campaigns with unique objectives and storylines.",
      icon: "📜",
    },
    {
      title: "Cross-Platform",
      description: "Play seamlessly across desktop, tablet, and mobile devices without compromise.",
      icon: "📱",
    },
    {
      title: "Mod Support",
      description: "Create and share custom units, maps, and game modes with our built-in editor.",
      icon: "🔧",
    },
  ]

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Revolutionary RTS Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powered by cutting-edge web technology to deliver console-quality gaming in your browser
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
