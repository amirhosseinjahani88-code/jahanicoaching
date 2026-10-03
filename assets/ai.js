/* موتور هوش مصنوعی نمایشی (Mock AI).
   خروجی‌ها با قاعده‌های مربیگری ساخته می‌شوند تا در فاز ۲ جای آن‌ها API واقعی بنشیند. */

const AI = (() => {
  const METERS_PER_MINUTE = { مبتدی: 18, متوسط: 30, پیشرفته: 42, رقابتی: 52 };

  /* پله‌های متراژ تکرار؛ ست اصلی باید بین ۴ تا ۱۶ تکرار بماند تا اجرا شدنی باشد. */
  const REP_LADDER = [25, 50, 75, 100, 150, 200, 400];

  const FOCUS_PRESETS = {
    تکنیک: { main: 50, rest: 20, label: "تکنیک و اصلاح الگو", rateShift: -4 },
    استقامت: { main: 100, rest: 20, label: "استقامت هوازی", rateShift: -2 },
    آستانه: { main: 200, rest: 30, label: "آستانه لاکتات", rateShift: 0 },
    سرعت: { main: 25, rest: 45, label: "سرعت و توان بی‌هوازی", rateShift: 6 },
    استارت: { main: 25, rest: 60, label: "استارت و برگشت دیواره", rateShift: 4 },
  };

  /* ریت مطلوب بر حسب دست‌کشی در دقیقه؛ در قورباغه و پروانه هر دو دست هم‌زمان می‌آیند. */
  const BASE_RATE = { "کرال سینه": 72, قورباغه: 56, پروانه: 58, "کرال پشت": 66 };

  function roundTo(value, step) {
    return Math.max(step, Math.round(value / step) * step);
  }

  function reps(meters, repDistance) {
    return Math.max(1, Math.round(meters / repDistance));
  }

  /* متراژ هر تکرار را بالا می‌بریم تا تعداد تکرار در بازه قابل اجرا بیفتد */
  function fitMainSet(meters, preferred) {
    let index = Math.max(0, REP_LADDER.indexOf(preferred));
    if (index === -1) index = 0;
    let distance = REP_LADDER[index];
    while (reps(meters, distance) > 16 && index < REP_LADDER.length - 1) {
      index += 1;
      distance = REP_LADDER[index];
    }
    while (reps(meters, distance) < 4 && index > 0) {
      index -= 1;
      distance = REP_LADDER[index];
    }
    return { distance, count: reps(meters, distance) };
  }

  /* ---------- تولید جلسه تمرین ---------- */

  function generateWorkout({ group, level, stroke, minutes, focus, poolLength, note }) {
    const perMinute = METERS_PER_MINUTE[level] || 38;
    const total = roundTo(perMinute * minutes, 50);
    const preset = FOCUS_PRESETS[focus] || FOCUS_PRESETS.استقامت;

    const warmupMeters = roundTo(total * 0.2, 50);
    const drillMeters = roundTo(total * 0.15, 50);
    const mainMeters = roundTo(total * 0.4, 50);
    const kickMeters = roundTo(total * 0.15, 50);
    const coolMeters = Math.max(100, roundTo(total * 0.1, 50));

    const main = fitMainSet(mainMeters, preset.main);
    const rateTarget = Math.max(
      24,
      Math.round((BASE_RATE[stroke] || 38) + preset.rateShift + (level === "رقابتی" ? 4 : level === "مبتدی" ? -6 : 0))
    );

    const sets = [
      {
        phase: "گرم‌کردن",
        detail: `${UI.fa(reps(warmupMeters, 100))} × ۱۰۰ متر ترکیبی سبک با استراحت ۲۰ ثانیه`,
        meters: warmupMeters,
        note: "تمرکز بر تنفس دوطرفه و باز شدن شانه",
      },
      {
        phase: "تمرین تکنیک",
        detail: `${UI.fa(reps(drillMeters, 50))} × ۵۰ متر ${stroke} به‌صورت درِیل / شنا با استراحت ۱۵ ثانیه`,
        meters: drillMeters,
        note: "نقطه گرفتن آب جلوتر از خط شانه بسته شود",
      },
      {
        phase: `ست اصلی — ${preset.label}`,
        detail: `${UI.fa(main.count)} × ${UI.fa(main.distance)} متر ${stroke} با استراحت ${UI.fa(preset.rest)} ثانیه`,
        meters: main.count * main.distance,
        note: `ریت هدف ${UI.fa(rateTarget)} دست‌کشی در دقیقه`,
      },
      {
        phase: "ست پا",
        detail: `${UI.fa(reps(kickMeters, 50))} × ۵۰ متر پا با تخته، استراحت ۲۰ ثانیه`,
        meters: kickMeters,
        note: "لگن بالا و دامنه ضربه کوتاه",
      },
      {
        phase: "سردکردن",
        detail: `${UI.fa(coolMeters)} متر شنای آزاد سبک`,
        meters: coolMeters,
        note: "ضربان زیر ۱۲۰ در دقیقه",
      },
    ];

    const meters = sets.reduce((sum, s) => sum + s.meters, 0);
    const laps = Math.round(meters / (poolLength || 25));

    return {
      title: `جلسه ${preset.label} — ${group}`,
      group,
      level,
      stroke,
      focus,
      minutes,
      poolLength: poolLength || 25,
      rateTarget,
      meters,
      laps,
      sets,
      note: note || "",
      coachTip: coachTip(focus, level),
      createdAt: TODAY_KEY,
    };
  }

  function coachTip(focus, level) {
    if (focus === "سرعت") {
      return "بین تکرارهای سرعتی استراحت را کامل بدهید؛ کوتاه کردن استراحت، ست سرعتی را به ست استقامتی تبدیل می‌کند.";
    }
    if (focus === "آستانه") {
      return "اگر زمان تکرار آخر بیش از ۳ درصد از تکرار اول افت کرد، حجم ست را برای جلسه بعد کم کنید.";
    }
    if (focus === "تکنیک") {
      return "در ست تکنیک سرعت را قربانی کیفیت کنید؛ هدف تثبیت الگوی حرکت است نه زمان.";
    }
    if (level === "مبتدی") {
      return "برای این سطح، هر ۱۰ دقیقه یک وقفه آب‌رسانی و بازخورد کوتاه بگذارید.";
    }
    return "پیش از ست اصلی دو تکرار با شدت هدف بزنید تا ریت تنظیم شود.";
  }

  /* ---------- تبدیل گفتار یا متن آزاد به پارامترهای جلسه ---------- */

  function parseBrief(text) {
    const clean = String(text || "");
    const digits = clean.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

    const minutesMatch = digits.match(/(\d{2,3})\s*دقیقه/);
    const stroke = STROKES.find((s) => clean.includes(s)) || "کرال سینه";
    const level =
      LEVELS.find((l) => clean.includes(l)) ||
      (clean.includes("رقابت") ? "رقابتی" : clean.includes("مبتدی") ? "مبتدی" : "متوسط");
    const group =
      AGE_GROUPS.find((g) => clean.includes(g)) ||
      (clean.includes("نوجوان") ? "نوجوانان" : clean.includes("جوان") ? "جوانان" : "نوجوانان");

    let focus = "استقامت";
    if (/سرعت|اسپرینت|انفجار/.test(clean)) focus = "سرعت";
    else if (/تکنیک|درِیل|دریل|اصلاح/.test(clean)) focus = "تکنیک";
    else if (/آستانه|لاکتات/.test(clean)) focus = "آستانه";
    else if (/استارت|دیواره|برگشت/.test(clean)) focus = "استارت";

    return {
      minutes: minutesMatch ? Math.min(150, Number(minutesMatch[1])) : 60,
      stroke,
      level,
      group,
      focus,
      poolLength: /۵۰ متری|50 متری/.test(clean) ? 50 : 25,
      note: clean.trim(),
    };
  }

  /* موتور گفتار مرورگر؛ اگر پشتیبانی نشود، ویس شبیه‌سازی می‌شود. */
  const voice = {
    available() {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },
    start(onResult, onError) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        onError && onError("no-support");
        return null;
      }
      const recognition = new Recognition();
      recognition.lang = "fa-IR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => onResult(event.results[0][0].transcript);
      recognition.onerror = (event) => onError && onError(event.error);
      recognition.start();
      return recognition;
    },
    samples: [
      "برای نوجوانان رقابتی یک جلسه ۷۵ دقیقه‌ای کرال سینه با تمرکز روی سرعت بنویس",
      "جلسه ۶۰ دقیقه تکنیک قورباغه برای گروه ۱۰ تا ۱۳ سال",
      "برنامه آستانه لاکتات ۹۰ دقیقه برای جوانان پروانه در استخر ۵۰ متری",
    ],
  };

  /* ---------- بیومکانیک و امتیاز FINA ---------- */

  function analyzeSample({ distance, time, strokes }) {
    const velocity = distance / time;
    const dps = distance / strokes;
    const rate = (strokes / time) * 60;
    return {
      velocity: Number(velocity.toFixed(2)),
      dps: Number(dps.toFixed(2)),
      rate: Math.round(rate),
      index: Number((velocity * dps).toFixed(2)),
    };
  }

  function finaPoints(event, time) {
    const base = FINA_BASE[event];
    if (!base || !time) return null;
    return Math.round(1000 * Math.pow(base / time, 3));
  }

  function biomechVerdict(samples, stroke) {
    if (!samples.length) return { headline: "داده‌ای ثبت نشده", notes: [] };
    const analyzed = samples.map(analyzeSample);
    const first = analyzed[0];
    const last = analyzed[analyzed.length - 1];
    const idealRate = BASE_RATE[stroke] || 38;
    const notes = [];

    const dpsDelta = last.dps - first.dps;
    const rateDelta = last.rate - first.rate;

    if (dpsDelta > 0.05) {
      notes.push(`پیشروی با هر دست ${UI.faDecimal(dpsDelta.toFixed(2))} متر بهتر شده؛ یعنی گرفتن آب مؤثرتر شده است.`);
    } else if (dpsDelta < -0.05) {
      notes.push("پیشروی با هر دست کم شده است؛ احتمالاً دست پیش از کامل شدن کشش رها می‌شود.");
    } else {
      notes.push("پیشروی با هر دست تقریباً ثابت مانده است.");
    }

    if (last.rate > idealRate + 6) {
      notes.push(`ریت ${UI.fa(last.rate)} بالاتر از بازه مطلوب ${UI.fa(idealRate)} است؛ طول دست‌کشی فدای تعداد شده.`);
    } else if (last.rate < idealRate - 6) {
      notes.push(`ریت ${UI.fa(last.rate)} پایین‌تر از بازه مطلوب است؛ ست‌های ریت‌بالا با فین کوتاه اضافه شود.`);
    } else {
      notes.push(`ریت ${UI.fa(last.rate)} داخل بازه مطلوب این شنا است.`);
    }

    if (rateDelta > 3 && dpsDelta <= 0) {
      notes.push("الگوی «ریت بالا، بازده پایین» دیده می‌شود؛ دو هفته روی ست‌های شمارش دست کار شود.");
    }

    const improvement = ((last.velocity - first.velocity) / first.velocity) * 100;
    return {
      headline:
        improvement > 1
          ? `سرعت میانگین ${UI.faDecimal(improvement.toFixed(1))} درصد بهتر شده است`
          : improvement < -1
          ? `سرعت میانگین ${UI.faDecimal(Math.abs(improvement).toFixed(1))} درصد افت داشته است`
          : "سرعت میانگین تقریباً پایدار است",
      improvement: Number(improvement.toFixed(1)),
      first,
      last,
      notes,
    };
  }

  /* ---------- دستیار مالی: اسکن رسید ---------- */

  function ocrReceipt(fileName, students) {
    const seed = String(fileName || "receipt").length + (students.length || 1);
    const student = students[seed % students.length];
    const balance = SJ.studentBalance(student.id);
    const amount = balance.due > 0 ? balance.due : Math.round(student.fee / 2);
    return {
      studentId: student.id,
      studentName: student.name,
      amount,
      date: TODAY_KEY,
      refId: `SJ-${UI.fa(String(700000 + seed * 137))}`,
      method: "کارت به کارت",
      confidence: 92 + (seed % 7),
      matchedBy: "تطبیق نام واریزکننده با پرونده شاگرد",
    };
  }

  /* ---------- تحلیل حضور و غیاب ---------- */

  function noteForName(notes, name) {
    const text = String(notes || "").replace(/\s+/g, " ").trim();
    if (!text || !name) return "";
    const first = String(name).split(" ")[0];
    const chunks = text.split(/[\n.!?؟]+/).map((part) => part.trim()).filter(Boolean);
    return chunks.find((part) => part.includes(name) || (first && part.includes(first))) || "";
  }

  function attendanceInsight(counts, absentNames, lateNames, notes) {
    const total = counts.total || 0;
    const present = counts.present || 0;
    const lateCount = counts.late || 0;
    const rate = total ? Math.round(((present + lateCount) / total) * 100) : 0;
    const onTime = total ? Math.round((present / total) * 100) : 0;
    const discipline = `انضباط این جلسه ${UI.fa(onTime)}٪ است: ${UI.fa(present)} نفر از ${UI.fa(total)} به‌موقع در آب بودند. مشارکت تیمی ${UI.fa(rate)}٪ است، چون ${UI.fa(lateCount)} نفر با تأخیر هم به جمع پیوستند.`;
    const absences = (absentNames || []).map((name) => {
      const snippet = noteForName(notes, name);
      const injured = /مصدوم|آسیب|درد|کشید|گرفتگی|کبود|التهاب|پزشک/.test(snippet);
      let action;
      if (injured) {
        action = `پیگیری فوری ${name}: در یادداشت آمده «${snippet}». همین امروز با خانواده تماس بگیر، وضعیت آسیب را بپرس و تا نظر پزشک، او را به آب برنگردان.`;
      } else if (snippet) {
        action = `پیگیری ${name}: یادداشت همین جلسه می‌گوید «${snippet}». این علت را با خانواده تأیید کن و جلسه بعد را فقط بر اساس همان دلیل تنظیم کن.`;
      } else {
        action = `برای ${name} در یادداشت این جلسه علت غیبت نوشته نشده. پیش از جلسه بعد دلیل دقیق را از خانواده بپرس و در پرونده همین نفر ثبت کن.`;
      }
      return { name, action };
    });
    const latePlan = (lateNames || []).length
      ? `ست جبرانی برای ${(lateNames || []).join("، ")}: ۴ × ۵۰ متر شنای اصلی، استراحت ۲۰ ثانیه، فقط نرم و با تمرکز روی رسیدن به ریتم گروه. بعد از همین ست به ست اصلی بپیوندند.`
      : "تأخیری در این جلسه ثبت نشده؛ ست جبرانی لازم نیست.";
    const lines = [discipline, ...absences.map((row) => row.action), latePlan];
    return { rate, discipline, absences, latePlan, lines };
  }

  /* ---------- کارنامه اولیا ---------- */

  function parentReport(student) {
    const times = student.times;
    const delta = times[0] - times[times.length - 1];
    const samples = SJ.biomech(student.id);
    const verdict = biomechVerdict(samples, student.stroke);
    const points = finaPoints(student.event, times[times.length - 1]);
    const rate = SJ.attendanceRate(student.id);

    const paragraphs = [
      `${student.name} در ${UI.fa(times.length)} ماه گذشته رکورد ${student.event} خود را ${UI.secs(delta)} ثانیه بهتر کرده و به ${UI.secs(times[times.length - 1])} ثانیه رسیده است.`,
      verdict.notes[0],
      `نرخ حضور در جلسات ${UI.fa(rate)} درصد بوده است؛ ${rate >= 85 ? "این پایداری بیشترین سهم را در پیشرفت داشته است." : "افزایش پایداری حضور، سریع‌ترین راه بهبود رکورد است."}`,
    ];

    const homework =
      student.age <= 12
        ? ["۳ نوبت تمرین تعادل روی یک پا، هر نوبت ۳۰ ثانیه", "بازی نفس‌گیری در وان یا دوش، روزی ۵ دقیقه"]
        : ["۳ نوبت پلانک ۳۰ ثانیه‌ای", "کشش سبک شانه با تراباند، روزی ۸ دقیقه", "۱۰ دقیقه پیاده‌روی تند پیش از خواب"];

    return { paragraphs, homework, finaPoints: points, attendanceRate: rate, verdict };
  }

  /* ---------- هوش عملیاتی کاکپیت ---------- */

  function cockpitInsights() {
    const finance = SJ.financeSummary();
    const counts = SJ.todayCounts();
    const items = [];

    if (counts.marked < counts.total) {
      items.push({
        tone: "warn",
        text: `حضور و غیاب امروز ناقص است (${UI.fa(counts.marked)} از ${UI.fa(counts.total)} ثبت شده).`,
        action: { label: "تکمیل حضور و غیاب", hash: "#/app/attendance" },
      });
    }
    if (finance.debtors > 0) {
      items.push({
        tone: "warn",
        text: `${UI.fa(finance.debtors)} شاگرد بدهی شهریه دارند؛ مجموع ${UI.millions(finance.due)}.`,
        action: { label: "دستیار مالی", hash: "#/app/finance" },
      });
    }
    const pending = SJ.workouts().filter((w) => w.status === "draft");
    if (pending.length) {
      items.push({
        tone: "info",
        text: `${UI.fa(pending.length)} جلسه در دروازه بازبینی منتظر تأیید شماست.`,
        action: { label: "بازبینی جلسه", hash: "#/app/workout" },
      });
    }
    const risky = SJ.students()
      .map((s) => ({ s, rate: SJ.attendanceRate(s.id) }))
      .filter((row) => row.rate < 80)
      .slice(0, 2);
    risky.forEach((row) => {
      items.push({
        tone: "danger",
        text: `${row.s.name} نرخ حضور ${UI.fa(row.rate)} درصد دارد؛ ریسک ریزش.`,
        action: { label: "پرونده شاگرد", hash: `#/app/student/${row.s.id}` },
      });
    });
    if (!items.length) {
      items.push({ tone: "ok", text: "همه چیز به‌روز است؛ جلسه امروز آماده اجراست.", action: null });
    }
    return items;
  }

  return {
    generateWorkout,
    parseBrief,
    voice,
    analyzeSample,
    finaPoints,
    biomechVerdict,
    ocrReceipt,
    attendanceInsight,
    parentReport,
    cockpitInsights,
    FOCUS_PRESETS,
  };
})();
