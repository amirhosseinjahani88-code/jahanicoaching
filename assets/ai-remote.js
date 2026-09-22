/* لایه اتصال به هوش مصنوعی واقعی.
   درخواست به پروکسی Cloudflare می‌رود؛ اگر پروکسی تنظیم نشده یا پاسخ نداد،
   همان موتور محلی AI به‌عنوان پشتیبان استفاده می‌شود تا دمو هیچ‌وقت خالی نماند. */

const AIRemote = (() => {
  const cfg = () => window.SJ_CONFIG || {};

  function isEnabled() {
    return Boolean(cfg().aiEndpoint);
  }

  function offline(brief) {
    return { ...AI.generateWorkout(AI.parseBrief(brief)), engine: "offline" };
  }

  async function postWorkout(brief) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg().aiTimeoutMs || 45000);

    try {
      const response = await fetch(`${cfg().aiEndpoint.replace(/\/$/, "")}/api/workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.message || `سرویس با کد ${response.status} پاسخ داد.`;
        throw new Error(message);
      }
      if (!data?.workout) throw new Error("پاسخ سرویس ساختار مورد انتظار را نداشت.");

      return data;
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
    if (!text) return offline(text);
    if (!isEnabled()) return offline(text);

    try {
      const data = await postWorkout(text);
      const parsed = AI.parseBrief(text);
      return {
        ...data.workout,
        note: text,
        createdAt: offline(text).createdAt,
        poolLength: data.workout.poolLength || parsed.poolLength,
        engine: "ai",
        model: data.model || "",
      };
    } catch (err) {
      console.warn("AI واقعی در دسترس نبود، موتور محلی استفاده شد:", err?.message || err);
      return { ...offline(text), fallbackReason: err?.message || "خطای نامشخص" };
    }
  }

  return { generateWorkout, isEnabled };
})();
