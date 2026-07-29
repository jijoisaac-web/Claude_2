/**
 * Splitwise Badminton Dashboard — Cloudflare Worker v2.2.0
 * FLAG: Creditors (Has Credit > flagAbove) are flagged — they are owed money by the group
 */

const VERSION    = "2.7.0";
const BUILD_DATE = "2026-07-29";
const SW_BASE    = "https://secure.splitwise.com/api/v3.0";

async function swFetch(path, token) {
  const res = await fetch(`${SW_BASE}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}
function cleanName(u) {
  if (!u) return "Unknown";
  return (`${u.first_name||""} ${u.last_name||""}`).trim() || u.email || "Unknown";
}
async function fetchAllExpenses(token, groupId, daysBack) {
  const after = new Date(Date.now() - daysBack*86400000).toISOString().slice(0,10)+"T00:00:00Z";
  const all=[]; let offset=0;
  while(true){
    const d = await swFetch(`get_expenses?group_id=${groupId}&limit=100&offset=${offset}&dated_after=${after}`,token);
    const b = (d.expenses||[]).filter(e=>!e.deleted_at);
    all.push(...b); offset+=100;
    if((d.expenses||[]).length<100) break;
  }
  return all;
}

// Phase 1 — fast: only 2 API calls (user + groups)
async function getSummary(env) {
  const token=env.SPLITWISE_TOKEN, flagAbove=parseFloat(env.FLAG_ABOVE||"50"),
        groupName=env.GROUP_NAME||"Badminton Expense";
  if(!token) return {error:"SPLITWISE_TOKEN not set."};
  const meR=await swFetch("get_current_user",token);
  if(!meR.user) return {error:`Auth failed: ${JSON.stringify(meR)}`};
  const me=meR.user, myId=String(me.id);
  const gR=await swFetch("get_groups",token);
  const group=(gR.groups||[]).find(g=>g.name.toLowerCase().includes(groupName.toLowerCase()));
  if(!group) return {error:`Group '${groupName}' not found.`};

  const members=(group.members||[]).map(m=>{
    let bal=0;
    (m.balance||[]).forEach(b=>{ if(b.currency_code==="MYR") bal=parseFloat(b.amount||0); });
    const isMe=String(m.id)===myId;
    return { id:String(m.id), name:cleanName(m), balance:bal, isMe,
             flagged: bal<0 && Math.abs(bal)>=flagAbove };
  }).sort((a,b)=>a.balance-b.balance);

  const creditors=members.filter(m=>m.balance<0), debtors=members.filter(m=>m.balance>0);
  return { version:VERSION, buildDate:BUILD_DATE, me:cleanName(me),
           myId, groupId:String(group.id), groupName:group.name, flagAbove,
           totalCredit:creditors.reduce((s,m)=>s+Math.abs(m.balance),0),
           totalDebt:debtors.reduce((s,m)=>s+m.balance,0),
           members, generatedAt:new Date().toISOString() };
}

// Process raw Splitwise expense objects into dashboard format (all expenses, myOwed=0 if not part)
function processExpenses(exps, myId) {
  return exps.map(e=>{
    let myPaid=0,myOwed=0,payer="";
    const participants=[];
    (e.users||[]).forEach(u=>{
      const ui=u.user||{},ps=parseFloat(u.paid_share||0),os=parseFloat(u.owed_share||0);
      if(ps>0&&!payer) payer=cleanName(ui);
      if(String(ui.id)===myId){myPaid=ps;myOwed=os;}
      if(os>0) participants.push({name:cleanName(ui),owed:os});
    });
    return { date:(e.date||"").slice(0,10), desc:e.description||"",
             cost:parseFloat(e.cost||0), currency:e.currency_code||"",
             isPayment:!!e.payment, payer, myNet:myPaid-myOwed, myOwed, participants };
  }).filter(e=>e.date).sort((a,b)=>b.date.localeCompare(a.date));
}

// Phase 2 — cache-first with delta from Splitwise API
async function getExpenses(env, groupId, myId) {
  const token=env.SPLITWISE_TOKEN, daysBack=parseInt(env.DAYS_BACK||"1095");
  const cacheUrl=env.CACHE_URL||"";

  // ── Load cache (GitHub raw JSON) ──
  let cachedExps=[], cacheInfo={fromCache:false,cacheDate:null,cacheCount:0};
  if(cacheUrl){
    try{
      const cr=await fetch(cacheUrl+'?cb='+Math.floor(Date.now()/300000)); // 5-min CDN bust
      if(cr.ok){
        const c=await cr.json();
        if(c.expenses&&Array.isArray(c.expenses)){
          cachedExps=c.expenses;
          cacheInfo={fromCache:true,cacheDate:c.generatedAt||null,cacheCount:c.expenses.length};
        }
      }
    }catch(e){/* cache unavailable, fall through to full fetch */}
  }

  if(!token){
    if(cachedExps.length>0) return {expenses:cachedExps,...cacheInfo,deltaCount:0};
    return {error:"SPLITWISE_TOKEN not set."};
  }

  // ── Determine delta range (only fetch what's new since cache) ──
  const lastCached=[...cachedExps].filter(e=>!e.isPayment).sort((a,b)=>b.date.localeCompare(a.date))[0]?.date||null;
  let daysBackDelta=daysBack;
  if(cacheInfo.fromCache&&lastCached){
    const d=new Date(lastCached); d.setDate(d.getDate()-2); // 2-day overlap to catch edits
    daysBackDelta=Math.min(Math.ceil((Date.now()-d.getTime())/86400000)+1, daysBack);
  }

  // ── Fetch delta from Splitwise ──
  const rawExps=await fetchAllExpenses(token,groupId,daysBackDelta);
  const deltaExps=processExpenses(rawExps,myId);

  // ── Merge: keep older cache + fresh delta ──
  let merged;
  if(cacheInfo.fromCache&&lastCached){
    const cutoff=new Date(lastCached); cutoff.setDate(cutoff.getDate()-2);
    const cutStr=cutoff.toISOString().slice(0,10);
    const older=cachedExps.filter(e=>e.date<cutStr);
    const seen=new Set();
    merged=[...older,...deltaExps].filter(e=>{
      const key=e.date+'|'+e.desc+'|'+e.cost.toFixed(2);
      if(seen.has(key)) return false; seen.add(key); return true;
    }).sort((a,b)=>b.date.localeCompare(a.date));
  } else {
    merged=deltaExps;
  }

  return {expenses:merged,...cacheInfo,deltaCount:deltaExps.length};
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function renderHTML(){
// Pexels background — shuttlecock on green badminton court (ID 7438732)
const bgUrl = `https://images.pexels.com/photos/7438732/pexels-photo-7438732.jpeg?auto=compress&cs=tinysrgb&w=1920&fit=max`;

return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🏸 Badminton Expense Dashboard</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<style>
:root{--g:#1B6C3E;--g2:#2E9E5B;--r:#C62828;--o:#E65100;--b:#1565C0;--sh:0 4px 20px rgba(0,0,0,.10)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;background:rgba(240,244,240,0.15);position:relative;}
body::before{content:'';position:fixed;inset:0;z-index:-1;
  background:url("${bgUrl}") center/cover no-repeat;
  opacity:0.5;pointer-events:none;}

/* HERO */
.hero{background:linear-gradient(135deg,#062215 0%,#0f4023 40%,#1B6C3E 75%,#27854c 100%);
  padding:28px 36px 76px;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;inset:0;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='640'%3E%3Crect width='400' height='640' fill='none'/%3E%3Crect x='20' y='20' width='360' height='600' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='2'/%3E%3Cline x1='20' y1='320' x2='380' y2='320' stroke='rgba(255,255,255,0.12)' stroke-width='3'/%3E%3Cline x1='200' y1='20' x2='200' y2='160' stroke='rgba(255,255,255,0.06)' stroke-width='1.5'/%3E%3Cline x1='200' y1='480' x2='200' y2='620' stroke='rgba(255,255,255,0.06)' stroke-width='1.5'/%3E%3Cline x1='20' y1='160' x2='380' y2='160' stroke='rgba(255,255,255,0.06)' stroke-width='1.5'/%3E%3Cline x1='20' y1='480' x2='380' y2='480' stroke='rgba(255,255,255,0.06)' stroke-width='1.5'/%3E%3C/svg%3E") center/cover;}
.hero::after{content:'🏸';position:absolute;right:2%;top:50%;transform:translateY(-50%);font-size:10rem;opacity:.07;pointer-events:none;}
.hero-in{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start;}
.hero h1{color:#fff;font-size:2rem;font-weight:800;letter-spacing:-.03em;text-shadow:0 2px 10px rgba(0,0,0,.3);}
.hero .sub{color:rgba(255,255,255,.7);font-size:.85rem;margin-top:5px;}
.vbadge{display:inline-block;background:rgba(255,255,255,.18);color:rgba(255,255,255,.9);
  padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.05em;
  backdrop-filter:blur(4px);margin-bottom:5px;}
.hero-ts{color:rgba(255,255,255,.6);font-size:.78rem;text-align:right;line-height:1.7;}
.rbtn{background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.3);
  padding:7px 16px;border-radius:8px;cursor:pointer;font-size:.82rem;font-weight:600;
  backdrop-filter:blur(4px);transition:.2s;margin-top:6px;display:inline-block;}
.rbtn:hover{background:rgba(255,255,255,.28);}

/* CARDS */
.cw{padding:0 32px;margin-top:-48px;position:relative;z-index:10;}
.cards{display:flex;gap:14px;flex-wrap:wrap;}
.card{background:rgba(255,255,255,0.84);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:14px;padding:18px 22px;flex:1;min-width:148px;
  box-shadow:var(--sh);border-top:3px solid #eee;}
.card.cr{border-top-color:var(--b)}.card.db{border-top-color:var(--o)}
.card.fl{border-top-color:var(--r)}.card.ok{border-top-color:var(--g)}
.card .lbl{font-size:.71rem;color:#999;text-transform:uppercase;letter-spacing:.06em;font-weight:600;}
.card .val{font-size:1.6rem;font-weight:800;margin-top:5px;line-height:1;}
.card .hint{font-size:.74rem;color:#bbb;margin-top:3px;}
.card.cr .val{color:var(--b)}.card.db .val{color:var(--o)}
.card.fl .val{color:var(--r)}.card.ok .val{color:var(--g)}

/* ALERT */
.alert{margin:18px 32px 4px;padding:12px 20px;border-radius:10px;
  background:linear-gradient(135deg,rgba(227,242,253,0.88),rgba(187,222,251,0.88));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-left:4px solid var(--b);
  font-size:.88rem;color:var(--b);font-weight:600;display:flex;align-items:center;gap:8px;}

/* TABS */
.tw{padding:22px 32px 0;display:flex;gap:4px;flex-wrap:wrap;}
.tab{padding:10px 22px;border-radius:10px 10px 0 0;cursor:pointer;font-size:.88rem;
  font-weight:600;color:#777;background:rgba(255,255,255,.6);border:none;transition:.2s;
  backdrop-filter:blur(4px);}
.tab:hover{background:rgba(255,255,255,.8);}
.tab.active{background:#fff;color:var(--g);box-shadow:0 -2px 8px rgba(0,0,0,.07);}
.tc{display:none}.tc.active{display:block}

/* SECTION */
.sec{background:rgba(255,255,255,0.84);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);margin:0 32px 20px;border-radius:0 14px 14px 14px;box-shadow:var(--sh);overflow:hidden;}
.sh{padding:15px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0F0F0;}
.st{font-size:.95rem;font-weight:700;color:#333;}
.sc{font-size:.77rem;color:#aaa;background:#F5F5F5;padding:3px 10px;border-radius:20px;}

/* MEMBER GROUPS — compact 4-col layout */
.mgw{padding:10px 20px 14px;}
.mgg{border-radius:10px;overflow:hidden;border:1.5px solid #EEE;margin-bottom:8px;box-shadow:0 2px 6px rgba(0,0,0,.04);}
.mgg:last-child{margin-bottom:0;}
.mggh{padding:7px 12px;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:6px;}
.mggbadge{margin-left:auto;padding:1px 7px;border-radius:20px;font-size:.67rem;font-weight:700;background:rgba(0,0,0,.12);}
.mggh.rd{background:#FFEBEE;color:#B71C1C;border-bottom:1.5px solid #FFCDD2;}
.mggh.yw{background:#FFFDE7;color:#F57F17;border-bottom:1.5px solid #FFF9C4;}
.mggh.bl{background:#E3F2FD;color:#1565C0;border-bottom:1.5px solid #BBDEFB;}
.mggh.gn{background:#E8F5E9;color:#1B6C3E;border-bottom:1.5px solid #C8E6C9;}
.mgr{display:flex;align-items:center;padding:6px 10px;gap:8px;background:#fff;border-bottom:1px solid #F5F5F5;transition:.15s;}
.mgr:last-child{border-bottom:none;}.mgr:hover{background:#FAFAFA;}
.mgr.mer{background:linear-gradient(90deg,rgba(27,108,62,.07),#fff);}
.avs{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.67rem;color:#fff;flex-shrink:0;}
.avs.rd{background:linear-gradient(135deg,#EF5350,#B71C1C);}
.avs.yw{background:linear-gradient(135deg,#FDD835,#F57F17);}
.avs.bl{background:linear-gradient(135deg,#42A5F5,#1565C0);}
.avs.gn{background:linear-gradient(135deg,#66BB6A,#1B6C3E);}
.mgrn{flex:1;font-weight:600;font-size:.82rem;color:#222;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mgra{font-weight:800;font-size:.83rem;text-align:right;white-space:nowrap;}
.mgra.rd{color:#C62828}.mgra.yw{color:#F57F17}.mgra.bl{color:#1565C0}.mgra.gn{color:#1B6C3E}
.me-tag{font-size:.6rem;background:rgba(27,108,62,.15);color:#1B6C3E;padding:1px 5px;border-radius:8px;font-weight:700;margin-left:4px;vertical-align:middle;}
/* 4-col top: active groups side-by-side; settled full-width below */
.mg4top{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px;}
.mg4top>.mgg{margin-bottom:0;}

/* EXPENSE BAR */
.ebar{padding:12px 20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;
  border-bottom:1px solid #F0F0F0;background:#FAFAFA;}
.ebar input,.ebar select{padding:7px 12px;border:1.5px solid #E0E0E0;border-radius:8px;
  font-size:.83rem;outline:none;background:#fff;transition:.2s;}
.ebar input{width:200px;}.ebar select{width:180px;}
.ebar input:focus,.ebar select:focus{border-color:var(--g);}
.fb{padding:6px 13px;border-radius:8px;border:1.5px solid #E0E0E0;background:#fff;
  font-size:.79rem;cursor:pointer;font-weight:600;color:#777;transition:.15s;}
.fb:hover{border-color:#bbb;color:#444;}.fb.on{background:var(--g);color:#fff;border-color:var(--g);}

/* TABLE */
table{width:100%;border-collapse:collapse;}
th{background:#F7F9FC;padding:10px 15px;text-align:left;font-size:.72rem;color:#888;
  text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #EAEAEA;white-space:nowrap;}
td{padding:10px 15px;border-top:1px solid #F5F5F5;font-size:.86rem;vertical-align:middle;}
tr:hover td{background:#FAFBFC;}
.bdg{display:inline-block;padding:2px 9px;border-radius:20px;font-size:.7rem;font-weight:700;}
.bdg.pay{background:#E3F2FD;color:#1565C0;}.bdg.exp{background:#F3E5F5;color:#6A1B9A;}
.np{color:var(--g);font-weight:700;}.nn{color:var(--r);font-weight:700;}

/* INSIGHTS */
.ig{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 20px;}
.ic{background:rgba(249,250,251,0.80);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:12px;padding:16px;border:1px solid #EEEEEE;}
.ic.full{grid-column:1/-1;}
.it{font-size:.82rem;font-weight:700;color:#555;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em;}
.ibar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;}
.ibar select{padding:6px 10px;border:1.5px solid #E0E0E0;border-radius:8px;
  font-size:.82rem;outline:none;background:#fff;}
.ibar select:focus{border-color:var(--g);}
.mfb{padding:5px 11px;border-radius:20px;border:1.5px solid #DDD;background:#fff;
  font-size:.75rem;cursor:pointer;font-weight:600;color:#777;transition:.15s;white-space:nowrap;}
.mfb:hover{border-color:#999;color:#333;}.mfb.on{background:var(--g);color:#fff;border-color:var(--g);}
.sr{display:flex;justify-content:space-between;align-items:center;
  padding:7px 0;border-bottom:1px solid #EEEEEE;font-size:.87rem;}
.sr:last-child{border-bottom:none;}.sv{font-weight:700;color:var(--g);}
.ri{display:flex;align-items:center;gap:10px;padding:6px 0;
  border-bottom:1px solid #F0F0F0;font-size:.86rem;}
.ri:last-child{border-bottom:none;}
.rn{width:20px;height:20px;border-radius:50%;background:var(--g);color:#fff;
  font-size:.68rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rbw{flex:1;background:#EEE;border-radius:4px;height:5px;overflow:hidden;}
.rbb{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--g),var(--g2));transition:.5s;}

/* MISC */
.loading{text-align:center;padding:60px;color:#888;font-size:1rem;}
.err{color:var(--r);padding:24px 32px;font-weight:600;}
.empty{text-align:center;padding:24px;color:#bbb;font-size:.87rem;}
.foot{text-align:center;padding:16px;color:#aaa;font-size:.72rem;margin:0 32px 20px;
  background:rgba(255,255,255,.7);border-radius:10px;backdrop-filter:blur(4px);}
@media(max-width:1100px){
  .mg4top{grid-template-columns:1fr 1fr;}
}
@media(max-width:700px){
  .hero{padding:20px 18px 60px;}.hero h1{font-size:1.5rem;}
  .cw,.sec,.alert,.tw,.foot{margin-left:12px;margin-right:12px;}
  .ig{grid-template-columns:1fr;}.ic.full{grid-column:1;}
  .mgw{padding:8px 12px 12px;}
  .cards{gap:8px;}.card{min-width:110px;padding:14px 14px;}
  .card .val{font-size:1.25rem;}
  .ebar{flex-direction:column;align-items:stretch;}
  .ebar input,.ebar select{width:100% !important;}
  th,td{padding:8px 10px;font-size:.79rem;}
}
@media(max-width:420px){
  .mg4top{grid-template-columns:1fr;}
}
</style>
</head>
<body>
<div id="app"><div class="loading">⏳ Loading Badminton data...</div></div>
<script>
let D=null, chartMonthly=null, chartType=null, chartTrend=null, chartCat=null, chartPayers=null, expFilter='2y', insMonthFilter='all';

const twoYearsAgo=()=>{const d=new Date();d.setFullYear(d.getFullYear()-2);return d.toISOString().slice(0,10);};

function categorize(desc){
  const d=(desc||'').toLowerCase();
  if(d.includes('shuttle')||d.includes('rsl')) return 'Shuttle Expenses';
  if(d.includes('court')||d.includes('sentosa')) return 'Court Fees';
  if(d.includes('water')) return 'Water/Drinks';
  if(d.includes('work')||d.includes('cash')||d.includes('payment')||
     d.includes('fee')||d.includes('advance')||d.includes('settle')) return 'Payment/Settlement';
  return 'Others';
}

function mgSection(members,cls,title){
  if(!members.length) return '';
  const rows=members.map(m=>{
    const ini=(m.name.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2));
    const abs=Math.abs(m.balance);
    const amt=m.balance===0?'—':'MYR '+abs.toFixed(2);
    const youTag=m.isMe?'<span class="me-tag">You</span>':'';
    return '<div class="mgr'+(m.isMe?' mer':'')+'">'
      +'<div class="avs '+cls+'">'+ini+'</div>'
      +'<div class="mgrn">'+m.name+youTag+'</div>'
      +'<div class="mgra '+cls+'">'+amt+'</div>'
      +'</div>';
  }).join('');
  return '<div class="mgg">'
    +'<div class="mggh '+cls+'">'+title+'<span class="mggbadge">'+members.length+'</span></div>'
    +rows+'</div>';
}

// ── RENDER ──
function renderApp(d){
  D=d;
  const ts=new Date(d.generatedAt).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'});
  // credit = member IS owed money (balance < 0); owes = member owes money (balance > 0)
  // Normalize: |balance| < 1 → treated as 0 (rounding noise)
  const members=d.members.map(m=>({...m,balance:Math.abs(m.balance)<1?0:m.balance}));
  const highCr  =members.filter(m=>m.balance<0&&Math.abs(m.balance)>50).sort((a,b)=>a.balance-b.balance);   // RED, highest credit first
  const midCr   =members.filter(m=>m.balance<0&&Math.abs(m.balance)>=20&&Math.abs(m.balance)<=50).sort((a,b)=>a.balance-b.balance); // YELLOW
  const lowCr   =members.filter(m=>m.balance<0&&Math.abs(m.balance)<20).sort((a,b)=>a.balance-b.balance);   // BLUE
  const settledM=members.filter(m=>m.balance===0);                                                           // BLUE
  const owesM   =members.filter(m=>m.balance>0).sort((a,b)=>b.balance-a.balance);                           // GREEN, highest owes first

  const alertHtml=highCr.length>0
    ?'<div class="alert" style="background:linear-gradient(135deg,#FFEBEE,#FFCDD2);border-left-color:#EF5350;color:#B71C1C">🔴 <strong>'+highCr.length+' member'+(highCr.length>1?'s':'')+' are owed more than MYR 50</strong> — please pay them back!</div>'
    :'';

  // 4-col: active groups side-by-side; settled alone at bottom
  const grouped=
    '<div class="mg4top">'
      +mgSection(highCr,'rd','🔴 Credit > MYR 50')
      +mgSection(owesM,'gn','💚 Owes Group')
      +mgSection(midCr,'yw','🟡 Credit 20–50')
      +mgSection(lowCr,'bl','🔵 Credit < MYR 20')
    +'</div>'
    +mgSection(settledM,'bl','✅ Settled');

  // Build member dropdown — all unique names from payers + participants
  const allNames=new Set();
  d.expenses.forEach(e=>{
    if(e.payer) allNames.add(e.payer);
    (e.participants||[]).forEach(p=>allNames.add(p.name));
  });
  const payerOpts=[...allNames].sort().map(p=>'<option value="'+p+'">'+p+'</option>').join('');

  // Build month options for insights
  const monthSet=[...new Set(d.expenses.map(e=>e.date.slice(0,7)))].sort().reverse();
  const monthOpts=monthSet.slice(0,24).map(m=>{
    const lb=new Date(m+'-01').toLocaleString('en',{month:'long',year:'numeric'});
    return '<option value="'+m+'">'+lb+'</option>';
  }).join('');

  document.getElementById('app').innerHTML=
  '<div class="hero"><div class="hero-in">'
    +'<div><h1>🏸 '+d.groupName+'</h1><div class="sub">Logged in as <strong>'+d.me+'</strong></div></div>'
    +'<div style="text-align:right"><div class="vbadge">v'+d.version+'</div>'
    +'<div class="hero-ts">'+ts+'</div>'
    +'<button class="rbtn" onclick="reloadData()">🔄 Refresh</button></div>'
  +'</div></div>'

  +'<div class="cw"><div class="cards">'
    +'<div class="card fl"><div class="lbl">🔴 Owed &gt; MYR 50</div><div class="val">'+highCr.length+'</div><div class="hint">Pay back urgently</div></div>'
    +'<div class="card db"><div class="lbl">🟡 Owed MYR 20–50</div><div class="val">'+midCr.length+'</div><div class="hint">MYR '+d.totalCredit.toFixed(2)+' total owed</div></div>'
    +'<div class="card ok"><div class="lbl">✅ Owes Group</div><div class="val">'+owesM.length+'</div><div class="hint">MYR '+d.totalDebt.toFixed(2)+' to collect</div></div>'
    +'<div class="card cr"><div class="lbl">Settled</div><div class="val">'+settledM.length+'</div><div class="hint">members</div></div>'
    +'<div class="card"><div class="lbl">Transactions</div><div class="val">'+d.expenses.length+'</div><div class="hint">3 years</div></div>'
  +'</div></div>'

  +'<div class="tw">'
    +'<button class="tab active" onclick="switchTab(\\'members\\',this)">👥 Members</button>'
    +'<button class="tab" onclick="switchTab(\\'expenses\\',this)">💳 Expenses (2 Yrs)</button>'
    +'<button class="tab" onclick="switchTab(\\'insights\\',this)">📊 Insights</button>'
  +'</div>'

  +'<div id="tab-members" class="tc active">'
    +alertHtml
    +'<div class="sec"><div class="sh">'
    +'<div style="display:flex;align-items:center;gap:10px;min-width:0">'
    +'<span class="st">Member Balances</span>'
    +'<span style="font-size:.72rem;color:#aaa;white-space:nowrap">🕐 '+ts+'</span>'
    +'</div>'
    +'<span class="sc" style="flex-shrink:0">'+members.length+' members</span></div>'
    +'<div class="mgw">'+grouped+'</div></div></div>'

  +'<div id="tab-expenses" class="tc">'
    +'<div class="sec"><div class="sh"><span class="st">All Transactions</span>'
    +'<div style="display:flex;align-items:center;gap:8px">'
    +'<span class="sc" id="exp-count"></span>'
    +'<span id="cache-badge" style="display:none;font-size:.71rem;background:#E3F2FD;color:#1565C0;padding:2px 10px;border-radius:20px;font-weight:700"></span>'
    +'</div></div>'
    +'<div class="ebar">'
      +'<input type="text" id="exp-search" placeholder="🔍 Search..." oninput="filterExp()">'
      +'<select id="exp-member" onchange="filterExp()"><option value="">All members</option>'+payerOpts+'</select>'
      +'<button class="fb" id="f-2y" onclick="setF(\\'2y\\')">Last 2 Years</button>'
      +'<button class="fb" id="f-all" onclick="setF(\\'all\\')">All time</button>'
      +'<button class="fb" id="f-expense" onclick="setF(\\'expense\\')">Expenses</button>'
      +'<button class="fb" id="f-payment" onclick="setF(\\'payment\\')">Payments</button>'
    +'</div>'
    +'<div style="overflow-x:auto"><table>'
      +'<thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Total</th><th>Paid By</th><th>Participants</th><th>My Share</th><th>Net</th></tr></thead>'
      +'<tbody id="exp-tbody"></tbody>'
    +'</table></div></div></div>'

  +'<div id="tab-insights" class="tc">'
    +'<div class="sec"><div class="sh"><span class="st">📊 Insights & Trends</span><span class="sc" id="ins-label">All months</span></div>'
    +'<div style="padding:12px 20px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
      +'<span style="font-size:.78rem;font-weight:700;color:#888;margin-right:4px">FILTER:</span>'
      +'<div id="ins-months" style="display:flex;gap:5px;flex-wrap:wrap"></div>'
    +'</div>'
    +'<div class="ig">'
      +'<div class="ic"><div class="it">🥧 Spend by Category</div><canvas id="cat-chart" height="160"></canvas></div>'
      +'<div class="ic"><div class="it">📈 Category Trends (Last 12 Months)</div><canvas id="trend-chart" height="160"></canvas></div>'
      +'<div class="ic full"><div class="it">📅 Monthly Total Spend</div>'
        +'<canvas id="monthly-chart" height="80"></canvas></div>'
      +'<div class="ic full"><div class="it" id="items-title">Expenses by Category</div>'
        +'<div id="items-table"></div></div>'
      +'<div class="ic"><div class="it">🔴 Owed to Members</div><div id="top-cred"></div></div>'
      +'<div class="ic"><div class="it">📈 Summary Stats</div><div id="stats"></div></div>'
      +'<div class="ic"><div class="it">💳 Top Payers</div><div id="payers-list"></div></div>'
      +'<div class="ic"><div class="it">📅 Busiest Months</div><div id="busy"></div></div>'
    +'</div></div></div>'

  +'<div class="foot">Splitwise Dashboard v'+d.version+' · Built '+d.buildDate+' · Updated '+ts+'</div>';

  setF('2y');
}

// ── EXPENSES ──
function setF(f){
  expFilter=f;
  ['2y','all','expense','payment'].forEach(x=>{
    const el=document.getElementById('f-'+x); if(el) el.classList.toggle('on',x===f);
  });
  filterExp();
}
function filterExp(){
  if(!D) return;
  const tbody=document.getElementById('exp-tbody');
  const countEl=document.getElementById('exp-count');
  if(!tbody) return;
  const search=(document.getElementById('exp-search')?.value||'').toLowerCase();
  const member=(document.getElementById('exp-member')?.value||'');
  const cut2y=twoYearsAgo();
  const filtered=D.expenses.filter(e=>{
    if(expFilter==='2y'&&e.date<cut2y) return false;
    if(expFilter==='expense'&&e.isPayment) return false;
    if(expFilter==='payment'&&!e.isPayment) return false;
    if(member){
      const inParts=(e.participants||[]).some(p=>p.name===member);
      const isPayer=e.payer===member;
      if(!inParts&&!isPayer) return false;
    }
    if(search&&!e.desc.toLowerCase().includes(search)&&!e.payer.toLowerCase().includes(search)) return false;
    return true;
  });
  if(countEl) countEl.textContent=filtered.length+' transactions';
  tbody.innerHTML=filtered.length===0
    ?'<tr><td colspan="8" class="empty">No transactions found</td></tr>'
    :filtered.map(e=>{
      const t=e.isPayment?'<span class="bdg pay">💸 Payment</span>':'<span class="bdg exp">🧾 Expense</span>';
      const nc=e.myNet>=0?'np':'nn', ns=e.myNet>=0?'+':'';
      const parts=(e.participants||[]).map(p=>{
        const hi=member&&p.name===member;
        return '<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 6px;border-radius:10px;font-size:.72rem;'
          +(hi?'background:#1B6C3E;color:#fff;font-weight:700':'background:#F0F0F0;color:#555')
          +'">'+p.name+' <b>'+p.owed.toFixed(2)+'</b></span>';
      }).join('');
      const share=e.myOwed>0
        ?'<span style="color:#C62828;font-weight:700">'+e.currency+' '+e.myOwed.toFixed(2)+'</span>'
        :(e.isPayment?'<span style="color:#bbb">—</span>':'<span style="color:#bbb">0.00</span>');
      return '<tr><td style="color:#999;white-space:nowrap">'+e.date+'</td><td>'+t+'</td>'
        +'<td style="font-weight:500">'+e.desc+'</td>'
        +'<td style="white-space:nowrap">'+e.currency+' '+e.cost.toFixed(2)+'</td>'
        +'<td style="color:#666">'+e.payer+'</td>'
        +'<td style="max-width:260px">'+parts+'</td>'
        +'<td style="white-space:nowrap">'+share+'</td>'
        +'<td class="'+nc+'" style="white-space:nowrap">'+ns+e.myNet.toFixed(2)+'</td></tr>';
    }).join('');
}

// ── INSIGHTS ──
function buildMonthButtons(){
  const bar=document.getElementById('ins-months'); if(!bar||!D) return;
  const allMonths=[...new Set(D.expenses.filter(e=>!e.isPayment).map(e=>e.date.slice(0,7)))].sort().reverse();
  bar.innerHTML='<button class="mfb '+(insMonthFilter==='all'?'on':'')+'" onclick="setInsMonth(\\'all\\')">All</button>'
    +allMonths.slice(0,24).map(m=>{
      const lb=new Date(m+'-01').toLocaleString('en',{month:'short',year:'2-digit'});
      return '<button class="mfb '+(insMonthFilter===m?'on':'')+'" onclick="setInsMonth(\\''+m+'\\')">'+lb+'</button>';
    }).join('');
}
function setInsMonth(m){insMonthFilter=m;buildInsights();}

function buildInsights(){
  if(!D) return;
  buildMonthButtons();
  const mo=insMonthFilter;
  const lbl=document.getElementById('ins-label');
  if(lbl) lbl.textContent=mo==='all'?'All months':'Month: '+new Date(mo+'-01').toLocaleString('en',{month:'long',year:'numeric'});

  const expenses=D.expenses.filter(e=>!e.isPayment);
  const filtered=mo==='all'?expenses:expenses.filter(e=>e.date.startsWith(mo));

  // ── Category pie chart (Payment/Settlement excluded) ──
  const catColorMap={'Shuttle Expenses':'#E53935','Court Fees':'#1E88E5','Water/Drinks':'#00ACC1','Others':'#43A047'};
  const catBuckets={};
  filtered.forEach(e=>{
    const c=categorize(e.desc);
    if(c!=='Payment/Settlement') catBuckets[c]=(catBuckets[c]||0)+e.cost;
  });
  const catKeys=Object.keys(catBuckets).sort((a,b)=>catBuckets[b]-catBuckets[a]);
  const fallback=['#FB8C00','#8E24AA','#6D4C41','#7B1FA2'];
  const catColorArr=catKeys.map((k,i)=>catColorMap[k]||(fallback[i]||'#999'));
  const catTotal=catKeys.reduce((s,k)=>s+catBuckets[k],0);
  if(chartCat){chartCat.destroy();chartCat=null;}
  const cCtx=document.getElementById('cat-chart')?.getContext('2d');
  if(cCtx) chartCat=new Chart(cCtx,{type:'doughnut',
    data:{labels:catKeys,datasets:[{data:catKeys.map(k=>catBuckets[k]),backgroundColor:catColorArr,borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:6}},
      tooltip:{callbacks:{label:ctx=>' '+ctx.label+': MYR '+ctx.raw.toFixed(2)+' ('+(catTotal>0?(ctx.raw/catTotal*100).toFixed(1):0)+'%)'}}}}});

  // ── Top payers ──
  const payerTotals={};
  filtered.forEach(e=>{if(e.payer) payerTotals[e.payer]=(payerTotals[e.payer]||0)+e.cost;});
  const topPayers=Object.entries(payerTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxPay=topPayers[0]?.[1]||1;
  const pl=document.getElementById('payers-list');
  if(pl) pl.innerHTML=topPayers.length===0?'<div class="empty">No expenses</div>'
    :topPayers.map(([name,amt],i)=>'<div class="ri">'
      +'<div class="rn">'+(i+1)+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+name+'</div>'
      +'<div class="rbw"><div class="rbb" style="width:'+(amt/maxPay*100).toFixed(0)+'%;background:linear-gradient(90deg,#1565C0,#42A5F5)"></div></div></div>'
      +'<div style="font-weight:700;color:var(--b);font-size:.82rem;white-space:nowrap;margin-left:6px">MYR '+amt.toFixed(2)+'</div>'
      +'</div>').join('');

  // ── Monthly bar chart ──
  const buckets={};
  const now=new Date();
  if(mo==='all'){
    for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);buckets[d.toISOString().slice(0,7)]=0;}
    expenses.forEach(e=>{if(buckets[e.date.slice(0,7)]!==undefined) buckets[e.date.slice(0,7)]+=e.cost;});
  } else {
    filtered.forEach(e=>{buckets[e.date]=(buckets[e.date]||0)+e.cost;});
  }
  const bKeys=Object.keys(buckets).sort();
  const bLabels=bKeys.map(k=>mo==='all'?new Date(k+'-01').toLocaleString('en',{month:'short',year:'2-digit'}):k.slice(5));
  if(chartMonthly){chartMonthly.destroy();chartMonthly=null;}
  const mCtx=document.getElementById('monthly-chart')?.getContext('2d');
  if(mCtx) chartMonthly=new Chart(mCtx,{type:'bar',
    data:{labels:bLabels,datasets:[{label:'MYR',data:bKeys.map(k=>buckets[k]),
      backgroundColor:'rgba(27,108,62,.75)',borderColor:'rgba(27,108,62,1)',borderWidth:1.5,borderRadius:5}]},
    options:{responsive:true,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>'MYR '+v.toFixed(0)}}}}});

  // ── Category trend line chart (Payment/Settlement excluded) ──
  const catNames=['Shuttle Expenses','Court Fees','Water/Drinks','Others'];
  const last12=[];
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);last12.push(d.toISOString().slice(0,7));}
  const palette=['#E53935','#1E88E5','#00ACC1','#43A047'];
  const trendDS=catNames.map((cat,i)=>({
    label:cat,
    data:last12.map(m=>expenses.filter(e=>categorize(e.desc)===cat&&e.date.startsWith(m)).reduce((s,e)=>s+e.cost,0)),
    borderColor:palette[i],backgroundColor:palette[i]+'22',
    tension:0.4,fill:false,pointRadius:4,pointHoverRadius:6,borderWidth:2.5
  }));
  if(chartTrend){chartTrend.destroy();chartTrend=null;}
  const tCtx2=document.getElementById('trend-chart')?.getContext('2d');
  if(tCtx2) chartTrend=new Chart(tCtx2,{type:'line',
    data:{labels:last12.map(m=>new Date(m+'-01').toLocaleString('en',{month:'short',year:'2-digit'})),datasets:trendDS},
    options:{responsive:true,interaction:{mode:'index',intersect:false},
      plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>'MYR'+v.toFixed(0)}}}}});

  // ── Item split by category ──
  const title=document.getElementById('items-title');
  const tbl=document.getElementById('items-table');
  if(title) title.textContent=(mo==='all'?'All time':'Month: '+new Date(mo+'-01').toLocaleString('en',{month:'long',year:'numeric'}))+' — Expenses by Category';
  if(tbl){
    const catGroup={};
    filtered.forEach(e=>{
      const cat=categorize(e.desc);
      if(!catGroup[cat]) catGroup[cat]={total:0,items:{}};
      catGroup[cat].total+=e.cost;
      catGroup[cat].items[e.desc]=(catGroup[cat].items[e.desc]||0)+e.cost;
    });
    const cats=Object.entries(catGroup).sort((a,b)=>b[1].total-a[1].total);
    const grandTotal=cats.reduce((s,[,v])=>s+v.total,0);
    tbl.innerHTML=cats.length===0?'<div class="empty">No expenses for this period</div>'
      :'<table><thead><tr><th>Category</th><th>Items</th><th>Total (MYR)</th><th>Share</th></tr></thead><tbody>'
      +cats.map(([cat,{total,items}])=>{
        const pct=(grandTotal>0?(total/grandTotal*100).toFixed(1):0);
        const subItems=Object.entries(items).sort((a,b)=>b[1]-a[1]).slice(0,6)
          .map(([d,v])=>'<span style="display:inline-block;margin:1px 3px 1px 0;padding:1px 7px;border-radius:10px;font-size:.72rem;background:#F0F0F0;color:#555">'+d+' <b>'+v.toFixed(2)+'</b></span>').join('');
        return '<tr>'
          +'<td style="font-weight:700;font-size:.9rem;white-space:nowrap">'+cat+'</td>'
          +'<td style="max-width:300px">'+subItems+'</td>'
          +'<td style="font-weight:700;color:var(--g);white-space:nowrap">'+total.toFixed(2)+'</td>'
          +'<td style="min-width:120px"><div style="display:flex;align-items:center;gap:6px">'
          +'<div style="flex:1;background:#EEE;border-radius:3px;height:6px;overflow:hidden">'
          +'<div style="width:'+pct+'%;height:100%;background:var(--g);border-radius:3px"></div></div>'
          +'<span style="font-size:.75rem;color:#888;width:36px">'+pct+'%</span>'
          +'</div></td></tr>';
      }).join('')+'</tbody></table>';
  }

  // ── Top owed members ──
  const topCr=D.members.filter(m=>m.balance<0).sort((a,b)=>a.balance-b.balance).slice(0,5);
  const maxCr=Math.abs(topCr[0]?.balance)||1;
  document.getElementById('top-cred').innerHTML=topCr.length===0
    ?'<div class="empty">No outstanding amounts 🎉</div>'
    :topCr.map((m,i)=>'<div class="ri">'
      +'<div class="rn">'+(i+1)+'</div>'
      +'<div style="flex:1"><div style="font-weight:600;font-size:.85rem">'+m.name+'</div>'
      +'<div class="rbw"><div class="rbb" style="width:'+(Math.abs(m.balance)/maxCr*100).toFixed(0)+'%"></div></div></div>'
      +'<div style="font-weight:700;color:var(--r);font-size:.85rem">MYR '+Math.abs(m.balance).toFixed(2)+'</div>'
      +'</div>').join('');

  // ── Summary stats ──
  const totalSpend=expenses.reduce((s,e)=>s+e.cost,0);
  const numPay=D.expenses.filter(e=>e.isPayment).length;
  const largest=[...expenses].sort((a,b)=>b.cost-a.cost)[0];
  document.getElementById('stats').innerHTML=
    '<div class="sr"><span>Total group spend (3yr)</span><span class="sv">MYR '+totalSpend.toFixed(2)+'</span></div>'
    +'<div class="sr"><span>Avg monthly (12mo)</span><span class="sv">MYR '+(totalSpend/36).toFixed(2)+'</span></div>'
    +'<div class="sr"><span>Filtered transactions</span><span class="sv">'+filtered.length+'</span></div>'
    +'<div class="sr"><span>Payments made</span><span class="sv">'+numPay+'</span></div>'
    +'<div class="sr"><span>Biggest single expense</span><span class="sv">MYR '+(largest?.cost||0).toFixed(2)+'</span></div>'
    +'<div class="sr"><span>Members settled</span><span class="sv">'+D.members.filter(m=>m.balance===0).length+'/'+D.members.length+'</span></div>';

  // ── Busiest months ──
  const bm={};
  D.expenses.forEach(e=>{const m=e.date.slice(0,7);bm[m]=(bm[m]||0)+1;});
  const bs=Object.entries(bm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const mc2=bs[0]?.[1]||1;
  document.getElementById('busy').innerHTML=bs.map(([m,c],i)=>{
    const lb=new Date(m+'-01').toLocaleString('en',{month:'short',year:'numeric'});
    return '<div class="ri"><div class="rn">'+(i+1)+'</div>'
      +'<div style="flex:1"><div style="font-weight:600;font-size:.85rem">'+lb+'</div>'
      +'<div class="rbw"><div class="rbb" style="width:'+(c/mc2*100).toFixed(0)+'%"></div></div></div>'
      +'<div style="font-weight:700;color:var(--b);font-size:.85rem">'+c+' txns</div></div>';
  }).join('');
}

function switchTab(n,btn){
  document.querySelectorAll('.tc').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+n).classList.add('active'); btn.classList.add('active');
  if(n==='expenses') filterExp();
  if(n==='insights') buildInsights();
}

async function reloadData(){
  D=null;
  document.getElementById('app').innerHTML='<div class="loading">⏳ Refreshing...</div>';
  await loadData();
}

async function loadData(){
  // ── Phase 1: members & balances (fast ~2s) ──
  document.getElementById('app').innerHTML='<div class="loading">⏳ Loading member balances...</div>';
  let sum;
  try{
    const r=await fetch('/api/summary'); sum=await r.json();
  }catch(e){
    document.getElementById('app').innerHTML='<div class="err">❌ Network error: '+e.message+'<br><br><button onclick="loadData()" style="padding:8px 18px;background:#1B6C3E;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem">🔄 Retry</button></div>';
    return;
  }
  if(sum.error){
    document.getElementById('app').innerHTML='<div class="err">❌ '+sum.error+'<br><br><button onclick="loadData()" style="padding:8px 18px;background:#1B6C3E;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem">🔄 Retry</button></div>';
    return;
  }
  D={...sum, expenses:[], expensesLoaded:false};
  renderApp(D);

  // ── Phase 2: expenses (slow, background) ──
  const expTbody=document.getElementById('exp-tbody');
  if(expTbody) expTbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:#aaa">⏳ Loading expense history...</td></tr>';
  try{
    const r2=await fetch('/api/expenses?groupId='+sum.groupId+'&myId='+sum.myId);
    const expData=await r2.json();
    if(!expData.error && expData.expenses){
      D.expenses=expData.expenses;
      D.expensesLoaded=true;
      // Show cache badge
      const badge=document.getElementById('cache-badge');
      if(badge&&expData.fromCache){
        const cd=new Date(expData.cacheDate).toLocaleString('en-MY',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        badge.textContent='📦 Cache '+cd+(expData.deltaCount>0?' + '+expData.deltaCount+' new':'');
        badge.style.display='inline';
      }
      // Rebuild member dropdown with all participants
      const allN=new Set();
      D.expenses.forEach(e=>{
        if(e.payer) allN.add(e.payer);
        (e.participants||[]).forEach(p=>allN.add(p.name));
      });
      const sel=document.getElementById('exp-member');
      if(sel) sel.innerHTML='<option value="">All members</option>'+[...allN].sort().map(p=>'<option value="'+p+'">'+p+'</option>').join('');
      filterExp();
    }
  }catch(e){ /* expenses failed silently — member data still shown */ }
}
loadData();
<\/script>
</body>
</html>`;
}

// ── Worker entry ──────────────────────────────────────────────────────────────
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET"};
    if(request.method==="OPTIONS") return new Response(null,{headers:cors});
    if(url.pathname==="/api/summary"){
      try{
        const data=await getSummary(env);
        return new Response(JSON.stringify(data),{headers:{...cors,"Content-Type":"application/json"}});
      }catch(e){
        return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
      }
    }
    if(url.pathname==="/api/expenses"){
      try{
        const groupId=url.searchParams.get("groupId")||"";
        const myId=url.searchParams.get("myId")||"";
        const data=await getExpenses(env,groupId,myId);
        return new Response(JSON.stringify(data),{headers:{...cors,"Content-Type":"application/json"}});
      }catch(e){
        return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
      }
    }
    if(url.pathname==="/"||url.pathname==="/dashboard")
      return new Response(renderHTML(),{headers:{"Content-Type":"text/html;charset=UTF-8"}});
    return new Response("Not found",{status:404});
  }
};
