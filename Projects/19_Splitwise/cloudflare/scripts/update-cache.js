#!/usr/bin/env node
/**
 * update-cache.js
 * Fetches all Splitwise expenses and saves to data/cache.json
 * Run via GitHub Actions or manually: SPLITWISE_TOKEN=xxx node scripts/update-cache.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const TOKEN      = process.env.SPLITWISE_TOKEN;
const GROUP_NAME = process.env.GROUP_NAME || 'Badminton Expense';
const DAYS_BACK  = parseInt(process.env.DAYS_BACK || '1095');
const SW_BASE    = 'https://secure.splitwise.com/api/v3.0';

if (!TOKEN) {
  console.error('❌  SPLITWISE_TOKEN environment variable is required');
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function swFetch(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${SW_BASE}/${endpoint}`;
    const req = https.request(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'User-Agent': 'splitwise-cache-script/1.0'
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON parse error: ' + body.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function cleanName(u) {
  if (!u) return 'Unknown';
  return (`${u.first_name || ''} ${u.last_name || ''}`).trim() || u.email || 'Unknown';
}

async function fetchAllExpenses(groupId) {
  const after = new Date(Date.now() - DAYS_BACK * 86400000).toISOString().slice(0, 10) + 'T00:00:00Z';
  const all = [];
  let offset = 0;
  while (true) {
    process.stdout.write(`  Fetching offset ${offset}...\r`);
    const d = await swFetch(`get_expenses?group_id=${groupId}&limit=100&offset=${offset}&dated_after=${after}`);
    const batch = (d.expenses || []).filter(e => !e.deleted_at);
    all.push(...batch);
    offset += 100;
    if ((d.expenses || []).length < 100) break;
  }
  process.stdout.write('\n');
  return all;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔑  Fetching current user...');
  const meR = await swFetch('get_current_user');
  if (!meR.user) throw new Error('Auth failed: ' + JSON.stringify(meR));
  const myId   = String(meR.user.id);
  const myName = cleanName(meR.user);
  console.log(`    Logged in as: ${myName} (id=${myId})`);

  console.log('📋  Fetching groups...');
  const gR    = await swFetch('get_groups');
  const group = (gR.groups || []).find(g => g.name.toLowerCase().includes(GROUP_NAME.toLowerCase()));
  if (!group) throw new Error(`Group "${GROUP_NAME}" not found`);
  console.log(`    Found: ${group.name} (id=${group.id})`);

  console.log(`💳  Fetching expenses (${DAYS_BACK} days back)...`);
  const raw      = await fetchAllExpenses(group.id);
  console.log(`    Raw expenses: ${raw.length}`);

  const expenses = raw.map(e => {
    let myPaid = 0, myOwed = 0, payer = '';
    const participants = [];
    (e.users || []).forEach(u => {
      const ui = u.user || {};
      const ps = parseFloat(u.paid_share || 0);
      const os = parseFloat(u.owed_share  || 0);
      if (ps > 0 && !payer) payer = cleanName(ui);
      if (String(ui.id) === myId) { myPaid = ps; myOwed = os; }
      if (os > 0) participants.push({ name: cleanName(ui), owed: os });
    });
    return {
      date:       (e.date || '').slice(0, 10),
      desc:       e.description || '',
      cost:       parseFloat(e.cost || 0),
      currency:   e.currency_code || '',
      isPayment:  !!e.payment,
      payer,
      myNet:      myPaid - myOwed,
      myOwed,
      participants
    };
  }).filter(e => e.date).sort((a, b) => b.date.localeCompare(a.date));

  const lastExpenseDate = expenses.filter(e => !e.isPayment)[0]?.date || null;

  const cache = {
    generatedAt:      new Date().toISOString(),
    version:          '1.0',
    groupId:          String(group.id),
    groupName:        group.name,
    myId,
    lastExpenseDate,
    expenseCount:     expenses.length,
    expenses
  };

  const outPath = path.join(__dirname, '..', 'data', 'cache.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(cache, null, 2));

  console.log(`\n✅  Saved ${expenses.length} expenses → ${outPath}`);
  console.log(`    Last expense date : ${lastExpenseDate}`);
  console.log(`    Cache size        : ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
}

main().catch(e => {
  console.error('❌ ', e.message);
  process.exit(1);
});
