const eventConfig = {
  title: "دعوة عشاء",
  subtitle: "يسعدنا حضورك مساء الجمعة 17 أبريل 2026.",
  details: "أهلاً بك، نتشرف بدعوتك إلى عشاء خاص مساء الجمعة.",
  gregorianDate: "17 April 2026",
  whatsappNumber: "966500000000"
};

const STORAGE_KEY = "party-invite-response";

const state = {
  invitee: new URLSearchParams(window.location.search).get("name") || "",
  response: loadSavedResponse()
};

const root = document.getElementById("app");

render();
attachEvents();

function attachEvents() {
  root.addEventListener("input", (event) => {
    const { target } = event;
    if (target instanceof HTMLInputElement && target.name === "invitee") {
      state.invitee = target.value;
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "respond") {
      submitResponse(button.dataset.value);
    }
  });
}

function render() {
  root.innerHTML = `
    <main class="page-shell">
      <section class="invite-card">
        <p class="eyebrow">بطاقة دعوة</p>
        <h1>${escapeHtml(eventConfig.title)}</h1>
        <p class="lede">${escapeHtml(eventConfig.details)}</p>
        <p class="date-line">${escapeHtml(toArabicDate(eventConfig.gregorianDate))}</p>

        <label class="field">
          <span>الاسم</span>
          <input type="text" name="invitee" placeholder="اكتب اسمك" value="${escapeAttribute(state.invitee)}">
        </label>

        <div class="actions">
          <button type="button" class="button primary" data-action="respond" data-value="accept">أوافق</button>
          <button type="button" class="button ghost" data-action="respond" data-value="decline">أعتذر</button>
        </div>

        <p class="status">${state.response ? escapeHtml(state.response.summary) : escapeHtml(eventConfig.subtitle)}</p>
      </section>
    </main>
  `;
}

function submitResponse(value) {
  const responseLabel = value === "accept" ? "أوافق على الحضور" : "أعتذر عن الحضور";
  const invitee = state.invitee.trim() || "ضيف من رابط الدعوة";
  const lines = [
    "السلام عليكم،",
    `الرد: ${responseLabel}`,
    `الاسم: ${invitee}`,
    "المناسبة: دعوة عشاء يوم الجمعة 17 أبريل 2026"
  ];

  state.response = { type: value, summary: `${responseLabel} · ${invitee}` };
  persistResponse();
  render();

  const message = encodeURIComponent(lines.join("\n"));
  window.open(`https://wa.me/${eventConfig.whatsappNumber}?text=${message}`, "_blank", "noopener");
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

function toArabicDate(value) {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
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
