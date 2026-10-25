import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiLoader, FiMessageCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import ChatHeader from "../components/ChatHeader";
import CallModal from "../components/CallModal";
import ContactProfileModal from "../components/ContactProfileModal";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import NewConversationPanel from "../components/NewConversationPanel";
import RequestsPanel from "../components/RequestsPanel";
import SettingsPanel from "../components/SettingsPanel";
import Sidebar from "../components/Sidebar";
import useAudioCall from "../hooks/useAudioCall";
import {
  ConfirmActionModal, DisappearingModal, NicknameModal, ReportModal, SharedMediaModal, WALLPAPERS, WallpaperModal,
} from "../components/ChatOptionDialogs";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";
import { getChatPrefs, setChatPref } from "../services/chatPrefs";
import { connectSocket, disconnectSocket } from "../services/socket";
import { clearSession, getSession, saveSession } from "../services/session";

const formatTime = (date, locale) => (date ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(date)) : "");
const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || value);
  return String(value);
};

const profileFromUser = (user) => ({
  name: user.name || "Chatly user",
  email: user.email || "",
  username: user.username || "",
  role: user.status || "Available",
  bio: user.bio || "",
  avatar: user.avatar || "",
  showActiveStatus: user.showActiveStatus !== false,
});

const messageToView = (message, userId, locale) => ({
    id: String(message._id),
    senderId: getId(message.sender),
    from: getId(message.sender) === userId ? "me" : "them",
    text: message.text,
    fileUrl: message.fileUrl || "",
    fileName: message.fileName || "",
    fileType: message.fileType || "",
    system: message.system || false,
    callStatus: message.callStatus || "",
    callDuration: message.callDuration || 0,
    reactions: message.reactions || [],
    time: formatTime(message.createdAt, locale),
    status: message.status,
  });

const conversationToView = (conversation, userId, locale) => {
  const members = conversation.members || [];
  const other = members.find((member) => getId(member) !== userId);
  return {
    id: String(conversation._id),
    isGroup: conversation.isGroup,
    name: conversation.isGroup ? conversation.groupName : other?.name || "New conversation",
    avatar: conversation.isGroup ? "" : other?.avatar || "",
    chatlyId: conversation.isGroup ? "" : other?.chatlyId || "",
    otherUser: other ? { ...other, _id: getId(other) } : null,
    otherUserId: other ? getId(other) : "",
    memberIds: members.map(getId),
    online: other?.isOnline || false,
    unread: 0,
    disappearAfter: conversation.disappearAfter || 0,
    lastMessage: conversation.lastMessage ? { text: conversation.lastMessage.text, time: formatTime(conversation.lastMessage.createdAt, locale) } : null,
    messages: [],
  };
};

const onlineUsersFromConversations = (conversations, userId) => [...new Set(
  conversations.flatMap((conversation) => conversation.members || [])
    .filter((member) => member.isOnline && getId(member) !== userId)
    .map(getId),
)];

const DEFAULT_PREFS = { muted: false, pinned: false, favorite: false, nickname: "", wallpaper: -1 };

