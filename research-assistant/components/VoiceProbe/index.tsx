"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import { ModeChrome } from "../ModeChrome";
import { ImageAttachStrip } from "./ImageAttachStrip";
import { VoiceStartPrompt } from "./VoiceStartPrompt";
import { SessionDock } from "./SessionDock";
import {
  reduceRealtimePhase,
  type RealtimePhase,
} from "./realtime-phase";
import { Transcript } from "./Transcript";
import {
  formatStagedResearchHandoff,
  formatVoiceHandoff,
  saveVoiceHandoff,
} from "@/lib/voice-handoff";
import {
  emptyTranscript,
  reduceTranscript,
  appendSystemTurn,
  appendImageTurn,
  type TranscriptState,
} from "./transcript-reducer";
import { turnDetectionLabel } from "@/lib/realtime-turn-detection";
import {
  imageAttachEvent,
  prepareImageFile,
  type PreparedImage,
} from "./realtime-image-attach";
import {
  extractFunctionCall,
  functionOutputEvent,
  GENERATE_ILLUSTRATION_TOOL,
  generatingImageLabel,
  LOOKUP_DEFINITION_TOOL,
  lookupDefinitionLabel,
  lookedUpSystemLine,
  rejectedToolOutput,
  STAGE_RESEARCH_BRIEF_TOOL,
  toolApprovalLabel,
  type RealtimeFunctionCall,
  type RealtimeVoiceEvent,
} from "@/lib/realtime-voice-tools";
import { ImageGenApproval } from "./ImageGenApproval";

type PendingToolApproval = {
  call: RealtimeFunctionCall;
  query: string;
};

