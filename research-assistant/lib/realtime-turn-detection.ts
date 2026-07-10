export const REALTIME_TURN_DETECTION = {
    type: 'semantic_vad' as const,
    eagerness: 'low' as const,
    interrupt_response: true,
  };
  
  export function turnDetectionLabel(): string {
    const { type, eagerness } = REALTIME_TURN_DETECTION;
    if (type === 'semantic_vad') {
      return `Turn detection: semantic (${eagerness} eagerness)`;
    }
    return 'Turn detection: server VAD';
  }