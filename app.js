const config = {
  title: "دعوة عشاء",
  welcome: "يسعدنا دعوتك إلى عشاء يوم الجمعة 17 أبريل 2026.",
  note: "نرجو تأكيد حضورك من خلال اختيار أحد الخيارين أدناه.",
  eventLabel: "عشاء الجمعة · 17 أبريل 2026",
  submitEndpoint: "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
};

const STORAGE_KEY = "invite-rsvp-draft";

const state = {
  name: new URLSearchParams(window.location.search).get("name") || "",
  loading: false,
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

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-response]");
    if (!button || state.loading) {
      return;
    }

    await submitResponse(button.dataset.response);
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

        <label class="field" for="guestName">
          <span>الاسم</span>
          <input id="guestName" name="guestName" type="text" placeholder="اكتب اسمك هنا" value="${escapeAttribute(state.name)}" ${state.loading ? "disabled" : ""}>
        </label>

        <div class="actions">
          <button class="button accept" type="button" data-response="accepted" ${state.loading ? "disabled" : ""}>سأحضر</button>
          <button class="button decline" type="button" data-response="declined" ${state.loading ? "disabled" : ""}>لن أستطيع الحضور</button>
        </div>

        <p class="status ${state.messageType}">${escapeHtml(state.message || "")}</p>
      </article>
    </section>
  `;
}

async function submitResponse(response) {
  const guestName = state.name.trim();

  if (!guestName) {
    setMessage("الرجاء كتابة الاسم أولاً.", "error");
    return;
  }

  if (!config.submitEndpoint || config.submitEndpoint.includes("PASTE_GOOGLE_APPS_SCRIPT")) {
    setMessage("رابط Google Sheets غير مضاف بعد.", "error");
    return;
  }

  state.loading = true;
  setMessage("جارٍ إرسال الرد...", "pending");
  render();

  try {
    const payload = {
      name: guestName,
      response,
      event: config.eventLabel,
      submittedAt: new Date().toISOString()
    };

    const result = await fetch(config.submitEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      mode: "cors",
      body: JSON.stringify(payload)
    });

    if (!result.ok) {
      throw new Error("تعذر حفظ الرد الآن.");
    }

    clearDraft();
    setMessage(response === "accepted" ? "تم تسجيل حضورك بنجاح." : "تم تسجيل اعتذارك بنجاح.", "success");
  } catch (error) {
    setMessage(error.message || "تعذر إرسال الرد الآن.", "error");
  } finally {
    state.loading = false;
    render();
  }
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
