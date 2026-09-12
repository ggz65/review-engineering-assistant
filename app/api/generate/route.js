const REQUIRED_FIELDS = ["side", "place", "concern", "obstacle", "solution", "result", "feeling"];

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "prompts", "followUpText"],
  properties: {
    email: { type: "string" },
    prompts: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" }
    },
    followUpText: { type: "string" }
  }
};

const instructions = `You create client-friendly review requests for real estate agents. The writing must sound like a real person wrote it, not a transaction summary or marketing template.

Use only the transaction details supplied. Never invent a fact, quote, feeling, result, name, or action.

Write directly to the client in second person using "you" and "your," even when the agent's notes use "they," "their," or "the client."

EMAIL RULES:
- Start with "Subject:" on its own line, then write the email.
- Greet the client by the supplied first name or names. If none are supplied, use "Hi there," and never show a placeholder.
- Write a warm, natural email tied to the client's real experience.
- Mention no more than two meaningful transaction details. Do not recap the entire transaction or create a list of concerns.
- Use ordinary spoken language, short sentences, and contractions where natural.
- Keep the complete email between 90 and 140 words.
- Include the supplied review link exactly once.
- Sign off with the supplied agent first name. Never show a placeholder.
- Do not ask for a five-star review, praise, or positive feedback.
- Frame the review as something that may help future buyers or sellers in a similar situation.
- Avoid stiff phrases such as "your perspective," "share insights," "in today's market," and "when you have a few minutes."
- Do not say "I hope this message finds you well."

MEMORY PROMPT RULES:
- Return exactly three prompts.
- Every prompt must begin exactly: "If it helps, you could mention…"
- Ground each prompt in a specific concern, obstacle, solution, turning point, feeling, or outcome from the supplied transaction.
- Keep each prompt to one short sentence and focus on one idea.
- Do not script the review or put praise in the client's mouth.

FOLLOW-UP TEXT RULES:
- Greet the client by first name when supplied.
- Write a short, friendly, low-pressure next-day text of no more than 45 words.
- Refer to the email sent the previous day.
- Include the supplied review link exactly once.
- Do not ask for five stars or praise.`;

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "AI generation is not configured." }, { status: 503 });
    }

    const body = await request.json();
    const answers = body?.answers;
    if (!answers || REQUIRED_FIELDS.some((key) => typeof answers[key] !== "string" || !answers[key].trim())) {
      return Response.json({ error: "Please complete every interview question." }, { status: 400 });
    }
    if (REQUIRED_FIELDS.some((key) => answers[key].length > 2000)) {
      return Response.json({ error: "One or more answers are too long." }, { status: 400 });
    }

    const profile = body?.profile || {};
    const reviewLink = typeof profile.reviewLink === "string" ? profile.reviewLink.trim() : "";
    const agentName = typeof profile.agentName === "string" ? profile.agentName.trim() : "";
    const clientNames = typeof profile.clientNames === "string" ? profile.clientNames.trim() : "";
    const tone = typeof profile.tone === "string" ? profile.tone.trim() : "Warm and conversational";
    let parsedLink;
    try { parsedLink = new URL(reviewLink); } catch { parsedLink = null; }
    if (!parsedLink || !["http:", "https:"].includes(parsedLink.protocol) || reviewLink.length > 500) {
      return Response.json({ error: "Please enter a valid review link." }, { status: 400 });
    }
    if (!agentName || agentName.length > 80 || clientNames.length > 120 || tone.length > 60) {
      return Response.json({ error: "Please check the setup details." }, { status: 400 });
    }

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions,
        input: JSON.stringify({ transaction: answers, agentName, clientNames: clientNames || null, reviewLink, requestedTone: tone }),
        max_output_tokens: 1400,
        text: {
          format: {
            type: "json_schema",
            name: "review_request",
            strict: true,
            schema
          }
        }
      })
    });

    if (!apiResponse.ok) {
      console.error("OpenAI request failed", apiResponse.status, apiResponse.headers.get("x-request-id"));
      return Response.json({ error: "The review request could not be created. Please try again." }, { status: 502 });
    }

    const response = await apiResponse.json();
    const outputText = response.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("OpenAI returned no output text");

    const result = JSON.parse(outputText);
    if (!result.email || !Array.isArray(result.prompts) || result.prompts.length !== 3 || !result.followUpText) {
      throw new Error("OpenAI returned an invalid output shape");
    }

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Generation error", error);
    return Response.json({ error: "The review request could not be created. Please try again." }, { status: 500 });
  }
}
