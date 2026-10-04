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
    biomechStroke: "",
    eventPending: null,
    recordFocus: {},
    biomechResult: null,
    biomechPanel: null,
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
    if (hash === "#/" || hash === "#") {
      if (SJ.isLoggedIn()) SJ.logout();
      return PublicViews.landing();
    }
    if (hash === "#/pricing") return PublicViews.pricing();
    if (hash === "#/checkout" || hash.startsWith("#/checkout/")) {
      if (!SJ.isLoggedIn()) {
        UI.navigate("#/auth");
        return PublicViews.login();
      }
      const selected = parts[1] === "essential" ? "essential" : "pro";
      if (SJ.hasPurchased() && SJ.plan() === selected) {
        UI.navigate("#/app");
        return CoachViews.cockpit();
      }
      return PublicViews.checkout(selected);
    }
    if (hash === "#/auth/signup") return PublicViews.signup();
    if (hash === "#/auth") return PublicViews.login();
    if (hash === "#/admin-login") return PublicViews.adminLogin();

    if (hash.startsWith("#/admin")) {
      if (!SJ.isAdmin()) {
        UI.navigate("#/admin-login");
        return PublicViews.adminLogin();
      }
      if (hash === "#/admin/coaches") return AdminViews.coaches();
      if (hash === "#/admin/cms") return AdminViews.cms();
      if (hash === "#/admin/settings") return AdminViews.settings();
      return AdminViews.bi();
    }

    if (hash.startsWith("#/app")) {
      if (!SJ.isLoggedIn()) {
        UI.navigate("#/auth");
        return PublicViews.login();
      }
      if (!SJ.hasPurchased()) {
        UI.navigate("#/pricing");
        return PublicViews.pricing();
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
      if (hash === "#/app/settings") return CoachViews.settingsPage();
      return CoachViews.cockpit();
    }

    return PublicViews.landing();
  }

  let renderedHash = null;

  function render() {
    const root = document.getElementById("app");
    const hash = window.location.hash || "";
    const keepScroll = hash === renderedHash;
    const scrollY = window.scrollY;
    UI.closeModal();
    root.innerHTML = route();
    renderedHash = hash;
    if (keepScroll) window.scrollTo(0, scrollY);
    else window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    const currentNav = root.querySelector(".panel-nav [aria-current='page']");
    if (currentNav && currentNav.offsetParent) {
      currentNav.scrollIntoView({ inline: "nearest", block: "nearest" });
    }
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

    document.addEventListener("mousedown", (event) => {
      const mark = event.target.closest('[data-action="attendance:mark"]');
      if (!mark) return;
      event.preventDefault();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest("[data-action='session:open']");
      if (!card || event.target !== card) return;
      event.preventDefault();
      const handler = actions["session:open"];
      if (handler) handler(card.dataset, card, event);
    });

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
      } else if (node.id === "fin-amount") {
        const digits = toEnglishDigits(node.value).replace(/[^\d]/g, "");
        node.value = digits ? UI.num(digits) : "";
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
        const picked = SJ.studentById(ui.biomechStudent);
        ui.biomechStroke = picked ? picked.stroke : ui.biomechStroke;
        ui.biomechResult = null;
        ui.biomechPanel = null;
        render();
      } else if (node.id === "bio-stroke") {
        ui.biomechStroke = node.value;
        ui.biomechResult = null;
        ui.biomechPanel = null;
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
      if (event.target.id !== "login-form") return;
      event.preventDefault();
      const phone = toEnglishDigits(value("login-phone")).trim();
      const password = value("login-password");
      const errorBox = document.getElementById("login-error");
      if (!/^09\d{9}$/.test(phone)) {
        errorBox.textContent = "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.";
        return;
      }
      if (!password) {
        errorBox.textContent = "رمز عبور را وارد کنید.";
        return;
      }
      const result = SJ.login(phone, password);
      if (result === "missing") {
        errorBox.textContent = "این شماره ثبت نشده است. از دکمه ثبت‌نام استفاده کنید.";
        return;
      }
      if (result !== "ok") {
        errorBox.textContent = "رمز عبور نادرست است.";
        return;
      }
      if (SJ.hasPurchased()) {
        const title = SJ.plan() === "pro" ? "مستری پرو" : "اقتصادی";
        UI.toast(`پلن ${title} شناسایی شد.`);
        UI.navigate("#/app");
        return;
      }
      UI.toast("هنوز پلنی نخریده‌اید.");
      UI.navigate("#/pricing");
    });

    document.addEventListener("submit", (event) => {
      if (event.target.id !== "signup-form") return;
      event.preventDefault();
      const firstName = value("signup-first").trim();
      const lastName = value("signup-last").trim();
      const phone = toEnglishDigits(value("signup-phone")).trim();
      const password = value("signup-password");
      const password2 = value("signup-password2");
      const errorBox = document.getElementById("signup-error");
      if (!firstName || !lastName) {
        errorBox.textContent = "نام و نام خانوادگی را کامل وارد کنید.";
        return;
      }
      if (!/^09\d{9}$/.test(phone)) {
        errorBox.textContent = "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.";
        return;
      }
      if (password.length < 4) {
        errorBox.textContent = "رمز عبور حداقل ۴ حرف باشد.";
        return;
      }
      if (password !== password2) {
        errorBox.textContent = "تکرار رمز با رمز یکی نیست.";
        return;
      }
      const signed = SJ.signup({ firstName, lastName, phone, password });
      if (signed === "exists") {
        errorBox.textContent = "این شماره قبلاً ثبت شده. با همان رمز وارد شوید.";
        return;
      }
      if (SJ.hasPurchased()) {
        UI.toast("وارد پنل شدید.");
        UI.navigate("#/app");
        return;
      }
      UI.toast("ثبت‌نام شد. یک پلن انتخاب کنید.");
      UI.navigate("#/pricing");
    });

    document.addEventListener("submit", (event) => {
      if (event.target.id !== "checkout-form") return;
      event.preventDefault();
      const errorBox = document.getElementById("checkout-error");
      const plan = value("checkout-plan") === "essential" ? "essential" : "pro";
      if (!SJ.isLoggedIn()) {
        UI.navigate("#/auth");
        return;
      }
      SJ.setPlan(plan);
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

APP.navStack = [];

function currentHash() {
  return window.location.hash || "#/";
}

function rememberHere() {
  const here = currentHash();
  const stack = APP.navStack;
  if (stack[stack.length - 1] !== here) stack.push(here);
  if (stack.length > 20) stack.shift();
}

APP.action("go", (data) => {
  rememberHere();
  UI.navigate(data.hash);
});

APP.action("nav:back", () => {
  const here = currentHash();
  let prev = "";
  while (APP.navStack.length) {
    prev = APP.navStack.pop();
    if (prev && prev !== here) break;
    prev = "";
  }
  UI.navigate(prev || "#/");
});
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
    trigger.setAttribute("aria-label", open ? t("بستن منو") : t("باز کردن منو"));
  }
});

