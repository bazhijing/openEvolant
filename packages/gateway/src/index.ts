/**
 * @openevolant/gateway — Gateway Server：会话路由、Lane Queue（v0.1 仅 Web 单通道）
 */

export interface IncomingMessage {
  sessionId: string;
  payload: unknown;
  attachments?: unknown[];
}

export interface SessionRoute {
  sessionId: string;
  laneId: string;
}

export function routeToSession(msg: IncomingMessage): SessionRoute {
  return {
    sessionId: msg.sessionId,
    laneId: msg.sessionId,
  };
}
