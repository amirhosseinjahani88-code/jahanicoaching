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
        notes: isToday ? "" : "جلسه طبق برنامه اجرا شد.",
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

  function seedBiomech() {
    const store = {};
    STUDENTS.forEach((s) => {
      store[s.id] = s.biomech.map((sample, i) => ({
        date: SESSION_DATES[SESSION_DATES.length - s.biomech.length + i] || SESSION_DATES[i],
        distance: sample.d,
        time: sample.t,
        strokes: sample.s,
        stroke: s.stroke,
      }));
    });
    return store;
  }

  function freshState() {
    return {
      version: 1,
      session: { role: null, ghostFrom: null },
      coach: null,
      attendance: seedAttendance(),
      payments: seedPayments(),
      biomech: seedBiomech(),
      workouts: SAMPLE_WORKOUTS.map((w, i) => ({ ...w, id: i + 1 })),
      vaultModules: VAULT_MODULES.map((m) => ({ ...m, lessons: [...m.lessons] })),
      ownedVault: ["bio", "dryland", "nutrition", "rate"],
      viewedStudent: null,
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (parsed.version !== 1) return freshState();
      if (!Array.isArray(parsed.workouts) || parsed.workouts.length === 0) {
        parsed.workouts = SAMPLE_WORKOUTS.map((w, i) => ({ ...w, id: i + 1 }));
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
    save();
  }

  /* ---------- احراز هویت و نقش ---------- */

  function signup({ firstName, lastName, phone, plan }) {
    state.coach = {
      id: "c1",
      firstName,
      lastName,
      phone,
      plan: plan || "essential",
      since: "۱۴۰۴/۰۶",
      pool: "استخر قدس",
      credential: "مورد تایید اساتید تراز اول شنا",
    };
    state.session = { role: "coach", ghostFrom: null };
    save();
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
    return state.coach ? state.coach.plan : "essential";
  }

  function isPro() {
    return plan() === "pro";
  }

  function setPlan(next) {
    if (!state.coach) return;
    state.coach.plan = next;
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
    const sheet = todaySheet();
    sheet.marks[studentId] = status;
    save();
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

  function addPayment({ studentId, amount, date, method, source, verified }) {
    const nextId = state.payments.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    state.payments.push({
      id: nextId,
      studentId: Number(studentId),
      amount: Number(amount),
      date,
      method: method || "کارت به کارت",
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

  function biomech(studentId) {
    return state.biomech[studentId] || [];
  }

  function addBiomech(studentId, sample) {
    if (!state.biomech[studentId]) state.biomech[studentId] = [];
    state.biomech[studentId].push(sample);
    save();
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
    markAll,
    setAttendanceNotes,
    setAttendanceAnalysis,
    todayCounts,
    sessionHistory,
    studentAttendance,
    attendanceRate,
    payments,
    addPayment,
    studentBalance,
    financeSummary,
    workouts,
    addWorkout,
    updateWorkout,
    latestPublished,
    biomech,
    addBiomech,
    vaultModules,
    ownsModule,
    buyModule,
    updateModule,
    addModule,
  };
})();
