import { prisma } from './prisma.js';

// Curated roadmap templates for medtech/biotech startups — fundraising,
// regulatory, clinical, product, and commercial tracks. Applying a template
// creates one top-level task per phase, each with a few starter subtasks,
// so the roadmap is real, editable project data from the moment it's applied.

export const ROADMAP_TEMPLATES = [
  {
    key: 'pre-seed-fundraising',
    name: 'Pre-Seed Fundraising',
    category: 'fundraising',
    description: 'From company formation to closing your first check.',
    phases: [
      {
        title: 'Company formation & cap table',
        description: 'Incorporate, issue founder shares, set up a clean cap table.',
        subtasks: ['Choose entity type & state of incorporation', 'File incorporation documents', 'Draft founder agreements & vesting', 'Set up cap table tool'],
      },
      {
        title: 'Problem & solution validation',
        description: 'Customer discovery interviews, early clinical/user validation.',
        subtasks: ['Run 20+ customer discovery interviews', 'Document problem statement', 'Build early proof-of-concept'],
      },
      {
        title: 'Pitch deck & financial model',
        description: 'Build the narrative, market sizing, and 18-month runway model.',
        subtasks: ['Draft pitch deck narrative', 'Build market sizing (TAM/SAM/SOM)', 'Build 18-month financial model'],
      },
      {
        title: 'Angel & pre-seed outreach',
        description: 'Warm intros, angel networks, pre-seed funds, medtech accelerators.',
        subtasks: ['Build target investor list', 'Get warm introductions', 'Apply to medtech accelerators'],
      },
      {
        title: 'Term sheet negotiation',
        description: 'Compare SAFE/priced terms, valuation, and lead investor.',
        subtasks: ['Compare SAFE vs priced round', 'Negotiate valuation & terms', 'Select lead investor'],
      },
      {
        title: 'Close & fund',
        description: 'Sign docs, wire funds, file post-close paperwork.',
        subtasks: ['Sign closing documents', 'Confirm wire transfers', 'File post-close paperwork'],
      },
    ],
  },
  {
    key: 'idea-to-mvp',
    name: 'Idea to MVP',
    category: 'fundraising',
    description: 'Turning a raw idea into a testable minimum viable product.',
    phases: [
      {
        title: 'Define the problem',
        description: 'Nail down the specific problem and who has it.',
        subtasks: ['Write a one-paragraph problem statement', 'Identify target customer segment', 'List 5 competing/alternative solutions'],
      },
      {
        title: 'Customer discovery',
        description: 'Talk to real prospective users before building anything.',
        subtasks: ['Interview 15+ target users', 'Validate willingness to pay', 'Synthesize findings into insights doc'],
      },
      {
        title: 'Define MVP scope',
        description: 'Cut scope to the smallest thing that tests the core hypothesis.',
        subtasks: ['List core hypothesis to test', 'Cut feature list to MVP only', 'Write MVP spec'],
      },
      {
        title: 'Build the MVP',
        description: 'Build or prototype the minimum viable version.',
        subtasks: ['Set up dev/build environment', 'Build core feature', 'Internal QA pass'],
      },
      {
        title: 'Pilot with early users',
        description: 'Get the MVP in front of real users and collect feedback.',
        subtasks: ['Recruit 5-10 pilot users', 'Run pilot & collect usage data', 'Collect structured feedback'],
      },
      {
        title: 'Decide: iterate, pivot, or scale',
        description: 'Use pilot data to decide the next move.',
        subtasks: ['Review pilot metrics vs hypothesis', 'Team decision: iterate/pivot/scale', 'Write up decision & rationale'],
      },
    ],
  },
  {
    key: 'seed-to-series-a',
    name: 'Seed to Series A',
    category: 'fundraising',
    description: 'Turning seed capital into a fundable Series A story.',
    phases: [
      {
        title: 'Seed round close',
        description: 'Finalize seed round and set milestone-based use of funds.',
        subtasks: ['Finalize seed round documents', 'Publish use-of-funds plan'],
      },
      {
        title: 'Product-market fit metrics',
        description: 'Define and hit the KPIs that prove PMF for a Series A story.',
        subtasks: ['Define PMF metrics & targets', 'Instrument analytics/reporting', 'Track monthly progress toward targets'],
      },
      {
        title: 'Key hires',
        description: 'VP Sales, Head of Clinical/Regulatory, or CTO depending on gaps.',
        subtasks: ['Identify top hiring gap', 'Write job description & comp band', 'Run search & close candidate'],
      },
      {
        title: 'Series A data room prep',
        description: 'Metrics dashboard, legal docs, clinical/regulatory evidence.',
        subtasks: ['Build investor metrics dashboard', 'Organize legal & corporate docs', 'Compile clinical/regulatory evidence'],
      },
      {
        title: 'Investor roadshow',
        description: 'Target list, warm intros, partner meetings, follow-ups.',
        subtasks: ['Build Series A target list', 'Run partner meetings', 'Track follow-ups & feedback'],
      },
      {
        title: 'Term sheet & diligence',
        description: 'Negotiate lead, manage diligence requests, reference calls.',
        subtasks: ['Negotiate lead investor terms', 'Manage diligence request list', 'Coordinate reference calls'],
      },
      {
        title: 'Series A close',
        description: 'Sign, wire, announce, onboard new board members.',
        subtasks: ['Sign closing documents', 'Announce round publicly', 'Onboard new board members'],
      },
    ],
  },
  {
    key: 'fda-510k',
    name: 'FDA 510(k) Clearance',
    category: 'regulatory',
    description: 'The clearance pathway for most moderate-risk medical devices.',
    phases: [
      {
        title: 'Predicate device search',
        description: 'Identify a legally marketed predicate for substantial equivalence.',
        subtasks: ['Search FDA 510(k) database for predicates', 'Document substantial equivalence rationale'],
      },
      {
        title: 'Design controls & risk analysis',
        description: 'ISO 14971 risk management file and design history file setup.',
        subtasks: ['Set up Design History File (DHF)', 'Complete ISO 14971 risk analysis', 'Define design inputs/outputs'],
      },
      {
        title: 'Verification & validation testing',
        description: 'Bench, biocompatibility, software, and usability testing.',
        subtasks: ['Run bench/performance testing', 'Run biocompatibility testing', 'Run software verification (if applicable)'],
      },
      {
        title: 'Pre-Submission (Q-Sub) meeting',
        description: 'Get FDA feedback on testing plan before formal submission.',
        subtasks: ['Prepare Q-Sub briefing package', 'Submit Q-Sub request', 'Hold meeting & document feedback'],
      },
      {
        title: '510(k) submission',
        description: 'Compile and submit the full 510(k) package via eSTAR.',
        subtasks: ['Compile full 510(k) package', 'Submit via eSTAR', 'Confirm FDA acceptance review'],
      },
      {
        title: 'FDA review & deficiency response',
        description: 'Respond to Additional Information requests within the review clock.',
        subtasks: ['Track FDA review clock', 'Respond to AI requests'],
      },
      {
        title: 'Clearance received',
        description: 'Market clearance letter issued — cleared to sell in the US.',
        subtasks: ['File clearance letter', 'Update labeling with clearance info', 'Notify sales/commercial team'],
      },
    ],
  },
  {
    key: 'fda-pma',
    name: 'FDA PMA (Class III Devices)',
    category: 'regulatory',
    description: 'Premarket approval pathway for the highest-risk device class.',
    phases: [
      {
        title: 'Pre-IDE meeting',
        description: 'Align with FDA on the pivotal study design before it starts.',
        subtasks: ['Prepare pre-IDE briefing document', 'Hold pre-IDE meeting with FDA'],
      },
      {
        title: 'IDE application & approval',
        description: 'Investigational Device Exemption to begin pivotal trial.',
        subtasks: ['Compile IDE application', 'Submit IDE to FDA', 'Obtain IDE approval'],
      },
      {
        title: 'Pivotal clinical trial',
        description: 'Run the pivotal safety & efficacy study under the IDE.',
        subtasks: ['Activate trial sites', 'Enroll to target sample size', 'Complete follow-up & data collection'],
      },
      {
        title: 'PMA submission',
        description: 'Compile clinical, manufacturing, and labeling into the PMA.',
        subtasks: ['Compile clinical study report', 'Compile manufacturing information', 'Submit PMA to FDA'],
      },
      {
        title: 'FDA panel review',
        description: 'Advisory panel review and FDA substantive review cycles.',
        subtasks: ['Prepare advisory panel materials', 'Present at panel meeting'],
      },
      {
        title: 'Post-approval commitments',
        description: 'Plan post-market surveillance and condition-of-approval studies.',
        subtasks: ['Design post-market surveillance plan', 'Plan condition-of-approval studies'],
      },
      {
        title: 'PMA approval',
        description: 'Approval order issued — device is approved for market.',
        subtasks: ['File approval order', 'Update labeling with approval info'],
      },
    ],
  },
  {
    key: 'biotech-ind-clinical',
    name: 'Biotech: IND to Clinical Trials',
    category: 'clinical',
    description: 'From lead candidate to Phase III for a therapeutic asset.',
    phases: [
      {
        title: 'Target validation & lead optimization',
        description: 'Confirm mechanism, optimize lead compound candidates.',
        subtasks: ['Confirm target/mechanism of action', 'Optimize lead candidate', 'Select development candidate'],
      },
      {
        title: 'IND-enabling toxicology studies',
        description: 'GLP tox, PK/PD, and CMC work to support first-in-human dosing.',
        subtasks: ['Run GLP toxicology studies', 'Run PK/PD studies', 'Complete CMC development'],
      },
      {
        title: 'Pre-IND meeting with FDA',
        description: 'Align on nonclinical package and proposed clinical protocol.',
        subtasks: ['Prepare pre-IND briefing document', 'Hold pre-IND meeting'],
      },
      {
        title: 'IND submission',
        description: 'File the Investigational New Drug application.',
        subtasks: ['Compile IND application', 'Submit IND to FDA', 'Clear 30-day safety review'],
      },
      {
        title: 'Phase I — safety',
        description: 'First-in-human dose escalation and safety study.',
        subtasks: ['Activate Phase I site(s)', 'Complete dose escalation', 'Report safety results'],
      },
      {
        title: 'Phase II — efficacy',
        description: 'Proof-of-concept efficacy in the target patient population.',
        subtasks: ['Finalize Phase II protocol', 'Enroll target population', 'Analyze efficacy signal'],
      },
      {
        title: 'Phase III — pivotal',
        description: 'Large-scale pivotal trial to support marketing approval.',
        subtasks: ['Finalize pivotal trial design', 'Enroll pivotal trial', 'Complete database lock & analysis'],
      },
    ],
  },
  {
    key: 'ce-mark-mdr',
    name: 'CE Mark / EU MDR',
    category: 'regulatory',
    description: 'European market access under the Medical Device Regulation.',
    phases: [
      {
        title: 'Classification & conformity route',
        description: 'Determine device class and applicable conformity assessment.',
        subtasks: ['Classify device under EU MDR', 'Determine conformity assessment route'],
      },
      {
        title: 'Technical documentation',
        description: 'Compile the technical file per EU MDR Annex II/III.',
        subtasks: ['Compile design & manufacturing info', 'Compile risk management file', 'Compile clinical evaluation data'],
      },
      {
        title: 'Quality management system',
        description: 'Implement ISO 13485 QMS across design and manufacturing.',
        subtasks: ['Implement ISO 13485 QMS', 'Train staff on QMS procedures'],
      },
      {
        title: 'Notified body audit',
        description: 'QMS and technical file audit by an accredited notified body.',
        subtasks: ['Select notified body', 'Prepare for audit', 'Close out audit findings'],
      },
      {
        title: 'Clinical evaluation report',
        description: 'Compile clinical evidence supporting safety and performance.',
        subtasks: ['Compile clinical literature review', 'Finalize clinical evaluation report'],
      },
      {
        title: 'CE certificate issued',
        description: 'Certificate granted — device may carry the CE mark in the EU.',
        subtasks: ['File CE certificate', 'Update labeling with CE mark'],
      },
    ],
  },
  {
    key: 'ip-patent-filing',
    name: 'IP & Patent Filing',
    category: 'product',
    description: 'Protecting core technology from provisional to grant.',
    phases: [
      {
        title: 'Prior art & FTO search',
        description: 'Freedom-to-operate analysis and prior art landscape review.',
        subtasks: ['Run prior art search', 'Run freedom-to-operate analysis'],
      },
      {
        title: 'Provisional patent filing',
        description: 'File a provisional to establish an early priority date.',
        subtasks: ['Draft provisional application', 'File provisional patent'],
      },
      {
        title: 'PCT international filing',
        description: 'File under the Patent Cooperation Treaty within 12 months.',
        subtasks: ['Draft PCT application', 'File PCT application'],
      },
      {
        title: 'National phase entry',
        description: 'Enter target countries/regions (US, EU, key markets).',
        subtasks: ['Select target countries/regions', 'File national phase applications'],
      },
      {
        title: 'Office action responses',
        description: 'Respond to examiner rejections and amend claims.',
        subtasks: ['Review examiner rejections', 'Draft & file claim amendments'],
      },
      {
        title: 'Patent grant',
        description: 'Patent issues — core IP is protected.',
        subtasks: ['Pay issue fees', 'File granted patent in IP register'],
      },
    ],
  },
  {
    key: 'clinical-trial-execution',
    name: 'Clinical Trial Design & Execution',
    category: 'clinical',
    description: 'Running a single clinical study from protocol to publication.',
    phases: [
      {
        title: 'Protocol design & IRB approval',
        description: 'Finalize study protocol and gain ethics committee approval.',
        subtasks: ['Draft study protocol', 'Submit for IRB/ethics approval', 'Obtain IRB approval'],
      },
      {
        title: 'Site selection & activation',
        description: 'Contract sites, train investigators, activate for enrollment.',
        subtasks: ['Select and contract sites', 'Train site investigators', 'Activate sites for enrollment'],
      },
      {
        title: 'Patient recruitment',
        description: 'Screen and enroll to target sample size.',
        subtasks: ['Launch recruitment materials', 'Screen candidates', 'Enroll to target sample size'],
      },
      {
        title: 'Data collection & monitoring',
        description: 'Ongoing data capture, monitoring visits, safety review.',
        subtasks: ['Run monitoring visits', 'Review safety data on schedule'],
      },
      {
        title: 'Database lock & analysis',
        description: 'Clean and lock the database, run statistical analysis.',
        subtasks: ['Clean and query database', 'Lock database', 'Run statistical analysis'],
      },
      {
        title: 'Results & publication',
        description: 'Report results to stakeholders and submit for publication.',
        subtasks: ['Draft results summary', 'Submit manuscript for publication'],
      },
    ],
  },
  {
    key: 'reimbursement-market-access',
    name: 'Reimbursement & Market Access',
    category: 'commercial',
    description: 'Getting paid — from health economics to payer contracts.',
    phases: [
      {
        title: 'Health economics model',
        description: 'Build the cost-effectiveness / budget-impact case.',
        subtasks: ['Build cost-effectiveness model', 'Build budget-impact model'],
      },
      {
        title: 'Payer landscape analysis',
        description: 'Map target payers, coverage policies, and precedent codes.',
        subtasks: ['Map target payer landscape', 'Review precedent coverage policies'],
      },
      {
        title: 'Coding strategy',
        description: 'Determine CPT/HCPCS coding path — existing, new, or category III.',
        subtasks: ['Assess existing code fit', 'Determine new/category III code strategy'],
      },
      {
        title: 'Payer pilot agreements',
        description: 'Negotiate initial coverage pilots with anchor payers.',
        subtasks: ['Identify anchor payer targets', 'Negotiate pilot coverage agreements'],
      },
      {
        title: 'Coverage determination',
        description: 'Secure a local or national coverage determination.',
        subtasks: ['Submit coverage determination request', 'Secure local/national coverage'],
      },
      {
        title: 'Broad payer contracting',
        description: 'Scale contracts across commercial and government payers.',
        subtasks: ['Negotiate commercial payer contracts', 'Negotiate government payer contracts'],
      },
    ],
  },
  {
    key: 'product-dev-prototyping',
    name: 'Product Development & Prototyping',
    category: 'product',
    description: 'Hardware/device development from concept to pilot production.',
    phases: [
      {
        title: 'User needs & design inputs',
        description: 'Capture clinical/user needs and translate to design inputs.',
        subtasks: ['Interview clinical/end users', 'Document design inputs'],
      },
      {
        title: 'Concept prototyping',
        description: 'Low-fidelity prototypes to test core functionality.',
        subtasks: ['Build low-fidelity prototype', 'Test core functionality'],
      },
      {
        title: 'Alpha build & bench testing',
        description: 'Working alpha unit, engineering verification testing.',
        subtasks: ['Build alpha unit', 'Run engineering verification tests'],
      },
      {
        title: 'Beta build & usability testing',
        description: 'Near-final design, formative and summative usability studies.',
        subtasks: ['Build beta units', 'Run formative usability study', 'Run summative usability study'],
      },
      {
        title: 'Design freeze & DHF',
        description: 'Lock the design, finalize the Design History File.',
        subtasks: ['Lock final design', 'Finalize Design History File'],
      },
      {
        title: 'Pilot manufacturing run',
        description: 'First production-representative units at scale.',
        subtasks: ['Select contract manufacturer', 'Run pilot production batch', 'QA pilot units'],
      },
    ],
  },
  {
    key: 'investor-due-diligence',
    name: 'Investor Due Diligence Readiness',
    category: 'fundraising',
    description: 'Getting the data room and company airtight before a raise.',
    phases: [
      {
        title: 'Data room setup',
        description: 'Organize corporate, financial, and IP documents centrally.',
        subtasks: ['Set up data room platform', 'Upload corporate documents'],
      },
      {
        title: 'Financial audit & clean cap table',
        description: 'Reconcile financials and resolve any cap table issues.',
        subtasks: ['Reconcile financial statements', 'Resolve cap table discrepancies'],
      },
      {
        title: 'IP & regulatory documentation',
        description: 'Assemble patent filings, FDA correspondence, QMS records.',
        subtasks: ['Assemble patent filing records', 'Assemble FDA/regulatory correspondence'],
      },
      {
        title: 'Reference customer calls',
        description: 'Line up customer/KOL references investors can call.',
        subtasks: ['Identify reference customers/KOLs', 'Confirm availability for investor calls'],
      },
      {
        title: 'Legal & compliance review',
        description: 'Contracts, HIPAA/GDPR posture, litigation history review.',
        subtasks: ['Review key contracts', 'Review data privacy compliance posture'],
      },
      {
        title: 'Diligence complete',
        description: 'All investor questions closed out — ready to sign.',
        subtasks: ['Close out open diligence questions', 'Confirm readiness to sign'],
      },
    ],
  },
  {
    key: 'go-to-market-launch',
    name: 'Go-to-Market Launch',
    category: 'commercial',
    description: 'Taking a cleared/approved product to commercial launch.',
    phases: [
      {
        title: 'Market segmentation & positioning',
        description: 'Define target segments, positioning, and messaging.',
        subtasks: ['Define target segments', 'Finalize positioning & messaging'],
      },
      {
        title: 'Pricing & reimbursement strategy',
        description: 'Set pricing aligned to the reimbursement pathway.',
        subtasks: ['Set list pricing', 'Align pricing with reimbursement pathway'],
      },
      {
        title: 'Sales team hiring & training',
        description: 'Build and train the initial commercial team.',
        subtasks: ['Hire initial sales team', 'Run sales training & certification'],
      },
      {
        title: 'KOL & pilot site launch',
        description: 'Launch with key opinion leaders and reference accounts.',
        subtasks: ['Confirm KOL launch partners', 'Launch at pilot reference sites'],
      },
      {
        title: 'Marketing & PR launch',
        description: 'Public launch — press, conferences, content, campaigns.',
        subtasks: ['Prepare launch press release', 'Launch marketing campaign'],
      },
      {
        title: 'Scale & expand',
        description: 'Expand territory, channels, and product line based on traction.',
        subtasks: ['Review launch traction metrics', 'Plan territory/channel expansion'],
      },
    ],
  },
];

