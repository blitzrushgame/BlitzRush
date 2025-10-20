"use client"

import { useEffect } from "react"
import { cookies } from "next/headers"

export function DevToolsBlocker() {
  useEffect(() => {
    // Tjek om brugeren er admin
    const isAdmin = document.cookie.includes("admin_authenticated=true")
    if (isAdmin) return // Tillad alt for admins

    // Disable højreklik
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("contextmenu", handleContextMenu)

    // Blokér devtools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.metaKey && e.altKey && ["I", "J", "C"].includes(e.key)) ||
        e.key === "F12"
      ) {
        e.preventDefault()
        e.stopPropagation()
        alert("Developer tools are disabled.")
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return null
}
