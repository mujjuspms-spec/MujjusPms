import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 8);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
} else {
  console.warn('\nWARNING: SUPABASE_URL and SUPABASE_SECRET_KEY are not set.');
  console.warn('Seeding will use random UUIDs for users, which means you cannot log in as them via Supabase Auth.');
  console.warn('Set up Supabase credentials to automatically provision these users in your auth project.\n');
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.integration.deleteMany();

  const users = [
    { id: 'mm', name: 'Mohd Muzzammil', email: 'mohd@mujuzpm.com', role: 'Founder & CEO', globalRole: 'owner', color: '#4a3aa7', initials: 'MM' },
    { id: 'aejaz', name: 'Aejaz', email: 'aejaz@mujuzpm.com', role: 'Operations Lead', globalRole: 'admin', color: '#2a78d6', initials: 'AE' },
    { id: 'ayan', name: 'Ayan', email: 'ayan@mujuzpm.com', role: 'Product Manager', globalRole: 'member', color: '#1baf7a', initials: 'AY' },
    { id: 'adandachi', name: 'Abdallah Dandachi', email: 'abdallah@mujuzpm.com', role: 'Business Development Director', globalRole: 'member', color: '#eb6834', initials: 'AD' },
    { id: 'arakha', name: 'Abdullah Rakha', email: 'abdullah@mujuzpm.com', role: 'Finance Lead', globalRole: 'member', color: '#008300', initials: 'AR' },
    { id: 'fhazza', name: 'Fahad Hazza', email: 'fahad@mujuzpm.com', role: 'Strategy Advisor', globalRole: 'member', color: '#eda100', initials: 'FH' },
    { id: 'jinnis', name: 'Justin Innis', email: 'justin@mujuzpm.com', role: 'Growth & Partnerships', globalRole: 'member', color: '#e87ba4', initials: 'JI' },
    { id: 'kalshaigi', name: 'Dr. Khalid Alshaigi', email: 'khalid@mujuzpm.com', role: 'Chief Medical Advisor', globalRole: 'member', color: '#e34948', initials: 'KA' },
    { id: 'bgurfein', name: 'Bruce Gurfein', email: 'bruce@mujuzpm.com', role: 'Investor Relations & Board Advisor', globalRole: 'viewer', color: '#0e7c66', initials: 'BG' },
  ];

  const idMap = {};

  for (const u of users) {
    let authId = null;
    if (supabaseAdmin) {
      const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers.find(x => x.email === u.email);
      
      if (existing) {
        authId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(authId, { password: 'mujuzpm123' });
      } else {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: 'mujuzpm123',
          email_confirm: true,
          user_metadata: { name: u.name }
        });
        if (error) throw error;
        authId = data.user.id;
      }
    } else {
      authId = crypto.randomUUID();
    }
    
    idMap[u.id] = authId;
    const { id, ...rest } = u;
    await prisma.user.create({ data: { id: authId, ...rest, passwordHash: '', capacity: 40, allocated: 30 } });
  }

  const projects = [
    { id: 'pr1', name: 'Medka Dx', health: 'good', progress: 70, due: '30 Nov 2026', start: '01 Jul 2026', desc: 'Diagnostics platform unifying lab results, patient records and physician workflows into one connected experience.', ownerId: idMap.ayan, client: 'Medka Dx', budget: 4200000, spent: 2450000, currency: 'USD',
      integrations: [{ icon: 'i-shield', label: 'HIPAA compliance review', status: 'pending' }, { icon: 'i-wallet', label: 'Billing & claims sync', status: 'connected' }] },
    { id: 'pr2', name: 'Allergenix', health: 'warning', progress: 45, due: '15 Jan 2027', start: '01 Apr 2026', desc: 'Allergy testing and diagnostics product line — panel design, lab partnerships and patient-facing results app.', ownerId: idMap.kalshaigi, client: 'Allergenix', budget: 3100000, spent: 1400000, currency: 'USD',
      integrations: [{ icon: 'i-shield', label: 'Lab accreditation tracking', status: 'pending' }, { icon: 'i-folder', label: 'Clinical data repository', status: 'connected' }] },
    { id: 'pr3', name: 'Spectra', health: 'good', progress: 55, due: '20 Feb 2027', start: '01 Aug 2026', desc: 'Data and analytics platform turning multi-source biomarker signal into actionable clinical insight.', ownerId: idMap.jinnis, client: 'Spectra', budget: 2600000, spent: 1150000, currency: 'USD',
      integrations: [{ icon: 'i-activity', label: 'Analytics pipeline', status: 'connected' }, { icon: 'i-wallet', label: 'Usage-based billing', status: 'pending' }] },
    { id: 'pr4', name: 'LinusBio MENA', health: 'good', progress: 38, due: '10 Apr 2027', start: '01 Sep 2026', desc: 'Regional launch of LinusBio’s exposome biomarker testing across the MENA market.', ownerId: idMap.adandachi, client: 'LinusBio', budget: 5000000, spent: 1300000, currency: 'USD',
      integrations: [{ icon: 'i-globe', label: 'MENA regulatory filings', status: 'pending' }, { icon: 'i-folder', label: 'Lab partner onboarding', status: 'connected' }] },
    { id: 'pr5', name: 'Consultmed', health: 'critical', progress: 25, due: '30 Sep 2026', start: '01 May 2026', desc: 'Telehealth consultation platform connecting patients with specialists for second-opinion and ongoing care.', ownerId: idMap.aejaz, client: 'Consultmed', budget: 1800000, spent: 950000, currency: 'USD',
      integrations: [{ icon: 'i-phone', label: 'Video consult infrastructure', status: 'connected' }, { icon: 'i-shield', label: 'Data privacy audit', status: 'pending' }] },
    { id: 'pr6', name: 'KaRama Capital Connects', health: 'good', progress: 62, due: '05 Dec 2026', start: '01 Jun 2026', desc: 'Capital-matching platform connecting growth-stage healthcare ventures with the right investors.', ownerId: idMap.arakha, client: 'KaRama Capital', budget: 2200000, spent: 1360000, currency: 'USD',
      integrations: [{ icon: 'i-wallet', label: 'Deal room & data vault', status: 'connected' }, { icon: 'i-id', label: 'Investor KYC', status: 'connected' }] },
    { id: 'pr7', name: 'NUVO', health: 'good', progress: 80, due: '01 Nov 2026', start: '01 Mar 2026', desc: 'New consumer health brand launch — product, packaging and direct-to-consumer channel build-out.', ownerId: idMap.fhazza, client: 'NUVO', budget: 1500000, spent: 1180000, currency: 'USD',
      integrations: [{ icon: 'i-folder', label: 'DTC storefront', status: 'connected' }] },
    { id: 'pr8', name: 'KaRama VS Investment', health: 'warning', progress: 30, due: '28 Feb 2027', start: '01 Aug 2026', desc: 'KaRama VS $45M investment round — due diligence, term sheet negotiation and close.', ownerId: idMap.bgurfein, client: 'KaRama VS', budget: 45000000, spent: 6200000, currency: 'USD',
      integrations: [{ icon: 'i-wallet', label: 'Cap table & deal tracker', status: 'connected' }, { icon: 'i-shield', label: 'Legal & compliance review', status: 'pending' }] },
  ];
  for (const p of projects) {
    const { integrations, ...rest } = p;
    await prisma.project.create({ data: { ...rest, integrationsJson: JSON.stringify(integrations) } });
  }

  await prisma.projectMember.create({ data: { projectId: 'pr1', userId: idMap.mm, role: 'admin' } });
  for (const p of projects) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: p.id, userId: p.ownerId } },
      update: {}, create: { projectId: p.id, userId: p.ownerId, role: 'owner' },
    });
  }

  async function addTask({ project, parentId = null, title, status, priority, assignee, due, dependsOn = [] }) {
    const progress = status === 'done' ? 100 : status === 'review' ? 80 : status === 'progress' ? 50 : status === 'blocked' ? 20 : 0;
    const t = await prisma.task.create({
      data: { projectId: project, parentId, title, status, priority, assigneeId: assignee || null,
        due, progress, desc: title, dependsOnJson: JSON.stringify(dependsOn) },
    });
    return t.id;
  }

  const t1 = await addTask({ project: 'pr1', title: 'Design lab results ingestion pipeline', status: 'done', priority: 'high', assignee: idMap.ayan, due: '10 Aug 2026' });
  const t1a = await addTask({ project: 'pr1', parentId: t1, title: 'Define HL7/FHIR mapping', status: 'done', priority: 'high', assignee: idMap.ayan, due: '05 Aug 2026' });
  const t1a1 = await addTask({ project: 'pr1', parentId: t1a, title: 'Draft field-mapping spec', status: 'done', priority: 'medium', assignee: idMap.ayan, due: '02 Aug 2026' });
  await addTask({ project: 'pr1', parentId: t1a1, title: 'Get lab partner sign-off on spec', status: 'done', priority: 'medium', assignee: idMap.ayan, due: '02 Aug 2026' });
  const t2 = await addTask({ project: 'pr1', title: 'Physician dashboard UI', status: 'progress', priority: 'high', assignee: idMap.ayan, due: '20 Sep 2026', dependsOn: [t1] });
  const t3 = await addTask({ project: 'pr1', title: 'HIPAA compliance review', status: 'review', priority: 'urgent', assignee: idMap.mm, due: '01 Oct 2026', dependsOn: [t2] });
  await addTask({ project: 'pr1', title: 'Patient mobile app — results view', status: 'todo', priority: 'medium', assignee: idMap.aejaz, due: '15 Oct 2026', dependsOn: [t2] });
  await addTask({ project: 'pr1', title: 'Billing & claims sync', status: 'done', priority: 'medium', assignee: idMap.arakha, due: '05 Aug 2026' });
  await addTask({ project: 'pr1', title: 'Load testing at 40 clinic scale', status: 'todo', priority: 'low', assignee: idMap.ayan, due: '05 Nov 2026', dependsOn: [t3] });

  const TEMPLATES = {
    pr2: [['Allergy panel design & lab partner shortlist', 'done', 'high', idMap.kalshaigi, '01 Aug 2026'], ['Clinical data repository setup', 'progress', 'high', idMap.ayan, '25 Sep 2026'], ['Lab accreditation tracking', 'todo', 'urgent', idMap.kalshaigi, '10 Oct 2026'], ['Patient results app — allergy severity view', 'todo', 'medium', idMap.aejaz, '20 Nov 2026'], ['Physician referral workflow', 'blocked', 'high', idMap.ayan, '01 Dec 2026']],
    pr3: [['Biomarker ingestion pipeline v1', 'done', 'high', idMap.jinnis, '15 Aug 2026'], ['Analytics dashboard — cohort views', 'progress', 'high', idMap.jinnis, '10 Oct 2026'], ['Usage-based billing integration', 'todo', 'medium', idMap.arakha, '01 Nov 2026'], ['Data quality & anomaly alerts', 'todo', 'medium', idMap.jinnis, '20 Nov 2026']],
    pr4: [['MENA regulatory filing — UAE', 'progress', 'urgent', idMap.adandachi, '01 Oct 2026'], ['MENA regulatory filing — KSA', 'todo', 'urgent', idMap.adandachi, '15 Nov 2026'], ['Lab partner onboarding — Dubai', 'done', 'high', idMap.adandachi, '20 Aug 2026'], ['Go-to-market plan & pricing', 'progress', 'medium', idMap.fhazza, '10 Dec 2026'], ['Local sales hire — Riyadh', 'todo', 'low', idMap.adandachi, '05 Jan 2027']],
    pr5: [['Video consult infrastructure', 'done', 'high', idMap.aejaz, '01 Jul 2026'], ['Specialist onboarding flow', 'blocked', 'urgent', idMap.aejaz, '15 Sep 2026'], ['Data privacy audit', 'todo', 'urgent', idMap.mm, '25 Sep 2026'], ['Payment & insurance integration', 'progress', 'high', idMap.arakha, '10 Oct 2026']],
    pr6: [['Deal room & data vault', 'done', 'high', idMap.arakha, '01 Jul 2026'], ['Investor KYC flow', 'done', 'high', idMap.arakha, '20 Jul 2026'], ['Matching algorithm v1', 'progress', 'medium', idMap.jinnis, '01 Oct 2026'], ['Investor onboarding — first cohort', 'todo', 'medium', idMap.bgurfein, '15 Nov 2026']],
    pr7: [['Product & packaging finalized', 'done', 'high', idMap.fhazza, '01 Jun 2026'], ['DTC storefront launch', 'done', 'high', idMap.aejaz, '15 Jul 2026'], ['Launch marketing campaign', 'progress', 'medium', idMap.jinnis, '20 Sep 2026'], ['Retail partner pilot', 'todo', 'low', idMap.fhazza, '10 Oct 2026']],
    pr8: [['Cap table & deal tracker set up', 'done', 'high', idMap.bgurfein, '10 Aug 2026'], ['Due diligence — financials', 'progress', 'urgent', idMap.arakha, '01 Oct 2026'], ['Legal & compliance review', 'todo', 'urgent', idMap.mm, '15 Nov 2026'], ['Term sheet negotiation', 'todo', 'urgent', idMap.bgurfein, '01 Dec 2026'], ['Close & funds transfer', 'todo', 'urgent', idMap.bgurfein, '28 Feb 2027']],
  };
  for (const [pid, rows] of Object.entries(TEMPLATES)) {
    for (const [title, status, priority, assignee, due] of rows) {
      await addTask({ project: pid, title, status, priority, assignee, due });
    }
  }

  await prisma.notification.createMany({
    data: [
      { userId: idMap.mm, icon: 'i-alert-t', color: 'var(--status-critical)', text: 'Consultmed specialist onboarding flow is blocked', unread: true, projectId: 'pr5' },
      { userId: idMap.mm, icon: 'i-sparkle', color: 'var(--brand-500)', text: 'AI Copilot generated a weekly risk summary for Medka Dx', unread: true, projectId: 'pr1' },
    ],
  });

  await prisma.automationRule.create({
    data: { projectId: null, name: 'Notify owner when a task is marked Done', triggerType: 'status_change', triggerConfigJson: JSON.stringify({ to: 'done' }), actionType: 'notify_owner', actionConfigJson: '{}', enabled: true },
  });

  await prisma.integration.createMany({
    data: [
      { provider: 'anthropic', connected: false, configJson: JSON.stringify({ apiKey: '' }) },
      { provider: 'slack', connected: false, configJson: JSON.stringify({ webhookUrl: '' }) },
      { provider: 'googleCalendar', connected: false, configJson: JSON.stringify({ clientId: '', clientSecret: '' }) },
      { provider: 'docusign', connected: false, configJson: JSON.stringify({ integrationKey: '', clientSecret: '' }) },
      { provider: 'quickbooks', connected: false, configJson: JSON.stringify({ clientId: '', clientSecret: '' }) },
    ],
  });

  console.log('Seed complete.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
