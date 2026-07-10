"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import { ModeChrome } from "../ModeChrome";
import { PhaseBadge } from "./PhaseBadge";
import {
  reduceRealtimePhase,
  type RealtimePhase,
} from "./realtime-phase";
import { Transcript } from "./Transcript";
import {
  emptyTranscript,
  reduceTranscript,
  type TranscriptState,
} from "./transcript-reducer";

export { reduceRealtimePhase, type RealtimePhase } from "./realtime-phase";
export {
  emptyTranscript,
  reduceTranscript,
  type TranscriptState,
  type Turn,
} from "./transcript-reducer";

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

export function VoiceProbe() {
  const router = useRouter();
  const [phase, setPhase] = useState<RealtimePhase>("idle");
  const [transcript, setTranscript] =
    useState<TranscriptState>(emptyTranscript);
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnLatencyMs, setTurnLatencyMs] = useState<number | null>(null);
  const [pendingModeHref, setPendingModeHref] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveRef = useRef(false);
  const connectGenRef = useRef(0);
  const speechStoppedAt = useRef<number | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});

  function trackLatency(event: { type: string }) {
    if (event.type === "input_audio_buffer.speech_stopped") {
      speechStoppedAt.current = performance.now();
      return;
    }
    const isFirstAudio =
      event.type === "response.output_audio.delta" ||
      event.type === "response.audio.delta" ||
      event.type === "output_audio_buffer.started";
    if (isFirstAudio && speechStoppedAt.current != null) {
      setTurnLatencyMs(Math.round(performance.now() - speechStoppedAt.current));
      speechStoppedAt.current = null;
    }
  }

  function interrupt() {
    const dc = dcRef.current;
    if (dc?.readyState !== "open") return;
    // Stop generation, then flush buffered playback (WebRTC-only).
    dc.send(JSON.stringify({ type: "response.cancel" }));
    dc.send(JSON.stringify({ type: "output_audio_buffer.clear" }));
  }

  function releaseMedia() {
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }

  function releaseConnection() {
    liveRef.current = false;
    releaseMedia();
    setConnected(false);
  }

  function discardAttempt(
    pc: RTCPeerConnection | null,
    mic: MediaStream | null,
    audio: HTMLAudioElement | null,
  ) {
    if (pcRef.current === pc) {
      pcRef.current = null;
      dcRef.current = null;
    }
    if (micRef.current === mic) micRef.current = null;
    if (audioRef.current === audio) audioRef.current = null;
    pc?.close();
    mic?.getTracks().forEach((t) => t.stop());
    if (audio) audio.srcObject = null;
  }

  function handleConnectionDrop(message = "Connection lost") {
    if (!liveRef.current) return;
    releaseConnection();
    setPhase("error");
    setErrorMessage(message);
  }

  function attachConnectionHandlers(pc: RTCPeerConnection, dc: RTCDataChannel) {
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const { connectionState } = pc;
      if (connectionState === "failed" || connectionState === "closed") {
        handleConnectionDrop();
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const { iceConnectionState } = pc;
      if (iceConnectionState === "failed" || iceConnectionState === "closed") {
        handleConnectionDrop();
      }
    };
    dc.onclose = () => {
      if (pcRef.current !== pc) return;
      handleConnectionDrop();
    };
  }

  useEffect(
    () => () => {
      connectGenRef.current += 1;
      liveRef.current = false;
      releaseMedia();
    },
    [],
  );

  async function connect() {
    const gen = ++connectGenRef.current;
    releaseMedia();
    liveRef.current = false;

    const isReconnect = phase === "error";
    setErrorMessage(null);
    if (!isReconnect) {
      setTranscript(emptyTranscript);
    }
    setPhase("connecting");
    setConnected(false);

    let pc: RTCPeerConnection | null = null;
    let mic: MediaStream | null = null;
    let audio: HTMLAudioElement | null = null;

    try {
      const sessionRes = await fetch("/api/realtime/session", { method: "POST" });
      if (gen !== connectGenRef.current) return;
      if (!sessionRes.ok) {
        throw new Error("Failed to mint session");
      }
      const token = await sessionRes.json();
      if (gen !== connectGenRef.current) return;
      if (!token) throw new Error("No ephemeral token in session response");

      pc = new RTCPeerConnection();
      audio = new Audio();
      audio.autoplay = true;
      pc.ontrack = (e) => {
        if (audio) audio.srcObject = e.streams[0];
      };
      pcRef.current = pc;
      audioRef.current = audio;

      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        throw new Error(mapConnectError(err));
      }
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }
      micRef.current = mic;
      pc.addTrack(mic.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        if (pcRef.current !== pc) return;
        const event = JSON.parse(e.data) as {
          type: string;
          delta?: string;
          transcript?: string;
          response?: { status?: string };
          error?: { code?: string | null };
        };
        trackLatency(event);
        setPhase((p) => reduceRealtimePhase(p, event));
        setTranscript((t) => reduceTranscript(t, event));
      };
      attachConnectionHandlers(pc, dc);

      const offer = await pc.createOffer();
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }
      await pc.setLocalDescription(offer);
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }
      if (!sdpRes.ok) {
        throw new Error(`Realtime SDP exchange failed (${sdpRes.status})`);
      }
      const sdp = await sdpRes.text();
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }
      await pc.setRemoteDescription({ type: "answer", sdp });
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }

      liveRef.current = true;
      setConnected(true);
      setPhase("idle");
    } catch (err) {
      if (gen !== connectGenRef.current) {
        discardAttempt(pc, mic, audio);
        return;
      }
      releaseConnection();
      setPhase("error");
      setErrorMessage(mapConnectError(err));
    }
  }

  connectRef.current = connect;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("start") !== "1") {
      return;
    }
    void connectRef.current().then(() => {
      // Keep ?start=1 through Strict Mode remount; clear only once live.
      if (liveRef.current) {
        window.history.replaceState(null, "", "/voice");
      }
    });
  }, []);

  function disconnect() {
    connectGenRef.current += 1;
    speechStoppedAt.current = null;
    releaseConnection();
    setPhase("idle");
    setErrorMessage(null);
  }

  const hasVoiceWork =
    connected ||
    phase === "connecting" ||
    transcript.history.length > 0 ||
    transcript.draftUser.trim().length > 0 ||
    transcript.draftAssistant.trim().length > 0;

  function requestModeNavigate(href: string) {
    if (!hasVoiceWork) {
      router.push(href);
      return;
    }
    setPendingModeHref(href);
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <ModeChrome onRequestNavigate={requestModeNavigate} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <h1 className="font-serif text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Talk it through
        </h1>
        <p className="mt-3 max-w-md text-center text-base text-on-surface-variant">
          Quick spoken answers. Use Research for briefs and sources.
        </p>

        <div className="mt-10">
          <PhaseBadge phase={phase} connected={connected} />
        </div>
        {turnLatencyMs != null && (
          <p className="mt-3 text-center text-sm text-on-surface-variant">
            Last turn: {turnLatencyMs} ms
            {turnLatencyMs > 800 && (
              <span className="text-warn"> — over budget</span>
            )}
          </p>
        )}
        <Transcript transcript={transcript} />

        {errorMessage && (
          <p className="mt-4 max-w-md text-center text-sm text-error">
            {errorMessage}
          </p>
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
            <>
              {phase === "speaking" && (
                <button
                  type="button"
                  onClick={interrupt}
                  className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-medium"
                >
                  Interrupt
                </button>
              )}
              <button
                type="button"
                onClick={disconnect}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-container"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingModeHref != null}
        title="Switch to Research?"
        description="This ends your voice session and clears the transcript."
        confirmLabel="Switch to Research"
        destructive
        onConfirm={() => {
          const href = pendingModeHref;
          setPendingModeHref(null);
          if (href) router.push(href);
        }}
        onCancel={() => setPendingModeHref(null)}
      />
    </div>
  );
}
