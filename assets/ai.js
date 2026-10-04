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

  function phaseKind(phase) {
    const text = String(phase || "");
    if (/سرد/.test(text)) return "cool";
    if (/پا/.test(text)) return "kick";
    if (/اصلی/.test(text)) return "main";
    if (/تکنیک|دریل|درِیل/.test(text)) return "drill";
    if (/گرم/.test(text)) return "warm";
    return "other";
  }

  /* فقط وقتی متراژ هدف بزرگ‌تر از صفر باشد جمع بخش‌ها را دقیقاً به همان عدد می‌رساند. */
  function fitSetMeters(sets, targetMeters) {
    const target = Math.round(Number(targetMeters));
    if (!(target > 0) || !Array.isArray(sets) || !sets.length) return sets;

    let step = target % 50 === 0 ? 50 : 25;
    if (step * sets.length > target) step = 25;

    const weights = sets.map((set) => {
      const meters = Math.round(Number(set && set.meters));
      return Number.isFinite(meters) && meters > 0 ? meters : 1;
    });
    const weightSum = weights.reduce((sum, meters) => sum + meters, 0) || 1;
    const kinds = sets.map((set) => phaseKind(set && set.phase));
    let main = kinds.lastIndexOf("main");
    if (main < 0) main = weights.indexOf(Math.max(...weights));

    const blocks = Math.floor(target / step);
    const remainder = target - blocks * step;
    const units = new Array(sets.length).fill(0);

    if (blocks >= sets.length) {
      weights.forEach((weight, index) => {
        units[index] = Math.max(1, Math.round((weight / weightSum) * blocks));
      });
      let drift = units.reduce((sum, count) => sum + count, 0) - blocks;
      let guard = 0;
      while (drift > 0 && guard < 1000) {
        guard += 1;
        let donor = -1;
        units.forEach((count, index) => {
          if (count > 1 && (donor < 0 || count > units[donor])) donor = index;
        });
        if (donor < 0) break;
        units[donor] -= 1;
        drift -= 1;
      }
      if (drift < 0) units[main] -= drift;
    } else {
      const order = weights
        .map((weight, index) => index)
        .sort((a, b) => (a === main ? -1 : b === main ? 1 : weights[b] - weights[a]));
      for (let block = 0; block < blocks; block += 1) units[order[block % order.length]] += 1;
    }

    const assigned = units.map((count) => count * step);
    assigned[main] += target - assigned.reduce((sum, meters) => sum + meters, 0);
    if (assigned[main] < 0) {
      let debt = -assigned[main];
      assigned[main] = 0;
      sets.forEach((_, index) => {
        if (index === main || debt <= 0) return;
        const take = Math.min(assigned[index], debt);
        assigned[index] -= take;
        debt -= take;
      });
      assigned[main] = target - assigned.reduce((sum, meters) => sum + meters, 0);
    }

    return sets
      .map((set, index) => ({
        ...set,
        meters: assigned[index],
        detail: syncSetDetail(set.detail, assigned[index]),
      }))
      .filter((set) => set.meters > 0);
  }

  function syncSetDetail(detail, meters) {
    const text = String(detail || "");
    const match = text.match(/([۰-۹0-9]+)\s*[×x]\s*([۰-۹0-9]+)/);
    if (!match) return text;
    const rep = Number(String(match[2]).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))));
    if (!rep || meters % rep !== 0) return text;
    return text.replace(match[0], `${UI.fa(meters / rep)} × ${UI.fa(rep)}`);
  }

  function generateWorkout({ group, level, stroke, minutes, focus, poolLength, note, targetMeters }) {
    const perMinute = METERS_PER_MINUTE[level] || 38;
    const requested = Math.round(Number(targetMeters));
    const total = requested > 0 ? requested : roundTo(perMinute * minutes, 50);
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

    const fitted = requested > 0 ? fitSetMeters(sets, requested) : sets;
    const meters = fitted.reduce((sum, s) => sum + s.meters, 0);
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
      targetMeters: requested > 0 ? requested : 0,
      meters,
      laps,
      sets: fitted,
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

    const targetMatch = digits.match(/متراژ(?:\s*هدف)?\s*[:：]?\s*(\d{2,5})/);
    return {
      minutes: minutesMatch ? Math.min(150, Number(minutesMatch[1])) : 60,
      stroke,
      level,
      group,
      focus,
      poolLength: /۵۰ متری|50 متری/.test(clean) ? 50 : 25,
      targetMeters: targetMatch ? Number(targetMatch[1]) : 0,
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

  function eventDigits(text) {
    return String(text || "")
      .replace(/\u200c/g, " ")
      .replace(/[ي]/g, "ی")
      .replace(/[ك]/g, "ک")
      .replace(/کرال\s*سینه/g, "کرال سینه")
      .replace(/کرال\s*پشت/g, "کرال پشت")
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/(\d)[٫](\d)/g, "$1.$2");
  }

  function mentionedStrokes(text) {
    const found = [];
    if (/پروانه/.test(text)) found.push("پروانه");
    if (/قورباغه/.test(text)) found.push("قورباغه");
    if (/کرال پشت|(?:^|[^ل])پشت/.test(text)) found.push("کرال پشت");
    if (/کرال سینه|آزاد|(?:^|[^ل])سینه/.test(text)) found.push("کرال سینه");
    return found;
  }

  function mentionedDistance(text) {
    const match = eventDigits(text).match(/(25|50|100|200)\s*متر/);
    return match ? Number(match[1]) : null;
  }

  function mentionedExactTime(text) {
    const digits = eventDigits(text);
    if (/ثانیه\s*(کم|زیاد|بهتر|بدتر|کاهش|افزایش)|کم شد|زیاد شد|(?:کاهش|افزایش|کم|زیاد|بهتر|بدتر)(?:ی)?\s*\d/.test(digits) && !/زمان/.test(digits)) return null;
    const match = digits.match(/زمان(?:ش)?\s*(?:شد|به|:|＝|=)?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*ثانیه/);
    if (!match) return null;
    const raw = match[1] || match[2] || "";
    const time = Number(raw);
    return Number.isFinite(time) && time > 0 ? time : null;
  }

  function mentionedDelta(text) {
    const digits = eventDigits(text);
    let amount = null;
    let word = "";
    const after = digits.match(/(\d+(?:\.\d+)?)\s*ثانیه\s*(کاهش|افزایش|کم|زیاد|بهتر|بدتر)/);
    const before = digits.match(/(کاهش|افزایش|کم|زیاد|بهتر|بدتر)(?:ی)?\s*(\d+(?:\.\d+)?)\s*ثانیه/);
    if (after) {
      amount = Number(after[1]);
      word = after[2];
    } else if (before) {
      amount = Number(before[2]);
      word = before[1];
    } else if (/کم شد|زیاد شد/.test(digits)) {
      const loose = digits.match(/(\d+(?:\.\d+)?)\s*ثانیه/);
      amount = loose ? Number(loose[1]) : null;
      word = /کم/.test(digits) ? "کم" : "زیاد";
    }
    if (!Number.isFinite(amount)) return null;
    return /کم|کاهش|بهتر/.test(word) ? -amount : amount;
  }

  function mentionedRate(text) {
    const digits = eventDigits(text);
    if (!/ریت/.test(digits)) return null;
    const direct = digits.match(/ریت\s*(\d+(?:\.\d+)?)/);
    if (direct) return Number(direct[1]);
    const became = digits.match(/ریت[\s\S]{0,48}?(?:شده|شد)\s*(\d+(?:\.\d+)?)/);
    return became ? Number(became[1]) : null;
  }

  function blankBranch() {
    return {
      active: false,
      stroke: null,
      distance: null,
      exactTime: null,
      delta: null,
      strokeCount: null,
      rate: null,
      status: null,
      sessionDate: null,
      attemptedDate: null,
      relativeLabel: null,
      dateMissing: false,
      saysToday: false,
      saysOther: false,
    };
  }

  function blankFacts() {
    return { record: blankBranch(), biomech: blankBranch(), attendance: blankBranch() };
  }

  function splitClauses(text) {
    return eventDigits(text)
      .split(/[،,؛;\n]+|\s+و\s+(?=رکورد|تعداد|ریت|غایب|حاضر|تأخیر|تاخیر|جلسه|زمان)|(?=رکورد|تعداد\s*دست|دست\s*کشی|ریت|جلسه\s)/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function clauseKind(clause) {
    if (/غایب|نیامد|حاضر|تأخیر|تاخیر|دیر آمد/.test(clause)) return "attendance";
    if (/ریت|دست\s*کشی|بیومکانیک|پیشروی|تعداد\s*دست|\d+\s*دست|دست/.test(clause)) return "biomech";
    if (/رکورد|زمان|ثانیه|کاهش|افزایش|کم شد|زیاد شد|بهتر شد|بدتر شد|افت کرد|خوب بود|عالی شد|رکورد زد/.test(clause)) return "record";
    return "loose";
  }

  function mentionedDistances(text) {
    const found = [];
    const pattern = /(25|50|100|200)\s*متر/g;
    const digits = eventDigits(text);
    let match = pattern.exec(digits);
    while (match) {
      found.push(Number(match[1]));
      match = pattern.exec(digits);
    }
    return found;
  }

  function mentionedStrokeCount(text) {
    const digits = eventDigits(text);
    const before = digits.match(/(\d+)\s*دست/);
    if (before) return Number(before[1]);
    const after = digits.match(/دست[^\d]{0,40}(\d+)/);
    return after ? Number(after[1]) : null;
  }

  function jalaliLeap(year) {
    return [1, 5, 9, 13, 17, 22, 26, 30].includes(year % 33);
  }

  function jalaliMonthLength(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return jalaliLeap(year) ? 30 : 29;
  }

  function faSessionDate(year, month, day) {
    const monthText = String(month).padStart(2, "0");
    const dayText = String(day).padStart(2, "0");
    return `${UI.fa(year)}/${UI.fa(monthText)}/${UI.fa(dayText)}`;
  }

  function shiftJalali(key, days) {
    const digits = eventDigits(key);
    const match = digits.match(/(14\d{2})\/(\d{2})\/(\d{2})/);
    if (!match) return null;
    let year = Number(match[1]);
    let month = Number(match[2]);
    let day = Number(match[3]);
    let left = days;
    while (left > 0) {
      if (day > left) {
        day -= left;
        left = 0;
      } else {
        left -= day;
        month -= 1;
        if (month < 1) {
          month = 12;
          year -= 1;
        }
        day = jalaliMonthLength(year, month);
      }
    }
    return faSessionDate(year, month, day);
  }

  function mentionedCalendarDate(text) {
    const digits = eventDigits(text);
    const explicit = digits.match(/(14\d{2})\/(\d{2})\/(\d{2})/);
    if (explicit) return faSessionDate(explicit[1], Number(explicit[2]), Number(explicit[3]));
    const today = eventDigits(TODAY_KEY).match(/(14\d{2})\//);
    const year = today ? today[1] : null;
    const months = [
      ["فروردین", 1],
      ["اردیبهشت", 2],
      ["خرداد", 3],
      ["تیر", 4],
      ["مرداد", 5],
      ["شهریور", 6],
      ["مهر", 7],
      ["آبان", 8],
      ["آذر", 9],
      ["دی", 10],
      ["بهمن", 11],
      ["اسفند", 12],
    ];
    for (let i = 0; i < months.length; i += 1) {
      const found = digits.match(new RegExp(`(\\d{1,2})\\s*${months[i][0]}`));
      if (found && year) return faSessionDate(year, months[i][1], Number(found[1]));
    }
    return null;
  }

  function resolveSessionMention(text) {
    const note = eventDigits(text);
    const result = {
      sessionDate: null,
      dateMissing: false,
      attemptedDate: null,
      relativeLabel: null,
      saysToday: /امروز/.test(note),
      saysOther: false,
    };
    if (/پس\s*پریروز/.test(note)) {
      result.relativeLabel = "پس‌پریروز";
      result.saysOther = true;
    } else if (/پریروز/.test(note)) {
      result.relativeLabel = "پریروز";
      result.saysOther = true;
    } else if (/دیروز/.test(note)) {
      result.relativeLabel = "دیروز";
      result.saysOther = true;
    } else if (/جلسه قبلی|جلسه قبل/.test(note)) {
      result.relativeLabel = "جلسه قبلی";
      result.saysOther = true;
    }
    const explicit = mentionedCalendarDate(note);
    if (explicit) {
      result.attemptedDate = explicit;
      result.saysOther = true;
      if (SESSION_DATES.includes(explicit)) result.sessionDate = explicit;
      else result.dateMissing = true;
      return result;
    }
    if (result.relativeLabel === "جلسه قبلی") {
      const index = SESSION_DATES.indexOf(TODAY_KEY);
      result.sessionDate = index > 0 ? SESSION_DATES[index - 1] : null;
      result.attemptedDate = result.sessionDate;
      result.dateMissing = !result.sessionDate;
      return result;
    }
    const shift = { "پس‌پریروز": 3, پریروز: 2, دیروز: 1 }[result.relativeLabel];
    if (shift) {
      const date = shiftJalali(TODAY_KEY, shift);
      result.attemptedDate = date;
      if (date && SESSION_DATES.includes(date)) result.sessionDate = date;
      else result.dateMissing = true;
      return result;
    }
    if (result.saysToday) result.sessionDate = TODAY_KEY;
    return result;
  }

  function fillRecord(branch, clause) {
    branch.active = true;
    const strokes = mentionedStrokes(clause);
    if (!branch.stroke && strokes.length === 1) branch.stroke = strokes[0];
    const distance = mentionedDistance(clause);
    if (!branch.distance && distance) branch.distance = distance;
    const exact = mentionedExactTime(clause);
    if (branch.exactTime == null && exact != null) branch.exactTime = exact;
    const delta = mentionedDelta(clause);
    if (branch.delta == null && delta != null) branch.delta = delta;
  }

  function fillBiomech(branch, clause) {
    branch.active = true;
    const strokes = mentionedStrokes(clause);
    if (!branch.stroke && strokes.length === 1) branch.stroke = strokes[0];
    const distance = mentionedDistance(clause);
    if (!branch.distance && distance) branch.distance = distance;
    const count = mentionedStrokeCount(clause);
    if (branch.strokeCount == null && count != null) branch.strokeCount = count;
    const rate = mentionedRate(clause);
    if (branch.rate == null && rate != null) branch.rate = rate;
    const exact = mentionedExactTime(clause);
    if (branch.exactTime == null && exact != null && branch.delta == null && !/ریت/.test(clause)) branch.exactTime = exact;
  }

  function fillAttendance(branch, clause) {
    branch.active = true;
    if (/غایب|نیامد/.test(clause)) branch.status = "absent";
    else if (/تأخیر|تاخیر|دیر آمد|با تأخیر/.test(clause)) branch.status = "late";
    else if (/حاضر/.test(clause)) branch.status = "present";
    const when = resolveSessionMention(clause);
    branch.saysToday = branch.saysToday || when.saysToday;
    branch.saysOther = branch.saysOther || when.saysOther;
    if (when.relativeLabel) branch.relativeLabel = when.relativeLabel;
    if (when.sessionDate) {
      branch.sessionDate = when.sessionDate;
      branch.dateMissing = false;
      branch.attemptedDate = when.attemptedDate;
    } else if (when.dateMissing) {
      branch.dateMissing = true;
      branch.attemptedDate = when.attemptedDate;
    }
  }

  function parseFacts(text) {
    const facts = blankFacts();
    splitClauses(text).forEach((clause) => {
      const kind = clauseKind(clause);
      if (kind === "record") fillRecord(facts.record, clause);
      else if (kind === "biomech") fillBiomech(facts.biomech, clause);
      else if (kind === "attendance") fillAttendance(facts.attendance, clause);
    });
    return facts;
  }

  function mergeBranch(prior, next) {
    const branch = { ...blankBranch(), ...(prior || {}) };
    Object.keys(next || {}).forEach((key) => {
      const value = next[key];
      if (value === true) branch[key] = true;
      else if (value != null && value !== false && value !== "") branch[key] = value;
    });
    if (next && next.sessionDate) branch.dateMissing = false;
    else if (next && next.dateMissing === true) branch.dateMissing = true;
    return branch;
  }

  function mergeFacts(prior, next) {
    const base = prior && prior.record ? prior : blankFacts();
    const incoming = next && next.record ? next : blankFacts();
    return {
      record: mergeBranch(base.record, incoming.record),
      biomech: mergeBranch(base.biomech, incoming.biomech),
      attendance: mergeBranch(base.attendance, incoming.attendance),
    };
  }

  function absorbLoose(facts, text) {
    splitClauses(text).forEach((clause) => {
      if (clauseKind(clause) !== "loose") return;
      const strokes = mentionedStrokes(clause);
      const stroke = strokes.length === 1 ? strokes[0] : null;
      const distances = mentionedDistances(clause);
      if (facts.attendance.active && (facts.attendance.dateMissing || !facts.attendance.sessionDate)) {
        const when = resolveSessionMention(clause);
        if (when.sessionDate) {
          facts.attendance.sessionDate = when.sessionDate;
          facts.attendance.dateMissing = false;
          facts.attendance.attemptedDate = when.attemptedDate;
        }
      }
      if (stroke && facts.biomech.active && facts.biomech.stroke === stroke && !facts.biomech.distance && distances[0]) {
        facts.biomech.distance = distances[0];
        return;
      }
      if (stroke && facts.record.active && !facts.record.stroke && stroke !== facts.biomech.stroke) {
        facts.record.stroke = stroke;
        if (!facts.record.distance && distances[0]) facts.record.distance = distances[0];
        if (distances[1] && facts.biomech.active && !facts.biomech.distance) facts.biomech.distance = distances[1];
        return;
      }
      if (!stroke && distances.length) {
        let index = 0;
        if (facts.record.active && !facts.record.distance) facts.record.distance = distances[index++];
        if (facts.biomech.active && !facts.biomech.distance && distances[index] != null) facts.biomech.distance = distances[index];
      }
    });
  }

  function recordQuestion(branch) {
    if (!branch.active) return null;
    const hasNumber = branch.delta != null || branch.exactTime != null;
    if (!hasNumber && branch.stroke && branch.distance) {
      return `رکورد ${UI.fa(branch.distance)} متر ${branch.stroke} چه تغییری کرد؟ (مثلاً چند ثانیه کاهش یا زمان دقیق جدید چقدر شد؟)`;
    }
    if (!hasNumber) return "این رکورد چه تغییری کرد؟ (مثلاً چند ثانیه کاهش یا زمان دقیق جدید چقدر شد؟)";
    if (!branch.stroke && !branch.distance) {
      const amount = branch.delta != null ? Math.abs(branch.delta) : branch.exactTime;
      return `مسافت و نوع شنای رکورد ${UI.fa(amount)} ثانیه چیست؟`;
    }
    const missing = [];
    if (!branch.stroke) missing.push("نوع شنا");
    if (!branch.distance) missing.push("مسافت");
    if (!missing.length) return null;
    return `برای ثبت رکورد هنوز ${missing.join(" و ")} مشخص نیست.`;
  }

  function biomechSpan(branch) {
    return branch.distance != null || branch.exactTime != null;
  }

  function biomechQuestion(branch) {
    if (!branch.active) return null;
    const strokeName = branch.stroke === "کرال سینه" ? "شنای آزاد" : branch.stroke;
    if (branch.stroke && branch.strokeCount != null && !biomechSpan(branch)) {
      return `${UI.fa(branch.strokeCount)} دست‌کشی در ${strokeName} در چه مسافتی (۲۵/۵۰/۱۰۰ متر) یا چه زمانی ثبت شده است؟`;
    }
    if (branch.stroke && branch.rate != null && !biomechSpan(branch)) {
      return `ریت ${UI.fa(branch.rate)} در ${strokeName} در چه مسافتی (۲۵/۵۰/۱۰۰ متر) یا چه زمانی ثبت شده است؟`;
    }
    if (branch.stroke && biomechSpan(branch) && (branch.strokeCount != null || branch.rate != null)) return null;
    const missing = [];
    if (!branch.stroke) missing.push("شنا");
    if (!biomechSpan(branch)) missing.push("مسافت یا زمان");
    if (branch.strokeCount == null && branch.rate == null) missing.push("تعداد دست");
    if (!missing.length) return null;
    return `برای ثبت بیومکانیک هنوز ${missing.join(" و ")} مشخص نیست.`;
  }

  function attendanceQuestion(branch) {
    if (!branch.active) return null;
    if (branch.saysToday && branch.saysOther) return "این غیبت مربوط به جلسه امروز است یا جلسه تاریخ مشخصی؟";
    if (branch.dateMissing) {
      const when = branch.relativeLabel ? `${branch.relativeLabel} (${branch.attemptedDate})` : branch.attemptedDate;
      return `برای ${when} جلسه‌ای در تقویم باشگاه ثبت نشده است. غیبت را برای کدام تاریخ جلسه می‌خواهید؟`;
    }
    if (branch.saysOther && !branch.sessionDate) return "این غیبت مربوط به جلسه امروز است یا جلسه تاریخ مشخصی؟";
    return null;
  }

  function extractEvent(student, text, priorFacts) {
    const note = String(text || "").trim();
    const facts = mergeFacts(priorFacts, parseFacts(note));
    absorbLoose(facts, note);
    const questions = [recordQuestion(facts.record), biomechQuestion(facts.biomech), attendanceQuestion(facts.attendance)].filter(Boolean);
    const updates = [];

    if (!questions.length && facts.record.active) {
      const baseline = facts.record.exactTime == null ? SJ.latestRecordTime(student, facts.record.stroke, facts.record.distance) : null;
      const time = facts.record.exactTime != null ? facts.record.exactTime : baseline == null ? null : Number((baseline + facts.record.delta).toFixed(2));
      updates.push({ type: "record", stroke: facts.record.stroke, distance: facts.record.distance, time, delta: facts.record.delta });
    }
    if (!questions.length && facts.biomech.active) {
      const count = facts.biomech.strokeCount != null
        ? facts.biomech.strokeCount
        : facts.biomech.rate != null && facts.biomech.exactTime != null
          ? Math.max(1, Math.round((facts.biomech.rate * facts.biomech.exactTime) / 60))
          : null;
      updates.push({
        type: "biomech",
        stroke: facts.biomech.stroke,
        distance: facts.biomech.distance,
        time: facts.biomech.exactTime,
        strokeCount: count,
        rate: facts.biomech.rate,
      });
    }
    if (!questions.length && facts.attendance.active) {
      const date = facts.attendance.sessionDate || TODAY_KEY;
      if (SESSION_DATES.includes(date)) updates.push({ type: "attendance", status: facts.attendance.status, date });
    }

    return {
      aiFeedback: questions.length || (priorFacts && priorFacts.record) ? "" : eventAdvice(student, note),
      proposedUpdates: questions.length ? [] : updates,
      clarifyingQuestions: questions,
      facts,
    };
  }

  function eventAdvice(student, text) {
    const note = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/سوال سیستم|پاسخ مربی/.test(line))
      .join("\n")
      .trim();
    const injured = /مصدوم|آسیب|درد|کشید|گرفتگی/.test(note);
    const lines = injured
      ? [
          `از نظر فنی، ${student.name} تا روشن شدن وضعیت آسیب نباید در ست اصلی ${student.stroke} فشار بیاورد.`,
          `از نظر روانی، عجله برای برگشت اضطراب را بیشتر می‌کند؛ به خود شناگر و خانواده بگویید بهبود از یک جلسه مهم‌تر است.`,
          `جلسه بعد فقط گرم‌کردن سبک و پرسش از درد باشد؛ اگر درد ماند، شنا را متوقف و پیگیری پزشکی کنید.`,
        ]
      : [
          `از نظر فنی، همین رخداد را در ست بعدی ${student.stroke} با حجم کمتر و اصلاح همان لحظه کار کنید.`,
          `از نظر روانی، ${student.name} را با یک جمله مشخص درباره همین نکته تشویق کنید و با دیگران مقایسه نکنید.`,
          `جلسه بعد برای همین نکته یک عدد قابل‌شمارش بگذارید و نتیجه‌اش را دوباره در وقایع بنویسید.`,
        ];
    return lines.join("\n");
  }

  function analyzeSample(sample) {
    const distance = Number(sample && sample.distance);
    const time = Number(sample && sample.time);
    const strokes = Number(sample && (sample.strokes != null ? sample.strokes : sample.strokeCount));
    const givenRate = sample && sample.rate != null ? Number(sample.rate) : null;
    if (!(time > 0) || !(strokes > 0)) {
      return {
        velocity: null,
        dps: null,
        rate: Number.isFinite(givenRate) ? Math.round(givenRate) : null,
        index: null,
      };
    }
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

    const hasDps = first.dps != null && last.dps != null;
    const dpsDelta = hasDps ? last.dps - first.dps : 0;
    const rateDelta = (last.rate || 0) - (first.rate || 0);

    if (!hasDps) {
      notes.push("این تست فقط ریت دارد و پیشروی هر دست از آن محاسبه نشده است.");
    } else if (dpsDelta > 0.05) {
      notes.push(`پیشروی با هر دست ${UI.faDecimal(dpsDelta.toFixed(2))} متر بهتر شده؛ یعنی گرفتن آب مؤثرتر شده است.`);
    } else if (dpsDelta < -0.05) {
      notes.push("پیشروی با هر دست کم شده است؛ احتمالاً دست پیش از کامل شدن کشش رها می‌شود.");
    } else {
      notes.push("پیشروی با هر دست تقریباً ثابت مانده است.");
    }

    if (last.rate == null) {
      notes.push("ریت این تست جداگانه ثبت نشده است.");
    } else if (last.rate > idealRate + 6) {
      notes.push(`ریت ${UI.fa(last.rate)} بالاتر از بازه مطلوب ${UI.fa(idealRate)} است؛ طول دست‌کشی فدای تعداد شده.`);
    } else if (last.rate < idealRate - 6) {
      notes.push(`ریت ${UI.fa(last.rate)} پایین‌تر از بازه مطلوب است؛ ست‌های ریت‌بالا با فین کوتاه اضافه شود.`);
    } else {
      notes.push(`ریت ${UI.fa(last.rate)} داخل بازه مطلوب این شنا است.`);
    }

    if (hasDps && rateDelta > 3 && dpsDelta <= 0) {
      notes.push("الگوی «ریت بالا، بازده پایین» دیده می‌شود؛ دو هفته روی ست‌های شمارش دست کار شود.");
    }

    const improvement = first.velocity && last.velocity ? ((last.velocity - first.velocity) / first.velocity) * 100 : 0;
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
    const samples = SJ.biomech(student.id, student.stroke);
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
    fitSetMeters,
    voice,
    analyzeSample,
    finaPoints,
    biomechVerdict,
    ocrReceipt,
    attendanceInsight,
    eventAdvice,
    extractEvent,
    parentReport,
    cockpitInsights,
    FOCUS_PRESETS,
  };
})();
