import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { REALTIME_TURN_DETECTION } from '@/lib/realtime-turn-detection';
import { VOICE_TOOLS } from '@/lib/realtime-voice-tools';

const openai = new OpenAI();

export async function POST() {
  try {
    const secret = await openai.realtime.clientSecrets.create({
      session: {
        type: 'realtime',
        model: 'gpt-realtime-2.1-mini',
        tools: [...VOICE_TOOLS],
        tool_choice: "auto",
        instructions: [
          'You are the voice mode of a research assistant.',
          'Keep answers to 1–3 short spoken sentences.',
          'If the user needs sources, lists, or a written brief,',
          'say so and suggest switching to Research mode.',
          'Never invent citations aloud.',
          'When the user attaches an image, describe what you see briefly in spoken form.',
          'Do not invent precise numbers from charts unless clearly legible.',
          'When the user asks what a term means, call lookup_definition instead of guessing.',
          'After a lookup, paraphrase the definition in one short spoken sentence.',
          'Use lookup_definition only for quick term definitions.',
          'Use stage_research_brief when the user wants sources or a written brief.',
          'If stage_research_brief is rejected, acknowledge briefly and offer to stay in voice.',
          'Call generate_illustration when the user asks to draw, sketch, visualize, or generate an image.',
          'If generate_illustration is rejected, acknowledge briefly and stay in voice.',
        ].join(' '),
        audio: {
          input: {
            noise_reduction: { type: 'far_field' },
            turn_detection: REALTIME_TURN_DETECTION,
            transcription: {
              model: 'gpt-4o-mini-transcribe',
              language: 'en',
            },
          },
          output: { voice: 'marin' },
        },
      },
    });
    return NextResponse.json(secret.value);
  } catch {
    return NextResponse.json({ error: 'mint failed' }, { status: 500 });
  }
}
