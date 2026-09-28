/* صفحات پنل مربی: کاکپیت، حضور و غیاب، شاگردان، پرونده ۳۶۰، تمرین‌نویسی، آنالیز، مالی و آرشیو. */

const CoachViews = (() => {
  /* ---------- کاکپیت ---------- */

  function cockpit() {
    const counts = SJ.todayCounts();
    const finance = SJ.financeSummary();
    if (AIRemote.isEnabled() && !APP.ui.insightsRequested) {
      APP.ui.insightsRequested = true;
      AIRemote.cockpitInsights().then((items) => {
        APP.ui.cockpitInsights = items;
        APP.render();
      });
    }
    const insights = APP.ui.cockpitInsights || AI.cockpitInsights();
    const published = SJ.latestPublished();
    const pro = SJ.isPro();

    const body = `
      <div class="stack-lg">
        <div class="space-between">
          <div class="stack" style="gap:.25rem">
            <span class="eyebrow">${TODAY_LABEL}</span>
            <h1 class="title-xl">سلام مربی ${UI.escapeHtml(SJ.raw.coach.firstName)} ${UI.escapeHtml(SJ.raw.coach.lastName)}</h1>
            <p class="muted">${pro ? "کاکپیت مستری پرو" : "داشبورد پلن اسنشیال"} • ${UI.escapeHtml(SJ.raw.coach.pool)}</p>
            <p class="muted">${PLATFORM.designerRole}: ${PLATFORM.designer}</p>
          </div>
          <button class="card-gradient stack plan-chip" data-action="go" data-hash="#/app/profile">
            <span style="opacity:.85">اشتراک فعال</span>
            <strong class="title-md">${pro ? PLANS.pro.title : PLANS.essential.title}</strong>
            <span style="opacity:.85">${pro ? PLANS.pro.priceLabel : PLANS.essential.priceLabel}</span>
          </button>
        </div>

        ${UI.aiStatusCard()}

        <div class="grid">
          ${UI.kpi("شاگردان فعال", `${UI.fa(SJ.students().length)} شناگر`, "ورود به پرونده شاگردان", "", "#/app/students")}
          ${UI.kpi(
            "حضور و غیاب امروز",
            counts.marked ? `${UI.fa(counts.present)} حاضر، ${UI.fa(counts.absent)} غایب` : "ثبت نشده",
            counts.marked ? `${UI.fa(counts.marked)} از ${UI.fa(counts.total)} ثبت شده` : "برای شروع کلیک کنید",
            counts.marked ? "" : "kpi-warn",
            "#/app/attendance"
          )}
          ${UI.kpi(
            "وصول شهریه این ماه",
            UI.millions(finance.collected),
            `${UI.fa(finance.debtors)} شاگرد بدهکار`,
            finance.debtors ? "kpi-warn" : "",
            pro ? "#/app/finance" : "#/pricing"
          )}
          ${UI.kpi(
            "جلسات",
            `${UI.fa(SJ.workouts().length)} جلسه`,
            published ? UI.escapeHtml(published.title) : "مشاهده جلسات گذشته",
            "",
            "#/app/sessions"
          )}
        </div>

        <section class="stack">
          <h2 class="title-lg">هوش عملیاتی امروز</h2>
          <div class="stack">
            ${insights
              .map(
                (item) => `
              <div class="insight insight-${item.tone}">
                <span>${UI.escapeHtml(item.text)}</span>
                ${item.action ? `<button class="btn-white btn-sm" data-action="go" data-hash="${item.action.hash}">${item.action.label}</button>` : ""}
              </div>`
              )
              .join("")}
          </div>
        </section>

        <section class="stack">
          <h2 class="title-lg">میان‌برهای روز</h2>
          <div class="grid">
            <button class="card-link" data-action="go" data-hash="#/app/attendance">
              <strong class="title-md">ثبت حضور و غیاب</strong>
              <span class="muted">چک‌لیست امروز، تحلیل AI و ثبت در پرونده</span>
            </button>
            <button class="card-link" data-action="go" data-hash="#/app/workout">
              <strong class="title-md">${pro ? "تمرین‌نویسی با ویس و متن" : "طراح تمرین دستی"}</strong>
              <span class="muted">${pro ? "جلسه ساختاریافته با دروازه بازبینی" : "ساخت ست‌ها با محاسبه خودکار متراژ"}</span>
            </button>
            <button class="card-link" data-action="go" data-hash="#/app/students">
              <strong class="title-md">پرونده شاگردان</strong>
              <span class="muted">رکورد، ریت، حضور و وضعیت مالی</span>
            </button>
            <button class="card-link" data-action="go" data-hash="#/app/sessions">
              <strong class="title-md">جلسات گذشته</strong>
              <span class="muted">تمرین‌های منتشرشده و حضور هر روز</span>
            </button>
            <button class="card-link" data-action="go" data-hash="${pro ? "#/app/biomech" : "#/pricing"}">
              <strong class="title-md">آنالیز بیومکانیک ${pro ? "" : "🔒"}</strong>
              <span class="muted">ریت دست، DPS و امتیاز FINA</span>
            </button>
            <button class="card-link" data-action="go" data-hash="${pro ? "#/app/finance" : "#/pricing"}">
              <strong class="title-md">دستیار مالی و OCR ${pro ? "" : "🔒"}</strong>
              <span class="muted">اسکن رسید و تطبیق خودکار با شاگرد</span>
            </button>
            <button class="card-link" data-action="go" data-hash="${pro ? "#/app/vault" : "#/pricing"}">
              <strong class="title-md">آرشیو متدولوژی ${pro ? "" : "🔒"}</strong>
              <span class="muted">${UI.fa(SJ.vaultModules().length)} ماژول و دوره تخصصی</span>
            </button>
          </div>
        </section>

        ${
          published
            ? `<section class="card stack">
                <div class="space-between">
                  <h2 class="title-md">جلسه منتشرشده امروز</h2>
                  <span class="badge badge-ok">منتشر شده</span>
                </div>
                <strong>${UI.escapeHtml(published.title)}</strong>
                <div class="workout-output">
                  ${published.sets
                    .map(
                      (s) => `<div class="workout-row"><span>${UI.escapeHtml(s.phase)}</span><span>${UI.escapeHtml(s.detail)}</span><span class="num">${UI.fa(s.meters)} م</span></div>`
                    )
                    .join("")}
                </div>
              </section>`
            : ""
        }
      </div>`;

    return UI.shell("#/app", body);
  }

  /* ---------- حضور و غیاب ---------- */

  function attendance() {
    const sheet = SJ.todaySheet();
    const counts = SJ.todayCounts();
    const pro = SJ.isPro();

    const roster = SJ.students()
      .map((student) => {
        const status = sheet.marks[student.id] || "";
        return `
        <div class="roster-item" data-status="${status}">
          <span class="avatar">${UI.escapeHtml(UI.initials(student.name))}</span>
          <div class="roster-name">
            ${UI.escapeHtml(student.name)}
            <div class="muted" style="font-size:.88rem">${UI.escapeHtml(student.group)} • ${UI.escapeHtml(student.level)} • نرخ حضور ${UI.fa(SJ.attendanceRate(student.id))}٪</div>
          </div>
          <div class="toggle-group">
            <button data-action="attendance:mark" data-id="${student.id}" data-value="present" aria-pressed="${status === "present"}">حاضر</button>
            <button data-action="attendance:mark" data-id="${student.id}" data-value="late" aria-pressed="${status === "late"}">تأخیر</button>
            <button data-action="attendance:mark" data-id="${student.id}" data-value="absent" aria-pressed="${status === "absent"}">غایب</button>
          </div>
        </div>`;
      })
      .join("");

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("حضور و غیاب هوشمند و ثبت وقایع", "ثبت سریع، تحلیل دقیق و ذخیره در پرونده شناگر.", "#/app")}

        <div class="grid">
          ${UI.kpi("حاضر", UI.fa(counts.present), "شناگر")}
          ${UI.kpi("تأخیر", UI.fa(counts.late), "شناگر")}
          ${UI.kpi("غایب", UI.fa(counts.absent), "شناگر", counts.absent ? "kpi-warn" : "")}
          ${UI.kpi("ثبت‌شده", `${UI.fa(counts.marked)} از ${UI.fa(counts.total)}`, TODAY_KEY)}
        </div>

        <div class="two-col">
          <section class="card stack">
            <div class="space-between">
              <h2 class="title-md">چک‌لیست امروز</h2>
              <div class="row">
                <button class="btn-solid btn-sm" data-action="attendance:all" data-value="present">تیک زدن همه به عنوان حاضر</button>
                <button class="btn-quiet" data-action="attendance:clear">پاک کردن</button>
              </div>
            </div>
            <div class="roster">${roster}</div>
          </section>

          <div class="stack">
            <section class="card stack">
              <h2 class="title-md">اسکن OCR برگه امروز ${pro ? "" : "🔒"}</h2>
              ${
                pro
                  ? `<div class="dropzone" id="att-drop">
                       <span style="font-size:2rem">🧾</span>
                       <strong>برگه حضور و غیاب را بکشید یا انتخاب کنید</strong>
                       <span class="muted" style="font-size:.9rem">تصویر یا PDF</span>
                       <input type="file" id="att-file" accept="image/*,.pdf" hidden />
                       <button class="btn-white btn-sm" data-action="attendance:pick">انتخاب فایل</button>
                     </div>
                     <div id="att-scan"></div>`
                  : `<p class="muted">اسکن خودکار برگه کاغذی و تطبیق نام‌ها با پرونده، از قابلیت‌های پلن مستری پرو است.</p>
                     <button class="btn-primary btn-sm" data-action="plan:upgrade">ارتقا به مستری پرو</button>`
              }
            </section>

            <section class="card stack">
              <h2 class="title-md">یادداشت‌های مربی</h2>
              <textarea id="att-notes" rows="4" placeholder="وقایع جلسه، مصدومیت، رفتار یا نکته فنی">${UI.escapeHtml(sheet.notes || "")}</textarea>
              <button class="btn-white btn-sm" data-action="attendance:save-notes">ذخیره یادداشت</button>
            </section>

            <section class="card stack">
              <h2 class="title-md">تحلیل با AI</h2>
              <button class="btn-primary btn-block" data-action="attendance:analyze" ${APP.ui.aiBusy ? "disabled" : ""}>
                ${APP.ui.aiBusy ? "در حال تحلیل…" : "تحلیل با AI و ثبت خودکار در پرونده شاگردان"}
              </button>
              ${
                sheet.analysis
                  ? `<div class="ai-box">
                      ${UI.progressBar(sheet.analysis.rate, "نرخ حضور امروز")}
                      <ul>${sheet.analysis.lines.map((l) => `<li>${UI.escapeHtml(l)}</li>`).join("")}</ul>
                     </div>`
                  : `<p class="muted">پس از ثبت وضعیت‌ها، تحلیل و پیام‌های پیشنهادی اولیا ساخته می‌شود.</p>`
              }
            </section>
          </div>
        </div>
      </div>`;

    return UI.shell("#/app/attendance", body);
  }

  /* ---------- شاگردان ---------- */

  function students() {
    const query = (APP.ui.studentQuery || "").trim();
    const groupFilter = APP.ui.studentGroup || "همه";
    const list = SJ.students().filter((s) => {
      const matchQuery = !query || s.name.includes(query);
      const matchGroup = groupFilter === "همه" || s.group === groupFilter;
      return matchQuery && matchGroup;
    });

    const rows = list
      .map((s) => {
        const balance = SJ.studentBalance(s.id);
        const best = s.times[s.times.length - 1];
        const points = AI.finaPoints(s.event, best);
        const rate = SJ.attendanceRate(s.id);
        return `
        <button class="student-row" data-action="go" data-hash="#/app/student/${s.id}">
          <span class="avatar">${UI.escapeHtml(UI.initials(s.name))}</span>
          <span class="student-identity">
            <strong>${UI.escapeHtml(s.name)}</strong>
            <span class="muted">${UI.escapeHtml(s.group)} • ${UI.escapeHtml(s.level)} • ${UI.escapeHtml(s.stroke)}</span>
          </span>
          <span class="student-metrics">
            <span class="student-metric"><span class="muted">رکورد</span><strong class="num">${UI.secs(best)}</strong></span>
            <span class="student-metric"><span class="muted">FINA</span><strong class="num">${points ? UI.fa(points) : "—"}</strong></span>
            <span class="student-metric"><span class="muted">حضور</span><strong class="num">${UI.fa(rate)}٪</strong></span>
          </span>
          <span class="badge ${balance.due === 0 ? "badge-ok" : "badge-warn"}">${balance.due === 0 ? "تسویه" : UI.millions(balance.due)}</span>
        </button>`;
      })
      .join("");

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle(
          `${UI.fa(SJ.students().length)} شناگر فعال ${UI.escapeHtml(SJ.coachName())}`,
          "رکوردها، ریت دست، حضور و وضعیت مالی در یک نما.",
          "#/app"
        )}
        <div class="card filters-bar">
          <input id="student-search" placeholder="جستجوی نام شاگرد" value="${UI.escapeHtml(query)}" />
          <select id="student-group">
            ${["همه", ...AGE_GROUPS]
              .map((g) => `<option ${g === groupFilter ? "selected" : ""}>${g}</option>`)
              .join("")}
          </select>
        </div>
        <div class="stack">${rows || '<p class="muted">شاگردی با این مشخصات پیدا نشد.</p>'}</div>
      </div>`;

    return UI.shell("#/app/students", body);
  }

  /* ---------- پرونده ۳۶۰ شناگر ---------- */

  function student360(id) {
    const student = SJ.studentById(id);
    if (!student) {
      return UI.shell("#/app/students", `<p class="muted">شاگرد پیدا نشد.</p>`);
    }
    const pro = SJ.isPro();
    const balance = SJ.studentBalance(student.id);
    const best = student.times[student.times.length - 1];
    const points = AI.finaPoints(student.event, best);
    const rate = SJ.attendanceRate(student.id);
    const samples = SJ.biomech(student.id);
    const analyzed = samples.map((s) => AI.analyzeSample({ distance: s.distance, time: s.time, strokes: s.strokes }));
    if (AIRemote.isEnabled() && !APP.ui.biomechAi[student.id]) {
      APP.ui.biomechAi[student.id] = { loading: true };
      AIRemote.biomechExplain(student).then((verdict) => {
        APP.ui.biomechAi[student.id] = verdict;
        APP.render();
      });
    }
    const cachedBio = APP.ui.biomechAi[student.id];
    const verdict = cachedBio && !cachedBio.loading ? cachedBio : AI.biomechVerdict(samples, student.stroke);
    const portalLink = `${window.location.origin}${window.location.pathname}#/s/${student.id}/${SJ.studentToken(student.id)}`;

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle(UI.escapeHtml(student.name), `${student.group} • ${student.level} • ${student.stroke} • ${UI.fa(student.age)} سال`, "#/app/students")}

        <div class="grid">
          ${UI.kpi("رکورد فعلی", `${UI.secs(best)} ثانیه`, student.event)}
          ${UI.kpi("امتیاز FINA", points ? UI.fa(points) : "—", "تخمینی بر پایه زمان پایه")}
          ${UI.kpi("نرخ حضور", `${UI.fa(rate)}٪`, `${UI.fa(Math.max(0, student.sessions - student.used))} جلسه باقیمانده`)}
          ${UI.kpi("وضعیت مالی", balance.due === 0 ? "تسویه شده" : UI.millions(balance.due), `شهریه ${UI.millions(student.fee)}`, balance.due ? "kpi-warn" : "")}
        </div>

        <section class="card stack">
          <h2 class="title-md">روند رکورد ${UI.escapeHtml(student.event)}</h2>
          ${UI.lineChart({ labels: CHART_MONTHS, values: student.times, betterIsLower: true, unit: "ثانیه" })}
        </section>

        <div class="two-col">
          <section class="card stack">
            <h2 class="title-md">آنالیز بیومکانیک ${pro ? "" : "🔒"}</h2>
            ${
              pro
                ? `${
                    analyzed.length
                      ? `<div class="grid">
                          ${UI.kpi("ریت دست", UI.fa(analyzed[analyzed.length - 1].rate), "دست‌کشی در دقیقه")}
                          ${UI.kpi("DPS", UI.secs(analyzed[analyzed.length - 1].dps, 2), "متر در هر دست")}
                          ${UI.kpi("سرعت", UI.secs(analyzed[analyzed.length - 1].velocity, 2), "متر بر ثانیه")}
                        </div>
                        <div class="ai-box">
                          <strong>${UI.escapeHtml(verdict.headline)}</strong>
                          <ul>${verdict.notes.map((n) => `<li>${UI.escapeHtml(n)}</li>`).join("")}</ul>
                        </div>`
                      : '<p class="muted">تستی ثبت نشده است.</p>'
                  }
                  <button class="btn-white btn-sm" data-action="go" data-hash="#/app/biomech">ثبت تست تازه</button>`
                : `<p class="muted">آنالیز ریت دست، DPS و امتیاز FINA در پلن مستری پرو فعال می‌شود.</p>
                   <button class="btn-primary btn-sm" data-action="plan:upgrade">ارتقا به مستری پرو</button>`
            }
          </section>

          <section class="card stack">
            <h2 class="title-md">اولیا و گزارش</h2>
            <p class="muted">${UI.escapeHtml(student.parent)} • ${UI.fa(student.parentPhone)}</p>
            <button class="btn-white btn-sm" data-action="report:preview" data-id="${student.id}">پیش‌نمایش کارنامه</button>
            ${
              pro
                ? `<div class="stack" style="gap:.4rem">
                    <span class="muted" style="font-size:.9rem">لینک اختصاصی پورتال اولیا</span>
                    <code class="code-box">${UI.escapeHtml(portalLink)}</code>
                    <div class="row">
                      <button class="btn-solid btn-sm" data-action="portal:open" data-id="${student.id}">باز کردن پورتال</button>
                      <button class="btn-white btn-sm" data-action="portal:copy" data-id="${student.id}">کپی لینک</button>
                    </div>
                   </div>`
                : `<p class="muted" style="font-size:.9rem">پورتال زنده اولیا با لینک اختصاصی، از قابلیت‌های مستری پرو است.</p>`
            }
          </section>
        </div>

        <div class="two-col">
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

          <section class="card stack">
            <h2 class="title-md">پرداخت‌ها</h2>
            <div class="stack">
              ${SJ.payments(student.id)
                .map(
                  (p) => `
                <div class="ledger-row">
                  <span>${UI.escapeHtml(p.date)}</span>
                  <span class="num">${UI.millions(p.amount)}</span>
                  <span class="badge ${p.source === "ocr" ? "badge-blue" : "badge-ok"}">${p.source === "ocr" ? "ثبت با OCR" : p.method}</span>
                </div>`
                )
                .join("") || '<p class="muted">پرداختی ثبت نشده است.</p>'}
            </div>
            <div class="row">
              <input id="pay-amount" inputmode="numeric" placeholder="مبلغ به تومان" style="flex:1" />
              <button class="btn-solid btn-sm" data-action="payment:add" data-id="${student.id}">ثبت پرداخت</button>
            </div>
          </section>
        </div>
      </div>`;

    return UI.shell("#/app/students", body);
  }

  /* ---------- تمرین‌نویسی ---------- */

  function workoutPage() {
    const pro = SJ.isPro();
    const tab = APP.ui.workoutTab || (pro ? "ai" : "manual");
    const preview = APP.ui.draftPreview;
    const drafts = SJ.workouts();

    const tabs = `
      <div class="tabs">
        ${pro ? `<button data-action="workout:tab" data-value="ai" ${tab === "ai" ? 'aria-current="page"' : ""}>تمرین‌نویسی با AI</button>` : ""}
        <button data-action="workout:tab" data-value="manual" ${tab === "manual" ? 'aria-current="page"' : ""}>طراح دستی</button>
        <button data-action="workout:tab" data-value="archive" ${tab === "archive" ? 'aria-current="page"' : ""}>آرشیو جلسات (${UI.fa(drafts.length)})</button>
      </div>`;

    let panel = "";
    if (tab === "ai") {
      panel = pro
        ? `
        <section class="card stack">
          <h2 class="title-md">درخواست جلسه با متن یا ویس</h2>
          <label class="field">
            <span>توضیح جلسه</span>
            <textarea id="ai-brief" rows="3" placeholder="${UI.escapeHtml(AI.voice.samples[0])}">${UI.escapeHtml(APP.ui.brief || "")}</textarea>
          </label>
          <div class="row">
            <button class="btn-primary" data-action="workout:generate" ${APP.ui.aiBusy ? "disabled" : ""}>
              ${APP.ui.aiBusy ? "در حال ساخت جلسه…" : "تولید جلسه با AI"}
            </button>
            <button class="btn-white" data-action="workout:voice" ${APP.ui.aiBusy ? "disabled" : ""}>🎙️ ضبط ویس</button>
            <button class="btn-quiet" data-action="workout:sample" ${APP.ui.aiBusy ? "disabled" : ""}>نمونه درخواست</button>
          </div>
          <p class="muted" style="font-size:.9rem">${AI.voice.available() ? "میکروفون مرورگر فعال است؛ فارسی صحبت کنید." : "مرورگر شما تبدیل گفتار به متن ندارد؛ با زدن دکمه ویس، یک نمونه شبیه‌سازی می‌شود."}</p>
        </section>
        ${preview ? reviewGate(preview) : ""}`
        : UI.gate(
            "تمرین‌نویسی هوشمند با متن و ویس",
            "جلسه چند هزار متری را با یک جمله بسازید و پیش از انتشار در دروازه بازبینی تأیید کنید."
          );
    } else if (tab === "manual") {
      panel = manualDesigner();
    } else {
      panel = archive(drafts);
    }

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle(
          "موتور تمرین‌نویسی",
          "کالیبره‌شده با استانداردهای اساتید شنا؛ خروجی با ست، استراحت و ریت هدف.",
          "#/app"
        )}
        ${tabs}
        ${panel}
      </div>`;

    return UI.shell("#/app/workout", body);
  }

  function reviewGate(workout) {
    return `
      <section class="card stack review-gate">
        <div class="space-between">
          <h2 class="title-md">دروازه بازبینی AI</h2>
          <span class="row" style="gap:.4rem">
            <span class="badge badge-light">${
              workout.engine === "ai" ? `مدل ${UI.escapeHtml(workout.model || "AI")}` : "موتور محلی"
            }</span>
            <span class="badge badge-warn">پیش‌نویس — نیاز به تأیید مربی</span>
          </span>
        </div>
        <div class="grid">
          ${UI.kpi("متراژ کل", `${UI.fa(workout.meters)} متر`, `${UI.fa(workout.laps)} طول استخر ${UI.fa(workout.poolLength)} متری`)}
          ${UI.kpi("ریت هدف", UI.fa(workout.rateTarget), "دست‌کشی در دقیقه")}
          ${UI.kpi("مدت جلسه", `${UI.fa(workout.minutes)} دقیقه`, workout.focus)}
        </div>
        <label class="field">
          <span>عنوان جلسه</span>
          <input id="draft-title" value="${UI.escapeHtml(workout.title)}" />
        </label>
        <div class="workout-output">
          ${workout.sets
            .map(
              (s, i) => `
            <div class="workout-row">
              <span><strong>${UI.escapeHtml(s.phase)}</strong><br /><span class="muted" style="font-size:.9rem">${UI.escapeHtml(s.note)}</span></span>
              <span>${UI.escapeHtml(s.detail)}</span>
              <span class="row" style="gap:.25rem">
                <span class="num">${UI.fa(s.meters)} م</span>
                <button class="btn-quiet" data-action="draft:remove-set" data-index="${i}">حذف</button>
              </span>
            </div>`
            )
            .join("")}
        </div>
        <div class="ai-box">💡 ${UI.escapeHtml(workout.coachTip)}</div>
        <div class="row">
          <button class="btn-primary" data-action="draft:approve">تأیید و انتشار برای شاگردان</button>
          <button class="btn-white" data-action="draft:save">ذخیره به‌عنوان پیش‌نویس</button>
          <button class="btn-quiet" data-action="draft:discard">انصراف</button>
        </div>
      </section>`;
  }

  function manualDesigner() {
    const manual = APP.ui.manual;
    const total = manual.sets.reduce((sum, s) => sum + s.reps * s.distance, 0);
    return `
      <section class="card stack">
        <h2 class="title-md">طراح تمرین دستی</h2>
        <label class="field">
          <span>عنوان جلسه</span>
          <input id="manual-title" value="${UI.escapeHtml(manual.title)}" />
        </label>
        <div class="stack">
          ${manual.sets
            .map(
              (s, i) => `
            <div class="manual-row">
              <span class="num">${UI.fa(s.reps)} × ${UI.fa(s.distance)} متر</span>
              <span>${UI.escapeHtml(s.stroke)}</span>
              <span class="muted">استراحت ${UI.fa(s.rest)} ثانیه</span>
              <span class="num">${UI.fa(s.reps * s.distance)} م</span>
              <button class="btn-quiet" data-action="manual:remove" data-index="${i}">حذف</button>
            </div>`
            )
            .join("") || '<p class="muted">هنوز ستی اضافه نشده است.</p>'}
        </div>
        <div class="divider"></div>
        <div class="manual-form">
          <label class="field"><span>تکرار</span><input id="m-reps" value="8" inputmode="numeric" /></label>
          <label class="field"><span>متراژ</span><input id="m-distance" value="50" inputmode="numeric" /></label>
          <label class="field">
            <span>شنا</span>
            <select id="m-stroke">${STROKES.map((s) => `<option>${s}</option>`).join("")}</select>
          </label>
          <label class="field"><span>استراحت (ثانیه)</span><input id="m-rest" value="20" inputmode="numeric" /></label>
          <button class="btn-white" data-action="manual:add">افزودن ست</button>
        </div>
        <div class="space-between">
          <strong class="title-md">متراژ کل: ${UI.fa(total)} متر</strong>
          <div class="row">
            <button class="btn-primary" data-action="manual:publish">انتشار جلسه</button>
            <button class="btn-quiet" data-action="manual:clear">پاک کردن همه</button>
          </div>
        </div>
      </section>`;
  }

  function archive(list) {
    if (!list.length) {
      return '<section class="card"><p class="muted">هنوز جلسه‌ای ساخته نشده است.</p></section>';
    }
    return `
      <div class="stack">
        ${list
          .map(
            (w) => `
          <section class="card stack">
            <div class="space-between">
              <div class="stack" style="gap:.2rem">
                <strong>${UI.escapeHtml(w.title)}</strong>
                <span class="muted" style="font-size:.9rem">${UI.escapeHtml(w.createdAt)} • ${UI.fa(w.meters)} متر • ${UI.escapeHtml(w.source === "manual" ? "طراحی دستی" : w.source === "ai-voice" ? "ویس + AI" : "متن + AI")}</span>
              </div>
              <span class="badge ${w.status === "published" ? "badge-ok" : "badge-warn"}">${w.status === "published" ? "منتشر شده" : "پیش‌نویس"}</span>
            </div>
            <div class="workout-output">
              ${w.sets
                .map((s) => `<div class="workout-row"><span>${UI.escapeHtml(s.phase)}</span><span>${UI.escapeHtml(s.detail)}</span><span class="num">${UI.fa(s.meters)} م</span></div>`)
                .join("")}
            </div>
            ${
              w.status !== "published"
                ? `<div class="row"><button class="btn-primary btn-sm" data-action="archive:publish" data-id="${w.id}">تأیید و انتشار</button></div>`
                : ""
            }
          </section>`
          )
          .join("")}
      </div>`;
  }

  /* ---------- جلسات گذشته ---------- */

  function sessionsPage() {
    const history = SJ.sessionHistory();
    const totalWorkouts = SJ.workouts().length;
    const publishedCount = SJ.workouts().filter((w) => w.status === "published").length;

    const cards = history
      .map((day) => {
        const c = day.counts;
        const statusLabel = day.isToday
          ? c.marked
            ? "امروز — در حال ثبت"
            : "امروز — هنوز ثبت نشده"
          : "برگزار شده";
        return `
        <section class="card stack session-card ${day.isToday ? "session-card-today" : ""}">
          <div class="space-between">
            <div class="stack" style="gap:.2rem">
              <strong>${UI.escapeHtml(day.date)}</strong>
              <span class="muted" style="font-size:.9rem">${statusLabel}</span>
            </div>
            <span class="badge ${day.isToday ? "badge-blue" : "badge-ok"}">${day.isToday ? "امروز" : "گذشته"}</span>
          </div>
          <div class="session-stats">
            <span>حاضر <strong class="num">${UI.fa(c.present)}</strong></span>
            <span>تأخیر <strong class="num">${UI.fa(c.late)}</strong></span>
            <span>غایب <strong class="num">${UI.fa(c.absent)}</strong></span>
            <span>ثبت <strong class="num">${UI.fa(c.marked)}/${UI.fa(c.total)}</strong></span>
          </div>
          ${c.notes ? `<p class="muted" style="font-size:.92rem">${UI.escapeHtml(c.notes)}</p>` : ""}
          ${
            day.workouts.length
              ? day.workouts
                  .map(
                    (w) => `
                <div class="session-workout">
                  <div class="space-between">
                    <strong>${UI.escapeHtml(w.title)}</strong>
                    <span class="badge ${w.status === "published" ? "badge-ok" : "badge-warn"}">${
                      w.status === "published" ? "منتشر شده" : "پیش‌نویس"
                    }</span>
                  </div>
                  <p class="muted" style="font-size:.9rem">${UI.fa(w.meters)} متر • ${UI.fa(w.minutes)} دقیقه • ${UI.escapeHtml(w.focus)}</p>
                  <div class="workout-output">
                    ${w.sets
                      .map(
                        (s) => `<div class="workout-row"><span>${UI.escapeHtml(s.phase)}</span><span>${UI.escapeHtml(s.detail)}</span><span class="num">${UI.fa(s.meters)} م</span></div>`
                      )
                      .join("")}
                  </div>
                </div>`
                  )
                  .join("")
              : '<p class="muted" style="font-size:.92rem">برای این روز جلسه‌ای ثبت نشده است.</p>'
          }
          ${
            day.isToday
              ? `<div class="row">
                  <button class="btn-white btn-sm" data-action="go" data-hash="#/app/attendance">حضور و غیاب امروز</button>
                  <button class="btn-primary btn-sm" data-action="go" data-hash="#/app/workout">ساخت جلسه تازه</button>
                </div>`
              : ""
          }
        </section>`;
      })
      .join("");

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("جلسات گذشته", "حضور هر روز و برنامه تمرینی همان جلسه.", "#/app")}
        <div class="grid">
          ${UI.kpi("کل جلسات", UI.fa(history.length), "روزهای تمرین ثبت‌شده")}
          ${UI.kpi("برنامه منتشرشده", UI.fa(publishedCount), "قابل مشاهده برای شاگردان")}
          ${UI.kpi("پیش‌نویس", UI.fa(Math.max(0, totalWorkouts - publishedCount)), "در انتظار تأیید")}
        </div>
        <div class="stack">${cards}</div>
      </div>`;

    return UI.shell("#/app/sessions", body);
  }

  /* ---------- آنالیز بیومکانیک ---------- */

  function biomechPage() {
    if (!SJ.isPro()) {
      return UI.shell(
        "#/app/biomech",
        `${UI.sectionTitle("آنالیز بیومکانیک و ریت دست", "", "#/app")}
         ${UI.gate("آنالیز ریت دست، DPS و امتیاز FINA", "تست‌های ۲۵ متری را وارد کنید و روند عددی سرعت، پیشروی با هر دست و امتیاز FINA را ببینید.")}`
      );
    }

    const studentId = APP.ui.biomechStudent || SJ.students()[0].id;
    const student = SJ.studentById(studentId);
    const samples = SJ.biomech(studentId);
    const analyzed = samples.map((s) => AI.analyzeSample({ distance: s.distance, time: s.time, strokes: s.strokes }));
    if (AIRemote.isEnabled() && !APP.ui.biomechAi[student.id]) {
      APP.ui.biomechAi[student.id] = { loading: true };
      AIRemote.biomechExplain(student).then((verdict) => {
        APP.ui.biomechAi[student.id] = verdict;
        APP.render();
      });
    }
    const cachedBio = APP.ui.biomechAi[student.id];
    const verdict = cachedBio && !cachedBio.loading ? cachedBio : AI.biomechVerdict(samples, student.stroke);
    const result = APP.ui.biomechResult;

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("آنالیز بیومکانیک، ریت دست و امتیاز FINA", "سنجش عددی جای حس و گمان؛ خروجی قابل نمایش به اولیا.", "#/app")}

        <section class="card stack">
          <div class="form-grid">
            <label class="field">
              <span>شاگرد</span>
              <select id="bio-student">
                ${SJ.students()
                  .map((s) => `<option value="${s.id}" ${Number(studentId) === s.id ? "selected" : ""}>${s.name}</option>`)
                  .join("")}
              </select>
            </label>
            <label class="field"><span>مسافت (متر)</span><input id="bio-distance" value="25" inputmode="decimal" /></label>
            <label class="field"><span>زمان (ثانیه)</span><input id="bio-time" value="16.2" inputmode="decimal" /></label>
            <label class="field"><span>تعداد دست‌کشی</span><input id="bio-strokes" value="20" inputmode="numeric" /></label>
          </div>
          <div class="row">
            <button class="btn-primary" data-action="bio:calc">محاسبه و تحلیل</button>
            <button class="btn-white" data-action="bio:save">ثبت در پرونده شاگرد</button>
          </div>
          ${
            result
              ? `<div class="grid">
                  ${UI.kpi("ریت دست", UI.fa(result.rate), "دست‌کشی در دقیقه")}
                  ${UI.kpi("DPS", UI.secs(result.dps, 2), "متر در هر دست")}
                  ${UI.kpi("سرعت", UI.secs(result.velocity, 2), "متر بر ثانیه")}
                  ${UI.kpi("شاخص بازده", UI.secs(result.index, 2), "سرعت × DPS")}
                 </div>`
              : ""
          }
        </section>

        <div class="two-col">
          <section class="card stack">
            <h2 class="title-md">روند ریت ${UI.escapeHtml(student.name)}</h2>
            ${
              analyzed.length > 1
                ? UI.lineChart({
                    labels: analyzed.map((_, i) => `تست ${UI.fa(i + 1)}`),
                    values: analyzed.map((s) => s.rate),
                    unit: "دست‌کشی",
                  })
                : '<p class="muted">برای نمودار، حداقل دو تست لازم است.</p>'
            }
          </section>
          <section class="card stack">
            <h2 class="title-md">تحلیل AI</h2>
            <div class="ai-box">
              <strong>${UI.escapeHtml(verdict.headline)}</strong>
              <ul>${verdict.notes.map((n) => `<li>${UI.escapeHtml(n)}</li>`).join("")}</ul>
            </div>
            <div class="row">
              <span class="badge badge-blue">امتیاز FINA رکورد فعلی: ${UI.fa(AI.finaPoints(student.event, student.times[student.times.length - 1]) || 0)}</span>
            </div>
          </section>
        </div>

        <section class="card stack">
          <h2 class="title-md">تست‌های ثبت‌شده</h2>
          <div class="stack">
            ${samples
              .map((s, i) => {
                const a = analyzed[i];
                return `<div class="ledger-row">
                  <span>${UI.escapeHtml(s.date)}</span>
                  <span class="num">${UI.fa(s.distance)} متر در ${UI.secs(s.time)} ثانیه</span>
                  <span class="num">${UI.fa(s.strokes)} دست</span>
                  <span class="num">ریت ${UI.fa(a.rate)}</span>
                  <span class="num">DPS ${UI.secs(a.dps, 2)}</span>
                </div>`;
              })
              .join("") || '<p class="muted">تستی ثبت نشده است.</p>'}
          </div>
        </section>
      </div>`;

    return UI.shell("#/app/biomech", body);
  }

  /* ---------- دستیار مالی ---------- */

  function financePage() {
    if (!SJ.isPro()) {
      return UI.shell(
        "#/app/finance",
        `${UI.sectionTitle("دستیار مالی و اسکن رسید", "", "#/app")}
         ${UI.gate("دستیار مالی با اسکن OCR رسید", "رسید کارت‌به‌کارت را آپلود کنید؛ مبلغ و نام واریزکننده خوانده و به پرونده شاگرد وصل می‌شود.")}`
      );
    }

    const summary = SJ.financeSummary();
    const ocr = APP.ui.ocrResult;
    const debtors = SJ.students()
      .map((s) => ({ s, balance: SJ.studentBalance(s.id) }))
      .filter((row) => row.balance.due > 0);

    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("دستیار مالی و شفافیت شهریه", "پایان نشتی مالی؛ هر رسید به پرونده شاگرد وصل می‌شود.", "#/app")}

        <div class="grid">
          ${UI.kpi("شهریه مورد انتظار", UI.millions(summary.expected), "مجموع این ماه")}
          ${UI.kpi("وصول‌شده", UI.millions(summary.collected), `${UI.fa(Math.round((summary.collected / summary.expected) * 100))}٪ محقق شده`)}
          ${UI.kpi("مانده", UI.millions(summary.due), `${UI.fa(summary.debtors)} شاگرد بدهکار`, summary.due ? "kpi-warn" : "")}
          ${UI.kpi("نرخ وصول", `${UI.fa(Math.round((summary.collected / summary.expected) * 100))}٪`, "هدف: بالای ۹۰٪")}
        </div>

        <div class="two-col">
          <section class="card stack">
            <h2 class="title-md">اسکن رسید با OCR</h2>
            <div class="dropzone" id="fin-drop">
              <span style="font-size:2rem">📄</span>
              <strong>رسید کارت‌به‌کارت را بکشید یا انتخاب کنید</strong>
              <input type="file" id="fin-file" accept="image/*,.pdf" hidden />
              <button class="btn-white btn-sm" data-action="finance:pick">انتخاب فایل رسید</button>
            </div>
            <div id="fin-scan"></div>
            ${
              ocr
                ? `<div class="ai-box stack">
                    <div class="space-between">
                      <strong>نتیجه خوانش</strong>
                      <span class="badge badge-blue">اطمینان ${UI.fa(ocr.confidence)}٪</span>
                    </div>
                    <div class="ledger-row"><span>شاگرد</span><strong>${UI.escapeHtml(ocr.studentName)}</strong></div>
                    <div class="ledger-row"><span>مبلغ</span><strong class="num">${UI.millions(ocr.amount)}</strong></div>
                    <div class="ledger-row"><span>تاریخ</span><span>${UI.escapeHtml(ocr.date)}</span></div>
                    <div class="ledger-row"><span>شناسه پیگیری</span><span>${UI.escapeHtml(ocr.refId)}</span></div>
                    <p class="muted" style="font-size:.9rem">${UI.escapeHtml(ocr.matchedBy)}</p>
                    <div class="row">
                      <button class="btn-primary btn-sm" data-action="finance:confirm">تأیید و ثبت در پرونده</button>
                      <button class="btn-quiet" data-action="finance:reject">رد کردن</button>
                    </div>
                   </div>`
                : ""
            }
          </section>

          <section class="card stack">
            <h2 class="title-md">بدهکاران و پیام یادآوری</h2>
            <div class="stack">
              ${debtors
                .map(
                  (row) => `
                <div class="ledger-row">
                  <span>${UI.escapeHtml(row.s.name)}</span>
                  <strong class="num">${UI.millions(row.balance.due)}</strong>
                  <button class="btn-white btn-sm" data-action="finance:remind" data-id="${row.s.id}">پیام یادآوری</button>
                </div>`
                )
                .join("") || '<p class="muted">همه شاگردان تسویه کرده‌اند.</p>'}
            </div>
          </section>
        </div>

        <section class="card stack">
          <h2 class="title-md">دفتر پرداخت‌ها</h2>
          <div class="stack">
            ${SJ.payments()
              .slice()
              .reverse()
              .map((p) => {
                const s = SJ.studentById(p.studentId);
                return `<div class="ledger-row">
                  <span>${UI.escapeHtml(p.date)}</span>
                  <span>${UI.escapeHtml(s ? s.name : "—")}</span>
                  <strong class="num">${UI.millions(p.amount)}</strong>
                  <span class="badge ${p.source === "ocr" ? "badge-blue" : "badge-ok"}">${p.source === "ocr" ? "OCR" : p.method}</span>
                </div>`;
              })
              .join("")}
          </div>
        </section>
      </div>`;

    return UI.shell("#/app/finance", body);
  }

  /* ---------- آرشیو متدولوژی ---------- */

  function vaultPage() {
    if (!SJ.isPro()) {
      return UI.shell(
        "#/app/vault",
        `${UI.sectionTitle("آرشیو متدولوژی جهانی", "", "#/app")}
         ${UI.gate("آرشیو متدولوژی و طرح‌درس سنین پایه", "بانک طرح‌درس ۴ تا ۱۳ سال، وبینارهای تحلیلی و ماژول‌های بیومکانیک.")}`
      );
    }

    const modules = SJ.vaultModules().filter((m) => m.published);
    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("پایگاه دانش متدولوژی جهانی", "ماژول‌های اختصاصی برای تصمیم دقیق‌تر کنار استخر.", "#/app")}
        <div class="grid">
          ${modules
            .map((m) => {
              const owned = m.priceToman === 0 || SJ.ownsModule(m.id);
              return `
              <div class="card stack">
                <div class="module-art" style="background:${m.art}">${m.icon}</div>
                <div class="space-between">
                  <strong class="title-md">${UI.escapeHtml(m.title)}</strong>
                  <span class="badge ${owned ? "badge-ok" : "badge-warn"}">${owned ? "در دسترس" : UI.millions(m.priceToman)}</span>
                </div>
                <span class="badge badge-blue">${UI.escapeHtml(m.kind)}</span>
                <p class="muted">${UI.escapeHtml(m.summary)}</p>
                ${
                  owned
                    ? `<button class="btn-white btn-sm" data-action="vault:open" data-id="${m.id}">مشاهده ${UI.fa(m.lessons.length)} درس</button>`
                    : `<button class="btn-primary btn-sm" data-action="vault:buy" data-id="${m.id}">خرید و افزودن به کتابخانه</button>`
                }
              </div>`;
            })
            .join("")}
        </div>
      </div>`;

    return UI.shell("#/app/vault", body);
  }

  /* ---------- حساب مربی ---------- */

  function profilePage() {
    const coach = SJ.raw.coach;
    const pro = SJ.isPro();
    const body = `
      <div class="stack-lg">
        ${UI.sectionTitle("حساب من", "اطلاعات مربی، پلن و مدیریت داده‌های دمو.", "#/app")}
        ${UI.aiStatusCard()}
        <div class="two-col">
          <section class="card stack">
            <div class="row">
              <span class="avatar" style="width:58px;height:58px;font-size:1.2rem">${UI.escapeHtml(UI.initials(SJ.coachName()))}</span>
              <div class="stack" style="gap:.2rem">
                <strong class="title-md">${UI.escapeHtml(SJ.coachName())}</strong>
                <span class="muted">${UI.fa(coach.phone)}</span>
              </div>
            </div>
            <span class="badge badge-blue">${UI.escapeHtml(coach.credential)}</span>
            <div class="ledger-row"><span>${PLATFORM.designerRole}</span><span>${PLATFORM.designer}</span></div>
            <div class="ledger-row"><span>استخر</span><span>${UI.escapeHtml(coach.pool)}</span></div>
            <div class="ledger-row"><span>عضویت از</span><span>${UI.escapeHtml(coach.since)}</span></div>
            <div class="ledger-row"><span>شاگردان</span><span class="num">${UI.fa(SJ.students().length)}</span></div>
          </section>

          <section class="card stack">
            <h2 class="title-md">اشتراک</h2>
            <strong class="title-md" style="color:#0a84ff">${pro ? PLANS.pro.title : PLANS.essential.title}</strong>
            <span class="muted">${pro ? PLANS.pro.priceLabel : PLANS.essential.priceLabel}</span>
            <div class="row">
              ${
                pro
                  ? `<button class="btn-white btn-sm" data-action="plan:choose" data-plan="essential">تغییر به اسنشیال</button>`
                  : `<button class="btn-primary btn-sm" data-action="plan:upgrade">ارتقا به مستری پرو</button>`
              }
              <button class="btn-quiet" data-action="go" data-hash="#/pricing">مقایسه پلن‌ها</button>
            </div>
            <div class="divider"></div>
            <h2 class="title-md">داده‌های دمو</h2>
            <p class="muted" style="font-size:.92rem">همه اطلاعات روی همین مرورگر ذخیره می‌شود.</p>
            <div class="row">
              <button class="btn-white btn-sm" data-action="demo:reset">بازنشانی داده‌های دمو</button>
              <button class="btn-quiet" data-action="auth:logout">خروج از حساب</button>
            </div>
          </section>
        </div>
      </div>`;

    return UI.shell("#/app/profile", body);
  }

  return {
    cockpit,
    attendance,
    students,
    student360,
    workoutPage,
    sessionsPage,
    biomechPage,
    financePage,
    vaultPage,
    profilePage,
  };
})();
