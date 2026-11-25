// Transcribes a short voice answer recorded in the browser.
// Used on phones and home-screen installs, where built-in browser speech recognition is unavailable.
// Audio is sent straight to OpenAI and is not stored.

export const runtime = "nodejs";

// Vercel caps request bodies at about 4.5 MB; the browser records at 32 kbps and stops at 3 minutes (~0.75 MB).
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS = {
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "video/webm": "webm"
};

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Voice transcription is not configured." }, { status: 503 });
    }

    const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const extension = EXTENSIONS[contentType];
    if (!extension) {
      return Response.json({ error: "Unsupported audio format." }, { status: 415 });
    }

    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) {
      return Response.json({ error: "That recording is too long. Please keep answers under 3 minutes." }, { status: 413 });
    }

    const audio = await request.arrayBuffer();
    if (!audio.byteLength) {
      return Response.json({ error: "No audio was received." }, { status: 400 });
    }
    if (audio.byteLength > MAX_BYTES) {
      return Response.json({ error: "That recording is too long. Please keep answers under 3 minutes." }, { status: 413 });
    }

    const form = new FormData();
    form.append("file", new Blob([audio], { type: contentType }), `answer.${extension}`);
    form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    form.append("language", "en");
    form.append("response_format", "json");

    const apiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });

    if (!apiResponse.ok) {
      console.error("OpenAI transcription failed", apiResponse.status, apiResponse.headers.get("x-request-id"));
      return Response.json({ error: "I couldn't transcribe that. Please try again." }, { status: 502 });
    }

    const result = await apiResponse.json();
    return Response.json({ text: typeof result.text === "string" ? result.text.trim() : "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Transcription error", error);
    return Response.json({ error: "I couldn't transcribe that. Please try again." }, { status: 500 });
  }
}
