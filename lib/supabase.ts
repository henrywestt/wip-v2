import { createClient } from "@supabase/supabase-js";

// Public by design (NEXT_PUBLIC_ values ship to the browser).
// Fallbacks keep the build from crashing if a var is missing — but if you see
// no data on the live site, a missing/typo'd env var in Vercel is the cause.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (typeof window !== "undefined" && url.includes("placeholder")) {
  console.warn("[WIP] Supabase env vars not set — data won't load. Set them in Vercel → Settings → Environment Variables.");
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 5 } },
});
