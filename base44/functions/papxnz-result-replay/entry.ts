import { createClientFromRequest } from "npm:@base44/sdk";

const RESULT_REPLAY_URL =
  Deno.env.get("PAPXNZ_RESULT_REPLAY_URL") || "";

const SERVICE_KEY =
  Deno.env.get("PAPXNZ_BASE44_SERVICE_KEY") || "";

const ADMIN_EMAILS = new Set(
  (Deno.env.get("PAPXNZ_BASE44_ADMIN_EMAILS") || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const json = (
  body: Record<string, unknown>,
  status = 200,
) => Response.json(body, { status });

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json(
      {
        ok: false,
        status: "error",
        message: "POST only",
      },
      405,
    );
  }

  if (
    !RESULT_REPLAY_URL ||
    !SERVICE_KEY ||
    !ADMIN_EMAILS.size
  ) {
    return json(
      {
        ok: false,
        status: "error",
        message:
          "Base44 result-replay integration is not configured",
      },
      503,
    );
  }

  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    const email = String(user?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return json(
        {
          ok: false,
          status: "error",
          message: "Sign in is required",
        },
        401,
      );
    }

    if (!ADMIN_EMAILS.has(email)) {
      return json(
        {
          ok: false,
          status: "error",
          message: "Admin access is required",
        },
        403,
      );
    }

    const body = await request.json();
    const historyId = Number(body?.history_id);

    if (!Number.isInteger(historyId) || historyId <= 0) {
      return json(
        {
          ok: false,
          status: "error",
          code: "HISTORY_ID_REQUIRED",
          message: "history_id must be a positive integer",
        },
        400,
      );
    }

    const upstream = await fetch(RESULT_REPLAY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-papxnz-base44-key": SERVICE_KEY,
      },
      body: JSON.stringify({ history_id: historyId }),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ||
          "application/json",
      },
    });
  } catch (error) {
    console.error("papxnz-result-replay failed", error);

    return json(
      {
        ok: false,
        status: "error",
        message: "Result replay bridge failed",
      },
      502,
    );
  }
});
