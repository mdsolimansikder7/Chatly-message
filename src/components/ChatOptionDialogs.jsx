import { useEffect, useState } from "react";
import { FiAlertTriangle, FiCheck, FiClock, FiFlag, FiImage, FiInbox, FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";

export const DISAPPEAR_CHOICES = [
  { seconds: 0, labelKey: "disappearOff" },
  { seconds: 600, labelKey: "disappear10m" },
  { seconds: 3600, labelKey: "disappear1h" },
  { seconds: 86400, labelKey: "disappear24h" },
  { seconds: 604800, labelKey: "disappear7d" },
];

export const WALLPAPERS = [
  { id: -1, labelKey: "wallpaperDefault", className: "" },
  { id: 0, labelKey: "wallpaperAurora", className: "bg-gradient-to-br from-violet-600/30 via-fuchsia-400/18 to-cyan-300/25" },
  { id: 1, labelKey: "wallpaperSky", className: "bg-gradient-to-br from-sky-500/30 via-blue-300/18 to-indigo-500/20" },
  { id: 2, labelKey: "wallpaperMint", className: "bg-gradient-to-br from-emerald-400/25 via-teal-300/15 to-green-300/20" },
  { id: 3, labelKey: "wallpaperSunset", className: "bg-gradient-to-br from-orange-500/30 via-rose-400/22 to-fuchsia-500/18" },
  { id: 4, labelKey: "wallpaperGraphite", className: "bg-gradient-to-br from-slate-500/25 via-slate-700/12 to-slate-400/14" },
  { id: 5, labelKey: "wallpaperCherry", className: "bg-gradient-to-br from-rose-500/28 via-pink-300/18 to-red-300/18" },
  { id: 6, labelKey: "wallpaperOcean", className: "bg-gradient-to-br from-teal-500/25 via-cyan-400/16 to-blue-600/20" },
  { id: 7, labelKey: "wallpaperLavender", className: "bg-gradient-to-br from-purple-400/25 via-violet-300/15 to-indigo-300/20" },
  { id: 8, labelKey: "wallpaperPeach", className: "bg-gradient-to-br from-amber-400/25 via-orange-300/15 to-pink-300/18" },
  { id: 9, labelKey: "wallpaperForest", className: "bg-gradient-to-br from-green-500/22 via-emerald-600/12 to-lime-400/15" },
  { id: 10, labelKey: "wallpaperTwilight", className: "bg-gradient-to-br from-indigo-500/28 via-purple-400/15 to-slate-500/14" },
];

export function NicknameModal({ isOpen, chatName, initial, onClose, onSave }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(initial || "");
  useEffect(() => {
    if (isOpen) setValue(initial || "");
  }, [isOpen, initial]);
  if (!isOpen) return null;

  return (
    <DialogFrame onClose={onClose}>
      <h3 className="theme-text text-lg font-bold">{t("nickname")}</h3>
      <p className="theme-muted mt-1 text-sm">{t("nicknameHint", { name: chatName })}</p>
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={chatName}
        maxLength={40}
        className="theme-field theme-focus theme-text mt-4 w-full rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-gray-400"
      />
      <DialogActions
        onClose={onClose}
        confirmDisabled={false}
        confirmLabel={t("saveChanges")}
        onConfirm={() => { onSave(value.trim()); onClose(); }}
      />
    </DialogFrame>
  );
}

export function DisappearingModal({ isOpen, current, onClose, onSelect }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <DialogFrame onClose={onClose}>
      <h3 className="theme-text flex items-center gap-2 text-lg font-bold"><FiClock size={17} className="text-violet-500" /> {t("disappearingTitle")}</h3>
      <p className="theme-muted mt-1 text-sm">{t("disappearingHint")}</p>
      <div className="mt-4 space-y-1.5">
        {DISAPPEAR_CHOICES.map((choice) => (
          <button
            key={choice.seconds}
            type="button"
            onClick={() => { onSelect(choice.seconds); onClose(); }}
            className={`theme-soft flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${current === choice.seconds ? "ring-1 ring-violet-400/50" : ""}`}
          >
            <span className="theme-text">{t(choice.labelKey)}</span>
            {current === choice.seconds && <FiCheck className="text-violet-500" />}
          </button>
        ))}
      </div>
    </DialogFrame>
  );
}

