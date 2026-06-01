export async function fetchInstrumentList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { credentials: "include" });

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error(`Falha ao carregar ${url}`);
  }

  const payload = (await response.json()) as { items?: T[] } | T[];

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? [];
}

export async function postInstrumentConfig<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Falha ao criar registro");
  }

  return response.json() as Promise<T>;
}

export async function patchInstrumentConfig<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Falha ao atualizar registro");
  }

  return response.json() as Promise<T>;
}
