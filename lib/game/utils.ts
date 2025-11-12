/**
 * Determine the color for a base nameplate based on user and alliance
 * Returns a hex color string
 */
export function getNameplateColor(userId: number, allianceId: number | null): string {
  // If player is in an alliance, use alliance color
  if (allianceId !== null) {
    // Determine alliance color based on alliance ID
    const allianceColors = [
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#FFA07A", // Light Salmon
      "#98D8C8", // Mint
      "#F7DC6F", // Yellow
      "#BB8FCE", // Purple
      "#85C1E2", // Light Blue
      "#F8B195", // Peach
      "#C39BD3", // Light Purple
    ]
    return allianceColors[Math.abs(allianceId) % allianceColors.length]
  }

  // Otherwise, use a color based on user ID
  const userColors = [
    "#FFD700", // Gold
    "#FF1493", // Deep Pink
    "#00CED1", // Dark Turquoise
    "#32CD32", // Lime Green
    "#FF4500", // Orange Red
    "#1E90FF", // Dodger Blue
    "#FF69B4", // Hot Pink
    "#00FA9A", // Medium Spring Green
    "#FF6347", // Tomato
    "#20B2AA", // Light Sea Green
  ]
  return userColors[Math.abs(userId) % userColors.length]
}
