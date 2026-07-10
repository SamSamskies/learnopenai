// Defended server_vad default (lesson 0013). Try semantic_vad only if mid-thought
// cutoffs return — see learn-ai-ux reference/semantic-vad.html.
export type RealtimeTurnDetection =
  | {
      type: 'server_vad';
      threshold: number;
      prefix_padding_ms: number;
      silence_duration_ms: number;
      interrupt_response: boolean;
    }
  | {
      type: 'semantic_vad';
      eagerness: 'low' | 'medium' | 'high' | 'auto';
      interrupt_response?: boolean;
    };

export const REALTIME_TURN_DETECTION: RealtimeTurnDetection = {
  type: 'server_vad',
  threshold: 0.75,
  prefix_padding_ms: 300,
  silence_duration_ms: 500,
  interrupt_response: true,
};

export function turnDetectionLabel(): string {
  const { type } = REALTIME_TURN_DETECTION;
  if (type === 'semantic_vad') {
    const { eagerness } = REALTIME_TURN_DETECTION;
    return `Turn detection: semantic (${eagerness} eagerness)`;
  }
  return 'Turn detection: server VAD';
}
