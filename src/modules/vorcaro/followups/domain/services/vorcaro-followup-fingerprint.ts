export function buildFollowUpFingerprint(
  relatedEntityType: string | null | undefined,
  relatedEntityId: string | null | undefined,
  actionType: string,
): string {
  const type = relatedEntityType ?? "NONE";
  const id = relatedEntityId ?? "NONE";
  return `${type}:${id}:${actionType}`;
}
