"use client";

import { ActionIcon } from "./seal";

/*
  Two ways in.

  The conversation is the better route for most people, and it is offered
  first, but presenting it as the only route quietly excludes two groups: the
  citizen who already knows exactly which Department holds their file and
  resents being interviewed about it, and the citizen who does not want to talk
  to a machine at all. Both are reasonable positions. Neither should be a dead
  end.

  So the choice is stated plainly, with an honest time estimate and an honest
  statement of who each one suits. Nothing is hidden behind the recommended
  option, and the recommendation is a sentence rather than a visual trick: the
  two cards carry equal weight, because a person who wants the form is not
  making a mistake.
*/

export type FlowKind = "chat" | "form";

const OPTIONS: {
  kind: FlowKind;
  icon: "help" | "file";
  title: string;
  time: string;
  body: string;
  suits: string;
  cta: string;
}[] = [
  {
    kind: "chat",
    icon: "help",
    title: "Talk it through with us",
    time: "About 3 minutes",
    body: "Describe what went wrong in your own words, by typing or by speaking. We work out the Department, the category and the details the official form needs, and you only check that it is right.",
    suits: "Best if you do not know which office your matter belongs to, or you would rather not fill in a form.",
    cta: "Start describing",
  },
  {
    kind: "form",
    icon: "file",
    title: "Fill in the form yourself",
    time: "About 5 minutes",
    body: "Choose the Ministry or Department and the category, then enter the details and write your grievance. The same checks run at the end, and it is registered in exactly the same way.",
    suits: "Best if you already know the office concerned, or you are lodging a grievance you have lodged before.",
    cta: "Open the form",
  },
];

export function FlowChooser({ onPick }: { onPick: (kind: FlowKind) => void }) {
  return (
    <div className="stack gap-5">
      <div className="stack gap-2">
        <h1 tabIndex={-1}>How would you like to lodge this?</h1>
        <p className="lede muted">
          Both routes register the grievance in the same way and carry the same timeline. Pick
          whichever suits you. You can switch at any point without losing what you have written.
        </p>
      </div>

      <div className="grid2">
        {OPTIONS.map((o) => (
          <div className="card stack gap-3" key={o.kind}>
            <div className="row" style={{ gap: 12 }}>
              <span className="avatar ink-brand" style={{ background: "var(--maroon-tint)" }} aria-hidden>
                <ActionIcon kind={o.icon} size={22} />
              </span>
              <span className="pill">{o.time}</span>
            </div>

            <h2 style={{ fontSize: "1.2em" }}>{o.title}</h2>
            <p className="small muted" style={{ lineHeight: 1.55 }}>
              {o.body}
            </p>
            <p className="small" style={{ color: "var(--ink-2)" }}>
              {o.suits}
            </p>

            <button
              type="button"
              className={"btn block " + (o.kind === "chat" ? "action" : "ghost")}
              onClick={() => onPick(o.kind)}
              style={{ marginTop: "auto" }}
            >
              {o.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="small muted">
        Nothing is registered until you have read the finished grievance and agreed to it, whichever
        route you take. You are not asked who you are until that point.
      </p>
    </div>
  );
}
