# Loksahay

**Say what went wrong, in your own words.** An independent redesign of the citizen journey on India's public grievance portal, CPGRAMS (`pgportal.gov.in`).

> Loksahay is a prototype. It is not affiliated with, endorsed by, or connected to the Government of India, DARPG or CPGRAMS. Nothing filed here reaches any government system.

---

## The problem, from the portal itself

I filed a real grievance on CPGRAMS and walked the whole journey. Four things I found decided what this is:

**1. Thirteen steps before you can describe your problem.** Register → log in → accept terms certifying your own grievance is eligible → pick a ministry → main category → next level category → *next level category again* (two fields, identical labels) → service-specific fields → and only then a box for what actually happened. Nine of those thirteen steps exist to produce a routing code. One is about you.

**2. The description field cannot accept an Indian language.** The form states:

> *"Alphabet A-Z, a-z, number 0-9 and special characters , . - _ ( ) / : & @ # $ % & * ? + = ! ' " only are allowed in grievance description."*

The homepage advertises support for 22 Eighth Schedule languages. You can navigate in Marathi and then must write your grievance in English. The multilingual promise is a UI veneer over an ASCII-only pipeline.

**3. The complaint against the operator is sent to the operator.** My telecom grievance was assigned to a subordinate officer whose listed organisation is the telecom company I was complaining about. The respondent is the adjudicator.

**4. "Disposed of" is not "resolved."** An earlier grievance of mine shows two timeline rows: *received* on 19 Dec, *CASE DISPOSED OF* on 26 Dec. No officer named, no action described, no reason. The dashboard renders that as a green tick and a closed count.

The deeper diagnosis: **CPGRAMS digitised the dak register, not the citizen's problem.** From/To columns, "disposed of", registration numbers encoding the receiving office. It is a file-movement ledger rendered as HTML, which is why closure means *the file left my desk* rather than *the problem is solved*. The data model has no field for "was it fixed."

## What Loksahay changes

| | CPGRAMS today | Loksahay |
|---|---|---|
| First screen | Register, then 4 dropdowns | One box: "What went wrong?" |
| Classification | You must do it, before describing | Model derives it; you verify it |
| Language | ASCII only in the one field that matters | Your script preserved, ASCII sent alongside |
| Out of scope | Closed as inadmissible, no signpost | Named the right door in 20 seconds |
| Evidence | PDF only, under 4 MB | Photo accepted, converted for you |
| Login | Password + captcha + OTP, up front | Mobile OTP once, at the end, nothing lost |
| Tracking | Account required | Registration number is enough |
| Closure | "CASE DISPOSED OF" | "Closed after 7 days. No action taken report was recorded." |
| Appeal | A separate dashboard | Surfaced on the status page, drafted for you |

### Why it still looks like a government site

Because for the people this serves, the government look **is** the trust signal. A pensioner about to type their problem into a page needs it to feel like the state. A page that looks like a consumer app, asking for a mobile number and a description of a personal problem, reads as a fraud — and that instinct is usually correct.

So roughly two thirds of the shell is deliberately familiar, sampled from the live portal: the bilingual masthead, the maroon navigation (`#6F0047`), the navy panels (`#001C5A`), the amber call to action (`#EFA325`), Source Sans Pro, the left rail, the three circular quick-action tiles, the formal footer. What changed is not the skin — it is the intake underneath it.

Two things were **added** that the original lacks: a working high-contrast mode, and text-size controls that genuinely resize the page.

**On assets:** every mark here is original SVG drawn for this prototype. No government emblem or departmental logo is reproduced — in particular not the State Emblem of India, which is protected under the State Emblem of India (Prohibition of Improper Use) Act, 2005. A ribbon above every page states that this is not a government website.

### The inversion

**Today:** classify → certify → then describe.
**Here:** describe → the system classifies → the citizen *verifies*.

Classification stops being authorship and becomes confirmation — *"This goes to the Department of Telecommunications, under low data speed. Right?"* A question anyone can answer, in any language.

### Bidirectional voice, on Indic-native speech models

Two problems with the portal's existing voice tool. It is one-directional — hold the mic, speak, release, wait, read — and it leans on browser speech APIs that are poor at Indian languages, which defeats the point of a service claiming to serve 22 of them.

So speech in goes to **Sarvam AI's Saarika** (`saarika:v2.5`), speech out comes from **Sarvam's Bulbul** (`bulbul:v3`), and the microphone reopens by itself the moment the reply finishes playing. You talk, it answers aloud, it listens again — like a clerk taking down your complaint across a desk. Reasoning stays with the OpenAI model; Sarvam only does speech.

