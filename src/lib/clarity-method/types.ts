// Clarity Method™ Types and Constants
// Strategic Diagnosis + Execution Mapping for Founders

export interface ClarityStrategicTruth {
  whoWeAre: ClarityBox;
  whatWeDo: ClarityBox;
  whyWeWin: ClarityBox;
  whatWeAreNot: ClarityBox;
  howWeDie: ClarityBox;
  theWedge: ClarityBox;
}

export interface ClarityBox {
  value: string;
  status: 'draft' | 'locked';
  lockedAt?: string;
}

export interface ClarityNorthStar {
  revenueTarget: string;
  marginFloor: string;
  founderRole: string;
  complexityCeiling: string;
}

export interface ClarityCoreEngine {
  demand: EngineAnswer;
  salesScoping: EngineAnswer;
  delivery: EngineAnswer;
  qualityControl: EngineAnswer;
  cashFlow: EngineAnswer;
  marginByOffer: EngineAnswer;
  teamLoad: EngineAnswer;
  primaryConstraint: string;
}

export interface EngineAnswer {
  answer: string;
  warning?: string;
}

export interface ClarityValueExpansion {
  left: { items: ClarityExpansionItem[] };
  core: { items: ClarityExpansionItem[] };
  right: { items: ClarityExpansionItem[] };
  vertical: { items: ClarityExpansionItem[] };
}

export interface ClarityExpansionItem {
  id: string;
  name: string;
  isAttachable: boolean;
  isRepeatable: boolean;
  improvesMargin: boolean;
  status: 'active' | 'parked';
}

export interface ClarityServiceProduct {
  customService: string[];
  productizedService: string[];
  productIP: string[];
}

export interface ClarityParanoiaMap {
  ai: string;
  inHouse: string;
  priceCompression: string;
  speedCommoditization: string;
  other: string[];
}

export interface ClarityStrategy {
  core: string;
  expansion: string;
  orgShift: string;
  founderRole: string;
  topRisks: string[];
}

export interface ClaritySwimlaneTimeframe {
  objective: string;
  items: string[];
}

export interface ClaritySwimlane {
  short: ClaritySwimlaneTimeframe | string[]; // Support both new and legacy formats
  mid: ClaritySwimlaneTimeframe | string[];
  long: ClaritySwimlaneTimeframe | string[];
}

// Legacy format support (array only)
export interface ClaritySwimlaneSimple {
  short: string[];
  mid: string[];
  long: string[];
}

export interface ClaritySwimlanes {
  // Core predefined swimlanes
  web: ClaritySwimlane;
  brandPositioning: ClaritySwimlane;
  gtm: ClaritySwimlane;
  sales: ClaritySwimlane;
  pricingPackaging: ClaritySwimlane;
  offersAssets: ClaritySwimlane;
  deliveryProduction: ClaritySwimlane;
  teamOrg: ClaritySwimlane;
  opsSystems: ClaritySwimlane;
  financeMargin: ClaritySwimlane;
  founderRole: ClaritySwimlane;
  riskDefensibility: ClaritySwimlane;
  ecosystemPartners: ClaritySwimlane;
  legalIP: ClaritySwimlane;
  technology: ClaritySwimlane;
  // Custom swimlanes (key is custom_${id})
  [key: `custom_${string}`]: ClaritySwimlane & { label: string };
}

export interface ClarityCanvasVersion {
  id: string;
  timestamp: string;
  changedBy: 'user' | 'ai';
  changes: string;
  snapshot?: Partial<{
    strategicTruth: ClarityStrategicTruth;
    northStar: ClarityNorthStar;
    strategy: ClarityStrategy;
  }>;
}

