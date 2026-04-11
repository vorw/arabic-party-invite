const config = {
  title: "دعوة عشاء",
  welcome: "يسعدنا دعوتك إلى عشاء يوم الجمعة 17 أبريل 2026.",
  note: "نرجو تأكيد حضورك من خلال اختيار أحد الخيارين أدناه.",
  eventLabel: "عشاء الجمعة · 17 أبريل 2026",
  submitEndpoint: "https://script.google.com/macros/s/AKfycbzRsSCOH88WE2g4KaX8wIH56eB_r-moDgE0RFTE24RqDcbgjpj2Y-5Ki4fH-RHDxnzNVg/exec"
};

const STORAGE_KEY = "invite-rsvp-draft";

const state = {
  name: new URLSearchParams(window.location.search).get("name") || "",
  message: "",
  messageType: "idle"
};

const root = document.getElementById("app");

loadDraft();
render();
attachEvents();

function attachEvents() {
  root.addEventListener("input", (event) => {
    const { target } = event;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.name === "guestName") {
      state.name = target.value;
      saveDraft();
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-response]");
    if (!button) {
      return;
    }

    submitResponse(button.dataset.response);
  });
}

function render() {
  root.innerHTML = `
    <section class="page-shell">
      <article class="invite-panel">
        <p class="eyebrow">أهلاً وسهلاً</p>
        <h1>${escapeHtml(config.title)}</h1>
        <p class="welcome">${escapeHtml(config.welcome)}</p>
        <p class="event-label">${escapeHtml(config.eventLabel)}</p>
        <p class="note">${escapeHtml(config.note)}</p>

        <form id="rsvpForm" action="${escapeAttribute(config.submitEndpoint)}" method="POST" target="submitFrame">
          <label class="field" for="guestName">
            <span>الاسم</span>
            <input id="guestName" name="name" type="text" placeholder="اكتب اسمك هنا" value="${escapeAttribute(state.name)}">
          </label>

          <input type="hidden" id="responseField" name="response" value="">
          <input type="hidden" name="event" value="${escapeAttribute(config.eventLabel)}">
          <input type="hidden" id="submittedAtField" name="submittedAt" value="">

          <div class="actions">
            <button class="button accept" type="button" data-response="accepted">سأحضر</button>
            <button class="button decline" type="button" data-response="declined">لن أستطيع الحضور</button>
          </div>
        </form>

        <iframe name="submitFrame" class="submit-frame" title="submit target"></iframe>

        <p class="status ${state.messageType}">${escapeHtml(state.message || "")}</p>
      </article>
    </section>
  `;
}

function submitResponse(response) {
  const guestName = state.name.trim();

  if (!guestName) {
    setMessage("الرجاء كتابة الاسم أولاً.", "error");
    render();
    return;
  }

  if (!config.submitEndpoint || config.submitEndpoint.includes("PASTE_GOOGLE_APPS_SCRIPT")) {
    setMessage("رابط Google Sheets غير مضاف بعد.", "error");
    render();
    return;
  }

  const form = document.getElementById("rsvpForm");
  const responseField = document.getElementById("responseField");
  const submittedAtField = document.getElementById("submittedAtField");

  responseField.value = response;
  submittedAtField.value = new Date().toISOString();

  form.submit();
  clearDraft();
  setMessage(response === "accepted" ? "تم تسجيل حضورك بنجاح." : "تم تسجيل اعتذارك بنجاح.", "success");
  render();
}

function setMessage(message, type) {
  state.message = message;
  state.messageType = type;
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: state.name }));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const draft = JSON.parse(raw);
    state.name = state.name || draft.name || "";
  } catch {
    state.name = state.name || "";
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
