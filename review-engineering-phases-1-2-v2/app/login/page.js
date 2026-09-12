"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace("/dashboard"); });
    } catch (error) { setMessage(error.message); }
  }, [router]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard`, shouldCreateUser: false }
      });
      if (error) throw error;
      setMessage("Check your email for your secure sign-in link.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <main className="admin-shell login-shell">
    <section className="admin-card login-card">
      <img src="/review-engineering-logo.svg" alt="" className="admin-logo" />
      <p className="eyebrow">LOAN OFFICER PORTAL</p>
      <h1>Sign in to your Review Engineering dashboard</h1>
      <p className="admin-muted">Use the email connected to your account. We’ll send a secure sign-in link—no password to remember.</p>
      <form onSubmit={signIn} className="admin-form">
        <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com" /></label>
        <button className="admin-primary" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
      </form>
      {message && <p className="admin-message">{message}</p>}
      <a href="/app.html" className="admin-link">Open the public review tool</a>
    </section>
  </main>;
}
