/* لایه اتصال به هوش مصنوعی واقعی.
   روی localhost پروکسی serve.ps1 است و روی گیت‌هاب پروکسی Cloudflare.
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
      const github = host.endsWith(".github.io") || host === "github.io" || host === "github.com" || host.endsWith(".githubusercontent.com");
      const httpsProxy = url.protocol === "https:" && host.endsWith(".workers.dev");
      const loopback = (url.protocol === "http:" || url.protocol === "https:") && (host === "localhost" || host === "127.0.0.1" || host === "[::1]");
      return !github && (loopback || httpsProxy);
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
        meters: clampInt(s.meters, 25, 100000, 200),
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

  function workoutPrompt(parsed) {
    const target = Math.round(Number(parsed.targetMeters));
    const distanceRule =
      target > 0
        ? `متراژ این جلسه دقیقاً ${target} متر است. مجموع meters گرم‌کردن + تکنیک + ست اصلی + ست پا + سردکردن باید دقیقاً ${target} باشد، نه کمتر و نه بیشتر.`
        : `در متن متراژ نیامده. خودت از مدت ${parsed.minutes} دقیقه، رده ${parsed.group} و سطح ${parsed.level} یک متراژ استاندارد پیشنهاد بده.`;
    return `${WORKOUT_SYSTEM}\n${distanceRule}\nپارامترهای استخراج‌شده از متن: رده ${parsed.group}، سطح ${parsed.level}، ${parsed.minutes} دقیقه، تاکید ${parsed.focus}، شنا ${parsed.stroke}.`;
  }

  async function generateWorkout(brief) {
    const text = String(brief || "").trim();
    const parsed = AI.parseBrief(text);
    const requested = parsed.targetMeters > 0 ? parsed.targetMeters : 0;
    const offline = () => ({ ...AI.generateWorkout({ ...parsed, targetMeters: requested }), engine: "offline" });
    if (!text || !isEnabled()) return offline();
    try {
      const { json, model } = await complete({
        system: workoutPrompt(parsed),
        user: JSON.stringify({
          brief: text,
          targetMeters: requested > 0 ? requested : null,
          group: parsed.group,
          level: parsed.level,
          minutes: parsed.minutes,
          focus: parsed.focus,
          stroke: parsed.stroke,
        }),
      });
      const workout = normalizeWorkout(json);
      if (!workout) throw new Error("خروجی مدل قابل استفاده نبود.");
      if (requested > 0) {
        workout.sets = AI.fitSetMeters(workout.sets, requested);
        workout.meters = workout.sets.reduce((sum, set) => sum + set.meters, 0);
        workout.laps = Math.round(workout.meters / workout.poolLength);
        workout.targetMeters = requested;
      }
      return { ...workout, note: text, createdAt: offline().createdAt, engine: "ai", model };
    } catch (err) {
      console.warn("AI واقعی در دسترس نبود:", err?.message || err);
      return { ...offline(), fallbackReason: err?.message || "خطای نامشخص" };
    }
  }

  const ATTENDANCE_SYSTEM = `تو مربی شنا هستی و فقط درباره همین یک جلسه حرف می‌زنی. توصیه عمومی، شعار انگیزشی و جمله کلیشه‌ای ممنوع است. هر جمله باید به عدد همین جلسه یا نام دقیق یک شناگر وصل باشد.
فقط JSON بدون متن اضافه:
{"rate":0,"discipline":"...","absences":[{"name":"...","action":"..."}],"latePlan":"..."}
rate درصد مشارکت همین جلسه است: (حاضر + تأخیر) تقسیم بر کل، گرد شده.
discipline یک جمله است با درصد انضباط (حاضر به‌موقع تقسیم بر کل) و درصد مشارکت تیمی.
absences برای هر نام غایب دقیقاً یک اقدام است. اگر یادداشت علت را گفته، به‌خصوص مصدومیت یا آسیب، action باید پیگیری فوری همان علت باشد. اگر علت در یادداشت نیست، صریح بگو علت ثبت نشده و خواستن دلیل از خانواده را بنویس.
اگر غایب نیست absences آرایه خالی باشد.
latePlan یک ست جبرانی کوتاه با تکرار، مسافت و استراحت برای همین افراد تأخیری است و نام‌شان را می‌آورد. اگر تأخیر نیست بنویس ست جبرانی لازم نیست.`;

  async function attendanceInsight(counts, absentNames, lateNames, notes) {
    const local = AI.attendanceInsight(counts, absentNames, lateNames, notes);
    const fallback = () => ({ ...local, engine: "offline" });
    if (!isEnabled()) return fallback();
    const payload = {
      present: counts.present,
      late: counts.late,
      absent: counts.absent,
      total: counts.total,
      absentNames,
      lateNames,
      notes: String(notes || ""),
    };
    try {
      const { json } = await complete({
        system: ATTENDANCE_SYSTEM,
        user: JSON.stringify(payload),
      });
      const byName = new Map((local.absences || []).map((row) => [row.name, row.action]));
      const returned = Array.isArray(json?.absences) ? json.absences : [];
      returned.forEach((row) => {
        const name = String(row?.name || "").trim();
        const action = String(row?.action || "").trim();
        if (name && action) byName.set(name, action.slice(0, 320));
      });
      const absences = (absentNames || []).map((name) => ({
        name,
        action: byName.get(name) || local.absences.find((row) => row.name === name)?.action || "",
      }));
      const discipline = String(json?.discipline || local.discipline).slice(0, 320);
      const latePlan = String(json?.latePlan || local.latePlan).slice(0, 320);
      const rate = clampInt(
        json?.rate,
        0,
        100,
        counts.total ? Math.round(((counts.present + counts.late) / counts.total) * 100) : 0
      );
      const lines = [discipline, ...absences.map((row) => row.action), latePlan].filter(Boolean);
      if (!discipline || (absentNames.length && absences.some((row) => !row.action))) throw new Error("تحلیل ناقص بود.");
      return { rate, discipline, absences, latePlan, lines, engine: "ai" };
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

  function readBiomechJson(json, local) {
    const notes = Array.isArray(json?.notes) ? json.notes.map((n) => String(n).slice(0, 280)).filter(Boolean).slice(0, 6) : [];
    if (!notes.length) throw new Error("پاسخ مدل ناقص بود.");
    return {
      ...local,
      headline: String(json.headline || local.headline).slice(0, 180),
      notes,
      engine: "ai",
    };
  }

  function asBiomechError(err) {
    if (err && (err.name === "AbortError" || /abort|timeout/i.test(String(err.message || "")))) {
      const timeout = new Error("زمان پاسخ سرویس تمام شد. اتصال را بررسی کنید و دوباره تلاش کنید.");
      timeout.name = "AbortError";
      return timeout;
    }
    if (err instanceof TypeError) return new TypeError("اتصال به سرویس هوش مصنوعی برقرار نشد.");
    return err instanceof Error ? err : new Error("تحلیل انجام نشد.");
  }

  async function biomechExplain(student, stroke) {
    const chosen = STROKES.includes(stroke) ? stroke : student.stroke;
    const samples = SJ.biomech(student.id, chosen);
    const fallback = () => ({ ...AI.biomechVerdict(samples, chosen), engine: "offline" });
    if (!isEnabled()) return fallback();
    const local = fallback();
    const analyzed = samples.map((s) => AI.analyzeSample(s));
    try {
      const { json } = await complete({
        system: `تو آنالیزور بیومکانیک شنا هستی. اعداد از قبل حساب شده‌اند؛ آن‌ها را عوض نکن. فقط JSON: {"headline":"...","notes":["...","..."]}. ۲ تا ۴ نکته اجرایی درباره همین شنا.`,
        user: `شناگر ${student.name}، شنا ${chosen}. نمونه‌ها: ${JSON.stringify(analyzed)}. جمع‌بندی فعلی: ${local.headline}.`,
      });
      return readBiomechJson(json, local);
    } catch (err) {
      return { ...fallback(), fallbackReason: err?.message };
    }
  }

  function eventNumber(value) {
    if (value == null || value === "") return null;
    const normalized = String(value).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function eventStroke(value) {
    const text = String(value || "").replace(/\u200c/g, " ");
    if (/پشت/.test(text)) return "کرال پشت";
    if (/قورباغه/.test(text)) return "قورباغه";
    if (/پروانه/.test(text)) return "پروانه";
    if (/سینه|آزاد/.test(text)) return "کرال سینه";
    return "";
  }

  function eventStatus(value) {
    const text = String(value || "");
    if (text === "absent" || /غایب|نیامد/.test(text)) return "absent";
    if (text === "late" || /تاخیر در ورود|تأخیر در ورود|دیر آمد/.test(text)) return "late";
    if (text === "present" || /حاضر/.test(text)) return "present";
    return "";
  }

  function eventSessionDate(value) {
    const digits = String(value || "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
    const match = digits.match(/(14\d{2})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return TODAY_KEY;
    const key = `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
    return SESSION_DATES.includes(key) ? key : "";
  }

  function modelEventDecision(json) {
    if (!json || typeof json !== "object") return null;
    const questions = (Array.isArray(json.clarifyingQuestions) ? json.clarifyingQuestions : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 6);
    if (questions.length) {
      return { aiFeedback: "", proposedUpdates: [], clarifyingQuestions: questions };
    }
    const lines = (Array.isArray(json.aiFeedback) ? json.aiFeedback : [])
      .map((item) => String(item || "").trim())
      .filter((item) => item && !/سوال سیستم|پاسخ مربی/.test(item))
      .slice(0, 3);
    const updates = [];
    (Array.isArray(json.proposedUpdates) ? json.proposedUpdates : []).forEach((row) => {
      if (!row || typeof row !== "object") return;
      const type = String(row.type || "");
      if (type === "record") {
        const stroke = eventStroke(row.stroke);
        const distance = eventNumber(row.distance);
        const time = eventNumber(row.time);
        const delta = eventNumber(row.delta);
        if (!stroke || ![25, 50, 100, 200].includes(distance) || (time == null && delta == null)) return;
        updates.push({ type, stroke, distance, time, delta });
      } else if (type === "biomech") {
        const stroke = eventStroke(row.stroke);
        const distance = eventNumber(row.distance);
        const time = eventNumber(row.time);
        const strokeCount = eventNumber(row.strokeCount);
        const rate = eventNumber(row.rate);
        const countReady = stroke && strokeCount != null && [25, 50, 100, 200].includes(distance) && time != null;
        const rateReady = stroke && rate != null && ([25, 50, 100, 200].includes(distance) || time != null);
        if (!countReady && !rateReady) return;
        updates.push({ type, stroke, distance, time, strokeCount, rate });
      } else if (type === "attendance") {
        const status = eventStatus(row.status);
        const date = eventSessionDate(row.date);
        if (!status || !date) return;
        updates.push({ type, status, date });
      }
    });
    return {
      aiFeedback: lines.length === 3 ? lines.join("\n") : "",
      proposedUpdates: updates,
      clarifyingQuestions: [],
    };
  }

  async function extractEvent(student, text, priorFacts, contextNote, dialogue) {
    const local = AI.extractEvent(student, text, priorFacts && priorFacts.record ? priorFacts : undefined);
    if (!isEnabled()) return { ...local, engine: "offline" };
    try {
      const { json } = await complete({
        system: `تو مسئول اعتبارسنجی یادداشت مربی شنا هستی. حدس نزن و رکورد یا تست اضافه نساز. فقط JSON:
{"aiFeedback":["...","...","..."],"proposedUpdates":[{"type":"record|biomech|attendance","stroke":"کرال سینه|کرال پشت|قورباغه|پروانه|null","distance":null,"time":null,"delta":null,"strokeCount":null,"rate":null,"status":"present|late|absent|null","date":null}],"clarifyingQuestions":["..."]}
اگر حتی یک بخش ناقص است، clarifyingQuestions را پر کن، proposedUpdates را خالی بگذار و aiFeedback را خالی بگذار. تحلیل ننویس.
رکورد بدون عدد قبول نیست. «سریع‌تر شد، بهتر شد، افت کرد، کم شد، زیاد شد، رکورد زد، عالی بود» فقط وقتی معتبرند که همان جمله ثانیه یا زمان دقیق داشته باشد. وگرنه بپرس: میزان تغییر یا زمان جدید دقیق چقدر بود؟
تعداد دست فقط با شنا، مسافت ۲۵/۵۰/۱۰۰/۲۰۰ و زمان، هر سه با هم، ثبت می‌شود. اگر مسافت یا زمان نبود بپرس: این N دست در چه مسافتی (۲۵/۵۰/۱۰۰) و با چه زمانی بود؟
حضور فقط سه وضعیت دارد: حاضر، غایب، تاخیر در ورود. «تاخیر داشت» مبهم است. بپرس: منظورتان غایب بود، تاخیر در ورود، یا حاضر بود؟
تاریخ را فقط اگر در فهرست جلسات باشد بپذیر. شناگر را از رشته پیش‌فرضش حدس نزن.
وقتی همه چیز کامل و عددی شد، aiFeedback را دقیقاً سه خط مربیگری بنویس و proposedUpdates را فقط برای همان موارد صریح پر کن.`,
        user: JSON.stringify({
          swimmer: student.name,
          originalNote: String(contextNote || text || "").slice(0, 900),
          questionsAlreadyAsked: dialogue && dialogue.questions ? dialogue.questions : [],
          coachReplies: dialogue && dialogue.replies ? dialogue.replies : [],
          today: TODAY_KEY,
          sessions: SESSION_DATES,
        }),
      });
      const decision = modelEventDecision(json);
      if (!decision) return { ...local, engine: "offline" };
      return { ...decision, facts: local.facts, engine: "ai" };
    } catch (err) {
      return { ...local, engine: "offline" };
    }
  }

  async function eventAdvice(student, text) {
    const local = AI.eventAdvice(student, text);
    if (!isEnabled()) return local;
    try {
      const { json } = await complete({
        system: `تو مربی شنا هستی. فقط JSON: {"lines":["...","...","..."]} دقیقاً ۳ خط. خط اول فنی، خط دوم روانشناسی، خط سوم اقدام جلسه بعد. هر خط به متن همین رخداد وصل باشد. توصیه کلی ممنوع است.`,
        user: JSON.stringify({
          name: student.name,
          age: student.age,
          level: student.level,
          stroke: student.stroke,
          event: student.event,
          note: String(text || "").slice(0, 800),
        }),
      });
      const lines = Array.isArray(json?.lines) ? json.lines.map((line) => String(line).trim()).filter(Boolean).slice(0, 3) : [];
      if (lines.length < 3) return local;
      return lines.join("\n");
    } catch (err) {
      return local;
    }
  }

  async function biomechAnalyze(student, sample) {
    if (!isEnabled()) throw new Error("اتصال به سرویس هوش مصنوعی برقرار نیست.");
    const metrics = AI.analyzeSample(sample);
    const recordTime = student.times[student.times.length - 1];
    const fina = AI.finaPoints(student.event, recordTime);
    const stroke = STROKES.includes(sample.stroke) ? sample.stroke : student.stroke;
    const local = AI.biomechVerdict([{ ...sample, stroke }], stroke);
    try {
      const { json } = await complete({
        system: `تو آنالیزور بیومکانیک شنا هستی. اعداد را عوض نکن. فقط JSON: {"headline":"...","notes":["...","..."]}. ۲ تا ۴ جمله درباره همین تست و همین شنا: ریت استروک، DPS و امتیاز FINA. جمله کلیشه‌ای ممنوع است.`,
        user: JSON.stringify({
          name: student.name,
          stroke,
          event: student.event,
          distance: sample.distance,
          time: sample.time,
          strokes: sample.strokes,
          rate: metrics.rate,
          dps: metrics.dps,
          velocity: metrics.velocity,
          fina: fina || null,
        }),
      });
      return { ...readBiomechJson(json, local), fina };
    } catch (err) {
      throw asBiomechError(err);
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
    biomechAnalyze,
    eventAdvice,
    extractEvent,
    cockpitInsights,
    ocrReceipt,
    ocrAttendance,
  };
})();
