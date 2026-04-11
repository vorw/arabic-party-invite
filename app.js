const config = {
  logoSrc: "./assets/logo.png?v=9",
  title: "دعوة عشاء",
  welcome: "يسعدنا دعوتك إلى عشاء يوم الجمعة 17 أبريل 2026.",
  note: "نرجو تأكيد حضورك من خلال اختيار أحد الخيارين أدناه.",
  locationTitle: "الموقع",
  locationLabel: "بيت أم عبد الملك",
  locationHint: "اضغط لفتح الموقع في خرائط Google",
  locationImageSrc: "./assets/location-photo.jpg?v=11",
  locationMapsUrl: "https://maps.app.goo.gl/h6NaD2L5EMpfTBD8A",
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

    if (target.name === "name") {
      state.name = target.value;
      saveDraft();
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-response]");
    if (!button) {
      return;
    }

    submitResponse(button.dataset.response, button, event);
  });
}

function render() {
  root.innerHTML = `
    <section class="page-shell">
      <div class="ambient ambient-a" aria-hidden="true"></div>
      <div class="ambient ambient-b" aria-hidden="true"></div>
      <div class="ambient ambient-c" aria-hidden="true"></div>
      <article class="invite-panel">
        <div class="panel-ornament" aria-hidden="true"></div>
        <p class="eyebrow">دعوة خاصة</p>
        <h1>${escapeHtml(config.title)}</h1>
        <p class="welcome">${escapeHtml(config.welcome)}</p>
        <p class="note">${escapeHtml(config.note)}</p>

        <a
          class="location-card ${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? "disabled" : ""}"
          href="${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? "#" : escapeAttribute(config.locationMapsUrl)}"
          target="_blank"
          rel="noopener"
          ${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? 'aria-disabled="true"' : ""}
        >
          <div class="location-preview" style="background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0)), url('${escapeAttribute(config.locationImageSrc)}');" aria-hidden="true">
            <span class="location-pin"></span>
          </div>
          <div class="location-copy">
            <span class="location-kicker">${escapeHtml(config.locationTitle)}</span>
            <strong>${escapeHtml(config.locationLabel)}</strong>
            <span>${escapeHtml(config.locationHint)}</span>
          </div>
        </a>

        <form id="rsvpForm" action="${escapeAttribute(config.submitEndpoint)}" method="POST" target="submitFrame">
          <label class="field" for="guestName">
            <span>الاسم</span>
            <input id="guestName" name="name" type="text" placeholder="اكتب اسمك هنا" value="${escapeAttribute(state.name)}">
          </label>

          <input type="hidden" id="responseField" name="response" value="">
          <input type="hidden" name="event" value="${escapeAttribute(config.welcome)}">
          <input type="hidden" id="submittedAtField" name="submittedAt" value="">

          <div class="actions">
            <button class="button accept" type="button" data-response="accepted">سأحضر</button>
            <button class="button decline" type="button" data-response="declined">لن أستطيع الحضور</button>
          </div>
        </form>

        <iframe name="submitFrame" class="submit-frame" title="submit target"></iframe>

        <p class="status ${state.messageType}">${escapeHtml(state.message || "")}</p>
      </article>
      <div class="confetti-layer" aria-hidden="true"></div>
    </section>
  `;
}

function submitResponse(response, button, event) {
  const guestName = state.name.trim();

  if (!guestName) {
    setMessage("الرجاء كتابة الاسم أولاً.", "error");
    syncStatus();
    return;
  }

  if (!config.submitEndpoint || config.submitEndpoint.includes("PASTE_GOOGLE_APPS_SCRIPT")) {
    setMessage("رابط Google Sheets غير مضاف بعد.", "error");
    syncStatus();
    return;
  }

  const form = document.getElementById("rsvpForm");
  const responseField = document.getElementById("responseField");
  const submittedAtField = document.getElementById("submittedAtField");

  responseField.value = response;
  submittedAtField.value = new Date().toISOString();

  clearDraft();
  setMessage(response === "accepted" ? "تم تسجيل حضورك بنجاح." : "تم تسجيل اعتذارك بنجاح.", "success");
  syncStatus();

  if (response === "accepted") {
    burstConfetti(button, event);
  } else {
    burstDecline(button, event);
  }

  window.setTimeout(() => {
    form.submit();
  }, response === "accepted" ? 320 : 220);
}

function setMessage(message, type) {
  state.message = message;
  state.messageType = type;
}

function syncStatus() {
  const status = root.querySelector(".status");
  if (!status) {
    return;
  }

  status.className = `status ${state.messageType}`;
  status.textContent = state.message || "";
}

function burstConfetti(button, event) {
  const layer = root.querySelector(".confetti-layer");
  if (!layer) {
    return;
  }

  const sourceX = typeof event?.clientX === "number"
    ? event.clientX
    : button.getBoundingClientRect().left + button.offsetWidth / 2;
  const sourceY = typeof event?.clientY === "number"
    ? event.clientY
    : button.getBoundingClientRect().top + button.offsetHeight / 2;

  const colors = ["#ff6b6b", "#ffd166", "#4ecdc4", "#7b61ff", "#ff8fab", "#8bd3ff", "#f7b267"];

  for (let index = 0; index < 32; index += 1) {
    const piece = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 32;
    const distance = 90 + Math.random() * 120;
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance - (60 + Math.random() * 90);

    piece.className = "confetti-piece";
    piece.style.left = `${sourceX}px`;
    piece.style.top = `${sourceY}px`;
    piece.style.setProperty("--dx", `${driftX}px`);
    piece.style.setProperty("--dy", `${driftY}px`);
    piece.style.setProperty("--rot", `${-240 + Math.random() * 480}deg`);
    piece.style.background = colors[index % colors.length];
    piece.style.width = `${8 + Math.random() * 6}px`;
    piece.style.height = `${10 + Math.random() * 8}px`;
    layer.appendChild(piece);

    window.setTimeout(() => {
      piece.remove();
    }, 1400);
  }

  const burst = document.createElement("span");
  burst.className = "confetti-burst";
  burst.style.left = `${sourceX}px`;
  burst.style.top = `${sourceY}px`;
  layer.appendChild(burst);

  window.setTimeout(() => {
    burst.remove();
  }, 700);
}

function burstDecline(button, event) {
  const layer = root.querySelector(".confetti-layer");
  if (!layer) {
    return;
  }

  const sourceX = typeof event?.clientX === "number"
    ? event.clientX
    : button.getBoundingClientRect().left + button.offsetWidth / 2;
  const sourceY = typeof event?.clientY === "number"
    ? event.clientY
    : button.getBoundingClientRect().top + button.offsetHeight / 2;

  for (let index = 0; index < 16; index += 1) {
    const spark = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 16;
    const distance = 28 + Math.random() * 42;
    spark.className = "decline-spark";
    spark.style.left = `${sourceX}px`;
    spark.style.top = `${sourceY}px`;
    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    spark.style.setProperty("--rot", `${-120 + Math.random() * 240}deg`);
    layer.appendChild(spark);

    window.setTimeout(() => {
      spark.remove();
    }, 850);
  }

  const ripple = document.createElement("span");
  ripple.className = "decline-ripple";
  ripple.style.left = `${sourceX}px`;
  ripple.style.top = `${sourceY}px`;
  layer.appendChild(ripple);

  window.setTimeout(() => {
    ripple.remove();
  }, 700);
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
