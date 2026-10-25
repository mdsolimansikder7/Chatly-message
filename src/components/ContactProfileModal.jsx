import { FiMail, FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import Avatar from "./Avatar";

export default function ContactProfileModal({ isOpen, contact, chatOnline, onClose }) {
  const { t } = useLanguage();
  if (!isOpen || !contact) return null;

  const infoLine = contact.isOnline || chatOnline
    ? { label: t("statusOnline"), tone: "text-emerald-500 bg-emerald-500/12" }
    : { label: contact.lastSeen ? t("lastSeenAt", { time: new Date(contact.lastSeen).toLocaleString() }) : t("statusOffline"), tone: "theme-muted" };

  return (
    <div className="profile-dialog-overlay fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-950/40 backdrop-blur-sm" onClick={onClose} aria-label={t("closePanel")} />
      <section className="profile-dialog-panel glass relative w-full max-w-sm rounded-[1.75rem] p-6 shadow-2xl">
        <button type="button" onClick={onClose} aria-label={t("closePanel")} className="theme-icon-button absolute right-5 top-5 grid h-9 w-9 place-items-center"><FiX size={17} /></button>
        <div className="flex flex-col items-center text-center">
          <Avatar name={contact.name} image={contact.avatar} online={contact.isOnline || chatOnline} size="h-20 w-20" />
          <h3 className="theme-text mt-4 text-lg font-bold">{contact.name}</h3>
          {contact.username && <p className="theme-muted text-sm font-medium">@{contact.username}</p>}
          {contact.bio && <p className="theme-muted mt-2 text-sm">{contact.bio}</p>}
          <span className={`mt-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${contact.isOnline || chatOnline ? "text-emerald-500 bg-emerald-500/12" : "theme-muted bg-[var(--app-soft)]"}`}>
            {infoLine.label}
          </span>
        </div>
        <div className="theme-soft mt-5 space-y-2.5 rounded-2xl p-4 text-sm">
          <div className="flex items-center gap-3">
            <FiMail className="theme-muted shrink-0" size={15} />
            <span className="theme-text min-w-0 truncate">{contact.email}</span>
          </div>
          {contact.chatlyId && (
            <div className="flex items-center gap-3">
              <span className="theme-muted shrink-0 text-xs font-bold tracking-wide">ID</span>
              <span className="theme-text truncate font-medium">{contact.chatlyId}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
