"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@leadscope.example");
  const [password, setPassword] = useState("Demo-LeadScope-2026!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <h2>Добро пожаловать</h2><p>Войдите в защищённый workspace</p>
      <div className="field"><label htmlFor="email">Рабочий e-mail</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
      <div className="field"><label htmlFor="password">Пароль</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={10} required /></div>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <button className="btn primary" type="submit" disabled={loading}>{loading ? "Проверяем…" : "Войти в LeadScope"}</button>
      <div className="demo-box"><b>Демо-доступ</b><br/>owner@leadscope.example<br/>Demo-LeadScope-2026!</div>
    </form>
  );
}

