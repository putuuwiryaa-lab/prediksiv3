import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function validDigitList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter((item) => /^\d$/.test(item))
    .slice(0, limit);
}

function parseHistory(raw: unknown) {
  return String(raw || "")
    .trim()
    .split(/\s+/)
    .filter((token) => /^\d{4}$/.test(token));
}

function indexSnapshots(rows: unknown[] | null) {
  const map = new Map<string, Record<string, unknown>>();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== "object") return;

    const item = row as Record<string, unknown>;
    const marketId = String(item.market_id || item.marketId || item.id || "");
    if (marketId) map.set(marketId, item);
  });

  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL") || "https://ldeofmwxttdjcvylhabu.supabase.co";

    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_KEY) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: markets, error: marketsError } = await supabase
      .from("markets")
      .select("id, name, order, updated_at, history_data")
      .order("order", { ascending: true });

    if (marketsError) throw marketsError;

    const { data: snapshots } = await supabase
      .from("prediction_snapshot")
      .select("market_id, ai4, bbfs8, poltar_as, poltar_kop, poltar_kepala, poltar_ekor");

    const snapshotByMarket = indexSnapshots(snapshots as unknown[] | null);

    const safeData = (markets || []).map((market: Record<string, unknown>) => {
      const history = parseHistory(market.history_data);
      const snapshot = snapshotByMarket.get(String(market.id)) || {};

      return {
        id: market.id,
        name: market.name,
        order: market.order,
        updated_at: market.updated_at,
        last_result: history.length ? history[history.length - 1] : null,
        data_count: history.length,
        ai4: validDigitList(snapshot.ai4, 4),
        bbfs8: validDigitList(snapshot.bbfs8, 8),
        poltar_as: validDigitList(snapshot.poltar_as, 10),
        poltar_kop: validDigitList(snapshot.poltar_kop, 10),
        poltar_kepala: validDigitList(snapshot.poltar_kepala, 10),
        poltar_ekor: validDigitList(snapshot.poltar_ekor, 10),
      };
    });

    return new Response(JSON.stringify(safeData), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
