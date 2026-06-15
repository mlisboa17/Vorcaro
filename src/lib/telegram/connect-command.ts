const CONNECT_PATTERN = /^\/(?:connect|start)(?:@\w+)?\s+([A-Za-z0-9]{6})\s*$/i;

export function parseConnectCommand(text: string): string | null {
  const match = text.trim().match(CONNECT_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  return match[1].toUpperCase();
}

export function isConnectCommand(text: string): boolean {
  return CONNECT_PATTERN.test(text.trim());
}
