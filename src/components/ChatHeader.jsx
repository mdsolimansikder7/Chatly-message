import { useEffect, useRef, useState } from "react";
import {
  FiArrowLeft, FiBell, FiBellOff, FiBookmark, FiDownload, FiEdit2, FiDelete, FiFlag, FiImage,
  FiMoreVertical, FiPhone, FiClock, FiSearch, FiSlash, FiStar, FiTrash2,
  FiUser, FiX,
} from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import Avatar from "./Avatar";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

export default function ChatHeader({
  chat, onBack, live, notes: { muted, pinned, favorite, nickname },
  onToggleMute, onTogglePin, onToggleFavorite, onOpenProfile, onSearchInChat, onSharedMedia,
  onNickname, onWallpaper, onDisappearing, disappearAfter, onExport, onClearChat,
  onDeleteChat, onReport, blocked, onToggleBlock, onCall,
}) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => () => { onSearchInChat?.(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = nickname || chat.name;
  const disappearLabel = disappearAfter > 0 ? disappearSecondsLabel(disappearAfter) : "";

  const item = (Icon, labelKey, handler, danger = false, extra = null) => (
    <li>
      <button
        type="button"
        onClick={() => { setMenuOpen(false); handler?.(); }}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${danger ? "text-rose-500 hover:bg-rose-500/10" : "theme-text hover:bg-[var(--app-soft-hover)]"}`}
      >
        <Icon size={16} className={danger ? "" : "theme-muted"} />
        <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
        {extra}
      </button>
    </li>
  );

  return (
    <div>
      <header className="chat-header theme-divider flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} aria-label={t("backToChats")} className="theme-icon-button grid h-10 w-10 place-items-center md:hidden">
            <FiArrowLeft size={20} />
          </button>
          <span className="chat-header-avatar shrink-0"><Avatar name={displayName} image={chat.avatar} online={chat.online} size="h-11 w-11" /></span>
          <div className="min-w-0">
            <p className="theme-text flex items-center gap-2 truncate font-semibold leading-tight">
              {displayName}
              {pinned && <FiBookmark size={12} className="shrink-0 text-violet-500" title={t("pinChat")} />}
              {muted && <FiBellOff size={12} className="shrink-0 text-amber-500" title={t("muteChat")} />}
            </p>
            <p className={`text-xs ${chat.online && !blocked ? "text-emerald-500" : "theme-muted"}`}>
              {blocked ? t("blockedLabel") : chat.online ? t("onlineNow") : t("offline")}
            </p>
          </div>
        </div>
        <div className="chat-header-actions flex shrink-0 gap-1 sm:gap-2">
          <div className="hidden min-[421px]:block md:hidden"><LanguageSwitcher compact /></div>
          <div className="hidden min-[421px]:block md:hidden"><ThemeToggle compact /></div>
          {disappearLabel && (
            <span className="theme-soft theme-muted hidden items-center gap-1.5 rounded-xl px-3 text-xs font-bold sm:flex" title={t("disappearingTitle")}>
              <FiClock size={13} /> {disappearLabel}
            </span>
          )}
          <button type="button" aria-label={t("searchInChat")} onClick={() => { setSearchOpen((open) => !open); setSearchText(""); onSearchInChat?.(""); }} className="theme-icon-button grid h-10 w-10 place-items-center"><FiSearch /></button>
          <button type="button" aria-label={t("voiceCall")} onClick={onCall} className="theme-icon-button grid h-10 w-10 place-items-center sm:grid"><FiPhone /></button>
          <div className="relative" ref={menuRef}>
            <button type="button" aria-label={t("moreOptions")} onClick={() => setMenuOpen((open) => !open)} className={`theme-icon-button grid h-10 w-10 place-items-center transition ${menuOpen ? "bg-[var(--app-soft-hover)]" : ""}`}>
              <FiMoreVertical />
            </button>
            {menuOpen && (
              <div className="glass absolute right-0 top-12 z-20 max-h-[26rem] w-72 overflow-y-auto rounded-2xl p-2 shadow-2xl">
                <ul className="space-y-0.5">
                  {item(FiUser, "viewProfile", onOpenProfile)}
                  {item(FiSearch, "searchInChat", () => { setSearchOpen(true); })}
                  {item(FiImage, "sharedMedia", onSharedMedia)}
                  <li><Divider /></li>
                  {!chat.isGroup && item(muted ? FiBell : FiBellOff, muted ? "unmuteChat" : "muteChat", onToggleMute)}
                  {item(pinned ? FiBookmark : FiBookmark, pinned ? "unpinChat" : "pinChat", onTogglePin)}
                  {item(FiStar, favorite ? "removeFavorite" : "addFavorite", onToggleFavorite)}
                  {item(FiEdit2, "nickname", onNickname)}
                  <li><Divider /></li>
                  {item(FiImage, "changeWallpaper", onWallpaper)}
                  {item(FiClock, "disappearingTitle", onDisappearing, false, disappearLabel && (
                    <span className="theme-muted text-xs font-bold">{disappearLabel}</span>
                  ))}
                  <li><Divider /></li>
                  {item(FiDownload, "exportChat", onExport)}
                  {item(FiDelete, "clearChat", onClearChat)}
                  {!chat.isGroup && item(FiSlash, blocked ? "unblockUser" : "blockUser", onToggleBlock, true, blocked && (
                    <span className="rounded-md bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">ON</span>
                  ))}
                  {item(FiFlag, "reportUser", onReport, true)}
                  <li><Divider /></li>
                  {item(FiTrash2, "deleteConversation", onDeleteChat, true)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>
      {searchOpen && (
        <div className="theme-divider border-b px-3 py-2.5 sm:px-5">
          <label className="theme-field theme-focus flex items-center gap-2 rounded-xl px-3 py-2">
            <FiSearch className="theme-muted shrink-0" />
            <input
              autoFocus
              value={searchText}
              onChange={(event) => { setSearchText(event.target.value); onSearchInChat?.(event.target.value); }}
              placeholder={t("searchInChat")}
              className="theme-text w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            {searchText && (
              <button type="button" onClick={() => { setSearchOpen(false); setSearchText(""); onSearchInChat?.(""); }} className="theme-icon-button grid h-7 w-7 place-items-center"><FiX size={14} /></button>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="mx-2 my-1 border-t border-[var(--app-border)]" />;
}

function disappearSecondsLabel(seconds) {
  if (seconds >= 604800) return "7d";
  if (seconds >= 86400) return "24h";
  if (seconds >= 3600) return "1h";
  if (seconds >= 600) return "10m";
  return "";
}
