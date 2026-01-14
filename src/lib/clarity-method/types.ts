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

// Section metadata for Coach Mode - COMPREHENSIVE guidance for consultants
export const STRATEGIC_TRUTH_CONFIG = {
  whoWeAre: {
    question: "What function do we serve?",
    why: "Prevents identity drift. Without a clear function, you chase every opportunity and become nothing to everyone.",
    prompt: "Be specific. What would your best clients say you are?",
    badAnswers: ["We're a consulting firm", "We help businesses grow", "Full-service agency"],
    goodExamples: ["We are a creative production studio focused on commercial branded content for digital platforms"],
    howToThink: "Think about what your BEST client—the one who pays you the most and causes the least friction—would say if asked 'What do they do for you?' That specific answer is your function.",
    script: "Walk me through your last 3 best clients. Not average—your BEST. What did each of them hire you to do? [Listen for patterns] If I asked them 'What does [company] do?', what would they say?",
    redFlags: ["If they say 'it depends on the client' → they have positioning drift", "If they describe activities not outcomes → they're selling time not value", "If they name a broad category → they're competing on price"],
  },
  whatWeDo: {
    question: "What outcome do clients get?",
    why: "Avoids activity theater. Clients don't buy activities, they buy outcomes. If you can't name the outcome, you're selling your time.",
    prompt: "What transformation do you deliver? Not activities—outcomes.",
    badAnswers: ["We provide services", "We do marketing", "We consult"],
    goodExamples: ["We turn brand objectives into strategic content that performs on digital platforms"],
    howToThink: "Complete this sentence: 'After working with us, clients have ___.' If you can't fill in a concrete outcome, you're describing a job, not a business.",
    script: "Forget what you DO for a second. Tell me what clients HAVE after working with you that they didn't have before. What's different in their world?",
    redFlags: ["If they list services → push for outcomes", "If they say 'happy clients' → too vague, get specific", "If they can't articulate it → this is THE constraint"],
  },
  whyWeWin: {
    question: "Why us vs alternatives?",
    why: "Forces real advantage. Every client has alternatives—doing nothing, doing it themselves, hiring someone else. If you can't name why you beat all three, you're losing deals you don't even know about.",
    prompt: "Why do clients choose you over the obvious alternatives?",
    badAnswers: ["We have great customer service", "We're passionate", "We care"],
    goodExamples: ["Speed + trust + quality. We're known as a known asset that delivers epic work, transparently priced."],
    howToThink: "The alternatives are: (1) Do nothing (2) DIY/in-house (3) Competitor. Why are you better than ALL THREE for your specific client type?",
    script: "Your client is sitting with your proposal and your competitor's. They like both. Why do they pick you? And don't say quality or service—everyone says that.",
    redFlags: ["If they say 'relationships' → that's not scalable", "If they say 'quality' → push for what quality means specifically", "If they can't answer → they're winning on luck or price"],
  },
  whatWeAreNot: {
    question: "What do we refuse to be?",
    why: "Protects margin. Every time you say yes to the wrong thing, you dilute your positioning and train the market to see you as a commodity.",
    prompt: "What business will you turn away? What won't you become?",
    badAnswers: ["We don't do bad work", "We're not cheap"],
    goodExamples: ["We do NOT adopt your legacy approach. We are NOT touching union shops. We are NOT making false promises."],
    howToThink: "Think about your worst clients—the ones who sucked margin, caused drama, or led to scope creep. What did they all have in common? Now ban that.",
    script: "Tell me about a client you wish you'd never taken. What was the red flag you ignored? [Listen] Now—what's the rule that would have filtered them out?",
    redFlags: ["If they say 'we take anything' → they're a commodity", "If they can't name specifics → they haven't learned from bad deals", "If they resist → they're afraid of turning away revenue"],
  },
  howWeDie: {
    question: "What assumption kills us?",
    why: "Drives defensibility. Every business is built on hidden assumptions. Name them, or be blindsided by them.",
    prompt: "What threat, if it became reality, would destroy this business?",
    badAnswers: ["If we lose clients", "If the market changes"],
    goodExamples: ["AI: Threat of smaller task going into a prompt. In-house teams. Volume removes agency."],
    howToThink: "What has to remain true for this business to work? If clients stop needing X, or if Y becomes free, or if competitors figure out Z—which of those kills you?",
    script: "I'm going to play devil's advocate. In 3 years, what makes this business irrelevant? [Push hard] What are you betting on that might not be true?",
    redFlags: ["If they say 'nothing' → they're not thinking hard enough", "If they only name external threats → ask about internal dependency", "If they minimize AI risk → they're in denial"],
  },
  theWedge: {
    question: "Why do we exist at all?",
    why: "Explains leverage. The wedge is why clients can't just do it themselves. It's your right to exist.",
    prompt: "What's the one sentence reason this business should exist vs someone doing it themselves?",
    badAnswers: ["We're the best", "Quality and service"],
    goodExamples: ["Speed, trust and higher quality than agency or in-house. VELOCITY TO OUTCOME. It's just done. Removal of RISK."],
    howToThink: "Your client could hire internally. They could use AI. They could cobble it together. Why don't they? What do you provide that they can't get any other way?",
    script: "If your best client fired you tomorrow and tried to replace you with an employee + ChatGPT, what would they miss? What breaks?",
    redFlags: ["If they say 'expertise' → expertise is commoditizing fast", "If they say 'we're cheaper' → you're a commodity", "If they can't answer → this business may not need to exist"],
  },
};

