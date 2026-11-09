type Context = { request: Request; env: { API_ORIGIN?: string } };

/** Keep cookies/auth callbacks on the app origin; only /api uses Functions. */
export async function onRequest({ request, env }: Context): Promise<Response> {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith("/api/"))
    return new Response("Not found", { status: 404 });
  let origin: URL;
  try {
    origin = new URL(env.API_ORIGIN ?? "");
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.origin === incoming.origin
    )
      throw new Error("Invalid API origin");
  } catch {
    return Response.json(
      { error: "The API origin is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const target = new URL(incoming.pathname + incoming.search, origin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const forwarded = new Request(target, request);
  const upstream = new Request(forwarded, { headers, redirect: "manual" });
  try {
    const response = await fetch(upstream);
    const result = new Response(response.body, response);
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  } catch {
    return Response.json(
      { error: "Tito's API is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
