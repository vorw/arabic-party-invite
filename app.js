const config = {
  logoSrc: "./assets/logo.png?v=9",
  title: "أمسية جيران اليرموك",
  welcome: "",
  note: "",
  locationTitle: "الموقع",
  locationLabel: "",
  locationHint: "",
  locationImageSrc: "./assets/location-photo.jpg?v=14",
  locationMapsUrl: "‏https://maps.app.goo.gl/p2VdWpQdq9PsZ8RKA?g_st=iw",
  submitEndpoint: "https://script.google.com/macros/s/AKfycbzRsSCOH88WE2g4KaX8wIH56eB_r-moDgE0RFTE24RqDcbgjpj2Y-5Ki4fH-RHDxnzNVg/exec"
};

const STORAGE_KEY = "invite-rsvp-draft";
const DECISION_KEY = "invite-rsvp-decision";

const state = {
  name: new URLSearchParams(window.location.search).get("name") || "",
  selectedResponse: "",
  message: "",
  messageType: "idle",
  lockedResponse: "",
  showConfirm: false,
  pendingResponse: ""
};

const root = document.getElementById("app");

loadDraft();
loadDecision();
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
    const confirmButton = event.target.closest("[data-confirm-response]");
    if (confirmButton) {
      confirmDecision(confirmButton.dataset.confirmResponse, event);
      return;
    }

    const cancelButton = event.target.closest("[data-confirm-cancel]");
    if (cancelButton) {
      state.showConfirm = false;
      state.pendingResponse = "";
      render();
      return;
    }

    const button = event.target.closest("[data-response]");
    if (!button) {
      return;
    }

    openConfirmation(button.dataset.response);
  });
}

function render() {
  const hasAccepted = state.lockedResponse === "accepted";
  const isLocked = Boolean(state.lockedResponse);
  const displayResponse = state.lockedResponse || state.selectedResponse;

  root.innerHTML = `
    <section class="page-shell">
      <div class="ambient ambient-a" aria-hidden="true"></div>
      <div class="ambient ambient-b" aria-hidden="true"></div>
      <div class="ambient ambient-c" aria-hidden="true"></div>
      <article class="invite-panel">
        <div class="panel-ornament" aria-hidden="true"></div>
        <p class="eyebrow">دعوة خاصة</p>
        <h1>${escapeHtml(config.title)}</h1>
        <p class="note">${escapeHtml(config.note)}</p>

        ${hasAccepted ? `
        <a
          class="location-card ${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? "disabled" : ""}"
          href="${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? "#" : escapeAttribute(config.locationMapsUrl)}"
          target="_blank"
          rel="noopener"
          ${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? 'aria-disabled="true"' : ""}
        >
          <div class="location-preview" style="background-image: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0)), url('${escapeAttribute(config.locationImageSrc)}');" aria-hidden="true"></div>
          <div class="location-copy">
            <span class="location-kicker">${escapeHtml(config.locationTitle)}</span>
            <strong>${escapeHtml(config.locationLabel)}</strong>
            <span>${escapeHtml(config.locationHint)}</span>
          </div>
        </a>
        ` : ""}

        <form id="rsvpForm" action="${escapeAttribute(config.submitEndpoint)}" method="POST" target="submitFrame">
          <label class="field" for="guestName">
            <span>الاسم</span>
            <input id="guestName" name="name" type="text" placeholder="اكتب اسمك هنا" value="${escapeAttribute(state.name)}" ${isLocked ? "disabled" : ""}>
          </label>

          <input type="hidden" id="responseField" name="response" value="">
          <input type="hidden" name="event" value="${escapeAttribute(config.title)}">
          <input type="hidden" id="submittedAtField" name="submittedAt" value="">

          <div class="actions">
            <button class="button ${displayResponse === "accepted" ? "is-selected" : ""}" type="button" data-response="accepted" ${isLocked ? "disabled" : ""}>سأحضر</button>
            <button class="button ${displayResponse === "declined" ? "is-selected" : ""}" type="button" data-response="declined" ${isLocked ? "disabled" : ""}>لن أستطيع الحضور</button>
          </div>
        </form>

        <iframe name="submitFrame" class="submit-frame" title="submit target"></iframe>

        <p class="status ${state.messageType}">${escapeHtml(state.message || "")}</p>
      </article>
      ${state.showConfirm ? renderConfirmation() : ""}
      <div class="confetti-layer" aria-hidden="true"></div>
    </section>
  `;
}

function renderConfirmation() {
  const isAccept = state.pendingResponse === "accepted";
  const title = isAccept ? "تأكيد الحضور" : "تأكيد الاعتذار";
  const text = isAccept
    ? "سيتم اعتماد حضورك نهائيًا وإظهار تفاصيل الموقع بعد التأكيد."
    : "سيتم اعتماد اعتذارك نهائيًا ولن تتمكن من تعديل القرار لاحقًا.";
  const confirmLabel = isAccept ? "تأكيد الحضور" : "تأكيد الاعتذار";

  return `
    <div class="confirm-overlay" aria-hidden="true"></div>
    <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <p class="confirm-kicker">تأكيد نهائي</p>
      <h2 id="confirmTitle">${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
      <div class="confirm-actions">
        <button class="button confirm-button is-selected" type="button" data-confirm-response="${escapeAttribute(state.pendingResponse)}">${escapeHtml(confirmLabel)}</button>
        <button class="button confirm-button" type="button" data-confirm-cancel="true">عودة</button>
      </div>
    </section>
  `;
}

function openConfirmation(response) {
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

  if (state.lockedResponse) {
    setMessage("تم اعتماد قرارك مسبقًا ولا يمكن تغييره.", "pending");
    syncStatus();
    return;
  }

  state.pendingResponse = response;
  state.showConfirm = true;
  setMessage("", "idle");
  render();
}

function confirmDecision(response, event) {
  const form = document.getElementById("rsvpForm");
  const responseField = document.getElementById("responseField");
  const submittedAtField = document.getElementById("submittedAtField");
  const actionButton = root.querySelector(`[data-response="${response}"]`);

  responseField.value = response;
  submittedAtField.value = new Date().toISOString();
  state.selectedResponse = response;
  state.lockedResponse = response;
  state.showConfirm = false;
  state.pendingResponse = "";

  clearDraft();
  saveDecision();
  setMessage(
    response === "accepted"
      ? "أسعدنا قبولك 🌷"
      : "نتفهم اعتذارك ونأمل لقاءك قريبًا 🌷",
    "success"
  );
  render();

  if (response === "accepted") {
    burstConfetti(actionButton, event);
  } else {
    burstDecline(actionButton, event);
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

function saveDecision() {
  localStorage.setItem(DECISION_KEY, JSON.stringify({
    name: state.name,
    response: state.lockedResponse
  }));
}

function loadDecision() {
  try {
    const raw = localStorage.getItem(DECISION_KEY);
    if (!raw) {
      return;
    }

    const decision = JSON.parse(raw);
    if (decision?.name) {
      state.name = state.name || decision.name;
    }
    if (decision?.response === "accepted" || decision?.response === "declined") {
      state.lockedResponse = decision.response;
      state.selectedResponse = decision.response;
      setMessage(
        decision.response === "accepted"
          ? "أسعدنا قبولك 🌷"
          : "نتفهم اعتذارك ونأمل لقاءك قريبًا 🌷",
        "success"
      );
    }
  } catch {
    state.lockedResponse = "";
  }
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
