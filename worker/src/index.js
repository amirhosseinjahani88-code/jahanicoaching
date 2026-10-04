/**
 * پروکسی هوش مصنوعی «کوچینگ جهانی».
 * کلید AvalAI فقط به‌صورت سکرت در همین ورکر زندگی می‌کند و هرگز به مرورگر نمی‌رود.
 */

const DEFAULT_ORIGINS = [
  "https://amirhosseinjahani88-code.github.io",
  "http://localhost:8777",
];

const MAX_BRIEF = 400;
const MODEL_FALLBACK = "gemini-2.5-flash";

const SYSTEM_PROMPT = `تو یک مربی ارشد شنا با دانش متدولوژی World Aquatics هستی و برای یک پلتفرم فارسی‌زبان جلسه تمرین طراحی می‌کنی.

از توضیح فارسی مربی، یک جلسه تمرین اصولی بساز و فقط و فقط یک آبجکت JSON برگردان، بدون هیچ متن اضافه و بدون بلوک کد.

ساختار خروجی دقیقاً این است:
{
  "title": "عنوان کوتاه فارسی جلسه",
  "group": "رده سنی مثل نوجوانان",
  "level": "یکی از: مبتدی، متوسط، پیشرفته، رقابتی",
  "stroke": "یکی از: کرال سینه، قورباغه، پروانه، کرال پشت",
  "focus": "یکی از: استقامت، سرعت، تکنیک، آستانه، استارت",
  "minutes": عدد دقیقه جلسه,
  "poolLength": 25 یا 50,
  "rateTarget": عدد ریت هدف دست‌کشی در دقیقه,
  "coachTip": "یک توصیه کاربردی مربیگری در حد دو جمله",
  "sets": [
    { "phase": "نام بخش", "detail": "شرح تکرارها با متراژ و استراحت", "meters": متراژ عددی این بخش, "note": "نکته فنی کوتاه" }
  ]
}

قواعد الزامی:
- بین ۴ تا ۶ بخش بساز و ترتیب منطقی را حفظ کن: گرم‌کردن، تکنیک، ست اصلی، ست پا، سردکردن.
- «meters» باید عدد صحیح و مضربی از ۲۵ باشد. اگر متن متراژ دارد (مثل ۲۰۰۰ متر، دو هزار متر یا ۱ کیلومتر)، مجموع همه بخش‌ها باید دقیقاً همان عدد باشد. اگر متراژ ندارد، از مدت جلسه و رده سنی یک متراژ استاندارد پیشنهاد بده.
- اعداد داخل «detail» را با رقم فارسی بنویس، ولی مقادیر عددی JSON مثل meters و minutes را با رقم انگلیسی بده.
- نکات فنی باید مشخص و قابل اجرا لب استخر باشند، نه کلی‌گویی.`;

function allowedOrigin(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = request.headers.get("Origin") || "";
  return allowed.includes(origin) ? origin : "";
}

function corsHeaders(request, env) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request, env) || DEFAULT_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

/* محدودیت ساده و درون‌حافظه‌ای تا حلقه‌های ساده نتوانند اعتبار را بسوزانند.
   برای محافظت جدی، Rate Limiting را در داشبورد Cloudflare هم روشن کنید. */
const hits = new Map();
function rateLimited(ip, limit = 12, windowMs = 60_000) {
  const now = Date.now();
  const bucket = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  bucket.push(now);
  hits.set(ip, bucket);
  if (hits.size > 5000) hits.clear();
  return bucket.length > limit;
}

/** مدل‌ها گاهی JSON را داخل بلوک کد یا همراه توضیح می‌فرستند. */
function extractJson(text) {
  const clean = String(text || "").replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(clean);
  } catch (_) {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }
}

const STROKES = ["کرال سینه", "قورباغه", "پروانه", "کرال پشت"];
const LEVELS = ["مبتدی", "متوسط", "پیشرفته", "رقابتی"];
const FOCUSES = ["استقامت", "سرعت", "تکنیک", "آستانه", "استارت"];

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function pick(value, list, fallback) {
  return list.includes(value) ? value : fallback;
}

/** خروجی مدل را به شکل مورد انتظار رابط کاربری تبدیل و مهار می‌کند. */
function normalize(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.sets)) return null;

  const sets = raw.sets
    .filter((s) => s && s.phase && s.detail)
    .slice(0, 8)
    .map((s) => ({
      phase: String(s.phase).slice(0, 80),
      detail: String(s.detail).slice(0, 300),
      meters: clampInt(s.meters, 25, 4000, 200),
      note: String(s.note || "").slice(0, 200),
    }));

  if (sets.length < 3) return null;

  const meters = sets.reduce((sum, s) => sum + s.meters, 0);
  const poolLength = raw.poolLength === 50 ? 50 : 25;

  return {
    title: String(raw.title || "جلسه تمرین").slice(0, 120),
    group: String(raw.group || "نوجوانان").slice(0, 40),
    level: pick(raw.level, LEVELS, "متوسط"),
    stroke: pick(raw.stroke, STROKES, "کرال سینه"),
    focus: pick(raw.focus, FOCUSES, "استقامت"),
    minutes: clampInt(raw.minutes, 20, 150, 60),
    poolLength,
    rateTarget: clampInt(raw.rateTarget, 24, 110, 38),
    meters,
    laps: Math.round(meters / poolLength),
    coachTip: String(raw.coachTip || "").slice(0, 400),
    sets,
  };
}

