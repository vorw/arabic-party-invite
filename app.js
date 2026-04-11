const eventConfig = {
  title: "ليلة احتفال خاصة",
  subtitle: "دعوة مخصصة لأصدقائنا وأعضاء القائمة الخاصة",
  host: "فريق المناسبة",
  hijriDate: "السبت 25 ذو القعدة 1447",
  gregorianDate: "11 April 2026",
  time: "8:30 مساءً",
  venue: "الرياض · سيتم إرسال الموقع النهائي بعد تأكيد الحضور",
  note: "الدعوة شخصية، والرد المطلوب قبل موعد المناسبة بيومين.",
  attire: "أنيق وبسيط",
  guestsLabel: "يمكنك تأكيد حضورك لك ولشخص مرافق واحد فقط عند الحاجة.",
  whatsappNumber: "966500000000"
};

const STORAGE_KEY = "party-invite-response";

const state = {
  invitee: new URLSearchParams(window.location.search).get("name") || "",
  guests: "1",
  note: "",
  response: loadSavedResponse(),
  copied: false
};

const root = document.getElementById("app");

render();
attachEvents();

function attachEvents() {
  root.addEventListener("input", (event) => {
    const { target } = event;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.name === "invitee") {
      state.invitee = target.value;
    }

    if (target.name === "guests") {
      state.guests = target.value;
    }

    if (target.name === "note") {
      state.note = target.value;
    }
  });

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const { action, value } = button.dataset;

    if (action === "respond") {
      submitResponse(value);
      return;
    }

    if (action === "copy-link") {
      await copyLink();
    }
  });
}

function render() {
  const countdown = formatCountdown(eventConfig.gregorianDate, eventConfig.time);

  root.innerHTML = `
    <div class="page-shell">
      <section class="hero">
        <div class="hero-backdrop"></div>
        <div class="hero-copy">
          <p class="eyebrow">بطاقة دعوة رقمية</p>
          <h1>${escapeHtml(eventConfig.title)}</h1>
          <p class="lede">${escapeHtml(eventConfig.subtitle)}</p>
          <div class="hero-meta">
            <div>
              <span class="meta-label">التاريخ</span>
              <strong>${escapeHtml(eventConfig.hijriDate)}</strong>
              <span>${escapeHtml(toArabicDate(eventConfig.gregorianDate))}</span>
            </div>
            <div>
              <span class="meta-label">الوقت</span>
              <strong>${escapeHtml(eventConfig.time)}</strong>
              <span>${escapeHtml(countdown)}</span>
            </div>
            <div>
              <span class="meta-label">المضيف</span>
              <strong>${escapeHtml(eventConfig.host)}</strong>
              <span>${escapeHtml(eventConfig.attire)}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="details">
        <div class="section-head">
          <p class="eyebrow">تفاصيل المناسبة</p>
          <h2>لقاء هادئ بلمسة رسمية</h2>
        </div>
        <div class="details-grid">
          <article>
            <span class="detail-label">المكان</span>
            <p>${escapeHtml(eventConfig.venue)}</p>
          </article>
          <article>
            <span class="detail-label">تنسيق الحضور</span>
            <p>${escapeHtml(eventConfig.guestsLabel)}</p>
          </article>
          <article>
            <span class="detail-label">ملاحظة</span>
            <p>${escapeHtml(eventConfig.note)}</p>
          </article>
        </div>
      </section>

      <section class="rsvp">
        <div class="section-head">
          <p class="eyebrow">تأكيد الحضور</p>
          <h2>اختر الرد المناسب وسيُفتح واتساب مباشرة</h2>
        </div>
        <form class="rsvp-form" onsubmit="return false;">
          <label>
            <span>الاسم</span>
            <input type="text" name="invitee" placeholder="اكتب اسمك" value="${escapeAttribute(state.invitee)}">
          </label>

          <label>
            <span>عدد الحضور</span>
            <input type="number" name="guests" min="1" max="2" value="${escapeAttribute(state.guests)}">
          </label>

          <label>
            <span>ملاحظة إضافية</span>
            <textarea name="note" rows="4" placeholder="مثال: سأصل متأخرًا قليلًا">${escapeHtml(state.note)}</textarea>
          </label>

          <div class="actions">
            <button type="button" class="button primary" data-action="respond" data-value="accept">أستطيع الحضور</button>
            <button type="button" class="button ghost" data-action="respond" data-value="decline">أعتذر عن الحضور</button>
          </div>
        </form>

        <div class="response-panel ${state.response ? "is-visible" : ""}">
          <span class="detail-label">آخر رد تم اختياره</span>
          <p>${state.response ? escapeHtml(state.response.summary) : "لم يتم إرسال رد بعد."}</p>
        </div>
      </section>

      <section class="share-strip">
        <div>
          <p class="eyebrow">مشاركة الرابط</p>
          <h2>يمكنك نسخ رابط البطاقة وإرساله مباشرة في واتساب</h2>
        </div>
        <button type="button" class="button secondary" data-action="copy-link">${state.copied ? "تم نسخ الرابط" : "نسخ الرابط"}</button>
      </section>
    </div>
  `;
}

function submitResponse(value) {
  const responseLabel = value === "accept" ? "أستطيع الحضور" : "أعتذر عن الحضور";
  const invitee = state.invitee.trim() || "ضيف من رابط الدعوة";
  const guestCount = normalizeGuestCount(state.guests);
  const note = state.note.trim();
  const lines = [
    "السلام عليكم،",
    `ردي على الدعوة: ${responseLabel}`,
    `الاسم: ${invitee}`,
    `عدد الحضور: ${guestCount}`
  ];

  if (note) {
    lines.push(`ملاحظة: ${note}`);
  }

  lines.push(`رابط البطاقة: ${window.location.href}`);

  const summary = `${responseLabel} · ${invitee}`;
  state.response = { type: value, summary };
  persistResponse();
  render();

  const message = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/${eventConfig.whatsappNumber}?text=${message}`, "_blank", "noopener");
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    state.copied = true;
    render();
    window.setTimeout(() => {
      state.copied = false;
      render();
    }, 1600);
  } catch {
    state.copied = false;
  }
}

function normalizeGuestCount(value) {
  const number = Math.max(1, Math.min(2, Number.parseInt(value, 10) || 1));
  return String(number);
}

function loadSavedResponse() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistResponse() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.response));
}

function formatCountdown(dateText, timeText) {
  const date = new Date(`${dateText} ${normalizeArabicTime(timeText)}`);
  if (Number.isNaN(date.getTime())) {
    return "بانتظار تحديث الموعد";
  }

  const diff = date.getTime() - Date.now();
  if (diff <= 0) {
    return "الموعد اليوم";
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `بعد ${days} يوم${days > 1 ? "ًا" : ""} و${hours} ساعة`;
  }

  return `بعد ${hours} ساعة`;
}

function normalizeArabicTime(value) {
  return value
    .replace("صباحًا", "AM")
    .replace("مساءً", "PM")
    .replace("ص", "AM")
    .replace("م", "PM");
}

function toArabicDate(value) {
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
