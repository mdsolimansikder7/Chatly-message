import { useEffect, useRef, useState } from "react";
import { FiCamera, FiCheck, FiChevronRight, FiMail, FiEye, FiEyeOff, FiShield, FiUser, FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

const emptyProfile = {
  name: "Soliman",
  email: "",
  username: "",
  role: "Available",
  bio: "Building meaningful conversations, one message at a time.",
  avatar: "",
};

export default function SettingsPanel({ isOpen, onClose, profile = emptyProfile, onSave, live, showActiveStatus = true, onToggleActiveStatus }) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...emptyProfile, ...profile });
      setError("");
    }
  }, [isOpen, profile]);

  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    if (isOpen) window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const handleImage = (event) => {
    const [file] = event.target.files;
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError(t("photoSizeError"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateDraft("avatar", String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, name: draft.name.trim() || emptyProfile.name });
      onClose();
    } catch (saveError) {
      setError(saveError?.response?.data?.message || t("saveProfileError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button type="button" aria-label={t("closeSettings")} className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <section className="glass relative flex h-full w-full max-w-xl flex-col border-l shadow-2xl">
        <header className="settings-panel-header theme-divider flex items-center justify-between border-b px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-500">{t("personalSpace")}</p>
            <h2 id="settings-title" className="theme-text mt-1 text-xl font-bold">{t("settings")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("closeSettings")} className="theme-icon-button grid h-10 w-10 place-items-center"><FiX size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="settings-panel-form min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <div className="mb-8 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-violet-500/15 to-pink-500/10 p-4">
            <div className="relative">
              <Avatar name={draft.name || emptyProfile.name} image={draft.avatar} size="h-16 w-16" />
              <button type="button" aria-label={t("choosePhoto")} onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white shadow-lg transition hover:scale-105"><FiCamera size={14} /></button>
              <input ref={fileInputRef} onChange={handleImage} type="file" accept="image/*" className="hidden" />
            </div>
            <div className="min-w-0">
              <p className="theme-text truncate font-bold">{draft.name || "Your name"}</p>
              <p className="theme-muted mt-1 text-sm">{t("updateProfileIntro")}</p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs font-bold text-violet-500 hover:underline">{t("changePhoto")}</button>
            </div>
          </div>
          {error && <p className="mb-5 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">{error}</p>}

          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/12 text-violet-500"><FiUser size={16} /></span>
              <div><h3 className="theme-text text-sm font-bold">{t("profileDetails")}</h3><p className="theme-muted text-xs">{t("profileDetailsHelp")}</p></div>
            </div>
            <div className="space-y-4">
              <Field label={t("displayName")}><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder={t("name")} className="settings-input" /></Field>
              <Field label={t("username")} hint={t("usernameHint")}>
                <div className="flex items-center gap-2">
                  <span className="theme-muted font-bold">@</span>
                  <input
                    value={draft.username}
                    onChange={(event) => updateDraft("username", event.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, "").replace(/^@+/, ""))}
                    placeholder={t("usernamePlaceholder")}
                    maxLength={20}
                    className="settings-input"
                  />
                </div>
              </Field>
              <Field label={t("emailAddress")}><div className="flex items-center gap-2"><FiMail className="theme-muted shrink-0" /><input value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} type="email" placeholder="you@example.com" className="settings-input" /></div></Field>
              <Field label={t("aboutYou")}><textarea value={draft.bio} onChange={(event) => updateDraft("bio", event.target.value)} maxLength={140} rows={3} placeholder={t("aboutYou")} className="settings-input resize-none" /></Field>
            </div>

            <div className="mt-5">
              <div className="theme-soft flex items-center justify-between rounded-2xl border border-[var(--app-border)] p-4">
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${live ? "bg-emerald-500/12 text-emerald-500" : "bg-[var(--app-soft-hover)] text-gray-400"}`}>
                    {live ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                  </span>
                  <div>
                    <p className="theme-text text-sm font-semibold">{t("statusSection")}</p>
                    <p className={`mt-0.5 flex items-center gap-1.5 text-xs font-bold ${live ? "text-emerald-500" : "theme-muted"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {live ? t("statusOnline") : t("statusOffline")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="theme-soft mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] p-4">
                <div className="min-w-0">
                  <p className="theme-text text-sm font-semibold">{t("activeStatusLabel")}</p>
                  <p className="theme-muted mt-1 text-xs">{showActiveStatus ? t("activeStatusOnHint") : t("activeStatusOffHint")}</p>
                </div>
                <ToggleSwitch checked={showActiveStatus} onChange={onToggleActiveStatus} />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/12 text-sky-500"><FiShield size={16} /></span>
              <div><h3 className="theme-text text-sm font-bold">{t("appearance")}</h3><p className="theme-muted text-xs">{t("appearanceHelp")}</p></div>
            </div>
            <button type="button" onClick={toggleTheme} className="theme-soft flex w-full items-center justify-between rounded-2xl border border-[var(--app-border)] p-4 text-left">
              <div><p className="theme-text text-sm font-semibold">{theme === "dark" ? t("dark") : t("light")}</p><p className="theme-muted mt-1 text-xs">{t("switchTheme", { theme: theme === "dark" ? t("light") : t("dark") })}</p></div>
              <FiChevronRight className="theme-muted" />
            </button>
          </div>
        </form>

        <footer className="settings-panel-footer theme-divider flex items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
          <p className="theme-muted max-w-[12rem] text-xs">{t("saveAccount")}</p>
          <button type="button" disabled={saving} onClick={handleSubmit} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-70"><FiCheck /> {saving ? t("saving") : t("saveChanges")}</button>
        </footer>
      </section>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-gradient-to-r from-violet-500 to-pink-500 shadow-sm shadow-violet-500/30" : "bg-slate-400/50"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="theme-muted mb-1.5 block text-xs font-bold">{label}</span>
      <div className="theme-field theme-focus rounded-xl px-3 py-2.5">{children}</div>
      {hint && <span className="theme-muted mt-1.5 block text-xs">{hint}</span>}
    </label>
  );
}
