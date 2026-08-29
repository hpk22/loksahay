import { MINISTRIES, fieldsFor, findMinistry } from "./taxonomy";
import { hasIndicScript } from "./ascii";
import type { AgentTurn, SignpostId, TaxNode } from "./types";

/**
 * Deterministic intake used when no OpenAI key is configured, or when the API
 * call fails. It is deliberately simple: the point is that the service never
 * dead-ends. Everything it does is disclosed to the user as "offline mode".
 */

const OUT_OF_SCOPE: Array<{ id: SignpostId; words: string[] }> = [
  { id: "state_subject", words: ["water supply", "garbage", "street light", "streetlight", "municipal", "corporation", "ration", "pothole", "gram panchayat", "nagar palika", "drainage", "sewage", "electricity board", "land record", "पाणी", "कचरा", "रस्ता"] },
  { id: "rti", words: ["rti", "right to information", "copy of the file", "want information", "want documents", "certified copy"] },
  { id: "subjudice", words: ["court", "sub judice", "subjudice", "hearing", "case is pending in", "tribunal", "न्यायालय"] },
  { id: "service_matter", words: ["i am a government employee", "my promotion", "disciplinary proceeding", "my transfer order", "seniority list"] },
  { id: "religious", words: ["temple", "mosque", "church", "religious"] },
  { id: "suggestion", words: ["i suggest", "suggestion", "my idea", "should be improved"] },
  { id: "consumer_private", words: ["amazon", "flipkart", "swiggy", "zomato", "ola cab", "uber", "myntra"] },
];

function firstLeafWithFields(nodes: TaxNode[], trail: string[]): string[] {
  for (const n of nodes) {
    const p = [...trail, n.id];
    if (n.fields && n.fields.length) return p;
    if (n.children) {
      const deeper = firstLeafWithFields(n.children, p);
      if (deeper.length) return deeper;
    }
  }
  return [];
}

export function fallbackTurn(
  transcript: string[],
  known: Record<string, string>,
): AgentTurn {
  const all = transcript.join(" \n ").toLowerCase();
  const latest = transcript[transcript.length - 1] ?? "";
  const indic = hasIndicScript(transcript.join(" "));
  const language = indic ? "mr-IN" : "en-IN";
  const languageName = indic ? "Marathi" : "English";

  for (const rule of OUT_OF_SCOPE) {
    if (rule.words.some((w) => all.includes(w))) {
      return {
        reply:
          "I have read what you wrote. This one is not something the central grievance portal can act on, but it does have a proper channel. Here it is.",
        language,
        languageName,
        scope: "out_of_scope",
        outOfScopeReason: rule.id,
        routing: null,
        fields: known,
        missing: [],
        readyToFile: false,
        degraded: true,
      };
    }
  }

  const ministry = MINISTRIES.find((m) => m.aka.some((a) => all.includes(a)));

  if (!ministry) {
    return {
      reply:
        "Tell me a little more about which service went wrong. For example a mobile connection, a pension, a bank account, a passport, or the post office.",
      language,
      languageName,
      scope: "unknown",
      routing: null,
      fields: known,
      missing: [],
      readyToFile: false,
      degraded: true,
    };
  }

  const path = firstLeafWithFields(ministry.tree, []);
  const required = fieldsFor(ministry.id, path);
  const fields = { ...known };

  // Treat the most recent message as the answer to the question we last asked.
  const pendingBefore = required.filter((f) => !fields[f.id]);
  if (pendingBefore.length && transcript.length > 1 && latest.trim()) {
    fields[pendingBefore[0].id] = latest.trim();
  }

  const pending = required.filter((f) => !fields[f.id]);

  if (pending.length) {
    const f = pending[0];
    return {
      reply: f.explain ? f.label + " " + f.explain : f.label,
      language,
      languageName,
      scope: "in_scope",
      routing: { ministryId: ministry.id, path, confidence: 0.6 },
      fields,
      missing: pending.map((p) => p.id),
      readyToFile: false,
      degraded: true,
    };
  }

  const facts = required
    .map((f) => f.label + ": " + (fields[f.id] || "not available"))
    .join("\n");
  const body = transcript.filter((_, i) => i === 0).join(" ");
  const draft =
    body +
    "\n\n" +
    facts +
    "\n\nI request that this be examined and that I be told in writing what was done.";

  return {
    reply: "I have everything I need. Please check the grievance below before it is filed.",
    language,
    languageName,
    scope: "in_scope",
    routing: { ministryId: ministry.id, path, confidence: 0.6 },
    fields,
    missing: [],
    readyToFile: true,
    draftOriginal: draft,
    draftAscii: draft,
    degraded: true,
  };
}

export function fallbackAppeal(id: string, closedOn: string): string {
  const m = findMinistry(id.split("/")[1] || "");
  return [
    "Subject: First appeal against closure of grievance " + id,
    "",
    "I filed the above grievance and it was marked disposed of on " + closedOn + ".",
    "No action taken report was communicated to me. I therefore have no way of knowing what was examined, by whom, or what the outcome was. The underlying problem has not changed.",
    "",
    "I request a written action taken report stating what was checked, which officer checked it, and what the result was. If action is still pending, I request a date by which it will be completed.",
    "",
    m ? "This concerns " + m.name + "." : "",
  ]
    .filter(Boolean)
    .join("\n");
}
