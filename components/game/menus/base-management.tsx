"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { HowitzerPreview } from "../howitzer-preview"
import { APCPreview } from "../apc-preview"

interface BaseManagementMenuProps {
  isVisible: boolean
  onClose: () => void
  baseData: {
    userId: number
    username: string
    x: number
    y: number
  }
  currentUserId: number
  defenseData?: {
    level: number
    count: number
    damage_multiplier: number
  }
  onUpgrade?: (type: "count" | "level") => Promise<void>
  onSpawnTroop?: (troopType: string) => void
}

export function BaseManagementMenu({
  isVisible,
  onClose,
  baseData,
  currentUserId,
  defenseData,
  onUpgrade,
  onSpawnTroop,
}: BaseManagementMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"defenses" | "troops" | "buildings" | "factory">("defenses")
  const [isUpgrading, setIsUpgrading] = useState(false)

  const isOwnBase = baseData.userId === currentUserId

  const handleUpgrade = async (type: "count" | "level") => {
    if (!onUpgrade || !isOwnBase) return
    setIsUpgrading(true)
    try {
      await onUpgrade(type)
    } finally {
      setIsUpgrading(false)
    }
  }

  const getDescription = () => {
    if (!isOwnBase) {
      return `Viewing ${baseData.username}'s base at coordinates (${baseData.x}, ${baseData.y}). You cannot modify this base.`
    }

    if (activeTab === "defenses") {
      if (hoveredItem === "add-turret") {
        return `Add one more missile turret to your base defenses. Current: ${defenseData?.count || 0}/30 turrets deployed. Each turret provides automated defense against incoming attacks.`
      } else if (hoveredItem === "upgrade-tier") {
        return `Upgrade all turrets to Level ${(defenseData?.level || 1) + 1}. Increases damage output by 50% per level. Higher tier turrets have improved targeting and fire rate.`
      }
      return "Manage your base defenses. Turrets automatically engage enemy units within range."
    } else if (activeTab === "troops") {
      if (hoveredItem === "spawn-howitzer") {
        return "Deploy a Howitzer artillery unit. Heavy armored vehicle with powerful long-range capabilities. Features independently rotating turret for 360° firing arc. Drag-select troops and right-click to move."
      } else if (hoveredItem === "spawn-apc") {
        return "Deploy an APC (Armored Personnel Carrier) for base capture missions. Move the APC to an unclaimed base and it will capture the base for you. The APC will be destroyed upon successful capture. Speed: 1 tile/sec, Health: 20."
      }
      return "Train and deploy military units. Drag to select troops, right-click to move them."
    } else if (activeTab === "buildings") {
      return "Upgrade base structures and facilities. (Coming soon)"
    } else if (activeTab === "factory") {
      return "Manage production and resource generation. (Coming soon)"
    }
    return "Select a category to manage your base."
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Header with base image */}
      <div className="relative w-[700px] h-[550px] bg-neutral-800/95 border-4 border-neutral-600 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md mt-16">
        <div className="relative h-24 bg-gradient-to-b from-neutral-700/50 to-transparent border-b border-amber-500/30">
          <div className="absolute inset-0 bg-[url('/images/base/BaseLayout.png')] bg-cover bg-center opacity-20 blur-sm" />
          <div className="relative z-10 p-4 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white font-mono tracking-wider drop-shadow-lg">
                {baseData.username.toUpperCase()}'S BASE
              </h2>
              <p className="text-amber-400 text-xs mt-1 font-mono">
                Coordinates: ({baseData.x}, {baseData.y}) {!isOwnBase && "• View Only"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-amber-400 hover:text-white transition-colors bg-neutral-700/50 rounded-full p-1.5"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description box */}
        <div className="mx-4 mt-3 p-3 bg-neutral-700/50 border border-amber-500/30 rounded-lg min-h-[60px] backdrop-blur-sm">
          <p className="text-neutral-200 text-xs leading-relaxed">{getDescription()}</p>
        </div>

        {/* Tab navigation */}
        <div className="mx-4 mt-3 flex gap-1">
          {[
            { id: "defenses", label: "DEFENSES" },
            { id: "troops", label: "TROOPS" },
            { id: "buildings", label: "BUILDINGS" },
            { id: "factory", label: "FACTORY" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-1.5 font-mono font-bold text-xs transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500/50 text-white border-b-2 border-amber-400"
                  : "bg-neutral-700/50 text-neutral-400 hover:text-amber-300 hover:bg-neutral-600/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content grid */}
        <div className="mx-4 mt-3 h-[260px] bg-neutral-700/40 border border-amber-500/20 rounded-lg p-3 overflow-y-auto">
          {activeTab === "defenses" && defenseData && (
            <div className="grid grid-cols-5 gap-2">
              {/* Add Turret Button */}
              <button
                onMouseEnter={() => setHoveredItem("add-turret")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleUpgrade("count")}
                disabled={!isOwnBase || defenseData.count >= 30 || isUpgrading}
                className="group relative bg-neutral-600/50 hover:bg-neutral-500/70 border-2 border-neutral-500/50 hover:border-amber-500/50 rounded-lg p-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-[90px] h-[90px] mb-1 flex items-center justify-center">
                  <img
                    src="/images/turrets/level-1-turret.gif"
                    alt="Level 1 Turret"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] font-mono text-amber-300 text-center">ADD TURRET</span>
                <span className="text-[10px] font-mono text-amber-400">{defenseData.count}/30</span>
              </button>

              {/* Upgrade Tier Button */}
              <button
                onMouseEnter={() => setHoveredItem("upgrade-tier")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => handleUpgrade("level")}
                disabled={!isOwnBase || defenseData.level >= 4 || isUpgrading}
                className="group relative bg-neutral-600/50 hover:bg-neutral-500/70 border-2 border-neutral-500/50 hover:border-amber-500/50 rounded-lg p-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-[90px] h-[90px] mb-1 flex items-center justify-center">
                  <img
                    src="/images/turrets/level-1-turret.gif"
                    alt="Next Level Turret"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] font-mono text-amber-300 text-center">UPGRADE</span>
                <span className="text-[10px] font-mono text-amber-400">
                  Lv{defenseData.level}→{defenseData.level + 1}
                </span>
              </button>

              {/* Placeholder grid items */}
              {Array.from({ length: 23 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-700/20 border border-neutral-600/30 rounded-lg aspect-square flex items-center justify-center"
                >
                  <span className="text-neutral-500 text-[9px] font-mono">LOCKED</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "troops" && (
            <div className="grid grid-cols-5 gap-2">
              <button
                onMouseEnter={() => setHoveredItem("spawn-howitzer")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => onSpawnTroop?.("howitzer")}
                disabled={!isOwnBase}
                className="group relative bg-neutral-600/50 hover:bg-neutral-500/70 border-2 border-neutral-500/50 hover:border-amber-500/50 rounded-lg p-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-[90px] h-[90px] mb-1 flex items-center justify-center">
                  <HowitzerPreview size={90} />
                </div>
                <span className="text-[10px] font-mono text-amber-300 text-center">HOWITZER</span>
                <span className="text-[10px] font-mono text-amber-400">SPAWN</span>
              </button>

              {/* APC Spawn Button */}
              <button
                onMouseEnter={() => setHoveredItem("spawn-apc")}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => onSpawnTroop?.("apc")}
                disabled={!isOwnBase}
                className="group relative bg-neutral-600/50 hover:bg-neutral-500/70 border-2 border-neutral-500/50 hover:border-amber-500/50 rounded-lg p-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed aspect-square flex flex-col items-center justify-center"
              >
                <div className="w-[90px] h-[90px] mb-1 flex items-center justify-center">
                  <APCPreview size={90} />
                </div>
                <span className="text-[10px] font-mono text-amber-300 text-center">APC</span>
                <span className="text-[10px] font-mono text-amber-400">SPAWN</span>
              </button>

              {/* Placeholder grid items */}
              {Array.from({ length: 23 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-700/20 border border-neutral-600/30 rounded-lg aspect-square flex items-center justify-center"
                >
                  <span className="text-neutral-500 text-[9px] font-mono">SOON</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "buildings" && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-700/20 border border-neutral-600/30 rounded-lg aspect-square flex items-center justify-center"
                >
                  <span className="text-neutral-500 text-[9px] font-mono text-center">SOON</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "factory" && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-700/20 border border-neutral-600/30 rounded-lg aspect-square flex items-center justify-center"
                >
                  <span className="text-neutral-500 text-[9px] font-mono text-center">SOON</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats footer */}
        {defenseData && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-amber-500/30 p-3 bg-neutral-900/70 backdrop-blur-sm rounded-b-lg">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-neutral-400 text-[10px] font-mono">TURRETS</p>
                <p className="text-white text-lg font-bold font-mono">{defenseData.count}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-[10px] font-mono">TIER</p>
                <p className="text-amber-400 text-lg font-bold font-mono">{defenseData.level}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-[10px] font-mono">DAMAGE</p>
                <p className="text-white text-lg font-bold font-mono">{defenseData.damage_multiplier.toFixed(1)}x</p>
              </div>
              <div>
                <p className="text-neutral-400 text-[10px] font-mono">STATUS</p>
                <p className="text-green-400 text-lg font-bold font-mono">ACTIVE</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BaseManagementMenu
