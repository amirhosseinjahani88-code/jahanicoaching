/* صفحات عمومی: لندینگ، تعرفه‌ها، ورود و ثبت‌نام، پورتال اولیا. */

const PublicViews = (() => {
  function publicHeader() {
    return `
      <header class="site-header site-nav">
        <button class="brand" style="color:#fff" data-action="go" data-hash="#/">
          <span class="brand-mark">🏊</span>
          <span>${PLATFORM.name}</span>
        </button>
        <nav class="site-header-actions" aria-label="${t("ناوبری سایت")}">
          ${UI.prefSwitch()}
          <button class="btn-ghost btn-sm" data-action="go" data-hash="#/pricing">${t("تعرفه‌ها")}</button>
          <button class="btn-ghost btn-sm" data-action="auth:enter">${t("ورود")}</button>
          <button class="btn-white btn-sm" data-action="go" data-hash="#/auth/signup">${t("شروع")}</button>
        </nav>
      </header>`;
  }

  function publicFooter() {
    return `
      <footer class="stack" style="gap:.5rem">
        <div class="divider" style="background:rgba(255,255,255,.15)"></div>
        <div class="space-between">
          <span class="on-dark-muted">${PLATFORM.latinName}</span>
          <button class="btn-quiet" style="color:#94a3b8" data-action="go" data-hash="#/admin-login">${t("ورود مدیر")}</button>
        </div>
        ${UI.designerCredit({ dark: true })}
      </footer>`;
  }

  function planCards() {
    const loggedIn = SJ.isLoggedIn();
    return `
      <div class="plan-grid">
        ${[PLANS.essential, PLANS.pro]
          .map((plan) => {
            const owned = loggedIn && SJ.hasPurchased() && SJ.plan() === plan.id;
            const featured = plan.id === "pro";
            return `
            <article class="card-glass plan-card ${featured ? "plan-card-pro" : ""}">
              <div class="space-between">
                <h2 class="title-md" style="color:#fff">${t(plan.title)}</h2>
                ${featured ? `<span class="badge badge-cyan">${t(plan.badge || "پیشنهادی")}</span>` : `<span class="badge badge-light">${plan.latin}</span>`}
              </div>
              <p class="on-dark-muted">${t(plan.audience)}</p>
              <strong class="price-figure">${t(plan.priceLabel)}</strong>
              <ul class="plan-list plan-list-dark">
                ${plan.features.slice(0, 4).map((f) => `<li>${t(f)}</li>`).join("")}
              </ul>
              <button class="${featured ? "btn-primary" : "btn-white"} btn-block" data-action="plan:choose" data-plan="${plan.id}">
                ${owned ? t("پلن شما") : t("شروع")}
              </button>
            </article>`;
          })
          .join("")}
      </div>`;
  }

  /* ---------- لندینگ ---------- */

  function landing() {
    const demo = APP.demoWorkout;
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page stack-lg">
          ${publicHeader()}

          <section class="hero">
            <div class="stack">
              <span class="badge badge-cyan">${t(PLATFORM.designerRole)}: ${PLATFORM.designer}</span>
              <h1 class="title-xl" style="color:#fff">${t("مربیگری شنا، بدون کاغذ.")}</h1>
              <p class="on-dark-muted">${t("تمرین، تحلیل و شهریه در یک جا.")}</p>
              <div class="row hero-cta">
                <button class="btn-primary" data-action="go" data-hash="#/auth/signup">${t("شروع")}</button>
                <button class="btn-white" data-action="auth:enter">${t("ورود")}</button>
                <button class="btn-ghost" data-action="go" data-hash="#/pricing">${t("تعرفه‌ها")}</button>
              </div>
              <div class="hero-metrics">
                ${IMPACT_METRICS.map(
                  (m) => `<div><div class="title-lg" style="color:#67e8f9">${t(m.value)}</div><div class="on-dark-muted">${t(m.label)}</div></div>`
                ).join("")}
              </div>
            </div>

            <section class="card-glass stack" id="demo-box">
            <h2 class="title-md" style="color:#fff">${t("یک جمله، یک جلسه.")}</h2>
            <label class="field">
              <span style="color:#e2e8f0">${t("درخواست تمرین")}</span>
              <textarea id="demo-brief" rows="3" placeholder="${t("مثلاً: جلسه سرعت کرال سینه")}">${UI.escapeHtml(APP.demoBrief || AI.voice.samples[0])}</textarea>
            </label>
            <div class="row">
              <button class="btn-primary" data-action="demo:generate" ${APP.ui.aiBusy ? "disabled" : ""}>
                ${APP.ui.aiBusy ? t("در حال ساخت…") : t("ساخت جلسه")}
              </button>
              <button class="btn-ghost btn-sm" data-action="demo:sample" ${APP.ui.aiBusy ? "disabled" : ""}>${t("نمونه دیگر")}</button>
            </div>
            ${
              demo
                ? `<div class="demo-output stack">
                    <strong style="color:#fff">${UI.escapeHtml(demo.title)}</strong>
                    ${demo.sets
                      .map((s) => `<div class="demo-row"><span>${UI.escapeHtml(s.phase)}</span><span>${UI.escapeHtml(s.detail)}</span></div>`)
                      .join("")}
                    <button class="btn-white btn-sm" data-action="auth:enter">${t("ذخیره")}</button>
                  </div>`
                : ""
            }
            </section>
          </section>

          <section class="stack">
            <h2 class="title-lg" style="color:#fff">${t("چه کار می‌کند")}</h2>
            <div class="grid">
              ${VALUE_PILLARS.map(
                (item) => `
                <div class="card-glass stack" style="gap:.35rem">
                  <strong style="color:#fff">${t(item.title)}</strong>
                  <p class="on-dark-muted">${t(item.text)}</p>
                </div>`
              ).join("")}
            </div>
          </section>

          <section class="stack">
            <h2 class="title-lg" style="color:#fff">${t("مشکل مربی")}</h2>
            <div class="grid">
              ${PAIN_POINTS.map(
                (item) => `
                <div class="card-glass stack" style="gap:.35rem">
                  <strong style="color:#fff">${t(item.title)}</strong>
                  <p class="on-dark-muted">${t(item.text)}</p>
                  <span class="badge badge-cyan">${t(item.fix)}</span>
                </div>`
              ).join("")}
            </div>
          </section>

          <section class="stack">
            <div class="space-between">
              <h2 class="title-lg" style="color:#fff">${t("تعرفه‌ها")}</h2>
              <button class="btn-ghost btn-sm" data-action="go" data-hash="#/pricing">${t("جزئیات پلن‌ها")}</button>
            </div>
            ${planCards()}
          </section>

          <section class="closing">
            <div class="stack" style="gap:.25rem">
              <strong style="color:#fff">${t("مربیگری شنا، در یک جا.")}</strong>
              <p class="on-dark-muted">${t(PLATFORM.tagline)}</p>
            </div>
            <div class="row">
              <button class="btn-primary" data-action="go" data-hash="#/auth/signup">${t("ثبت‌نام")}</button>
              <button class="btn-white" data-action="auth:enter">${t("ورود")}</button>
            </div>
          </section>

          ${publicFooter()}
        </div>
      </div>`);
  }

  /* ---------- تعرفه‌ها ---------- */

  function pricing() {
    const loggedIn = SJ.isLoggedIn();
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page stack-lg">
          ${publicHeader()}
          <section class="stack">
            <button class="btn-quiet" style="color:#baf4ff" data-action="nav:back">${t("→ بازگشت")}</button>
            <h1 class="title-xl" style="color:#fff">${t("تعرفه‌ها")}</h1>
            <p class="on-dark-muted">${t("دو اشتراک سالانه برای مربی شنا.")}</p>
          </section>
          <div class="plan-grid">
            ${[PLANS.essential, PLANS.pro]
              .map((plan) => {
                const owned = loggedIn && SJ.hasPurchased() && SJ.plan() === plan.id;
                const featured = plan.id === "pro";
                return `
                <article class="card-glass plan-card ${featured ? "plan-card-pro" : ""}">
                  <div class="space-between">
                    <h2 class="title-lg" style="color:#fff">${t(plan.title)}</h2>
                    ${featured ? `<span class="badge badge-cyan">${t(plan.badge)}</span>` : `<span class="badge badge-light">${plan.latin}</span>`}
                  </div>
                  <p class="on-dark-muted">${t(plan.audience)}</p>
                  <strong class="price-figure">${t(plan.priceLabel)}</strong>
                  <ul class="plan-list plan-list-dark">
                    ${plan.features.map((f) => `<li>${t(f)}</li>`).join("")}
                    ${plan.locked.map((f) => `<li class="is-locked">${t(f)}</li>`).join("")}
                  </ul>
                  <button class="${featured ? "btn-primary" : "btn-white"} btn-block" data-action="plan:choose" data-plan="${plan.id}">
                    ${owned ? t("پلن شما") : t("شروع")}
                  </button>
                </article>`;
              })
              .join("")}
          </div>
          <section class="stack">
            <h2 class="title-md" style="color:#fff">${t("برای استخر و آکادمی")}</h2>
            <div class="grid">
              ${REVENUE_STREAMS.filter((s) => s.id === "academy" || s.id === "vault")
                .map(
                  (s) => `
                  <div class="card-glass stack" style="gap:.35rem">
                    <strong style="color:#fff">${t(s.title)}</strong>
                    <span class="badge badge-cyan">${t(s.price)}</span>
                    <p class="on-dark-muted">${t(s.note)}</p>
                  </div>`
                )
                .join("")}
            </div>
          </section>
          ${publicFooter()}
        </div>
      </div>`);
  }

  /* ---------- ورود و ثبت‌نام ---------- */

  function login() {
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page stack-lg">
          ${publicHeader()}
          <div class="auth-layout">
            <div class="stack auth-aside">
              <button class="btn-quiet" style="color:#baf4ff" data-action="nav:back">${t("→ بازگشت")}</button>
              <h1 class="title-xl" style="color:#fff">${t("ورود")}</h1>
              <p class="on-dark-muted">${t(PLATFORM.tagline)}</p>
            </div>
            <form class="card-glass stack" id="login-form">
              <label class="field">
                <span style="color:#e2e8f0">${t("شماره همراه")}</span>
                <input id="login-phone" inputmode="numeric" autocomplete="username" placeholder="0912…" required />
              </label>
              <label class="field">
                <span style="color:#e2e8f0">${t("رمز عبور")}</span>
                <input id="login-password" type="password" autocomplete="current-password" required />
              </label>
              <div id="login-error" class="field-error"></div>
              <button type="submit" class="btn-primary btn-block">${t("ورود")}</button>
              <button type="button" class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/auth/signup">${t("حساب ندارید؟ ثبت‌نام")}</button>
            </form>
          </div>
        </div>
      </div>`);
  }

  function signup() {
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page stack-lg">
          ${publicHeader()}
          <div class="auth-layout">
            <div class="stack auth-aside">
              <button class="btn-quiet" style="color:#baf4ff" data-action="nav:back">${t("→ بازگشت")}</button>
              <h1 class="title-xl" style="color:#fff">${t("ثبت‌نام")}</h1>
              <p class="on-dark-muted">${t(PLATFORM.tagline)}</p>
            </div>
            <form class="card-glass stack" id="signup-form">
            <label class="field">
              <span style="color:#e2e8f0">${t("نام")}</span>
              <input id="signup-first" autocomplete="given-name" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">${t("نام خانوادگی")}</span>
              <input id="signup-last" autocomplete="family-name" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">${t("شماره همراه")}</span>
              <input id="signup-phone" inputmode="numeric" autocomplete="username" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">${t("رمز عبور")}</span>
              <input id="signup-password" type="password" autocomplete="new-password" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">${t("تکرار رمز")}</span>
              <input id="signup-password2" type="password" autocomplete="new-password" required />
            </label>
            <div id="signup-error" class="field-error"></div>
            <button type="submit" class="btn-primary btn-block">${t("ثبت‌نام")}</button>
            <button type="button" class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/auth">${t("قبلاً ثبت‌نام کرده‌اید؟ ورود")}</button>
          </form>
          </div>
        </div>
      </div>`);
  }

  function checkout(planId) {
    const plan = planId === "essential" ? PLANS.essential : PLANS.pro;
    const loggedIn = SJ.isLoggedIn();
    const draft = APP.ui.checkoutDraft || {};
    const coach = loggedIn ? SJ.raw.coach : null;
    const firstName = draft.firstName || (coach ? coach.firstName : "");
    const lastName = draft.lastName || (coach ? coach.lastName : "");
    const phone = draft.phone || (coach ? coach.phone : "");

    return `
      <main class="page stack-lg">
        <div class="page-tools">${UI.prefSwitch()}</div>
        ${UI.sectionTitle("سبد خرید", "این پرداخت فرضی است و هیچ پول واقعی کم نمی‌شود.", "@back")}
        <div class="two-col">
          <section class="card stack cart">
            <div class="space-between">
              <h2 class="title-md">${t("سفارش شما")}</h2>
              <span class="badge badge-warn">${t("پرداخت فرضی")}</span>
            </div>
            <div class="cart-row">
              <div class="stack" style="gap:.2rem">
                <strong>${t(plan.title)}</strong>
                <span class="muted">${t(plan.audience)}</span>
                <span class="muted">${t("اشتراک یک‌ساله")}</span>
              </div>
              <strong class="num">${UI.money(plan.priceToman)}</strong>
            </div>
            <ul class="plan-list">
              ${plan.features.slice(0, 4).map((feature) => `<li>${t(feature)}</li>`).join("")}
            </ul>
            <div class="divider"></div>
            <div class="cart-row cart-total">
              <span>${t("مبلغ قابل پرداخت")}</span>
              <strong>${t(plan.priceLabel)}</strong>
            </div>
          </section>

          <form class="card stack" id="checkout-form">
            <input type="hidden" id="checkout-plan" value="${plan.id}" />
            <h2 class="title-md">${loggedIn ? t("تأیید خرید") : t("ثبت‌نام")}</h2>
            ${
              loggedIn
                ? `<p class="muted">خرید روی حساب ${UI.escapeHtml(SJ.coachName())} ثبت می‌شود.</p>`
                : `<label class="field">
                    <span>${t("نام")}</span>
                    <input id="checkout-first" value="${UI.escapeHtml(firstName)}" required />
                  </label>
                  <label class="field">
                    <span>${t("نام خانوادگی")}</span>
                    <input id="checkout-last" value="${UI.escapeHtml(lastName)}" required />
                  </label>
                  <label class="field">
                    <span>${t("شماره همراه")}</span>
                    <input id="checkout-phone" value="${UI.escapeHtml(phone)}" inputmode="numeric" required />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" id="checkout-terms" checked />
                    <span>${t("قوانین استفاده را می‌پذیرم.")}</span>
                  </label>`
            }
            <div id="checkout-error" class="checkout-error"></div>
            <button type="submit" class="btn-primary btn-block">${t("تکمیل خرید")}</button>
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
