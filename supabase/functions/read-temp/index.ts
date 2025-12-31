import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dashboard-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth por key
    const key = req.headers.get("x-dashboard-key") ?? "";
    const expected = Deno.env.get("DASHBOARD_KEY") ?? "";
    if (!expected || key !== expected) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const device_id = url.searchParams.get("device_id") ?? "";
    const limit = Math.min(800, Math.max(10, Number(url.searchParams.get("limit") ?? "120")));

    if (!device_id) {
      return new Response(JSON.stringify({ error: "device_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: points, error } = await sb
      .from("temperature_log")
      .select("device_id,temp_c,alarm,created_at")
      .eq("device_id", device_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latest = points?.[0] ?? null;

    return new Response(
      JSON.stringify({ device_id, latest, points: (points ?? []).reverse() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
