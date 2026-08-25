// System template catalog for the Project Template Center. Idempotent —
// upserts by stable `slug`, and on every run wipes + recreates each
// template's phases/tasks/milestones/customFields so edits here always
// take effect without ever duplicating a row. Run once via:
//   node prisma/seed-project-templates.js
// Never wired into `npm run dev`/start.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(__dirname, '..', 'dev.db')}` });
const prisma = new PrismaClient({ adapter });

const MEDTECH_DISCLAIMER = ' This template is a project-management starting point and should be adapted to applicable legal, regulatory, quality, clinical, and jurisdiction-specific requirements.';
const LEGAL_DISCLAIMER = ' This is a general project-management structure, not legal advice — review with qualified counsel for your jurisdiction.';

// Each task entry is either a plain string, or an object:
//   { name, ref?, dependsOnRefs?: [...], children?: [...tasks] }
// `ref` is a seed-script-local label used only to wire up dependsOnRefs
// within the same template — it is never stored in the database.
const TEMPLATES = [
  {
    slug: 'startup-launch', name: 'Startup Launch', category: 'STARTUP', industry: 'Startup',
    icon: 'i-route', featured: true, tags: ['startup', 'launch', 'idea', 'mvp'], defaultView: 'gantt',
    description: 'Take a startup from raw idea to a launched, growing company.',
    phases: [
      { name: 'Idea Validation', tasks: ['Define problem statement', 'Define target customer', 'Interview potential users', 'Validate customer pain points', 'Document assumptions', 'Define success criteria'] },
      { name: 'Market Research', tasks: ['Market size analysis', 'Competitor analysis', 'Customer segmentation', 'Pricing research', 'Industry trend analysis'] },
      { name: 'Business Model', tasks: ['Define business model', 'Define revenue model', 'Define pricing model', 'Build initial financial assumptions', 'Define key partnerships'] },
      { name: 'Company Formation', tasks: ['Decide legal structure', 'Founder agreement', 'Shareholding structure', 'Company registration', 'Open company bank account', 'Accounting setup'] },
      { name: 'Product / MVP', tasks: ['Define MVP scope', 'Product requirements', 'Prototype', 'Development', 'Testing', 'Pilot readiness'] },
      { name: 'Pilot', tasks: ['Recruit pilot customers', 'Run pilot program', 'Collect pilot feedback', 'Iterate based on feedback'] },
      { name: 'Go-to-Market', tasks: ['Brand strategy', 'Website', 'Marketing plan', 'Sales process', 'Launch campaign'] },
      { name: 'Fundraising', tasks: ['Fundraising strategy', 'Pitch deck', 'Financial model', 'Investor list', 'Data room'] },
      { name: 'Launch', tasks: ['Launch readiness', 'Product launch', 'Customer onboarding', 'KPI tracking'] },
      { name: 'Growth & Scale', tasks: ['Review growth metrics', 'Plan hiring roadmap', 'Plan next fundraising milestone', 'Plan geographic/segment expansion'] },
    ],
    milestones: [{ name: 'MVP Ready', relativeDay: 60 }, { name: 'Pilot Complete', relativeDay: 100 }, { name: 'Public Launch', relativeDay: 150 }],
  },
  {
    slug: 'fundraising-round', name: 'Fundraising Round', category: 'FUNDRAISING', industry: 'Startup',
    icon: 'i-wallet', featured: true, tags: ['fundraising', 'investors', 'raise', 'series a', 'seed'], defaultView: 'board',
    description: 'Manage a complete fundraising process from strategy to close.',
    phases: [
      { name: 'Fundraising Strategy', tasks: ['Define fundraising target', 'Define round type', 'Define valuation strategy', 'Define use of funds', 'Define ideal investor profile', 'Set fundraising timeline', 'Set fundraising milestones'] },
      { name: 'Investor Materials', tasks: [
        { name: 'Pitch deck', ref: 'pitch-deck' }, 'Executive summary', 'Financial model', 'Cap table', 'Business plan', 'Market analysis', 'Competitive analysis', 'Product roadmap', 'Use of funds', 'Team profiles',
      ] },
      { name: 'Investor Research', tasks: ['Build investor longlist', 'Prioritize investors', 'Identify relevant partners', 'Identify warm introductions', 'Research investment thesis', 'Research portfolio companies'] },
      { name: 'Investor Outreach', tasks: [
        { name: 'Prepare outreach messaging' }, { name: 'Request introductions' },
        { name: 'Send outreach', ref: 'outreach', dependsOnRefs: ['pitch-deck'] },
        'Track responses', 'Schedule meetings', 'Follow up',
      ] },
      { name: 'Meetings', tasks: ['First meeting', 'Product demo', 'Follow-up meeting', 'Partner meeting', 'Investment committee preparation'] },
      { name: 'Due Diligence', tasks: ['Corporate diligence', 'Financial diligence', 'Legal diligence', 'IP diligence', 'Product diligence', 'Technical diligence', 'Commercial diligence', 'Regulatory diligence where applicable'] },
      { name: 'Term Sheet', tasks: ['Receive term sheet', 'Review valuation', 'Review dilution', 'Review governance terms', 'Review liquidation preference', 'Negotiate terms', 'Approve term sheet'] },
      { name: 'Legal & Documentation', tasks: ['Draft definitive agreements', 'Legal review of documents', 'Board approvals', 'Shareholder approvals'] },
      { name: 'Closing', tasks: ['Final documents', 'Shareholder approvals', 'Signature process', 'Funds transfer', 'Cap table update', 'Investor reporting setup'] },
      { name: 'Post-Close', tasks: ['Announce round', 'Onboard new board members/observers', 'Set up investor update cadence'] },
    ],
    milestones: [{ name: 'Investor Materials Ready', relativeDay: 21 }, { name: 'First Meetings Complete', relativeDay: 45 }, { name: 'Term Sheet Signed', relativeDay: 75 }, { name: 'Round Closed', relativeDay: 100 }],
  },
  {
    slug: 'investor-data-room', name: 'Investor Data Room', category: 'FUNDRAISING', industry: 'Startup',
    icon: 'i-folder', featured: true, tags: ['fundraising', 'data room', 'diligence', 'documents'], defaultView: 'list',
    description: `Organize a complete, investor-ready data room.${MEDTECH_DISCLAIMER}`,
    phases: [
      { name: '01 Corporate', tasks: ['Certificate of incorporation', 'Articles / bylaws', 'Commercial registration', 'Board resolutions', 'Shareholder agreements', 'Company licenses'] },
      { name: '02 Capitalization', tasks: ['Current cap table', 'Historical cap table', 'Option pool', 'SAFE / convertible agreements', 'Share certificates'] },
      { name: '03 Financial', tasks: ['Historical financial statements', 'Management accounts', 'Financial forecast', 'Budget', 'Revenue breakdown', 'Expense breakdown', 'Bank statements where appropriate'] },
      { name: '04 Legal', tasks: ['Material agreements', 'Litigation summary', 'Legal opinions', 'Insurance'] },
      { name: '05 Intellectual Property', tasks: ['Patent portfolio', 'Patent applications', 'Trademarks', 'IP assignment agreements', 'Employee IP agreements'] },
      { name: '06 Product', tasks: ['Product overview', 'Product roadmap', 'Technical architecture', 'Development roadmap'] },
      { name: '07 Technology', tasks: ['System architecture overview', 'Security & data protection posture', 'Third-party dependencies'] },
      { name: '08 Market & Commercial', tasks: ['Market sizing', 'Go-to-market strategy', 'Sales pipeline overview'] },
      { name: '09 Customers & Partnerships', tasks: ['Key customer contracts', 'Partnership agreements', 'Customer references'] },
      { name: '10 Team & HR', tasks: ['Org chart', 'Key employment agreements', 'Employee equity plan'] },
      { name: '11 Regulatory', tasks: ['Regulatory strategy', 'Regulatory submissions', 'Regulatory correspondence'] },
      { name: '12 Clinical', tasks: ['Clinical documentation', 'Ethics approvals', 'Study reports'] },
      { name: '13 Quality', tasks: ['Quality management system overview', 'Audit history'] },
      { name: '14 Contracts', tasks: ['Vendor contracts', 'Supplier agreements'] },
      { name: '15 Fundraising', tasks: ['Prior round documents', 'Current round term sheet'] },
    ],
  },
  {
    slug: 'investor-outreach-pipeline', name: 'Investor Outreach Pipeline', category: 'FUNDRAISING', industry: 'Startup',
    icon: 'i-route', featured: false, tags: ['fundraising', 'investors', 'pipeline', 'crm'], defaultView: 'board',
    description: 'Track investor relationships from first contact to close on a board.',
    phases: [
      { name: 'Setup', tasks: ['Define investor criteria', 'Build target investor list'] },
      { name: 'Outreach', tasks: ['Prepare outreach templates', 'Request warm introductions', 'Send initial outreach'] },
      { name: 'Meetings', tasks: ['Schedule first meetings', 'Run product demos', 'Log meeting notes'] },
      { name: 'Closing', tasks: ['Track term sheet status', 'Confirm commitment', 'Update pipeline to Closed'] },
    ],
    customFields: [
      { name: 'Investor Name', type: 'text' }, { name: 'Investor Type', type: 'text' }, { name: 'Fund', type: 'text' },
      { name: 'Country', type: 'text' }, { name: 'Contact Person', type: 'text' }, { name: 'Email', type: 'text' },
      { name: 'Investment Stage', type: 'text' }, { name: 'Ticket Size', type: 'text' },
      { name: 'Status', type: 'select', options: ['Target', 'Researching', 'Introduction Requested', 'Contacted', 'Responded', 'First Meeting', 'Follow-Up', 'Due Diligence', 'Term Sheet', 'Committed', 'Closed', 'Passed'] },
      { name: 'Last Contact', type: 'date' }, { name: 'Next Action', type: 'text' }, { name: 'Next Follow-Up', type: 'date' },
      { name: 'Probability', type: 'number' }, { name: 'Owner', type: 'text' }, { name: 'Notes', type: 'text' },
    ],
  },
  {
    slug: 'rd-project', name: 'Research & Development Project', category: 'RESEARCH_AND_DEVELOPMENT', industry: 'General',
    icon: 'i-target', featured: true, tags: ['research', 'r&d', 'experiment', 'study'], defaultView: 'list',
    description: 'A structured research project from question to closeout.',
    phases: [
      { name: 'Research Question', tasks: ['Define research objective', 'Define scope', 'Identify success criteria'] },
      { name: 'Literature Review', tasks: ['Search literature', 'Review relevant publications', 'Identify knowledge gaps', 'Summarize findings'] },
      { name: 'Hypothesis', tasks: ['Formulate hypothesis', 'Define testable predictions'] },
      { name: 'Study / Experiment Design', tasks: ['Design study/experiment', 'Define variables', 'Define sample/dataset needs'] },
      { name: 'Protocol', tasks: ['Define methodology', 'Define materials', 'Define equipment', 'Define data requirements', 'Define analysis methodology', 'Risk review'] },
      { name: 'Feasibility', tasks: ['Assess resource feasibility', 'Assess technical feasibility'] },
      { name: 'Experiment', tasks: ['Prepare experiment', 'Execute experiment', 'Record observations', 'Log deviations', 'Store data'] },
      { name: 'Data Collection', tasks: ['Collect primary data', 'Quality-check data as collected'] },
      { name: 'Analysis', tasks: ['Clean data', 'Analyze results', 'Compare with hypothesis', 'Statistical review where appropriate'] },
      { name: 'Validation', tasks: ['Repeatability check', 'Independent verification', 'Document limitations'] },
      { name: 'Documentation', tasks: ['Research report', 'Dataset archive', 'Decision log', 'Recommendations'] },
      { name: 'IP / Publication Decision', tasks: ['Assess IP potential', 'Decide publication vs. confidential'] },
      { name: 'Closeout', tasks: ['Archive final materials', 'Closeout review meeting'] },
    ],
    customFields: [{ name: 'Experiment ID', type: 'text' }, { name: 'Hypothesis', type: 'text' }, { name: 'Result', type: 'text' }, { name: 'Decision', type: 'select', options: ['Continue', 'Pivot', 'Stop'] }],
  },
  {
    slug: 'medical-device-development', name: 'Medical Device Product Development', category: 'MEDTECH', industry: 'MedTech',
    icon: 'i-shield', featured: true, tags: ['medtech', 'medical device', 'design controls', 'fda', 'ce mark'], defaultView: 'gantt',
    description: `Structure a medical device from concept through post-market planning.${MEDTECH_DISCLAIMER}`,
    phases: [
      { name: 'Concept', tasks: ['Define intended use', 'Define target users', 'Define target market', 'Define clinical / customer problem', 'Initial feasibility assessment'] },
      { name: 'User Needs', tasks: ['Gather user needs', 'Clinical stakeholder interviews', 'User needs review', 'Approve user needs'] },
      { name: 'Product Requirements', tasks: ['Functional requirements', 'Performance requirements', 'Safety requirements', 'Usability requirements', 'Technical requirements'] },
      { name: 'Design Inputs', tasks: ['Translate requirements to design inputs', 'Review and approve design inputs'] },
      { name: 'Design & Development', tasks: ['System architecture', 'Hardware development', 'Software development', 'Mechanical design', 'UI/UX where applicable'] },
      { name: 'Prototype', tasks: ['Build prototype', 'Internal prototype testing'] },
      { name: 'Risk Management', tasks: ['Risk management plan', 'Hazard identification', 'Risk analysis', 'Risk controls', 'Residual risk review'] },
      { name: 'Verification', tasks: ['Verification plan', 'Test protocol', 'Execute verification', 'Document results', 'Resolve failures'] },
      { name: 'Validation', tasks: ['Validation plan', 'Validation activities', 'User validation', 'Clinical/operational validation where applicable'] },
      { name: 'Regulatory Preparation', tasks: ['Regulatory strategy', 'Submission readiness', 'Document collection', 'Gap assessment'] },
      { name: 'Manufacturing Transfer', tasks: ['Supplier readiness', 'Manufacturing documentation', 'Process transfer', 'Quality checks', 'Production readiness'] },
      { name: 'Launch Readiness', tasks: ['Commercial launch plan', 'Sales/support training', 'Launch go/no-go review'] },
      { name: 'Post-Market Planning', tasks: ['Post-market surveillance plan', 'Complaint handling process', 'Post-market data review cadence'] },
    ],
    milestones: [{ name: 'Design Freeze', relativeDay: 120 }, { name: 'Verification Complete', relativeDay: 180 }, { name: 'Regulatory Submission', relativeDay: 220 }],
  },
  {
    slug: 'medical-device-design-controls', name: 'Medical Device Design Controls', category: 'MEDTECH', industry: 'MedTech',
    icon: 'i-shield', featured: false, tags: ['medtech', 'design controls', 'dhf', 'iso 13485'], defaultView: 'list',
    description: `Design controls documentation and traceability structure.${MEDTECH_DISCLAIMER}`,
    phases: [
      { name: 'Planning', tasks: ['Design and development plan', 'Assign design control owners'] },
      { name: 'User Needs', tasks: ['Capture user needs', 'Approve user needs'] },
      { name: 'Design Inputs', tasks: ['Document design inputs', 'Review design inputs for testability'] },
      { name: 'Design Outputs', tasks: ['Document design outputs', 'Map outputs to inputs'] },
      { name: 'Design Review', tasks: ['Conduct design review', 'Record review action items'] },
      { name: 'Verification', tasks: ['Execute verification protocols', 'Document verification results'] },
      { name: 'Validation', tasks: ['Execute validation protocols', 'Document validation results'] },
      { name: 'Design Transfer', tasks: ['Transfer design to manufacturing', 'Confirm production readiness'] },
      { name: 'Design Changes', tasks: ['Log and evaluate design changes', 'Re-verify/re-validate as needed'] },
      { name: 'Design History Documentation', tasks: ['Compile Design History File (DHF)', 'Final DHF review and approval'] },
    ],
    customFields: [
      { name: 'Requirement ID', type: 'text' }, { name: 'Requirement Type', type: 'select', options: ['User Need', 'Design Input', 'Design Output'] },
      { name: 'Owner', type: 'text' }, { name: 'Source', type: 'text' },
      { name: 'Status', type: 'select', options: ['Draft', 'In Review', 'Approved', 'Verified', 'Validated'] },
      { name: 'Verification Method', type: 'text' }, { name: 'Validation Method', type: 'text' }, { name: 'Traceability', type: 'text' },
      { name: 'Evidence', type: 'text' }, { name: 'Reviewer', type: 'text' }, { name: 'Approval Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'] },
    ],
  },
  {
    slug: 'medical-device-risk-management', name: 'Medical Device Risk Management', category: 'MEDTECH', industry: 'MedTech',
    icon: 'i-alert-t', featured: false, tags: ['medtech', 'risk management', 'iso 14971'], defaultView: 'list',
    description: `Risk management file structure aligned to a typical ISO 14971-style process.${MEDTECH_DISCLAIMER}`,
    phases: [
      { name: 'Risk Planning', tasks: ['Risk management plan', 'Define risk acceptability criteria'] },
      { name: 'Hazard Identification', tasks: ['Identify hazards', 'Identify hazardous situations'] },
      { name: 'Risk Analysis', tasks: ['Estimate severity', 'Estimate probability'] },
      { name: 'Risk Evaluation', tasks: ['Evaluate risk against criteria', 'Prioritize risks'] },
      { name: 'Risk Control', tasks: ['Define control measures', 'Implement control measures', 'Verify control effectiveness'] },
      { name: 'Residual Risk', tasks: ['Assess residual risk', 'Approve residual risk'] },
      { name: 'Benefit-Risk Review', tasks: ['Conduct benefit-risk analysis', 'Document benefit-risk conclusion'] },
      { name: 'Risk Management Report', tasks: ['Compile risk management report', 'Final approval'] },
      { name: 'Post-Production Monitoring', tasks: ['Monitor field data for new risks', 'Update risk file as needed'] },
    ],
    customFields: [
      { name: 'Risk ID', type: 'text' }, { name: 'Hazard', type: 'text' }, { name: 'Sequence of Events', type: 'text' }, { name: 'Harm', type: 'text' },
      { name: 'Severity', type: 'select', options: ['Negligible', 'Minor', 'Serious', 'Critical', 'Catastrophic'] },
      { name: 'Probability', type: 'select', options: ['Improbable', 'Remote', 'Occasional', 'Probable', 'Frequent'] },
      { name: 'Initial Risk', type: 'text' }, { name: 'Control Measure', type: 'text' }, { name: 'Residual Risk', type: 'text' },
      { name: 'Owner', type: 'text' }, { name: 'Status', type: 'select', options: ['Open', 'Mitigated', 'Accepted', 'Closed'] }, { name: 'Evidence', type: 'text' },
    ],
  },
  {
    slug: 'discovery-research', name: 'Discovery Research', category: 'BIOTECH', industry: 'Biotech',
    icon: 'i-target', featured: true, tags: ['biotech', 'discovery', 'research'], defaultView: 'list',
    description: `Early-stage discovery research from objective to next-stage decision.${MEDTECH_DISCLAIMER}`,
    phases: [
      { name: 'Research Objective', tasks: ['Define research objective', 'Define target profile'] },
      { name: 'Target Identification', tasks: ['Identify candidate targets', 'Prioritize targets'] },
      { name: 'Literature Review', tasks: ['Review relevant literature', 'Summarize prior art'] },
      { name: 'Experimental Design', tasks: ['Design experiments', 'Define endpoints'] },
      { name: 'Assay Setup', tasks: ['Select assay methods', 'Set up assay'] },
      { name: 'Experimentation', tasks: ['Run experiments', 'Record raw data'] },
      { name: 'Data Analysis', tasks: ['Analyze results', 'Compare candidates'] },
      { name: 'Candidate Selection', tasks: ['Score candidates', 'Select lead candidate(s)'] },
      { name: 'Validation', tasks: ['Confirm findings independently', 'Document confidence level'] },
      { name: 'Documentation', tasks: ['Compile research report', 'Archive raw data'] },
      { name: 'Next-Stage Decision', tasks: ['Present findings to stakeholders', 'Decide go/no-go for next stage'] },
    ],
  },
  {
    slug: 'regulatory-submission', name: 'Regulatory Submission Project', category: 'REGULATORY', industry: 'Healthcare',
    icon: 'i-shield', featured: false, tags: ['regulatory', 'submission', 'fda', 'ce mark'], defaultView: 'list',
    description: `Prepare and manage a regulatory submission. Jurisdiction-specific requirements must be reviewed and configured for your product and market.${MEDTECH_DISCLAIMER}`,
    phases: [
      { name: 'Regulatory Strategy', tasks: ['Define regulatory strategy', 'Identify target markets'] },
      { name: 'Classification / Pathway Review', tasks: ['Determine product classification', 'Determine submission pathway'] },
      { name: 'Submission Requirements', tasks: ['Identify required documents', 'Identify required testing'] },
      { name: 'Gap Assessment', tasks: ['Assess current documentation against requirements', 'Prioritize gaps'] },
      { name: 'Document Collection', tasks: ['Collect existing documentation', 'Request missing documentation'] },
      { name: 'Document Preparation', tasks: ['Draft submission documents', 'Compile technical file/dossier'] },
      { name: 'Internal Review', tasks: ['Internal quality review', 'Internal regulatory review'] },
      { name: 'Submission', tasks: ['Finalize submission package', 'Submit to authority'] },
      { name: 'Authority Questions', tasks: ['Track authority questions', 'Log deficiency letters'] },
      { name: 'Response Preparation', tasks: ['Draft responses', 'Submit responses'] },
      { name: 'Approval / Outcome', tasks: ['Record outcome', 'File approval/clearance documentation'] },
      { name: 'Post-Submission Actions', tasks: ['Update labeling', 'Notify commercial team'] },
    ],
  },
  {
    slug: 'company-registration', name: 'Company Registration', category: 'COMPANY_FORMATION', industry: 'General',
    icon: 'i-id', featured: true, tags: ['company formation', 'incorporation', 'registration', 'startup'], defaultView: 'list',
    description: `Register and set up a new company end-to-end.${LEGAL_DISCLAIMER}`,
    phases: [
      { name: 'Company Planning', tasks: ['Define company activity', 'Define jurisdiction', 'Define ownership structure', 'Define authorized signatories'] },
      { name: 'Legal Structure', tasks: ['Choose legal entity type', 'Prepare incorporation documents'] },
      { name: 'Founder / Shareholding', tasks: ['Founder agreement', 'Shareholding structure', 'Cap table', 'IP assignment'] },
      { name: 'Name & Registration', tasks: ['Reserve company name', 'Submit registration application', 'Prepare registration documents', 'Obtain company registration'] },
      { name: 'Licensing', tasks: ['Identify required licenses', 'Apply for licenses'] },
      { name: 'Tax & Accounting', tasks: ['Tax registration', 'Accounting setup', 'Financial year setup', 'Invoice process'] },
      { name: 'Banking', tasks: ['Select bank', 'Prepare KYC', 'Open account'] },
      { name: 'Employment Setup', tasks: ['Employment contract templates', 'Payroll setup', 'HR policies'] },
      { name: 'Policies', tasks: ['Draft core company policies', 'Approve and publish policies'] },
      { name: 'Operational Setup', tasks: ['Set up office/registered address', 'Set up core business tools'] },
      { name: 'Completion', tasks: ['Final compliance review', 'Company formation complete'] },
    ],
  },
  {
    slug: 'standard-project-plan', name: 'Standard Project Plan', category: 'PROJECT_MANAGEMENT', industry: 'General',
    icon: 'i-route', featured: false, tags: ['project management', 'plan', 'general'], defaultView: 'list',
    description: 'A general-purpose project plan structure for any type of project.',
    phases: [
      { name: 'Initiation', tasks: ['Project charter', 'Define objectives', 'Identify stakeholders', 'Define success criteria'] },
      { name: 'Planning', tasks: ['Scope', 'Timeline', 'Budget', 'Resources', 'Risk register', 'Communication plan'] },
      { name: 'Execution', tasks: ['Deliverables', 'Team coordination', 'Issue management'] },
      { name: 'Monitoring', tasks: ['Progress reporting', 'Budget monitoring', 'Risk review', 'Change management'] },
      { name: 'Closing', tasks: ['Final delivery', 'Client/stakeholder acceptance', 'Lessons learned', 'Closeout report'] },
    ],
  },
  {
    slug: 'software-development', name: 'Software Development', category: 'SOFTWARE_DEVELOPMENT', industry: 'Technology',
    icon: 'i-grid', featured: true, tags: ['software', 'engineering', 'development', 'agile'], defaultView: 'board',
    description: 'A full software development lifecycle from discovery to maintenance.',
    phases: [
      { name: 'Discovery', tasks: ['Stakeholder interviews', 'Define problem & goals'] },
      { name: 'Requirements', tasks: ['Functional requirements', 'Non-functional requirements'] },
      { name: 'UI/UX', tasks: [{ name: 'Wireframes' }, { name: 'UI Design', ref: 'ui-design' }] },
      { name: 'Architecture', tasks: ['System architecture', 'Data model design'] },
      { name: 'Frontend', tasks: [{ name: 'Frontend Development', ref: 'frontend-dev', dependsOnRefs: ['ui-design'] }] },
      { name: 'Backend', tasks: ['API design', 'Backend implementation'] },
      { name: 'Integration', tasks: ['Integrate frontend & backend', 'Third-party integrations'] },
      { name: 'QA', tasks: [{ name: 'Testing', ref: 'testing', dependsOnRefs: ['frontend-dev'] }, 'Bug fixing'] },
      { name: 'UAT', tasks: ['User acceptance testing', 'Sign-off'] },
      { name: 'Deployment', tasks: ['Release plan', 'Production deployment'] },
      { name: 'Monitoring', tasks: ['Set up monitoring/alerts', 'Review post-launch metrics'] },
      { name: 'Maintenance', tasks: ['Triage ongoing issues', 'Plan iterative improvements'] },
    ],
  },
  {
    slug: 'product-development', name: 'Product Development', category: 'PRODUCT_MANAGEMENT', industry: 'Technology',
    icon: 'i-sparkle', featured: false, tags: ['product', 'roadmap', 'discovery'], defaultView: 'board',
    description: 'Take a product idea from discovery through launch and iteration.',
    phases: [
      { name: 'Discovery', tasks: ['Identify opportunity', 'Define target users'] },
      { name: 'Research', tasks: ['User research', 'Competitive analysis'] },
      { name: 'Requirements', tasks: ['Write product requirements', 'Prioritize scope'] },
      { name: 'Prioritization', tasks: ['Score against strategy', 'Finalize roadmap slot'] },
      { name: 'Design', tasks: ['UX design', 'Design review'] },
      { name: 'Development', tasks: ['Build feature', 'Code review'] },
      { name: 'Testing', tasks: ['QA testing', 'Beta testing'] },
      { name: 'Launch', tasks: ['Launch plan', 'Release'] },
      { name: 'Measure', tasks: ['Track adoption metrics', 'Collect customer feedback'] },
      { name: 'Iteration', tasks: ['Prioritize improvements', 'Plan next iteration'] },
    ],
  },
  {
    slug: 'marketing-campaign', name: 'Marketing Campaign', category: 'MARKETING', industry: 'General',
    icon: 'i-message', featured: false, tags: ['marketing', 'campaign', 'launch'], defaultView: 'board',
    description: 'Plan, launch, and measure a marketing campaign.',
    phases: [
      { name: 'Planning', tasks: ['Define campaign goals', 'Define target audience', 'Set budget'] },
      { name: 'Content Creation', tasks: ['Develop messaging', 'Create creative assets', 'Write copy'] },
      { name: 'Channel Setup', tasks: ['Select channels', 'Set up tracking/analytics'] },
      { name: 'Launch', tasks: ['Schedule campaign', 'Go live'] },
      { name: 'Monitoring', tasks: ['Track performance daily/weekly', 'Optimize underperforming channels'] },
      { name: 'Wrap-up', tasks: ['Compile results report', 'Document learnings'] },
    ],
  },
  {
    slug: 'business-development-pipeline', name: 'Business Development Pipeline', category: 'SALES_AND_BUSINESS_DEVELOPMENT', industry: 'Professional Services',
    icon: 'i-trend-up', featured: true, tags: ['sales', 'business development', 'pipeline', 'partnerships'], defaultView: 'board',
    description: 'Track business development and partnership opportunities on a pipeline.',
    phases: [
      { name: 'Setup', tasks: ['Define ideal partner/client profile', 'Build target list'] },
      { name: 'Prospecting', tasks: ['Research prospects', 'Initial outreach'] },
      { name: 'Qualification', tasks: ['Qualify opportunity', 'Schedule discovery meeting'] },
      { name: 'Closing', tasks: ['Send proposal', 'Negotiate terms', 'Close deal'] },
    ],
    customFields: [
      { name: 'Company', type: 'text' }, { name: 'Contact', type: 'text' }, { name: 'Opportunity', type: 'text' },
      { name: 'Stage', type: 'select', options: ['Target', 'Contacted', 'Meeting', 'Proposal', 'Negotiation', 'Won', 'Lost'] },
      { name: 'Owner', type: 'text' }, { name: 'Value', type: 'number' }, { name: 'Probability', type: 'number' },
      { name: 'Last Contact', type: 'date' }, { name: 'Next Action', type: 'text' }, { name: 'Due Date', type: 'date' }, { name: 'Notes', type: 'text' },
    ],
  },
  {
    slug: 'recruitment', name: 'Recruitment', category: 'HR', industry: 'General',
    icon: 'i-users', featured: false, tags: ['hr', 'recruitment', 'hiring'], defaultView: 'board',
    description: 'Run a hiring process from role approval to onboarding.',
    phases: [
      { name: 'Role Approval', tasks: ['Define role need', 'Get budget approval'] },
      { name: 'Job Description', tasks: ['Write job description', 'Approve job description'] },
      { name: 'Sourcing', tasks: ['Post job', 'Source candidates'] },
      { name: 'Screening', tasks: ['Resume screening', 'Phone screen'] },
      { name: 'Interview', tasks: ['Schedule interviews', 'Conduct interviews'] },
      { name: 'Assessment', tasks: ['Skills assessment', 'Reference checks'] },
      { name: 'Offer', tasks: ['Prepare offer', 'Send & negotiate offer'] },
      { name: 'Hiring', tasks: ['Sign employment contract', 'Background checks'] },
      { name: 'Onboarding', tasks: ['Prepare onboarding plan', 'First-week onboarding'] },
    ],
  },
  {
    slug: 'operational-improvement', name: 'Operational Improvement', category: 'OPERATIONS', industry: 'General',
    icon: 'i-settings', featured: false, tags: ['operations', 'process improvement'], defaultView: 'list',
    description: 'Identify and implement an operational process improvement.',
    phases: [
      { name: 'Assessment', tasks: ['Map current process', 'Identify pain points'] },
      { name: 'Root Cause Analysis', tasks: ['Analyze root causes', 'Prioritize issues'] },
      { name: 'Solution Design', tasks: ['Design improved process', 'Get stakeholder sign-off'] },
      { name: 'Implementation', tasks: ['Roll out changes', 'Train team'] },
      { name: 'Monitoring', tasks: ['Track improvement metrics', 'Adjust as needed'] },
    ],
  },
  {
    slug: 'nda-execution', name: 'NDA Execution', category: 'LEGAL', industry: 'Professional Services',
    icon: 'i-lock', featured: false, tags: ['legal', 'nda', 'contract'], defaultView: 'list',
    description: `Execute a non-disclosure agreement from request to archive.${LEGAL_DISCLAIMER}`,
    phases: [
      { name: 'Request', tasks: ['Log NDA request', 'Confirm counterparty details'] },
      { name: 'Prepare NDA', tasks: ['Draft NDA', 'Select template/terms'] },
      { name: 'Internal Review', tasks: ['Internal legal review', 'Internal approval'] },
      { name: 'Counterparty Review', tasks: ['Send to counterparty', 'Track counterparty feedback'] },
      { name: 'Negotiation', tasks: ['Negotiate terms', 'Finalize redlines'] },
      { name: 'Signature', tasks: ['Route for signature', 'Confirm all signatures collected'] },
      { name: 'Final Execution', tasks: ['Confirm fully executed', 'Distribute executed copy'] },
      { name: 'Archive', tasks: ['File in contract repository', 'Set renewal/expiry reminder'] },
    ],
  },
  {
    slug: 'annual-budget', name: 'Annual Budget', category: 'FINANCE', industry: 'General',
    icon: 'i-wallet', featured: false, tags: ['finance', 'budget', 'planning'], defaultView: 'list',
    description: 'Plan and finalize the annual budget.',
    phases: [
      { name: 'Planning', tasks: ['Set budget timeline', 'Define budget assumptions'] },
      { name: 'Data Collection', tasks: ['Collect department inputs', 'Collect prior-year actuals'] },
      { name: 'Draft Budget', tasks: ['Build draft budget', 'Internal review'] },
      { name: 'Review & Approval', tasks: ['Leadership review', 'Board/stakeholder approval'] },
      { name: 'Finalize', tasks: ['Publish final budget', 'Communicate to departments'] },
      { name: 'Monitor', tasks: ['Set up monthly tracking', 'Plan quarterly reviews'] },
    ],
  },
  {
    slug: 'consulting-engagement', name: 'Consulting Engagement', category: 'CONSULTING', industry: 'Professional Services',
    icon: 'i-folder', featured: false, tags: ['consulting', 'engagement', 'advisory'], defaultView: 'list',
    description: 'Run a client consulting engagement from discovery to closeout.',
    phases: [
      { name: 'Discovery', tasks: ['Client discovery meeting', 'Define engagement scope'] },
      { name: 'Proposal', tasks: ['Draft proposal', 'Get client sign-off'] },
      { name: 'Kickoff', tasks: ['Kickoff meeting', 'Confirm success criteria'] },
      { name: 'Delivery', tasks: ['Execute workstreams', 'Client check-ins'] },
      { name: 'Review', tasks: ['Present findings/recommendations', 'Incorporate client feedback'] },
      { name: 'Closeout', tasks: ['Final deliverable handoff', 'Engagement retrospective'] },
    ],
  },
  {
    slug: 'event-planning', name: 'Event Planning', category: 'EVENTS', industry: 'General',
    icon: 'i-calendar', featured: false, tags: ['events', 'planning', 'conference'], defaultView: 'list',
    description: 'Plan and run an event from concept to post-event wrap-up.',
    phases: [
      { name: 'Planning', tasks: ['Define event goals', 'Set budget', 'Select date & venue'] },
      { name: 'Logistics', tasks: ['Book venue & vendors', 'Plan catering/AV'] },
      { name: 'Marketing', tasks: ['Create event page', 'Promote event', 'Manage registrations'] },
      { name: 'Execution', tasks: ['Day-of coordination', 'On-site registration'] },
      { name: 'Post-Event', tasks: ['Send follow-up communications', 'Compile attendance & feedback report'] },
    ],
  },
];

