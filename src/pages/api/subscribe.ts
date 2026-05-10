import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Newsletter subscribe — placeholder. Logs the email and returns 200.
 * Replace with a real provider call (Mailchimp, Buttondown, etc.) in v2.
 */
export const POST: APIRoute = async ({ request }) => {
  let email = "";
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await request.formData();
      email = String(form.get("email") ?? "");
    } else {
      const body = (await request.json()) as { email?: string };
      email = body.email ?? "";
    }
  } catch {
    /* fall through */
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.info(`[subscribe] queued ${email.replace(/(.).+(@.+)/, "$1***$2")}`);

  // 303 redirect for plain-form submissions; JSON otherwise.
  if ((request.headers.get("accept") ?? "").includes("text/html")) {
    return Response.redirect(new URL("/?subscribed=1", request.url).toString(), 303);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