export function WallpaperModal({ isOpen, current, onClose, onSelect }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <DialogFrame onClose={onClose}>
      <h3 className="theme-text text-lg font-bold">{t("wallpaperTitle")}</h3>
      <p className="theme-muted mt-1 text-sm">{t("wallpaperHint")}</p>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {WALLPAPERS.map((wallpaper) => (
          <button
            key={wallpaper.id}
            type="button"
            onClick={() => { onSelect(wallpaper.id); onClose(); }}
            className={`glass flex h-16 items-center justify-center rounded-xl transition hover:scale-[1.03] ${wallpaper.className || "bg-[var(--app-soft)]"} ${current === wallpaper.id ? "ring-2 ring-violet-400" : ""}`}
            title={t(wallpaper.labelKey)}
            aria-label={t(wallpaper.labelKey)}
          >
            <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">{t(wallpaper.labelKey)}</span>
          </button>
        ))}
      </div>
    </DialogFrame>
  );
}

export function SharedMediaModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <DialogFrame onClose={onClose}>
      <h3 className="theme-text flex items-center gap-2 text-lg font-bold"><FiImage size={17} className="text-violet-500" /> {t("sharedMediaTitle")}</h3>
      <div className="theme-soft mt-4 flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center">
        <FiInbox size={30} className="theme-muted" />
        <p className="theme-muted text-sm">{t("sharedMediaEmpty")}</p>
      </div>
    </DialogFrame>
  );
}

export function ReportModal({ isOpen, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <DialogFrame onClose={onClose} danger>
      <h3 className="theme-text flex items-center gap-2 text-lg font-bold text-rose-500"><FiFlag size={17} /> {t("reportTitle")}</h3>
      <p className="theme-muted mt-1 text-sm">{t("reportHint")}</p>
      <textarea
        autoFocus
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder={t("reportPlaceholder")}
        className="theme-field theme-focus theme-text mt-4 w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none placeholder:text-gray-400"
      />
      <DialogActions
        onClose={() => { setReason(""); onClose(); }}
        confirmLabel={t("reportSubmit")}
        confirmDanger
        onConfirm={() => { onSubmit(reason.trim()); setReason(""); onClose(); }}
      />
    </DialogFrame>
  );
}

export function ConfirmActionModal({ isOpen, titleKey, hintKey, confirmLabelKey, onConfirm, onClose }) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <DialogFrame onClose={onClose} danger>
      <h3 className="theme-text flex items-center gap-2 text-lg font-bold text-rose-500"><FiAlertTriangle size={17} /> {t(titleKey)}</h3>
      <p className="theme-muted mt-1 text-sm">{t(hintKey)}</p>
      <DialogActions onClose={onClose} confirmLabel={t(confirmLabelKey)} confirmDanger onConfirm={onConfirm} />
    </DialogFrame>
  );
}

function DialogFrame({ children, onClose, danger = false }) {
  return (
    <div className="dialog-overlay fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-950/40 backdrop-blur-sm" onClick={onClose} aria-label="close" />
      <section className={`dialog-panel glass relative w-full max-w-sm rounded-[1.75rem] p-6 shadow-2xl ${danger ? "ring-1 ring-rose-400/30" : ""}`}>
        <button type="button" onClick={onClose} aria-label="close" className="theme-icon-button absolute right-5 top-5 grid h-9 w-9 place-items-center"><FiX size={17} /></button>
        {children}
      </section>
    </div>
  );
}

function DialogActions({ onClose, onConfirm, confirmLabel, confirmDanger = false, confirmDisabled = false }) {
  const { t } = useLanguage();
  return (
    <div className="dialog-actions mt-5 flex justify-end gap-2.5">
      <button type="button" onClick={onClose} className="theme-soft theme-muted rounded-xl px-4 py-2.5 text-sm font-bold transition hover:theme-text">{t("closePanel")}</button>
      <button
        type="button"
        disabled={confirmDisabled}
        onClick={onConfirm}
        className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-60 ${confirmDanger ? "bg-gradient-to-r from-rose-500 to-red-500 shadow-rose-500/25" : "bg-gradient-to-r from-violet-500 to-pink-500 shadow-violet-500/25"}`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
