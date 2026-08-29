import type { SignpostId } from "./types";

export type Signpost = {
  id: SignpostId;
  /** Why CPGRAMS will not act on it. */
  because: string;
  /** Where the citizen should actually go. This is the part CPGRAMS never tells you. */
  instead: string;
  href?: string;
  hrefLabel?: string;
  phone?: string;
};

export const SIGNPOSTS: Record<SignpostId, Signpost> = {
  rti: {
    id: "rti",
    because:
      "This is a request for information under the Right to Information Act, not a grievance about a service.",
    instead:
      "File it as an RTI application instead. It costs Rs 10 and the department must reply within 30 days.",
    href: "https://rtionline.gov.in",
    hrefLabel: "rtionline.gov.in",
  },
  subjudice: {
    id: "subjudice",
    because:
      "The matter is before a court. No government department can act on it while it is sub-judice.",
    instead:
      "Speak to your advocate. If you cannot afford one, free legal aid is available from the National Legal Services Authority.",
    href: "https://nalsa.gov.in",
    hrefLabel: "nalsa.gov.in",
    phone: "15100",
  },
  religious: {
    id: "religious",
    because: "Religious matters are outside the grievance system entirely.",
    instead:
      "There is no administrative remedy here. If a law has been broken, that is a police or court matter.",
  },
  suggestion: {
    id: "suggestion",
    because:
      "CPGRAMS explicitly excludes suggestions. It accepts complaints about a service that failed, not ideas for improving one.",
    instead:
      "Post it on the MyGov platform, which is the channel built to receive citizen suggestions.",
    href: "https://mygov.in",
    hrefLabel: "mygov.in",
  },
  service_matter: {
    id: "service_matter",
    because:
      "You are a government employee raising a service matter. CPGRAMS will not take it until you have exhausted your department's own channels (DoPT OM No. 11013/08/2013-Estt.(A-III), 31.08.2015).",
    instead:
      "Submit it to your department's own grievance channel first. Once that is exhausted and you have proof, CPGRAMS can accept it.",
  },
  state_subject: {
    id: "state_subject",
    because:
      "This is handled by your state government, not by a central ministry. CPGRAMS will forward it and it will usually come back closed.",
    instead:
      "Go directly to your state's grievance portal. It reaches the officer who can actually act.",
    href: "https://grievances.maharashtra.gov.in",
    hrefLabel: "grievances.maharashtra.gov.in (Maharashtra)",
  },
  consumer_private: {
    id: "consumer_private",
    because:
      "This is a complaint against a private business, not a government service.",
    instead:
      "The National Consumer Helpline handles this and can escalate to a consumer commission.",
    href: "https://consumerhelpline.gov.in",
    hrefLabel: "consumerhelpline.gov.in",
    phone: "1915",
  },
};