Audio is captured as raw PCM and encoded to WAV in the browser rather than handed to `MediaRecorder`, because the container `MediaRecorder` produces varies by browser. Capturing the samples directly also yields the loudness figure used to detect when someone has stopped speaking — which is what makes the turn-taking work, rather than asking a 70-year-old to press and hold.

Saarika also returns the detected language, so the first utterance needs no language selection at all. If Sarvam is unreachable, everything degrades to the browser speech APIs and the badge in the UI says which engine is live.

## What is real and what is mocked

**Real**
- Conversation, language detection, routing and grievance drafting are live OpenAI model calls.
- The character filter is the real one — `lib/ascii.ts` reproduces the exact rule the live portal states, so the app can show you precisely what would be deleted.
- The department/category tree is a working subset transcribed from the live portal's own dropdowns, including its mandatory service-specific fields.
- The 21-day timeline and the appeal window come from the published CPGRAMS process flow.

**Mocked**
- Nothing is sent to any government system. No grievance is filed anywhere.
- The OTP is simulated and displayed on screen. No SMS is sent, no real number contacted.
- Registration numbers are generated locally and prefixed `LKS/` so they cannot be mistaken for real ones.
- Officer roles and organisations shown on a grievance are illustrative, not real people.
- Storage is server memory plus your browser's `localStorage`. There is no database.
- Attachments are read in the browser to demonstrate the conversion step. Nothing is uploaded.

No live government system was accessed, tested or interfered with in building this.

## How it would work at scale

Loksahay is designed as a **compatibility layer, not a replacement.** It derives the four taxonomy levels and the service-specific fields the existing NIC form already expects, and submits exactly that payload. No ministry has to change a database for this to run.

Two things it adds that the current pipeline destroys:

- **Dual record.** The citizen's original words, in their own script, stored verbatim alongside the ASCII generated for the legacy field. The officer can see both.
- **Server-side photo → PDF.** The 4 MB PDF rule stays satisfied without the citizen ever owning a converter.

**Cost.** Intake is a small-model classification task. At CPGRAMS' order of volume, a few rupees per grievance puts annual inference in the low crores — against a portal budget already an order of magnitude larger. Reserve larger models for drafting and officer assistance; batch everything else.

**What this deliberately does not do.** It never auto-closes a grievance and never drafts an officer's reply. Automating closure would make template disposal faster, not rarer. The measurement problem — officers judged on disposal rather than resolution — is an incentive question, and no interface fixes it. Loksahay's answer is narrower and honest: make the citizen's side legible, and refuse to call a closure a resolution when nothing was recorded.

## Running it

```bash
npm install
cp .env.example .env.local   # add your OpenAI key
npm run dev
```

Without a key the app still completes the whole journey using a deterministic keyword classifier, and labels itself `offline` in the disclosure panel. A demo should never dead-end on stage.

| Variable | Default | Notes |
|---|---|---|
| `OPENAI_API_KEY` | — | Required for the real intake experience |
| `OPENAI_MODEL` | `openai/gpt-4o-mini` | Any chat model with structured outputs |
| `OPENAI_BASE_URL` | — | Set to use an OpenAI-compatible gateway such as OpenRouter |
| `SARVAM_API_KEY` | — | Indian-language speech. Without it, voice falls back to the browser |
| `SARVAM_SPEAKER` | `ritu` | Any `bulbul:v3` voice |

## Structure

```
app/
  page.tsx              landing — one input, no login, no carousel
  process/page.tsx      the 13-step teardown and what changed
  about/page.tsx        prototype disclosure, artwork provenance
  file/page.tsx         the intake state machine: chat → confirm → draft → OTP → filed
  status/page.tsx       tracking, honest closure rendering, appeal drafting
  api/converse          one structured model turn: reply + scope + routing + fields + draft
  api/file              creates the grievance, computes the SLA date
  api/appeal            drafts a first appeal in the citizen's language
  api/otp               mock verification
lib/
  ascii.ts              the live portal's character rule, reproduced
  lang.ts               deterministic script detection — the model is told which
                        language to answer in, never asked
  sarvam.ts             Indic speech-to-text and text-to-speech
  taxonomy.ts           ministry → category tree, mandatory fields, adjudicator independence
  signposts.ts          where each out-of-scope matter actually belongs
  prompts.ts            intake system prompt + structured output schema
  fallback.ts           deterministic intake when no key is present
```

## Demo grievances

| Number | Shows |
|---|---|
| `LKS/DOPPW/2026/0004821` | Closed after 7 days with no action taken report — and the appeal drafter |
| `LKS/DPOST/2026/0011204` | What a real resolution looks like, for contrast |