export function getRoadmapTemplate(key) {
  return ROADMAP_TEMPLATES.find((t) => t.key === key) || null;
}

// Looks up a template by key across both the built-in library and the
// Project Template Center's ProjectTemplate rows (whose key is their DB row
// id) — flattened to this file's flat "phase -> subtask strings" shape
// since this lookup only ever feeds the 2-level `applyTemplateToProject`.
export async function getAnyTemplate(key, workspaceId = null) {
  const builtIn = getRoadmapTemplate(key);
  if (builtIn) return builtIn;
  const row = await prisma.projectTemplate.findUnique({
    where: { id: key },
    include: { phases: { orderBy: { sortOrder: 'asc' } }, tasks: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!row) return null;
  // Never let a guessed id reach across workspaces — only system templates
  // or ones owned by the caller's own workspace are resolvable here.
  if (!row.isSystemTemplate && row.workspaceId !== workspaceId) return null;
  const tasksByPhase = new Map();
  for (const task of row.tasks) {
    if (!task.phaseId || task.parentTaskId) continue;
    if (!tasksByPhase.has(task.phaseId)) tasksByPhase.set(task.phaseId, []);
    tasksByPhase.get(task.phaseId).push(task);
  }
  return {
    key: row.id, name: row.name,
    phases: row.phases.map((p) => ({
      title: p.name, description: p.description,
      subtasks: (tasksByPhase.get(p.id) || []).map((t) => t.name),
    })),
  };
}
