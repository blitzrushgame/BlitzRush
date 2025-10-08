import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Mission Briefing Sent!</CardTitle>
            <CardDescription className="text-slate-300">Check your email to confirm deployment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 text-center">
              You're successfully enlisted in BLITZ RUSH. Check your email to confirm your account creation and begin your first
              campaign.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