APP.action("auth:logout", () => {
  SJ.logout();
  APP.navStack = [];
  UI.toast("از حساب خارج شدید.");
  UI.navigate("#/");
});

APP.action("admin:login", () => {
  SJ.loginAdmin();
  UI.navigate("#/admin");
});

APP.action("pref:lang", (data) => {
  Prefs.setLang(data.lang);
  APP.render();
});

APP.action("pref:theme", (data) => {
  Prefs.setTheme(data.theme);
  APP.render();
});

APP.action("auth:enter", () => {
  rememberHere();
  UI.navigate("#/auth");
});

APP.action("plan:choose", (data) => {
  rememberHere();
  const plan = data.plan === "essential" ? "essential" : "pro";
  if (!SJ.isLoggedIn()) {
    UI.navigate("#/auth");
    return;
  }
  if (SJ.hasPurchased() && SJ.plan() === plan) {
    UI.toast(plan === "pro" ? "پلن مستری پرو همین حالا فعال است." : "پلن اقتصادی همین حالا فعال است.");
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

APP.action("attendance:mark", (data, trigger) => {
  const scrollY = window.scrollY;
  const studentId = Number(data.id);
  const status = data.value;
  SJ.mark(studentId, status);

  const row =
    (trigger && trigger.closest(".roster-item")) ||
    document.querySelector(`[data-action="attendance:mark"][data-id="${studentId}"]`)?.closest(".roster-item");
  if (row) {
    row.dataset.status = status;
    row.querySelectorAll('[data-action="attendance:mark"]').forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.value === status ? "true" : "false");
    });
    const rate = row.querySelector("[data-att-rate]");
    if (rate) rate.textContent = UI.fa(SJ.attendanceRate(studentId));
  }

  const counts = SJ.todayCounts();
  const stats = {
    present: UI.fa(counts.present),
    late: UI.fa(counts.late),
    absent: UI.fa(counts.absent),
    marked: `${UI.fa(counts.marked)} از ${UI.fa(counts.total)}`,
  };
  Object.keys(stats).forEach((key) => {
    const card = document.querySelector(`[data-att-stat="${key}"]`);
    if (!card) return;
    const strong = card.querySelector(".stat");
    if (strong) strong.textContent = stats[key];
    if (key === "absent") card.classList.toggle("kpi-warn", counts.absent > 0);
  });

  const keepScroll = () => {
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
  };
  keepScroll();
  requestAnimationFrame(() => {
    keepScroll();
    requestAnimationFrame(keepScroll);
  });
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

function paintAttendanceAnalysis(analysis, busy) {
  const button = document.getElementById("att-analyze");
  if (button) {
    button.disabled = !!busy;
    button.textContent = busy ? "در حال تحلیل…" : "تحلیل با AI و ثبت خودکار در پرونده شاگردان";
  }
  const box = document.getElementById("att-analysis");
  if (box) box.innerHTML = CoachViews.attendanceAnalysisBody(busy ? { loading: true } : analysis);
}

APP.action("attendance:analyze", async () => {
  const counts = SJ.todayCounts();
  if (!counts.marked) {
    UI.toast("اول وضعیت حضور شاگردان را ثبت کنید.");
    return;
  }
  const notes = APP.value("att-notes");
  SJ.setAttendanceNotes(notes);
  const sheet = SJ.todaySheet();
  const absent = SJ.students().filter((s) => sheet.marks[s.id] === "absent").map((s) => s.name);
  const late = SJ.students().filter((s) => sheet.marks[s.id] === "late").map((s) => s.name);
  const started = Date.now();
  APP.ui.aiBusy = true;
  paintAttendanceAnalysis(null, true);
  let percent = 12;
  const timer = setInterval(() => {
    percent = Math.min(88, percent + 9);
    const bar = document.getElementById("att-analysis-bar");
    if (bar) bar.style.width = `${percent}%`;
  }, 280);
  const insight = await AIRemote.attendanceInsight(counts, absent, late, notes);
  const wait = 1800 - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  clearInterval(timer);
  APP.ui.aiBusy = false;
  SJ.setAttendanceAnalysis(insight);
  paintAttendanceAnalysis(insight, false);
  UI.toast(insight.engine === "ai" ? "تحلیل AI ساخته و ثبت شد." : "سرویس AI در دسترس نبود؛ تحلیل محلی ثبت شد.");
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

const BIO_LOADING_LINES = [
  "در حال آنالیز هیدرودینامیکی و تطبیق ریت با طول دست…",
  "در حال محاسبه ریت استروک، پیشروی با هر دست و امتیاز FINA…",
  "در حال خواندن پاسخ مدل و چیدن تحلیل همین تست…",
];

function paintBiomech() {
  const panel = APP.ui.biomechPanel;
  const loading = panel && panel.status === "loading";
  const button = document.getElementById("bio-calc");
  if (button) button.disabled = !!loading;
  const metrics = document.getElementById("bio-metrics");
  if (metrics) metrics.innerHTML = CoachViews.bioMetricsHtml(APP.ui.biomechResult);
  const box = document.getElementById("bio-analysis");
  if (box) box.innerHTML = CoachViews.bioAnalysisHtml();
}

APP.action("bio:calc", async () => {
  const distance = APP.numberFrom(APP.value("bio-distance"));
  const time = APP.numberFrom(APP.value("bio-time"));
  const strokes = APP.numberFrom(APP.value("bio-strokes"));
  if (!distance || !time || !strokes) {
    UI.toast("مسافت، زمان و تعداد دست‌کشی را وارد کنید.");
    return;
  }
  const student = SJ.studentById(APP.ui.biomechStudent || SJ.students()[0].id);
  const chosen = (document.getElementById("bio-stroke") && document.getElementById("bio-stroke").value) || APP.ui.biomechStroke || student.stroke;
  const stroke = STROKES.includes(chosen) ? chosen : student.stroke;
  APP.ui.biomechStroke = stroke;
  const sample = { distance, time, strokes, stroke };
  APP.ui.biomechResult = AI.analyzeSample(sample);
  APP.ui.biomechPanel = { status: "loading", error: "", verdict: null };
  paintBiomech();
  const started = Date.now();
  let step = 0;
  const timer = setInterval(() => {
    step = (step + 1) % BIO_LOADING_LINES.length;
    const line = document.getElementById("bio-loading-text");
    if (line) line.textContent = BIO_LOADING_LINES[step];
  }, 1400);
  try {
    const verdict = await AIRemote.biomechAnalyze(student, sample);
    const wait = 2200 - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    APP.ui.biomechAi[student.id] = verdict;
    APP.ui.biomechPanel = { status: "ready", error: "", verdict };
  } catch (err) {
    const aborted = err && (err.name === "AbortError" || /abort|timeout/i.test(String(err.message || "")));
    const offline = err instanceof TypeError;
    const message = aborted
      ? "زمان پاسخ سرویس تمام شد. اتصال را بررسی کنید و دوباره تلاش کنید."
      : offline
        ? "اتصال به سرویس هوش مصنوعی برقرار نشد."
        : (err && err.message) || "تحلیل انجام نشد.";
    APP.ui.biomechPanel = { status: "error", error: message, verdict: null };
  } finally {
    clearInterval(timer);
    paintBiomech();
  }
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
  const chosen = (document.getElementById("bio-stroke") && document.getElementById("bio-stroke").value) || APP.ui.biomechStroke || student.stroke;
  const stroke = STROKES.includes(chosen) ? chosen : student.stroke;
  APP.ui.biomechStroke = stroke;
  SJ.addBiomech(studentId, { date: TODAY_KEY, distance, time, strokes, stroke });
  APP.ui.biomechResult = AI.analyzeSample({ distance, time, strokes });
  UI.toast(`تست ${stroke} در پرونده ${student.name} ثبت شد.`);
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

function fillReminder(student, balance) {
  return SJ.reminderTemplate()
    .split("{parent}")
    .join(student.parent || "ولی")
    .split("{student}")
    .join(student.name)
    .split("{amount}")
    .join(UI.money(balance.due));
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    /* در صورت رد دسترسی، روش جایگزین پایین استفاده می‌شود */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.inset = "0";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (err) {
    ok = false;
  }
  area.remove();
  return ok;
}

function exportWorkbook(filename, rows, sheetName) {
  if (!window.XLSX) {
    UI.toast("کتابخانه اکسل هنوز بارگذاری نشده است.");
    return false;
  }
  try {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ توضیح: "ردیفی نیست" }]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, sheetName);
    XLSX.writeFile(book, filename);
    return true;
  } catch (err) {
    UI.toast("ساخت فایل اکسل ممکن نشد.");
    return false;
  }
}

APP.action("finance:template", () => {
  UI.modal(
    "الگوی پیام یادآوری",
    `<label class="field">
       <span>متن الگو</span>
       <textarea id="remind-template" rows="6">${UI.escapeHtml(SJ.reminderTemplate())}</textarea>
     </label>
     <p class="muted">تگ‌های متغیر: {parent} نام ولی، {student} نام شناگر، {amount} مانده شهریه.</p>
     <button class="btn-primary btn-sm" type="button" data-action="finance:template-save">ذخیره الگو</button>`
  );
});

APP.action("finance:template-save", () => {
  SJ.setReminderTemplate(APP.value("remind-template"));
  UI.closeModal();
  UI.toast("الگوی پیام یادآوری ذخیره شد.");
});

APP.action("finance:remind", async (data) => {
  const student = SJ.studentById(data.id);
  if (!student) return;
  const balance = SJ.studentBalance(data.id);
  const message = fillReminder(student, balance);
  const copied = await copyText(message);
  UI.toast(copied ? "پیام یادآوری در کلیپ‌بورد کپی شد." : "کپی پیام ممکن نشد.");
});

APP.action("finance:pay", () => {
  const studentId = APP.value("fin-student");
  const student = SJ.studentById(studentId);
  const amount = APP.numberFrom(APP.value("fin-amount"));
  const date = APP.value("fin-date").trim() || TODAY_KEY;
  const method = APP.value("fin-method") || "کارت به کارت";
  const note = APP.value("fin-note").trim();
  if (!student) {
    UI.toast("شاگرد را انتخاب کنید.");
    return;
  }
  if (!amount) {
    UI.toast("مبلغ پرداخت را وارد کنید.");
    return;
  }
  SJ.addPayment({ studentId: student.id, amount, date, method, note, source: "manual" });
  const due = SJ.studentBalance(student.id).due;
  UI.toast(due > 0 ? `پرداخت ثبت شد. مانده ${UI.money(due)}` : "پرداخت ثبت شد و شهریه تسویه شد.");
  APP.render();
});

APP.action("finance:export", (data) => {
  if (data.kind === "debtors") {
    const rows = SJ.students()
      .map((student) => {
        const balance = SJ.studentBalance(student.id);
        return { student, balance };
      })
      .filter((row) => row.balance.due > 0)
      .map((row) => ({
        شناگر: row.student.name,
        ولی: row.student.parent,
        تلفن: row.student.parentPhone,
        شهریه: row.balance.fee,
        دریافتی: row.balance.paid,
        مانده: row.balance.due,
      }));
    exportWorkbook("bedehkaran.xlsx", rows, "بدهکاران");
    UI.toast("فایل اکسل بدهکاران آماده شد.");
    return;
  }
  const rows = SJ.payments()
    .slice()
    .reverse()
    .map((payment) => {
      const student = SJ.studentById(payment.studentId);
      return {
        تاریخ: payment.date,
        شناگر: student ? student.name : "",
        ولی: student ? student.parent : "",
        مبلغ: payment.amount,
        روش: payment.method,
        توضیحات: payment.note || "",
        منبع: payment.source === "ocr" ? "OCR" : "دستی",
      };
    });
  exportWorkbook("daftar-pardakht.xlsx", rows, "دفتر");
  UI.toast("فایل اکسل دفتر پرداخت‌ها آماده شد.");
});

APP.action("finance:print", () => {
  window.print();
});

function paintEventExtras(studentId) {
  const box = document.getElementById("event-clarify");
  if (box) box.innerHTML = CoachViews.eventClarifyHtml(studentId);
  const list = document.getElementById("event-timeline");
  if (list) list.innerHTML = CoachViews.eventTimelineHtml(studentId, true);
}

function applyEventUpdates(student, updates) {
  const done = [];
  updates.forEach((update) => {
    if (update.type === "record") {
      SJ.applyRecord(student, update);
      APP.ui.recordFocus[student.id] = { stroke: update.stroke, distance: Number(update.distance) };
      const change = update.time == null
        ? `${Number(update.delta) < 0 ? "کاهش" : "افزایش"} ${UI.fa(Math.abs(Number(update.delta)))} ثانیه`
        : `${UI.secs(update.time)} ثانیه`;
      done.push(`رکورد ${update.stroke} ${UI.fa(update.distance)} متر: ${change}`);
    } else if (update.type === "biomech") {
      SJ.addBiomech(student.id, {
        date: TODAY_KEY,
        distance: update.distance,
        time: update.time,
        strokes: update.strokeCount,
        rate: update.rate,
        stroke: update.stroke,
      });
      const detail = update.rate != null ? `ریت ${UI.fa(update.rate)}` : "تست";
      done.push(`${detail} بیومکانیک ${update.stroke} ${UI.fa(update.distance)} متر`);
    } else if (update.type === "attendance") {
      SJ.markOnDate(student.id, update.status, update.date);
      const label = update.status === "absent" ? "غایب" : update.status === "late" ? "تأخیر" : "حاضر";
      done.push(`${label} در ${update.date}`);
    }
  });
  return done;
}

async function readEventExtraction(student, text, priorFacts, contextNote, dialogue) {
  try {
    return await AIRemote.extractEvent(student, text, priorFacts, contextNote, dialogue);
  } catch (err) {
    return AI.extractEvent(student, text, priorFacts && priorFacts.record ? priorFacts : undefined);
  }
}

function selectedRecord(studentId) {
  const saved = APP.ui.recordFocus[studentId] || {};
  const strokes = ["کرال سینه", "کرال پشت", "قورباغه", "پروانه"];
  const distances = [25, 50, 100, 200];
  return {
    stroke: strokes.includes(saved.stroke) ? saved.stroke : "کرال سینه",
    distance: distances.includes(Number(saved.distance)) ? Number(saved.distance) : 50,
  };
}

function paintRecordBoard(student) {
  const panel = document.getElementById("record-panel");
  if (panel && student) panel.outerHTML = CoachViews.recordBoard(student);
}

APP.action("record:filter", (data) => {
  const current = selectedRecord(data.id);
  APP.ui.recordFocus[data.id] = {
    stroke: data.stroke || current.stroke,
    distance: data.distance ? Number(data.distance) : current.distance,
  };
  paintRecordBoard(SJ.studentById(data.id));
});

APP.action("record:focus", () => {
  const input = document.getElementById("record-time");
  if (input) input.focus();
});

APP.action("record:add", (data) => {
  const student = SJ.studentById(data.id);
  if (!student) return;
  const time = APP.numberFrom(APP.value("record-time"));
  if (!time) {
    UI.toast("زمان رکورد را به ثانیه بنویسید.");
    return;
  }
  const selected = selectedRecord(student.id);
  SJ.applyRecord(student, { stroke: selected.stroke, distance: selected.distance, time });
  paintRecordBoard(student);
  UI.toast(`رکورد ${selected.stroke} ${UI.fa(selected.distance)} متر ثبت شد.`);
});

APP.action("event:save", async (data) => {
  const text = APP.value("event-note").trim();
  if (!text) {
    UI.toast("متن رخداد را بنویسید.");
    return;
  }
  const student = SJ.studentById(data.id);
  if (!student) return;
  const showToParents = !!(document.getElementById("event-parents") && document.getElementById("event-parents").checked);
  const button = document.getElementById("event-save");
  if (button) {
    button.disabled = true;
    button.textContent = "در حال بررسی…";
  }
  const extracted = await readEventExtraction(student, text);
  if (button) {
    button.disabled = false;
    button.textContent = "تحلیل AI و ثبت";
  }
  if (extracted.clarifyingQuestions.length) {
    APP.ui.eventPending = {
      studentId: student.id,
      text,
      showToParents,
      analysis: "",
      questions: extracted.clarifyingQuestions,
      facts: extracted.facts,
      replies: [],
      answer: "",
    };
    paintEventExtras(student.id);
    UI.toast("برای ثبت دقیق داده، سؤال تکمیلی را جواب دهید.");
    return;
  }
  APP.ui.eventPending = null;
  const applied = applyEventUpdates(student, extracted.proposedUpdates);
  SJ.addStudentNote(student.id, { text, analysis: extracted.aiFeedback, showToParents });
  const input = document.getElementById("event-note");
  if (input) input.value = "";
  const share = document.getElementById("event-parents");
  if (share) share.checked = false;
  paintEventExtras(student.id);
  if (applied.length) APP.render();
  UI.toast(applied.length ? `ثبت شد: ${applied.join("، ")}` : showToParents ? "وقایع ثبت شد و در پورتال اولیا دیده می‌شود." : "وقایع فقط در پرونده مربی ثبت شد.");
});

APP.action("event:confirm", async (data) => {
  const pending = APP.ui.eventPending;
  const student = SJ.studentById((pending && pending.studentId) || data.id);
  if (!pending || !student) return;
  const answer = APP.value("event-clarify-text").trim();
  if (!answer) {
    UI.toast("پاسخ تکمیلی را بنویسید.");
    return;
  }
  const button = document.getElementById("event-confirm");
  if (button) {
    button.disabled = true;
    button.textContent = "در حال تطبیق…";
  }
  const replies = (pending.replies || []).concat(answer);
  const extracted = await readEventExtraction(student, answer, pending.facts, pending.text, {
    questions: pending.questions || [],
    replies,
  });
  if (extracted.clarifyingQuestions.length) {
    APP.ui.eventPending = {
      ...pending,
      answer,
      replies,
      questions: extracted.clarifyingQuestions,
      facts: extracted.facts,
    };
    paintEventExtras(student.id);
    if (button) {
      button.disabled = false;
      button.textContent = "تایید و اعمال نهایی";
    }
    UI.toast("هنوز یک مورد برای ثبت کم است.");
    return;
  }
  const applied = applyEventUpdates(student, extracted.proposedUpdates);
  const analysis = extracted.aiFeedback || AI.eventAdvice(student, pending.text);
  SJ.addStudentNote(student.id, { text: pending.text, analysis, showToParents: pending.showToParents });
  APP.ui.eventPending = null;
  const input = document.getElementById("event-note");
  if (input) input.value = "";
  const share = document.getElementById("event-parents");
  if (share) share.checked = false;
  paintEventExtras(student.id);
  if (applied.length) APP.render();
  UI.toast(applied.length ? `اعمال شد: ${applied.join("، ")}` : "وقایع ثبت شد.");
});

APP.action("session:open", (data) => {
  const date = data.date;
  if (!date || !SJ.sessionDetail(date)) return;
  UI.modal(`جزئیات ${date}`, CoachViews.sessionDetailHtml(date));
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
