/**
 * Splitwise Badminton Dashboard — Cloudflare Worker v3.0.0
 * CSV-mode: reads data entirely from cache.json (no Splitwise API required)
 */

const VERSION    = "3.0.0";
const BUILD_DATE = "2026-09-25";

async function loadCache(env) {
  const cacheUrl=(env.CACHE_URL||"").trim();
  if(!cacheUrl) return {error:"CACHE_URL is not set in wrangler.toml."};
  let resp;
  try{ resp=await fetch(cacheUrl+"?cb="+Math.floor(Date.now()/300000)); }
  catch(e){ return {error:"Failed to fetch cache: "+e.message}; }
  if(!resp.ok) return {error:`Cache fetch failed: HTTP ${resp.status}`};
  let c;
  try{ c=await resp.json(); } catch(e){ return {error:"Cache JSON parse error: "+e.message}; }
  if(!c.expenses||!Array.isArray(c.expenses)) return {error:"Cache is empty or malformed."};
  return c;
}

async function getSummary(env) {
  const flagAbove=parseFloat(env.FLAG_ABOVE||"50");
  const c=await loadCache(env);
  if(c.error) return c;
  const members=(c.members||[]).map(m=>({
    ...m,
    isMe:!!(env.MY_NAME&&m.name.toLowerCase().includes((env.MY_NAME||"").toLowerCase())),
    flagged:m.balance>0&&m.balance>=flagAbove
  })).sort((a,b)=>a.balance-b.balance);
  const owedM=members.filter(m=>m.balance<0);
  const owesM=members.filter(m=>m.balance>0);
  const me=members.find(m=>m.isMe);
  return {
    version:VERSION, buildDate:BUILD_DATE,
    me:me?me.name:(env.MY_NAME||""),
    myId:"", groupId:"",
    groupName:c.groupName||(env.GROUP_NAME||"Badminton Expense"),
    flagAbove,
    totalCredit:owedM.reduce((s,m)=>s+Math.abs(m.balance),0),
    totalDebt:owesM.reduce((s,m)=>s+m.balance,0),
    members, generatedAt:c.generatedAt||new Date().toISOString(),
    source:"csv", cacheDate:c.generatedAt||null
  };
}