export interface ClarityCanvas {
  id: string;
  clientId: string;
  userId: string;
  strategicTruth: ClarityStrategicTruth | null;
  northStar: ClarityNorthStar | null;
  coreEngine: ClarityCoreEngine | null;
  valueExpansion: ClarityValueExpansion | null;
  serviceProductFilter: ClarityServiceProduct | null;
  killList: string[] | null;
  paranoiaMap: ClarityParanoiaMap | null;
  strategy: ClarityStrategy | null;
  swimlanes: ClaritySwimlanes | null;
  phase: 'diagnostic' | 'constraint' | 'execution';
  lockedSections: string[] | null;
  history: ClarityCanvasVersion[] | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Section metadata for Coach Mode
export const STRATEGIC_TRUTH_CONFIG = {
  whoWeAre: {
    question: "What function do we serve?",
    why: "Prevents identity drift",
    prompt: "Be specific. What would your best clients say you are?",
    badAnswers: ["We're a consulting firm", "We help businesses grow", "Full-service agency"],
    goodExamples: ["We are a creative production studio focused on commercial branded content for digital platforms"],
  },
  whatWeDo: {
    question: "What outcome do clients get?",
    why: "Avoids activity theater",
    prompt: "What transformation do you deliver? Not activities—outcomes.",
    badAnswers: ["We provide services", "We do marketing", "We consult"],
    goodExamples: ["We turn brand objectives into strategic content that performs on digital platforms"],
  },
  whyWeWin: {
    question: "Why us vs alternatives?",
    why: "Forces real advantage",
    prompt: "Why do clients choose you over the obvious alternatives?",
    badAnswers: ["We have great customer service", "We're passionate", "We care"],
    goodExamples: ["Speed + trust + quality. We're known as a known asset that delivers epic work, transparently priced."],
  },
  whatWeAreNot: {
    question: "What do we refuse to be?",
    why: "Protects margin",
    prompt: "What business will you turn away? What won't you become?",
    badAnswers: ["We don't do bad work", "We're not cheap"],
    goodExamples: ["We do NOT adopt your legacy approach. We are NOT touching union shops. We are NOT making false promises."],
  },
  howWeDie: {
    question: "What assumption kills us?",
    why: "Drives defensibility",
    prompt: "What threat, if it became reality, would destroy this business?",
    badAnswers: ["If we lose clients", "If the market changes"],
    goodExamples: ["AI: Threat of smaller task going into a prompt. In-house teams. Volume removes agency."],
  },
  theWedge: {
    question: "Why do we exist at all?",
    why: "Explains leverage",
    prompt: "What's the one sentence reason this business should exist vs someone doing it themselves?",
    badAnswers: ["We're the best", "Quality and service"],
    goodExamples: ["Speed, trust and higher quality than agency or in-house. VELOCITY TO OUTCOME. It's just done. Removal of RISK."],
  },
};

export const CORE_ENGINE_CONFIG = {
  demand: {
    question: "Where does demand come from?",
    warning: "founder = primary channel",
    prompts: ["What % comes from you vs the business?", "How dependent are you on referrals?"],
  },
  salesScoping: {
    question: "How are deals scoped and closed?",
    warning: "founder = only closer",
    prompts: ["Who can close a deal without you?", "How repeatable is your sales process?"],
  },
  delivery: {
    question: "How is work delivered?",
    warning: "founder = delivery bottleneck",
    prompts: ["What happens if you're unavailable for 2 weeks?", "Who owns quality?"],
  },
  qualityControl: {
    question: "How is quality ensured?",
    warning: "founder = only QC",
    prompts: ["Can work ship without your review?", "What's the failure rate?"],
  },
  cashFlow: {
    question: "How healthy is cash flow?",
    warning: "< 2 months runway",
    prompts: ["How far ahead are you paid vs work delivered?", "What's your collection cycle?"],
  },
  marginByOffer: {
    question: "What's margin by offer type?",
    warning: "< 30% blended margin",
    prompts: ["Which offers make money?", "Which ones are labor traps?"],
  },
  teamLoad: {
    question: "How loaded is the team?",
    warning: "founder utilization > 80%",
    prompts: ["Who has capacity?", "What gets dropped when things get busy?"],
  },
};

export const SWIMLANE_LABELS: Record<keyof ClaritySwimlanes, string> = {
  web: "Web",
  brandPositioning: "Brand / Positioning",
  gtm: "GTM",
  sales: "Sales",
  pricingPackaging: "Pricing & Packaging",
  offersAssets: "Offers / Assets",
  deliveryProduction: "Delivery / Production",
  teamOrg: "Team / Org",
  opsSystems: "Ops / Systems",
  financeMargin: "Finance / Margin",
  founderRole: "Founder Role",
  riskDefensibility: "Risk / Defensibility",
  ecosystemPartners: "Ecosystem / Partners",
  legalIP: "Legal / IP",
  technology: "Technology",
};

export const SWIMLANE_QUESTION = "What must change here to break the constraint and support the wedge?";

export const SWIMLANE_TIMEFRAME_LABELS = {
  short: "0-90 Days",
  mid: "3-12 Months",
  long: "12-24 Months",
};

export const EMPTY_SWIMLANE_TIMEFRAME: ClaritySwimlaneTimeframe = { objective: '', items: [] };

export const EMPTY_SWIMLANE: ClaritySwimlane = {
  short: { objective: '', items: [] },
  mid: { objective: '', items: [] },
  long: { objective: '', items: [] },
};

// Guidance for each swimlane - what to think about, questions to ask
export const SWIMLANE_GUIDANCE: Record<string, { why: string; questions: string[]; examples: string[] }> = {
  web: {
    why: "Your website is your 24/7 salesperson. It either pre-qualifies or confuses.",
    questions: ["Does it sell or just describe?", "Is it built for YOUR ideal client?", "What's the conversion path?"],
    examples: ["Rebuild homepage with case study focus", "Add pricing calculator", "Kill the blog nobody reads"],
  },
  brandPositioning: {
    why: "If you can't articulate why you're different, neither can your clients.",
    questions: ["What's the ONE thing you're known for?", "Who's your anti-client?", "What category do you own?"],
    examples: ["Position as 'speed-to-market specialists'", "Stop saying 'full-service'", "Create signature framework"],
  },
  gtm: {
    why: "Inbound is a slow game. You need a system that doesn't depend on luck.",
    questions: ["Where do ideal clients hang out?", "What's your outbound motion?", "How do you create urgency?"],
    examples: ["LinkedIn POV content 3x/week", "Partner channel with complementary firms", "Case study launch campaign"],
  },
  sales: {
    why: "If founder is only closer, you have a job not a business.",
    questions: ["Who else can close?", "What's the discovery process?", "Where do deals die?"],
    examples: ["Create sales playbook", "Train senior to run discovery", "Build proposal templates"],
  },
  pricingPackaging: {
    why: "Hourly = labor trap. Packages = leverage. Which one are you?",
    questions: ["What's your anchor offer?", "Where's the margin?", "How do you scope?"],
    examples: ["Kill hourly, move to project pricing", "Create 3-tier package structure", "Add retainer upsell"],
  },
  offersAssets: {
    why: "You need things you can sell repeatedly without reinventing.",
    questions: ["What's your productized offer?", "What IP do you own?", "What can be templated?"],
    examples: ["Launch audit productized service", "Build diagnostic framework", "Create client portal"],
  },
  deliveryProduction: {
    why: "If quality depends on you being in every project, you're the bottleneck.",
    questions: ["What's the workflow?", "Where are the handoffs?", "What tools are missing?"],
    examples: ["Document delivery playbook", "Hire production manager", "Implement project management tool"],
  },
  teamOrg: {
    why: "Structure determines speed. Wrong seats = wrong outcomes.",
    questions: ["Who does what?", "What's missing?", "Who needs to go?"],
    examples: ["Hire ops person", "Promote senior to lead", "Create clear role ownership"],
  },
  opsSystems: {
    why: "Chaos kills margin. Systems create predictability.",
    questions: ["What's manual that shouldn't be?", "Where's the reporting gap?", "What's on fire weekly?"],
    examples: ["Automate invoicing", "Weekly metrics dashboard", "Client onboarding checklist"],
  },
  financeMargin: {
    why: "Revenue is vanity, profit is sanity, cash is reality.",
    questions: ["What's gross margin?", "Where's cash tied up?", "What's burning money?"],
    examples: ["Switch to 50% upfront", "Cut underperforming service line", "Review contractor rates"],
  },
  founderRole: {
    why: "Your role has to change for the business to change.",
    questions: ["What should you STOP doing?", "What only YOU can do?", "Who replaces you in what?"],
    examples: ["Stop delivery, focus on sales", "Hire EA", "Delegate QC to senior"],
  },
  riskDefensibility: {
    why: "If you're replaceable, you're vulnerable. Build moats.",
    questions: ["What's defensible?", "What's the AI risk?", "How deep are relationships?"],
    examples: ["Lock in multi-year contracts", "Build proprietary tool", "Document unique methodology"],
  },
  ecosystemPartners: {
    why: "Other people's audiences are the fastest path to growth.",
    questions: ["Who sends you clients?", "Who should?", "What's the referral system?"],
    examples: ["Formalize partner program", "Create co-marketing with complementary firm", "Build affiliate structure"],
  },
  legalIP: {
    why: "Protect what you've built. Don't leave value on the table.",
    questions: ["What's trademarked?", "Are contracts tight?", "Who owns what?"],
    examples: ["Trademark methodology", "Update client contracts", "Create NDA templates"],
  },
  technology: {
    why: "Tech should multiply your team, not distract them.",
    questions: ["What's the stack?", "What's underutilized?", "What's overkill?"],
    examples: ["Consolidate tools", "Implement AI for X", "Build client dashboard"],
  },
};

export const DEFAULT_CANVAS: Omit<ClarityCanvas, 'id' | 'clientId' | 'userId' | 'createdAt' | 'updatedAt'> = {
  strategicTruth: {
    whoWeAre: { value: '', status: 'draft' },
    whatWeDo: { value: '', status: 'draft' },
    whyWeWin: { value: '', status: 'draft' },
    whatWeAreNot: { value: '', status: 'draft' },
    howWeDie: { value: '', status: 'draft' },
    theWedge: { value: '', status: 'draft' },
  },
  northStar: {
    revenueTarget: '',
    marginFloor: '',
    founderRole: '',
    complexityCeiling: '',
  },
  coreEngine: {
    demand: { answer: '' },
    salesScoping: { answer: '' },
    delivery: { answer: '' },
    qualityControl: { answer: '' },
    cashFlow: { answer: '' },
    marginByOffer: { answer: '' },
    teamLoad: { answer: '' },
    primaryConstraint: '',
  },
  valueExpansion: {
    left: { items: [] },
    core: { items: [] },
    right: { items: [] },
    vertical: { items: [] },
  },
  serviceProductFilter: {
    customService: [],
    productizedService: [],
    productIP: [],
  },
  killList: [],
  paranoiaMap: {
    ai: '',
    inHouse: '',
    priceCompression: '',
    speedCommoditization: '',
    other: [],
  },
  strategy: {
    core: '',
    expansion: '',
    orgShift: '',
    founderRole: '',
    topRisks: [],
  },
  swimlanes: {
    web: { ...EMPTY_SWIMLANE },
    brandPositioning: { ...EMPTY_SWIMLANE },
    gtm: { ...EMPTY_SWIMLANE },
    sales: { ...EMPTY_SWIMLANE },
    pricingPackaging: { ...EMPTY_SWIMLANE },
    offersAssets: { ...EMPTY_SWIMLANE },
    deliveryProduction: { ...EMPTY_SWIMLANE },
    teamOrg: { ...EMPTY_SWIMLANE },
    opsSystems: { ...EMPTY_SWIMLANE },
    financeMargin: { ...EMPTY_SWIMLANE },
    founderRole: { ...EMPTY_SWIMLANE },
    riskDefensibility: { ...EMPTY_SWIMLANE },
    ecosystemPartners: { ...EMPTY_SWIMLANE },
    legalIP: { ...EMPTY_SWIMLANE },
    technology: { ...EMPTY_SWIMLANE },
  },
  phase: 'diagnostic',
  lockedSections: [],
  history: [],
  conversationId: null,
};
