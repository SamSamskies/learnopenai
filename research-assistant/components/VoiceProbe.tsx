"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "./ResearchChat/icons";

export type RealtimePhase =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export function reduceRealtimePhase(
  prev: RealtimePhase,
  event: { type: string },
): RealtimePhase {
  switch (event.type) {
    case "session.created":
      return "idle";
    case "input_audio_buffer.speech_started":
      return "listening";
    case "input_audio_buffer.speech_stopped":
      return "thinking";
    case "response.output_audio.delta":
    case "response.audio.delta":
    case "response.output_audio_transcript.delta":
    case "response.audio_transcript.delta":
    case "output_audio_buffer.started":
      return "speaking";
    case "output_audio_buffer.stopped":
      return "idle";
    case "response.done":
    case "response.output_audio.done":
    case "response.audio.done":
    case "response.output_audio_transcript.done":
    case "response.audio_transcript.done":
      // Generation can finish before WebRTC playback; keep phase until stopped.
      return prev === "speaking" || prev === "thinking" ? prev : "idle";
    case "response.cancelled":
      return "interrupted";
    case "error":
      return "error";
    default:
      return prev;
  }
}

const PHASE_COPY: Record<RealtimePhase, string> = {
  idle: "Ready — tap Connect",
  connecting: "Connecting…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  interrupted: "Interrupted — keep talking",
  error: "Something went wrong",
};

const PHASE_CHIP: Record<RealtimePhase, string> = {
  idle: "border-outline-variant bg-surface-container-low text-on-surface-variant",
  connecting: "border-outline-variant bg-surface-container-low text-on-surface-variant",
  listening: "border-primary/30 bg-primary/5 text-primary",
  thinking: "border-outline-variant bg-surface-container text-on-surface-variant",
  speaking: "border-primary/40 bg-primary/10 text-primary",
  interrupted: "border-outline-variant bg-surface-container-low text-on-surface-variant",
  error: "border-error/30 bg-error-container text-on-error-container",
};

function mapConnectError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Microphone access needed";
    }
    if (err.name === "NotFoundError") {
      return "No microphone found";
    }
    return "Microphone unavailable";
  }
  if (err instanceof Error) return err.message;
  return "Connection failed";
}

function phaseLabel(phase: RealtimePhase, connected: boolean): string {
  if (phase === "idle") {
    return connected ? "Ready" : "Ready — tap Connect";
  }
  return PHASE_COPY[phase];
}

function PhaseBadge({
  phase,
  connected,
}: {
  phase: RealtimePhase;
  connected: boolean;
}) {
  const showSpinner =
    phase === "connecting" ||
    phase === "listening" ||
    phase === "thinking" ||
    phase === "speaking";

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border px-6 py-4 text-lg font-medium tracking-tight sm:text-xl ${PHASE_CHIP[phase]}`}
      role="status"
      aria-live="polite"
    >
      {showSpinner && <Spinner className="h-5 w-5" />}
      <span>{phaseLabel(phase, connected)}</span>
    </div>
  );
}

export function VoiceProbe() {
  const [phase, setPhase] = useState<RealtimePhase>("idle");
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveRef = useRef(false);

  function releaseMedia() {
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }

  function resetSession() {
    liveRef.current = false;
    releaseMedia();
    setConnected(false);
  }

  function handleConnectionDrop(message = "Connection lost") {
    if (!liveRef.current) return;
    resetSession();
    setPhase("error");
    setErrorMessage(message);
  }

  function attachConnectionHandlers(pc: RTCPeerConnection, dc: RTCDataChannel) {
    pc.onconnectionstatechange = () => {
      const { connectionState } = pc;
      if (connectionState === "failed" || connectionState === "closed") {
        handleConnectionDrop();
      }
    };
    pc.oniceconnectionstatechange = () => {
      const { iceConnectionState } = pc;
      if (iceConnectionState === "failed" || iceConnectionState === "closed") {
        handleConnectionDrop();
      }
    };
    dc.onclose = () => handleConnectionDrop();
  }

  useEffect(() => () => resetSession(), []);

  async function connect() {
    setErrorMessage(null);
    setPhase("connecting");

    try {
      const sessionRes = await fetch("/api/realtime/session", { method: "POST" });
      if (!sessionRes.ok) {
        throw new Error("Failed to mint session");
      }
      const token = await sessionRes.json();
      if (!token) throw new Error("No ephemeral token in session response");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      let mic: MediaStream;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        throw new Error(mapConnectError(err));
      }
      micRef.current = mic;
      pc.addTrack(mic.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (e) => {
        const event = JSON.parse(e.data) as { type: string };
        setPhase((p) => reduceRealtimePhase(p, event));
      };
      attachConnectionHandlers(pc, dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
      if (!sdpRes.ok) {
        throw new Error(`Realtime SDP exchange failed (${sdpRes.status})`);
      }
      const sdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp });

      liveRef.current = true;
      setConnected(true);
      setPhase("idle");
    } catch (err) {
      resetSession();
      setPhase("error");
      setErrorMessage(mapConnectError(err));
    }
  }

  function disconnect() {
    resetSession();
    setPhase("idle");
    setErrorMessage(null);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-on-surface-variant">
        Voice probe
      </p>
      <h1 className="font-serif text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Realtime voice
      </h1>
      <p className="mt-3 max-w-md text-center text-base text-on-surface-variant">
        Isolated WebRTC session — talk after connecting; phase updates from
        realtime events.
      </p>

      <div className="mt-10">
        <PhaseBadge phase={phase} connected={connected} />
      </div>

      {errorMessage && (
        <p className="mt-4 max-w-md text-center text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-8 flex items-center gap-3">
        {!connected ? (
          <button
            type="button"
            onClick={connect}
            disabled={phase === "connecting"}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {phase === "connecting"
              ? "Connecting…"
              : phase === "error"
                ? "Reconnect"
                : "Connect"}
          </button>
        ) : (
          <button
            type="button"
            onClick={disconnect}
            className="rounded-lg border border-outline-variant bg-surface-container-low px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-container"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
