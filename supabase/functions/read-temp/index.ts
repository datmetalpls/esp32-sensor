const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dashboard-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};


import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  // auth simple para dashboard
  const key = req.headers.get("x-dashboard-key") ?? "";
  const expected = Deno.env.get("DASHBOARD_KEY") ?? "";
  if (!expected || key !== expected) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const device_id = url.searchParams.get("device_id") ?? "";
  const limitStr = url.searchParams.get("limit") ?? "120";
  const limit = Math.min(500, Math.max(10, Number(limitStr) || 120));

  if (!device_id) return new Response("Missing device_id", { status: 400 });

  const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(sbUrl, serviceKey);

  // últimos N puntos
  const { data, error } = await supabase
    .from("temperature_log")
    .select("temp_c, alarm, created_at")
    .eq("device_id", device_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return new Response("DB error", { status: 500 });

  const latest = data?.[0] ?? null;

  return new Response(
    JSON.stringify({
      device_id,
      latest,
      points: (data ?? []).reverse(), // en orden cronológico para graficar
    }),
    { headers: { "content-type": "application/json" } }
  );
});
