"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function BannedPage() {
  const [showJoke, setShowJoke] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const searchParams = useSearchParams()
  const reason = searchParams.get("reason")

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval)
          setShowJoke(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!showJoke) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Connection failed</h1>
        <p className="text-slate-400">Attempting to reconnect to servers...</p>
        <p className="text-slate-500 mt-2 text-sm">
          Attempting to connect again in <span className="font-mono">{countdown}</span>...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold mb-3">Just kidding, you have been banned</h1>

        <p className="mb-3 text-slate-300">
          Our anti-cheat system thinks you had a little too much help winning games. As a result, your IP has been banned from accessing BlitzRush.
        </p>

        {/* Reason or fallback */}
        {reason ? (
          <p className="mb-3 text-red-400 font-medium">Reason: {reason}</p>
        ) : (
          <p className="mb-3 text-red-400 font-medium">No reason was provided for this ban.</p>
        )}

        <p className="mb-4 text-slate-400">
          Your score is noted, your dignity is questionable. If you believe this is a mistake,&nbsp;
          <a href="mailto:support@blitzrush.com" className="text-blue-400 hover:underline">contact support</a>.
          Otherwise, maybe try playing fair next time?
        </p>
        <p className="text-sm text-slate-500">— The BlitzRush team</p>
      </div>
    </div>
  )
}
