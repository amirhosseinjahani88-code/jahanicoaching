/* صفحات عمومی: لندینگ، تعرفه‌ها، ورود و ثبت‌نام، پورتال اولیا. */

const PublicViews = (() => {
  /* ---------- لندینگ ---------- */

  function landing() {
    const demo = APP.demoWorkout;
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page stack-lg">
          <header class="site-header">
            <div class="brand" style="color:#fff">
              <span class="brand-mark">🏊</span>
              <span>${PLATFORM.name}</span>
            </div>
            <div class="row site-header-actions">
              <button class="btn-ghost btn-sm" data-action="go" data-hash="#/pricing">تعرفه‌ها</button>
              <button class="btn-white btn-sm" data-action="go" data-hash="#/auth">ورود / ثبت‌نام مربیان</button>
            </div>
          </header>

          <section class="hero">
            <div class="stack">
              <div class="row">
                <span class="badge badge-cyan">✓ تأییدیه اساتید تراز اول</span>
                <span class="badge badge-light">بدون نیاز به نصب نرم‌افزار</span>
                <span class="badge badge-light">${PLATFORM.designerRole}: ${PLATFORM.designer}</span>
              </div>
              <h1 class="title-xl" style="color:#fff">سامانه هوشمند مربیگری و تحلیل شنا؛ مبتنی بر متدولوژی جهانی و استانداردهای World Aquatics</h1>
              <p class="on-dark-muted" style="font-size:1.1rem;line-height:1.9">
                ${PLATFORM.tagline}. از تمرین‌نویسی با ویس تا آنالیز عددی بیومکانیک و شفافیت مالی با اولیا —
                زمان اداری مربی ۸۰ درصد کم می‌شود و حفظ شناگر درآمد او را تا ۴۰ درصد بالا می‌برد.
              </p>
              <div class="row hero-cta">
                <button class="btn-primary" data-action="go" data-hash="#/auth">شروع رایگان دمو</button>
                <button class="btn-ghost" data-action="go" data-hash="#/pricing">مشاهده پلن‌ها و تعرفه‌ها</button>
              </div>
              <div class="hero-metrics">
                ${IMPACT_METRICS.map(
                  (m) => `<div><div class="title-lg" style="color:#67e8f9">${m.value}</div><div class="on-dark-muted">${m.label}</div></div>`
                ).join("")}
              </div>
            </div>

            <div class="card-glass stack" id="demo-box">
              <div class="space-between">
                <h2 class="title-md" style="color:#fff">دموی تعاملی — بدون ثبت‌نام</h2>
                <span class="badge badge-cyan">${AIRemote.isEnabled() ? "AI واقعی" : "Mock AI"}</span>
              </div>
              <p class="on-dark-muted">یک جمله بگویید، جلسه ساختاریافته بگیرید.</p>
              ${
                AIRemote.isEnabled()
                  ? `<p class="on-dark-muted">برای AI واقعی همین آدرس را باز نگه دار: <span class="num">http://localhost:8777</span></p>`
                  : `<p class="on-dark-muted">برای AI واقعی فایل <span class="num">شروع.bat</span> را بزن و فقط <span class="num">http://localhost:8777</span> را باز کن.</p>`
              }
              <label class="field">
                <span style="color:#e2e8f0">درخواست تمرین</span>
                <textarea id="demo-brief" rows="3" placeholder="مثلاً: برای نوجوانان رقابتی یک جلسه ۷۵ دقیقه‌ای کرال سینه با تمرکز روی سرعت بنویس">${UI.escapeHtml(APP.demoBrief || AI.voice.samples[0])}</textarea>
              </label>
              <div class="row">
                <button class="btn-primary" data-action="demo:generate" ${APP.ui.aiBusy ? "disabled" : ""}>
                  ${APP.ui.aiBusy ? "در حال ساخت جلسه…" : "تولید جلسه با AI"}
                </button>
                <button class="btn-ghost btn-sm" data-action="demo:sample" ${APP.ui.aiBusy ? "disabled" : ""}>یک نمونه دیگر</button>
              </div>
              ${
                demo
                  ? `<div class="demo-output stack">
                      <div class="space-between">
                        <strong style="color:#fff">${UI.escapeHtml(demo.title)}</strong>
                        <span class="badge badge-light">${UI.fa(demo.meters)} متر</span>
                      </div>
                      ${demo.sets
                        .map(
                          (s) => `<div class="demo-row"><span>${UI.escapeHtml(s.phase)}</span><span>${UI.escapeHtml(s.detail)}</span></div>`
                        )
                        .join("")}
                      <p class="on-dark-muted" style="font-size:.95rem">💡 ${UI.escapeHtml(demo.coachTip)}</p>
                      <button class="btn-white btn-sm" data-action="go" data-hash="#/auth">ذخیره این جلسه در پنل من</button>
                    </div>`
                  : `<p class="on-dark-muted" style="font-size:.95rem">خروجی نمونه شامل گرم‌کردن، تکنیک، ست اصلی با ریت هدف، ست پا و سردکردن است.</p>`
              }
            </div>
          </section>

          <section class="stack">
            <h2 class="title-lg" style="color:#fff">سه ستون ارزش پلتفرم</h2>
            <div class="grid">
              ${VALUE_PILLARS.map(
                (p) => `
                <div class="card-glass stack" style="gap:.5rem">
                  <span style="font-size:1.8rem">${p.icon}</span>
                  <strong style="color:#fff;font-size:1.1rem">${p.title}</strong>
                  <p class="on-dark-muted">${p.text}</p>
                </div>`
              ).join("")}
            </div>
          </section>

          <section class="stack">
            <h2 class="title-lg" style="color:#fff">چالش امروز مربیان و پاسخ پلتفرم</h2>
            <div class="grid">
              ${PAIN_POINTS.map(
                (p) => `
                <div class="card-glass stack" style="gap:.5rem">
                  <strong style="color:#fff">${p.title}</strong>
                  <p class="on-dark-muted" style="font-size:.95rem">${p.text}</p>
                  <span class="badge badge-cyan">پاسخ: ${p.fix}</span>
                </div>`
              ).join("")}
            </div>
          </section>

          <section class="stack">
            <h2 class="title-lg" style="color:#fff">ساختار دسترسی‌ها</h2>
            <div class="grid">
              ${[
                { title: "پلن اسنشیال", text: "داشبورد، شاگردان، طراح تمرین دستی، حضور و غیاب، پیش‌نمایش گزارش" },
                { title: "پلن مستری پرو", text: "کاکپیت، پروفایل ۳۶۰، AI Workout، دستیار مالی، آنالیز ریت، آرشیو متدولوژی" },
                { title: "پنل مستر کنترل", text: "داشبورد هوش تجاری، دایرکتوری مربیان با Ghost Login، CMS متدولوژی" },
                { title: "پورتال مستقل اولیا", text: "گزارش پیشرفت، رکوردها، نمودار ریت، حضور و وضعیت تسویه" },
              ]
                .map(
                  (b) => `<div class="card-glass stack" style="gap:.4rem"><strong style="color:#fff">${b.title}</strong><p class="on-dark-muted" style="font-size:.95rem">${b.text}</p></div>`
                )
                .join("")}
            </div>
          </section>

          <section class="stack">
            <h2 class="title-lg" style="color:#fff">نقشه راه</h2>
            <div class="grid">
              ${ROADMAP.map(
                (r) => `
                <div class="card-glass stack" style="gap:.4rem">
                  <div class="row" style="gap:.5rem">
                    <span class="badge ${r.state === "done" ? "badge-cyan" : "badge-light"}">${r.phase}</span>
                    ${r.state === "done" ? '<span class="on-dark-muted" style="font-size:.9rem">در حال اجرا در این دمو</span>' : ""}
                  </div>
                  <strong style="color:#fff">${r.title}</strong>
                  <p class="on-dark-muted" style="font-size:.95rem">${r.text}</p>
                </div>`
              ).join("")}
            </div>
          </section>

          <footer class="stack" style="gap:.5rem;padding-top:1rem">
            <div class="divider" style="background:rgba(255,255,255,.15)"></div>
            <div class="space-between">
              <span class="on-dark-muted">${PLATFORM.latinName} — ${PLATFORM.vision}</span>
              <button class="btn-quiet" style="color:#94a3b8" data-action="go" data-hash="#/admin-login">ورود مدیر پلتفرم (دمو)</button>
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
          "پلن مناسب برای سطح مربیگری شما",
          "از ثبت داده‌های روزانه تا تحلیل حرفه‌ای عملکرد شناگران.",
          loggedIn ? "#/app" : "#/"
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
                ${loggedIn ? (SJ.plan() === plan.id ? "پلن فعال شما" : `فعال‌سازی ${plan.title}`) : `شروع با ${plan.title}`}
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

  function auth() {
    return UI.publicShell(`
      <div class="dark-page">
        <div class="page auth-layout">
          <div class="stack">
            <button class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/">→ بازگشت به لندینگ</button>
            <h1 class="title-xl" style="color:#fff">ورود به پنل حرفه‌ای مربیان</h1>
            <p class="on-dark-muted">${PLATFORM.designerRole}: ${PLATFORM.designer}</p>
            <p class="on-dark-muted">اطلاعات شما در این دمو فقط روی همین مرورگر ذخیره می‌شود.</p>
            <ul class="plan-list on-dark-muted">
              <li>پرونده ۳۶۰ درجه برای هر شناگر</li>
              <li>تمرین‌نویسی با متن و ویس</li>
              <li>پورتال اختصاصی اولیا</li>
            </ul>
          </div>
          <form class="card-glass stack" id="auth-form">
            <h2 class="title-md" style="color:#fff">ثبت‌نام مربی</h2>
            <label class="field">
              <span style="color:#e2e8f0">نام</span>
              <input id="auth-first" value="امیرحسین" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">نام خانوادگی</span>
              <input id="auth-last" value="جهانی" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">شماره همراه</span>
              <input id="auth-phone" value="09904703935" inputmode="numeric" required />
            </label>
            <label class="field">
              <span style="color:#e2e8f0">پلن شروع</span>
              <select id="auth-plan">
                <option value="pro">مستری پرو — دسترسی کامل</option>
                <option value="essential">اسنشیال — پایه</option>
              </select>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="auth-terms" checked />
              <span class="on-dark-muted">قوانین استفاده و امنیت متدولوژی اختصاصی ${PLATFORM.name} را می‌پذیرم.</span>
            </label>
            <div id="auth-error" class="field-error"></div>
            <button type="submit" class="btn-primary btn-block">تکمیل ثبت‌نام و ورود به پنل مربی</button>
            <button type="button" class="btn-quiet" style="color:#baf4ff" data-action="go" data-hash="#/admin-login">ورود مدیر پلتفرم (دمو)</button>
          </form>
        </div>
      </div>`);
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

  return { landing, pricing, auth, adminLogin, parentPortal };
})();
