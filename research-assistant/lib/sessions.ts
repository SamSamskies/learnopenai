const sessions = new Map<string, string>();

export function getLastResponseId(sessionId: string): string | null {
  return sessions.get(sessionId) ?? null;
}

export function setLastResponseId(sessionId: string, responseId: string) {
  sessions.set(sessionId, responseId);
}

export function clearSession(sessionId: string) {
  sessions.delete(sessionId);
}