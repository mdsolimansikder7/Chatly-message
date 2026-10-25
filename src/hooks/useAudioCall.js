import { useCallback, useEffect, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function useAudioCall(socket, myName) {
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connected | ended
  const [peer, setPeer] = useState(null); // { id, name }
  const [muted, setMuted] = useState(false);
  const [audioOutput, setAudioOutput] = useState("speaker");
  const [audioOutputMessage, setAudioOutputMessage] = useState("");
  const [callMessage, setCallMessage] = useState(""); // inline message shown on ended card
  const [callId, setCallId] = useState(null); // call record id for history

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const peerIdRef = useRef(null);
  const conversationIdRef = useRef(null);
  const stateRef = useRef("idle"); // listener- stale state এড়াতে
  const endTimerRef = useRef(null); // auto-hide ended card
  const ringtoneRef = useRef(null); // interval for the currently playing ringtone
  const ringtoneRequestedRef = useRef(false);
  const audioContextRef = useRef(null);

  const getAudioContext = () => {
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioContextRef.current = new AudioContext();
    return audioContextRef.current;
  };

  const stopRingtone = () => {
    ringtoneRequestedRef.current = false;
    const ringtone = ringtoneRef.current;
    if (!ringtone) return;

    window.clearInterval(ringtone.interval);
    ringtoneRef.current = null;
  };

  const startRingtone = () => {
    if (ringtoneRef.current) return;
    ringtoneRequestedRef.current = true;

    const context = getAudioContext();
    if (!context) return;

    try {
      const beginRinging = () => {
        if (!ringtoneRequestedRef.current || ringtoneRef.current) return;

        const ring = () => {
          if (context.state !== "running") return;
          const now = context.currentTime;
          [[660, 0], [880, 0.34]].forEach(([frequency, delay]) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.09, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.24);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(now + delay);
            oscillator.stop(now + delay + 0.24);
          });
        };

        ring();
        ringtoneRef.current = { interval: window.setInterval(ring, 1600) };
      };

      if (context.state === "suspended") {
        context.resume().then(beginRinging).catch(() => {});
      } else {
        beginRinging();
      }
    } catch (error) {
      // Keep the call UI usable when a browser does not support Web Audio.
      ringtoneRef.current = null;
    }
  };

  // An incoming call is delivered by Socket.IO, not a user gesture. Unlock audio on
  // the first interaction so browser autoplay rules do not silence the ringtone.
  useEffect(() => {
    const unlockAudio = () => {
      const context = getAudioContext();
      if (context?.state === "suspended") context.resume().catch(() => {});
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio);
      stopRingtone();
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const updateState = (s) => {
    stateRef.current = s;
    setCallState(s);
  };

  // সব কিছু পরিষ্কার করে idle-এ ফেরা (message থাকলে card আগের অবস্থায় থাকে)
  const cleanup = useCallback((message = "") => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      if (typeof remoteAudioRef.current.setSinkId === "function") {
        remoteAudioRef.current.setSinkId("default").catch((error) => {
          console.warn("Could not reset call audio output:", error);
        });
      }
    }
    stopRingtone();
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    peerIdRef.current = null;
    setPeer(null);
    setMuted(false);
    setAudioOutput("speaker");
    setAudioOutputMessage("");
    setCallMessage(message);
    setCallId(null);
    updateState(message ? "ended" : "idle");
  }, []);

  const createPeerConnection = useCallback(
    (peerId) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("call:ice", { to: peerId, candidate: e.candidate });
      };

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") cleanup();
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, cleanup]
  );

  const getMicStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
      },
      video: false,
    });
    stream.getAudioTracks().forEach((track) => {
      track.contentHint = "speech";
    });
    localStreamRef.current = stream;
    return stream;
  };

  const flushCandidates = async () => {
    for (const c of pendingCandidatesRef.current) {
      await pcRef.current.addIceCandidate(c);
    }
    pendingCandidatesRef.current = [];
  };

  // ---------- Caller ----------
  const startCall = async (user, conversationId) => {
    if (stateRef.current !== "idle") return;
    // Starting a call comes directly from a button press, so it is a reliable
    // moment to begin the caller's ringback tone under autoplay restrictions.
    startRingtone();
    try {
      const stream = await getMicStream();
      peerIdRef.current = user._id;
      setPeer({ id: user._id, name: user.name });
      conversationIdRef.current = conversationId || null;
      updateState("calling");

      const pc = createPeerConnection(user._id);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:start", { to: user._id, offer, callerName: myName, conversationId: conversationIdRef.current });
    } catch (err) {
      console.error("Call start failed:", err);
      alert("Microphone permission দিন, তারপর আবার চেষ্টা করুন।");
      cleanup();
    }
  };

  // ---------- Receiver ----------
  const acceptCall = async () => {
    const incoming = pendingOfferRef.current;
    if (!incoming) return;
    try {
      stopRingtone();
      const stream = await getMicStream();
      const pc = createPeerConnection(incoming.from);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(incoming.offer);
      await flushCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:accept", { to: incoming.from, answer });
      updateState("connected");
    } catch (err) {
      console.error("Accept failed:", err);
      socket.emit("call:end", { to: incoming.from });
      cleanup();
    }
  };

  const rejectCall = () => {
    if (peerIdRef.current) socket.emit("call:reject", { to: peerIdRef.current, callId, conversationId: conversationIdRef.current });
    cleanup();
  };

  const endCall = (callDuration = 0) => {
    if (peerIdRef.current) socket.emit("call:end", { to: peerIdRef.current, callId, conversationId: conversationIdRef.current, duration: callDuration });
    cleanup();
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const changeAudioOutput = async (mode) => {
    const audio = remoteAudioRef.current;
    if (!audio || typeof audio.setSinkId !== "function") {
      setAudioOutputMessage("Audio output switching is not supported by this browser.");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((device) => device.kind === "audiooutput");
      const target = mode === "earpiece"
        ? outputs.find((device) => /earpiece|receiver|handset|phone/i.test(device.label))
        : outputs.find((device) => /speaker|loudspeaker/i.test(device.label)) ||
          outputs.find((device) => device.deviceId === "default");

      if (!target && mode === "earpiece") {
        setAudioOutputMessage("Earpiece output is not available on this device/browser.");
        return;
      }

      await audio.setSinkId(target?.deviceId || "default");
      setAudioOutput(mode);
      setAudioOutputMessage("");
    } catch (error) {
      console.error("Audio output change failed:", error);
      setAudioOutputMessage("Could not change audio output on this device.");
    }
  };

  // ---------- Socket listeners ----------
  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({ from, callerName, offer, callId }) => {
      if (stateRef.current !== "idle") {
        socket.emit("call:busy", { to: from });
        return;
      }
      setCallId(callId || null);
      pendingOfferRef.current = { from, offer };
      peerIdRef.current = from;
      setPeer({ id: from, name: callerName });
      updateState("incoming");
      startRingtone();
    };

    const onAccepted = async ({ answer }) => {
      if (!pcRef.current) return;
      stopRingtone();
      await pcRef.current.setRemoteDescription(answer);
      await flushCandidates();
      updateState("connected");
    };

    const onIce = async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(candidate);
      } else {
        pendingCandidatesRef.current.push(candidate); // remote description আসার আগে এলে জমিয়ে রাখি
      }
    };

    const onRejected = () => {
      cleanup("Call reject করা হয়েছে");
    };
    const onBusy = () => {
      cleanup("User অন্য call-এ ব্যস্ত");
    };
    const onUnavailable = () => {
      cleanup("User এখন offline");
    };
    const onEnded = () => cleanup();

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:ice", onIce);
    socket.on("call:rejected", onRejected);
    socket.on("call:busy", onBusy);
    socket.on("call:unavailable", onUnavailable);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:ice", onIce);
      socket.off("call:rejected", onRejected);
      socket.off("call:busy", onBusy);
      socket.off("call:unavailable", onUnavailable);
      socket.off("call:ended", onEnded);
    };
  }, [socket, cleanup]);

  // Auto-hide the "ended" card after 3 seconds so the UI returns to idle
  useEffect(() => {
    if (callState === "ended") {
      endTimerRef.current = window.setTimeout(() => {
        setCallMessage("");
        updateState("idle");
      }, 3000);
    }
    return () => window.clearTimeout(endTimerRef.current);
  }, [callState]);

  return {
    callState, peer, muted, remoteAudioRef, callId, callMessage,
    audioOutput, audioOutputMessage, changeAudioOutput,
    startCall, acceptCall, rejectCall, endCall, toggleMute,
  };
}
