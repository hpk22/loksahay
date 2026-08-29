import type { Ministry, TaxNode } from "./types";

/**
 * A working subset of the CPGRAMS routing tree, reconstructed from the live
 * portal's own dropdowns, shaped exactly like the real thing:
 * Ministry -> main category -> next level -> next level, with service-specific
 * mandatory fields hanging off the leaf.
 *
 * `adjudicator` records who actually receives the grievance. On the live portal
 * a telecom complaint is assigned to an officer employed by the operator you are
 * complaining about. We surface that instead of hiding it.
 */
export const MINISTRIES: Ministry[] = [
  {
    id: "DOTEL",
    name: "Telecommunications",
    plain: "Mobile, internet or landline",
    aka: [
      "airtel", "jio", "vi", "vodafone", "bsnl", "sim", "network", "recharge",
      "data", "broadband", "signal", "mobile", "internet", "call drop", "tower",
      "मोबाईल", "इंटरनेट", "नेटवर्क", "डाटा",
    ],
    adjudicator: "respondent",
    adjudicatorNote:
      "Telecom grievances are assigned to an officer employed by the operator you are complaining about.",
    slaDays: 21,
    tree: [
      {
        id: "mobile",
        label: "Mobile Related",
        children: [
          {
            id: "data_speed",
            label: "Data Speed related",
            children: [
              {
                id: "low_speed",
                label: "Consistently low data speed",
                fields: [
                  { id: "mobile_number", label: "Mobile number affected", type: "tel" },
                  {
                    id: "provider",
                    label: "Your operator",
                    explain: "Airtel, Jio, Vi, BSNL",
                    placeholder: "Airtel",
                  },
                  {
                    id: "circle",
                    label: "Which state are you in?",
                    explain:
                      "The portal calls this 'Circle / LSA'. It only means your telecom region.",
                    placeholder: "Maharashtra and Goa",
                  },
                ],
              },
              { id: "no_data", label: "No data connectivity" },
            ],
          },
          {
            id: "billing",
            label: "Billing related",
            children: [
              { id: "wrong_charge", label: "Charged for something I did not use" },
              { id: "refund", label: "Refund not received" },
            ],
          },
          { id: "call_drop", label: "Call drops / poor voice quality" },
        ],
      },
      { id: "landline", label: "Landline Related" },
      { id: "broadband", label: "Broadband Related" },
    ],
  },
  {
    id: "DOPPW",
    name: "Pension and Pensioners' Welfare",
    plain: "Pension",
    aka: [
      "pension", "ppo", "pensioner", "retire", "family pension", "commutation",
      "arrears", "life certificate", "jeevan pramaan",
      "पेन्शन", "पेंशन", "निवृत्तीवेतन",
    ],
    adjudicator: "same_org",
    adjudicatorNote:
      "Your pension grievance goes to the same department that administers your pension.",
    slaDays: 21,
    tree: [
      {
        id: "not_credited",
        label: "Pension not credited",
        children: [
          {
            id: "monthly_stopped",
            label: "Monthly pension has stopped",
            fields: [
              {
                id: "ppo",
                label: "PPO number",
                explain:
                  "Printed on your Pension Payment Order booklet. Skip it if you cannot find it.",
              },
              { id: "months", label: "Since which month has it stopped?", placeholder: "April 2026" },
              { id: "bank", label: "Which bank is it paid into?" },
            ],
          },
          { id: "partial", label: "Received less than usual" },
        ],
      },
      { id: "family_pension", label: "Family pension not started" },
      { id: "life_certificate", label: "Life certificate not accepted" },
      { id: "arrears", label: "Arrears not paid" },
    ],
  },
  {
    id: "DOLEM",
    name: "Labour and Employment",
    plain: "Provident fund (EPFO)",
    aka: ["epf", "epfo", "pf", "provident", "uan", "withdrawal", "employer", "esic", "gratuity", "भविष्य निर्वाह"],
    adjudicator: "same_org",
    adjudicatorNote: "EPF grievances are handled inside EPFO itself.",
    slaDays: 21,
    tree: [
      {
        id: "epf",
        label: "Provident Fund (EPF)",
        children: [
          {
            id: "withdrawal",
            label: "Withdrawal claim rejected or stuck",
            fields: [
              {
                id: "uan",
                label: "UAN number",
                explain: "The 12-digit Universal Account Number on your payslip.",
              },
              { id: "claim_date", label: "When did you apply?", placeholder: "12 June 2026" },
              { id: "employer", label: "Employer name" },
            ],
          },
          { id: "transfer", label: "Transfer between employers not done" },
          { id: "kyc", label: "KYC / details not updated" },
        ],
      },
      { id: "esic", label: "ESIC / medical benefit" },
    ],
  },
  {
    id: "DFSBD",
    name: "Financial Services (Banking Division)",
    plain: "Bank",
    aka: ["bank", "sbi", "hdfc", "icici", "atm", "account", "loan", "cheque", "upi", "debited", "बँक", "बैंक", "खाते"],
    adjudicator: "respondent",
    adjudicatorNote:
      "Bank grievances are assigned to the bank you are complaining about. The Reserve Bank ombudsman is a separate, independent channel.",
    slaDays: 21,
    tree: [
      {
        id: "account",
        label: "Account related",
        children: [
          {
            id: "wrong_debit",
            label: "Money debited without my authorisation",
            fields: [
              { id: "bank", label: "Bank name" },
              {
                id: "acct_last4",
                label: "Last 4 digits of the account",
                minimal: true,
                explain: "We only ask for the last 4. Never share your full account number.",
              },
              { id: "txn_date", label: "Date of the transaction", type: "date" },
              { id: "amount", label: "Amount" },
            ],
          },
          { id: "atm_failed", label: "ATM did not dispense but account was debited" },
          { id: "frozen", label: "Account frozen or blocked" },
        ],
      },
      { id: "loan", label: "Loan related" },
      { id: "pmjdy", label: "Government scheme account (Jan Dhan etc.)" },
    ],
  },
  {
    id: "DFSID",
    name: "Financial Services (Insurance Division)",
    plain: "Insurance",
    aka: ["insurance", "lic", "policy", "claim", "premium", "mediclaim", "nominee", "maturity"],
    adjudicator: "respondent",
    adjudicatorNote: "Insurance grievances are assigned to the insurer you are complaining about.",
    slaDays: 21,
    tree: [
      {
        id: "claim",
        label: "Claim related",
        children: [
          {
            id: "claim_rejected",
            label: "Claim rejected without reason",
            fields: [
              { id: "insurer", label: "Insurance company" },
              { id: "policy_last4", label: "Last 4 digits of the policy number", minimal: true },
              { id: "claim_date", label: "When did you file the claim?" },
            ],
          },
          { id: "claim_delay", label: "Claim pending too long" },
        ],
      },
      { id: "policy", label: "Policy servicing" },
    ],
  },
  {
    id: "DPOST",
    name: "Posts",
    plain: "Post office",
    aka: ["post", "speed post", "parcel", "courier", "postman", "money order", "postal", "letter", "पोस्ट", "टपाल"],
    adjudicator: "same_org",
    adjudicatorNote: "Postal grievances are handled inside India Post.",
    slaDays: 21,
    tree: [
      {
        id: "delivery",
        label: "Delivery related",
        children: [
          {
            id: "not_delivered",
            label: "Article not delivered",
            fields: [
              { id: "tracking", label: "Tracking / consignment number" },
              { id: "booked_on", label: "Booked on", type: "date" },
              { id: "office", label: "Which post office?" },
            ],
          },
          { id: "damaged", label: "Article delivered damaged" },
        ],
      },
      { id: "savings", label: "Post office savings / RD / NSC" },
    ],
  },
  {
    id: "MEAPD",
    name: "External Affairs",
    plain: "Passport",
    aka: ["passport", "visa", "psk", "police verification", "rpo", "tatkal", "embassy", "पासपोर्ट"],
    adjudicator: "same_org",
    adjudicatorNote: "Passport grievances go to the Regional Passport Office.",
    slaDays: 21,
    tree: [
      {
        id: "passport",
        label: "Passport related",
        children: [
          {
            id: "delay",
            label: "Passport delayed beyond normal time",
            fields: [
              { id: "file_number", label: "File number", explain: "On your application receipt." },
              { id: "applied_on", label: "Applied on", type: "date" },
              { id: "rpo", label: "Which passport office?" },
            ],
          },
          { id: "police_verification", label: "Police verification stuck" },
        ],
      },
    ],
  },
  {
    id: "CBODT",
    name: "Central Board of Direct Taxes (Income Tax)",
    plain: "Income tax",
    aka: ["income tax", "itr", "refund", "tds", "pan", "assessment", "26as"],
    adjudicator: "same_org",
    adjudicatorNote: "Income tax grievances are handled inside the Income Tax Department.",
    slaDays: 21,
    tree: [
      {
        id: "refund",
        label: "Refund related",
        children: [
          {
            id: "refund_not_received",
            label: "Refund not received",
            fields: [
              { id: "ay", label: "Assessment year", placeholder: "2025-26" },
              { id: "ack", label: "ITR acknowledgement number" },
            ],
          },
          { id: "refund_short", label: "Refund received is less than claimed" },
        ],
      },
      { id: "tds", label: "TDS mismatch" },
    ],
  },
];

