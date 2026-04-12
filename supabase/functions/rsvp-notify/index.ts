interface WebhookPayload {
  type?: string;
  table?: string;
  record?: {
    guest_name?: string;
    response?: string;
    created_at?: string;
  };
}

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const notifyEmail = Deno.env.get("ADMIN_NOTIFY_EMAIL");
const fromEmail = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "Invitations <onboarding@resend.dev>";
const webhookSecret = Deno.env.get("WEBHOOK_SHARED_SECRET");

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (webhookSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return unauthorized();
    }
  }

  if (!resendApiKey || !notifyEmail) {
    return new Response(JSON.stringify({ ok: false, error: "Missing email configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const payload = (await request.json()) as WebhookPayload;
  const record = payload.record ?? {};

  const responseLabel = record.response === "accepted" ? "Accepted" : "Declined";
  const submittedAt = record.created_at
    ? new Date(record.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : "Unknown time";

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [notifyEmail],
      subject: "Invitations.live [NEW RESPONSE]",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f3354;">
          <h2 style="margin-bottom: 12px;">New invitation response</h2>
          <p><strong>Name:</strong> ${escapeHtml(record.guest_name ?? "Unknown")}</p>
          <p><strong>Response:</strong> ${responseLabel}</p>
          <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
        </div>
      `
    })
  });

  const resendJson = await resendResponse.json();

  return new Response(JSON.stringify({ ok: resendResponse.ok, resend: resendJson }), {
    status: resendResponse.ok ? 200 : 502,
    headers: { "Content-Type": "application/json" }
  });
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