export const CORE_ENGINE_CONFIG = {
  demand: {
    question: "Where does demand come from?",
    warning: "founder = primary channel",
    prompts: ["What % comes from you vs the business?", "How dependent are you on referrals?"],
    howToThink: "The constraint is usually wherever the founder is the bottleneck. If founder generates all demand, growth stops when founder stops selling.",
    script: "Walk me through your last 5 new clients. How did each one find you? [Tally the sources] What percentage of deals come from you personally vs the business attracting them?",
    warningThreshold: "If > 70% of deals come from founder personally, this is likely THE constraint.",
  },
  salesScoping: {
    question: "How are deals scoped and closed?",
    warning: "founder = only closer",
    prompts: ["Who can close a deal without you?", "How repeatable is your sales process?"],
    howToThink: "If only the founder can close deals, the business can't scale. Look for whether there's a repeatable process or just founder intuition.",
    script: "If a qualified lead came in while you were on vacation, what happens? Who runs the call? Who sends the proposal? Who closes?",
    warningThreshold: "If founder must be on every close, sales capacity = founder's calendar.",
  },
  delivery: {
    question: "How is work delivered?",
    warning: "founder = delivery bottleneck",
    prompts: ["What happens if you're unavailable for 2 weeks?", "Who owns quality?"],
    howToThink: "Even if founder doesn't DO the work, they're often the bottleneck for decisions, reviews, or client communication.",
    script: "You're in the hospital for 2 weeks. What happens to active projects? [Listen for: 'they'd wait' = major red flag]",
    warningThreshold: "If work stops or quality drops without founder, delivery is constrained.",
  },
  qualityControl: {
    question: "How is quality ensured?",
    warning: "founder = only QC",
    prompts: ["Can work ship without your review?", "What's the failure rate?"],
    howToThink: "Founder as QC is the most common bottleneck in service businesses. It feels necessary but it's actually the trap.",
    script: "Does anything go to a client without you seeing it first? [If yes:] What would happen if you let it go without your review?",
    warningThreshold: "If everything needs founder approval, you're paying for a team but doing QC yourself.",
  },
  cashFlow: {
    question: "How healthy is cash flow?",
    warning: "< 2 months runway",
    prompts: ["How far ahead are you paid vs work delivered?", "What's your collection cycle?"],
    howToThink: "Cash flow constrains decisions. If you're always chasing payment, you can't invest in growth.",
    script: "If you paused all sales today, how long could you pay everyone? Are you typically paid before, during, or after work is done?",
    warningThreshold: "< 60 days runway means every decision is a survival decision.",
  },
  marginByOffer: {
    question: "What's margin by offer type?",
    warning: "< 30% blended margin",
    prompts: ["Which offers make money?", "Which ones are labor traps?"],
    howToThink: "Not all revenue is equal. Some offers look busy but drain margin. Find the offer that makes money and scale that.",
    script: "Rank your services by profitability. Which one has the best margin? Which one do you dread delivering? [They're often the same answer]",
    warningThreshold: "If you don't know margins by offer, you're probably subsidizing losers with winners.",
  },
  teamLoad: {
    question: "How loaded is the team?",
    warning: "founder utilization > 80%",
    prompts: ["Who has capacity?", "What gets dropped when things get busy?"],
    howToThink: "80%+ founder utilization means no capacity for growth, strategic thinking, or handling surprises.",
    script: "What % of your week is scheduled vs available for surprises or new opportunities? What got dropped last time things got crazy?",
    warningThreshold: "> 80% utilization = one sick day causes cascade failures.",
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
