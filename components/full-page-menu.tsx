"use client"

import { X } from "lucide-react"

interface FullPageMenuProps {
  isVisible: boolean
  onClose: () => void
  currentMap: number
  onMapSelect: (mapId: number) => void
}

export default function FullPageMenu({ isVisible, onClose, currentMap, onMapSelect }: FullPageMenuProps) {
  if (!isVisible) return null

  const totalMaps = 10
  const maps = Array.from({ length: totalMaps }, (_, i) => i + 1)

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-neutral-800/95 backdrop-blur-md border-4 border-amber-500 rounded-xl shadow-2xl w-[90vw] max-w-4xl p-8 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-neutral-700/50 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="w-6 h-6 text-amber-400" />
        </button>

        {/* Content */}
        <div className="space-y-8">
          {/* Quick Links */}
          <div className="flex justify-center gap-6">
            <a
              href="/alliance"
              className="px-8 py-4 bg-neutral-700/50 hover:bg-neutral-600/50 border-2 border-amber-500/30 rounded-lg text-amber-400 font-bold text-lg transition-all hover:shadow-lg hover:shadow-amber-500/20"
            >
              ALLIANCE
            </a>
            <a
              href="/profile"
              className="px-8 py-4 bg-neutral-700/50 hover:bg-neutral-600/50 border-2 border-amber-500/30 rounded-lg text-amber-400 font-bold text-lg transition-all hover:shadow-lg hover:shadow-amber-500/20"
            >
              PROFILE
            </a>
          </div>

          {/* Map Selection */}
          <div>
            <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">SELECT MAP</h3>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
              {maps.map((mapId) => (
                <button
                  key={mapId}
                  onClick={() => {
                    onMapSelect(mapId)
                    onClose()
                  }}
                  className={`
                    aspect-square rounded-lg font-bold text-xl transition-all
                    ${
                      mapId === currentMap
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400 shadow-lg shadow-amber-500/50"
                        : "bg-neutral-700/50 hover:bg-neutral-600/50 text-neutral-300 border-2 border-neutral-600/50"
                    }
                  `}
                >
                  {mapId}
                </button>
              ))}
            </div>
            <p className="text-neutral-400 text-center mt-4">Currently on Map {currentMap}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
