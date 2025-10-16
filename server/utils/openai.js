import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text) {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text;
}

export async function parseAttendanceCommand(transcript) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10);

  const system = `You are an assistant that extracts structured attendance commands from a teacher's spoken instruction.
    The current date is ${today}.
    When the user says "today", use "${today}".
    When the user says "yesterday", use "${yesterday}".

    First, classify the user's intent as "CREATE", "UPDATE", or "DELETE".
    Then, extract the relevant details into a "payload" object.
    For the "className", extract only the core identifier (e.g., for "Class 10A", return "10A"). Do not include the word "Class".

    Return only a valid JSON object with "intent" and "payload" keys.

    - For CREATE: payload should contain "className" and "students" array with "name" and "status".
    - For UPDATE: payload should contain a "filter" (e.g., className) and an "updates" object.
      - If changing a class name, "updates" should be '{"newClassName":"..."}'.
      - If changing a student's name, "updates" should be '{"studentNameChange":{"from":"...","to":"..."}}'.
      - If changing student status, "updates" should be '{"students":[...]}'.
    - For DELETE: payload should contain a "filter" (e.g., className, date) to identify the record to delete.

    If you cannot parse, return {"error":"..."}.
    `;

  const user = `Input: "${transcript}"

    Examples:
    - Input: "Delete the attendance for Class 9 from yesterday"
      Output: {"intent":"DELETE","payload":{"filter":{"className":"9","date":"${yesterday}"}}}}
    - Input: "Change the name of class 10A to 10A-New"
      Output: {"intent":"UPDATE","payload":{"filter":{"className":"10A"},"updates":{"newClassName":"10A-New"}}}
    - Input: "In class 10a, change the name Ramesh to Rakesh"
      Output: {"intent":"UPDATE","payload":{"filter":{"className":"10a"},"updates":{"studentNameChange":{"from":"Ramesh","to":"Rakesh"}}}}
    - Input: "In today's 10A class, mark Arjun as present"
      Output: {"intent":"UPDATE","payload":{"filter":{"className":"10A","date":"${today}"},"updates":{"students":[{"name":"Arjun","status":"present"}]}}}

    Now parse the following input and output only the JSON:
    Input: "${transcript}"
    `;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      max_tokens: 400,
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    const jsonText = extractJson(raw);
    return JSON.parse(jsonText);
  } catch (err) {
    console.error("OpenAI parse error:", err?.message || err);
    return { error: err?.message || "openai_error" };
  }
}

export async function parseAttendanceQuery(transcript) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10);

  const system = `You are an assistant that extracts query parameters from a user's spoken question about student attendance.
    The current date is ${today}.
    When the user says "today", use "${today}".
    When the user says "yesterday", use "${yesterday}".

    Return only valid JSON, with keys:
    - className (string)
    - date (string, optional, in YYYY-MM-DD format)
    - query (string) - what the user is asking for, e.g., "present", "absent", "all"
    If you cannot parse, return {"error":"..."}.

    Examples:
    - "Who was present in Class 10A yesterday?" -> {"className":"10A","date":"${yesterday}","query":"present"}
    - "Show me attendance for Class 7B today" -> {"className":"7B","date":"${today}","query":"all"}
    - "Who was present in Class 10a" -> {"className":"10a","query":"present"}

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
