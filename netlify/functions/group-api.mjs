export default async function handler(request) {
  const upstream = Netlify.env.get("FAHRIU_WORKER_ORIGIN");
  const path = new URL(request.url).pathname;
  if (!upstream || !/^\/api\/group\/[a-z]+(?:\/[0-9]+)?$/.test(path)) {
    return Response.json({error:"unavailable"}, {status:503, headers:{"Cache-Control":"no-store"}});
  }
  const target = new URL(path, upstream);
  const headers = new Headers();
  for (const key of ["Authorization", "Content-Type", "Origin"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const hasBody = ["POST","PUT"].includes(request.method);
    const body = hasBody ? await request.text() : undefined;
    if (body?.length > 16000) {
      return Response.json({error:"invalid"}, {status:400, headers:{"Cache-Control":"no-store"}});
    }
    const response = await fetch(target, {
      method:request.method, headers, body, redirect:"error"
    });
    return new Response(response.body, {
      status:response.status,
      headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
    });
  } catch {
    return Response.json({error:"unavailable"}, {status:503, headers:{"Cache-Control":"no-store"}});
  }
}

export const config = { path:"/api/group/*" };
