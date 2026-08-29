# Submission pack

## Project summary (target: under 250 words)

I filed a real grievance on CPGRAMS, India's central public grievance portal, and walked the whole journey.

Three findings shaped this. You pass thirteen steps before you can describe your problem; nine exist only to produce a routing code. The description field accepts only A-Z and digits, so it cannot hold one Devanagari or Tamil character, on a site advertising 22 languages. An earlier grievance of mine shows two rows: received, then CASE DISPOSED OF seven days later, no officer named, no action described.

Loksahay keeps the government shell on purpose - the bilingual masthead, the maroon navigation, the left rail - because for a pensioner that familiarity is the trust signal, and a page that looks like a startup reads as fraud. What changed is the intake underneath.

You describe the problem in your own words and language, by voice or text, and the microphone reopens by itself after each reply. An OpenAI model derives the ministry, the category path and the fields the legacy form needs; you only verify them. Out-of-scope matters get the right door in twenty seconds. Your script is kept, with an English version sent alongside. A photo is accepted where the portal demands a PDF. Identity is asked once, at the end.

Tracking needs no account. A closure with no action taken report is called exactly that, and the appeal is drafted for you.

It emits the payload the existing form already expects. Everything mocked is labelled in-app.

---

## Two-minute video script

**Rule: minute one is the citizen. Minute two is you. Do not explain the architecture while a screen is loading.**

### 0:00–0:12 — The evidence, not the pitch

*Screen: your real CPGRAMS Communication Details, the two-row table.*

> "This is my grievance on India's national grievance portal. Received on the nineteenth. Disposed of on the twenty-sixth. No officer named, no action described, no reason. The dashboard counts that as closed."

### 0:12–0:22 — The second finding

*Screen: the grievance form, zoomed on the character rule.*

> "And this is the field where you describe your problem. A to Z and digits only. On a site that advertises twenty-two Indian languages, you cannot type a single Marathi character into it."

### 0:22–1:05 — The demo, in one unbroken take

*Screen: Loksahay landing. Tap the microphone. Speak in Marathi.*

> *(spoken in Marathi)* "My pension has not been credited for four months. I have been to the bank three times."

*It replies aloud in Marathi and reopens the mic on its own. Answer its one question.*

> "It answers back and listens again by itself. I never picked a ministry. It did."

*Confirmation card appears.*

> "It routed this to Pension and Pensioners' Welfare. All I do is say yes."

*Draft screen. Point at the red panel.*

> "It wrote the grievance in Marathi. And it shows me the thirty-nine characters the real portal would have deleted — so it keeps my words and sends an English version alongside."

*OTP once, then the success screen.*

> "It asks who I am at the end, not the beginning. Due by the nineteenth of September. Number sent to my phone."

### 1:05–1:20 — The two moments that land

*Screen: track the pension demo grievance.*

> "And when a grievance is closed with nothing, it says so. Closed after seven days, no action taken report recorded. Not a green tick. It has already written my appeal."

*Screen: type the water-supply example.*

> "Out of scope in twenty seconds, with the right door named. Today the portal takes your account, your four dropdowns and your grievance, and only then tells you it is inadmissible."

### 1:20–1:32 — Why it still looks like a government site

*Screen: the masthead and maroon nav.*

> "I deliberately did not restyle this into a startup. For the person this serves, the government look is the trust signal — a page that looks like a consumer app, asking for your mobile number and your personal problem, reads as a fraud. So the shell stayed familiar and the intake underneath it changed. Every mark on it is original artwork; no government emblem is used anywhere."

### 1:32–1:52 — How it is built

> "One structured OpenAI call per turn returns the reply, the language, the scope, the routing path, the fields and the draft. Speech is Sarvam — Saarika transcribing, Bulbul speaking — because the browser speech APIs are poor at Indian languages, and that is the whole point here. The mic reopens on silence detection, so nobody has to press and hold. Codex built the intake state machine and the taxonomy layer.
>
> The important choice is that this is a compatibility layer, not a replacement. It derives the same four taxonomy levels and service fields the existing NIC form expects and emits exactly that payload. No ministry changes a database. What it adds is the citizen's original script, kept alongside the ASCII the legacy field can accept, and photo-to-PDF on the server so nobody needs a file converter to complain."

### 1:52–2:00 — What you did not do

> "It never auto-closes a grievance and never drafts an officer's reply — automating closure would make template disposal faster, not rarer. Everything mocked is labelled in the app. No live government system was touched."

---

## Pre-flight checklist

- [ ] `OPENAI_API_KEY` set in the Vercel project (Production **and** Preview)
- [ ] Open the deployed URL in a private window — it must load with no login
- [ ] Walk the full journey once on a phone, on mobile data
- [ ] Both demo grievances open from `/status`
- [ ] Voice tested in Chrome; if the room is loud, have the typed path ready as backup
- [ ] Disclosure panel expanded once on camera — "Honesty" is a scored criterion
- [ ] Video under 2:00, summary under 250 words
- [ ] Same registered email used for the submission form
