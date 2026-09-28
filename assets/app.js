/* روتر، رجیستری دکمه‌ها و وضعیت گذرای رابط کاربری. */

const APP = (() => {
  const actions = {};
  const ui = {
    workoutTab: null,
    brief: "",
    draftPreview: null,
    manual: { title: "جلسه دستی امروز", sets: [] },
    aiBusy: false,
    cockpitInsights: null,
    insightsRequested: false,
    parentReports: {},
    biomechAi: {},
    studentQuery: "",
    studentGroup: "همه",
    biomechStudent: null,
    biomechResult: null,
    ocrResult: null,
  };

  let focusAfterRender = null;

  function action(name, handler) {
    actions[name] = handler;
  }

  function toEnglishDigits(text) {
    return String(text || "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  }

  function numberFrom(text) {
    const parsed = Number(toEnglishDigits(text).replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function value(id, fallback = "") {
    const node = document.getElementById(id);
    return node ? node.value : fallback;
  }

  /* ---------- روتر ---------- */

  function route() {
    const hash = window.location.hash || "#/";
    /* «#/app/student/7» به ['app','student','7'] تبدیل می‌شود */
    const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

    if (hash.startsWith("#/s/")) {
      return PublicViews.parentPortal(parts[1], parts[2]);
    }
    if (hash === "#/" || hash === "#") return PublicViews.landing();
    if (hash === "#/pricing") return PublicViews.pricing();
    if (hash === "#/checkout" || hash.startsWith("#/checkout/")) {
      return PublicViews.checkout(parts[1] === "essential" ? "essential" : "pro");
    }
    if (hash === "#/auth") return PublicViews.auth();
    if (hash === "#/admin-login") return PublicViews.adminLogin();

    if (hash.startsWith("#/admin")) {
      if (!SJ.isAdmin()) {
        UI.navigate("#/admin-login");
        return PublicViews.adminLogin();
      }
      if (hash === "#/admin/coaches") return AdminViews.coaches();
      if (hash === "#/admin/cms") return AdminViews.cms();
      return AdminViews.bi();
    }

    if (hash.startsWith("#/app")) {
      if (!SJ.isLoggedIn()) {
        UI.navigate("#/auth");
        return PublicViews.auth();
      }
      if (hash.startsWith("#/app/student/")) return CoachViews.student360(parts[2]);
      if (hash === "#/app/attendance") return CoachViews.attendance();
      if (hash === "#/app/students") return CoachViews.students();
      if (hash === "#/app/sessions") return CoachViews.sessionsPage();
      if (hash === "#/app/workout") return CoachViews.workoutPage();
      if (hash === "#/app/biomech") return CoachViews.biomechPage();
      if (hash === "#/app/finance") return CoachViews.financePage();
      if (hash === "#/app/vault") return CoachViews.vaultPage();
      if (hash === "#/app/profile") return CoachViews.profilePage();
      return CoachViews.cockpit();
    }

    return PublicViews.landing();
  }

  function render() {
    const root = document.getElementById("app");
    UI.closeModal();
    root.innerHTML = route();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (focusAfterRender) {
      const node = document.getElementById(focusAfterRender);
      if (node) {
        node.focus();
        if (node.setSelectionRange && node.value) {
          node.setSelectionRange(node.value.length, node.value.length);
        }
      }
      focusAfterRender = null;
    }
  }

  /* ---------- شبیه‌سازی نوار پیشرفت اسکن ---------- */

  function runScan(containerId, label, onDone) {
    const box = document.getElementById(containerId);
    if (!box) {
      onDone();
      return;
    }
    let percent = 0;
    box.innerHTML = `
      <div class="stack" style="gap:.4rem">
        <span class="muted">${label}</span>
        <div class="progress"><span id="${containerId}-bar" style="width:0%"></span></div>
      </div>`;
    const bar = document.getElementById(`${containerId}-bar`);
    const timer = setInterval(() => {
      percent += 12 + Math.round(Math.random() * 10);
      if (bar) bar.style.width = `${Math.min(100, percent)}%`;
      if (percent >= 100) {
        clearInterval(timer);
        setTimeout(onDone, 250);
      }
    }, 140);
  }

  /* ---------- راه‌اندازی ---------- */

  function start() {
    window.addEventListener("hashchange", render);

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-group")) {
        document.querySelectorAll(".nav-group.is-open").forEach((group) => {
          group.classList.remove("is-open");
          const btn = group.querySelector(".nav-group-btn");
          if (btn) btn.setAttribute("aria-expanded", "false");
        });
      }
      const trigger = event.target.closest("[data-action]");
      if (!trigger) return;
      const handler = actions[trigger.dataset.action];
      if (!handler) return;
      event.preventDefault();
      handler(trigger.dataset, trigger, event);
    });

    document.addEventListener("input", (event) => {
      const node = event.target;
      if (node.id === "student-search") {
        ui.studentQuery = node.value;
        focusAfterRender = "student-search";
        render();
      } else if (node.id === "ai-brief") {
        ui.brief = node.value;
      } else if (node.id === "demo-brief") {
        APP.demoBrief = node.value;
      }
    });

    document.addEventListener("change", (event) => {
      const node = event.target;
      if (node.id === "student-group") {
        ui.studentGroup = node.value;
        render();
      } else if (node.id === "bio-student") {
        ui.biomechStudent = Number(node.value);
        ui.biomechResult = null;
        render();
      } else if (node.id === "att-file") {
        const file = node.files && node.files[0];
        const name = file ? file.name : "attendance.jpg";
        runScan("att-scan", `در حال خواندن ${name} ...`, async () => {
          const result = await AIRemote.ocrAttendance(file, SJ.students());
          SJ.markAll("present");
          result.rows.forEach((row) => SJ.mark(row.id, row.status));
          SJ.save();
          UI.toast(result.engine === "ai" ? "برگه با AI خوانده شد و با پرونده تطبیق یافت." : "خواندن تصویر ممکن نشد؛ یک نمونه تطبیق شد.");
          render();
        });
      } else if (node.id === "fin-file") {
        const file = node.files && node.files[0];
        const name = file ? file.name : "receipt.jpg";
        runScan("fin-scan", `در حال خواندن رسید ${name} ...`, async () => {
          ui.ocrResult = await AIRemote.ocrReceipt(file, SJ.students());
          render();
        });
      }
    });

    document.addEventListener("submit", (event) => {
      if (event.target.id !== "auth-form") return;
      event.preventDefault();
      const firstName = value("auth-first").trim();
      const lastName = value("auth-last").trim();
      const phone = toEnglishDigits(value("auth-phone")).trim();
      const plan = value("auth-plan", "pro");
      const terms = document.getElementById("auth-terms").checked;
      const errorBox = document.getElementById("auth-error");

      if (!firstName || !lastName) {
        errorBox.textContent = "نام و نام خانوادگی را کامل وارد کنید.";
        return;
      }
      if (!/^09\d{9}$/.test(phone)) {
        errorBox.textContent = "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.";
        return;
      }
      if (!terms) {
        errorBox.textContent = "برای ادامه، پذیرش قوانین لازم است.";
        return;
      }
      ui.checkoutDraft = { firstName, lastName, phone };
      UI.navigate(plan === "essential" ? "#/checkout/essential" : "#/checkout/pro");
    });

    document.addEventListener("submit", (event) => {
      if (event.target.id !== "checkout-form") return;
      event.preventDefault();
      const errorBox = document.getElementById("checkout-error");
      const plan = value("checkout-plan") === "essential" ? "essential" : "pro";
      if (SJ.isLoggedIn()) {
        SJ.setPlan(plan);
        ui.checkoutDraft = null;
        UI.toast("خرید فرضی ثبت شد. وارد پنل شدید.");
        UI.navigate("#/app");
        return;
      }
      const firstName = value("checkout-first").trim();
      const lastName = value("checkout-last").trim();
      const phone = toEnglishDigits(value("checkout-phone")).trim();
      const terms = document.getElementById("checkout-terms").checked;
      if (!firstName || !lastName) {
        errorBox.textContent = "نام و نام خانوادگی را کامل وارد کنید.";
        return;
      }
      if (!/^09\d{9}$/.test(phone)) {
        errorBox.textContent = "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.";
        return;
      }
      if (!terms) {
        errorBox.textContent = "برای خرید، پذیرش قوانین لازم است.";
        return;
      }
      SJ.signup({ firstName, lastName, phone, plan });
      ui.checkoutDraft = null;
      UI.toast("خرید فرضی ثبت شد. وارد پنل شدید.");
      UI.navigate("#/app");
    });

    render();
  }

  return {
    action,
    start,
    render,
    ui,
    runScan,
    numberFrom,
    toEnglishDigits,
    value,
    demoBrief: AI.voice.samples[0],
    demoWorkout: null,
  };
})();

/* ---------- دکمه‌های عمومی ---------- */

APP.action("go", (data) => UI.navigate(data.hash));
APP.action("modal:close", () => UI.closeModal());

APP.action("nav:menu", (data, trigger) => {
  const current = trigger.closest(".nav-group");
  if (!current) return;
  document.querySelectorAll(".nav-group").forEach((group) => {
    if (group === current) return;
    group.classList.remove("is-open");
    const btn = group.querySelector(".nav-group-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  });
  const open = current.classList.toggle("is-open");
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
});

APP.action("nav:toggle", (_data, trigger) => {
  const bar = document.querySelector(".topbar");
  if (!bar) return;
  const open = bar.classList.toggle("nav-open");
  if (trigger) {
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    trigger.textContent = open ? "✕" : "☰";
    trigger.setAttribute("aria-label", open ? "بستن منو" : "باز کردن منو");
  }
});

APP.action("auth:logout", () => {
  SJ.logout();
  UI.toast("از حساب خارج شدید.");
  UI.navigate("#/");
});

APP.action("admin:login", () => {
  SJ.loginAdmin();
  UI.navigate("#/admin");
});

APP.action("plan:choose", (data) => {
  const plan = data.plan === "essential" ? "essential" : "pro";
  if (SJ.isLoggedIn() && SJ.plan() === plan) {
    UI.toast(plan === "pro" ? "پلن مستری پرو همین حالا فعال است." : "پلن اسنشیال همین حالا فعال است.");
    UI.navigate("#/app");
    return;
  }
  UI.navigate(`#/checkout/${plan}`);
});

APP.action("plan:upgrade", () => {
  if (SJ.isLoggedIn() && SJ.isPro()) {
    UI.toast("پلن مستری پرو همین حالا فعال است.");
    return;
  }
  UI.navigate("#/checkout/pro");
});

APP.action("demo:reset", () => {
  SJ.reset();
  APP.ui.cockpitInsights = null;
  APP.ui.insightsRequested = false;
  APP.ui.parentReports = {};
  APP.ui.biomechAi = {};
  UI.toast("داده‌های دمو بازنشانی شد.");
  UI.navigate("#/");
});

/* ---------- دموی لندینگ ---------- */

APP.action("demo:generate", async () => {
  const brief = APP.value("demo-brief", APP.demoBrief);
  APP.demoBrief = brief;
  APP.ui.aiBusy = true;
  APP.render();

  APP.demoWorkout = await AIRemote.generateWorkout(brief);
  APP.ui.aiBusy = false;
  APP.render();

  if (APP.demoWorkout.fallbackReason) {
    UI.toast("سرویس AI در دسترس نبود؛ خروجی با موتور محلی ساخته شد.");
  }
});

APP.action("demo:sample", async () => {
  const list = AI.voice.samples;
  const next = list[(list.indexOf(APP.demoBrief) + 1 + list.length) % list.length];
  APP.demoBrief = next;
  APP.ui.aiBusy = true;
  APP.render();

  APP.demoWorkout = await AIRemote.generateWorkout(next);
  APP.ui.aiBusy = false;
  APP.render();
});

/* ---------- حضور و غیاب ---------- */

APP.action("attendance:mark", (data) => {
  SJ.mark(Number(data.id), data.value);
  APP.render();
});

APP.action("attendance:all", (data) => {
  SJ.markAll(data.value);
  UI.toast("همه شاگردان حاضر ثبت شدند.");
  APP.render();
});

APP.action("attendance:clear", () => {
  SJ.todaySheet().marks = {};
  SJ.setAttendanceAnalysis(null);
  SJ.save();
  APP.render();
});

APP.action("attendance:save-notes", () => {
  SJ.setAttendanceNotes(APP.value("att-notes"));
  UI.toast("یادداشت جلسه ذخیره شد.");
});

APP.action("attendance:analyze", async () => {
  const counts = SJ.todayCounts();
  if (!counts.marked) {
    UI.toast("اول وضعیت حضور شاگردان را ثبت کنید.");
    return;
  }
  const sheet = SJ.todaySheet();
  const absent = SJ.students().filter((s) => sheet.marks[s.id] === "absent").map((s) => s.name);
  const late = SJ.students().filter((s) => sheet.marks[s.id] === "late").map((s) => s.name);
  APP.ui.aiBusy = true;
  APP.render();
  const insight = await AIRemote.attendanceInsight(counts, absent, late);
  APP.ui.aiBusy = false;
  SJ.setAttendanceAnalysis(insight);
  UI.toast(insight.engine === "ai" ? "تحلیل AI ساخته و ثبت شد." : "سرویس AI در دسترس نبود؛ تحلیل محلی ثبت شد.");
  APP.render();
});

APP.action("attendance:pick", () => {
  const input = document.getElementById("att-file");
  if (input) input.click();
});

/* ---------- تمرین‌نویسی ---------- */

APP.action("workout:tab", (data) => {
  APP.ui.workoutTab = data.value;
  APP.render();
});

APP.action("workout:sample", () => {
  const list = AI.voice.samples;
  const next = list[(list.indexOf(APP.ui.brief) + 1 + list.length) % list.length];
  APP.ui.brief = next;
  APP.render();
});

APP.action("workout:generate", async () => {
  const brief = APP.value("ai-brief", APP.ui.brief);
  if (!brief.trim()) {
    UI.toast("توضیح جلسه را بنویسید یا ویس بگیرید.");
    return;
  }
  APP.ui.brief = brief;
  APP.ui.aiBusy = true;
  APP.ui.draftPreview = null;
  APP.render();

  const workout = await AIRemote.generateWorkout(brief);
  APP.ui.aiBusy = false;
  APP.ui.draftPreview = { ...workout, source: "ai-text" };
  APP.render();

  UI.toast(
    workout.fallbackReason
      ? "سرویس AI در دسترس نبود؛ جلسه با موتور محلی ساخته شد."
      : "جلسه ساخته شد؛ در دروازه بازبینی تأیید کنید."
  );
});

APP.action("workout:voice", () => {
  const finish = async (transcript, simulated) => {
    APP.ui.brief = transcript;
    APP.ui.aiBusy = true;
    APP.ui.draftPreview = null;
    APP.render();

    const workout = await AIRemote.generateWorkout(transcript);
    APP.ui.aiBusy = false;
    APP.ui.draftPreview = { ...workout, source: "ai-voice" };
    APP.render();

    UI.toast(simulated ? "ویس نمونه پردازش شد." : "ویس شما به جلسه تبدیل شد.");
  };

  if (!AI.voice.available()) {
    const list = AI.voice.samples;
    finish(list[Math.floor(Math.random() * list.length)], true);
    return;
  }
  UI.toast("در حال شنیدن... فارسی صحبت کنید.");
  AI.voice.start(
    (transcript) => finish(transcript, false),
    () => {
      const list = AI.voice.samples;
      finish(list[0], true);
    }
  );
});

APP.action("draft:remove-set", (data) => {
  const draft = APP.ui.draftPreview;
  if (!draft) return;
  draft.sets.splice(Number(data.index), 1);
  draft.meters = draft.sets.reduce((sum, s) => sum + s.meters, 0);
  draft.laps = Math.round(draft.meters / draft.poolLength);
  APP.render();
});

APP.action("draft:save", () => {
  const draft = APP.ui.draftPreview;
  if (!draft) return;
  SJ.addWorkout({ ...draft, title: APP.value("draft-title", draft.title), status: "draft" });
  APP.ui.draftPreview = null;
  APP.ui.workoutTab = "archive";
  UI.toast("پیش‌نویس ذخیره شد.");
  APP.render();
});

APP.action("draft:approve", () => {
  const draft = APP.ui.draftPreview;
  if (!draft) return;
  SJ.addWorkout({ ...draft, title: APP.value("draft-title", draft.title), status: "published" });
  APP.ui.draftPreview = null;
  APP.ui.workoutTab = "archive";
  UI.toast("جلسه تأیید و برای شاگردان منتشر شد.");
  APP.render();
});

APP.action("draft:discard", () => {
  APP.ui.draftPreview = null;
  APP.render();
});

APP.action("archive:publish", (data) => {
  SJ.updateWorkout(Number(data.id), { status: "published" });
  UI.toast("جلسه منتشر شد.");
  APP.render();
});

/* ---------- طراح دستی ---------- */

APP.action("manual:add", () => {
  const reps = APP.numberFrom(APP.value("m-reps"));
  const distance = APP.numberFrom(APP.value("m-distance"));
  if (!reps || !distance) {
    UI.toast("تکرار و متراژ را وارد کنید.");
    return;
  }
  APP.ui.manual.sets.push({
    reps,
    distance,
    stroke: APP.value("m-stroke", STROKES[0]),
    rest: APP.numberFrom(APP.value("m-rest")) || 20,
  });
  APP.render();
});

APP.action("manual:remove", (data) => {
  APP.ui.manual.sets.splice(Number(data.index), 1);
  APP.render();
});

APP.action("manual:clear", () => {
  APP.ui.manual.sets = [];
  APP.render();
});

APP.action("manual:publish", () => {
  const manual = APP.ui.manual;
  if (!manual.sets.length) {
    UI.toast("حداقل یک ست اضافه کنید.");
    return;
  }
  const sets = manual.sets.map((s, i) => ({
    phase: `ست ${UI.fa(i + 1)}`,
    detail: `${UI.fa(s.reps)} × ${UI.fa(s.distance)} متر ${s.stroke} با استراحت ${UI.fa(s.rest)} ثانیه`,
    meters: s.reps * s.distance,
    note: "",
  }));
  const meters = sets.reduce((sum, s) => sum + s.meters, 0);
  SJ.addWorkout({
    title: APP.value("manual-title", manual.title),
    sets,
    meters,
    laps: Math.round(meters / 25),
    poolLength: 25,
    minutes: Math.round(meters / 40),
    rateTarget: 38,
    focus: "طراحی دستی",
    coachTip: "این جلسه به‌صورت دستی طراحی شده است.",
    createdAt: TODAY_KEY,
    source: "manual",
    status: "published",
  });
  APP.ui.manual.sets = [];
  APP.ui.workoutTab = "archive";
  UI.toast("جلسه دستی منتشر شد.");
  APP.render();
});

/* ---------- بیومکانیک ---------- */

APP.action("bio:calc", async () => {
  const distance = APP.numberFrom(APP.value("bio-distance"));
  const time = APP.numberFrom(APP.value("bio-time"));
  const strokes = APP.numberFrom(APP.value("bio-strokes"));
  if (!distance || !time || !strokes) {
    UI.toast("مسافت، زمان و تعداد دست‌کشی را وارد کنید.");
    return;
  }
  APP.ui.biomechResult = AI.analyzeSample({ distance, time, strokes });
  const student = SJ.studentById(APP.ui.biomechStudent || SJ.students()[0].id);
  APP.ui.biomechAi[student.id] = { loading: true };
  APP.render();
  APP.ui.biomechAi[student.id] = await AIRemote.biomechExplain(student);
  APP.render();
});

APP.action("bio:save", () => {
  const distance = APP.numberFrom(APP.value("bio-distance"));
  const time = APP.numberFrom(APP.value("bio-time"));
  const strokes = APP.numberFrom(APP.value("bio-strokes"));
  if (!distance || !time || !strokes) {
    UI.toast("اول مقادیر تست را وارد کنید.");
    return;
  }
  const studentId = APP.ui.biomechStudent || SJ.students()[0].id;
  const student = SJ.studentById(studentId);
  SJ.addBiomech(studentId, { date: TODAY_KEY, distance, time, strokes, stroke: student.stroke });
  APP.ui.biomechResult = AI.analyzeSample({ distance, time, strokes });
  UI.toast(`تست در پرونده ${student.name} ثبت شد.`);
  APP.render();
});

/* ---------- مالی ---------- */

APP.action("finance:pick", () => {
  const input = document.getElementById("fin-file");
  if (input) input.click();
});

APP.action("finance:confirm", () => {
  const ocr = APP.ui.ocrResult;
  if (!ocr) return;
  SJ.addPayment({
    studentId: ocr.studentId,
    amount: ocr.amount,
    date: ocr.date,
    method: ocr.method,
    source: "ocr",
  });
  APP.ui.ocrResult = null;
  UI.toast("پرداخت در پرونده شاگرد ثبت شد.");
  APP.render();
});

APP.action("finance:reject", () => {
  APP.ui.ocrResult = null;
  UI.toast("نتیجه اسکن حذف شد.");
  APP.render();
});

APP.action("finance:remind", (data) => {
  const student = SJ.studentById(data.id);
  const balance = SJ.studentBalance(data.id);
  UI.toast(`پیام یادآوری ${UI.millions(balance.due)} برای اولیای ${student.name} آماده ارسال شد.`);
});

APP.action("payment:add", (data) => {
  const amount = APP.numberFrom(APP.value("pay-amount"));
  if (!amount) {
    UI.toast("مبلغ را وارد کنید.");
    return;
  }
  SJ.addPayment({ studentId: data.id, amount, date: TODAY_KEY, method: "کارت به کارت" });
  UI.toast("پرداخت ثبت شد.");
  APP.render();
});

/* ---------- کارنامه و پورتال اولیا ---------- */

APP.action("report:preview", async (data) => {
  const student = SJ.studentById(data.id);
  UI.modal(`کارنامه ${student.name}`, `<p class="muted">در حال نوشتن کارنامه با AI…</p>`);
  const report = await AIRemote.parentReport(student);
  APP.ui.parentReports[student.id] = report;
  UI.modal(
    `کارنامه ${student.name}`,
    `<div class="ai-box">${report.paragraphs.map((p) => `<p>${UI.escapeHtml(p)}</p>`).join("")}</div>
     <h4 class="title-md">تمرین خانگی</h4>
     <ul class="plan-list">${report.homework.map((h) => `<li>${UI.escapeHtml(h)}</li>`).join("")}</ul>
     <div class="row">
       <span class="badge badge-blue">امتیاز FINA: ${report.finaPoints ? UI.fa(report.finaPoints) : "—"}</span>
       <span class="badge badge-ok">نرخ حضور: ${UI.fa(report.attendanceRate)}٪</span>
     </div>`,
    SJ.isPro()
      ? `<button class="btn-primary btn-sm" data-action="portal:open" data-id="${student.id}">باز کردن پورتال اولیا</button>`
      : `<button class="btn-primary btn-sm" data-action="plan:upgrade">ارتقا برای پورتال زنده اولیا</button>`
  );
});

APP.action("portal:open", (data) => {
  UI.closeModal();
  UI.navigate(`#/s/${data.id}/${SJ.studentToken(data.id)}`);
});

APP.action("portal:copy", (data) => {
  const link = `${window.location.origin}${window.location.pathname}#/s/${data.id}/${SJ.studentToken(data.id)}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(
      () => UI.toast("لینک پورتال اولیا کپی شد."),
      () => UI.modal("لینک پورتال اولیا", `<code class="code-box">${UI.escapeHtml(link)}</code>`)
    );
  } else {
    UI.modal("لینک پورتال اولیا", `<code class="code-box">${UI.escapeHtml(link)}</code>`);
  }
});

/* ---------- آرشیو متدولوژی ---------- */

APP.action("vault:open", (data) => {
  const module = SJ.vaultModules().find((m) => m.id === data.id);
  if (!module) return;
  UI.modal(
    module.title,
    `<p class="muted">${UI.escapeHtml(module.summary || "")}</p>
     <ul class="plan-list">${module.lessons.map((l) => `<li>${UI.escapeHtml(l)}</li>`).join("") || '<li class="muted">درسی ثبت نشده است.</li>'}</ul>`
  );
});

APP.action("vault:buy", (data) => {
  const module = SJ.vaultModules().find((m) => m.id === data.id);
  SJ.buyModule(data.id);
  UI.toast(`${module.title} به کتابخانه شما اضافه شد.`);
  APP.render();
});

/* ---------- پنل مدیریت ---------- */

APP.action("admin:ghost", (data) => {
  SJ.ghostLogin(data.id);
  UI.toast("ورود مدیریتی انجام شد.");
  UI.navigate("#/app");
});

APP.action("ghost:exit", () => {
  SJ.exitGhost();
  UI.navigate("#/admin/coaches");
});

APP.action("cms:add", () => {
  const title = APP.value("cms-title").trim();
  if (!title) {
    UI.toast("عنوان محتوا را وارد کنید.");
    return;
  }
  SJ.addModule({
    id: `m${Date.now().toString(36)}`,
    title,
    kind: APP.value("cms-kind", "دوره ویژه"),
    priceToman: APP.numberFrom(APP.value("cms-price")),
    summary: "توضیح این محتوا هنوز نوشته نشده است.",
    lessons: [],
    published: false,
  });
  UI.toast("محتوا به‌صورت پیش‌نویس ساخته شد.");
  APP.render();
});

APP.action("cms:toggle", (data) => {
  const module = SJ.vaultModules().find((m) => m.id === data.id);
  if (!module) return;
  SJ.updateModule(data.id, { published: !module.published });
  UI.toast(module.published ? "از انتشار خارج شد." : "منتشر شد.");
  APP.render();
});

window.addEventListener("load", APP.start);
