import { useEffect, useState } from "react";
import { FiCheck, FiClock, FiLoader, FiMessageCircle, FiSearch, FiUserPlus, FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import Avatar from "./Avatar";

export default function NewConversationPanel({ isOpen, onClose, onStart }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [resultQuery, setResultQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    const keyword = query.trim();

    setUsers([]);
    setResultQuery("");
    setError("");
    if (keyword.length < 2) {
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    const search = async () => {
      try {
        const { data } = await api.get(`/users?search=${encodeURIComponent(keyword)}`, { signal: controller.signal });
        setUsers(data);
        setResultQuery(keyword);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(t("contactSearchError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const timeout = window.setTimeout(search, 280);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, query, t]);

  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setUsers([]);
    setResultQuery("");
    setError("");
    setBusyId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const serverMessage = (requestError) => requestError?.response?.data?.message || "";
  const connectionOf = (user) => user.connection?.status || "none";

  const handleStart = async (user) => {
    if (busyId) return;
    setBusyId(user._id);
    setError("");
    try {
      await onStart(user);
      onClose();
    } catch (requestError) {
      setError(serverMessage(requestError) || t("conversationError"));
    } finally {
      setBusyId(null);
    }
  };

  const handleSendRequest = async (user) => {
    if (busyId) return;
    setBusyId(user._id);
    setError("");
    try {
      await api.post("/friends/requests", { userId: user._id });
      setUsers((previous) => previous.map((item) => (
        item._id === user._id ? { ...item, connection: { status: "outgoing" } } : item
      )));
    } catch (requestError) {
      setError(serverMessage(requestError) || t("friendRequestError"));
    } finally {
      setBusyId(null);
    }
  };

  const handleAcceptRequest = async (user) => {
    if (busyId) return;
    setBusyId(user._id);
    setError("");
    try {
      await api.post(`/friends/requests/${user.connection?.requestId}/accept`);
      setUsers((previous) => previous.map((item) => (
        item._id === user._id ? { ...item, connection: { status: "friends" } } : item
      )));
      await onStart(user);
      onClose();
    } catch (requestError) {
      setError(serverMessage(requestError) || t("friendAcceptError"));
    } finally {
      setBusyId(null);
    }
  };

  const actionFor = (user) => {
    if (busyId) return null;
    const connection = connectionOf(user);
    if (connection === "friends") return () => handleStart(user);
    if (connection === "none") return () => handleSendRequest(user);
    if (connection === "incoming") return () => handleAcceptRequest(user);
    return null;
  };

  const actionView = (user) => {
    if (busyId === user._id) {
      return {
        label: t("sending"),
        icon: <FiLoader size={14} className="animate-spin" />,
        className: "theme-muted",
      };
    }
    const connection = connectionOf(user);
    if (connection === "friends") {
      return { label: t("messageAction"), icon: <FiMessageCircle size={14} />, className: "text-violet-500 bg-violet-500/12" };
    }
    if (connection === "none") {
      return { label: t("addFriend"), icon: <FiUserPlus size={14} />, className: "text-violet-500 bg-violet-500/12" };
    }
    if (connection === "incoming") {
      return { label: t("acceptRequest"), icon: <FiCheck size={14} />, className: "text-emerald-500 bg-emerald-500/12" };
    }
    return { label: t("requestSent"), icon: <FiClock size={14} />, className: "theme-muted" };
  };

  return (
    <div className="new-conversation-overlay fixed inset-0 z-40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
      <button type="button" aria-label={t("newChat")} onClick={onClose} className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-sm" />
      <section className="new-conversation-panel glass relative flex h-[min(34rem,calc(100dvh-2rem))] w-full min-w-0 max-w-md flex-col overflow-x-hidden rounded-[1.75rem] p-6 shadow-2xl">
        <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">{t("newConversation")}</p>
            <h2 id="new-chat-title" className="theme-text mt-1 text-xl font-bold leading-tight">{t("findContact")}</h2>
          </div>
          <button type="button" aria-label={t("newChat")} onClick={onClose} className="theme-icon-button grid h-10 w-10 shrink-0 place-items-center"><FiX size={19} /></button>
        </div>

        <label className="theme-field theme-focus flex w-full min-w-0 items-center gap-3 rounded-2xl px-4 py-3">
          <FiSearch className="theme-muted shrink-0" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchContact")} className="theme-text min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
          {loading && <FiLoader className="animate-spin text-violet-500" />}
        </label>

        <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
          {!query && <EmptyState text={t("searchPrompt")} />}
          {query && query.trim().length < 2 && <EmptyState text={t("searchCharacters")} />}
          {!loading && resultQuery === query.trim() && query.trim().length >= 2 && users.length === 0 && !error && <EmptyState text={t("noUsers")} />}
          {resultQuery === query.trim() && users.map((user) => {
            const action = actionFor(user);
            const view = actionView(user);
            return (
              <button
                key={user._id}
                type="button"
                onClick={action || undefined}
                disabled={!action}
                className={`new-conversation-user theme-soft flex w-full min-w-0 items-center gap-3 rounded-2xl p-3 text-left ${action ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="shrink-0"><Avatar name={user.name} image={user.avatar} online={user.isOnline} size="h-11 w-11" /></span>
                <div className="min-w-0 flex-1"><p className="theme-text truncate text-sm font-bold">{user.name}</p><p className="theme-muted truncate text-xs">{user.username ? `@${user.username} · ${user.email}` : user.email}</p></div>
                <span className={`new-conversation-action flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${view.className}`}>
                  {view.icon}
                  {view.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="theme-muted px-3 py-9 text-center text-sm">{text}</p>;
}
