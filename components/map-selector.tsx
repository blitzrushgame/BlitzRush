"use client"
import { X } from "lucide-react"

interface MapSelectorProps {
  currentMap: number
  onSelectMap: (mapId: number) => void
  onClose: () => void
}

export default function MapSelector({ currentMap, onSelectMap, onClose }: MapSelectorProps) {
  const totalMaps = 10
  const maps = Array.from({ length: totalMaps }, (_, i) => i + 1)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-800/40 backdrop-blur-md border border-neutral-600/30 rounded-lg w-full max-w-6xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-neutral-600/30 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">MAP SELECTION</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Map Grid */}
        <div className="p-8">
          <div className="grid grid-cols-10 gap-4">
            {maps.map((mapId) => (
              <button
                key={mapId}
                onClick={() => onSelectMap(mapId)}
                className={`
                  aspect-square rounded-lg font-bold text-lg transition-all
                  ${
                    mapId === currentMap
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400"
                      : "bg-neutral-700/50 hover:bg-neutral-600/50 text-neutral-300 border-2 border-neutral-600/50"
                  }
                `}
              >
                {mapId}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-600/30 p-4">
          <p className="text-neutral-400 text-sm text-center">Currently on Map {currentMap}</p>
        </div>
      </div>
    </div>
  )
}
