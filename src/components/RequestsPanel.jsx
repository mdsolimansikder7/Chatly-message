import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiClock, FiInfo, FiLoader, FiX } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import Avatar from "./Avatar";

export default function RequestsPanel({ isOpen, onClose, onChanged }) {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { t } = useLanguage();

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/friends");
      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("networkError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(loadNetwork, 120);
    return () => window.clearTimeout(timer);
  }, [isOpen, loadNetwork]);

  useEffect(() => {
    if (isOpen) return;
    setIncoming([]);
    setOutgoing([]);
    setError("");
    setBusyId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const respond = async (requestId, action) => {
    if (busyId) return;
    setBusyId(requestId);
    setError("");
    try {
      await api.post(`/friends/requests/${requestId}/${action}`);
      setIncoming((previous) => previous.filter((item) => item._id !== requestId));
      onChanged?.(action);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t(action === "accept" ? "friendAcceptError" : "friendRejectError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="requests-overlay fixed inset-0 z-40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="requests-title">
      <button type="button" aria-label={t("closePanel")} onClick={onClose} className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-sm" />
      <section className="requests-panel glass relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] p-6 shadow-2xl">
        <div className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-500">{t("friendRequests")}</p>
            <h2 id="requests-title" className="theme-text mt-1 text-xl font-bold">{t("incomingLabel")}</h2>
          </div>
          <button type="button" aria-label={t("closePanel")} onClick={onClose} className="theme-icon-button grid h-10 w-10 place-items-center"><FiX size={19} /></button>
        </div>

        <div className="requests-list max-h-80 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{error}</p>}
          {loading && (
            <p className="theme-muted flex flex-col items-center gap-2 px-3 py-9 text-center text-sm">
              <FiLoader size={22} className="animate-spin text-violet-500" />
              {t("loadingRequests")}
            </p>
          )}
          {!loading && !error && incoming.length === 0 && outgoing.length === 0 && (
            <p className="theme-muted px-3 py-9 text-center text-sm">{t("noRequests")}</p>
          )}

          {!loading && incoming.map((request) => (
            <div key={request._id} className="request-card request-card-incoming theme-soft flex min-w-0 items-center gap-3 rounded-2xl p-3">
              <div className="request-identity flex min-w-0 flex-1 items-center gap-3">
                <span className="shrink-0"><Avatar name={request.user.name} image={request.user.avatar} online={request.user.isOnline} size="h-11 w-11" /></span>
                <div className="min-w-0 flex-1">
                  <p className="theme-text truncate text-sm font-bold">{request.user.name}</p>
                  <p className="theme-muted truncate text-xs">{request.user.email}</p>
                </div>
              </div>
              <div className="request-actions flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => respond(request._id, "accept")}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition hover:brightness-110 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {busyId === request._id ? <FiLoader size={13} className="animate-spin" /> : <FiCheck size={13} />}
                  {t("acceptRequest")}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => respond(request._id, "reject")}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/25 transition hover:brightness-110 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {busyId === request._id ? <FiLoader size={13} className="animate-spin" /> : <FiX size={13} />}
                  {t("rejectRequest")}
                </button>
              </div>
            </div>
          ))}

          {!loading && outgoing.length > 0 && (
            <div className="pt-3">
              <p className="theme-muted mb-2 px-3 text-xs font-bold uppercase tracking-[0.14em]">{t("sentLabel")}</p>
              {outgoing.map((request) => (
                <div key={request._id} className="request-card theme-soft mb-1 flex min-w-0 items-center gap-3 rounded-2xl p-3">
                  <span className="shrink-0"><Avatar name={request.user.name} image={request.user.avatar} size="h-11 w-11" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="theme-text truncate text-sm font-bold">{request.user.name}</p>
                    <p className="theme-muted truncate text-xs">{request.user.email}</p>
                  </div>
                  <span className="theme-muted request-status flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold">
                    <FiClock size={13} /> {t("requestSent")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="requests-hint theme-muted mt-4 flex shrink-0 items-start gap-2 rounded-xl bg-[var(--app-soft)] px-3 py-2.5 text-xs">
          <FiInfo size={14} className="mt-0.5 shrink-0" />
          {t("requestHint")}
        </p>
      </section>
    </div>
  );
}
