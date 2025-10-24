export const REALTIME_CONFIG = {
  // Enable realtime for these tables
  tables: ["units", "buildings", "user_game_states", "combat_logs", "chat_messages"],

  // Broadcast channels for instant updates
  channels: {
    combat: "combat-events",
    movement: "unit-movement",
    resources: "resource-updates",
    chat: "chat-messages",
  },

  // Reconnection settings
  reconnect: {
    maxRetries: 5,
    retryDelay: 1000,
    backoffMultiplier: 1.5,
  },
}
