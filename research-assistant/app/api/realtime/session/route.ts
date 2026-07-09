import { openai } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { token } = await openai.experimental_realtime.getToken({
      model: 'gpt-realtime-2.1',
      sessionConfig: {
        voice: 'marin',
      },
    });
    return NextResponse.json(token);
  } catch {
    return NextResponse.json({ error: 'mint failed' }, { status: 500 });
  }
}