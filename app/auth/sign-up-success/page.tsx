import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background image with fade and vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: "url('/images/tank-background.png')",
        }}
      />
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/60" />

      {/* Main content */}
      <div className="relative z-10">
        <Card className="bg-neutral-800/40 backdrop-blur-md border-neutral-600/30 w-96">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Mission Briefing Sent!</CardTitle>
            <CardDescription className="text-neutral-400">Check your email to confirm deployment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-300 text-center">
              You've successfully enlisted in BLITZ RUSH. Check your email to confirm your account and begin your first
              campaign.
            </p>
            <Button asChild className="w-full bg-amber-500 hover:bg-amber-600">
              <Link href="/auth/login">Return to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
