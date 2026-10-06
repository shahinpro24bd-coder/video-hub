import { createHash } from "crypto";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const submissionSchema = z.object({
  url: z.string().trim().url().max(2000),
  website: z.string().max(0).optional().default(""),
});

function normalizeVideoUrl(raw: string) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const key = url.pathname.split("/").filter(Boolean)[0];
    if (key && /^[A-Za-z0-9_-]{11}$/.test(key)) return { source_url: `https://www.youtube.com/watch?v=${key}`, provider: "youtube" as const, video_key: key };
  }
  if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const key = url.pathname === "/watch" ? url.searchParams.get("v") : (["shorts", "embed", "live"].includes(parts[0] ?? "") ? parts[1] : null);
    if (key && /^[A-Za-z0-9_-]{11}$/.test(key)) return { source_url: `https://www.youtube.com/watch?v=${key}`, provider: "youtube" as const, video_key: key };
  }
  if (["facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch"].includes(host)) {
    url.protocol = "https:";
    url.hash = "";
    ["fbclid", "__cft__", "__tn__"].forEach((key) => url.searchParams.delete(key));
    return { source_url: url.toString().slice(0, 2000), provider: "facebook" as const, video_key: null };
  }
  throw new Error("Only YouTube and public Facebook video links are supported.");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/public/videos")({
  server: { handlers: {
    GET: async () => {
      const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
      const supabasePublic = createClient<Database>(process.env['SUPABASE_URL']!, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        } },
      });
      const { data, error } = await supabasePublic.from("videos").select("id, source_url, provider, video_key, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) return json({ error: "Videos could not be loaded." }, 500);
      return json({ videos: data ?? [] });
    },
    POST: async ({ request }) => {
      let parsed: z.infer<typeof submissionSchema>;
      try { parsed = submissionSchema.parse(await request.json()); }
      catch { return json({ error: "Please enter a valid YouTube or Facebook video link." }, 400); }
      if (parsed.website) return json({ error: "Submission rejected." }, 400);
      let video: ReturnType<typeof normalizeVideoUrl>;
      try { video = normalizeVideoUrl(parsed.url); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "Unsupported video link." }, 400); }
      const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const submitterHash = createHash("sha256").update(`${forwardedFor}|${request.headers.get("user-agent") ?? "unknown"}`).digest("hex");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).eq("submitter_hash", submitterHash).gte("created_at", new Date(Date.now() - 3600000).toISOString());
      if ((count ?? 0) >= 5) return json({ error: "Too many submissions. Please try again later." }, 429);
      const { data, error } = await supabaseAdmin.from("videos").insert({ ...video, submitter_hash: submitterHash }).select("id, source_url, provider, video_key, created_at").single();
      if (error?.code === "23505") return json({ error: "This video has already been added." }, 409);
      if (error || !data) return json({ error: "The video could not be added. Please try again." }, 500);
      return json({ video: data }, 201);
    },
  } },
});
