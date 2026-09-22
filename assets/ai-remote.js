/* لایه اتصال به هوش مصنوعی واقعی.

   درخواست به پروکسی محلی (serve.ps1) می‌رود که کلید را به سرویس اضافه می‌کند.
   اگر پروکسی تنظیم نشده یا پاسخ نداد، همان موتور محلی AI به‌عنوان پشتیبان
   استفاده می‌شود تا دمو هیچ‌وقت خالی نماند. */

const AIRemote = (() => {
  const cfg = () => window.SJ_CONFIG || {};

  const STROKES = ["کرال سینه", "قورباغه", "پروانه", "کرال پشت"];
  const LEVELS = ["مبتدی", "متوسط", "پیشرفته", "رقابتی"];
  const FOCUSES = ["استقامت", "سرعت", "تکنیک", "آستانه", "استارت"];

  function isEnabled() {
    return Boolean(cfg().aiEndpoint);
  }

  function offline(brief) {
    return { ...AI.generateWorkout(AI.parseBrief(brief)), engine: "offline" };
  }

  /* مدل‌ها گاهی JSON را داخل بلوک کد یا همراه توضیح می‌فرستند. */
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

  function clampInt(value, min, max, fallback) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function pick(value, list, fallback) {
    return list.includes(value) ? value : fallback;
  }

  /* خروجی مدل را به شکل مورد انتظار رابط کاربری تبدیل و مهار می‌کند.
     متراژ کل و تعداد طول استخر را خودمان حساب می‌کنیم تا اعداد همیشه با ست‌ها بخوانند. */
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
    const poolLength = Number(raw.poolLength) === 50 ? 50 : 25;

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

  async function postWorkout(brief) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg().aiTimeoutMs || 60000);

    try {
      const response = await fetch(`${cfg().aiEndpoint.replace(/\/$/, "")}/api/workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `سرویس با کد ${response.status} پاسخ داد.`);
      }

      /* پروکسی محلی متن خام مدل را می‌دهد؛ ورکر Cloudflare جلسه آماده را. */
      const workout = data?.workout ? normalize(data.workout) : normalize(extractJson(data?.content));
      if (!workout) throw new Error("خروجی مدل قابل استفاده نبود.");

      return { workout, model: data?.model || "" };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * همیشه یک جلسه برمی‌گرداند.
   * فیلد engine نشان می‌دهد خروجی از مدل واقعی آمده یا از موتور محلی.
   */
  async function generateWorkout(brief) {
    const text = String(brief || "").trim();
    if (!text || !isEnabled()) return offline(text);

    try {
      const { workout, model } = await postWorkout(text);
      return {
        ...workout,
        note: text,
        createdAt: offline(text).createdAt,
        engine: "ai",
        model,
      };
    } catch (err) {
      console.warn("AI واقعی در دسترس نبود، موتور محلی استفاده شد:", err?.message || err);
      return { ...offline(text), fallbackReason: err?.message || "خطای نامشخص" };
    }
  }

  return { generateWorkout, isEnabled };
})();
