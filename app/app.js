import { getBrowserClient, hasSupabaseConfig } from "../supabase.js?v=2";

const authForm = document.getElementById("auth-form");
const authStatus = document.getElementById("auth-status");
const signUpButton = document.getElementById("sign-up-button");

let supabase = null;

if (hasSupabaseConfig()) {
  supabase = getBrowserClient();
}

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabase) {
      setStatus("Add Supabase credentials first.", "error");
      return;
    }

    const formData = new FormData(authForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    setStatus("Signing in...", "success");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message || "Could not sign in.", "error");
      return;
    }

    setStatus("Signed in. Product tables can now be connected after schema setup.", "success");
  });
}

if (signUpButton) {
  signUpButton.addEventListener("click", async () => {
    if (!supabase || !authForm) {
      setStatus("Add Supabase credentials first.", "error");
      return;
    }

    const formData = new FormData(authForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setStatus("Enter email and password first.", "error");
      return;
    }

    setStatus("Creating account...", "success");
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus(error.message || "Could not create account.", "error");
      return;
    }

    setStatus("Account created. Next step is applying the product schema and creating your first event.", "success");
  });
}

function setStatus(message, type) {
  if (!authStatus) {
    return;
  }

  authStatus.textContent = message;
  authStatus.className = `status-copy ${type}`;
}
