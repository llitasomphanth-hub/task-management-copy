import { createClientFromRequest } from "npm:@base44/sdk";

const PACKAGE_SETTINGS_URL = Deno.env.get("PAPXNZ_PACKAGE_SETTINGS_URL") || "";
const SERVICE_KEY = Deno.env.get("PAPXNZ_BASE44_SERVICE_KEY") || "";
const ADMIN_EMAILS = new Set(
  (Deno.env.get("PAPXNZ_BASE44_ADMIN_EMAILS") || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const json = (body: Record<string, unknown>, status = 200) =>
  Response.json(body, { status });

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ ok: false, status: "error", message: "POST only" }, 405);
  }

  if (!PACKAGE_SETTINGS_URL || !SERVICE_KEY || !ADMIN_EMAILS.size) {
    return json(
      {
        ok: false,
        status: "error",
        message: "Base44 package-settings integration is not configured",
      },
      503,
    );
  }

  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email) {
      return json({ ok: false, status: "error", message: "Sign in is required" }, 401);
    }
    if (!ADMIN_EMAILS.has(email)) {
      return json({ ok: false, status: "error", message: "Admin access is required" }, 403);
    }

    const payload = await request.json();
    const upstream = await fetch(PACKAGE_SETTINGS_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-papxnz-base44-key": SERVICE_KEY,
      },
      body: JSON.stringify(payload),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("papxnz-package-settings failed", error);
    return json(
      { ok: false, status: "error", message: "Package settings bridge failed" },
      502,
    );
  }
});
