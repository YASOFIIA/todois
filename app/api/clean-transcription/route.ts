import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawText = body.rawText;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json({ error: 'Порожній текст' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Returning original text.');
      return NextResponse.json({ cleanedText: rawText.trim() });
    }

    const SYSTEM_PROMPT = `You are a Ukrainian speech recognition editor.
The user dictated text via voice recognition, which produced raw unformatted text with missing punctuation, typos, phonetic errors, or speech artifacts.

YOUR TASK:
1. Fix speech recognition mistakes in Ukrainian (misheard words, phonetic errors).
2. Add proper punctuation (commas, periods, capital letters at sentence starts).
3. Remove filler sounds/words ("еее", "ну", "гм", "типу") if they don't add meaning.
4. DO NOT summarize or omit any actual tasks/intentions mentioned by user.
5. Return ONLY the cleaned, natural Ukrainian text. No explanations, no quotes, no markdown formatting.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];
    let cleanedText = '';
    let success = false;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${SYSTEM_PROMPT}\n\nСинтезований raw-голос користувача:\n${rawText.trim()}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          cleanedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          cleanedText = cleanedText.replace(/```/g, '').trim();
          if (cleanedText) {
            success = true;
            break;
          }
        } else {
          console.warn(`Gemini model ${model} clean-transcription failed (${res.status})`);
        }
      } catch (err) {
        console.warn(`Fetch error for model ${model} in clean-transcription:`, err);
      }
    }

    if (!success || !cleanedText) {
      // Fallback: simple basic cleanup
      cleanedText = rawText.trim();
    }

    return NextResponse.json({ cleanedText });
  } catch (error: any) {
    console.error('API /api/clean-transcription error:', error);
    return NextResponse.json(
      { error: error?.message || 'Помилка виправлення транскрипції' },
      { status: 500 }
    );
  }
}
