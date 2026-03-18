import type { WebSocketMessage } from "@yt-auto-downloader/shared";

/**
 * WebSocket 事件广播器
 */
export interface WSConnection {
  send(data: string | ArrayBuffer): void;
  /** WebSocket 连接状态 */
  readyState: number;
}

/**
 * 事件发射器，用于广播 WebSocket 消息
 */
export class EventEmitter {
  private connections: Set<WSConnection> = new Set();

  /**
   * 添加连接
   * @param {WSConnection} ws - WebSocket 连接
   */
  addConnection(ws: WSConnection): void {
    this.connections.add(ws);
  }

  /**
   * 移除连接
   * @param {WSConnection} ws - WebSocket 连接
   */
  removeConnection(ws: WSConnection): void {
    this.connections.delete(ws);
  }

  /**
   * 广播消息给所有连接
   * @param {WebSocketMessage} message - 消息对象
   */
  broadcast(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);

    for (const conn of this.connections) {
      try {
        if (conn.readyState === 1 /* OPEN */) {
          conn.send(payload);
        }
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        this.connections.delete(conn);
      }
    }
  }

  /**
   * 获取连接数量
   * @returns {number} 连接数
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}
