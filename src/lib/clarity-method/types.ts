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

export interface ClaritySwimlane {
  short: string[];
  mid: string[];
  long: string[];
}

export interface ClaritySwimlanes {
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

export const EMPTY_SWIMLANE: ClaritySwimlane = { short: [], mid: [], long: [] };

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
    web: EMPTY_SWIMLANE,
    brandPositioning: EMPTY_SWIMLANE,
    gtm: EMPTY_SWIMLANE,
    sales: EMPTY_SWIMLANE,
    pricingPackaging: EMPTY_SWIMLANE,
    offersAssets: EMPTY_SWIMLANE,
    deliveryProduction: EMPTY_SWIMLANE,
    teamOrg: EMPTY_SWIMLANE,
    opsSystems: EMPTY_SWIMLANE,
    financeMargin: EMPTY_SWIMLANE,
    founderRole: EMPTY_SWIMLANE,
    riskDefensibility: EMPTY_SWIMLANE,
    ecosystemPartners: EMPTY_SWIMLANE,
    legalIP: EMPTY_SWIMLANE,
    technology: EMPTY_SWIMLANE,
  },
  phase: 'diagnostic',
  lockedSections: [],
  history: [],
  conversationId: null,
};