export default function RealTimeChat() {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [currentUser, setCurrentUser] = useState(() => getSession()?.user || null);
  const userId = currentUser?._id ? String(currentUser._id) : "";
  const [profile, setProfile] = useState(() => profileFromUser(getSession()?.user || {}));
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [onlineIds, setOnlineIds] = useState([]);
  const [typing, setTyping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);
  const [prefsMap, setPrefsMap] = useState({});
  const [chatSearch, setChatSearch] = useState("");
  const [dialogState, setDialogState] = useState(null);
  const socketRef = useRef(null);
  const chatsRef = useRef([]);
  const activeIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const requestPollRef = useRef(null);
  const prefsRef = useRef({});

  // Audio call hook
  const call = useAudioCall(socketRef.current, profile.name);

  useEffect(() => { chatsRef.current = chats; }, [chats]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { prefsRef.current = prefsMap; }, [prefsMap]);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? "" : current)), 4000);
  }, []);

  const refreshRequestBadge = useCallback(async () => {
    try {
      const { data: network } = await api.get("/friends");
      setRequestsCount(network.incoming?.length || 0);
    } catch {
      /* silent — badge refreshes again on next poll */
    }
  }, []);

  const refreshChats = useCallback(async () => {
    const { data } = await api.get("/conversations");
    setChats(data.map((conversation) => conversationToView(conversation, userId, locale)));
    setOnlineIds(onlineUsersFromConversations(data, userId));
  }, [locale, userId]);

  const handleFriendRequestChanged = useCallback(async (action) => {
    await refreshRequestBadge();
    if (action === "accept") {
      try {
        await refreshChats();
      } catch {
        setError(t("serverError"));
      }
    }
  }, [refreshChats, refreshRequestBadge, t]);

  const addIncomingMessage = useCallback((message) => {
    const conversationId = getId(message.conversation);
    if (!chatsRef.current.some((chat) => chat.id === conversationId)) {
      refreshChats().catch(() => {});
      return;
    }
    if (prefsRef.current[conversationId]?.muted) return;
    const nextMessage = messageToView(message, userId, locale);
    setChats((previousChats) => {
      const updatedChats = previousChats.map((chat) => {
        if (chat.id !== conversationId) return chat;
        if (chat.messages.some((item) => item.id === nextMessage.id)) return chat;
        return {
          ...chat,
          messages: [...chat.messages, nextMessage],
          lastMessage: nextMessage,
          unread: nextMessage.from === "them" && activeIdRef.current !== conversationId ? chat.unread + 1 : chat.unread,
        };
      });
      const changed = updatedChats.find((chat) => chat.id === conversationId);
      return changed ? [changed, ...updatedChats.filter((chat) => chat.id !== conversationId)] : updatedChats;
    });
  }, [locale, refreshChats, userId]);

  useEffect(() => {
    const session = getSession();
    if (!session?.token || !userId) {
      navigate("/login", { replace: true });
      return undefined;
    }
    let ignore = false;

    const bootstrap = async () => {
      try {
        const [{ data: me }, { data: conversations }, { data: network }] = await Promise.all([
          api.get("/users/me"),
          api.get("/conversations"),
          api.get("/friends"),
        ]);
        if (ignore) return;
        saveSession({ user: me });
        setCurrentUser(me);
        setProfile(profileFromUser(me));
        setChats(conversations.map((conversation) => conversationToView(conversation, userId, locale)));
        setOnlineIds(onlineUsersFromConversations(conversations, userId));
        setRequestsCount(network.incoming?.length || 0);
        const initialPrefs = {};
        conversations.forEach((conversation) => { initialPrefs[conversation._id] = getChatPrefs(String(conversation._id)); });
        setPrefsMap(initialPrefs);

        const liveSocket = connectSocket(session.token);
        socketRef.current = liveSocket;
        liveSocket.on("receiveMessage", addIncomingMessage);
        liveSocket.on("typing", ({ conversationId, userId: senderId, name }) => {
          if (String(senderId) !== userId) setTyping({ conversationId: String(conversationId), name });
        });
        liveSocket.on("stopTyping", ({ conversationId }) => setTyping((current) => (current?.conversationId === String(conversationId) ? null : current)));
        liveSocket.on("onlineUsers", (ids) => setOnlineIds(ids.map(String)));
        liveSocket.on("userOnline", (id) => setOnlineIds((ids) => [...new Set([...ids, String(id)])]));
        liveSocket.on("userOffline", (id) => setOnlineIds((ids) => ids.filter((item) => item !== String(id))));
        liveSocket.on("friendRequestAccepted", () => {
          refreshChats().catch(() => setError(t("serverError")));
          refreshRequestBadge();
        });
        liveSocket.on("messagesSeen", ({ conversationId, seenBy }) => {
          if (String(seenBy) === userId) return;
          setChats((previousChats) => previousChats.map((chat) => (
            chat.id === String(conversationId)
              ? { ...chat, messages: chat.messages.map((message) => (message.from === "me" ? { ...message, status: "seen" } : message)) }
              : chat
          )));
        });
        liveSocket.on("conversationUpdated", ({ conversationId, disappearAfter }) => {
          setChats((previousChats) => previousChats.map((chat) => (
            chat.id === String(conversationId) ? { ...chat, disappearAfter: disappearAfter || 0 } : chat
          )));
        });
        liveSocket.on("reactionUpdated", ({ messageId, reactions }) => {
          setChats((previousChats) => previousChats.map((chat) => ({
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === String(messageId) ? { ...message, reactions } : message
            ),
          })));
        });
        liveSocket.on("connect_error", () => { setError(t("liveUnavailable")); setLiveConnected(false); });
        liveSocket.on("connect", () => { setError(""); setLiveConnected(true); });
        liveSocket.on("disconnect", () => setLiveConnected(false));

        requestPollRef.current = window.setInterval(refreshRequestBadge, 60000);
      } catch (requestError) {
        if (requestError.response?.status === 401 || requestError.response?.status === 403) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setError(t("serverError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      ignore = true;
      window.clearTimeout(typingTimerRef.current);
      window.clearInterval(requestPollRef.current);
      disconnectSocket();
    };
  }, [addIncomingMessage, locale, navigate, refreshChats, refreshRequestBadge, t, userId]);

  const displayChats = useMemo(() => chats
    .map((chat) => {
      const prefs = prefsMap[chat.id] || DEFAULT_PREFS;
      return {
        ...chat,
        name: prefs.nickname || chat.name,
        favorite: prefs.favorite,
        pinned: prefs.pinned,
        muted: prefs.muted,
        online: chat.isGroup ? chat.memberIds.some((id) => id !== userId && onlineIds.includes(id)) : onlineIds.includes(chat.otherUserId),
      };
    })
    .sort((first, second) => (second.pinned === first.pinned ? 0 : second.pinned ? 1 : -1)), [chats, onlineIds, prefsMap, userId]);
  const activeChat = displayChats.find((chat) => chat.id === activeId);
  const activePrefs = activeId ? (prefsMap[activeId] || DEFAULT_PREFS) : DEFAULT_PREFS;
  const blockedIds = currentUser?.blocking?.map(getId) || [];
  const chatBlocked = activeChat?.otherUserId ? blockedIds.includes(activeChat.otherUserId) : false;

  const filteredMessages = useMemo(() => {
    if (!activeChat) return [];
    const keyword = chatSearch.trim().toLowerCase();
    if (!keyword) return activeChat.messages;
    return activeChat.messages.filter((message) => String(message.text || "").toLowerCase().includes(keyword));
  }, [activeChat, chatSearch]);

  const refreshChatPrefs = (chatId) => {
    const prefs = getChatPrefs(chatId);
    setPrefsMap((current) => ({ ...current, [chatId]: prefs }));
  };

  const handleSelect = async (id) => {
    setActiveId(id);
    setTyping(null);
    setChatSearch("");
    refreshChatPrefs(id);
    setChats((previousChats) => previousChats.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)));
    try {
      const { data } = await api.get(`/messages/${id}`);
      const messages = data.map((message) => messageToView(message, userId, locale));
      setChats((previousChats) => previousChats.map((chat) => (chat.id === id ? { ...chat, messages, unread: 0 } : chat)));
      socketRef.current?.emit("markSeen", { conversationId: id });
    } catch (requestError) {
      setError(t("historyError"));
    }
  };

  const stopTyping = () => {
    window.clearTimeout(typingTimerRef.current);
    if (activeIdRef.current) socketRef.current?.emit("stopTyping", { conversationId: activeIdRef.current });
  };

  const handleTyping = () => {
    const conversationId = activeIdRef.current;
    if (!conversationId || !socketRef.current?.connected) return;
    socketRef.current.emit("typing", { conversationId });
    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(stopTyping, 900);
  };

  const handleSend = (text, file = null) => {
    const conversationId = activeIdRef.current;
    if (!conversationId || !socketRef.current?.connected) {
      setError(t("connectionNotReady"));
      return;
    }
    stopTyping();
    const payload = { conversationId, text: text || "" };
    if (file) {
      payload.fileUrl = file.fileUrl;
      payload.fileName = file.fileName;
      payload.fileType = file.fileType;
    }
    socketRef.current.emit("sendMessage", payload, (result) => {
      if (!result?.ok) setError(result?.error || t("sendError"));
    });
  };

  const handleStartConversation = async (user) => {
    const { data } = await api.post("/conversations", { userId: user._id });
    const chat = conversationToView(data, userId, locale);
    setChats((previousChats) => [chat, ...previousChats.filter((item) => item.id !== chat.id)]);
    setActiveId(chat.id);
    socketRef.current?.emit("markSeen", { conversationId: chat.id });
  };

  const handleProfileSave = async (nextProfile) => {
    const { data } = await api.put("/users/me", {
      name: nextProfile.name,
      bio: nextProfile.bio,
      avatar: nextProfile.avatar,
      username: nextProfile.username,
    });
    saveSession({ user: data });
    setCurrentUser(data);
    setProfile(profileFromUser(data));
  };

  const handleToggleActiveStatus = async (show) => {
    try {
      const { data } = await api.put("/users/me", { showActiveStatus: show });
      saveSession({ user: data });
      setCurrentUser(data);
      setProfile(profileFromUser(data));
      socketRef.current?.emit("setActiveStatus", { visible: show }, (result) => {
        if (!result?.ok) setError(t("activeStatusError"));
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("activeStatusError"));
    }
  };

  const currentPrefs = (chatId) => prefsMap[chatId] || DEFAULT_PREFS;

  const withActive = (handler) => () => {
    const chatId = activeIdRef.current;
    if (chatId) handler(chatId);
  };

  const togglePref = (key) => withActive((chatId) => {
    const prefs = currentPrefs(chatId);
    setChatPref(chatId, key, !prefs[key]);
    refreshChatPrefs(chatId);
  });

  const handleNicknameSave = (nickname) => withActive((chatId) => {
    setChatPref(chatId, "nickname", nickname);
    refreshChatPrefs(chatId);
  })();

  const handleWallpaperSave = (wallpaperId) => withActive((chatId) => {
    setChatPref(chatId, "wallpaper", wallpaperId);
    refreshChatPrefs(chatId);
  })();

  const handleDisappearingSave = async (seconds) => {
    const chatId = activeIdRef.current;
    if (!chatId) return;
    try {
      await api.patch(`/conversations/${chatId}/settings`, { disappearAfter: seconds });
      setChats((previousChats) => previousChats.map((chat) => (chat.id === chatId ? { ...chat, disappearAfter: seconds } : chat)));
      showNotice(t("disappearUpdated"));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("sendError"));
    }
  };

  const toggleReaction = (messageId, emoji) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("toggleReaction", { messageId, emoji }, (result) => {
      if (!result?.ok) setError(result?.error || t("sendError"));
    });
  };

  const handleExportChat = async () => {
    const chat = chatsRef.current.find((item) => item.id === activeIdRef.current);
    if (!chat) return;
    try {
      const { data: messages } = await api.get(`/messages/${chat.id}`);
      const lines = messages.map((message) => {
        const senderName = getId(message.sender) === userId ? profile.name : chat.name;
        return `[${message.createdAt ? new Date(message.createdAt).toLocaleString(locale) : ""}] ${senderName}: ${message.text}`;
      });
      const content = [`Chatly — ${chat.name}`, `Exported: ${new Date().toLocaleString(locale)}`, "".padEnd(40, "-"), "", ...lines].join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Chatly-${chat.name.replace(/[^\w-]+/g, "_")}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      showNotice(t("exportDone"));
    } catch (requestError) {
      setError(t("historyError"));
    }
  };

  const handleClearChat = async () => {
    const chatId = activeIdRef.current;
    if (!chatId) return;
    try {
      await api.post(`/messages/clear/${chatId}`);
      setChats((previousChats) => previousChats.map((chat) => (
        chat.id === chatId ? { ...chat, messages: [], lastMessage: null, unread: 0 } : chat
      )));
      showNotice(t("clearChatDone"));
    } catch (requestError) {
      setError(t("historyError"));
    }
  };

  const handleDeleteChat = async () => {
    const chatId = activeIdRef.current;
    if (!chatId) return;
    try {
      await api.delete(`/conversations/${chatId}`);
      setChats((previousChats) => previousChats.filter((chat) => chat.id !== chatId));
      setActiveId(null);
      showNotice(t("deleteChatDone"));
    } catch (requestError) {
      setError(t("historyError"));
    }
  };

  const handleToggleBlock = async () => {
    const chat = chatsRef.current.find((item) => item.id === activeIdRef.current);
    if (!chat?.otherUserId) return;
    const isCurrentlyBlocked = blockedIds.includes(chat.otherUserId);
    try {
      await api.post(isCurrentlyBlocked ? "/users/unblock" : "/users/block", { userId: chat.otherUserId });
      const me = await api.get("/users/me");
      saveSession({ user: me.data });
      setCurrentUser(me.data);
      showNotice(isCurrentlyBlocked ? t("unblockDone") : t("blockDone"));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("sendError"));
    }
  };

  const handleReportSubmit = async (reason) => {
    const chat = chatsRef.current.find((item) => item.id === activeIdRef.current);
    if (!chat?.otherUserId) return;
    try {
      await api.post("/users/report", { userId: chat.otherUserId, conversationId: chat.id, reason });
      showNotice(t("reportDone"));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || t("sendError"));
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    navigate("/login", { replace: true });
  };

  if (!currentUser) return null;

  return (
    <div className="bg-aurora h-dvh min-h-0 p-0 sm:p-3 md:p-5">
      <div className="relative z-10 mx-auto flex h-full max-w-7xl gap-0 sm:gap-4">
        <div className={`${activeChat ? "hidden md:block" : "block"} h-full w-full md:w-auto`}>
          <Sidebar
            chats={displayChats}
            activeId={activeId}
            onSelect={handleSelect}
            profile={profile}
            live={liveConnected}
            onOpenSettings={() => setSettingsOpen(true)}
            onNewChat={() => setNewConversationOpen(true)}
            onLogout={handleLogout}
            onOpenRequests={() => setRequestsOpen(true)}
            requestsCount={requestsCount}
          />
        </div>
        <main className={`${activeChat ? "flex" : "hidden md:flex"} glass h-full min-w-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-3xl`}>
          {loading ? (
            <div className="theme-muted flex flex-1 flex-col items-center justify-center gap-3 text-sm"><FiLoader className="animate-spin text-violet-500" size={24} /> {t("loadingChats")}</div>
          ) : activeChat ? (
            <>
              <ChatHeader
                chat={activeChat}
                onBack={() => setActiveId(null)}
                live={liveConnected}
                blocked={chatBlocked}
                disappearAfter={activeChat.disappearAfter}
                notes={activePrefs}
                onToggleMute={togglePref("muted")}
                onTogglePin={togglePref("pinned")}
                onToggleFavorite={togglePref("favorite")}
                onOpenProfile={() => setDialogState({ type: "profile" })}
                onSearchInChat={setChatSearch}
                onSharedMedia={() => setDialogState({ type: "media" })}
                onNickname={() => setDialogState({ type: "nickname", initial: activePrefs.nickname })}
                onWallpaper={() => setDialogState({ type: "wallpaper", current: activePrefs.wallpaper })}
                onDisappearing={() => setDialogState({ type: "disappearing", current: activeChat.disappearAfter })}
                onExport={withActive(handleExportChat)}
                onClearChat={() => setDialogState({ type: "confirmClear" })}
                onDeleteChat={() => setDialogState({ type: "confirmDelete" })}
                onReport={() => setDialogState({ type: "report" })}
                onToggleBlock={() => setDialogState({ type: "confirmBlock" })}
                onCall={() => activeChat?.otherUser && call.startCall(activeChat.otherUser, activeChat.id)}
              />
              <MessageList
                messages={filteredMessages}
                typing={typing?.conversationId === activeChat.id}
                name={typing?.name || activeChat.name}
                wallpaperClass={WALLPAPERS.find((wallpaper) => wallpaper.id === activePrefs.wallpaper)?.className || ""}
                onToggleReaction={toggleReaction}
                currentUserId={userId}
              />
              <MessageInput onSend={handleSend} onTyping={handleTyping} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
              <div className="chat-empty-icon float-soft rounded-[1.75rem] bg-gradient-to-br from-violet-500 to-pink-500 p-6 text-white"><FiMessageCircle size={40} /></div>
              <div><p className="theme-text text-xl font-bold">{t("welcomeTitle")}</p><p className="theme-muted mt-2 text-sm">{t("welcomeText")}</p></div>
              <button type="button" onClick={() => setNewConversationOpen(true)} className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25">{t("startConversation")}</button>
            </div>
          )}
        </main>
      </div>
      {error && <button type="button" onClick={() => setError("")} className="chat-error-toast fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-rose-500/20 bg-rose-500/12 px-4 py-3 text-sm text-rose-500 shadow-lg backdrop-blur">{error}</button>}
      {notice && <button type="button" onClick={() => setNotice("")} className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 translate-y-14 rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-4 py-3 text-sm font-semibold text-emerald-500 shadow-lg backdrop-blur">{notice}</button>}
      <NewConversationPanel isOpen={newConversationOpen} onClose={() => setNewConversationOpen(false)} onStart={handleStartConversation} />
      <RequestsPanel isOpen={requestsOpen} onClose={() => setRequestsOpen(false)} onChanged={handleFriendRequestChanged} />
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSave={handleProfileSave}
        live={liveConnected}
        showActiveStatus={currentUser.showActiveStatus !== false}
        onToggleActiveStatus={handleToggleActiveStatus}
      />
      <ContactProfileModal
        isOpen={dialogState?.type === "profile"}
        contact={activeChat?.otherUser || null}
        chatOnline={activeChat?.online || false}
        blocked={chatBlocked}
        onClose={() => setDialogState(null)}
      />
      <NicknameModal
        isOpen={dialogState?.type === "nickname"}
        chatName={activeChat?.name || ""}
        initial={dialogState?.initial}
        onClose={() => setDialogState(null)}
        onSave={handleNicknameSave}
      />
      <WallpaperModal
        isOpen={dialogState?.type === "wallpaper"}
        current={dialogState?.current}
        onClose={() => setDialogState(null)}
        onSelect={handleWallpaperSave}
      />
      <DisappearingModal
        isOpen={dialogState?.type === "disappearing"}
        current={dialogState?.current}
        onClose={() => setDialogState(null)}
        onSelect={handleDisappearingSave}
      />
      <SharedMediaModal isOpen={dialogState?.type === "media"} onClose={() => setDialogState(null)} />
      <ReportModal
        isOpen={dialogState?.type === "report"}
        onClose={() => setDialogState(null)}
        onSubmit={handleReportSubmit}
      />
      <ConfirmActionModal
        isOpen={dialogState?.type === "confirmClear"}
        titleKey="clearChat"
        hintKey="clearChatHint"
        confirmLabelKey="clearChat"
        onConfirm={() => { setDialogState(null); handleClearChat(); }}
        onClose={() => setDialogState(null)}
      />
      <ConfirmActionModal
        isOpen={dialogState?.type === "confirmDelete"}
        titleKey="deleteConversation"
        hintKey="deleteChatHint"
        confirmLabelKey="deleteConversation"
        onConfirm={() => { setDialogState(null); handleDeleteChat(); }}
        onClose={() => setDialogState(null)}
      />
      <ConfirmActionModal
        isOpen={dialogState?.type === "confirmBlock"}
        titleKey={chatBlocked ? "unblockUser" : "blockUser"}
        hintKey={chatBlocked ? "unblockChatHint" : "blockChatHint"}
        confirmLabelKey={chatBlocked ? "unblockUser" : "blockUser"}
        onConfirm={() => { setDialogState(null); handleToggleBlock(); }}
        onClose={() => setDialogState(null)}
      />
      <CallModal {...call} />
    </div>
  );
}
