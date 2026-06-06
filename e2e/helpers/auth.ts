import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const DEV_PASSWORD = process.env.AUTH_DEV_PASSWORD ?? "dev123";

function mergeCookies(existing: string, setCookie: string | null): string {
  if (!setCookie) return existing;
  const jar = new Map<string, string>();
  for (const part of existing.split("; ").filter(Boolean)) {
    const [k, ...v] = part.split("=");
    jar.set(k, v.join("="));
  }
  for (const raw of setCookie.split(/,(?=\s*[^;]+=[^;]+)/)) {
    const pair = raw.split(";")[0]?.trim();
    if (!pair) continue;
    const [k, ...v] = pair.split("=");
    jar.set(k, v.join("="));
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function mergeFromResponse(existing: string, response: { headersArray(): { name: string; value: string }[] }) {
  let cookies = existing;
  for (const header of response.headersArray()) {
    if (header.name.toLowerCase() === "set-cookie") {
      cookies = mergeCookies(cookies, header.value);
    }
  }
  return cookies;
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password = DEV_PASSWORD,
): Promise<string> {
  let cookies = "";

  const csrfRes = await request.get("/api/auth/csrf");
  cookies = mergeFromResponse(cookies, csrfRes);
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };

  const signInRes = await request.post("/api/auth/callback/credentials", {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies,
    },
    data: new URLSearchParams({
      csrfToken: csrfBody.csrfToken,
      email,
      password,
      callbackUrl: `${BASE_URL}/dashboard`,
      json: "true",
    }).toString(),
    maxRedirects: 0,
  });
  cookies = mergeFromResponse(cookies, signInRes);

  const sessionRes = await request.get("/api/auth/session", {
    headers: { Cookie: cookies },
  });
  const session = (await sessionRes.json()) as { user?: { id?: string } } | null;
  if (!session?.user?.id) {
    const signInBody = await signInRes.text().catch(() => "");
    throw new Error(
      `Login falhou para ${email} (signIn ${signInRes.status()}): ${signInBody.slice(0, 200)}`,
    );
  }

  return cookies;
}

export async function applyCookiesToContext(context: BrowserContext, cookieHeader: string) {
  const pairs = cookieHeader.split("; ").filter(Boolean);
  await context.addCookies(
    pairs.map((pair) => {
      const [name, ...rest] = pair.split("=");
      return {
        name,
        value: rest.join("="),
        url: BASE_URL,
      };
    }),
  );
}

export async function loginPage(page: Page, email: string, password = DEV_PASSWORD) {
  const cookies = await loginViaApi(page.request, email, password);
  await applyCookiesToContext(page.context(), cookies);
}
