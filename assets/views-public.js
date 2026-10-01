/* صفحات عمومی: لندینگ، تعرفه‌ها، ورود و ثبت‌نام، پورتال اولیا. */

const PublicViews = (() => {
  /* ---------- لندینگ ---------- */

  function landing() {
    const demo = APP.demoWorkout;
    const story = [
      ...VALUE_PILLARS.map((item) => ({ kicker: "ارزش", title: item.title, text: item.text })),
      ...PAIN_POINTS.map((item) => ({ kicker: "مسئله", title: item.title, text: item.text, badge: item.fix })),
      { kicker: "پلن", title: "پلن اقتصادی", text: "شاگرد، حضور و تمرین دستی." },
      { kicker: "پلن", title: "پلن مستری پرو", text: "تحلیل، مالی و آرشیو." },
      { kicker: "دسترسی", title: "پورتال اولیا", text: "رکورد، حضور و شهریه." },
      ...ROADMAP.map((item) => ({ kicker: item.phase, title: item.title, text: item.text })),
    ];
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page">
          <header class="site-header">
            <div class="brand" style="color:#fff">
              <span class="brand-mark">🏊</span>
              <span>${PLATFORM.name}</span>
            </div>
            <div class="row site-header-actions">
              <button class="btn-ghost btn-sm" data-action="go" data-hash="#/pricing">تعرفه‌ها</button>
              <button class="btn-white btn-sm" data-action="auth:enter">ورود</button>
            </div>
          </header>

          <section class="landing-block">
            <span class="badge badge-cyan">${PLATFORM.designerRole}: ${PLATFORM.designer}</span>
            <h1 class="title-xl" style="color:#fff">مربیگری شنا، بدون کاغذ.</h1>
            <p class="landing-lead on-dark-muted">تمرین، تحلیل و شهریه در یک جا.</p>
            <div class="row hero-cta">
              <button class="btn-primary" data-action="auth:enter">ورود</button>
            </div>
            <div class="hero-metrics">
              ${IMPACT_METRICS.map(
                (m) => `<div><div class="title-lg" style="color:#67e8f9">${m.value}</div><div class="on-dark-muted">${m.label}</div></div>`
              ).join("")}
            </div>
          </section>

          <section class="landing-block" id="demo-box">
            <span class="landing-kicker">نمونه</span>
            <h2 class="title-lg" style="color:#fff">یک جمله، یک جلسه.</h2>
            <div class="card-glass stack">
              <label class="field">
                <span style="color:#e2e8f0">درخواست تمرین</span>
                <textarea id="demo-brief" rows="3" placeholder="مثلاً: جلسه سرعت کرال سینه">${UI.escapeHtml(APP.demoBrief || AI.voice.samples[0])}</textarea>
              </label>
              <div class="row">
                <button class="btn-primary" data-action="demo:generate" ${APP.ui.aiBusy ? "disabled" : ""}>
                  ${APP.ui.aiBusy ? "در حال ساخت…" : "ساخت جلسه"}
                </button>
                <button class="btn-ghost btn-sm" data-action="demo:sample" ${APP.ui.aiBusy ? "disabled" : ""}>نمونه دیگر</button>
              </div>
              ${
                demo
                  ? `<div class="demo-output stack">
                      <strong style="color:#fff">${UI.escapeHtml(demo.title)}</strong>
                      ${demo.sets
                        .map((s) => `<div class="demo-row"><span>${UI.escapeHtml(s.phase)}</span><span>${UI.escapeHtml(s.detail)}</span></div>`)
                        .join("")}
                      <button class="btn-white btn-sm" data-action="auth:enter">ذخیره در پنل</button>
                    </div>`
                  : ""
              }
            </div>
          </section>

          ${story
            .map(
              (item) => `
            <section class="landing-block">
              <span class="landing-kicker">${item.kicker}</span>
              <h2 class="title-lg" style="color:#fff">${item.title}</h2>
              <p class="landing-lead on-dark-muted">${item.text}</p>
              ${item.badge ? `<span class="badge badge-cyan">${item.badge}</span>` : ""}
            </section>`
            )
            .join("")}

          <footer class="stack" style="gap:.5rem;padding:2rem 0 1rem">
            <div class="divider" style="background:rgba(255,255,255,.15)"></div>
            <div class="space-between">
              <span class="on-dark-muted">${PLATFORM.latinName}</span>
              <button class="btn-quiet" style="color:#94a3b8" data-action="go" data-hash="#/admin-login">ورود مدیر</button>
            </div>
            ${UI.designerCredit({ dark: true })}
          </footer>
        </div>
      </div>`);
  }

  /* ---------- تعرفه‌ها ---------- */

  function pricing() {
    const loggedIn = SJ.isLoggedIn();
    return `
      <main class="page stack-lg">
        ${UI.sectionTitle(
          "انتخاب پلن",
          loggedIn && !SJ.hasPurchased() ? "هنوز خریدی ثبت نشده." : "یک پلن را انتخاب کنید.",
          loggedIn && SJ.hasPurchased() ? "#/app" : "#/"
        )}
        <div class="grid">
          ${[PLANS.essential, PLANS.pro]
            .map(
              (plan) => `
            <div class="card stack ${plan.featured || plan.id === "pro" ? "plan-card-featured" : ""}">
              ${plan.badge ? `<span class="badge badge-blue">${plan.badge}</span>` : ""}
              <h2 class="title-lg">${plan.title}</h2>
              <p class="muted">${plan.audience}</p>
              <strong class="title-md" style="color:#0a84ff">${plan.priceLabel}</strong>
              <ul class="plan-list">
                ${plan.features.map((f) => `<li>✅ ${f}</li>`).join("")}
                ${plan.locked.map((f) => `<li class="muted">🔒 ${f}</li>`).join("")}
              </ul>
              <button class="${plan.id === "pro" ? "btn-primary" : "btn-white"} btn-block" data-action="plan:choose" data-plan="${plan.id}">
                ${loggedIn && SJ.hasPurchased() && SJ.plan() === plan.id ? "پلن فعال شما" : "انتخاب و رفتن به سبد خرید"}
              </button>
            </div>`
            )
            .join("")}
        </div>

        <section class="stack">
          <h2 class="title-lg">جریان‌های درآمدی پلتفرم</h2>
          <div class="grid">
            ${REVENUE_STREAMS.map(
              (s) => `
              <div class="card stack" style="gap:.4rem">
                <strong>${s.title}</strong>
                <span class="badge badge-blue">${s.price}</span>
                <p class="muted" style="font-size:.95rem">${s.audience}</p>
                <p style="font-size:.95rem">${s.note}</p>
              </div>`
            ).join("")}
          </div>
        </section>
        ${UI.designerCredit()}
      </main>`;
  }

  /* ---------- ورود و ثبت‌نام ---------- */

  function login() {
    const known = SJ.hasAccount();
    const phone = known ? SJ.raw.coach.phone : "";
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page auth-layout">
          <div class="stack">
            <button class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/">→ بازگشت</button>
            <h1 class="title-xl" style="color:#fff">ورود</h1>
            <p class="on-dark-muted">اگر پلن خریده باشید، همان پلن باز می‌شود.</p>
          </div>
          <form class="card-glass stack" id="login-form">
            <h2 class="title-md" style="color:#fff">شماره همراه</h2>
            <label class="field">
              <span style="color:#e2e8f0">شماره</span>
              <input id="login-phone" value="${UI.escapeHtml(phone)}" inputmode="numeric" required />
            </label>
            <div id="login-error" class="field-error"></div>
            <button type="submit" class="btn-primary btn-block">ورود</button>
            ${
              known
                ? ""
                : `<button type="button" class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/auth/signup">ثبت‌نام</button>`
            }
          </form>
        </div>
      </div>`);
  }

  function signup() {
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page auth-layout">
          <div class="stack">
            <button class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/auth">→ بازگشت به ورود</button>
            <h1 class="title-xl" style="color:#fff">ثبت‌نام</h1>
            <p class="on-dark-muted">بعد از ثبت‌نام، پلن‌ها را می‌بینید.</p>
          </div>
          <form class="card-glass stack" id="signup-form">
            <label class="field">
              <span style="color:#e2e8f0">نام</span>
              <input id="signup-first" value="امیرحسین" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">نام خانوادگی</span>
              <input id="signup-last" value="جهانی" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">شماره همراه</span>
              <input id="signup-phone" value="09904703935" inputmode="numeric" required />
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="signup-terms" checked />
              <span class="on-dark-muted">قوانین ${PLATFORM.name} را می‌پذیرم.</span>
            </label>
            <div id="signup-error" class="field-error"></div>
            <button type="submit" class="btn-primary btn-block">ثبت‌نام و دیدن پلن‌ها</button>
          </form>
        </div>
      </div>`);
  }

  function checkout(planId) {
    const plan = planId === "essential" ? PLANS.essential : PLANS.pro;
    const loggedIn = SJ.isLoggedIn();
    const draft = APP.ui.checkoutDraft || {};
    const coach = loggedIn ? SJ.raw.coach : null;
    const firstName = draft.firstName || (coach ? coach.firstName : "امیرحسین");
    const lastName = draft.lastName || (coach ? coach.lastName : "جهانی");
    const phone = draft.phone || (coach ? coach.phone : "09904703935");

    return `
      <main class="page stack-lg">
        ${UI.sectionTitle("سبد خرید", "این پرداخت فرضی است و هیچ پول واقعی کم نمی‌شود.", "#/pricing")}
        <div class="two-col">
          <section class="card stack cart">
            <div class="space-between">
              <h2 class="title-md">سفارش شما</h2>
              <span class="badge badge-warn">پرداخت فرضی</span>
            </div>
            <div class="cart-row">
              <div class="stack" style="gap:.2rem">
                <strong>${plan.title}</strong>
                <span class="muted">${plan.audience}</span>
                <span class="muted">اشتراک یک‌ساله</span>
              </div>
              <strong class="num">${UI.money(plan.priceToman)}</strong>
            </div>
            <ul class="plan-list">
              ${plan.features.slice(0, 4).map((feature) => `<li>${feature}</li>`).join("")}
            </ul>
            <div class="divider"></div>
            <div class="cart-row cart-total">
              <span>مبلغ قابل پرداخت</span>
              <strong>${plan.priceLabel}</strong>
            </div>
          </section>

          <form class="card stack" id="checkout-form">
            <input type="hidden" id="checkout-plan" value="${plan.id}" />
            <h2 class="title-md">${loggedIn ? "تأیید خرید" : "ثبت‌نام"}</h2>
            ${
              loggedIn
                ? `<p class="muted">خرید روی حساب ${UI.escapeHtml(SJ.coachName())} ثبت می‌شود.</p>`
                : `<label class="field">
                    <span>نام</span>
                    <input id="checkout-first" value="${UI.escapeHtml(firstName)}" required />
                  </label>
                  <label class="field">
                    <span>نام خانوادگی</span>
                    <input id="checkout-last" value="${UI.escapeHtml(lastName)}" required />
                  </label>
                  <label class="field">
                    <span>شماره همراه</span>
                    <input id="checkout-phone" value="${UI.escapeHtml(phone)}" inputmode="numeric" required />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" id="checkout-terms" checked />
                    <span>قوانین استفاده ${PLATFORM.name} را می‌پذیرم.</span>
                  </label>`
            }
            <div id="checkout-error" class="checkout-error"></div>
            <button type="submit" class="btn-primary btn-block">خرید فرضی و ورود به پنل</button>
          </form>
        </div>
        ${UI.designerCredit()}
      </main>`;
  }

  function adminLogin() {
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page auth-layout">
          <div class="stack">
            <button class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/">→ بازگشت به لندینگ</button>
            <h1 class="title-xl" style="color:#fff">پنل مستر کنترل</h1>
            <p class="on-dark-muted">${PLATFORM.designerRole}: ${PLATFORM.designer}</p>
            <p class="on-dark-muted">داشبورد هوش تجاری، دایرکتوری مربیان و مدیریت محتوای متدولوژی.</p>
          </div>
          <div class="card-glass stack">
            <h2 class="title-md" style="color:#fff">ورود مدیر پلتفرم</h2>
            <p class="on-dark-muted">در این دمو، ورود بدون رمز انجام می‌شود.</p>
            <button class="btn-primary btn-block" data-action="admin:login">ورود به پنل مدیریت</button>
          </div>
        </div>
      </div>`);
  }

  /* ---------- پورتال مستقل اولیا ---------- */

  function parentPortal(studentId, tok) {
    const student = SJ.studentByToken(studentId, tok);
    if (!student) {
      return UI.publicShell(`
        <div class="dark-page">
          <div class="page stack">
            <h1 class="title-lg" style="color:#fff">لینک معتبر نیست</h1>
            <p class="on-dark-muted">این لینک منقضی شده یا به شاگرد دیگری تعلق دارد. از مربی لینک تازه بخواهید.</p>
            <button class="btn-white" data-action="go" data-hash="#/">بازگشت به صفحه اصلی</button>
          </div>
        </div>`);
    }

    if (AIRemote.isEnabled() && !APP.ui.parentReports[student.id]) {
      APP.ui.parentReports[student.id] = { loading: true };
      AIRemote.parentReport(student).then((report) => {
        APP.ui.parentReports[student.id] = report;
        APP.render();
      });
    }
    const cachedReport = APP.ui.parentReports[student.id];
    const report = cachedReport && !cachedReport.loading ? cachedReport : AI.parentReport(student);
    const balance = SJ.studentBalance(student.id);
    const sessionsLeft = Math.max(0, student.sessions - student.used);
    const samples = SJ.biomech(student.id).map((s) => AI.analyzeSample({ distance: s.distance, time: s.time, strokes: s.strokes }));

    return UI.publicShell(`
      <div class="parent-portal">
        <header class="parent-hero">
          <div class="page stack" style="gap:.5rem">
            <span class="badge badge-cyan">پرتال تأییدشده ${PLATFORM.name}</span>
            <h1 class="title-xl" style="color:#fff">${UI.escapeHtml(student.name)}</h1>
            <p class="on-dark-muted">مربی: ${UI.escapeHtml(SJ.coachName() || "امیرحسین جهانی")} • گروه ${UI.escapeHtml(student.group)} • ماده اصلی ${UI.escapeHtml(student.event)}</p>
          </div>
        </header>
        <main class="page stack-lg">
          <div class="grid">
            ${UI.kpi("رکورد فعلی", `${UI.secs(student.times[student.times.length - 1])} ثانیه`, student.event)}
            ${UI.kpi("امتیاز FINA", report.finaPoints ? UI.fa(report.finaPoints) : "—", "بر پایه زمان پایه جهانی")}
            ${UI.kpi("نرخ حضور", `${UI.fa(report.attendanceRate)}٪`, `${UI.fa(sessionsLeft)} جلسه باقیمانده`)}
            ${UI.kpi(
              "وضعیت تسویه",
              balance.due === 0 ? "تسویه شده" : UI.millions(balance.due),
              balance.due === 0 ? "بدهی ندارید" : "مانده قابل پرداخت",
              balance.due === 0 ? "" : "kpi-warn"
            )}
          </div>

          <section class="card stack">
            <h2 class="title-md">پیشرفت رکورد در ${UI.fa(student.times.length)} ماه گذشته</h2>
            ${UI.lineChart({ labels: CHART_MONTHS, values: student.times, betterIsLower: true, unit: "ثانیه" })}
            <p class="muted">در این نمودار، پایین‌تر بودن نقطه یعنی زمان بهتر.</p>
          </section>

          ${
            samples.length
              ? `<section class="card stack">
                  <h2 class="title-md">نمودار ریت دست (دست‌کشی در دقیقه)</h2>
                  ${UI.lineChart({
                    labels: samples.map((_, i) => `تست ${UI.fa(i + 1)}`),
                    values: samples.map((s) => s.rate),
                    unit: "دست‌کشی",
                  })}
                  <div class="row">
                    <span class="badge badge-blue">پیشروی با هر دست: ${UI.secs(samples[samples.length - 1].dps, 2)} متر</span>
                    <span class="badge badge-blue">سرعت میانگین: ${UI.secs(samples[samples.length - 1].velocity, 2)} متر بر ثانیه</span>
                  </div>
                </section>`
              : ""
          }

          <section class="card stack">
            <h2 class="title-md">گزارش مربی و تحلیل AI</h2>
            <div class="ai-box">
              ${report.paragraphs.map((p) => `<p>${UI.escapeHtml(p)}</p>`).join("")}
            </div>
            <h3 class="title-md">تمرین خانگی این هفته</h3>
            <ul class="plan-list">${report.homework.map((h) => `<li>${UI.escapeHtml(h)}</li>`).join("")}</ul>
          </section>

          <section class="card stack">
            <h2 class="title-md">سابقه حضور</h2>
            <div class="chips">
              ${SJ.studentAttendance(student.id)
                .map(
                  (row) =>
                    `<span class="chip chip-${row.status}">${UI.escapeHtml(row.date)} — ${row.status === "present" ? "حاضر" : row.status === "late" ? "تأخیر" : "غایب"}</span>`
                )
                .join("") || '<span class="muted">جلسه‌ای ثبت نشده است.</span>'}
            </div>
          </section>

          <footer class="muted" style="text-align:center;padding:1rem 0">
            این صفحه فقط برای اولیای ${UI.escapeHtml(student.name)} صادر شده است.
            ${UI.designerCredit()}
          </footer>
        </main>
      </div>`);
  }

  return { landing, pricing, login, signup, checkout, adminLogin, parentPortal };
})();
