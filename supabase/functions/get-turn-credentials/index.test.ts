import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/get-turn-credentials`;

Deno.test("OPTIONS returns CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin") === "*");
  await res.text();
});

Deno.test("POST without auth returns 401", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: "{}",
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, "Unauthorized");
});

Deno.test("POST with invalid guest token returns 401", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "X-Guest-Token": "00000000-0000-0000-0000-000000000000",
    },
    body: "{}",
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, "Invalid guest token");
});