async function callModel(env, { system, user, image }) {
  const userMessage = image
    ? {
        role: "user",
        content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: image } },
        ],
      }
    : { role: "user", content: user };

  const upstream = await fetch(`${env.AVALAI_BASE_URL || "https://api.avalai.ir/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AVALAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.AI_MODEL || MODEL_FALLBACK,
      temperature: 0.5,
      max_tokens: 1800,
      messages: [
        { role: "system", content: system },
        userMessage,
      ],
    }),
  });

  if (!upstream.ok) {
    console.log("upstream error", upstream.status);
    return { error: true, status: upstream.status };
  }

  const payload = await upstream.json();
  return {
    content: payload?.choices?.[0]?.message?.content || "",
    model: payload?.model || env.AI_MODEL || MODEL_FALLBACK,
  };
}

function readAiBody(body) {
  let system = String(body?.system || SYSTEM_PROMPT).slice(0, 6000);
  let user = String(body?.user || body?.brief || "").trim();
  let image = String(body?.image || "");
  if (user.length > 8000) user = user.slice(0, 8000);
  if (!image.startsWith("data:") || image.length > 3500000) image = "";
  if (!system) system = SYSTEM_PROMPT;
  return { system, user, image };
}

async function handleAi(request, env, cors) {
  if (!env.AVALAI_API_KEY) {
    return json({ error: "config", message: "کلید سرویس روی ورکر تنظیم نشده است." }, 500, cors);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) {
    return json({ error: "rate_limit", message: "تعداد درخواست‌ها زیاد شد؛ کمی بعد دوباره تلاش کنید." }, 429, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "bad_request", message: "بدنه درخواست JSON معتبر نیست." }, 400, cors);
  }

  const { system, user, image } = readAiBody(body);
  if (user.length < 2) {
    return json({ error: "bad_request", message: "متن درخواست خیلی کوتاه است." }, 400, cors);
  }

  const result = await callModel(env, { system, user, image });
  if (result.error) {
    return json({ error: "upstream", status: result.status, message: "سرویس هوش مصنوعی پاسخ نداد." }, 502, cors);
  }

  return json({ content: result.content, model: result.model }, 200, cors);
}

async function handleWorkout(request, env, cors) {
  if (!env.AVALAI_API_KEY) {
    return json({ error: "config", message: "کلید سرویس روی ورکر تنظیم نشده است." }, 500, cors);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) {
    return json({ error: "rate_limit", message: "تعداد درخواست‌ها زیاد شد؛ کمی بعد دوباره تلاش کنید." }, 429, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: "bad_request", message: "بدنه درخواست JSON معتبر نیست." }, 400, cors);
  }

  const brief = String(body?.brief || "").trim().slice(0, MAX_BRIEF);
  if (brief.length < 3) {
    return json({ error: "bad_request", message: "توضیح تمرین خیلی کوتاه است." }, 400, cors);
  }

  const result = await callModel(env, { system: SYSTEM_PROMPT, user: brief, image: "" });
  if (result.error) {
    return json({ error: "upstream", status: result.status, message: "سرویس هوش مصنوعی پاسخ نداد." }, 502, cors);
  }

  const content = result.content;
  const workout = normalize(extractJson(content));

  if (!workout) {
    console.log("unparsable model output", String(content).slice(0, 500));
    return json({ error: "parse", message: "خروجی مدل قابل استفاده نبود." }, 502, cors);
  }

  return json({ workout, model: result.model }, 200, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, model: env.AI_MODEL || MODEL_FALLBACK, keySet: Boolean(env.AVALAI_API_KEY) }, 200, cors);
    }

    if (request.method === "POST" && (url.pathname === "/api/ai" || url.pathname === "/api/workout")) {
      if (!allowedOrigin(request, env)) {
        return json({ error: "forbidden", message: "این آدرس فقط از سایت کوچینگ جهانی قابل استفاده است." }, 403, cors);
      }
      try {
        if (url.pathname === "/api/ai") return await handleAi(request, env, cors);
        return await handleWorkout(request, env, cors);
      } catch (err) {
        console.log("worker error", err?.stack || String(err));
        return json({ error: "internal", message: "خطای غیرمنتظره در سرویس." }, 500, cors);
      }
    }

    return json({ error: "not_found" }, 404, cors);
  },
};
