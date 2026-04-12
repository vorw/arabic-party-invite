const config = {
  logoSrc: "./assets/logo.png?v=9",
  title: "أمسية جيران اليرموك",
  welcome: "",
  note: "",
  locationTitle: "الموقع",
  locationLabel: "",
  locationHint: "اضغط لفتح الموقع في خرائط Google",
  locationImageSrc: "./assets/location-photo.jpg?v=16",
  locationMapsUrl: "https://maps.app.goo.gl/Jcnn8xCd5XPFKgkp7",
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
let supabase = null;
let supabaseReady = false;

loadDraft();
loadDecision();
render();
attachEvents();
initSupabase();

async function initSupabase() {
  try {
    const supabaseModule = await import("./supabase.js?v=2");
    if (supabaseModule.hasSupabaseConfig()) {
      supabase = supabaseModule.getBrowserClient();
      supabaseReady = Boolean(supabase);
    }
  } catch (error) {
    console.error("Supabase module failed to load:", error);
    supabase = null;
    supabaseReady = false;
  }
}

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
  const hasDeclined = state.lockedResponse === "declined";
  const isLocked = Boolean(state.lockedResponse);
  const displayResponse = state.lockedResponse || state.selectedResponse;

  root.innerHTML = `
    <section class="page-shell">
      <div class="ambient ambient-a" aria-hidden="true"></div>
      <div class="ambient ambient-b" aria-hidden="true"></div>
      <div class="ambient ambient-c" aria-hidden="true"></div>
      <article class="invite-panel">
        ${hasAccepted ? `
          <div class="result-state result-state-accepted">
            <p class="location-hint-top">${escapeHtml(config.locationHint)}</p>
            <a
              class="location-card location-card-minimal ${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? "disabled" : ""}"
              href="${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? "#" : escapeAttribute(config.locationMapsUrl)}"
              target="_blank"
              rel="noopener"
              ${config.locationMapsUrl.includes("PASTE_GOOGLE_MAPS") ? 'aria-disabled="true"' : ""}
            >
              <div class="location-preview" style="background-image: url('${escapeAttribute(config.locationImageSrc)}');" aria-hidden="true"></div>
            </a>
            <p class="result-message accepted-message">${escapeHtml(state.message || "أسعدنا قبولك 🌷")}</p>
          </div>
        ` : hasDeclined ? `
          <div class="result-state result-state-declined">
            <p class="result-message declined-message">${escapeHtml(state.message || "نتفهم اعتذارك ونأمل لقاءك قريبًا 🌷")}</p>
          </div>
        ` : `
          <div class="panel-ornament" aria-hidden="true"></div>
          <p class="eyebrow">دعوة خاصة</p>
          <h1>${escapeHtml(config.title)}</h1>
          ${config.note ? `<p class="note">${escapeHtml(config.note)}</p>` : ""}

          <form id="rsvpForm" action="${escapeAttribute(config.submitEndpoint)}" method="POST" target="submitFrame">
            <label class="field" for="guestName">
              <span>الاسم</span>
              <input id="guestName" name="name" type="text" placeholder="اكتب اسمك هنا" value="${escapeAttribute(state.name)}" ${isLocked ? "disabled" : ""}>
            </label>

            <input type="hidden" id="responseField" name="response" value="">
            <input type="hidden" name="event" value="${escapeAttribute(config.title)}">
            <input type="hidden" id="submittedAtField" name="submittedAt" value="">

            <div class="actions">
              <button class="button ${displayResponse === "accepted" ? "is-selected" : ""}" type="button" data-response="accepted" ${isLocked ? "disabled" : ""}>سأحضر بمشيئة الله</button>
              <button class="button ${displayResponse === "declined" ? "is-selected" : ""}" type="button" data-response="declined" ${isLocked ? "disabled" : ""}>أعتذر عن الحضور</button>
            </div>
          </form>
        `}

        <iframe name="submitFrame" class="submit-frame" title="submit target"></iframe>

        ${isLocked ? "" : `<p class="status ${state.messageType}">${escapeHtml(state.message || "")}</p>`}
      </article>
      ${state.showConfirm ? renderConfirmation() : ""}
      <div class="confetti-layer" aria-hidden="true"></div>
    </section>
  `;
}

function renderConfirmation() {
  const isAccept = state.pendingResponse === "accepted";
  const confirmLabel = isAccept ? "تأكيد الحضور" : "تأكيد الاعتذار";

  return `
    <div class="confirm-overlay" aria-hidden="true"></div>
    <section class="confirm-dialog confirm-dialog-minimal" role="dialog" aria-modal="true" aria-label="تأكيد الاختيار">
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

  if (!supabaseReady && (!config.submitEndpoint || config.submitEndpoint.includes("PASTE_GOOGLE_APPS_SCRIPT"))) {
    setMessage("أضف إعدادات Supabase أو رابط Google Sheets أولًا.", "error");
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

async function confirmDecision(response, event) {
  const actionButton = root.querySelector(`[data-response="${response}"]`);
  state.selectedResponse = response;
  state.lockedResponse = response;
  state.showConfirm = false;
  state.pendingResponse = "";
  clearDraft();
  saveDecision();
  setMessage(
    response === "accepted"
      ? "أسعدنا قبولك .. حياك الله 🌷"
      : "نتفهم اعتذارك ونأمل لقاءك قريبًا 🌷",
    "success"
  );
  render();

  if (response === "accepted") {
    burstConfetti(actionButton, event);
  } else {
    burstDecline(actionButton, event);
  }

  try {
    await submitRsvp(response);
  } catch (error) {
    console.error("RSVP background save failed:", error);
  }
}

async function submitRsvp(response) {
  const submittedAt = new Date().toISOString();
  const payload = {
    guest_name: state.name.trim(),
    response,
    source: "web"
  };

  const writes = [];

  if (supabaseReady && supabase) {
    writes.push(writeToSupabase(payload));
  }

  if (config.submitEndpoint && !config.submitEndpoint.includes("PASTE_GOOGLE_APPS_SCRIPT")) {
    writes.push(writeToGoogleSheets(payload));
  }

  if (!writes.length) {
    throw new Error("إعدادات Supabase أو Google Sheets غير مضافة بعد.");
  }

  const results = await Promise.allSettled(writes);
  if (results.every((result) => result.status === "rejected")) {
    throw new Error("تعذر حفظ الرد.");
  }
}

async function writeToSupabase(payload) {
  const { error } = await supabase.from("rsvps").insert(payload);
  if (error) {
    throw new Error("تعذر حفظ الرد في قاعدة البيانات.");
  }
}

function writeToGoogleSheets(payload) {
  const fields = new URLSearchParams({
    name: state.name.trim(),
    response: payload.response,
    event: config.title,
    submittedAt
  });

  return fetch(config.submitEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: fields.toString(),
    keepalive: true
  }).then(() => undefined);
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
          ? "أسعدنا قبولك .. حياك الله 🌷"
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