async function getExpenses(env) {
  const c=await loadCache(env);
  if(c.error) return c;
  return {expenses:c.expenses,fromCache:true,cacheDate:c.generatedAt||null,cacheCount:c.expenses.length,deltaCount:0,source:"csv"};
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
body{font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;background:transparent;position:relative;}
body::before{content:'';position:fixed;inset:0;z-index:-1;
  background:url("${bgUrl}") center/cover no-repeat;
  opacity:0.75;pointer-events:none;}

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
.card{background:rgba(255,255,255,0.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:14px;padding:18px 22px;flex:1;min-width:148px;
  box-shadow:var(--sh);border-top:3px solid #eee;}
.card.cr{border-top-color:var(--b)}.card.db{border-top-color:var(--o)}
.card.fl{border-top-color:var(--r)}.card.ok{border-top-color:var(--g)}
.card .lbl{font-size:.71rem;color:#555;text-transform:uppercase;letter-spacing:.06em;font-weight:600;}
.card .val{font-size:1.6rem;font-weight:800;margin-top:5px;line-height:1;}
.card .hint{font-size:.74rem;color:#777;margin-top:3px;}
.card.cr .val{color:var(--b)}.card.db .val{color:var(--o)}
.card.fl .val{color:var(--r)}.card.ok .val{color:var(--g)}

/* MONTH STRIP */

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
.sec{background:rgba(255,255,255,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);margin:0 32px 20px;border-radius:0 14px 14px 14px;box-shadow:var(--sh);overflow:hidden;}
.sh{padding:15px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F0F0F0;}
.st{font-size:.95rem;font-weight:700;color:#333;}
.sc{font-size:.77rem;color:#aaa;background:#F5F5F5;padding:3px 10px;border-radius:20px;}

/* MEMBER GROUPS — compact 4-col layout */
.mgw{padding:10px 20px 14px;}
.mgg{border-radius:10px;overflow:hidden;border:1.5px solid #EEE;margin-bottom:8px;box-shadow:0 2px 6px rgba(0,0,0,.04);}
.mgg:last-child{margin-bottom:0;}
.mggh{padding:7px 12px;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:6px;}
.mggbadge{margin-left:auto;padding:1px 7px;border-radius:20px;font-size:.67rem;font-weight:700;background:rgba(0,0,0,.12);}
.mggtot{font-size:.67rem;font-weight:700;opacity:.75;white-space:nowrap;}
.mgcbtn{background:none;border:none;cursor:pointer;font-size:.72rem;padding:0 3px;line-height:1;color:inherit;opacity:.65;}
.mgcbtn:hover{opacity:1;}
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
.ic{background:rgba(249,250,251,0.50);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border-radius:12px;padding:16px;border:1px solid #EEEEEE;overflow:hidden;min-width:0;}
.ic.full{grid-column:1/-1;}canvas{max-width:100%;}
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

/* MEMBER SPEND */
.mem-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
.mem-stats .card{min-width:0;}
.mem-charts{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.mem-settle{margin-top:16px;padding-top:14px;border-top:1px solid #EEEEEE;}
.mem-settle-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;
  margin-bottom:8px;font-size:.82rem;font-weight:700;color:#555;}
.mem-settle-head>span:last-child{font-size:.78rem;color:#8E24AA;font-weight:700;white-space:nowrap;}
.msr{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #F5F5F5;font-size:.82rem;}
.msr:last-child{border-bottom:none;}
.msr-date{color:#999;white-space:nowrap;min-width:66px;}
.msr-desc{flex:1;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.msr-amt{font-weight:700;white-space:nowrap;}

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
  .cw{padding:0 8px;}
  .cw,.sec,.alert,.tw,.foot{margin-left:10px;margin-right:10px;}
  
  .ig{grid-template-columns:1fr;overflow-x:hidden;padding:10px 12px;}.ic.full{grid-column:1;}
  .mgw{padding:8px 10px 12px;}
  .cards{gap:8px;}.card{min-width:100px;padding:12px 12px;}
  .card .val{font-size:1.15rem;}
  .ebar{flex-direction:column;align-items:stretch;}
  .ebar input,.ebar select{width:100% !important;}
  th,td{padding:6px 8px;font-size:.74rem;}
  .tab{padding:7px 12px;font-size:.80rem;}
  .tw{padding:14px 10px 0;gap:3px;}
  .mggh{font-size:.65rem;padding:6px 10px;gap:4px;}
  .mggtot{font-size:.62rem;}
  .mgrn{font-size:.78rem;}
  .mgra{font-size:.78rem;}
  .ibar{width:100%;}
  .ibar select{width:100%;}
  .mem-stats{grid-template-columns:repeat(2,1fr);gap:8px;}
  .mem-charts{grid-template-columns:1fr;gap:12px;}
}
@media(max-width:420px){
  .mg4top{grid-template-columns:1fr;}
  .mggtot{font-size:.60rem;}
  .tab{padding:6px 9px;font-size:.75rem;}
  th,td{padding:5px 6px;font-size:.70rem;}
  .mem-stats{grid-template-columns:1fr 1fr;}
}
</style>
</head>
<body>
<div id="app"><div class="loading">⏳ Loading Badminton data...</div></div>
<script>
let D=null, chartMonthly=null, chartType=null, chartTrend=null, chartCat=null, chartPayers=null, chartMemberCat=null, expFilter='2y', insMonthFilter='all', memberSpendFilter='';

const twoYearsAgo=()=>{const d=new Date();d.setFullYear(d.getFullYear()-2);return d.toISOString().slice(0,10);};

function categorize(desc){
  const d=(desc||'').toLowerCase();
  // Non-badminton activities tracked in this group — keep separate from real spend categories
  if(d.includes('futsal')||d.includes('cricket')||d.includes('ns7')) return 'Others';
  if(d.includes('shuttle')||d.includes('rsl')) return 'Shuttle Expenses';
  // Known venue/court names, in addition to the generic 'court'/'sentosa' keywords
  if(d.includes('court')||d.includes('sentosa')||d.includes('iwk')||d.includes('sentul')||
     d.includes('lavana')||d.includes('seri alam')||d.includes('tt sports')) return 'Court Fees';
  if(d.includes('water')) return 'Water/Drinks';
  if(d.includes('work')||d.includes('cash')||d.includes('payment')||d.includes('dues')||
     d.includes('tournament')||d.includes('fee')||d.includes('advance')||d.includes('settle')) return 'Payment/Settlement';
  // Fallback: most unlabeled one-off entries turn out to be ad-hoc court bookings
  return 'Court Fees';
}

function mgSection(members,cls,title,opts){
  if(!members.length) return '';
  opts=opts||{};
  const total=members.reduce((s,m)=>s+Math.abs(m.balance),0);
  const totalTag=total>0?'<span class="mggtot">MYR '+total.toFixed(2)+'</span>':'';
  const colBtn=opts.collapsible
    ?'<button class="mgcbtn" onclick="var b=this.parentElement.nextElementSibling;b.style.display=b.style.display===\\'none\\'?\\'\\':\\'none\\';this.textContent=this.textContent===\\'▼\\'?\\'▲\\':\\'▼\\'">▼<\/button>'
    :'';
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
  const bodyStyle=opts.collapsed?'style="display:none"':'';
  return '<div class="mgg">'
    +'<div class="mggh '+cls+'">'+title
    +'<span class="mggbadge">'+members.length+'</span>'
    +totalTag+colBtn+'</div>'
    +'<div class="mgbd" '+bodyStyle+'>'+rows+'</div>'
    +'</div>';
}


// ── RENDER ──
function renderApp(d){
  D=d;
  const ts=new Date(d.generatedAt).toLocaleString('en-MY',{dateStyle:'medium',timeStyle:'short'});
  // owedM = paid for group, owed money back (balance < 0, green)
  // highOwe/midOwe/lowOwe = owe money to the group (balance > 0, red/yellow/blue)
  const members=d.members.map(m=>({...m,balance:Math.abs(m.balance)<1?0:m.balance}));
  const owedM   =members.filter(m=>m.balance<0).sort((a,b)=>a.balance-b.balance);
  const highOwe =members.filter(m=>m.balance>0&&m.balance>50).sort((a,b)=>b.balance-a.balance);
  const midOwe  =members.filter(m=>m.balance>0&&m.balance>=20&&m.balance<=50).sort((a,b)=>b.balance-a.balance);
  const lowOwe  =members.filter(m=>m.balance>0&&m.balance<20).sort((a,b)=>b.balance-a.balance);
  const settledM=members.filter(m=>m.balance===0);

  const alertHtml=highOwe.length>0
    ?'<div class="alert" style="background:linear-gradient(135deg,#FFEBEE,#FFCDD2);border-left-color:#EF5350;color:#B71C1C">🔴 <strong>'+highOwe.length+' member'+(highOwe.length>1?'s':'')+' owe more than MYR 50</strong> — please settle up!</div>'
    :'';

  // 4-col: active groups side-by-side; settled alone at bottom
  const grouped=
    '<div class="mg4top">'
      +mgSection(owedM,'gn','💸 Paid for the Group')
      +mgSection(highOwe,'rd','🔴 Owes > MYR 50')
      +mgSection(midOwe,'yw','🟡 Owes MYR 20–50')
      +mgSection(lowOwe,'bl','🔵 Owes < MYR 20')
    +'</div>'
    +mgSection(settledM,'bl','✅ Settled',{collapsible:true,collapsed:true});

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
    +'<div class="card fl"><div class="lbl">🔴 Owes &gt; MYR 50</div><div class="val">'+highOwe.length+'</div><div class="hint">Settle urgently</div></div>'
    +'<div class="card db"><div class="lbl">🟡 Owes MYR 20–50</div><div class="val">'+midOwe.length+'</div><div class="hint">MYR '+d.totalDebt.toFixed(2)+' pending</div></div>'
    +'<div class="card ok"><div class="lbl">💸 Paid for Group</div><div class="val">'+owedM.length+'</div><div class="hint">MYR '+d.totalCredit.toFixed(2)+' to collect</div></div>'
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
      +'<thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Total</th><th>Paid By</th><th>My Share</th><th>Net</th></tr></thead>'
      +'<tbody id="exp-tbody"></tbody>'
    +'</table></div></div></div>'

  +'<div id="tab-insights" class="tc">'
    +'<div class="sec"><div class="sh"><span class="st">📊 Insights & Trends</span><span class="sc" id="ins-label">All months</span></div>'
    +'<div style="padding:12px 20px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
      +'<span style="font-size:.78rem;font-weight:700;color:#888;margin-right:4px">FILTER:</span>'
      +'<div id="ins-months" style="display:flex;gap:5px;flex-wrap:wrap"></div>'
    +'</div>'
    +'<div class="ig">'
      +'<div class="ic full"><div class="it">👤 Spend by Member <span id="mem-scope" style="font-weight:500;color:#999;font-size:.75rem;text-transform:none;letter-spacing:0"></span></div>'
        +'<div class="ibar"><span style="font-size:.78rem;font-weight:700;color:#888;margin-right:4px">MEMBER:</span>'
        +'<select id="mem-select" onchange="setMemberFilter(this.value)"><option value="">— Select a member —</option></select></div>'
        +'<div id="mem-empty" class="empty">Pick a member above to see how much they have spent.</div>'
        +'<div id="mem-body" style="display:none">'
          +'<div class="mem-stats">'
            +'<div class="card ok"><div class="lbl">Their Share (Spent)</div><div class="val" id="mem-owed" style="font-size:1.2rem"></div></div>'
            +'<div class="card cr"><div class="lbl">Amount Paid</div><div class="val" id="mem-paid" style="font-size:1.2rem"></div></div>'
            +'<div class="card"><div class="lbl">Net Balance</div><div class="val" id="mem-net" style="font-size:1.2rem"></div></div>'
            +'<div class="card"><div class="lbl">Transactions</div><div class="val" id="mem-count" style="font-size:1.2rem"></div></div>'
          +'</div>'
          +'<div class="mem-charts">'
            +'<div style="height:180px;position:relative"><canvas id="mem-cat-chart"></canvas></div>'
            +'<div id="mem-cat-detail"></div>'
          +'</div>'
          +'<div class="mem-settle">'
            +'<div class="mem-settle-head">'
              +'<span>💸 Payments &amp; Settlements <span style="font-weight:500;color:#999;text-transform:none">(kept separate from spend above)</span></span>'
              +'<span id="mem-settle-summary"></span>'
            +'</div>'
            +'<div id="mem-settle-list"></div>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div class="ic"><div class="it">🥧 Spend by Category</div><div style="height:160px;position:relative"><canvas id="cat-chart"></canvas></div><div id="cat-detail" style="margin-top:10px"></div></div>'
      +'<div class="ic"><div class="it">📈 Category Trends (Last 12 Months)</div><div style="height:160px;position:relative"><canvas id="trend-chart"></canvas></div></div>'
      +'<div class="ic full"><div class="it">📅 Monthly Total Spend</div>'
        +'<canvas id="monthly-chart" height="40"></canvas></div>'
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
// Treat "advance"/"settled"/"settlement" entries as Payment type on the Expenses tab,
// even when Splitwise recorded them as a regular expense.
function isPmt(e){
  if(e.isPayment) return true;
  const d=(e.desc||'').toLowerCase();
  return d.includes('advance')||d.includes('settled')||d.includes('settlement');
}
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
    if(expFilter==='expense'&&isPmt(e)) return false;
    if(expFilter==='payment'&&!isPmt(e)) return false;
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
    ?'<tr><td colspan="7" class="empty">No transactions found</td></tr>'
    :filtered.map(e=>{
      const t=isPmt(e)?'<span class="bdg pay">💸 Payment</span>':'<span class="bdg exp">🧾 Expense</span>';
      const nc=e.myNet>=0?'np':'nn', ns=e.myNet>=0?'+':'';
      const share=e.myOwed>0
        ?'<span style="color:#C62828;font-weight:700">'+e.currency+' '+e.myOwed.toFixed(2)+'</span>'
        :(isPmt(e)?'<span style="color:#bbb">—</span>':'<span style="color:#bbb">0.00</span>');
      return '<tr><td style="color:#999;white-space:nowrap">'+e.date+'</td><td>'+t+'</td>'
        +'<td style="font-weight:500">'+e.desc+'</td>'
        +'<td style="white-space:nowrap">'+e.currency+' '+e.cost.toFixed(2)+'</td>'
        +'<td style="color:#666">'+e.payer+'</td>'
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

// ── MEMBER SPEND ──
function populateMemberOptions(){
  const sel=document.getElementById('mem-select'); if(!sel||!D) return;
  const names=new Set();
  D.expenses.forEach(e=>{
    if(e.payer) names.add(e.payer);
    (e.participants||[]).forEach(p=>names.add(p.name));
  });
  const cur=memberSpendFilter;
  sel.innerHTML='<option value="">— Select a member —</option>'
    +[...names].sort().map(n=>'<option value="'+n+'"'+(n===cur?' selected':'')+'>'+n+'</option>').join('');
}
function setMemberFilter(v){ memberSpendFilter=v; renderMemberSpend(); }
function renderMemberSpend(){
  const empty=document.getElementById('mem-empty'), body=document.getElementById('mem-body');
  if(!empty||!body||!D) return;
  if(!memberSpendFilter){ empty.style.display='block'; body.style.display='none'; return; }
  empty.style.display='none'; body.style.display='block';
  const name=memberSpendFilter;
  const mo=insMonthFilter;
  const scopeEl=document.getElementById('mem-scope');
  if(scopeEl) scopeEl.textContent='('+(mo==='all'?'All time':new Date(mo+'-01').toLocaleString('en',{month:'long',year:'numeric'}))+')';

  // Real badminton spend only — excludes Splitwise payment records AND anything categorized as
  // Payment/Settlement (dues, tournament fees, advances, balance settlements). This keeps every
  // number on this card (paid/owed/net/count/chart) scoped to actual spend, so the category
  // slices below always add up to "Their Share (Spent)".
  const pool=D.expenses.filter(e=>!e.isPayment&&(mo==='all'||e.date.startsWith(mo))&&categorize(e.desc)!=='Payment/Settlement');
  const relevant=pool.filter(e=>e.payer===name||(e.participants||[]).some(p=>p.name===name));
  let paid=0, owed=0;
  relevant.forEach(e=>{
    if(e.payer===name) paid+=e.cost;
    const p=(e.participants||[]).find(p=>p.name===name);
    if(p) owed+=p.owed;
  });
  const net=paid-owed;
  const owedEl=document.getElementById('mem-owed'), paidEl=document.getElementById('mem-paid'),
        netEl=document.getElementById('mem-net'), cntEl=document.getElementById('mem-count');
  if(owedEl) owedEl.textContent='MYR '+owed.toFixed(2);
  if(paidEl) paidEl.textContent='MYR '+paid.toFixed(2);
  if(netEl){
    netEl.textContent=(net>=0?'+':'')+'MYR '+net.toFixed(2);
    netEl.style.color=net>=0?'var(--g)':'var(--r)';
  }
  if(cntEl) cntEl.textContent=relevant.length;

  // Category breakdown of this member's share (Payment/Settlement already excluded from the pool above).
  const catBuckets={};
  relevant.forEach(e=>{
    const p=(e.participants||[]).find(p=>p.name===name);
    const amt=p?p.owed:0;
    if(amt<=0) return;
    const c=categorize(e.desc);
    catBuckets[c]=(catBuckets[c]||0)+amt;
  });
  const catColorMap={'Shuttle Expenses':'#E53935','Court Fees':'#1E88E5','Water/Drinks':'#00ACC1','Others':'#43A047','Payment/Settlement':'#8E24AA'};
  const catKeys=Object.keys(catBuckets).sort((a,b)=>catBuckets[b]-catBuckets[a]);
  const catColorArr=catKeys.map(k=>catColorMap[k]||'#999');
  const catTotal=catKeys.reduce((s,k)=>s+catBuckets[k],0);
  if(chartMemberCat){chartMemberCat.destroy();chartMemberCat=null;}
  const mCtx=document.getElementById('mem-cat-chart')?.getContext('2d');
  if(mCtx) chartMemberCat=new Chart(mCtx,{type:'doughnut',
    data:{labels:catKeys,datasets:[{data:catKeys.map(k=>catBuckets[k]),backgroundColor:catColorArr,borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:6}},
      tooltip:{callbacks:{label:ctx=>' '+ctx.label+': MYR '+ctx.raw.toFixed(2)+' ('+(catTotal>0?(ctx.raw/catTotal*100).toFixed(1):0)+'%)'}}}}});
  const detailEl=document.getElementById('mem-cat-detail');
  if(detailEl) detailEl.innerHTML=catKeys.length===0?'<div class="empty">No expense history</div>':catKeys.map((k,i)=>{
    const pct=catTotal>0?(catBuckets[k]/catTotal*100).toFixed(1):0;
    return '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid rgba(0,0,0,.05)">'
      +'<span style="width:10px;height:10px;border-radius:50%;background:'+catColorArr[i]+';flex-shrink:0"></span>'
      +'<span style="flex:1;font-size:.8rem;color:#333">'+k+'</span>'
      +'<span style="font-size:.78rem;font-weight:700;color:#222">MYR '+catBuckets[k].toFixed(2)+'</span>'
      +'<span style="font-size:.72rem;color:#888;min-width:36px;text-align:right">'+pct+'%</span>'
      +'</div>';
  }).join('');

  // Payments & Settlements — shown as their own itemized list, deliberately kept out of the
  // spend totals/chart above (dues, tournament fees, advances, balance settlements, real Splitwise payments).
  const settlePool=D.expenses.filter(e=>(mo==='all'||e.date.startsWith(mo))&&(e.isPayment||categorize(e.desc)==='Payment/Settlement'));
  const settleItems=settlePool.filter(e=>e.payer===name||(e.participants||[]).some(p=>p.name===name));
  let settlePaid=0, settleShare=0;
  settleItems.forEach(e=>{
    if(e.payer===name) settlePaid+=e.cost;
    const p=(e.participants||[]).find(p=>p.name===name);
    if(p) settleShare+=p.owed;
  });
  const settleSummaryEl=document.getElementById('mem-settle-summary');
  if(settleSummaryEl) settleSummaryEl.textContent=settleItems.length===0?'':'Paid MYR '+settlePaid.toFixed(2)+'  ·  Share MYR '+settleShare.toFixed(2);
  const settleListEl=document.getElementById('mem-settle-list');
  if(settleListEl){
    const sorted=[...settleItems].sort((a,b)=>b.date.localeCompare(a.date));
    settleListEl.innerHTML=sorted.length===0?'<div class="empty">No payments or settlements this period</div>'
      :sorted.map(e=>{
        const isPayer=e.payer===name;
        const p=(e.participants||[]).find(p=>p.name===name);
        const amt=isPayer?e.cost:(p?p.owed:0);
        const tag=isPayer?'Paid':'Share';
        const color=isPayer?'#1B6C3E':'#8E24AA';
        return '<div class="msr"><span class="msr-date">'+e.date+'</span>'
          +'<span class="msr-desc">'+e.desc+'</span>'
          +'<span class="msr-amt" style="color:'+color+'">'+tag+' '+e.currency+' '+amt.toFixed(2)+'</span></div>';
      }).join('');
  }
}

function buildInsights(){
  if(!D) return;
  buildMonthButtons();
  populateMemberOptions();
  renderMemberSpend();
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
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:6}},
      tooltip:{callbacks:{label:ctx=>' '+ctx.label+': MYR '+ctx.raw.toFixed(2)+' ('+(catTotal>0?(ctx.raw/catTotal*100).toFixed(1):0)+'%)'}}}}});
  // ── Category detail list ──
  const catDetailEl=document.getElementById('cat-detail');
  if(catDetailEl){
    catDetailEl.innerHTML=catKeys.map((k,i)=>{
      const pct=catTotal>0?(catBuckets[k]/catTotal*100).toFixed(1):0;
      const col=catColorArr[i]||'#999';
      return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.05)">'
        +'<span style="width:10px;height:10px;border-radius:50%;background:'+col+';flex-shrink:0"></span>'
        +'<span style="flex:1;font-size:.75rem;color:#333">'+k+'</span>'
        +'<span style="font-size:.74rem;font-weight:700;color:#222">MYR '+catBuckets[k].toFixed(0)+'</span>'
        +'<span style="font-size:.70rem;color:#888;min-width:36px;text-align:right">'+pct+'%</span>'
        +'</div>';
    }).join('');
  }


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
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
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
  const topCr=D.members.filter(m=>m.balance>0).sort((a,b)=>b.balance-a.balance).slice(0,5);
  const maxCr=(topCr[0]?.balance)||1;
  document.getElementById('top-cred').innerHTML=topCr.length===0
    ?'<div class="empty">Everyone has settled up 🎉</div>'
    :topCr.map((m,i)=>'<div class="ri">'
      +'<div class="rn">'+(i+1)+'</div>'
      +'<div style="flex:1"><div style="font-weight:600;font-size:.85rem">'+m.name+'</div>'
      +'<div class="rbw"><div class="rbb" style="width:'+(m.balance/maxCr*100).toFixed(0)+'%"></div></div></div>'
      +'<div style="font-weight:700;color:var(--r);font-size:.85rem">MYR '+m.balance.toFixed(2)+'</div>'
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
    const r2=await fetch('/api/expenses');
    const expData=await r2.json();
    if(!expData.error && expData.expenses){
      D.expenses=expData.expenses;
      D.expensesLoaded=true;
      // Show cache badge
      const badge=document.getElementById('cache-badge');
      if(badge&&expData.fromCache&&expData.cacheDate){
        const cd=new Date(expData.cacheDate).toLocaleString('en-MY',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        badge.textContent='📂 CSV export · '+cd;
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

function renderUpdateTool(){
return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Badminton Expense — CSV → Dashboard Updater</title>
<style>
  :root{
    --g:#1B6C3E; --g2:#2E9E5B; --r:#C62828; --o:#E65100; --bg:#F0F4F8;
    --card:#ffffff; --text:#222; --muted:#777; --border:#E5E5E5;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#15181c; --card:#1f2328; --text:#eee; --muted:#9aa0a6; --border:#333; }
  }
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:24px 16px;}
  .wrap{max-width:780px;margin:0 auto;}
  h1{font-size:1.4rem;margin-bottom:4px;}
  .sub{color:var(--muted);font-size:.9rem;margin-bottom:20px;}
  .card{background:var(--card);border-radius:14px;padding:22px;margin-bottom:18px;box-shadow:0 2px 10px rgba(0,0,0,0.06);}
  .drop{
    border:2px dashed var(--border);border-radius:12px;padding:36px 20px;text-align:center;
    cursor:pointer;transition:.15s;color:var(--muted);
  }
  .drop.drag{border-color:var(--g);background:rgba(27,108,62,0.06);color:var(--g);}
  .drop input{display:none;}
  button{
    background:var(--g);color:#fff;border:none;border-radius:8px;padding:10px 20px;
    font-size:.92rem;font-weight:600;cursor:pointer;margin-top:10px;
  }
  button:hover{background:var(--g2);}
  button:disabled{background:#999;cursor:not-allowed;}
  button.secondary{background:#555;}
  label{display:block;font-size:.82rem;color:var(--muted);margin:10px 0 4px;}
  input[type=text], input[type=password]{
    width:100%;padding:9px 10px;border:1px solid var(--border);border-radius:8px;
    background:transparent;color:var(--text);font-size:.9rem;
  }
  .stats{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0;}
  .stat{flex:1;min-width:120px;background:rgba(27,108,62,0.07);border-radius:10px;padding:12px 14px;}
  .stat .lbl{font-size:.72rem;text-transform:uppercase;color:var(--muted);letter-spacing:.04em;}
  .stat .val{font-size:1.3rem;font-weight:800;margin-top:2px;}
  table{width:100%;border-collapse:collapse;font-size:.88rem;margin-top:8px;}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--border);}
  th{color:var(--muted);font-weight:600;font-size:.76rem;text-transform:uppercase;}
  .pos{color:var(--r);font-weight:700;}
  .neg{color:#1565C0;font-weight:700;}
  .zero{color:var(--muted);}
  .msg{padding:10px 14px;border-radius:8px;font-size:.88rem;margin-top:10px;}
  .msg.ok{background:rgba(27,108,62,0.12);color:var(--g);}
  .msg.err{background:rgba(198,40,40,0.12);color:var(--r);}
  .hint{font-size:.78rem;color:var(--muted);margin-top:6px;}
  code{background:rgba(127,127,127,0.15);padding:1px 5px;border-radius:4px;font-size:.85em;}
</style>
</head>
<body>
<div class="wrap">
  <h1>🏸 Badminton Expense — CSV → Dashboard Updater</h1>
  <div class="sub">Drag in the Splitwise CSV export, check the preview, then push straight to GitHub. Runs entirely in your browser — nothing is uploaded anywhere except the GitHub push you trigger yourself.</div>
  <div class="sub" style="font-family:monospace;opacity:.6">tool build: 2026-10-20-v4 (payment detection by description substring)</div>

  <div class="card">
    <div class="drop" id="drop">
      📄 Drop the Splitwise CSV export here, or click to choose a file
      <input type="file" id="fileInput" accept=".csv">
    </div>
    <label>Your name (exactly as the CSV column header shows it)</label>
    <input type="text" id="myName" placeholder="e.g. Jijo" value="Jijo">
    <label>Group name (for display only)</label>
    <input type="text" id="groupName" value="Badminton Expense">
    <div id="parseMsg"></div>
  </div>

  <div class="card" id="previewCard" style="display:none">
    <h3>Preview</h3>
    <div class="stats" id="stats"></div>
    <table>
      <thead><tr><th>Member</th><th style="text-align:right">Balance (MYR)</th></tr></thead>
      <tbody id="memberRows"></tbody>
    </table>
    <button id="downloadBtn">⬇ Download cache.json</button>
  </div>

  <div class="card" id="githubCard" style="display:none">
    <h3>Push to GitHub</h3>
    <div class="hint">
      Needs a GitHub Personal Access Token with <code>repo</code> scope (classic) or
      <code>Contents: Read & write</code> (fine-grained), for the repo your
      <code>wrangler.toml</code> <code>CACHE_URL</code> points to.
      The token is kept only in this page's memory — it is never saved,
      logged, or sent anywhere except directly to api.github.com.
    </div>
    <label>GitHub token</label>
    <input type="password" id="ghToken" placeholder="ghp_...">
    <label>Repo (owner/name)</label>
    <input type="text" id="ghRepo" placeholder="jijoisaac-web/Claude_2">
    <label>Path to cache.json in the repo</label>
    <input type="text" id="ghPath" value="Projects/19_Splitwise/cloudflare/data/cache.json">
    <label>Branch</label>
    <input type="text" id="ghBranch" value="main">
    <button id="pushBtn">🚀 Push cache.json to GitHub</button>
    <div id="pushMsg"></div>
  </div>
</div>

<script>
let cacheData = null;

function parseAmount(s){
  if (s === undefined || s === null) return 0;
  s = String(s).trim().replace(/,/g, '');
  if (s === '' || s === '-') return 0;
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

// Minimal CSV parser that handles quoted fields with commas.
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i], n = text[i+1];
    if (inQuotes){
      if (c === '"' && n === '"'){ field += '"'; i++; }
      else if (c === '"'){ inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ','){ row.push(field); field = ''; }
      else if (c === '\\n' || c === '\\r'){
        if (c === '\\r' && n === '\\n') i++;
        row.push(field); field = '';
        if (row.some(x => x.trim() !== '')) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length){ row.push(field); if (row.some(x=>x.trim()!=='')) rows.push(row); }
  return rows;
}

function findHeaderRow(rows){
  for (let i = 0; i < rows.length; i++){
    if (rows[i][0] && rows[i][0].trim().toLowerCase() === 'date') return i;
  }
  throw new Error("Couldn't find a header row starting with 'Date'. Is this a raw Splitwise group CSV export?");
}

function convert(csvText, groupName, myName){
  const rows = parseCSV(csvText);
  const headerIdx = findHeaderRow(rows);
  const header = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);
  const memberNames = header.slice(5).map(h => h.trim());

  if (dataRows.length === 0) throw new Error('No data rows found in CSV.');
  const totalRow = dataRows[dataRows.length - 1];
  const expenseRows = dataRows.slice(0, -1);

  // Sign convention fix: Splitwise's CSV gives (paid - owed), where POSITIVE
  // means they fronted extra money. worker.js / the dashboard expect the
  // opposite (matching Splitwise's own balance API): NEGATIVE = paid extra
  // (good, green), POSITIVE = owes money (flagged, red). Negate to match.
  const balances = {};
  memberNames.forEach((name, i) => {
    const col = 5 + i;
    balances[name] = Math.round(-parseAmount(totalRow[col]) * 100) / 100;
  });

  const members = memberNames.map(name => ({ name, balance: balances[name] }))
    .sort((a,b) => a.balance - b.balance);

  const expenses = [];
  for (const row of expenseRows){
    const date = (row[0] || '').trim();
    if (!date) continue;
    const desc = (row[1] || '').trim();
    const category = (row[2] || '').trim();
    const cost = parseAmount(row[3]);
    const currency = (row[4] || '').trim();
    const perUser = {};
    memberNames.forEach((name, i) => { perUser[name] = parseAmount(row[5+i]); });

    // Match "Payment", "Payment Safwan", "Ramesh K. paid siva", etc. —
    // not just an exact "Payment" description, since real-world entries
    // often append a name or use "paid" phrasing.
    const descL = desc.toLowerCase();
    const isPayment = descL.includes('payment') || category.toLowerCase() === 'payment' || descL.includes(' paid ');
    let payer = '';
    let maxVal = -Infinity;
    for (const [n, v] of Object.entries(perUser)) if (v > maxVal){ maxVal = v; payer = n; }
    if (maxVal <= 0) payer = '';

    const participants = Object.entries(perUser)
      .filter(([,v]) => v < 0)
      .map(([n,v]) => ({ name: n, owed: Math.round(-v*100)/100 }));

    // Always a number (never null) — worker.js calls .toFixed() on this
    // unconditionally, so a blank "Your name" field must still yield 0,
    // not null, or the dashboard's Expenses tab throws and gets stuck.
    const myNet = myName ? Math.round((perUser[myName]||0)*100)/100 : 0;

    // worker.js separately needs myOwed (your SHARE of the cost, not your
    // net). The CSV only gives net = paid - owed, so we derive owed with the
    // standard single-payer assumption: positive net means you paid the
    // FULL cost, so owed = cost - net; otherwise you paid 0, so owed = -net.
    const myRaw = myName ? (perUser[myName]||0) : 0;
    const myOwed = Math.round((myRaw > 0 ? (cost - myRaw) : -myRaw) * 100) / 100;

    expenses.push({
      date, desc, category, cost: Math.round(cost*100)/100, currency,
      isPayment, payer, myNet, myOwed, participants
    });
  }
  expenses.sort((a,b) => b.date.localeCompare(a.date));

  const nonPaymentDates = expenses.filter(e => !e.isPayment).map(e => e.date);
  const lastExpenseDate = nonPaymentDates[0] || (expenses[0] ? expenses[0].date : null);

  return {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    source: 'csv',
    groupName: groupName || '',
    myName: myName || '',
    lastExpenseDate,
    expenseCount: expenses.length,
    members,
    expenses
  };
}

function renderPreview(cache){
  document.getElementById('previewCard').style.display = 'block';
  document.getElementById('githubCard').style.display = 'block';
  const flagged = cache.members.filter(m => m.balance >= 50).length;
  document.getElementById('stats').innerHTML = \`
    <div class="stat"><div class="lbl">Members</div><div class="val">\${cache.members.length}</div></div>
    <div class="stat"><div class="lbl">Expenses</div><div class="val">\${cache.expenseCount}</div></div>
    <div class="stat"><div class="lbl">Last expense</div><div class="val">\${cache.lastExpenseDate || '—'}</div></div>
    <div class="stat"><div class="lbl">Flagged (≥50)</div><div class="val">\${flagged}</div></div>
  \`;
  document.getElementById('memberRows').innerHTML = cache.members.map(m => {
    const cls = m.balance > 0 ? 'pos' : (m.balance < 0 ? 'neg' : 'zero');
    return \`<tr><td>\${m.name}</td><td style="text-align:right" class="\${cls}">\${m.balance.toFixed(2)}</td></tr>\`;
  }).join('');
}

const drop = document.getElementById('drop');
const fileInput = document.getElementById('fileInput');
const myNameInput = document.getElementById('myName');
const groupNameInput = document.getElementById('groupName');

// Remember "Your name" / group name across visits so a blank field can't
// silently zero out myNet/myOwed again. Falls back silently if storage
// is unavailable (e.g. private browsing).
try {
  const savedName = localStorage.getItem('sw_myName');
  const savedGroup = localStorage.getItem('sw_groupName');
  if (savedName) myNameInput.value = savedName;
  if (savedGroup) groupNameInput.value = savedGroup;
} catch(e){}

myNameInput.addEventListener('change', () => {
  try { localStorage.setItem('sw_myName', myNameInput.value.trim()); } catch(e){}
});
groupNameInput.addEventListener('change', () => {
  try { localStorage.setItem('sw_groupName', groupNameInput.value.trim()); } catch(e){}
});

function handleFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const groupName = document.getElementById('groupName').value;
      const myName = document.getElementById('myName').value.trim();
      cacheData = convert(reader.result, groupName, myName);
      let warn = '';
      if (!myName) {
        warn = \`<div class="msg err">⚠️ "Your name" is blank — Net/My Share will show as 0 for every row. Fill it in and re-drop the CSV if you want correct per-expense values.</div>\`;
      } else if (!cacheData.members.some(m => m.name === myName)) {
        warn = \`<div class="msg err">⚠️ "\${myName}" doesn't exactly match any column header in this CSV — check spelling/case. Net values will show as 0 until it matches.</div>\`;
      }
      document.getElementById('parseMsg').innerHTML = \`<div class="msg ok">✅ Parsed successfully.</div>\` + warn;
      renderPreview(cacheData);
    } catch(e){
      document.getElementById('parseMsg').innerHTML = \`<div class="msg err">❌ \${e.message}</div>\`;
      document.getElementById('previewCard').style.display = 'none';
      document.getElementById('githubCard').style.display = 'none';
    }
  };
  reader.readAsText(file);
}

drop.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!cacheData) return;
  const blob = new Blob([JSON.stringify(cacheData, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cache.json'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('pushBtn').addEventListener('click', async () => {
  const msgEl = document.getElementById('pushMsg');
  if (!cacheData){ msgEl.innerHTML = \`<div class="msg err">Parse a CSV first.</div>\`; return; }
  const token = document.getElementById('ghToken').value.trim();
  const repo = document.getElementById('ghRepo').value.trim();
  const path = document.getElementById('ghPath').value.trim();
  const branch = document.getElementById('ghBranch').value.trim() || 'main';
  if (!token || !repo || !path){
    msgEl.innerHTML = \`<div class="msg err">Fill in token, repo, and path.</div>\`;
    return;
  }
  const btn = document.getElementById('pushBtn');
  btn.disabled = true; btn.textContent = 'Pushing…';
  try{
    const apiBase = \`https://api.github.com/repos/\${repo}/contents/\${encodeURIComponent(path).replace(/%2F/g,'/')}\`;
    // Need the current file's sha to update it (if it exists)
    let sha = undefined;
    const getResp = await fetch(\`\${apiBase}?ref=\${encodeURIComponent(branch)}\`, {
      headers: { Authorization: \`Bearer \${token}\`, Accept: 'application/vnd.github+json' }
    });
    if (getResp.ok){
      const getData = await getResp.json();
      sha = getData.sha;
    } else if (getResp.status !== 404){
      const errBody = await getResp.text();
      throw new Error(\`Couldn't read existing file (HTTP \${getResp.status}): \${errBody.slice(0,200)}\`);
    }

    const content = JSON.stringify(cacheData, null, 2);
    const contentB64 = btoa(unescape(encodeURIComponent(content)));

    const putResp = await fetch(apiBase, {
      method: 'PUT',
      headers: { Authorization: \`Bearer \${token}\`, Accept: 'application/vnd.github+json' },
      body: JSON.stringify({
        message: \`chore: update Splitwise cache \${new Date().toISOString().slice(0,16)}\`,
        content: contentB64,
        branch,
        ...(sha ? { sha } : {})
      })
    });
    if (!putResp.ok){
      const errBody = await putResp.text();
      throw new Error(\`GitHub push failed (HTTP \${putResp.status}): \${errBody.slice(0,300)}\`);
    }
    msgEl.innerHTML = \`<div class="msg ok">✅ Pushed to \${repo}@\${branch}. The live dashboard will pick it up on next load (cache-busted every 5 min).</div>\`;
  } catch(e){
    msgEl.innerHTML = \`<div class="msg err">❌ \${e.message}</div>\`;
  } finally {
    btn.disabled = false; btn.textContent = '🚀 Push cache.json to GitHub';
  }
});
</script>
</body>
</html>
`;
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
        const data=await getExpenses(env);
        return new Response(JSON.stringify(data),{headers:{...cors,"Content-Type":"application/json"}});
      }catch(e){
        return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
      }
    }
    if(url.pathname==="/"||url.pathname==="/dashboard")
      return new Response(renderHTML(),{headers:{"Content-Type":"text/html;charset=UTF-8"}});
    if(url.pathname==="/update")
      return new Response(renderUpdateTool(),{headers:{"Content-Type":"text/html;charset=UTF-8"}});
    return new Response("Not found",{status:404});
  }
};
