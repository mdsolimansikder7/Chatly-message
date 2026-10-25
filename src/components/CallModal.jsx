import { FiPhone, FiVolume2 } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";

export default function CallModal({
  callState,
  peer,
  muted,
  remoteAudioRef,
  callMessage,
  callId,
  acceptCall,
  rejectCall,
  endCall,
  toggleMute,
  audioOutput,
  audioOutputMessage,
  changeAudioOutput,
}) {
  // Determine the status text shown under the peer name
  const statusText = () => {
    if (callMessage) return callMessage;
    if (callState === "calling") return "Calling...";
    if (callState === "incoming") return "Incoming audio call";
    if (callState === "connected") return "Connected";
    return "";
  };

  const showActions = callState === "incoming" || callState === "calling" || callState === "connected";
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleEndCall = () => {
    endCall(duration);
    clearInterval(timerRef.current);
    setDuration(0);
  };

  const handleReject = () => {
    rejectCall();
    clearInterval(timerRef.current);
    setDuration(0);
  };

  return (
    <>
      {/* অন্যজনের audio এখানে বাজবে, সবসময় render থাকতে হবে */}
      <audio ref={remoteAudioRef} autoPlay muted={false} />

      {callState !== "idle" && (
        <div className="call-overlay">
          <div className={`call-card${callMessage ? " call-card-ended" : ""}`}>
            <div className="call-avatar">{peer?.name?.[0]}</div>
            <h3>{peer?.name}</h3>
            <p className={callMessage ? "call-status-error" : ""}>
              {callState === "connected" ? formatDuration(duration) : statusText()}
            </p>
            {audioOutputMessage && <p className="call-status-error" role="status">{audioOutputMessage}</p>}

            {showActions && (
              <div className={`call-actions${callState === "connected" ? " call-actions-connected" : ""}`}>
                {callState === "incoming" && (
                  <>
                    <button type="button" className="call-action-accept" onClick={acceptCall}>Accept</button>
                    <button type="button" className="call-action-danger" onClick={handleReject}>Reject</button>
                  </>
                )}
                {callState === "calling" && (
                  <button type="button" className="call-action-danger" onClick={handleEndCall}>Cancel</button>
                )}
                {callState === "connected" && (
                  <>
                    <button type="button" className="call-action-neutral" onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
                    <button type="button" className={`call-action-output${audioOutput === "earpiece" ? " call-action-output-active" : ""}`} aria-pressed={audioOutput === "earpiece"} onClick={() => changeAudioOutput("earpiece")}><FiPhone size={16} /> Earpiece</button>
                    <button type="button" className={`call-action-output${audioOutput === "speaker" ? " call-action-output-active" : ""}`} aria-pressed={audioOutput === "speaker"} onClick={() => changeAudioOutput("speaker")}><FiVolume2 size={16} /> Loudspeaker</button>
                    <button type="button" className="call-action-danger" onClick={handleEndCall}>End</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
