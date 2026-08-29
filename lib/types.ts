export type Adjudicator = "independent" | "same_org" | "respondent";

export type FieldSpec = {
  id: string;
  label: string;
  /** Plain-language version of a bureaucratic label. */
  explain?: string;
  type?: "text" | "tel" | "date";
  placeholder?: string;
  /** Ask for a partial value only (e.g. last 4 digits) to minimise data collection. */
  minimal?: boolean;
};

export type TaxNode = {
  id: string;
  label: string;
  children?: TaxNode[];
  fields?: FieldSpec[];
};

export type Ministry = {
  id: string;
  /** The official name, as CPGRAMS shows it. */
  name: string;
  /** What a citizen would actually call it. */
  plain: string;
  aka: string[];
  adjudicator: Adjudicator;
  adjudicatorNote: string;
  slaDays: number;
  tree: TaxNode[];
};

export type Routing = {
  ministryId: string;
  /** Ordered node ids: main category, next level, next level. */
  path: string[];
  confidence: number;
};

export type ScopeVerdict =
  | { kind: "in_scope" }
  | { kind: "out_of_scope"; reason: SignpostId }
  | { kind: "unknown" };

export type SignpostId =
  | "rti"
  | "subjudice"
  | "religious"
  | "suggestion"
  | "service_matter"
  | "state_subject"
  | "consumer_private";

export type AgentTurn = {
  reply: string;
  language: string;
  languageName: string;
  scope: ScopeVerdict["kind"];
  outOfScopeReason?: SignpostId;
  routing: Routing | null;
  fields: Record<string, string>;
  missing: string[];
  readyToFile: boolean;
  draftOriginal?: string;
  draftAscii?: string;
  /** True when the model had no key and a deterministic fallback answered. */
  degraded?: boolean;
};

export type TimelineEvent = {
  date: string;
  label: string;
  detail?: string;
  actor?: string;
  tone: "neutral" | "good" | "bad";
};

export type Grievance = {
  id: string;
  createdAt: string;
  mobileLast4: string;
  language: string;
  languageName: string;
  ministryId: string;
  path: string[];
  fields: Record<string, string>;
  /** Exactly what the citizen said, in their own script. Never destroyed. */
  original: string;
  /** The ASCII payload the legacy CPGRAMS form would accept. */
  ascii: string;
  droppedChars: number;
  attachmentName?: string;
  status: "under_process" | "disposed" | "resolved";
  closedAt?: string;
  /** Action Taken Report. Empty string reproduces the real-world failure. */
  atr?: string;
  timeline: TimelineEvent[];
  officer?: { role: string; organisation: string; independence: Adjudicator };
};
