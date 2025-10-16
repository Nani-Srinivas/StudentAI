// import OpenAI from "openai";
// import dotenv from "dotenv";
// dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // Parse a spoken attendance command into structured JSON
// export async function parseAttendanceCommand(transcript) {
//   const prompt = `
// You are an assistant that extracts attendance data.
// Convert the sentence into structured JSON with:
// { "className": "", "present": [], "absent": [] }
// Example: "Mark all present except Ramesh and Priya in Class 7B"
// → { "className": "7B", "present": "all except Ramesh and Priya", "absent": ["Ramesh", "Priya"] }
// User said: "${transcript}"
//   `;

//   const response = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: prompt }],
//   });

//   return JSON.parse(response.choices[0].message.content);
// }


// server/utils/openai.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * parseAttendanceCommand(transcript)
 * Returns a structured object:
 * { className: "7B", action: "mark all present", exceptions: ["Ramesh", "Priya"] }
 */
export async function parseAttendanceCommand(transcript) {
  const system = `You are an assistant that extracts structured attendance commands from a teacher's spoken instruction.
Return only valid JSON, with keys:
- className (string)
- action (string) - short description like "mark all present" or "mark all absent"
- exceptions (array of student names)
If you cannot parse, return {"error":"..."}.
`;

  const user = `Input: "${transcript}"\n\nExample output:\n{"className":"7B","action":"mark all present","exceptions":["Ramesh","Priya"]}\n\nNow parse and output only JSON.`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    // try to JSON parse; sometimes model returns code block -> extract json
    const jsonText = extractJson(raw);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("OpenAI parse error:", err?.message || err);
    return { error: err?.message || "openai_error" };
  }
}

export async function parseAttendanceQuery(transcript) {
  const system = `You are an assistant that extracts query parameters from a user's spoken question about student attendance.
Return only valid JSON, with keys:
- className (string)
- date (string, in YYYY-MM-DD format)
- query (string) - what the user is asking for, e.g., "present", "absent", "all"
If you cannot parse, return {"error":"..."}.

Examples:
- "Who was present in Class 10A yesterday?" -> {"className":"10A","date":"2025-10-15","query":"present"}
- "Who was absent in Class 9 on October 15 2025?" -> {"className":"9","date":"2025-10-15","query":"absent"}
- "Show me all attendance for Class 7B" -> {"className":"7B","query":"all"}
- "List all students in Class 5" -> {"className":"5","query":"all"}

Your response must be only the JSON object. Do not include any other text or explanations.
`;

  const user = `Input: "${transcript}"\n\nNow parse and output only JSON.`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    const jsonText = extractJson(raw);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("OpenAI query parse error:", err?.message || err);
    return { error: err?.message || "openai_query_error" };
  }
}

function extractJson(text) {
  // strip markdown ```json blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  // attempt to find first {...}
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text;
}
