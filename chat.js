/**
 * api/chat.js — Voiceflow proxy for Vercel Serverless Functions
 *
 * This file is the ONLY backend you need.
 * Deploy this folder to Vercel, set VOICEFLOW_API_KEY in the
 * Vercel dashboard, and point your Framer component at:
 *   https://your-project.vercel.app/api/chat
 *
 * CORS is wide-open (Access-Control-Allow-Origin: *) so Framer
 * can call it from the browser. Your API key never leaves this
 * server-side function.
 *
 * Voiceflow Runtime docs:
 * https://docs.voiceflow.com/reference/interactstate
 */

const VOICEFLOW_BASE = "https://general-runtime.voiceflow.com";
const TIMEOUT_MS = 15_000;

/**
 * Extract readable text from Voiceflow trace array.
 * Only "text" and "speak" traces contain user-facing content.
 * Extend this function if you need to handle buttons/cards later.
 */
function extractText(traces) {
  return traces
    .filter((t) => t.type === "text" || t.type === "speak")
    .map((t) => {
      const msg = t.payload?.message ?? "";
      // Strip any HTML tags Voiceflow occasionally includes
      return msg.replace(/<[^>]+>/g, "").trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

module.exports = async function handler(req, res) {
  // ── CORS preflight (OPTIONS) ─────────────────────────────────
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  // ── Only allow POST ──────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  // ── Guard: API key must be set ───────────────────────────────
  const apiKey = process.env.VOICEFLOW_API_KEY;
  if (!apiKey) {
    console.error("[proxy] VOICEFLOW_API_KEY is not configured.");
    return res.status(500).json({
      error: "Server configuration error. Set VOICEFLOW_API_KEY in Vercel.",
    });
  }

  // ── Parse request body ───────────────────────────────────────
  const { userID, action } = req.body ?? {};
  if (!userID || !action?.type) {
    return res.status(400).json({
      error: "Missing required fields: userID and action.",
    });
  }

  // ── Forward to Voiceflow with a timeout ─────────────────────
  const versionID = process.env.VOICEFLOW_VERSION_ID ?? "production";
  const url = `${VOICEFLOW_BASE}/state/user/${encodeURIComponent(userID)}/interact`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const vfRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,  // VF uses the raw key as the auth header
        versionID,
      },
      body: JSON.stringify({ action }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!vfRes.ok) {
      const errBody = await vfRes.text().catch(() => "");
      console.error(`[proxy] Voiceflow ${vfRes.status}:`, errBody);
      return res.status(502).json({
        error: "The assistant is unavailable. Please try again.",
      });
    }

    const traces = await vfRes.json();
    const text = extractText(traces);

    // Return ONLY clean text — no raw Voiceflow data reaches the browser
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ text: text || "" });

  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err?.name === "AbortError";
    console.error("[proxy] Error:", err?.message ?? err);

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? "Request timed out. Please try again."
        : "Something went wrong. Please try again.",
    });
  }
};
