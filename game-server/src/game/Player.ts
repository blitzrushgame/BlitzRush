export class Player {
  public socketId: string
  public userId: number
  public worldId: number
  public connectedAt: number

  constructor(socketId: string, userId: number, worldId: number) {
    this.socketId = socketId
    this.userId = userId
    this.worldId = worldId
    this.connectedAt = Date.now()
  }
}