export function findMinistry(id: string): Ministry | undefined {
  return MINISTRIES.find((m) => m.id === id);
}

/** Resolve an ordered node-id path to its nodes within a ministry. */
export function resolvePath(ministryId: string, path: string[]): TaxNode[] {
  const m = findMinistry(ministryId);
  if (!m) return [];
  const out: TaxNode[] = [];
  let level: TaxNode[] | undefined = m.tree;
  for (const id of path) {
    const node: TaxNode | undefined = level?.find((n) => n.id === id);
    if (!node) break;
    out.push(node);
    level = node.children;
  }
  return out;
}

/** The breadcrumb CPGRAMS itself prints into the grievance description. */
export function pathLabel(ministryId: string, path: string[]): string {
  const m = findMinistry(ministryId);
  const nodes = resolvePath(ministryId, path);
  return [m?.name, ...nodes.map((n) => n.label)].filter(Boolean).join(" >> ");
}

/** Mandatory service-specific fields for the deepest resolved node. */
export function fieldsFor(ministryId: string, path: string[]) {
  const nodes = resolvePath(ministryId, path);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const f = nodes[i].fields;
    if (f && f.length) return f;
  }
  return [];
}

/** A compact tree rendering used to ground the model. */
export function taxonomyForPrompt(): string {
  const lines: string[] = [];
  for (const m of MINISTRIES) {
    lines.push(m.id + " = " + m.name + " (" + m.plain + ")");
    const walk = (nodes: TaxNode[], trail: string[]) => {
      for (const n of nodes) {
        const p = [...trail, n.id];
        lines.push("  " + p.join(".") + " = " + n.label);
        if (n.children) walk(n.children, p);
      }
    };
    walk(m.tree, []);
  }
  return lines.join("\n");
}
