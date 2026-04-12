import { getBrowserClient, hasSupabaseConfig } from "../supabase.js?v=2";

const root = document.getElementById("admin-app");
const supabase = getBrowserClient();

const state = {
  session: null,
  isAdmin: false,
  loading: true,
  responses: [],
  status: "",
  statusType: "idle"
};

init();

async function init() {
  if (!hasSupabaseConfig() || !supabase) {
    state.loading = false;
    state.status = "Add Supabase URL and anon key in supabase.js first.";
    state.statusType = "error";
    render();
    return;
  }

  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    await hydrateAdmin();
  });

  await hydrateAdmin();
}

async function hydrateAdmin() {
  state.loading = true;
  render();

  if (!state.session) {
    state.isAdmin = false;
    state.responses = [];
    state.loading = false;
    render();
    return;
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", state.session.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    state.isAdmin = false;
    state.responses = [];
    state.loading = false;
    state.status = "This account does not have admin access.";
    state.statusType = "error";
    render();
    return;
  }

  state.isAdmin = true;
  await loadResponses();
}

async function loadResponses() {
  const { data, error } = await supabase
    .from("rsvps")
    .select("id, guest_name, response, created_at")
    .order("created_at", { ascending: false });

  state.loading = false;

  if (error) {
    state.responses = [];
    state.status = "Could not load responses.";
    state.statusType = "error";
    render();
    return;
  }

  state.responses = data ?? [];
  state.status = "";
  state.statusType = "idle";
  render();
}

root.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-login-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  state.status = "Signing in...";
  state.statusType = "success";
  render();

  const { data: loginRow, error: loginLookupError } = await supabase
    .from("admin_users")
    .select("email")
    .eq("username", username)
    .maybeSingle();

  if (loginLookupError || !loginRow?.email) {
    state.status = "Username not found.";
    state.statusType = "error";
    render();
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email: loginRow.email, password });
  if (error) {
    state.status = error.message || "Could not sign in.";
    state.statusType = "error";
    render();
  }
});

root.addEventListener("click", async (event) => {
  const logoutButton = event.target.closest("[data-sign-out]");
  if (logoutButton) {
    await supabase.auth.signOut();
    state.status = "";
    state.statusType = "idle";
    render();
    return;
  }

  const refreshButton = event.target.closest("[data-refresh]");
  if (refreshButton) {
    state.status = "Refreshing...";
    state.statusType = "success";
    render();
    await loadResponses();
    return;
  }

  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) {
    return;
  }

  const responseId = deleteButton.dataset.deleteId;
  if (!responseId) {
    return;
  }

  const confirmed = window.confirm("Delete this RSVP?");
  if (!confirmed) {
    return;
  }

  const { error } = await supabase.from("rsvps").delete().eq("id", responseId);
  if (error) {
    state.status = "Could not delete the response.";
    state.statusType = "error";
    render();
    return;
  }

  state.status = "Response deleted.";
  state.statusType = "success";
  await loadResponses();
});

function render() {
  if (!state.session) {
    root.innerHTML = renderLogin();
    return;
  }

  if (!state.isAdmin) {
    root.innerHTML = renderNotAuthorized();
    return;
  }

  root.innerHTML = renderDashboard();
}

function renderLogin() {
  return `
    <section class="login-wrap">
      <article class="login-card">
        <h1>Admin Access</h1>
        <p>Sign in with your admin username and password to view and manage RSVP responses.</p>
        <form class="login-form" data-login-form>
          <label class="field">
            <span>Username</span>
            <input type="text" name="username" placeholder="admin" autocapitalize="off" autocomplete="username" required>
          </label>
          <label class="field">
            <span>Password</span>
            <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
          </label>
          <button class="primary-button" type="submit">Sign in</button>
        </form>
        <p class="status-line ${state.statusType}">${escapeHtml(state.status)}</p>
      </article>
    </section>
  `;
}

function renderNotAuthorized() {
  return `
    <section class="login-wrap">
      <article class="login-card">
        <h1>Access blocked</h1>
        <p>Your account signed in successfully, but it is not listed in the admin table.</p>
        <button class="ghost-button" type="button" data-sign-out="true">Sign out</button>
        <p class="status-line ${state.statusType}">${escapeHtml(state.status)}</p>
      </article>
    </section>
  `;
}

function renderDashboard() {
  const acceptedCount = state.responses.filter((item) => item.response === "accepted").length;
  const declinedCount = state.responses.filter((item) => item.response === "declined").length;

  return `
    <section class="admin-shell">
      <article class="admin-card">
        <div class="admin-top">
          <div>
            <h1>RSVP Dashboard</h1>
            <p>Review guest responses, remove entries, and monitor attendance in one place.</p>
          </div>
          <div class="admin-actions">
            <button class="ghost-button" type="button" data-refresh="true">Refresh</button>
            <button class="ghost-button" type="button" data-sign-out="true">Sign out</button>
          </div>
        </div>

        <section class="stats">
          <div class="stat">
            <span class="stat-label">Total responses</span>
            <strong class="stat-value">${state.responses.length}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Accepted</span>
            <strong class="stat-value">${acceptedCount}</strong>
          </div>
          <div class="stat">
            <span class="stat-label">Declined</span>
            <strong class="stat-value">${declinedCount}</strong>
          </div>
        </section>

        <div class="table-shell">
          ${state.responses.length ? `
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Response</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${state.responses.map(renderRow).join("")}
              </tbody>
            </table>
          ` : `<p class="empty-state">No RSVP responses yet.</p>`}
        </div>

        <p class="status-line ${state.statusType}">${escapeHtml(state.status)}</p>
      </article>
    </section>
  `;
}

function renderRow(row) {
  return `
    <tr>
      <td>${escapeHtml(row.guest_name)}</td>
      <td><span class="pill ${row.response}">${row.response === "accepted" ? "Accepted" : "Declined"}</span></td>
      <td>${escapeHtml(formatDate(row.created_at))}</td>
      <td><button class="danger-button" type="button" data-delete-id="${escapeHtml(row.id)}">Delete</button></td>
    </tr>
  `;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
