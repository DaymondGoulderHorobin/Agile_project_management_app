export type NodeRequestProjection = Readonly<{
  method: string;
  url: string;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  body?: unknown;
}>;

export type AuthHandler = (request: Request) => Promise<Response>;

export type AuthResponseProjection = Readonly<{
  status: number;
  headers: readonly [string, string][];
  setCookies: readonly string[];
  body: Uint8Array | null;
}>;

export function toWebRequest(request: NodeRequestProjection, publicOrigin: string): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
    else headers.set(name, value);
  }
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD" && request.body !== undefined;
  return new Request(new URL(request.url, publicOrigin), {
    method,
    headers,
    body: hasBody ? JSON.stringify(request.body) : undefined,
  });
}

export async function runAuthHandler(handler: AuthHandler, request: NodeRequestProjection, publicOrigin: string): Promise<AuthResponseProjection> {
  const response = await handler(toWebRequest(request, publicOrigin));
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const headers = [...response.headers.entries()].filter(([name]) => name.toLowerCase() !== "set-cookie");
  const body = response.body ? new Uint8Array(await response.arrayBuffer()) : null;
  return { status: response.status, headers, setCookies, body };
}
