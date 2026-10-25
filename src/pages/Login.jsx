import { useState } from "react";
import { FiLock, FiMail } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import OAuthButtons from "../components/OAuthButtons";
import ThemeToggle from "../components/ThemeToggle";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { saveSession } from "../services/session";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      saveSession(data);
      navigate("/chat");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page bg-aurora relative flex min-h-screen items-center justify-center p-4">
      <div className="auth-controls absolute right-5 top-5 z-10 flex gap-2"><LanguageSwitcher /><ThemeToggle /></div>
      <form onSubmit={handleSubmit} className="auth-form glass relative z-10 w-full max-w-md rounded-[2rem] p-8 sm:p-10">
        <div className="mb-7 text-center">
          <span className="brand-ring mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl font-bold text-white">C</span>
          <h1 className="mt-5 bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent">Chatly</h1>
          <p className="theme-muted mt-2 text-sm">{t("loginWelcome")}</p>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">{error}</p>}
        <OAuthButtons />
        <div className="theme-muted my-5 flex items-center gap-3 text-xs"><span className="theme-divider flex-1 border-t" /><span>{t("orContinueWithEmail")}</span><span className="theme-divider flex-1 border-t" /></div>
        <label className="theme-field theme-focus mb-4 flex items-center gap-3 rounded-2xl px-4 py-3.5">
          <FiMail className="theme-muted" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder={t("email")} autoComplete="email" required className="theme-text w-full bg-transparent outline-none placeholder:text-gray-400" />
        </label>
        <label className="theme-field theme-focus mb-6 flex items-center gap-3 rounded-2xl px-4 py-3.5">
          <FiLock className="theme-muted" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={t("password")} autoComplete="current-password" required className="theme-text w-full bg-transparent outline-none placeholder:text-gray-400" />
        </label>
        <button disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-70">{loading ? t("loggingIn") : t("login")}</button>
        <p className="theme-muted mt-6 text-center text-sm">{t("noAccount")} <Link to="/register" className="font-semibold text-violet-500 hover:underline">{t("register")}</Link></p>
      </form>
    </div>
  );
}
