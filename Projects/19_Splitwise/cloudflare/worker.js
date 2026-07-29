/**
 * Splitwise Badminton Dashboard — Cloudflare Worker
 * Version: 2.1.0
 * Balance convention (Splitwise API):
 *   positive amount → member OWES money (needs to GIVE / PAY) ← flag these
 *   negative amount → member is OWED money (needs to GET / RECEIVE)
 */

const VERSION    = "2.1.0";
const BUILD_DATE = "2026-07-29";
const SW_BASE    = "https://secure.splitwise.com/api/v3.0";

async function swFetch(path, token) {
  const res = await fetch(`${SW_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

function cleanName(user) {
  if (!user) return "Unknown";
  const first = user.first_name || "";
  const last  = user.last_name  || "";
  return `${first} ${last}`.trim() || user.email || "Unknown";
}

async function fetchAllExpenses(token, groupId, daysBack) {
  const datedAfter = new Date(Date.now() - daysBack * 86400000)
    .toISOString().split("T")[0] + "T00:00:00Z";
  const all = [];
  let offset = 0;
  while (true) {
    const data  = await swFetch(`get_expenses?group_id=${groupId}&limit=100&offset=${offset}&dated_after=${datedAfter}`, token);
    const batch = (data.expenses || []).filter(e => !e.deleted_at);
    all.push(...batch);
    offset += 100;
    if ((data.expenses || []).length < 100) break;
  }
  return all;
}

async function getData(env) {
  const token     = env.SPLITWISE_TOKEN;
  const flagAbove = parseFloat(env.FLAG_ABOVE || "50");
  const daysBack  = parseInt(env.DAYS_BACK   || "1095");
  const groupName = env.GROUP_NAME || "Badminton Expense";

  if (!token) return { error: "SPLITWISE_TOKEN secret not set." };

  const meResp = await swFetch("get_current_user", token);
  if (!meResp.user) return { error: `Auth failed: ${JSON.stringify(meResp)}` };
  const me   = meResp.user;
  const myId = String(me.id);

  const groupsResp = await swFetch("get_groups", token);
  const groups = groupsResp.groups || [];
  const group  = groups.find(g => g.name.toLowerCase().includes(groupName.toLowerCase()));
  if (!group) return { error: `Group '${groupName}' not found.` };

  // Member balances
  // Positive balance = member OWES money (needs to PAY) ← flag if > flagAbove
  // Negative balance = member is OWED money (needs to RECEIVE)
  const members = (group.members || [])
    .filter(m => String(m.id) !== myId)
    .map(m => {
      let balance = 0;
      (m.balance || []).forEach(b => {
        if (b.currency_code === "MYR") balance = parseFloat(b.amount || 0);
      });
      return {
        id:      String(m.id),
        name:    cleanName(m),
        balance,                            // positive = owes, negative = owed
        flagged: balance >= flagAbove,      // flag high debtors
      };
    })
    .sort((a, b) => b.balance - a.balance);

  // Expenses — filter to only those involving me
  const expenses = await fetchAllExpenses(token, group.id, daysBack);
  const myExpenses = expenses.map(e => {
    let myPaid = 0, myOwed = 0, payer = "";
    (e.users || []).forEach(u => {
      const ui = u.user || {};
      const ps = parseFloat(u.paid_share || 0);
      const os = parseFloat(u.owed_share || 0);
      if (ps > 0 && !payer) payer = cleanName(ui);
      if (String(ui.id) === myId) { myPaid = ps; myOwed = os; }
    });
    if (myPaid === 0 && myOwed === 0) return null;
    return {
      date:      (e.date || "").slice(0, 10),
      desc:      e.description || "",
      cost:      parseFloat(e.cost || 0),
      currency:  e.currency_code || "",
      isPayment: !!e.payment,
      payer,
      myNet:     myPaid - myOwed,
    };
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));

  const debtors       = members.filter(m => m.balance > 0);
  const totalPending  = debtors.reduce((s, m) => s + m.balance, 0);
  const flaggedCount  = members.filter(m => m.flagged).length;

  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    me: cleanName(me),
    groupName: group.name,
    flagAbove,
    totalPending,
    flaggedCount,
    members,
    expenses: myExpenses,
    generatedAt: new Date().toISOString(),
  };
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function renderHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🏸 Badminton Expense Dashboard</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<style>
:root{--green:#1B6C3E;--green2:#2E9E5B;--red:#C62828;--orange:#E65100;--blue:#1565C0;--purple:#6A1B9A;--shadow:0 4px 20px rgba(0,0,0,.10)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#ECEFF1;min-height:100vh}

/* HERO */
.hero{
  background:linear-gradient(135deg,#0a2e18 0%,#1B6C3E 55%,#27854c 100%);
  padding:28px 36px 76px;position:relative;overflow:hidden;
}
.hero::before{
  content:'';position:absolute;inset:0;opacity:.4;
  background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
.hero::after{
  content:'🏸';position:absolute;right:3%;top:50%;transform:translateY(-50%);
  font-size:9rem;opacity:.06;pointer-events:none;
}
.hero-inner{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start}
.hero h1{color:#fff;font-size:2rem;font-weight:800;letter-spacing:-.03em;text-shadow:0 2px 8px rgba(0,0,0,.2)}
.hero .sub{color:rgba(255,255,255,.7);font-size:.85rem;margin-top:5px}
.hero-right{text-align:right}
.hero-ts{color:rgba(255,255,255,.6);font-size:.78rem;line-height:1.7}
.ver-badge{display:inline-block;background:rgba(255,255,255,.15);color:rgba(255,255,255,.8);padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.05em;backdrop-filter:blur(4px);margin-bottom:6px}
.refresh-btn{background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.35);padding:7px 16px;border-radius:8px;cursor:pointer;font-size:.82rem;font-weight:600;backdrop-filter:blur(4px);transition:.2s;margin-top:6px;display:inline-block}
.refresh-btn:hover{background:rgba(255,255,255,.28);transform:translateY(-1px)}

/* CARDS */
.cards-wrap{padding:0 32px;margin-top:-48px;position:relative;z-index:10}
.cards{display:flex;gap:14px;flex-wrap:wrap}
.card{background:#fff;border-radius:14px;padding:18px 22px;flex:1;min-width:150px;box-shadow:var(--shadow);border-top:3px solid transparent}
.card.danger{border-top-color:var(--red)}.card.warn{border-top-color:var(--orange)}.card.good{border-top-color:var(--green)}.card.info{border-top-color:var(--blue)}
.card .label{font-size:.72rem;color:#999;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.card .value{font-size:1.65rem;font-weight:800;margin-top:5px;line-height:1}
.card .hint{font-size:.76rem;color:#bbb;margin-top:3px}
.card.danger .value{color:var(--red)}.card.warn .value{color:var(--orange)}.card.good .value{color:var(--green)}.card.info .value{color:var(--blue)}

/* ALERT */
.alert{margin:20px 32px 4px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#FFF3E0,#FFE0B2);border-left:4px solid #FF6F00;font-size:.88rem;color:var(--orange);font-weight:600;display:flex;align-items:center;gap:8px}

/* TABS */
.tabs-wrap{padding:22px 32px 0;display:flex;gap:4px;flex-wrap:wrap}
.tab{padding:10px 22px;border-radius:10px 10px 0 0;cursor:pointer;font-size:.88rem;font-weight:600;color:#888;background:#DDE3E8;border:none;transition:.2s}
.tab:hover{background:#CDD5DC;color:#555}
.tab.active{background:#fff;color:var(--green);box-shadow:0 -2px 8px rgba(0,0,0,.07)}
.tab-content{display:none}
.tab-content.active{display:block}

/* SECTION */
.section{background:#fff;margin:0 32px 20px;border-radius:0 14px 14px 14px;box-shadow:var(--shadow);overflow:hidden}
.sec-head{padding:16px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0F0F0}
.sec-title{font-size:.95rem;font-weight:700;color:#333}
.sec-count{font-size:.78rem;color:#aaa;background:#F5F5F5;padding:3px 10px;border-radius:20px}

/* MEMBER GRID */
.m-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:18px 22px}
.mc{border-radius:12px;padding:16px 18px;position:relative;border:2px solid transparent;transition:.2s;cursor:default}
.mc:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
.mc.flagged{background:linear-gradient(145deg,#FFF0F0,#FFEBEE);border-color:#FFCDD2}
.mc.debtor{background:linear-gradient(145deg,#FFFAF0,#FFF3E0);border-color:#FFE0B2}
.mc.settled{background:linear-gradient(145deg,#F6FFF8,#E8F5E9);border-color:#C8E6C9}
.mc.creditor{background:linear-gradient(145deg,#F0F7FF,#E3F2FD);border-color:#BBDEFB}
.mc .flag-pin{position:absolute;top:10px;right:10px;font-size:1rem}
.mc .av{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem;color:#fff;margin-bottom:10px}
.mc.flagged  .av{background:linear-gradient(135deg,#EF5350,#C62828)}
.mc.debtor   .av{background:linear-gradient(135deg,#FFA726,#E65100)}
.mc.settled  .av{background:linear-gradient(135deg,#66BB6A,#1B6C3E)}
.mc.creditor .av{background:linear-gradient(135deg,#42A5F5,#1565C0)}
.mc .mname{font-weight:700;font-size:.92rem;color:#222;margin-bottom:5px}
.mc .mamt{font-size:1.15rem;font-weight:800}
.mc.flagged  .mamt{color:var(--red)}.mc.debtor .mamt{color:var(--orange)}
.mc.settled  .mamt{color:var(--green)}.mc.creditor .mamt{color:var(--blue)}
.mc .mstatus{font-size:.72rem;margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;opacity:.65}

/* EXPENSES TABLE */
.exp-bar{padding:12px 20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #F0F0F0;background:#FAFAFA}
.exp-bar input{padding:7px 13px;border:1.5px solid #E0E0E0;border-radius:8px;font-size:.84rem;outline:none;width:230px;background:#fff;transition:.2s}
.exp-bar input:focus{border-color:var(--green)}
.fb{padding:6px 14px;border-radius:8px;border:1.5px solid #E0E0E0;background:#fff;font-size:.8rem;cursor:pointer;font-weight:600;color:#777;transition:.15s}
.fb:hover{border-color:#bbb;color:#444}
.fb.on{background:var(--green);color:#fff;border-color:var(--green)}
table{width:100%;border-collapse:collapse}
th{background:#F7F9FC;padding:10px 16px;text-align:left;font-size:.73rem;color:#888;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #EAEAEA;white-space:nowrap}
td{padding:10px 16px;border-top:1px solid #F5F5F5;font-size:.87rem;vertical-align:middle}
tr:hover td{background:#FAFBFC}
.bdg{display:inline-block;padding:2px 9px;border-radius:20px;font-size:.71rem;font-weight:700;white-space:nowrap}
.bdg.pay{background:#E3F2FD;color:#1565C0}.bdg.exp{background:#F3E5F5;color:#6A1B9A}
.net-p{color:var(--green);font-weight:700}.net-n{color:var(--red);font-weight:700}

/* INSIGHTS */
.ins-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px 22px}
.ins-card{background:#F9FAFB;border-radius:12px;padding:18px;border:1px solid #EEEEEE}
.ins-card.full{grid-column:1/-1}
.ins-title{font-size:.85rem;font-weight:700;color:#555;margin-bottom:14px;text-transform:uppercase;letter-spacing:.05em}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #EEEEEE;font-size:.88rem}
.stat-row:last-child{border-bottom:none}
.stat-val{font-weight:700;color:var(--green)}
.rank-item{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F0F0F0;font-size:.87rem}
.rank-item:last-child{border-bottom:none}
.rank-num{width:22px;height:22px;border-radius:50%;background:var(--green);color:#fff;font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rank-bar-wrap{flex:1;background:#EEE;border-radius:4px;height:6px;overflow:hidden}
.rank-bar{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--green),var(--green2));transition:.5s}

/* MISC */
.loading{text-align:center;padding:60px;color:#888;font-size:1rem}
.error-msg{color:var(--red);padding:24px 32px;font-weight:600}
.empty{text-align:center;padding:28px;color:#bbb;font-size:.88rem}
.footer{text-align:center;padding:18px;color:#ccc;font-size:.73rem;margin:4px 32px;border-top:1px solid #E0E0E0}
@media(max-width:700px){
  .hero{padding:20px 18px 70px}.cards-wrap{padding:0 16px}
  .cards{gap:10px}.section,.alert,.tabs-wrap,.footer{margin-left:16px;margin-right:16px}
  .ins-grid{grid-template-columns:1fr}.ins-card.full{grid-column:1}
}
</style>
</head>
<body>
<div id="app"><div class="loading">⏳ Loading Badminton data...</div></div>
<script>
let D = null;
let currentExpFilter = 'all';

function twoYearsAgo(){
  const d=new Date(); d.setFullYear(d.getFullYear()-2);
  return d.toISOString().slice(0,10);
}

// ── RENDER MAIN ──
function renderApp(d){
  D = d;
  const ts  = new Date(d.generatedAt).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'});
  const flagged   = d.members.filter(m=>m.balance>=d.flagAbove);
  const debtors   = d.members.filter(m=>m.balance>0&&m.balance<d.flagAbove);
  const settled   = d.members.filter(m=>m.balance===0);
  const creditors = d.members.filter(m=>m.balance<0);

  const alertHtml = flagged.length>0
    ? \`<div class="alert">🚩 <strong>\${flagged.length} member\${flagged.length>1?'s':''} owe more than MYR \${d.flagAbove}</strong> — immediate settlement needed!</div>\`
    : '';

  function mc(m){
    const ini=(m.name.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2));
    let cls,status,amt;
    if(m.balance>=d.flagAbove){cls='flagged';status='🚩 Must pay now';amt='MYR '+m.balance.toFixed(2)}
    else if(m.balance>0){cls='debtor';status='Pending payment';amt='MYR '+m.balance.toFixed(2)}
    else if(m.balance<0){cls='creditor';status='Has credit';amt='MYR '+Math.abs(m.balance).toFixed(2)}
    else{cls='settled';status='All settled ✓';amt='—'}
    return \`<div class="mc \${cls}">
      \${m.balance>=d.flagAbove?'<span class="flag-pin">🚩</span>':''}
      <div class="av">\${ini}</div>
      <div class="mname">\${m.name}</div>
      <div class="mamt">\${amt}</div>
      <div class="mstatus">\${status}</div>
    </div>\`;
  }

  const membersHtml = [...flagged,...debtors,...creditors,...settled].map(mc).join('');

  document.getElementById('app').innerHTML = \`
    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>🏸 \${d.groupName}</h1>
          <div class="sub">Logged in as <strong>\${d.me}</strong></div>
        </div>
        <div class="hero-right">
          <div class="ver-badge">v\${d.version}</div>
          <div class="hero-ts">\${ts}</div>
          <button class="refresh-btn" onclick="reloadData()">🔄 Refresh</button>
        </div>
      </div>
    </div>

    <div class="cards-wrap"><div class="cards">
      <div class="card danger">
        <div class="label">Total Pending</div>
        <div class="value">MYR \${d.totalPending.toFixed(2)}</div>
        <div class="hint">\${d.members.filter(m=>m.balance>0).length} members owe you</div>
      </div>
      <div class="card warn">
        <div class="label">🚩 Flagged (&gt; MYR \${d.flagAbove})</div>
        <div class="value">\${flagged.length}</div>
        <div class="hint">Need immediate settlement</div>
      </div>
      <div class="card info">
        <div class="label">Pending (any)</div>
        <div class="value">\${d.members.filter(m=>m.balance>0).length}</div>
        <div class="hint">members</div>
      </div>
      <div class="card good">
        <div class="label">Settled</div>
        <div class="value">\${settled.length}</div>
        <div class="hint">members</div>
      </div>
      <div class="card">
        <div class="label">Transactions</div>
        <div class="value">\${d.expenses.length}</div>
        <div class="hint">3 years</div>
      </div>
    </div></div>

    <div class="tabs-wrap">
      <button class="tab active" onclick="switchTab('members',this)">👥 Members</button>
      <button class="tab" onclick="switchTab('expenses',this)">💳 Expenses (2 Yrs)</button>
      <button class="tab" onclick="switchTab('insights',this)">📊 Insights</button>
    </div>

    <div id="tab-members" class="tab-content active">
      \${alertHtml}
      <div class="section">
        <div class="sec-head">
          <span class="sec-title">Member Balances</span>
          <span class="sec-count">\${d.members.length} members</span>
        </div>
        <div class="m-grid">\${membersHtml}</div>
      </div>
    </div>

    <div id="tab-expenses" class="tab-content">
      <div class="section">
        <div class="sec-head">
          <span class="sec-title">All Transactions</span>
          <span class="sec-count" id="exp-count"></span>
        </div>
        <div class="exp-bar">
          <input type="text" id="exp-search" placeholder="🔍 Search..." oninput="filterExp()">
          <button class="fb on"  id="f-2y"      onclick="setFilter('2y')">Last 2 Years</button>
          <button class="fb"     id="f-all"      onclick="setFilter('all')">All time</button>
          <button class="fb"     id="f-expense"  onclick="setFilter('expense')">Expenses</button>
          <button class="fb"     id="f-payment"  onclick="setFilter('payment')">Payments</button>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Total</th><th>Paid By</th><th>Your Net</th></tr></thead>
            <tbody id="exp-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="tab-insights" class="tab-content">
      <div class="section">
        <div class="sec-head"><span class="sec-title">📊 Insights & Trends</span></div>
        <div class="ins-grid">
          <div class="ins-card full">
            <div class="ins-title">Monthly Spending (Last 12 Months)</div>
            <canvas id="monthly-chart" height="90"></canvas>
          </div>
          <div class="ins-card">
            <div class="ins-title">🏆 Top Debtors (need to pay)</div>
            <div id="top-debtors"></div>
          </div>
          <div class="ins-card">
            <div class="ins-title">📈 Summary Stats</div>
            <div id="summary-stats"></div>
          </div>
          <div class="ins-card">
            <div class="ins-title">💸 Expense vs Payments</div>
            <canvas id="type-chart" height="180"></canvas>
          </div>
          <div class="ins-card">
            <div class="ins-title">📅 Busiest Months</div>
            <div id="busy-months"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">Splitwise Dashboard v\${d.version} · Built \${d.buildDate} · Updated \${ts}</div>
  \`;

  filterExp();
}

// ── EXPENSES ──
function setFilter(f){
  currentExpFilter=f;
  document.querySelectorAll('.fb').forEach(b=>b.classList.remove('on'));
  const map={all:'f-all','2y':'f-2y',expense:'f-expense',payment:'f-payment'};
  document.getElementById(map[f])?.classList.add('on');
  filterExp();
}

function filterExp(){
  if(!D) return;
  const tbody=document.getElementById('exp-tbody');
  const countEl=document.getElementById('exp-count');
  if(!tbody) return;
  const search=(document.getElementById('exp-search')?.value||'').toLowerCase();
  const cut2y=twoYearsAgo();
  const f=currentExpFilter;
  const filtered=D.expenses.filter(e=>{
    if(f==='2y'&&e.date<cut2y) return false;
    if(f==='expense'&&e.isPayment) return false;
    if(f==='payment'&&!e.isPayment) return false;
    if(search&&!e.desc.toLowerCase().includes(search)&&!e.payer.toLowerCase().includes(search)) return false;
    return true;
  });
  if(countEl) countEl.textContent=filtered.length+' transactions';
  tbody.innerHTML=filtered.length===0
    ? '<tr><td colspan="6" class="empty">No transactions found</td></tr>'
    : filtered.map(e=>{
        const type=e.isPayment?'<span class="bdg pay">💸 Payment</span>':'<span class="bdg exp">🧾 Expense</span>';
        const nc=e.myNet>=0?'net-p':'net-n';
        const ns=e.myNet>=0?'+':'';
        return \`<tr><td style="color:#999;white-space:nowrap">\${e.date}</td><td>\${type}</td>
          <td style="font-weight:500">\${e.desc}</td>
          <td style="white-space:nowrap">\${e.currency} \${e.cost.toFixed(2)}</td>
          <td style="color:#666">\${e.payer}</td>
          <td class="\${nc}">\${ns}\${e.myNet.toFixed(2)}</td></tr>\`;
      }).join('');
}

// ── INSIGHTS ──
function buildInsights(){
  if(!D) return;
  const expenses=D.expenses.filter(e=>!e.isPayment);

  // Monthly chart (last 12 months)
  const months={};
  const now=new Date();
  for(let i=11;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=d.toISOString().slice(0,7);
    months[key]=0;
  }
  expenses.forEach(e=>{
    const mo=e.date.slice(0,7);
    if(months[mo]!==undefined) months[mo]+=e.cost;
  });
  const mLabels=Object.keys(months).map(k=>{
    const [y,m]=k.split('-');
    return new Date(y,m-1).toLocaleString('en',{month:'short',year:'2-digit'});
  });
  const mData=Object.values(months);

  const mCtx=document.getElementById('monthly-chart')?.getContext('2d');
  if(mCtx) new Chart(mCtx,{
    type:'bar',
    data:{labels:mLabels,datasets:[{label:'MYR Spent',data:mData,
      backgroundColor:'rgba(27,108,62,.75)',borderColor:'rgba(27,108,62,1)',
      borderWidth:1.5,borderRadius:5}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>'MYR '+v.toFixed(0)}}}}
  });

  // Expense vs Payment pie
  const numExp=D.expenses.filter(e=>!e.isPayment).length;
  const numPay=D.expenses.filter(e=>e.isPayment).length;
  const tCtx=document.getElementById('type-chart')?.getContext('2d');
  if(tCtx) new Chart(tCtx,{
    type:'doughnut',
    data:{labels:['Expenses','Payments'],datasets:[{data:[numExp,numPay],
      backgroundColor:['rgba(106,27,154,.75)','rgba(21,101,192,.75)'],borderWidth:0}]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}}}
  });

  // Top debtors
  const topD=D.members.filter(m=>m.balance>0).slice(0,5);
  const maxD=topD[0]?.balance||1;
  document.getElementById('top-debtors').innerHTML=topD.length===0
    ? '<div class="empty">No outstanding balances 🎉</div>'
    : topD.map((m,i)=>\`<div class="rank-item">
        <div class="rank-num">\${i+1}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.87rem">\${m.name}</div>
          <div class="rank-bar-wrap"><div class="rank-bar" style="width:\${(m.balance/maxD*100).toFixed(0)}%"></div></div>
        </div>
        <div style="font-weight:700;color:var(--red);font-size:.87rem">MYR \${m.balance.toFixed(2)}</div>
      </div>\`).join('');

  // Summary stats
  const totalExp=expenses.reduce((s,e)=>s+e.cost,0);
  const avgMonth=(totalExp/12).toFixed(2);
  const largestExp=expenses.sort((a,b)=>b.cost-a.cost)[0];
  document.getElementById('summary-stats').innerHTML=\`
    <div class="stat-row"><span>Total group spend (3yr)</span><span class="stat-val">MYR \${D.expenses.filter(e=>!e.isPayment).reduce((s,e)=>s+e.cost,0).toFixed(2)}</span></div>
    <div class="stat-row"><span>Avg monthly spend</span><span class="stat-val">MYR \${avgMonth}</span></div>
    <div class="stat-row"><span>Total transactions</span><span class="stat-val">\${D.expenses.length}</span></div>
    <div class="stat-row"><span>Payments made</span><span class="stat-val">\${numPay}</span></div>
    <div class="stat-row"><span>Biggest expense</span><span class="stat-val">MYR \${largestExp?.cost.toFixed(2)||0}</span></div>
    <div class="stat-row"><span>Members settled</span><span class="stat-val">\${D.members.filter(m=>m.balance===0).length}/\${D.members.length}</span></div>
  \`;

  // Busiest months
  const allMonths={};
  D.expenses.forEach(e=>{
    const mo=e.date.slice(0,7);
    allMonths[mo]=(allMonths[mo]||0)+1;
  });
  const sorted=Object.entries(allMonths).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxC=sorted[0]?.[1]||1;
  document.getElementById('busy-months').innerHTML=sorted.map(([mo,cnt],i)=>{
    const label=new Date(mo+'-01').toLocaleString('en',{month:'long',year:'numeric'});
    return \`<div class="rank-item">
      <div class="rank-num">\${i+1}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.87rem">\${label}</div>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:\${(cnt/maxC*100).toFixed(0)}%"></div></div>
      </div>
      <div style="font-weight:700;color:var(--blue);font-size:.87rem">\${cnt} txns</div>
    </div>\`;
  }).join('');
}

function switchTab(name,btn){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  btn.classList.add('active');
  if(name==='expenses') filterExp();
  if(name==='insights') buildInsights();
}

async function reloadData(){
  document.getElementById('app').innerHTML='<div class="loading">⏳ Refreshing...</div>';
  await loadData();
}

async function loadData(){
  try{
    const res=await fetch('/api/data');
    const d=await res.json();
    if(d.error){document.getElementById('app').innerHTML='<div class="error-msg">❌ '+d.error+'</div>';return;}
    renderApp(d);
  }catch(err){
    document.getElementById('app').innerHTML='<div class="error-msg">❌ '+err.message+'</div>';
  }
}

loadData();
<\/script>
</body>
</html>`;
}

// ── Worker entry ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET" };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/api/data") {
      try {
        const data = await getData(env);
        return new Response(JSON.stringify(data), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      } catch(err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/" || url.pathname === "/dashboard") {
      return new Response(renderHTML(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
