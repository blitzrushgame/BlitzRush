import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import { GameServer } from "./game/GameServer"
import { DatabaseService } from "./services/DatabaseService"

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Configure CORS for Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    players: gameServer.getPlayerCount(),
    tickRate: gameServer.getTickRate(),
  })
})

// Initialize services
const dbService = new DatabaseService()
const gameServer = new GameServer(io, dbService)

// Start server
const PORT = process.env.PORT || 8080
httpServer.listen(PORT, () => {
  console.log(`[Game Server] Running on port ${PORT}`)
  console.log(`[Game Server] Tick rate: 20 ticks/second (50ms)`)
  gameServer.start()
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Game Server] SIGTERM received, shutting down gracefully...")
  gameServer.stop()
  httpServer.close(() => {
    console.log("[Game Server] Server closed")
    process.exit(0)
  })
})
