import { useState } from "react";
import { FiBellOff, FiBookmark, FiStar, FiChevronRight, FiLogOut, FiMessageCircle, FiPlus, FiSearch, FiSettings, FiBell } from "react-icons/fi";
import Avatar from "./Avatar";
import { useLanguage } from "../context/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar({ chats, activeId, onSelect, profile, onOpenSettings, onNewChat, onLogout, onOpenRequests, requestsCount, live }) {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();
  const filteredChats = chats.filter((chat) => chat.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="glass flex h-full w-full flex-col rounded-none p-3 sm:rounded-3xl sm:p-4 md:w-80 lg:w-96">
      <div className="sidebar-header mb-4 flex items-center justify-between gap-2 sm:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="brand-ring grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white"><FiMessageCircle size={17} /></span>
            <h1 className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Chatly</h1>
          </div>
          <p className="mt-2 text-xs font-medium theme-muted">{t("brandTagline")}</p>
        </div>
        <div className="sidebar-header-actions flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher compact />
          <div className="hidden min-[421px]:block"><ThemeToggle compact /></div>
          <button type="button" onClick={onOpenRequests} aria-label={t("friendRequests")} className="theme-icon-button relative grid h-10 w-10 place-items-center">
            <FiBell />
            {requestsCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-1 text-[10px] font-bold text-white">
                {requestsCount}
              </span>
            )}
          </button>
          <button type="button" onClick={onNewChat} aria-label={t("newChat")} className="theme-icon-button grid h-10 w-10 place-items-center">
          <FiPlus />
          </button>
        </div>
      </div>

      <label className="theme-field theme-focus mb-4 flex items-center gap-2 rounded-2xl border border-transparent px-3 py-3 shadow-sm transition focus-within:border-violet-400/50 sm:mb-5 sm:px-4">
        <FiSearch className="theme-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchChats")}
          className="theme-text w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </label>

      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] theme-muted">{t("messages")}</p>
        <span className="theme-muted text-xs">{t("onlineCount", { count: chats.filter((chat) => chat.online).length })}</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {filteredChats.map((chat) => {
          const lastMessage = chat.lastMessage || chat.messages.at(-1);
          const isActive = chat.id === activeId;

          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelect(chat.id)}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                isActive ? "bg-gradient-to-r from-violet-500/30 to-pink-500/20 shadow-sm ring-1 ring-violet-400/20" : "theme-soft"
              }`}
            >
              <Avatar name={chat.name} image={chat.avatar} online={chat.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="theme-text flex items-center gap-1.5 truncate font-semibold">
                    {chat.pinned && <FiBookmark size={11} className="shrink-0 rotate-45 text-violet-500" />}
                    {chat.favorite && <FiStar size={11} className="shrink-0 text-amber-400" />}
                    {chat.name}
                  </p>
                  <span className="theme-muted shrink-0 text-xs">{lastMessage?.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="theme-muted truncate text-sm">{lastMessage?.text || chat.chatlyId}</p>
                  {chat.unread > 0 && !chat.muted && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-1.5 text-xs font-bold text-white">
                      {chat.unread}
                    </span>
                  )}
                  {chat.muted && <FiBellOff size={12} className="theme-muted shrink-0" />}
                </div>
              </div>
            </button>
          );
        })}
        {filteredChats.length === 0 && <p className="theme-muted px-3 py-8 text-center text-sm">{t("noChats")}</p>}
      </div>

      <div className="theme-divider mt-3 border-t pt-3">
        <button type="button" onClick={onOpenSettings} className="theme-soft flex w-full items-center gap-3 rounded-2xl p-3 text-left">
          <Avatar name={profile.name} image={profile.avatar} size="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="theme-text truncate text-sm font-bold">{profile.name}</p>
            <p className={`theme-muted mt-0.5 flex items-center gap-1.5 truncate text-xs font-bold ${live ? "text-emerald-500" : ""}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${live ? "bg-emerald-500" : "bg-gray-400"}`} />
              {live ? t("statusOnline") : t("statusOffline")}
            </p>
          </div>
          <span className="theme-muted grid h-8 w-8 place-items-center rounded-xl border border-[var(--app-border)]"><FiSettings size={15} /></span>
          <FiChevronRight className="theme-muted -ml-2" size={15} />
        </button>
        <button type="button" onClick={onLogout} className="theme-soft theme-muted mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition hover:text-rose-500"><FiLogOut size={15} /> {t("logout")}</button>
      </div>
    </aside>
  );
}
