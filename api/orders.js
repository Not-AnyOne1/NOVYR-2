/* ============================================================
   POST /api/orders — receives a cash-on-delivery order from the
   checkout drawer and pushes it to the shop's Telegram bot.

   Vercel serverless function (Node runtime, CommonJS — the repo has
   no package.json, so plain module.exports is the safe form).

   Required environment variables (set in Vercel → Settings → Environment
   Variables, never committed):
     TELEGRAM_BOT_TOKEN  — from @BotFather, e.g. 8123456789:AAH...
     TELEGRAM_CHAT_ID    — the admin chat/group id, e.g. 123456789

   Responds 200 only when Telegram actually accepted the message, so the
   storefront can never show "ORDER RECEIVED" for an order nobody got.
============================================================ */

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Oujda", "Other"];
const SIZES = ["S", "M", "L", "XL"];
const MAX_ITEMS = 50;

// Telegram HTML parse_mode: escape so a name like "A & <b>" can't break or inject markup.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const str = (v, min, max) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

function validate(order) {
  if (!order || typeof order !== "object") return "malformed body";

  const c = order.customer;
  if (!c || typeof c !== "object") return "missing customer";
  if (!str(c.fullName, 2, 80)) return "invalid name";
  if (!/^0[67]\d{8}$/.test(String(c.phone || "").replace(/[\s-]/g, ""))) return "invalid phone";
  if (!CITIES.includes(c.city)) return "invalid city";
  if (!str(c.address, 5, 200)) return "invalid address";

  if (!Array.isArray(order.items) || order.items.length < 1) return "empty cart";
  if (order.items.length > MAX_ITEMS) return "too many items";

  for (const it of order.items) {
    if (!str(it.name, 1, 60)) return "invalid item name";
    if (!SIZES.includes(it.size)) return "invalid size";
    if (!str(it.color, 1, 30)) return "invalid colour";
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 99) return "invalid quantity";
    if (typeof it.price !== "number" || it.price < 0 || it.price > 100000) return "invalid price";
  }
  return null;
}

function format(order) {
  const c = order.customer;
  const phone = String(c.phone).replace(/[\s-]/g, "");

  const lines = order.items.map(
    (it) => `• ${esc(it.name)} — ${esc(it.size)} / ${esc(it.color)} × ${it.qty} — <b>${it.qty * it.price} MAD</b>`
  );

  // Recomputed server-side rather than trusting the client's figure.
  const total = order.items.reduce((n, it) => n + it.qty * it.price, 0);

  const when = new Date().toLocaleString("fr-MA", {
    timeZone: "Africa/Casablanca",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  return [
    "🖤 <b>NEW ORDER — NOVYR</b>",
    "",
    `👤 <b>${esc(c.fullName.trim())}</b>`,
    `📞 <a href="tel:${phone}">${phone}</a>`,
    `📍 ${esc(c.city)} — ${esc(c.address.trim())}`,
    "",
    "🛒 <b>Items</b>",
    ...lines,
    "",
    `💰 <b>TOTAL: ${total} MAD</b> — cash on delivery`,
    `🕐 ${when}`
  ].join("\n");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("orders: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set");
    return res.status(500).json({ error: "order routing not configured" });
  }

  let order = req.body;
  if (typeof order === "string") {
    try { order = JSON.parse(order); } catch { return res.status(400).json({ error: "invalid JSON" }); }
  }

  const problem = validate(order);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: format(order),
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    if (!tg.ok) {
      // Log Telegram's reason (bad token, bot never started, wrong chat id…) without leaking the token.
      console.error("orders: telegram rejected", tg.status, await tg.text());
      return res.status(502).json({ error: "could not deliver order" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("orders: telegram request failed", err.message);
    return res.status(502).json({ error: "could not deliver order" });
  }
};
