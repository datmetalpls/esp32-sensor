import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // Auth simple: header x-device-key debe coincidir con secret
  const key = req.headers.get("x-device-key") ?? "";
  const expected = Deno.env.get("DEVICE_INGEST_KEY") ?? "";
  if (!expected || key !== expected) {
  return new Response("Unauthorized", { status: 401 });
}


  let body: any;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const device_id = String(body.device_id ?? "");
  const temp_c = Number(body.temp_c);
  const alarm = Boolean(body.alarm);

  if (!device_id || Number.isNaN(temp_c)) return new Response("Bad payload", { status: 400 });

  // Supabase base secrets: disponibles en Edge Functions
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(url, serviceKey);

  const { error } = await supabase.from("temperature_log").insert({ device_id, temp_c, alarm });
  if (error) return new Response("DB error", { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
