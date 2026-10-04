/* وضعیت برنامه: نگهداری در localStorage، احراز هویت محلی، نقش‌ها و پلن‌ها. */

const SJ = (() => {
  const KEY = "swim-jahani.v1";

  /* تولید اعداد شبه‌تصادفی با دانه ثابت تا داده نمونه هر بار یکسان بماند */
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function token(studentId) {
    const base = ["sj", studentId.toString(36), (studentId * 7919).toString(36)];
    return base.join("") + "k" + ((studentId * 104729) % 99991).toString(36);
  }

  function seedAttendance() {
    const rnd = seeded(20260922);
    const store = {};
    SESSION_DATES.forEach((date, dayIndex) => {
      const marks = {};
      STUDENTS.forEach((s) => {
        const roll = rnd();
        const absentChance = s.level === "مبتدی" ? 0.14 : 0.07;
        marks[s.id] = roll < absentChance ? "absent" : roll < absentChance + 0.06 ? "late" : "present";
      });
      const isToday = date === TODAY_KEY;
      store[date] = {
        marks: isToday ? {} : marks,
        notes: "",
        analysis: null,
        locked: !isToday && dayIndex < SESSION_DATES.length - 1,
      };
    });
    return store;
  }

  function seedPayments() {
    const list = [];
    let id = 1;
    STUDENTS.forEach((s) => {
      if (s.paid > 0) {
        list.push({
          id: id++,
          studentId: s.id,
          amount: s.paid,
          date: "۱۴۰۴/۰۶/۰۵",
          method: "کارت به کارت",
          source: "manual",
          verified: true,
        });
      }
    });
    return list;
  }

  function emptyBiomech() {
    return { "کرال سینه": [], "کرال پشت": [], "قورباغه": [], "پروانه": [] };
  }

  function groupBiomech(value) {
    const grouped = emptyBiomech();
    const list = Array.isArray(value)
      ? value
      : STROKES.flatMap((stroke) =>
          value && Array.isArray(value[stroke]) ? value[stroke].map((sample) => ({ ...sample, stroke: sample.stroke || stroke })) : []
        );
    list.forEach((sample) => {
      const stroke = STROKES.includes(sample.stroke) ? sample.stroke : "کرال سینه";
      grouped[stroke].push({ ...sample, stroke });
    });
    return grouped;
  }

  function seedBiomech() {
    const store = {};
    STUDENTS.forEach((s) => {
      store[s.id] = groupBiomech(
        s.biomech.map((sample, i) => ({
          date: SESSION_DATES[SESSION_DATES.length - s.biomech.length + i] || SESSION_DATES[i],
          distance: sample.d,
          time: sample.t,
          strokes: sample.s,
          stroke: s.stroke,
        }))
      );
    });
    return store;
  }

  function freshState() {
    return {
      version: 1,
      session: { role: null, ghostFrom: null },
      accounts: {},
      coach: null,
      attendance: seedAttendance(),
      payments: seedPayments(),
      biomech: seedBiomech(),
      workouts: SAMPLE_WORKOUTS.map((w, i) => ({ ...w, id: i + 1 })),
      vaultModules: VAULT_MODULES.map((m) => ({ ...m, lessons: [...m.lessons] })),
      ownedVault: ["bio", "dryland", "nutrition", "rate"],
      viewedStudent: null,
      notesTimeline: {},
      records: {},
      reminderTemplate: "",
    };
  }

  function attachNotes(target) {
    if (!target.notesTimeline || typeof target.notesTimeline !== "object" || Array.isArray(target.notesTimeline)) {
      target.notesTimeline = {};
    }
    STUDENTS.forEach((student) => {
      if (!Array.isArray(target.notesTimeline[student.id])) target.notesTimeline[student.id] = [];
      student.notesTimeline = target.notesTimeline[student.id];
    });
  }

  let state = load();
  attachNotes(state);
  restoreTimes();
  ensureRecords();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (parsed.version !== 1) return freshState();
      if (!Array.isArray(parsed.workouts) || parsed.workouts.length === 0) {
        parsed.workouts = SAMPLE_WORKOUTS.map((w, i) => ({ ...w, id: i + 1 }));
      }
      if (!parsed.accounts || typeof parsed.accounts !== "object" || Array.isArray(parsed.accounts)) {
        parsed.accounts = {};
      }
      if (parsed.coach && parsed.coach.plan && parsed.coach.purchased == null) {
        parsed.coach.purchased = true;
      }
      if (parsed.coach && parsed.coach.phone) {
        const key = normalizePhone(parsed.coach.phone);
        if (key) {
          if (!parsed.accounts[key]) parsed.accounts[key] = parsed.coach;
          parsed.coach = parsed.accounts[key];
        }
      }
      if (parsed.biomech && typeof parsed.biomech === "object") {
        Object.keys(parsed.biomech).forEach((id) => {
          parsed.biomech[id] = groupBiomech(parsed.biomech[id]);
        });
      }
      if (parsed.attendance && typeof parsed.attendance === "object") {
        let cleared = false;
        Object.values(parsed.attendance).forEach((sheet) => {
          if (sheet && sheet.notes === "جلسه طبق برنامه اجرا شد.") {
            sheet.notes = "";
            cleared = true;
          }
        });
        if (cleared) {
          try {
            localStorage.setItem(KEY, JSON.stringify(parsed));
          } catch (err) {
            /* اگر ذخیره ممکن نباشد، مقدار خالی فقط در همین نشست می‌ماند */
          }
        }
      }
      return parsed;
    } catch (err) {
      return freshState();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      /* حالت ذخیره‌نشدنی (مرور خصوصی) را نادیده می‌گیریم */
    }
  }

  function reset() {
    state = freshState();
    attachNotes(state);
    save();
  }

  /* ---------- احراز هویت و نقش ---------- */

  function normalizePhone(phone) {
    return String(phone || "")
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\D/g, "");
  }

  function signup({ firstName, lastName, phone, password, plan }) {
    const normalized = normalizePhone(phone);
    const existing = state.accounts[normalized];
    if (existing && String(existing.password || "") !== String(password || "")) return "exists";
    const bought = plan === "pro" || plan === "essential";
    const keepPurchase = !!(existing && existing.purchased);
    const coach = {
      id: existing && existing.id ? existing.id : `c-${normalized.slice(-4)}`,
      firstName,
      lastName,
      phone: normalized,
      password: String(password || ""),
      plan: bought ? plan : keepPurchase ? existing.plan : null,
      purchased: bought || !!keepPurchase,
      since: existing && existing.since ? existing.since : "۱۴۰۴/۰۶",
      pool: existing && existing.pool ? existing.pool : "استخر قدس",
      credential: existing && existing.credential ? existing.credential : "مورد تایید اساتید تراز اول شنا",
    };
    state.accounts[normalized] = coach;
    state.coach = coach;
    state.session = { role: "coach", ghostFrom: null };
    save();
    return "ok";
  }

  function hasAccount() {
    return !!(state.coach && state.coach.phone);
  }

  function hasPurchased() {
    return !!(state.coach && state.coach.purchased && (state.coach.plan === "pro" || state.coach.plan === "essential"));
  }

  function login(phone, password) {
    const account = state.accounts[normalizePhone(phone)];
    if (!account) return "missing";
    if (String(account.password || "") !== String(password || "")) return "password";
    state.coach = account;
    state.session = { role: "coach", ghostFrom: null };
    save();
    return "ok";
  }

  function loginAdmin() {
    state.session = { role: "admin", ghostFrom: null };
    save();
  }

  function logout() {
    state.session = { role: null, ghostFrom: null };
    save();
  }

  function isLoggedIn() {
    return state.session.role === "coach" && !!state.coach;
  }

  function isAdmin() {
    return state.session.role === "admin";
  }

  function isGhost() {
    return !!state.session.ghostFrom;
  }

  function plan() {
    if (!state.coach || !state.coach.plan) return null;
    return state.coach.plan;
  }

  function isPro() {
    return plan() === "pro";
  }

  function setPlan(next) {
    if (!state.coach) return;
    state.coach.plan = next;
    state.coach.purchased = true;
    const key = normalizePhone(state.coach.phone);
    if (key && state.accounts[key]) {
      state.accounts[key].plan = next;
      state.accounts[key].purchased = true;
    }
    save();
  }

  function coachName() {
    if (!state.coach) return "";
    return `${state.coach.firstName} ${state.coach.lastName}`;
  }

  function ghostLogin(coachId) {
    const target = COACHES.find((c) => c.id === coachId);
    if (!target) return;
    const [firstName, ...rest] = target.name.split(" ");
    state.session = { role: "coach", ghostFrom: "admin" };
    state.coach = {
      id: target.id,
      firstName,
      lastName: rest.join(" "),
      phone: "—",
      plan: target.plan,
      purchased: true,
      since: target.since,
      pool: target.pool,
      credential: "حساب مربی (ورود مدیریتی)",
    };
    save();
  }

  function exitGhost() {
    state.session = { role: "admin", ghostFrom: null };
    save();
  }

  /* ---------- شاگردان ---------- */

  function students() {
    return STUDENTS;
  }

  function studentById(id) {
    return STUDENTS.find((s) => s.id === Number(id)) || null;
  }

  function studentToken(id) {
    return token(Number(id));
  }

  function studentByToken(id, tok) {
    const student = studentById(id);
    if (!student) return null;
    return token(student.id) === tok ? student : null;
  }

  /* ---------- حضور و غیاب ---------- */

  function todaySheet() {
    if (!state.attendance[TODAY_KEY]) {
      state.attendance[TODAY_KEY] = { marks: {}, notes: "", analysis: null, locked: false };
    }
    return state.attendance[TODAY_KEY];
  }

  function mark(studentId, status) {
    markOnDate(studentId, status, TODAY_KEY);
  }

  function markOnDate(studentId, status, date) {
    const key = date || TODAY_KEY;
    if (!["present", "late", "absent"].includes(status)) return;
    if (!state.attendance[key]) {
      state.attendance[key] = { marks: {}, notes: "", analysis: null, locked: false };
    }
    state.attendance[key].marks[Number(studentId)] = status;
    save();
  }

  function rememberTimes(student) {
    if (!state.timesOverride) state.timesOverride = {};
    state.timesOverride[student.id] = student.times.slice();
  }

  function restoreTimes() {
    Object.keys(state.timesOverride || {}).forEach((id) => {
      const student = studentById(id);
      const saved = state.timesOverride[id];
      if (student && Array.isArray(saved) && saved.length) student.times = saved.slice();
    });
  }

  function mainStroke(student) {
    if (/پشت/.test(student.event)) return "کرال پشت";
    if (/قورباغه/.test(student.event)) return "قورباغه";
    if (/پروانه/.test(student.event)) return "پروانه";
    return "کرال سینه";
  }

  function ensureRecords() {
    if (!state.records || typeof state.records !== "object" || Array.isArray(state.records)) state.records = {};
    let changed = false;
    STUDENTS.forEach((student) => {
      if (!Array.isArray(state.records[student.id])) {
        state.records[student.id] = [];
        changed = true;
      }
      if (state.records[student.id].some((row) => row.seed)) return;
      const stroke = mainStroke(student);
      student.times.forEach((time, index) => {
        const date = SESSION_DATES[Math.max(0, SESSION_DATES.length - student.times.length + index)] || TODAY_KEY;
        state.records[student.id].push({ stroke, distance: 50, time: Number(time), delta: null, date, seed: true });
      });
      changed = true;
    });
    if (changed) save();
  }

  function studentRecords(studentId, stroke, distance) {
    ensureRecords();
    const rows = state.records[studentId] || [];
    if (!stroke) return rows;
    return rows.filter((row) => row.stroke === stroke && Number(row.distance) === Number(distance));
  }

  function applyRecord(student, { stroke, distance, time, delta }) {
    if (!state.records) state.records = {};
    if (!Array.isArray(state.records[student.id])) state.records[student.id] = [];
    const numeric = time == null || time === "" ? null : Number(time);
    const entry = {
      stroke,
      distance: Number(distance),
      time: Number.isFinite(numeric) ? numeric : null,
      delta: delta == null || delta === "" ? null : Number(delta),
      date: TODAY_KEY,
    };
    state.records[student.id].push(entry);
    if (entry.time != null && entry.distance === 50 && stroke === mainStroke(student)) {
      student.times.push(Number(entry.time.toFixed(2)));
      rememberTimes(student);
    }
    save();
    return entry;
  }

  function latestRecordTime(student, stroke, distance) {
    const log = (state.records && state.records[student.id]) || [];
    const found = log.filter((row) => row.stroke === stroke && Number(row.distance) === Number(distance) && Number.isFinite(Number(row.time))).pop();
    if (found) return Number(found.time);
    if (Number(distance) === 50 && stroke === mainStroke(student)) return Number(student.times[student.times.length - 1]);
    return null;
  }

  function markAll(status) {
    const sheet = todaySheet();
    STUDENTS.forEach((s) => {
      sheet.marks[s.id] = status;
    });
    save();
  }

  function setAttendanceNotes(text) {
    todaySheet().notes = text;
    save();
  }

  function setAttendanceAnalysis(analysis) {
    todaySheet().analysis = analysis;
    save();
  }

  function countsFor(date) {
    const sheet = state.attendance[date];
    const marks = (sheet && sheet.marks) || {};
    let present = 0;
    let absent = 0;
    let late = 0;
    Object.values(marks).forEach((v) => {
      if (v === "present") present += 1;
      else if (v === "absent") absent += 1;
      else if (v === "late") late += 1;
    });
    return { present, absent, late, marked: present + absent + late, total: STUDENTS.length, notes: (sheet && sheet.notes) || "" };
  }

  function todayCounts() {
    return countsFor(TODAY_KEY);
  }

  function sessionHistory() {
    return SESSION_DATES.slice()
      .reverse()
      .map((date) => {
        const counts = countsFor(date);
        const related = state.workouts.filter((w) => w.createdAt === date);
        return { date, counts, workouts: related, isToday: date === TODAY_KEY };
      });
  }

  function sessionDetail(date) {
    const sheet = state.attendance[date] || null;
    const marks = (sheet && sheet.marks) || {};
    const groups = { present: [], late: [], absent: [] };
    STUDENTS.forEach((student) => {
      const status = marks[student.id] || marks[String(student.id)];
      if (groups[status]) groups[status].push(student.name);
    });
    return {
      date,
      isToday: date === TODAY_KEY,
      notes: (sheet && sheet.notes) || "",
      analysis: (sheet && sheet.analysis) || null,
      present: groups.present,
      late: groups.late,
      absent: groups.absent,
      workouts: state.workouts.filter((w) => w.createdAt === date),
    };
  }

  function studentAttendance(studentId) {
    const rows = [];
    SESSION_DATES.forEach((date) => {
      const sheet = state.attendance[date];
      if (!sheet) return;
      const status = sheet.marks[studentId];
      if (status) rows.push({ date, status });
    });
    return rows;
  }

  function attendanceRate(studentId) {
    const rows = studentAttendance(studentId);
    if (!rows.length) return 0;
    const present = rows.filter((r) => r.status !== "absent").length;
    return Math.round((present / rows.length) * 100);
  }

  /* ---------- مالی ---------- */

  function payments(studentId) {
    return state.payments.filter((p) => !studentId || p.studentId === Number(studentId));
  }

  function addPayment({ studentId, amount, date, method, note, source, verified }) {
    const nextId = state.payments.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    state.payments.push({
      id: nextId,
      studentId: Number(studentId),
      amount: Number(amount),
      date: date || TODAY_KEY,
      method: method || "کارت به کارت",
      note: String(note || "").trim().slice(0, 120),
      source: source || "manual",
      verified: verified !== false,
    });
    save();
    return nextId;
  }

  function studentBalance(studentId) {
    const student = studentById(studentId);
    if (!student) return { fee: 0, paid: 0, due: 0 };
    const paid = payments(studentId).reduce((sum, p) => sum + p.amount, 0);
    return { fee: student.fee, paid, due: Math.max(0, student.fee - paid) };
  }

  const DEFAULT_REMINDER =
    "سلام {parent} عزیز،\nشهریه {student} هنوز تسویه نشده و مانده آن {amount} است.\nلطفاً در اولین فرصت واریز کنید.";

  function reminderTemplate() {
    return state.reminderTemplate || DEFAULT_REMINDER;
  }

  function setReminderTemplate(text) {
    state.reminderTemplate = String(text || "").trim().slice(0, 1000) || DEFAULT_REMINDER;
    save();
    return state.reminderTemplate;
  }

  function financeSummary() {
    let expected = 0;
    let collected = 0;
    let debtors = 0;
    STUDENTS.forEach((s) => {
      const b = studentBalance(s.id);
      expected += b.fee;
      collected += Math.min(b.paid, b.fee);
      if (b.due > 0) debtors += 1;
    });
    return { expected, collected, due: expected - collected, debtors };
  }

  /* ---------- تمرین‌ها و دروازه بازبینی ---------- */

  function workouts() {
    return state.workouts;
  }

  function addWorkout(workout) {
    const nextId = state.workouts.reduce((max, w) => Math.max(max, w.id), 0) + 1;
    const record = { ...workout, id: nextId, status: workout.status || "draft" };
    state.workouts.unshift(record);
    save();
    return record;
  }

  function updateWorkout(id, patch) {
    const found = state.workouts.find((w) => w.id === Number(id));
    if (!found) return null;
    Object.assign(found, patch);
    save();
    return found;
  }

  function latestPublished() {
    return state.workouts.find((w) => w.status === "published") || null;
  }

  /* ---------- بیومکانیک ---------- */

  function biomech(studentId, stroke) {
    const bag = groupBiomech(state.biomech[studentId]);
    state.biomech[studentId] = bag;
    if (stroke && STROKES.includes(stroke)) return bag[stroke];
    return STROKES.flatMap((name) => bag[name]);
  }

  function addBiomech(studentId, sample) {
    const stroke = STROKES.includes(sample.stroke) ? sample.stroke : "کرال سینه";
    const bag = groupBiomech(state.biomech[studentId]);
    bag[stroke].push({
      date: sample.date || TODAY_KEY,
      distance: sample.distance,
      time: sample.time == null || sample.time === "" ? null : Number(sample.time),
      strokes: sample.strokes == null || sample.strokes === "" ? null : Number(sample.strokes),
      rate: sample.rate == null || sample.rate === "" ? null : Number(sample.rate),
      stroke,
    });
    state.biomech[studentId] = bag;
    save();
  }

  function studentNotes(studentId) {
    attachNotes(state);
    return state.notesTimeline[Number(studentId)] || [];
  }

  function addStudentNote(studentId, { text, analysis, showToParents }) {
    const list = studentNotes(studentId);
    const item = {
      id: `e${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`,
      date: TODAY_KEY,
      text: String(text || "").trim().slice(0, 800),
      analysis: String(analysis || "").trim().slice(0, 900),
      showToParents: showToParents === true,
    };
    list.unshift(item);
    save();
    return item;
  }

  /* ---------- آرشیو متدولوژی و CMS ---------- */

  function vaultModules() {
    return state.vaultModules;
  }

  function ownsModule(id) {
    return state.ownedVault.includes(id);
  }

  function buyModule(id) {
    if (!state.ownedVault.includes(id)) state.ownedVault.push(id);
    save();
  }

  function updateModule(id, patch) {
    const found = state.vaultModules.find((m) => m.id === id);
    if (!found) return;
    Object.assign(found, patch);
    save();
  }

  function addModule(module) {
    state.vaultModules.push({
      icon: "📘",
      art: "linear-gradient(120deg,#0a84ff,#00d2ff)",
      kind: "دوره ویژه",
      published: false,
      lessons: [],
      ...module,
    });
    save();
  }

  return {
    get raw() {
      return state;
    },
    save,
    reset,
    signup,
    login,
    hasAccount,
    hasPurchased,
    loginAdmin,
    logout,
    isLoggedIn,
    isAdmin,
    isGhost,
    plan,
    isPro,
    setPlan,
    coachName,
    ghostLogin,
    exitGhost,
    students,
    studentById,
    studentToken,
    studentByToken,
    todaySheet,
    mark,
    markOnDate,
    applyRecord,
    studentRecords,
    latestRecordTime,
    markAll,
    setAttendanceNotes,
    setAttendanceAnalysis,
    todayCounts,
    sessionHistory,
    sessionDetail,
    studentAttendance,
    attendanceRate,
    payments,
    addPayment,
    studentBalance,
    financeSummary,
    reminderTemplate,
    setReminderTemplate,
    workouts,
    addWorkout,
    updateWorkout,
    latestPublished,
    biomech,
    addBiomech,
    studentNotes,
    addStudentNote,
    vaultModules,
    ownsModule,
    buyModule,
    updateModule,
    addModule,
  };
})();
