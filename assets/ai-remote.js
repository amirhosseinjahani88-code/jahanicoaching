/* لایه اتصال به هوش مصنوعی واقعی — فقط وقتی localhost با serve.ps1 اجرا شود.
   اگر پروکسی نبود یا خطا داد، همان موتور محلی جایگزین می‌شود. */

const AIRemote = (() => {
  const cfg = () => window.SJ_CONFIG || {};
  const STROKES = ["کرال سینه", "قورباغه", "پروانه", "کرال پشت"];
  const LEVELS = ["مبتدی", "متوسط", "پیشرفته", "رقابتی"];
  const FOCUSES = ["استقامت", "سرعت", "تکنیک", "آستانه", "استارت"];
  const TONES = ["ok", "warn", "danger", "info"];
  const MARKS = ["present", "late", "absent"];

  function isEnabled() {
    const endpoint = String(cfg().aiEndpoint || "");
    if (!endpoint) return false;
    try {
      const url = new URL(endpoint);
      const host = url.hostname.toLowerCase();
      const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
      const github = host.endsWith(".github.io") || host === "github.io" || host === "github.com";
      return loopback && !github;
    } catch (_) {
      return false;
    }
  }

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

  function safeHash(hash) {
    const value = String(hash || "");
    if (value.startsWith("#/app") || value.startsWith("#/pricing")) return value;
    return "";
  }

  async function complete({ system, user, image }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg().aiTimeoutMs || 60000);
    try {
      const response = await fetch(`${cfg().aiEndpoint.replace(/\/$/, "")}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, user, image: image || "" }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `سرویس با کد ${response.status} پاسخ داد.`);
      return { content: data?.content || "", model: data?.model || "", json: extractJson(data?.content) };
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeWorkout(raw) {
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

  const WORKOUT_SYSTEM = `تو مربی ارشد شنا هستی. فقط یک JSON بدون متن اضافه برگردان:
{"title":"...","group":"...","level":"مبتدی|متوسط|پیشرفته|رقابتی","stroke":"کرال سینه|قورباغه|پروانه|کرال پشت","focus":"استقامت|سرعت|تکنیک|آستانه|استارت","minutes":60,"poolLength":25,"rateTarget":38,"coachTip":"...","sets":[{"phase":"...","detail":"...","meters":200,"note":"..."}]}
۴ تا ۶ بخش با ترتیب گرم‌کردن، تکنیک، ست اصلی، ست پا، سردکردن. meters مضرب ۲۵ باشد.`;

  async function generateWorkout(brief) {
    const text = String(brief || "").trim();
    const offline = () => ({ ...AI.generateWorkout(AI.parseBrief(text)), engine: "offline" });
    if (!text || !isEnabled()) return offline();
    try {
      const { json, model } = await complete({ system: WORKOUT_SYSTEM, user: text });
      const workout = normalizeWorkout(json);
      if (!workout) throw new Error("خروجی مدل قابل استفاده نبود.");
      return { ...workout, note: text, createdAt: offline().createdAt, engine: "ai", model };
    } catch (err) {
      console.warn("AI واقعی در دسترس نبود:", err?.message || err);
      return { ...offline(), fallbackReason: err?.message || "خطای نامشخص" };
    }
  }

  async function attendanceInsight(counts, absentNames, lateNames) {
    const fallback = () => ({ ...AI.attendanceInsight(counts, absentNames, lateNames), engine: "offline" });
    if (!isEnabled()) return fallback();
    try {
      const { json } = await complete({
        system: `تو مربی شنا هستی. فقط JSON بده: {"rate":85,"lines":["...","..."]}. ۳ تا ۵ جمله کاربردی فارسی برای مربی. rate درصد حضور است.`,
        user: `کل ${counts.total}، حاضر ${counts.present}، تأخیر ${counts.late}، غایب ${counts.absent}. غایبان: ${absentNames.join("، ") || "ندارد"}. تأخیر: ${lateNames.join("، ") || "ندارد"}.`,
      });
      const lines = Array.isArray(json?.lines) ? json.lines.map((l) => String(l).slice(0, 220)).filter(Boolean).slice(0, 6) : [];
      if (lines.length < 2) throw new Error("تحلیل ناقص بود.");
      const rate = clampInt(json.rate, 0, 100, counts.total ? Math.round(((counts.present + counts.late) / counts.total) * 100) : 0);
      return { rate, lines, engine: "ai" };
    } catch (err) {
      return { ...fallback(), fallbackReason: err?.message };
    }
  }

  async function parentReport(student) {
    const fallback = () => ({ ...AI.parentReport(student), engine: "offline" });
    if (!isEnabled()) return fallback();
    const local = AI.parentReport(student);
    try {
      const { json } = await complete({
        system: `تو مربی شنا هستی و برای ولی شاگرد گزارش می‌نویسی. فقط JSON: {"paragraphs":["...","..."],"homework":["...","..."]}. لحن محترم، دقیق و قابل فهم برای والدین. ۲ تا ۴ پاراگراف و ۲ تا ۴ تمرین خانگی.`,
        user: `نام ${student.name}، ${student.age} ساله، ${student.group}، سطح ${student.level}، شنا ${student.stroke}، ماده ${student.event}. رکوردها: ${student.times.join("، ")}. حضور ${local.attendanceRate}٪. FINA ${local.finaPoints || "نامشخص"}. تحلیل فنی: ${local.verdict.headline}. ${local.verdict.notes.join(" ")}`,
      });
      const paragraphs = Array.isArray(json?.paragraphs) ? json.paragraphs.map((p) => String(p).slice(0, 400)).filter(Boolean).slice(0, 5) : [];
      const homework = Array.isArray(json?.homework) ? json.homework.map((h) => String(h).slice(0, 160)).filter(Boolean).slice(0, 5) : [];
      if (paragraphs.length < 2) throw new Error("کارنامه ناقص بود.");
      return { ...local, paragraphs, homework: homework.length ? homework : local.homework, engine: "ai" };
    } catch (err) {
      return { ...fallback(), fallbackReason: err?.message };
    }
  }

  async function biomechExplain(student) {
    const samples = SJ.biomech(student.id);
    const fallback = () => ({ ...AI.biomechVerdict(samples, student.stroke), engine: "offline" });
    if (!isEnabled()) return fallback();
    const local = fallback();
    const analyzed = samples.map((s) => AI.analyzeSample({ distance: s.distance, time: s.time, strokes: s.strokes }));
    try {
      const { json } = await complete({
        system: `تو آنالیزور بیومکانیک شنا هستی. اعداد از قبل حساب شده‌اند؛ آن‌ها را عوض نکن. فقط JSON: {"headline":"...","notes":["...","..."]}. ۲ تا ۴ نکته اجرایی.`,
        user: `شناگر ${student.name}، شنا ${student.stroke}. نمونه‌ها: ${JSON.stringify(analyzed)}. جمع‌بندی فعلی: ${local.headline}.`,
      });
      const notes = Array.isArray(json?.notes) ? json.notes.map((n) => String(n).slice(0, 220)).filter(Boolean).slice(0, 6) : [];
      if (!notes.length) throw new Error("تفسیر ناقص بود.");
      return { ...local, headline: String(json.headline || local.headline).slice(0, 160), notes, engine: "ai" };
    } catch (err) {
      return { ...fallback(), fallbackReason: err?.message };
    }
  }

  async function cockpitInsights() {
    const fallback = () => AI.cockpitInsights().map((item) => ({ ...item, engine: "offline" }));
    if (!isEnabled()) return fallback();
    const finance = SJ.financeSummary();
    const counts = SJ.todayCounts();
    const pending = SJ.workouts().filter((w) => w.status === "draft").length;
    const risky = SJ.students()
      .map((s) => ({ name: s.name, id: s.id, rate: SJ.attendanceRate(s.id) }))
      .filter((row) => row.rate < 80)
      .slice(0, 4);
    try {
      const { json } = await complete({
        system: `تو دستیار عملیاتی مربی شنا هستی. فقط JSON: {"items":[{"tone":"ok|warn|danger|info","text":"...","label":"...","hash":"#/app/..."}]} بین ۲ تا ۵ مورد. hash فقط از این‌ها: #/app/attendance #/app/students #/app/sessions #/app/workout #/app/finance #/app/biomech #/app/student/ID`,
        user: `حضور امروز ${counts.marked}/${counts.total}. بدهکاران ${finance.debtors}، مانده ${finance.due}. پیش‌نویس جلسات ${pending}. ریسک حضور: ${JSON.stringify(risky)}`,
      });
      const items = Array.isArray(json?.items)
        ? json.items
            .filter((i) => i && i.text)
            .slice(0, 6)
            .map((i) => ({
              tone: pick(i.tone, TONES, "info"),
              text: String(i.text).slice(0, 220),
              action: i.label && safeHash(i.hash) ? { label: String(i.label).slice(0, 40), hash: safeHash(i.hash) } : null,
              engine: "ai",
            }))
        : [];
      if (!items.length) throw new Error("بینش خالی بود.");
      return items;
    } catch (err) {
      return fallback();
    }
  }

  async function ocrReceipt(file, students) {
    const fallback = () => ({ ...AI.ocrReceipt(file && file.name, students), engine: "offline" });
    if (!isEnabled()) return fallback();
    const image = await readImage(file);
    const roster = students.map((s) => `${s.id}:${s.name}`).join("، ");
    try {
      const { json } = await complete({
        system: `رسید بانکی را بخوان. فقط JSON: {"studentId":1,"amount":1000000,"date":"۱۴۰۴/۰۶/۳۱","refId":"...","method":"کارت به کارت"}. studentId باید یکی از شناسه‌های داده‌شده باشد. اگر تصویر نبود از نام فایل حدس نزن؛ نزدیک‌ترین شاگرد بدهکار را برگردان.`,
        user: `شاگردان: ${roster}. نام فایل: ${file && file.name ? file.name : "نامشخص"}`,
        image,
      });
      const student = students.find((s) => s.id === Number(json?.studentId)) || students[0];
      const amount = clampInt(json?.amount, 10000, 20000000, SJ.studentBalance(student.id).due || student.fee);
      return {
        studentId: student.id,
        studentName: student.name,
        amount,
        date: String(json?.date || TODAY_KEY).slice(0, 20),
        refId: String(json?.refId || "SJ-AI").slice(0, 32),
        method: String(json?.method || "کارت به کارت").slice(0, 40),
        confidence: image ? 96 : 80,
        matchedBy: image ? "خواندن تصویر رسید با AI" : "تطبیق متنی با پرونده",
        engine: "ai",
      };
    } catch (err) {
      return { ...fallback(), fallbackReason: err?.message };
    }
  }

  async function ocrAttendance(file, students) {
    const fallbackNames = [students[3], students[11]].filter(Boolean);
    if (!isEnabled()) {
      return { engine: "offline", rows: fallbackNames.map((s, i) => ({ id: s.id, status: i ? "late" : "absent" })) };
    }
    const image = await readImage(file);
    const roster = students.map((s) => `${s.id}:${s.name}`).join("، ");
    try {
      const { json } = await complete({
        system: `برگه حضور و غیاب شنا را بخوان. فقط JSON: {"rows":[{"id":1,"status":"present|late|absent"}]}. فقط شناسه‌های داده‌شده را برگردان. اگر تصویر ناخوانا بود حدس محافظه‌کارانه بزن.`,
        user: `شاگردان: ${roster}`,
        image,
      });
      const rows = Array.isArray(json?.rows)
        ? json.rows
            .map((r) => ({ id: Number(r.id), status: pick(r.status, MARKS, "") }))
            .filter((r) => r.id && r.status && students.some((s) => s.id === r.id))
        : [];
      if (!rows.length) throw new Error("نامی از برگه خوانده نشد.");
      return { engine: "ai", rows };
    } catch (err) {
      return { engine: "offline", fallbackReason: err?.message, rows: fallbackNames.map((s, i) => ({ id: s.id, status: i ? "late" : "absent" })) };
    }
  }

  function readImage(file) {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith("image/") || file.size > 2500000) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  return {
    isEnabled,
    generateWorkout,
    attendanceInsight,
    parentReport,
    biomechExplain,
    cockpitInsights,
    ocrReceipt,
    ocrAttendance,
  };
})();
