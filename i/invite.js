import { getBrowserClient, hasSupabaseConfig } from "../supabase.js?v=2";

const root = document.getElementById("invite-root");

const demoInvite = {
  code: "demo-yarmouk",
  guestName: "ضيفنا الكريم",
  eventTitle: "أمسية جيران اليرموك",
  eventCopy: "صفحة الضيف أصبحت الآن جزءًا من المنتج الجديد. لكل ضيف رابط مستقل، ولكل دعوة سجل RSVP خاص بها.",
  eventDate: "الجمعة 17 أبريل",
  eventTime: "8:00 مساءً",
  venueLabel: "الموقع يظهر بعد القبول",
  locationUrl: "https://maps.app.goo.gl/Jcnn8xCd5XPFKgkp7",
  locationImageSrc: "../assets/location-photo.jpg?v=16"
};

const state = {
  invite: demoInvite,
  response: "",
  guestName: ""
};

render();
loadInvite();

async function loadInvite() {
  const code = getInviteCode();
  if (!code || code === demoInvite.code) {
    state.invite = demoInvite;
    state.guestName = "";
    render();
    return;
  }

  if (!hasSupabaseConfig()) {
    state.invite = {
      ...demoInvite,
      code,
      eventTitle: "Invitation preview",
      eventCopy: "This link format is ready, but the new product tables still need to be applied in Supabase before live guest links can resolve.",
      venueLabel: "Schema setup required"
    };
    render();
    return;
  }

  const supabase = getBrowserClient();
  const { data, error } = await supabase.rpc("guest_event_snapshot", {
    target_code: code
  });

  if (error || !Array.isArray(data) || !data.length) {
    state.invite = {
      ...demoInvite,
      code,
      eventTitle: "Invitation not found yet",
      eventCopy: "This route works, but the invite code has not been provisioned in the new schema.",
      venueLabel: "No guest record found"
    };
    render();
    return;
  }

  const invite = data[0];
  state.invite = {
    code: invite.invite_code,
    guestName: invite.guest_name || "ضيفنا الكريم",
    eventTitle: invite.event_title,
    eventCopy: invite.event_copy || "",
    eventDate: invite.event_date_label,
    eventTime: invite.event_time_label,
    venueLabel: invite.venue_label || "",
    locationUrl: invite.location_url || "#",
    locationImageSrc: invite.location_image_url || demoInvite.locationImageSrc
  };
  render();
}

function render() {
  if (!root) {
    return;
  }

  const accepted = state.response === "accepted";
  const declined = state.response === "declined";

  root.innerHTML = `
    <p class="invite-label">رابط ضيف خاص</p>
    <h1 class="invite-title">${escapeHtml(state.invite.eventTitle)}</h1>
    <p class="invite-copy">${escapeHtml(state.invite.eventCopy)}</p>

    <section class="invite-meta-grid">
      <article class="invite-meta-card">
        <p class="invite-meta-label">التاريخ</p>
        <strong class="invite-meta-value">${escapeHtml(state.invite.eventDate)}</strong>
      </article>
      <article class="invite-meta-card">
        <p class="invite-meta-label">الوقت</p>
        <strong class="invite-meta-value">${escapeHtml(state.invite.eventTime)}</strong>
      </article>
      <article class="invite-meta-card">
        <p class="invite-meta-label">الحالة</p>
        <strong class="invite-meta-value">${accepted ? "تم التأكيد" : declined ? "تم الاعتذار" : "بانتظار الرد"}</strong>
      </article>
    </section>

    ${accepted ? `
      <div class="invite-confirmed">
        <p class="result-copy">اضغط لفتح الموقع في خرائط Google</p>
        <a class="location-preview-card" href="${escapeAttribute(state.invite.locationUrl)}" target="_blank" rel="noopener">
          <img class="location-preview-image" src="${escapeAttribute(state.invite.locationImageSrc)}" alt="صورة الموقع">
        </a>
        <p class="result-copy">أسعدنا قبولك .. حياك الله 🌷</p>
      </div>
    ` : declined ? `
      <div class="invite-confirmed">
        <p class="result-copy">نتفهم اعتذارك ونأمل لقاءك قريبًا 🌷</p>
      </div>
    ` : `
      <form class="invite-form" id="invite-form">
        <label class="field">
          <span>الاسم</span>
          <input type="text" name="guestName" value="${escapeAttribute(state.guestName)}" placeholder="اكتب اسمك هنا" required>
        </label>
        <p class="invite-question">هل ستنضم إلى المناسبة؟</p>
        <div class="invite-actions">
          <button class="response-button ${accepted ? "is-active" : ""}" type="button" data-response="accepted">سأحضر بمشيئة الله</button>
          <button class="response-button response-decline ${declined ? "is-active" : ""}" type="button" data-response="declined">أعتذر عن الحضور</button>
        </div>
      </form>
    `}
  `;

  const form = document.getElementById("invite-form");
  if (form) {
    form.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      state.guestName = target.value;
    });
  }

  root.querySelectorAll("[data-response]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.guestName.trim()) {
        window.alert("الرجاء كتابة الاسم أولاً.");
        return;
      }

      state.response = button.getAttribute("data-response") || "";
      render();
    });
  });
}

function getInviteCode() {
  const url = new URL(window.location.href);
  const queryCode = url.searchParams.get("code");
  if (queryCode) {
    return queryCode;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments[0] === "i" && segments[1]) {
    return segments[1];
  }

  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