type PendingImageGen = {
  call: RealtimeFunctionCall;
  prompt: string;
};

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
  const [confirmContinueResearch, setConfirmContinueResearch] = useState(false);
  const [attachedImage, setAttachedImage] = useState<PreparedImage | null>(null);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [pendingTool, setPendingTool] =
    useState<PendingToolApproval | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImageGen | null>(
    null,
  );
  const [researchStaged, setResearchStaged] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveRef = useRef(false);
  const connectGenRef = useRef(0);
  const speechStoppedAt = useRef<number | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const handledCalls = useRef(new Set<string>());
  const lookupInFlight = useRef(false);

  function clearLookupLabel() {
    lookupInFlight.current = false;
    setToolLabel(null);
  }

  function beginLookupLabel(term: string) {
    lookupInFlight.current = true;
    setToolLabel(lookupDefinitionLabel(term));
  }

  function maybeClearLookupLabel(event: { type: string }) {
    if (!lookupInFlight.current) return;

    const followUpStarted =
      event.type === "response.output_audio.delta" ||
      event.type === "response.audio.delta" ||
      event.type === "output_audio_buffer.started" ||
      event.type === "response.output_audio_transcript.delta" ||
      event.type === "response.audio_transcript.delta";

    if (followUpStarted) {
      clearLookupLabel();
      return;
    }

    if (
      event.type === "output_audio_buffer.stopped" ||
      event.type === "response.cancelled" ||
      event.type === "input_audio_buffer.speech_started"
    ) {
      clearLookupLabel();
    }
  }

  async function runVoiceTool(call: RealtimeFunctionCall) {
    if (call.name !== LOOKUP_DEFINITION_TOOL.name) return;
    const term = String(call.args.term ?? "").trim();
    beginLookupLabel(term);
    try {
      const res = await fetch("/api/voice/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const data = await res.json();
      const dc = dcRef.current;
      if (dc?.readyState !== "open") return;
      setTranscript((t) =>
        appendSystemTurn(t, lookedUpSystemLine(term)),
      );
      dc.send(JSON.stringify(functionOutputEvent(call.callId, data)));
      dc.send(JSON.stringify({ type: "response.create" }));
    } catch {
      clearLookupLabel();
    }
  }

  function handleFunctionCall(call: RealtimeFunctionCall) {
    if (call.name === LOOKUP_DEFINITION_TOOL.name) {
      void runVoiceTool(call);
      return;
    }
    if (call.name === STAGE_RESEARCH_BRIEF_TOOL.name) {
      const query = String(call.args.query ?? "").trim();
      setPendingTool({ call, query });
      setToolLabel(toolApprovalLabel(call.name));
      return;
    }
    if (call.name === GENERATE_ILLUSTRATION_TOOL.name) {
      const prompt = String(call.args.prompt ?? "").trim();
      setPendingImage({ call, prompt });
      setToolLabel(toolApprovalLabel(call.name));
      return;
    }
  }

  async function resolveImageGen(approved: boolean, editedPrompt: string) {
    const pending = pendingImage;
    if (!pending) return;
    setPendingImage(null);

    const dc = dcRef.current;
    if (dc?.readyState !== "open") return;

    if (!approved) {
      setToolLabel(null);
      dc.send(JSON.stringify(rejectedToolOutput(pending.call.callId)));
      dc.send(JSON.stringify({ type: "response.create" }));
      return;
    }

    setToolLabel(generatingImageLabel());
    try {
      const res = await fetch("/api/voice/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editedPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageDataUrl) throw new Error(data.error ?? "failed");

      setTranscript((t) => appendImageTurn(t, editedPrompt, data.imageDataUrl));
      dc.send(
        JSON.stringify(
          functionOutputEvent(pending.call.callId, {
            ok: true,
            note: "Image is on screen. Describe it in one short spoken sentence.",
          }),
        ),
      );
    } catch {
      dc.send(
        JSON.stringify(
          functionOutputEvent(pending.call.callId, {
            ok: false,
            error: "generation_failed",
          }),
        ),
      );
    }
    setToolLabel(null);
    dc.send(JSON.stringify({ type: "response.create" }));
  }

  function resolveToolApproval(approved: boolean) {
    const pending = pendingTool;
    if (!pending) return;
    setPendingTool(null);
    setToolLabel(null);

    const dc = dcRef.current;
    if (dc?.readyState !== "open") return;

    if (approved) {
      const draft = formatStagedResearchHandoff(
        { history: transcript.history, draftUser: transcript.draftUser },
        pending.query,
      );
      if (draft) saveVoiceHandoff(draft);
      setTranscript((t) =>
        appendSystemTurn(
          t,
          pending.query
            ? `Staged for Research: ${pending.query}`
            : "Staged for Research",
        ),
      );
      setResearchStaged(true);
      dc.send(
        JSON.stringify(
          functionOutputEvent(pending.call.callId, {
            staged: true,
            query: pending.query,
          }),
        ),
      );
    } else {
      dc.send(JSON.stringify(rejectedToolOutput(pending.call.callId)));
    }
    dc.send(JSON.stringify({ type: "response.create" }));
  }

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

  async function attachImage(file: File) {
    const prepared = await prepareImageFile(file);
    const dc = dcRef.current;
    if (dc?.readyState !== "open") throw new Error("Connect first");
    dc.send(JSON.stringify(imageAttachEvent(prepared.dataUrl)));
    setAttachedImage(prepared);
  }

  async function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setErrorMessage(null);
      await attachImage(file);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not attach image");
    }
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
      setResearchStaged(false);
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
        const event = JSON.parse(e.data) as RealtimeVoiceEvent & {
          delta?: string;
          transcript?: string;
          response?: RealtimeVoiceEvent["response"] & { status?: string };
          error?: { code?: string | null };
        };
        trackLatency(event);
        maybeClearLookupLabel(event);
        setPhase((p) => reduceRealtimePhase(p, event));
        setTranscript((t) => reduceTranscript(t, event));
        const call = extractFunctionCall(event);
        if (call && !handledCalls.current.has(call.callId)) {
          handledCalls.current.add(call.callId);
          handleFunctionCall(call);
        }
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
    handledCalls.current.clear();
    clearLookupLabel();
    setPendingTool(null);
    setPendingImage(null);
    releaseConnection();
    setAttachedImage(null);
    setPhase("idle");
    setErrorMessage(null);
  }

  function continueInResearch() {
    const draft = formatVoiceHandoff(transcript);
    if (draft) saveVoiceHandoff(draft);
    disconnect();
    router.push("/");
  }

  function openStagedResearch() {
    setResearchStaged(false);
    disconnect();
    router.push("/");
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

  const handoffDraft = formatVoiceHandoff(transcript);
  const sessionActive = connected || phase === "connecting";
  const hasTranscript =
    transcript.history.length > 0 ||
    transcript.draftUser ||
    transcript.draftAssistant;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <ModeChrome onRequestNavigate={requestModeNavigate} />
      <div
        className={`relative flex flex-1 flex-col items-center px-6 ${
          sessionActive
            ? "justify-start overflow-y-auto pt-8 pb-56"
            : "justify-center py-16"
        }`}
      >
        <h1
          className={`font-serif text-center font-semibold tracking-tight text-foreground ${
            sessionActive ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
          }`}
        >
          Talk it through
        </h1>
        {!sessionActive && (
          <p className="mt-3 max-w-md text-center text-base text-on-surface-variant">
            Quick spoken answers. Use Research for briefs and sources.
          </p>
        )}
        {sessionActive && (
          <VoiceStartPrompt
            phase={phase}
            connected={connected}
            hasTranscript={Boolean(hasTranscript)}
          />
        )}
        {(researchStaged ||
          (handoffDraft && pendingTool == null && pendingImage == null)) && (
          <div
            className={`flex w-full max-w-xl flex-col items-stretch gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              sessionActive ? "mt-6" : "mt-10"
            }`}
          >
            <p className="text-sm text-on-surface-variant">
              {researchStaged
                ? "Draft staged — open Research when you’re ready."
                : "Ready for sources and a written brief?"}
            </p>
            <button
              type="button"
              onClick={
                researchStaged
                  ? openStagedResearch
                  : () => setConfirmContinueResearch(true)
              }
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-dark"
            >
              {researchStaged ? "Open Research" : "Continue in Research"}
            </button>
          </div>
        )}
        {(sessionActive || hasTranscript) && (
          <div
            className={`w-full max-w-xl space-y-3 ${
              sessionActive
                ? "mt-6"
                : handoffDraft || researchStaged
                  ? "mt-6"
                  : "mt-10"
            }`}
          >
            {sessionActive && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />
                <ImageAttachStrip
                  attachedImage={attachedImage}
                  connected={connected}
                  onAttachImage={() => fileInputRef.current?.click()}
                />
              </>
            )}
            <Transcript transcript={transcript} className="mt-0" />
          </div>
        )}

        {errorMessage && (
          <p
            className={`max-w-md text-center text-sm text-error ${
              sessionActive ? "mt-4" : "mt-8"
            }`}
          >
            {errorMessage}
          </p>
        )}

        {!sessionActive && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={connect}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-dark"
            >
              {phase === "error" ? "Reconnect" : "Connect"}
            </button>
          </div>
        )}
      </div>

      {sessionActive && (
        <SessionDock
          phase={phase}
          toolLabel={toolLabel}
          turnLatencyMs={turnLatencyMs}
          turnDetection={turnDetectionLabel()}
          onInterrupt={interrupt}
          onDisconnect={disconnect}
        />
      )}

      <ConfirmDialog
        open={confirmContinueResearch}
        title="Continue in Research?"
        description="Your voice session will end and this conversation will be copied into Research as a starting prompt."
        confirmLabel="Continue in Research"
        onConfirm={() => {
          setConfirmContinueResearch(false);
          continueInResearch();
        }}
        onCancel={() => setConfirmContinueResearch(false)}
      />

      <ConfirmDialog
        open={pendingTool != null}
        title="Stage this for Research?"
        description={
          pendingTool?.query
            ? `This saves a draft and ends voice when you switch: “${pendingTool.query}”`
            : "This saves a research draft you can open in Research mode."
        }
        confirmLabel="Stage draft"
        onConfirm={() => resolveToolApproval(true)}
        onCancel={() => resolveToolApproval(false)}
      />

      <ImageGenApproval
        open={pendingImage != null}
        initialPrompt={pendingImage?.prompt ?? ""}
        onGenerate={(editedPrompt) => {
          void resolveImageGen(true, editedPrompt);
        }}
        onCancel={() => {
          void resolveImageGen(false, "");
        }}
      />

      <ConfirmDialog
        open={pendingModeHref != null}
        title="Switch to Research?"
        description={
          handoffDraft
            ? "This ends your voice session. Use Continue in Research first if you want the conversation copied over."
            : "This ends your voice session."
        }
        confirmLabel="Switch to Research"
        destructive
        onConfirm={() => {
          const href = pendingModeHref;
          setPendingModeHref(null);
          disconnect();
          if (href) router.push(href);
        }}
        onCancel={() => setPendingModeHref(null)}
      />
    </div>
  );
}
