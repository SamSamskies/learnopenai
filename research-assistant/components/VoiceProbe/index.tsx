"use client";

import { useEffect, useRef, useState } from "react";
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
  const [phase, setPhase] = useState<RealtimePhase>("idle");
  const [transcript, setTranscript] =
    useState<TranscriptState>(emptyTranscript);
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

  function releaseConnection() {
    liveRef.current = false;
    releaseMedia();
    setConnected(false);
  }

  function handleConnectionDrop(message = "Connection lost") {
    if (!liveRef.current) return;
    releaseConnection();
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

  useEffect(
    () => () => {
      liveRef.current = false;
      pcRef.current?.close();
      micRef.current?.getTracks().forEach((track) => track.stop());
      if (audioRef.current) audioRef.current.srcObject = null;
    },
    [],
  );

  async function connect() {
    const isReconnect = phase === "error";
    setErrorMessage(null);
    if (!isReconnect) {
      setTranscript(emptyTranscript);
    }
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
      micRef.current = mic;
      pc.addTrack(mic.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (e) => {
        const event = JSON.parse(e.data) as {
          type: string;
          delta?: string;
          transcript?: string;
        };
        setPhase((p) => reduceRealtimePhase(p, event));
        setTranscript((t) => reduceTranscript(t, event));
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
      releaseConnection();
      setPhase("error");
      setErrorMessage(mapConnectError(err));
    }
  }

  function disconnect() {
    releaseConnection();
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
      <Transcript transcript={transcript} />

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
