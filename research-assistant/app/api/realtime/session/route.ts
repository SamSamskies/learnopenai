import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI();

export async function POST() {
  try {
    const secret = await openai.realtime.clientSecrets.create({
      session: {
        type: 'realtime',
        model: 'gpt-realtime-2.1-mini',
        instructions: [
          'You are the voice mode of a research assistant.',
          'Keep answers to 1–3 short spoken sentences.',
          'If the user needs sources, lists, or a written brief,',
          'say so and suggest switching to Research mode.',
          'Never invent citations aloud.',
        ].join(' '),
        audio: {
          input: {
            noise_reduction: { type: 'far_field' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.75,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
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
