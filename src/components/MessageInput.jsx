import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { FiMic, FiPaperclip, FiSend, FiSmile, FiSquare, FiTrash2 } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import api from "../services/api";

export default function MessageInput({ onSend, onTyping }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileRef = useRef(null);
  const emojiWrapRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const discardRecordingRef = useRef(false);
  const { t } = useLanguage();

  useEffect(() => {
    const onOutside = (event) => {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => () => {
    window.clearInterval(recordingTimerRef.current);
    if (recorderRef.current?.state === "recording") {
      discardRecordingRef.current = true;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const handleSend = () => {
    const message = text.trim();
    if (!message) return;
    onSend(message);
    setText("");
  };

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File 10MB-এর বেশি হতে পারবে না");
      e.target.value = "";
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/upload", fd);
      const { fileUrl, fileName, fileType } = res.data;
      onSend("", { fileUrl, fileName, fileType });
      setText("");
    } catch (err) {
      setUploadError(err.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const uploadVoiceMessage = async (blob) => {
    if (!blob.size) return;
    setUploading(true);
    setUploadError("");
    const extension = blob.type.includes("mp4") ? "m4a" : "webm";
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], `voice-message-${Date.now()}.${extension}`, { type: blob.type || "audio/webm" }));
      const res = await api.post("/upload", fd);
      const { fileUrl, fileName, fileType } = res.data;
      onSend("", { fileUrl, fileName, fileType });
    } catch (err) {
      setUploadError(err.response?.data?.message || "Voice message upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (recording || uploading) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setUploadError("Voice messages are not supported in this browser.");
      return;
    }

    try {
      setUploadError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      const chunks = [];

      streamRef.current = stream;
      recorderRef.current = recorder;
      discardRecordingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        window.clearInterval(recordingTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        setRecordingSeconds(0);
        if (!discardRecordingRef.current) uploadVoiceMessage(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };

      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (err) {
      setUploadError("Microphone permission is needed to record a voice message.");
    }
  };

  const stopRecording = (discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    discardRecordingRef.current = discard;
    if (recorder.state !== "inactive") recorder.stop();
  };

  return (
    <div className="message-input-area relative p-2 sm:p-4">
      <div className="message-composer glass theme-focus flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.16)] sm:gap-2 sm:px-3 sm:py-2">
        {recording ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-sm font-semibold text-rose-500">
              <span className="recording-dot h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
              <span className="truncate">Recording voice message</span>
              <span className="ml-auto tabular-nums">{formatDuration(recordingSeconds)}</span>
            </div>
            <button type="button" onClick={() => stopRecording(true)} aria-label="Discard voice message" className="theme-muted rounded-full p-2 transition hover:text-rose-500">
              <FiTrash2 size={19} />
            </button>
            <button type="button" onClick={() => stopRecording(false)} aria-label="Send voice message" className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 p-3 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105 active:scale-95">
              <FiSquare size={16} fill="currentColor" />
            </button>
          </>
        ) : (
          <>
        <div ref={emojiWrapRef} className="relative">
          <button
            type="button"
            aria-label={t("addEmoji")}
            onClick={() => setShowEmoji((v) => !v)}
            className="theme-muted rounded-full p-2 transition hover:text-violet-500"
          >
            <FiSmile size={20} />
          </button>
          {showEmoji && (
            <div className="absolute bottom-full left-0 z-30 mb-2">
              <EmojiPicker
                height={350}
                width={320}
                onEmojiClick={handleEmoji}
                theme="dark"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label={t("attachFile")}
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          className="theme-muted rounded-full p-2 transition hover:text-violet-500 disabled:opacity-50"
        >
          <FiPaperclip size={20} />
        </button>

        <input
          type="file"
          ref={fileRef}
          hidden
          onChange={handleFile}
          accept="image/*,.pdf,.doc,.docx,.txt,audio/*"
        />

        <button
          type="button"
          onClick={startRecording}
          disabled={uploading}
          aria-label="Record a voice message"
          className="theme-muted rounded-full p-2 transition hover:text-violet-500 disabled:opacity-50"
        >
          <FiMic size={20} />
        </button>

        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onTyping?.();
          }}
          onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && handleSend()}
          disabled={uploading}
          placeholder={uploading ? "Uploading..." : t("messagePlaceholder")}
          aria-label={t("messagePlaceholder")}
          className="message-composer-input theme-text flex-1 bg-transparent px-2 py-2 outline-none placeholder:text-gray-400"
        />

        <button
          type="button"
          onClick={handleSend}
          aria-label={t("sendMessage")}
          className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 p-3 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105 active:scale-95"
        >
          <FiSend size={18} />
        </button>
          </>
        )}
      </div>
      {uploadError && (
        <p className="mt-1.5 ml-4 text-xs text-rose-500">{uploadError}</p>
      )}
    </div>
  );
}