async function createTaskList(tx, templateId, phaseId, parentTaskId, tasks, refMap) {
  for (let i = 0; i < tasks.length; i++) {
    const raw = tasks[i];
    const t = typeof raw === 'string' ? { name: raw } : raw;
    const deps = (t.dependsOnRefs || []).map((r) => refMap.get(r)).filter(Boolean);
    const row = await tx.projectTemplateTask.create({
      data: {
        templateId, phaseId, parentTaskId, name: t.name, sortOrder: i,
        dependsOnJson: JSON.stringify(deps),
      },
    });
    if (t.ref) refMap.set(t.ref, row.id);
    if (t.children?.length) await createTaskList(tx, templateId, phaseId, row.id, t.children, refMap);
  }
}

async function upsertTemplate(def) {
  const existing = await prisma.projectTemplate.findUnique({ where: { slug: def.slug } });
  const scalarData = {
    name: def.name, description: def.description, category: def.category, industry: def.industry || 'General',
    icon: def.icon || 'i-folder', featured: !!def.featured, tagsJson: JSON.stringify(def.tags || []),
    defaultView: def.defaultView || null, isSystemTemplate: true, workspaceId: null, createdById: null,
  };

  const tpl = existing
    ? await prisma.projectTemplate.update({ where: { id: existing.id }, data: scalarData })
    : await prisma.projectTemplate.create({ data: { slug: def.slug, ...scalarData } });

  if (existing) {
    await prisma.projectTemplateTask.deleteMany({ where: { templateId: tpl.id } });
    await prisma.projectTemplateMilestone.deleteMany({ where: { templateId: tpl.id } });
    await prisma.projectTemplateCustomField.deleteMany({ where: { templateId: tpl.id } });
    await prisma.projectTemplatePhase.deleteMany({ where: { templateId: tpl.id } });
  }

  await prisma.$transaction(async (tx) => {
    const refMap = new Map();
    // Two passes over phases: first create every phase + task (so refs
    // exist), dependsOnRefs across different phases still resolve since
    // refMap is shared across the whole template.
    for (let i = 0; i < def.phases.length; i++) {
      const phase = def.phases[i];
      const p = await tx.projectTemplatePhase.create({
        data: { templateId: tpl.id, name: phase.name, description: phase.description || '', sortOrder: i },
      });
      await createTaskList(tx, tpl.id, p.id, null, phase.tasks, refMap);
    }
    for (let i = 0; i < (def.milestones || []).length; i++) {
      const m = def.milestones[i];
      await tx.projectTemplateMilestone.create({ data: { templateId: tpl.id, name: m.name, relativeDay: m.relativeDay, sortOrder: i } });
    }
    for (let i = 0; i < (def.customFields || []).length; i++) {
      const f = def.customFields[i];
      await tx.projectTemplateCustomField.create({ data: { templateId: tpl.id, name: f.name, type: f.type, optionsJson: JSON.stringify(f.options || []), sortOrder: i } });
    }
  });

  return tpl;
}

async function main() {
  for (const def of TEMPLATES) {
    await upsertTemplate(def);
    console.log(`ok  ${def.slug}`);
  }
  console.log(`Seeded ${TEMPLATES.length} system templates.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
