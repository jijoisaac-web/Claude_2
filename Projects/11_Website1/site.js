/* v12.5 */


// ── CURRENCY DATA MAP ──────────────────────────────
const CUR_META={
  AED:{flag:'<span class="fi fi-ae fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'ae',name:'UAE Dirham',region:'Gulf'},
  SAR:{flag:'<span class="fi fi-sa fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'sa',name:'Saudi Riyal',region:'Gulf'},
  QAR:{flag:'<span class="fi fi-qa fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'qa',name:'Qatari Riyal',region:'Gulf'},
  KWD:{flag:'<span class="fi fi-kw fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'kw',name:'Kuwaiti Dinar',region:'Gulf'},
  BHD:{flag:'<span class="fi fi-bh fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'bh',name:'Bahraini Dinar',region:'Gulf'},
  OMR:{flag:'<span class="fi fi-om fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'om',name:'Omani Rial',region:'Gulf'},
  MYR:{flag:'<span class="fi fi-my fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'my',name:'Malaysian Ringgit',region:'SE Asia'},
  SGD:{flag:'<span class="fi fi-sg fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'sg',name:'Singapore Dollar',region:'SE Asia'},
  AUD:{flag:'<span class="fi fi-au fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'au',name:'Australian Dollar',region:'Oceania'},
  NZD:{flag:'<span class="fi fi-nz fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'nz',name:'NZ Dollar',region:'Oceania'},
  USD:{flag:'<span class="fi fi-us fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'us',name:'US Dollar',region:'Americas'},
  CAD:{flag:'<span class="fi fi-ca fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'ca',name:'Canadian Dollar',region:'Americas'},
  EUR:{flag:'<span class="fi fi-eu fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'eu',name:'Euro',region:'Europe'},
  GBP:{flag:'<span class="fi fi-gb fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'gb',name:'British Pound',region:'Europe'},
  CHF:{flag:'<span class="fi fi-ch fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'ch',name:'Swiss Franc',region:'Europe'},
  SEK:{flag:'<span class="fi fi-se fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'se',name:'Swedish Krona',region:'Europe'},
  NOK:{flag:'<span class="fi fi-no fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'no',name:'Norwegian Krone',region:'Europe'},
  DKK:{flag:'<span class="fi fi-dk fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'dk',name:'Danish Krone',region:'Europe'},
  JPY:{flag:'<span class="fi fi-jp fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'jp',name:'Japanese Yen',region:'Asia Pacific'},
  HKD:{flag:'<span class="fi fi-hk fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>',cc:'hk',name:'Hong Kong Dollar',region:'Asia Pacific'},
};

// ── CUSTOM DROPDOWN ────────────────────────────────
function toggleCurDropdown(e){
  e.stopPropagation();
  const panel=document.getElementById('curPanel');
  const btn=document.getElementById('curBtn');
  const isOpen=panel.classList.contains('open');
  panel.classList.toggle('open',!isOpen);
  btn.classList.toggle('open',!isOpen);
}
function selectCurrency(el){
  const val=el.dataset.val;
  const cc=el.querySelector('.fi')?el.querySelector('.fi').className.match(/fi-([a-z]+)/)?.[1]:'';
  // Update checkmarks — highlight all entries sharing the same currency val
  document.querySelectorAll('.ci-check').forEach(c=>c.style.display='none');
  document.querySelectorAll('.cur-item').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.cur-item[data-val="'+val+'"]').forEach(function(c){c.classList.add('active');});
  document.querySelectorAll('[id^="ck-'+val+'"]').forEach(function(c){c.style.display='';});
  // Update button display — use the clicked country flag if available
  const meta=CUR_META[val]||{flag:'🌐',name:val,region:''};
  const clickedName=el.dataset.name||meta.name;
  const region=el.dataset.region||meta.region;
  // Show clicked country flag in button (not generic EUR flag when Germany clicked)
  var btnFlag=meta.flag;
  if(cc&&cc!=='eu') btnFlag='<span class="fi fi-'+cc+' fis" style="font-size:20px;border-radius:3px;line-height:1;flex-shrink:0;"></span>';
  document.getElementById('curBtnFlag').innerHTML=btnFlag;
  document.getElementById('curBtnCode').textContent=val;
  document.getElementById('curBtnRegion').textContent=region;
  // Close panel
  document.getElementById('curPanel').classList.remove('open');
  document.getElementById('curBtn').classList.remove('open');
  // Update baseCur and reload rates
  baseCur=val;
  const _hfl=document.getElementById('heroFromLabel');if(_hfl)_hfl.textContent=val;
  document.getElementById('curTag').textContent=val;document.getElementById('sendCurTag')&&(document.getElementById('sendCurTag').textContent=val);
  updateHeroBg(val);
  // Sync quick-select pills to match chosen currency
  document.querySelectorAll('.cflag').forEach(b=>b.classList.remove('active'));
  const activePill=document.querySelector('.cflag[data-cur="'+val+'"]');
  if(activePill)activePill.classList.add('active');
  updateAll();
  // Re-init flights if tab is active so departure airports update for new country
  var flTab=document.getElementById('tab-flights');
  if(flTab&&flTab.classList.contains('active')&&typeof window.initFlights==='function'){
    window.initFlights();
  }
  // Sync hero country strip
  if(typeof updateHeroStrip==='function') updateHeroStrip(val);
}
// Close dropdown on outside click
document.addEventListener('click',function(e){
  const dd=document.getElementById('curDropdown');
  if(dd&&!dd.contains(e.target)){
    document.getElementById('curPanel').classList.remove('open');
    document.getElementById('curBtn').classList.remove('open');
  }
});

// ── MARKET RATE BANNER ──────────────────────────────
function renderMarketRate(){
  if(!midRate)return;
  const amt=parseFloat(document.getElementById('sendAmount').value)||1000;
  const card=document.getElementById('mktRateCard');
  if(!card)return;
  card.classList.add('visible');
  // Mid-market values
  const midReceive=amt*midRate;
  document.getElementById('mktRateVal').innerHTML=`1 ${baseCur} = <strong style="color:var(--teal)">&#8377;${midRate.toFixed(4)}</strong>`;
  const _badge=document.getElementById('mktRateValBadge');
  if(_badge)_badge.textContent='1 '+baseCur+' = ₹'+midRate.toFixed(2);
  document.getElementById('mktSendAmt').textContent=amt.toLocaleString('en-IN');
  document.getElementById('mktSendCur').textContent=baseCur;
  document.getElementById('mktReceiveVal').textContent='₹'+Math.round(midReceive).toLocaleString('en-IN');
  document.getElementById('mktRateTime').textContent=new Date().toLocaleTimeString();
  // Best provider comparison
  const providers=P[baseCur]||P['USD'];
  const sorted=providers.map(p=>{
    const rate=midRate*(1-p.spread);
    const inr=Math.max(0,amt-p.fee)*rate;
    return{...p,rate,inr};
  }).sort((a,b)=>b.inr-a.inr);
  const best=sorted[0];const worst=sorted[sorted.length-1];
  const bestPct=((midReceive-best.inr)/midReceive*100).toFixed(1);
  const worstPct=((midReceive-worst.inr)/midReceive*100).toFixed(1);
  document.getElementById('mktMarginNote').textContent=`${bestPct}%–${worstPct}%`;
  document.getElementById('mktVsBar').innerHTML=`
    <div class="mkt-vs-item"><div class="mkt-vs-dot" style="background:var(--green)"></div><span class="mkt-vs-label">Best (${best.name}):</span> <span class="mkt-vs-val">&#8377;${Math.round(best.inr).toLocaleString('en-IN')}</span> <span class="mkt-vs-pct" style="color:var(--green)">-${bestPct}% vs mid-market</span></div>
    <div class="mkt-vs-item" style="margin-left:10px"><div class="mkt-vs-dot" style="background:var(--red)"></div><span class="mkt-vs-label">Bank wire:</span> <span class="mkt-vs-val">&#8377;${Math.round(worst.inr).toLocaleString('en-IN')}</span> <span class="mkt-vs-pct" style="color:var(--red)">-${worstPct}% vs mid-market</span></div>
  `;
}

// ── STATE ──────────────────────────────────────
let midRate=null,baseCur='AED',loanAmortData=[],returnProjData=[];

// ── PROVIDER BADGE STYLES ──────────────────────
const BADGE={
  'Wise':          {bg:'#1a3d2b',color:'#4ade80',text:'W'},
  'LuluMoney':     {bg:'#2d1f47',color:'#a78bfa',text:'LM'},
  'eRemit':        {bg:'#7a1c1c',color:'#fca5a5',text:'eR'},
  'Lotus Remit':   {bg:'#1a2a1a',color:'#86efac',text:'LR'},
  'Merchantrade':  {bg:'#3b2a10',color:'#fbbf24',text:'MT'},
  'BigPay':        {bg:'#3b1a1a',color:'#f87171',text:'BP'},
  'SkyRemit':      {bg:'#1a2e3b',color:'#7dd3fc',text:'SR'},
  'Western Union': {bg:'#3b2e00',color:'#fde68a',text:'WU'},
  'MoneyGram':     {bg:'#3b1a20',color:'#fca5a5',text:'MG'},
  'Al Ansari Exchange':{bg:'#1a2a3b',color:'#93c5fd',text:'AA'},
  'UAE Exchange':  {bg:'#1a2e3b',color:'#67e8f9',text:'UE'},
  'Al Fardan Exchange':{bg:'#2a1f10',color:'#fdba74',text:'AF'},
  'Sharaf Exchange':{bg:'#1f2a1a',color:'#86efac',text:'SX'},
  'Remitly':       {bg:'#1a2040',color:'#818cf8',text:'RM'},
  'STC Pay':       {bg:'#2a1040',color:'#c084fc',text:'ST'},
  'Al Rajhi Bank': {bg:'#0d2a1a',color:'#34d399',text:'AR'},
  'Alinma Pay':    {bg:'#1a2040',color:'#60a5fa',text:'AP'},
  'Al Zaman Exchange':{bg:'#3b2010',color:'#fb923c',text:'AZ'},
  'BFC Exchange':  {bg:'#1a1f3b',color:'#a5b4fc',text:'BF'},
  'InstaReM':      {bg:'#1a2f4a',color:'#38bdf8',text:'IR'},
  'SingX':         {bg:'#2a1020',color:'#e879f9',text:'SX'},
  'OFX':           {bg:'#2a1f10',color:'#f97316',text:'OX'},
  'TorFX':         {bg:'#102a2a',color:'#2dd4bf',text:'TX'},
  'Xoom (PayPal)': {bg:'#101f3b',color:'#6366f1',text:'XM'},
  'Xe.com':        {bg:'#1a2a10',color:'#a3e635',text:'XE'},
  'default':       {bg:'#1a2a3b',color:'#94a3b8',text:'?'},
};
function badgeFail(img,bg,color,txt){
  const p=img.closest('.pbadge,.rt-badge');
  if(!p)return;
  p.style.background=bg;p.style.padding='0';p.style.overflow='hidden';
  p.innerHTML='<span style="color:'+color+';font-weight:900;font-size:11px">'+txt+'</span>';
}
function rtBadgeFail(img){
  var b=img.parentElement;if(!b)return;
  b.style.background=b.dataset.bg;b.style.padding='0';b.style.overflow='hidden';
  b.innerHTML='<span style="color:'+b.dataset.fg+';font-weight:900;font-size:11px">'+b.dataset.ini+'</span>';
}
function badge(name,link){
  const s=BADGE[name]||BADGE['default'];
  if(link&&link!=='#'){
    try{
      const dom=new URL(link).hostname.replace('www.','');
      return `<div class="pbadge" style="background:#fff;padding:3px;overflow:hidden;border:1px solid rgba(200,200,200,0.15)"><img src="https://www.google.com/s2/favicons?domain=${dom}&sz=64" width="38" height="38" style="object-fit:contain;border-radius:4px;display:block" onerror="badgeFail(this,'${s.bg}','${s.color}','${s.text}')" loading="lazy"></div>`;
    }catch(e){}
  }
  return `<div class="pbadge" style="background:${s.bg};color:${s.color}">${s.text}</div>`;
}

// ── COUNTRY HERO THEMES (flag-color gradients) ───────────────────────────
const COUNTRY_HERO={
  // Gulf
  AED:{grad:'linear-gradient(135deg,#0a1a0a 0%,#0d2218 30%,#1a3a1a 60%,#c9960020 100%)',glow:'rgba(201,150,0,0.15)',label:'Dubai, UAE 🇦🇪',dot:'#c9a227'},
  SAR:{grad:'linear-gradient(135deg,#041a04 0%,#073d07 35%,#0a5a0a 70%,#ffffff08 100%)',glow:'rgba(21,126,21,0.18)',label:'Riyadh, Saudi Arabia 🇸🇦',dot:'#22c55e'},
  QAR:{grad:'linear-gradient(135deg,#1a0410 0%,#3d0a22 35%,#5a1035 70%,#ffffff08 100%)',glow:'rgba(139,26,74,0.2)',label:'Doha, Qatar 🇶🇦',dot:'#c084fc'},
  KWD:{grad:'linear-gradient(135deg,#041a04 0%,#0a3012 35%,#8b0000 0%,#8b000015 70%,#0a3012 100%)',glow:'rgba(10,107,46,0.18)',label:'Kuwait City 🇰🇼',dot:'#4ade80'},
  BHD:{grad:'linear-gradient(135deg,#1a0404 0%,#3d0a0a 35%,#c1272d25 70%,#0a0f1e 100%)',glow:'rgba(193,39,45,0.18)',label:'Manama, Bahrain 🇧🇭',dot:'#f87171'},
  OMR:{grad:'linear-gradient(135deg,#1a0404 0%,#2d0808 30%,#c1272d20 55%,#0a2010 100%)',glow:'rgba(193,39,45,0.15)',label:'Muscat, Oman 🇴🇲',dot:'#f87171'},
  // SE Asia
  MYR:{grad:'linear-gradient(135deg,#0a0420 0%,#14083a 30%,#cc000120 60%,#ffd70015 100%)',glow:'rgba(204,0,1,0.15)',label:'Kuala Lumpur, Malaysia 🇲🇾',dot:'#f43f5e'},
  SGD:{grad:'linear-gradient(135deg,#1a0408 0%,#ef334018 30%,#0a1020 70%,#ef334010 100%)',glow:'rgba(239,51,64,0.15)',label:'Singapore 🇸🇬',dot:'#f87171'},
  // Europe / Americas
  GBP:{grad:'linear-gradient(135deg,#010d2a 0%,#012169 35%,#c8102e18 70%,#010d2a 100%)',glow:'rgba(1,33,105,0.3)',label:'London, UK 🇬🇧',dot:'#60a5fa'},
  EUR:{grad:'linear-gradient(135deg,#00062a 0%,#003399 25%,#00339928 60%,#00062a 100%)',glow:'rgba(0,51,153,0.25)',label:'Europe 🇪🇺',dot:'#818cf8'},
  USD:{grad:'linear-gradient(135deg,#00051a 0%,#002868 30%,#bf0a3018 65%,#00051a 100%)',glow:'rgba(0,40,104,0.3)',label:'United States 🇺🇸',dot:'#60a5fa'},
  CAD:{grad:'linear-gradient(135deg,#1a0202 0%,#ff000020 30%,#0a0f20 60%,#ff000015 100%)',glow:'rgba(255,0,0,0.12)',label:'Canada 🇨🇦',dot:'#f87171'},
  AUD:{grad:'linear-gradient(135deg,#00041a 0%,#00008b 30%,#00008b28 60%,#c9960018 100%)',glow:'rgba(0,0,139,0.25)',label:'Sydney, Australia 🇦🇺',dot:'#60a5fa'},
  NZD:{grad:'linear-gradient(135deg,#00041a 0%,#00205b 30%,#cc142418 65%,#00041a 100%)',glow:'rgba(0,32,91,0.25)',label:'New Zealand 🇳🇿',dot:'#818cf8'},
};

function updateHeroBg(cur){
  const theme=COUNTRY_HERO[cur]||COUNTRY_HERO['AED'];
  const bg=document.querySelector('.hero-bg');
  const hero=document.querySelector('.hero');
  if(!bg)return;
  // Fade out
  bg.style.transition='opacity 0.3s ease';
  bg.style.opacity='0';
  setTimeout(()=>{
    // Apply gradient as background (no external image needed)
    bg.style.background=theme.grad;
    bg.style.opacity='1';
    // Shift hero glow color
    if(hero)hero.style.setProperty('--hero-glow',theme.glow||'transparent');
  },320);
  // Update location label
  const lbl=document.getElementById('heroLocLabel');
  if(lbl){
    lbl.textContent=theme.label;
    lbl.style.borderColor=theme.dot+'55';
    lbl.style.color=theme.dot;
  }
}

// ── PROVIDERS ──────────────────────────────────
const P={
  MYR:[
    {name:'eRemit',spread:0.001,fee:0,feeType:'add',feeAdd:13,link:'https://eremit.com.my/home',note:'Bank account only · same-day India credit'},
    {name:'LuluMoney',spread:0.001,fee:0,feeType:'add',feeTiers:[{max:5000,fee:10},{max:10000,fee:15},{max:1e9,fee:25}],link:'https://www.lulumoney.com/',note:'App exclusive · best for Lulu customers'},
    {name:'Western Union',spread:0.001,fee:0,feeType:'add',feeTiers:[{max:2500,fee:11.20},{max:7500,fee:30},{max:12500,fee:50},{max:1e9,fee:16}],link:'https://www.westernunion.com/my/en/home.html',note:'First online transfer free · instant delivery'},
    {name:'Wise',spread:0.001,fee:12,feeType:'incl',feeWise:true,link:'https://wise.com/my/',note:'Fee deducted from send amount · arrives in seconds'},
    {name:'InstaReM',spread:0.001,fee:0,feeType:'incl',feePercent:0.0055,link:'https://instarem.com/en-my/',note:'0.55% fee included · FPX · 2hr delivery · first transfer free'},
    {name:'Lotus Remit',spread:0.0016,fee:0,feeType:'add',feeAdd:5,link:'https://lotusremit.com',note:'Same-day India credit · flat MYR 5 fee extra'},
    {name:'Merchantrade Money',spread:0.007,fee:0,feeType:'add',feeAdd:3,link:'https://merchantrademoney.com',note:'Malaysia largest remittance network'},
    {name:'EzyRemit',spread:0.009,fee:0,feeType:'add',feeAdd:5,link:'https://ezyremit.com.my',note:'Popular among Indian workers in MY'},
    {name:'Maybank',spread:0.020,fee:0,link:'https://www.maybank2u.com.my/',note:'Maybank M2U · best for existing Maybank customers'},
  ],
  AED:[
    {name:'Aspora',spread:.003,fee:0,link:'https://www.aspora.com/ae',note:'Google-rate matching · zero fees · NRI app'},
    {name:'Wise',spread:.006,fee:3,link:'https://wise.com',note:'Mid-market rate'},
    {name:'Emirates NBD DirectRemit',spread:.009,fee:0,link:'https://emiratesnbd.com',note:'Instant to major Indian banks'},
    {name:'Careem Pay',spread:.009,fee:0,link:'https://www.careem.com/en-AE/pay/sendmoney/',note:'In-app remittance · zero fees · powered by Lulu Exchange'},
    {name:'ADCB Money Transfer',spread:.010,fee:0,link:'https://adcb.com',note:'ADCB bank transfer · fast'},
    {name:'FAB India Transfers',spread:.010,fee:0,link:'https://bankfab.com',note:'First Abu Dhabi Bank'},
    {name:'LuluMoney',spread:.010,fee:0,link:'https://www.lulumoney.com/',note:'At Lulu Hypermarkets'},
    {name:'InstaReM',spread:.011,fee:0,link:'https://instarem.com/en-ae/',note:'Digital · UAE licensed'},
    {name:'Al Ansari Exchange',spread:.012,fee:0,link:'https://alansariexchange.com',note:"UAE's largest exchange house"},
    {name:'GCC Exchange',spread:.012,fee:0,link:'https://gccexchange.com',note:'Competitive walk-in rates'},
    {name:'Joyalukkas Exchange',spread:.012,fee:0,link:'https://joyalukkas.com/exchange',note:'Popular walk-in counters · UAE wide'},
    {name:'NOW Money',spread:.012,fee:0,link:'https://nowmoney.me',note:'Neobank for UAE workers · app-based'},
    {name:'Wall Street Exchange',spread:.013,fee:0,link:'https://wallstreetexchange.com',note:'UAE exchange specialist'},
    {name:'UAE Exchange',spread:.013,fee:0,link:'https://uaeexchange.com',note:'Wide UAE branch network'},
    {name:'Al Fardan Exchange',spread:.014,fee:0,link:'https://alfardanexchange.com',note:'Premium exchange service'},
    {name:'Remitly',spread:.014,fee:0,link:'https://www.remitly.com/',note:'Digital · fast delivery'},
    {name:'Sharaf Exchange',spread:.015,fee:0,link:'https://sharafexchange.com',note:'At Sharaf DG stores'},
    {name:'Ria Money Transfer',spread:.017,fee:0,link:'https://www.riamoneytransfer.com/',note:'Good rural India reach'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Wide agent network'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Cash & digital'},
  ],
  SAR:[
    {name:'Wise',spread:.006,fee:3,link:'https://wise.com',note:'Mid-market rate'},
    {name:'STC Pay',spread:.010,fee:0,link:'https://stcpay.com.sa',note:'Very popular Saudi fintech app'},
    {name:'UrPay',spread:.010,fee:0,link:'https://urpay.com.sa',note:'STC digital wallet · growing fast'},
    {name:'Tahweel Al Rajhi',spread:.011,fee:0,link:'https://alrajhiexchange.com',note:'Al Rajhi exchange counters'},
    {name:'Tahweel Al Bilad',spread:.012,fee:0,link:'https://albilad.com',note:'Bank Al Bilad exchange'},
    {name:'Enjaz',spread:.012,fee:0,link:'https://enjazit.com.sa',note:'Al Rajhi Bank remittance service'},
    {name:'LuluMoney',spread:.011,fee:0,link:'https://www.lulumoney.com/',note:'At Lulu KSA outlets'},
    {name:'Alinma Pay',spread:.013,fee:0,link:'https://alinma.com',note:'Alinma Bank digital wallet'},
    {name:'UAE Exchange',spread:.012,fee:0,link:'https://uaeexchange.com',note:'Branches across KSA'},
    {name:'InstaReM',spread:.013,fee:0,link:'https://instarem.com/en-sa/',note:'Digital · fast transfers'},
    {name:'Al Rajhi Bank',spread:.014,fee:0,link:'https://alrajhibank.com.sa',note:'Most widely used bank KSA'},
    {name:'Saudi National Bank (SNB)',spread:.012,fee:0,link:'https://www.alahli.com',note:'Largest KSA bank · SNB Pay app'},
    {name:'Riyad Bank',spread:.013,fee:0,link:'https://www.riyadbank.com',note:'Major KSA bank · wide branches'},
    {name:'Arab National Bank',spread:.013,fee:0,link:'https://www.anb.com.sa',note:'Popular bank for expat transfers'},
    {name:'National Exchange Center',spread:.012,fee:0,link:'https://www.nec.com.sa',note:'Walk-in exchange KSA'},
    {name:'Remitly',spread:.013,fee:0,link:'https://www.remitly.com/',note:'Digital · fast delivery'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Large agent network'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via KSA agents'},
  ],
  QAR:[
    {name:'Wise',spread:.006,fee:3,link:'https://wise.com',note:'Mid-market rate'},
    {name:'LuluMoney',spread:.011,fee:0,link:'https://www.lulumoney.com/',note:'At Lulu Qatar'},
    {name:'Al Fardan Exchange',spread:.011,fee:0,link:'https://alfardanexchange.com',note:'Qatar leading exchange · wide branches'},
    {name:'UAE Exchange',spread:.012,fee:0,link:'https://uaeexchange.com',note:'Branches across Qatar'},
    {name:'Al Zaman Exchange',spread:.012,fee:0,link:'https://alzamanexchange.com',note:'Popular in Doha'},
    {name:'Orient Exchange Qatar',spread:.012,fee:0,link:'https://orientexchange.qa',note:'Qatar exchange house'},
    {name:'QNB (Qatar National Bank)',spread:.013,fee:0,link:'https://www.qnb.com/sites/qnb/qnbqatar/en_gb/',note:'Largest Qatar bank'},
    {name:'Doha Bank',spread:.013,fee:0,link:'https://www.dohabank.com.qa',note:'Popular bank transfer'},
    {name:'InstaReM',spread:.013,fee:0,link:'https://instarem.com/en-qa/',note:'Digital · fast transfers'},
    {name:'Commercial Bank Qatar',spread:.014,fee:0,link:'https://www.cbq.qa',note:'Major Qatar bank'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via agents'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Nationwide agents'},
  ],
  KWD:[
    {name:'Wise',spread:.006,fee:1,link:'https://wise.com',note:'Mid-market rate'},
    {name:'Al Muzaini Exchange',spread:.010,fee:0,link:'https://www.muzaini.com',note:"Kuwait's largest exchange · 64+ branches"},
    {name:'Kuwait Finance House (KFH)',spread:.011,fee:0,link:'https://www.kfh.com',note:'Leading Islamic bank Kuwait'},
    {name:'National Bank of Kuwait (NBK)',spread:.012,fee:0,link:'https://www.nbk.com',note:'Most popular Kuwait bank'},
    {name:'UAE Exchange',spread:.012,fee:0,link:'https://uaeexchange.com',note:'Kuwait branches'},
    {name:'Al Mulla Exchange',spread:.012,fee:0,link:'https://almullaexchange.com',note:'Popular walk-in exchange Kuwait'},
    {name:'Gulf Bank',spread:.013,fee:0,link:'https://www.gulfbank.com.kw',note:'Kuwait bank transfer'},
    {name:'InstaReM',spread:.013,fee:0,link:'https://instarem.com/en-kw/',note:'Digital · fast transfers'},
    {name:'Remitly',spread:.014,fee:0,link:'https://www.remitly.com/',note:'Digital, fast'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via agents'},
    {name:'MoneyGram',spread:.022,fee:1,link:'https://www.moneygram.com/',note:'Nationwide agents'},
  ],
  BHD:[
    {name:'Wise',spread:.006,fee:1,link:'https://wise.com',note:'Mid-market rate'},
    {name:'BFC Exchange',spread:.011,fee:0,link:'https://bfcgroup.com',note:"Bahrain's largest exchange house"},
    {name:'Zenj Exchange',spread:.012,fee:0,link:'https://www.zenjexchange.com',note:'Popular Bahrain exchange'},
    {name:'National Bank of Bahrain (NBB)',spread:.012,fee:0,link:'https://www.nbbonline.com',note:'Largest Bahrain bank'},
    {name:'Ahli United Bank',spread:.013,fee:0,link:'https://www.ahliunitedbank.com/bh',note:'Popular Bahrain bank'},
    {name:'UAE Exchange',spread:.013,fee:0,link:'https://uaeexchange.com',note:'Bahrain branches'},
    {name:'Habib Exchange Bahrain',spread:.013,fee:0,link:'https://www.habibexchange.com',note:'Expat-focused exchange house'},
    {name:'InstaReM',spread:.014,fee:0,link:'https://instarem.com/en-bh/',note:'Digital · fast transfers'},
    {name:'Remitly',spread:.014,fee:0,link:'https://www.remitly.com/',note:'Digital, fast'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via agents'},
    {name:'MoneyGram',spread:.022,fee:1,link:'https://www.moneygram.com/',note:'Available at agents'},
  ],
  OMR:[
    {name:'Wise',spread:.006,fee:1,link:'https://wise.com',note:'Mid-market rate'},
    {name:'Mustafa Sultan Exchange',spread:.010,fee:0,link:'https://mustafasultanexchange.om',note:'SBI-managed · 150+ Oman branches · India specialist'},
    {name:'Majan Exchange',spread:.011,fee:0,link:'https://majanexchange.com',note:'Popular Oman exchange house'},
    {name:'Unimoni Exchange',spread:.012,fee:0,link:'https://unimoni.com/om',note:'Oman-wide exchange · was UAE Exchange'},
    {name:'UAE Exchange',spread:.012,fee:0,link:'https://uaeexchange.com',note:'Oman branches'},
    {name:'Bank Muscat',spread:.013,fee:0,link:'https://www.bankmuscat.com',note:'Largest Oman bank · Maisarah app'},
    {name:'National Bank of Oman (NBO)',spread:.013,fee:0,link:'https://www.nbo.om',note:'Popular bank transfer'},
    {name:'Oman Arab Bank',spread:.013,fee:0,link:'https://www.oman-arabbank.com',note:'Expat-friendly Oman bank'},
    {name:'InstaReM',spread:.013,fee:0,link:'https://instarem.com/en-om/',note:'Digital · fast transfers'},
    {name:'Remitly',spread:.014,fee:0,link:'https://www.remitly.com/',note:'Digital, fast'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via agents'},
    {name:'MoneyGram',spread:.022,fee:1,link:'https://www.moneygram.com/',note:'Nationwide agents'},
  ],
  SGD:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:4,link:'https://wise.com/sg/',note:'Mid-market rate · ~SGD 4 fee deducted · MAS licensed · arrives in seconds'},
    {name:'Revolut',spread:.008,fee:0,link:'https://www.revolut.com/en-SG/',note:'Premium plan: zero fee at mid-market · Standard: 0.5% markup over S$200/month'},
    {name:'DBS Remit',spread:.009,fee:0,link:'https://www.dbs.com.sg/',note:'Zero fee for DBS/POSB customers · instant to major Indian banks'},
    {name:'InstaReM',spread:.001,fee:0,feeType:'incl',feePercent:0.0055,link:'https://www.instarem.com/en-sg/',note:'0.55% fee included · Singapore-founded · MAS licensed · earns InstaPoints loyalty rewards'},
    {name:'OCBC Global Transfer',spread:.010,fee:0,link:'https://www.ocbc.com/personal-banking/international-transfers',note:'Low fee for OCBC account holders'},
    {name:'Standard Chartered Online',spread:.010,fee:0,link:'https://www.sc.com/sg/',note:'SC Bank transfer · fast'},
    {name:'SingX',spread:.011,fee:0,link:'https://www.singx.co/',note:'SG–India specialist · good large-transfer rates · MAS licensed'},
    {name:'SBI Singapore',spread:.012,fee:0,link:'https://sbisingapore.com/',note:'Direct SBI-to-SBI · high security · best for SBI account holders'},
    {name:'Remitly',spread:.013,fee:0,link:'https://www.remitly.com/',note:'Digital · fast delivery'},
    {name:'WorldRemit',spread:.014,fee:0,link:'https://www.worldremit.com/',note:'App-based · popular'},
    {name:'Ria Money Transfer',spread:.017,fee:0,link:'https://www.riamoneytransfer.com/',note:'Good rural India coverage'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/sg/en/home.html',note:'Cash pickup at thousands of India locations'},
  ],
  AUD:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:6,link:'https://wise.com',note:'Mid-market rate · ~AUD 6 fee deducted · ASIC licensed'},
    {name:'InstaReM',spread:.001,fee:0,feeType:'incl',feeAdd:6,link:'https://instarem.com/en-au/',note:'Flat AUD 6 fee included · SG fintech · ASIC licensed'},
    {name:'OFX',spread:.030,fee:0,feeType:'add',feeAdd:15,link:'https://www.ofx.com/',note:'Australia-founded FX specialist · AUD 15 fee extra'},
    {name:'CurrencyFair',spread:.008,fee:3,link:'https://www.currencyfair.com/',note:'Peer exchange · low spread'},
    {name:'Remitly',spread:.003,fee:0,link:'https://www.remitly.com/',note:'Popular AU–India'},
    {name:'TorFX',spread:.013,fee:0,link:'https://www.torfx.com/',note:'No transfer fees · personal dealer'},
    {name:'WorldRemit',spread:.015,fee:0,link:'https://www.worldremit.com/',note:'App-based · popular in AU'},
    {name:'Ria Money Transfer',spread:.017,fee:0,link:'https://www.riamoneytransfer.com/',note:'AU agent network'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via agents'},
  ],
  NZD:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:5,link:'https://wise.com',note:'Mid-market rate · ~NZD 5 fee deducted'},
    {name:'Remitly',spread:.003,fee:0,link:'https://www.remitly.com/',note:'Digital, fast'},
    {name:'OFX',spread:.032,fee:0,feeType:'add',feeAdd:12,link:'https://www.ofx.com/',note:'NZ registered · NZD 12 fee extra'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Via agents'},
  ],
  USD:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:11,link:'https://wise.com',note:'Mid-market rate · ~USD 11 fee deducted (varies) · FinCEN licensed'},
    {name:'Revolut',spread:.006,fee:0,link:'https://www.revolut.com/',note:'US app users · free on standard (limits apply)'},
    {name:'Remitly',spread:.004,fee:0,link:'https://www.remitly.com/',note:'Popular US–India · Express & Economy options'},
    {name:'Xoom (PayPal)',spread:.004,fee:0,link:'https://www.xoom.com/',note:'PayPal-backed · very popular with Indian Americans'},
    {name:'InstaReM',spread:.007,fee:0,link:'https://instarem.com/en-us/',note:'Digital · fast'},
    {name:'OFX',spread:.033,fee:0,feeType:'add',feeAdd:5,link:'https://www.ofx.com/',note:'USD 5 fee extra · good for large amounts'},
    {name:'Xe.com',spread:.014,fee:0,link:'https://www.xe.com/',note:'No transfer fee'},
    {name:'WorldRemit',spread:.006,fee:0,feeType:'add',feeAdd:3,link:'https://www.worldremit.com/',note:'App-based · popular · ~USD 3 fee extra'},
    {name:'Ria Money Transfer',spread:.017,fee:0,link:'https://www.riamoneytransfer.com/',note:'Large US agent network'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Nationwide agents'},
    {name:'Western Union',spread:.025,fee:0,link:'https://www.westernunion.com/',note:'Cash & digital'},
  ],
  CAD:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:8,link:'https://wise.com',note:'Mid-market rate · ~CAD 8 fee deducted'},
    {name:'Remitly',spread:.005,fee:0,link:'https://www.remitly.com/',note:'Popular Canada–India corridor'},
    {name:'Simplii Global Money Transfer',spread:.012,fee:0,link:'https://simplii.com',note:'CIBC-owned · popular with Indian Canadians'},
    {name:'InstaReM',spread:.007,fee:0,link:'https://instarem.com/en-ca/',note:'Digital · fast'},
    {name:'Xoom (PayPal)',spread:.016,fee:0,link:'https://www.xoom.com/',note:'PayPal-backed · popular app'},
    {name:'TD Global Transfer',spread:.018,fee:5,link:'https://td.com',note:'TD Bank customers · convenient'},
    {name:'RBC International Transfer',spread:.019,fee:6,link:'https://rbc.com',note:'RBC account holders'},
    {name:'Xe.com',spread:.014,fee:0,link:'https://www.xe.com/',note:'No fee transfers'},
    {name:'WorldRemit',spread:.006,fee:0,feeType:'add',feeAdd:3,link:'https://www.worldremit.com/',note:'App-based · popular · ~USD 3 fee extra'},
    {name:'Ria Money Transfer',spread:.017,fee:0,link:'https://www.riamoneytransfer.com/',note:'Canada-wide agent network'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Nationwide agents'},
    {name:'Western Union',spread:.006,fee:0,link:'https://www.westernunion.com/',note:'Cash & digital'},
  ],
  EUR:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:7,link:'https://wise.com',note:'Mid-market rate · ~EUR 7 fee deducted'},
    {name:'Remitly',spread:.011,fee:0,link:'https://www.remitly.com/',note:'Fast digital'},
    {name:'InstaReM',spread:.006,fee:0,link:'https://instarem.com/en-eu/',note:'EU licensed · digital'},
    {name:'Xe.com',spread:.013,fee:0,link:'https://www.xe.com/',note:'No transfer fee'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Nationwide agents'},
    {name:'Western Union',spread:.007,fee:0,link:'https://www.westernunion.com/',note:'EU-wide agents'},
  ],
  GBP:[
    {name:'Wise',spread:.000,fee:0,feeType:'incl',feeAdd:5,link:'https://wise.com',note:'Mid-market rate · ~GBP 5 fee deducted · FCA regulated'},
    {name:'Revolut',spread:.005,fee:0,link:'https://www.revolut.com/',note:'App-based · free on standard plan (limits apply)'},
    {name:'Remitly',spread:.002,fee:0,feeType:'add',feeAdd:2,link:'https://www.remitly.com/',note:'Popular UK–India corridor · GBP 1.99 fee extra'},
    {name:'InstaReM',spread:.006,fee:0,link:'https://instarem.com/en-gb/',note:'FCA regulated · digital'},
    {name:'CurrencyFair',spread:.008,fee:3,link:'https://www.currencyfair.com/',note:'Peer exchange · low spread'},
    {name:'Xe.com',spread:.013,fee:0,link:'https://www.xe.com/',note:'No transfer fee · large transfers'},
    {name:'WorldRemit',spread:.009,fee:0,link:'https://www.worldremit.com/',note:'App-based · popular in UK'},
    {name:'Ria Money Transfer',spread:.017,fee:0,link:'https://www.riamoneytransfer.com/',note:'Good rural India reach'},
    {name:'MoneyGram',spread:.022,fee:2,link:'https://www.moneygram.com/',note:'Post Office & agents'},
    {name:'Western Union',spread:.006,fee:0,feeType:'add',feeAdd:2,link:'https://www.westernunion.com/',note:'Post Office & agents · ~GBP 2 fee extra'},
  ],
};

// ── TIERED FEE HELPER ──────────────────────────────────
function getDynFee(p,amt){
  if(p.feeWise)return parseFloat((4.58+0.00725*amt).toFixed(2));
  if(p.feePercent)return parseFloat((p.feePercent*amt).toFixed(2));
  if(p.feeTiers){for(var _i=0;_i<p.feeTiers.length;_i++){if(amt<=p.feeTiers[_i].max)return p.feeTiers[_i].fee;}}
  return p.feeAdd||p.fee||0;
}

const FB={AED:26.28,SAR:25.74,QAR:26.52,KWD:314.9,BHD:256.6,OMR:250.8,SGD:74.77,MYR:23.58,AUD:67.45,NZD:56.47,USD:96.52,CAD:68.91,EUR:110.40,GBP:129.96};
let rateIsLive=false;
const CACHE_TTL=10*60*1000; // 10 minutes

function getCachedRate(c){
  try{
    const raw=sessionStorage.getItem('rate_'+c);
    if(!raw)return null;
    const {rate,ts}=JSON.parse(raw);
    if(Date.now()-ts<CACHE_TTL)return rate;
  }catch(e){}
  return null;
}
function setCachedRate(c,rate){
  try{sessionStorage.setItem('rate_'+c,JSON.stringify({rate,ts:Date.now()}));}catch(e){}
}
function getLastUpdatedStr(){
  try{
    const raw=sessionStorage.getItem('rate_'+baseCur);
    if(!raw)return null;
    const {ts}=JSON.parse(raw);
    const diff=Math.round((Date.now()-ts)/1000);
    if(diff<60)return 'Updated just now';
    if(diff<3600)return `Updated ${Math.floor(diff/60)}m ago`;
    return `Updated ${Math.floor(diff/3600)}h ago`;
  }catch(e){return null;}
}

async function fetchRate(c){
  // Return cache if fresh
  const cached=getCachedRate(c);
  if(cached){rateIsLive=true;return cached;}
  const cu=c.toLowerCase();
  // Race all 3 sources in parallel — fastest wins
  const tout=(ms)=>new Promise((_,rej)=>setTimeout(()=>rej('timeout'),ms));
  const safe=(p)=>Promise.race([p,tout(6000)]);
  const s1=safe(fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${cu}.json`).then(r=>r.ok?r.json():Promise.reject()).then(d=>{const v=d[cu]&&d[cu].inr;if(v)return v;throw 0;}));
  const s2=safe(fetch(`https://latest.currency-api.pages.dev/v1/currencies/${cu}.json`).then(r=>r.ok?r.json():Promise.reject()).then(d=>{const v=d[cu]&&d[cu].inr;if(v)return v;throw 0;}));
  const s3=safe(fetch(`https://api.frankfurter.app/latest?from=${c}&to=INR`).then(r=>r.ok?r.json():Promise.reject()).then(d=>{const v=d.rates&&d.rates.INR;if(v)return v;throw 0;}));
  try{
    const v=await Promise.any([s1,s2,s3]);
    rateIsLive=true;
    setCachedRate(c,v);
    return v;
  }
  catch(e){rateIsLive=false;return FB[c]||null;}
}

/* ── RATE CROSS-CHECK ─────────────────────────────────────── */
async function fetchRateCrossCheck(c){
  var cu=c.toLowerCase();
  var tout=function(ms){return new Promise(function(_,rej){setTimeout(function(){rej('timeout');},ms);});};
  function safeFetch(p){return Promise.race([p,tout(7000)]).catch(function(){return null;});}
  var r1=safeFetch(fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/'+cu+'.json').then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){var v=d[cu]&&d[cu].inr;if(v)return v;throw 0;}));
  var r2=safeFetch(fetch('https://latest.currency-api.pages.dev/v1/currencies/'+cu+'.json').then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){var v=d[cu]&&d[cu].inr;if(v)return v;throw 0;}));
  var r3=safeFetch(fetch('https://api.frankfurter.app/latest?from='+c+'&to=INR').then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){var v=d.rates&&d.rates.INR;if(v)return v;throw 0;}));
  var results=await Promise.all([r1,r2,r3]);
  return [
    {label:'jsDelivr / fawazahmed0',v:results[0]},
    {label:'currency-api.pages.dev',v:results[1]},
    {label:'Frankfurter (ECB)',v:results[2]}
  ];
}

function renderRateCrossCheck(results){
  var el=document.getElementById('rate-crosscheck');
  if(!el)return;
  var valid=results.filter(function(r){return r.v!==null&&r.v!==undefined;});
  if(!valid.length){el.style.display='none';return;}
  var values=valid.map(function(r){return r.v;});
  var avg=values.reduce(function(a,b){return a+b;},0)/values.length;
  var minV=Math.min.apply(null,values);
  var maxV=Math.max.apply(null,values);
  var variance=valid.length>1?((maxV-minV)/minV*100):0;
  var statusCls,statusIcon,statusText;
  if(valid.length===1){statusCls='rcc-amber';statusIcon='&#9888;';statusText='Only 1 source responded — treat with caution';}
  else if(variance<0.1){statusCls='rcc-green';statusIcon='&#10003;';statusText='All sources agree within 0.1% — data is reliable';}
  else if(variance<0.5){statusCls='rcc-amber';statusIcon='&#9888;';statusText='Minor variance of '+variance.toFixed(3)+'% across sources';}
  else{statusCls='rcc-red';statusIcon='&#9888;';statusText='Significant variance '+variance.toFixed(3)+'% — verify manually';}
  var rows=results.map(function(r){
    if(r.v===null||r.v===undefined){
      return '<div class="rcc-row"><span class="rcc-src">'+r.label+'</span><span class="rcc-val rcc-fail">Timed out</span><span class="rcc-dot rcc-dot-red">&#9679;</span></div>';
    }
    var diff=valid.length>1?((r.v-avg)/avg*100):0;
    var diffStr=diff>=0?'+'+diff.toFixed(4)+'%':diff.toFixed(4)+'%';
    var dotCls=Math.abs(diff)<0.1?'rcc-dot-green':'rcc-dot-amber';
    return '<div class="rcc-row"><span class="rcc-src">'+r.label+'</span><span class="rcc-val">&#8377;'+r.v.toFixed(4)+'</span><span class="rcc-diff">'+diffStr+'</span><span class="rcc-dot '+dotCls+'">&#9679;</span></div>';
  }).join('');
  var updated=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  el.innerHTML='<div class="rcc-head"><span class="rcc-title">&#128269; Rate Cross-Check</span><span class="rcc-sub">3 independent sources &middot; '+updated+'</span></div>'+rows+'<div class="rcc-status '+statusCls+'"><span>'+statusIcon+'</span><span>'+statusText+'</span></div>';
  el.style.display='block';
}

async function updateAll(){
  // baseCur is managed by the custom dropdown (selectCurrency); use global as-is
  const _hfl2=document.getElementById('heroFromLabel');if(_hfl2)_hfl2.textContent=baseCur;
  document.getElementById('curTag').textContent=baseCur;document.getElementById('sendCurTag')&&(document.getElementById('sendCurTag').textContent=baseCur);
  const ld=document.getElementById('rates-loading');
  const rc=document.getElementById('rates-container');
  const rn=document.getElementById('rate-note');

  // Show fallback rates INSTANTLY so UI is never blank
  if(FB[baseCur]){
    midRate=FB[baseCur];rateIsLive=false;updateHeroRate();
    rc.style.display='flex';ld.style.display='none';rn.style.display='flex';
    renderRates();renderRatePreview();renderMarketRate();
    // Show subtle "updating" badge in note
    const nt=document.getElementById('rate-note-text');
    if(nt)nt.innerHTML+=' &nbsp;<span style="background:var(--amber-dim);color:var(--amber);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700">⟳ Updating to live…</span>';
  } else {
    ld.style.display='flex';ld.innerHTML='<div class="spin"></div><span>Fetching rates for '+baseCur+'…</span>';
    rc.style.display='none';rn.style.display='none';
  }

  // Fetch live rate (race) + cross-check all sources in parallel
  const [live,crossResults]=await Promise.all([fetchRate(baseCur),fetchRateCrossCheck(baseCur)]);
  ld.style.display='none';
  if(live){
    midRate=live;rateIsLive=true;updateHeroRate();
    rc.style.display='flex';rn.style.display='flex';
    renderRates();renderRatePreview();renderMarketRate();
    renderRateCrossCheck(crossResults||[]);
    // Show last-updated timestamp
    const ts=getLastUpdatedStr();
    const hrdStatus=document.getElementById('hrd-status');
    if(hrdStatus&&ts)hrdStatus.innerHTML=`<div class="live-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);animation:blink 2s infinite;flex-shrink:0"></div> Live rate · ${ts}`;
  } else if(FB[baseCur]){
    // Graceful fallback — show FB rate with clear label
    midRate=FB[baseCur];rateIsLive=false;
    rc.style.display='flex';rn.style.display='flex';
    renderRates();renderRatePreview();renderMarketRate();
    const hrdStatus=document.getElementById('hrd-status');
    if(hrdStatus)hrdStatus.innerHTML=`<span style="color:var(--amber)">⚠ Using reference rate — live fetch failed. Verify on provider site.</span>`;
  } else {
    ld.innerHTML='<span style="color:var(--red)">⚠ Could not load rates. Check your internet connection.</span>';
    ld.style.display='flex';
  }
}

function syncAmount(v){document.getElementById('sendAmount').value=v;}
function syncAmountFromMain(v){const _el=document.getElementById('heroWidgetAmt');if(_el)_el.value=v;}

// ── RATE PREVIEW CARD (Hero right panel) ──────
function renderRatePreview(){
  updateHeroWidget(); calcHeroCorpus(); calcHeroHomeLoan(); calcHeroRealty(); // keep hero widget in sync whenever preview refreshes
  if(!midRate)return;
  const rpcCur=document.getElementById('rpc-cur');
  if(rpcCur)rpcCur.textContent=baseCur;
  const amt=parseFloat(document.getElementById('sendAmount').value)||1000;
  const providers=P[baseCur]||P['USD'];
  const rows=providers.map(p=>{
    const rate=midRate*(1-p.spread);
    const _dynFee=getDynFee(p,amt);
    const inr=Math.max(0,amt-_dynFee)*rate;
    return{...p,rate,inr,_dynFee};
  }).sort((a,b)=>b.inr-a.inr).slice(0,3);
  const rpcRows=document.getElementById('rpc-rows');
  if(!rpcRows)return;
  rpcRows.innerHTML=rows.map((p,i)=>{
    const rpcBadge=rtBadge(p.name,p.link);
    return`<div class="rpc-row">
      ${rpcBadge}
      <div class="rpc-info">
        <div class="rpc-name">${p.name}${i===0?'<span class="best-tag" style="font-size:9px;padding:1px 7px">BEST</span>':''}</div>
        <div class="rpc-note">${p.note}</div>
      </div>
      <div class="rpc-amount">
        <div class="rpc-inr">₹${Math.round(p.inr).toLocaleString('en-IN')}</div>
        <div class="rpc-rate">@ ₹${p.rate.toFixed(2)}</div>
      </div>
    </div>`;
  }).join('');
  const rpcFooter=document.getElementById('rpc-footer');
  if(rpcFooter)rpcFooter.innerHTML=`<span class="rpc-live-tag"><div class="live-dot" style="display:inline-block"></div> ${rateIsLive?'Live':'Approx'} · 1 ${baseCur} = ₹${midRate.toFixed(4)}</span> · Estimates only — promotions may apply · <strong>Verify live rate on provider site before sending</strong>`;
}


var RT_COLORS={
  'Wise':['#0e3a5e','#9cdcfe'],
  'DBS Remit':['#cc0001','#fff'],
  'Emirates NBD DirectRemit':['#005a9c','#fff'],
  'ADCB Money Transfer':['#b5001f','#fff'],
  'FAB India Transfers':['#003087','#fff'],
  'LuluMoney':['#1b5e20','#fff'],
  'InstaReM':['#1a1f71','#fff'],
  'Al Ansari Exchange':['#005792','#fff'],
  'GCC Exchange':['#c8a400','#000'],
  'Wall Street Exchange':['#1c2951','#fff'],
  'UAE Exchange':['#006341','#fff'],
  'Al Fardan Exchange':['#7b0000','#fff'],
  'Sharaf Exchange':['#d4a017','#000'],
  'Remitly':['#1a1a2e','#4fc3f7'],
  'Ria Money Transfer':['#e65100','#fff'],
  'MoneyGram':['#cc0000','#fff'],
  'Western Union':['#ffdd00','#000'],
  'STC Pay':['#7b00d4','#fff'],
  'UrPay':['#00695c','#fff'],
  'Enjaz':['#1565c0','#fff'],
  'eRemit':['#2e7d32','#fff'],
  'Merchantrade Money':['#880e4f','#fff'],
  'EzyRemit':['#0277bd','#fff'],
  'Lotus Remit':['#e65100','#fff'],
  'WorldRemit':['#7b1fa2','#fff'],
  'Wise (via NRE)':['#0e3a5e','#9cdcfe'],
  'InstaReM (SGD)':['#1a1f71','#fff'],
  'YouTrip':['#1a1f71','#fff'],
  'CurrencyFair':['#00695c','#fff'],
  'OFX':['#1565c0','#fff'],
  'TorFX':['#4a148c','#fff'],
  'XE Money Transfer':['#005792','#fff'],
  'Vaiour':['#2e7d32','#fff'],
};
function rtBadge(name,link){
  var c=RT_COLORS[name]||['#263238','#90a4ae'];
  var ini=name.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();
  if(link&&link!=='#'){
    try{
      var dom=new URL(link).hostname.replace('www.','');
      return '<div class="rt-badge" style="background:#1a1f2e;padding:3px;overflow:hidden" data-bg="'+c[0]+'" data-fg="'+c[1]+'" data-ini="'+ini+'"><img src="https://www.google.com/s2/favicons?domain='+dom+'&sz=64" width="30" height="30" style="object-fit:contain;border-radius:5px;display:block" onerror="rtBadgeFail(this)" loading="lazy"></div>';
    }catch(e){}
  }
  return '<div class="rt-badge" style="background:'+c[0]+';color:'+c[1]+'">'+ini+'</div>';
}

var _rateViewMode='tile';

function setRateView(mode){
  _rateViewMode=mode;
  var wrap=document.getElementById('rates-container');
  if(wrap){
    wrap.classList.remove('rt-tile','rt-list');
    wrap.classList.add(mode==='tile'?'rt-tile':'rt-list');
  }
  document.querySelectorAll('.rate-view-btn').forEach(function(b){
    b.classList.toggle('active',b.dataset.view===mode);
  });
  renderRates();
}

function renderRates(){
  if(!midRate)return;
  var amt=parseFloat(document.getElementById('sendAmount').value)||1000;
  var providers=P[baseCur]||P['USD'];
  var rows=providers.map(function(p){
    var rate=midRate*(1-p.spread);
    var _dynFee=getDynFee(p,amt);
    var inr=Math.max(0,amt-_dynFee)*rate;
    return Object.assign({},p,{rate:rate,inr:inr,_dynFee:_dynFee});
  }).sort(function(a,b){return b.inr-a.inr;});

  var best=rows[0].inr, worst=rows[rows.length-1].inr;
  var saving=Math.round(best-worst);
  var wrap=document.getElementById('rates-container');

  /* ── view toggle ── */
  var isTile=_rateViewMode==='tile';
  var toggleHtml='<div class="rate-view-toggle">'+
    '<span style="font-size:12px;font-weight:700;color:var(--muted)">View:</span>'+
    '<button class="rate-view-btn'+(isTile?' active':'')+'" data-view="tile" onclick="setRateView(this.dataset.view)">&#9707; Tiles</button>'+
    '<button class="rate-view-btn'+(!isTile?' active':'')+'" data-view="list" onclick="setRateView(this.dataset.view)">&#9776; List</button>'+
    '<span class="rate-view-lbl">'+rows.length+' providers &middot; Best saves &#8377;'+saving.toLocaleString('en-IN')+' vs worst</span>'+
  '</div>';

  /* ── summary strip ── */
  var bestRow=rows[0], worstRow=rows[rows.length-1];
  var mmUpd=getLastUpdatedStr();
  var mmTip='The mid-market rate is the real exchange rate banks trade at, with no markup. It\'s the benchmark — every provider below applies its own margin/fee on top, so you always receive slightly less than this.';
  var summaryHtml='<div class="rate-summary-strip">'+
    '<div class="rate-summary-cell">'+
      '<div class="rate-summary-label">Best Rate Today</div>'+
      '<div class="rate-summary-val" style="color:var(--green)">&#8377;'+Math.round(best).toLocaleString('en-IN')+'</div>'+
      '<div class="rate-summary-sub">via '+bestRow.name+'</div>'+
    '</div>'+
    '<div class="rate-summary-cell">'+
      '<div class="rate-summary-label">Max You Can Save</div>'+
      '<div class="rate-summary-val" style="color:var(--amber)">&#8377;'+saving.toLocaleString('en-IN')+'</div>'+
      '<div class="rate-summary-sub">vs worst provider on same amount</div>'+
    '</div>'+
    '<div class="rate-summary-cell">'+
      '<div class="rate-summary-label" style="display:flex;align-items:center;gap:4px">Mid-Market Rate'+
        '<span title="'+mmTip+'" style="cursor:help;display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;background:var(--border);color:var(--muted);font-size:9px;font-weight:900;font-style:normal;flex-shrink:0">?</span>'+
      '</div>'+
      '<div class="rate-summary-val" style="color:var(--text2)">&#8377;'+midRate.toFixed(2)+'</div>'+
      '<div class="rate-summary-sub" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">'+
        '<img src="https://www.google.com/s2/favicons?domain=xe.com&sz=32" width="12" height="12" style="border-radius:3px;flex-shrink:0" alt="" onerror="this.style.display=\'none\'">'+
        '<span>per '+baseCur+' &middot; XE.com'+(mmUpd?' &middot; '+mmUpd:'')+'</span>'+
      '</div>'+
    '</div>'+
  '</div>';

  /* ── tile cards ── */
  var RANK_LABELS=['#1 Best','#2','#3','#4','#5','#6','#7','#8','#9','#10','#11','#12','#13','#14','#15','#16'];
  var RANK_COLORS=['var(--green)','var(--amber)','var(--amber)'];
  var tilesHtml='<div class="rate-tiles-grid">'+rows.map(function(p,i){
    var isBest=i===0, isWorst=i===rows.length-1;
    var pct=worst===best?100:Math.round(55+(p.inr-worst)/(best-worst)*45);
    var barCol=isBest?'var(--green)':isWorst?'rgba(239,68,68,.8)':'var(--amber)';
    var tileCls=isBest?' rt-best':isWorst?' rt-worst':i<3?' rt-good':'';
    var amtCls=isBest?' rt-best-amt':isWorst?' rt-worst-amt':'';
    var rankCol=isBest?'var(--green)':isWorst?'rgba(239,68,68,.8)':'var(--muted)';
    var diffAmt=Math.round(best-p.inr);
    var diffHtml=isBest
      ?'<span class="rt-diff pos">Best today</span>'
      :'<span class="rt-diff neg">-&#8377;'+diffAmt.toLocaleString('en-IN')+'</span>';
    return '<div class="rate-tile'+tileCls+'">'+
      '<div class="rt-header">'+
        rtBadge(p.name,p.link)+
        '<div class="rt-info">'+
          '<div class="rt-name" title="'+p.name+'">'+p.name+'</div>'+
          '<div class="rt-rank" style="color:'+rankCol+'">'+RANK_LABELS[i]+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="rt-amount'+amtCls+'">&#8377;'+Math.round(p.inr).toLocaleString('en-IN')+'</div>'+
      '<div class="rt-per">&#8377;'+p.rate.toFixed(4)+' per '+baseCur+'</div>'+
      '<div class="rt-bar"><div class="rt-bar-fill" style="width:'+pct+'%;background:'+barCol+'"></div></div>'+
      '<div class="rt-meta">'+((p.feeType==='incl')?baseCur+' '+p._dynFee.toFixed(2)+' fee (incl)':(p.feeType==='add')?'+'+baseCur+' '+p._dynFee.toFixed(2)+' fee extra':(p.fee>0?baseCur+' '+p.fee+' fee':'No fee'))+' &middot; '+(p.spread*100).toFixed(1)+'% margin &middot; '+p.note+'</div>'+
      '<div class="rt-footer">'+
        diffHtml+
        '<a class="rt-cta'+(p.link==='#'?' disabled':'')+'" href="'+p.link+'" target="_blank" rel="noopener">Send &rarr;</a>'+
      '</div>'+
    '</div>';
  }).join('')+'</div>';

  /* ── list rows (compact, no broken images) ── */
  var listHtml=rows.map(function(p,i){
    var isBest=i===0, isWorst=i===rows.length-1;
    var pct=worst===best?100:Math.round(55+(p.inr-worst)/(best-worst)*45);
    var barCol=isBest?'var(--green)':isWorst?'rgba(239,68,68,.8)':'var(--amber)';
    var diff=isBest?'<span class="best-tag">BEST TODAY</span>':
      '<span style="font-size:11px;color:rgba(239,68,68,.9);font-weight:700">-&#8377;'+Math.round(best-p.inr).toLocaleString('en-IN')+'</span>';
    return '<div class="rate-row'+(isBest?' best':'')+'">'+
      rtBadge(p.name,p.link)+
      '<div class="pinfo">'+
        '<div class="pname">'+p.name+' '+diff+'</div>'+
        '<div class="pmeta">'+p.note+' &middot; '+((p.feeType==='incl')?'Fee: '+baseCur+' '+p._dynFee.toFixed(2)+' (incl)':(p.feeType==='add')?'Fee: +'+baseCur+' '+p._dynFee.toFixed(2)+' extra':(p.fee>0?'Fee: '+baseCur+' '+p.fee:'No fee'))+' &middot; '+(p.spread*100).toFixed(1)+'% margin</div>'+
      '</div>'+
      '<div class="pbar-col">'+
        '<div class="pamount" style="color:'+(isBest?'var(--green)':'var(--text)')+'">&#8377;'+Math.round(p.inr).toLocaleString('en-IN')+'</div>'+
        '<div class="pamount-sub">&#8377;'+p.rate.toFixed(2)+' per '+baseCur+'</div>'+
        '<div class="pbar-track"><div class="pbar-fill" style="width:'+pct+'%;background:'+barCol+'"></div></div>'+
      '</div>'+
      '<a class="rate-cta'+(p.link==='#'?' disabled':'')+'" href="'+p.link+'" target="_blank" rel="noopener">Send Now &rarr;</a>'+
      '<div class="rate-row-mobile-cta">'+
        '<span style="font-size:11px;color:var(--muted)">'+p.note+'</span>'+
        '<a class="rate-cta-sm'+(p.link==='#'?' disabled':'')+'" href="'+p.link+'" target="_blank" rel="noopener">Send &rarr;</a>'+
      '</div>'+
    '</div>';
  }).join('');

  wrap.innerHTML=isTile
    ?toggleHtml+summaryHtml+tilesHtml
    :toggleHtml+listHtml;
  wrap.classList.remove('rt-tile','rt-list');
  wrap.classList.add(isTile?'rt-tile':'rt-list');
  wrap.style.display='block';

  document.getElementById('rate-note-text').innerHTML='<strong>&#8505;&#65039; Estimates only.</strong> Rates = live mid-market (1 '+baseCur+' = &#8377;'+midRate.toFixed(4)+') minus provider margin &amp; fee. Rates change in real time — <span style="color:var(--amber);font-weight:700">always confirm on provider site before sending.</span>';
  renderRatePreview();
  renderMarketRate();
}

// ── SIP ─────────────────────────────────────────
let sipData=[],swpData=[];
function calcSIP(){
  const sip0=parseFloat(document.getElementById('sip-amount').value)||25000;
  const rate=parseFloat(document.getElementById('sip-return').value)/100;
  const yrs=parseInt(document.getElementById('sip-years').value);
  const stepup=parseFloat(document.getElementById('sip-stepup').value)/100;
  const mr=rate/12;
  let corpus=0,totalInvested=0,sipM=sip0;
  sipData=[];
  let tbody='';
  for(let y=1;y<=yrs;y++){
    const annInvested=sipM*12;
    for(let m=0;m<12;m++){corpus=(corpus+sipM)*(1+mr);}
    totalInvested+=annInvested;
    const wealthGain=corpus-totalInvested;
    sipData.push({year:y,sipM:Math.round(sipM),annInvested:Math.round(annInvested),totalInvested:Math.round(totalInvested),corpus:Math.round(corpus),gain:Math.round(wealthGain)});
    const gainPct=Math.round(wealthGain/corpus*100);
    tbody+=`<tr><td>${y}</td><td>₹${Math.round(sipM).toLocaleString('en-IN')}</td><td>₹${Math.round(annInvested).toLocaleString('en-IN')}</td><td>₹${(totalInvested/100000).toFixed(1)}L</td><td style="color:var(--amber);font-weight:700">₹${(corpus/100000).toFixed(1)}L</td><td style="color:var(--green)">₹${(wealthGain/100000).toFixed(1)}L (${gainPct}%)</td></tr>`;
    sipM*=(1+stepup);
  }
  document.getElementById('sip-year-body').innerHTML=tbody;
  const finalCorpus=sipData[sipData.length-1].corpus;
  const finalInvested=sipData[sipData.length-1].totalInvested;
  const finalGain=finalCorpus-finalInvested;
  const sipLcL=(inr)=>midRate>0?`<div class="ri-local">≈ ${baseCur} ${(inr/midRate/100000).toFixed(1)}L</div>`:'';
  const sipLc=(inr)=>midRate>0?`<div class="ri-local">≈ ${baseCur} ${Math.round(inr/midRate).toLocaleString('en-IN')}</div>`:'';
  document.getElementById('sip-result-grid').innerHTML=`
    <div class="ri"><div class="ri-lbl">Total Invested</div><div class="ri-val" style="font-size:20px">₹${(finalInvested/100000).toFixed(1)}L</div>${sipLcL(finalInvested)}<div class="ri-sub">over ${yrs} years</div></div>
    <div class="ri"><div class="ri-lbl">Wealth Created</div><div class="ri-val">₹${(finalGain/100000).toFixed(1)}L</div>${sipLcL(finalGain)}<div class="ri-sub">returns earned</div></div>
    <div class="ri"><div class="ri-lbl">Final Corpus</div><div class="ri-val" style="color:var(--green)">₹${(finalCorpus/100000).toFixed(1)}L</div>${sipLcL(finalCorpus)}<div class="ri-sub">at ${yrs} years</div></div>
    <div class="ri"><div class="ri-lbl">Wealth Multiplier</div><div class="ri-val">×${(finalCorpus/finalInvested).toFixed(1)}</div><div class="ri-sub">your money grew</div></div>`;
  document.getElementById('sip-tip').innerHTML=`🎯 Starting at ₹${sip0.toLocaleString('en-IN')}/mo and stepping up ${(stepup*100).toFixed(0)}% annually at <strong>${rate*100}% returns</strong> turns ₹${(finalInvested/100000).toFixed(0)}L invested into <strong>₹${(finalCorpus/100000).toFixed(1)}L</strong> — ${((finalCorpus/finalInvested)).toFixed(1)}× your money.`;
  document.getElementById('sip-result').style.display='block';var _sw=document.getElementById('sip-table-wrap');var _sb=document.getElementById('sip-toggle-btn');if(_sw)_sw.style.display='';if(_sb)_sb.innerHTML='&#9650; Collapse Table';
}
function toggleYearTable(id){
  const wrap=document.getElementById(id+'-table-wrap');
  const btn=document.getElementById(id+'-toggle-btn');
  if(!wrap||!btn)return;
  const isCollapsed=wrap.style.display==='none';
  wrap.style.display=isCollapsed?'':'none';
  btn.innerHTML=isCollapsed?'&#9650; Collapse Table':'&#9660; Show Table';
}
function downloadSIPCSV(){
  const rows=[['Year','Monthly SIP (₹)','Invested in Year (₹)','Total Invested (₹)','Corpus Value (₹)','Wealth Gained (₹)']];
  sipData.forEach(r=>rows.push([r.year,r.sipM,r.annInvested,r.totalInvested,r.corpus,r.gain]));
  triggerDownload(rows.map(r=>r.join(',')).join('\n'),'text/csv','sip-projection.csv');
}

// ── SWP ─────────────────────────────────────────
function calcSWP(){
  let corpus=parseFloat(document.getElementById('swp-corpus').value)*100000;
  const wd0=parseFloat(document.getElementById('swp-monthly').value)||75000;
  const ret=parseFloat(document.getElementById('swp-return').value)/100;
  const stepup=parseFloat(document.getElementById('swp-stepup').value)/100;
  const mr=ret/12;
  let wdM=wd0,exhaustYear=null;
  swpData=[];
  let tbody='';
  for(let y=1;y<=40;y++){
    let annWd=0,annRet=0;
    for(let m=0;m<12;m++){
      const retM=corpus*mr;corpus=corpus+retM-wdM;annWd+=wdM;annRet+=retM;
      if(corpus<=0){corpus=0;}
    }
    const close=Math.max(0,corpus);
    swpData.push({year:y,wdM:Math.round(wdM),annWd:Math.round(annWd),annRet:Math.round(annRet),close});
    const depleted=close<=0;
    if(depleted&&!exhaustYear)exhaustYear=y;
    tbody+=`<tr${depleted?' style="opacity:0.5"':''}><td>${y}</td><td>₹${Math.round(wdM).toLocaleString('en-IN')}</td><td>₹${Math.round(annWd).toLocaleString('en-IN')}</td><td style="color:var(--green)">₹${Math.round(annRet).toLocaleString('en-IN')}</td><td style="color:${close>0?'var(--amber)':'var(--red)'};font-weight:700">₹${(close/100000).toFixed(1)}L</td><td style="color:${close>0?'var(--green)':'var(--red)'}">${close>0?'✔ Active':'✘ Depleted'}</td></tr>`;
    wdM*=(1+stepup);
    if(depleted)break;
  }
  document.getElementById('swp-year-body').innerHTML=tbody;
  const initCorpus=parseFloat(document.getElementById('swp-corpus').value)*100000;
  const finalClose=swpData[swpData.length-1].close;
  const totalWd=swpData.reduce((s,r)=>s+r.annWd,0);
  const swpLcL=(inr)=>midRate>0?`<div class="ri-local">≈ ${baseCur} ${(inr/midRate/100000).toFixed(1)}L</div>`:'';
  const swpLc=(inr)=>midRate>0?`<div class="ri-local">≈ ${baseCur} ${Math.round(inr/midRate).toLocaleString('en-IN')}</div>`:'';
  const swpRemL=exhaustYear?'':swpLcL(finalClose);
  document.getElementById('swp-result-grid').innerHTML=`
    <div class="ri"><div class="ri-lbl">Starting Corpus</div><div class="ri-val" style="font-size:20px">₹${(initCorpus/100000).toFixed(0)}L</div>${swpLcL(initCorpus)}</div>
    <div class="ri"><div class="ri-lbl">Monthly Withdrawal</div><div class="ri-val">₹${wd0.toLocaleString('en-IN')}</div>${swpLc(wd0)}<div class="ri-sub">starting amount</div></div>
    <div class="ri"><div class="ri-lbl">Total Withdrawn</div><div class="ri-val">₹${(totalWd/100000).toFixed(1)}L</div>${swpLcL(totalWd)}<div class="ri-sub">over plan period</div></div>
    <div class="ri"><div class="ri-lbl">${exhaustYear?'Corpus Lasts':'Corpus After 40yr'}</div><div class="ri-val" style="color:${exhaustYear?'var(--red)':'var(--green)'};">${exhaustYear?exhaustYear+' years':'₹'+(finalClose/100000).toFixed(1)+'L'}</div>${swpRemL}<div class="ri-sub">${exhaustYear?'then corpus depleted':'still remaining'}</div></div>`;
  document.getElementById('swp-verdict').innerHTML=exhaustYear
    ?`<div class="box-red">⚠️ <strong>Corpus runs out in Year ${exhaustYear}.</strong> Options: reduce monthly withdrawal · increase portfolio return · add an income source · consider a larger starting corpus.</div>`
    :`<div class="box-green">✅ <strong>Corpus is sustainable.</strong> At ${ret*100}% returns with ${(stepup*100).toFixed(0)}% annual withdrawal increase, your corpus outlasts the 40-year projection. Remaining: ₹${(finalClose/100000).toFixed(1)}L.</div>`;
  document.getElementById('swp-result').style.display='block';var _ww=document.getElementById('swp-table-wrap');var _wb=document.getElementById('swp-toggle-btn');if(_ww)_ww.style.display='';if(_wb)_wb.innerHTML='&#9650; Collapse Table';
}
function downloadSWPCSV(){
  const rows=[['Year','Monthly Withdrawal (₹)','Annual Withdrawal (₹)','Portfolio Return (₹)','Closing Corpus (₹)']];
  swpData.forEach(r=>rows.push([r.year,r.wdM,r.annWd,r.annRet,r.close]));
  triggerDownload(rows.map(r=>r.join(',')).join('\n'),'text/csv','swp-projection.csv');
}

// ── NRE vs NRO ──────────────────────────────────
function nreNroRecommend(){
  const q1=document.getElementById('nro-q1').value;
  const q2=document.getElementById('nro-q2').value;
  const q3=document.getElementById('nro-q3').value;
  let rec='';
  if(q1==='no'&&q2==='yes'&&q3==='yes')rec=`<strong>Open an NRE Account.</strong> You earn only abroad, want full repatriation, and prefer tax-free interest. NRE is perfect. Consider FCNR for large amounts to eliminate FX risk.`;
  else if(q1==='yes'&&q2==='no')rec=`<strong>Open an NRO Account.</strong> Your India-based income (rent, dividends) can only be deposited into NRO. You can still repatriate up to $1M/year after tax.`;
  else if(q1==='yes'&&q2==='yes')rec=`<strong>Open Both NRE + NRO.</strong> Route foreign income into NRE (tax-free, full repatriation) and India income into NRO. Most NRIs with mixed income use both.`;
  else rec=`<strong>Start with an NRE Account.</strong> Tax-free interest, full repatriation, ideal for foreign earnings. Add NRO later if you develop India income.`;
  document.getElementById('nrenro-rec').innerHTML=`✅ <strong>Recommendation:</strong> ${rec}<br/><br/><a href="https://www.hdfcbank.com/personal/save/accounts/nre-savings-account" target="_blank">Open NRE at HDFC →</a> &nbsp;·&nbsp; <a href="https://www.icicibank.com/nri-banking/bank-accounts/nre-savings-account" target="_blank">Open NRE at ICICI →</a>`;
  document.getElementById('nrenro-rec').style.display='block';
}

// ── HOME LOAN ────────────────────────────────────
let prepayRowCount=1;
const MAX_PREPAY=5;
function togglePrepay(){
  const sec=document.getElementById('prepay-section');
  sec.style.display=sec.style.display==='none'?'block':'none';
}
function addPrepayRow(){
  if(prepayRowCount>=MAX_PREPAY)return;
  prepayRowCount++;
  const n=prepayRowCount;
  const row=document.createElement('div');
  row.className='prepay-row';row.id='pr-'+n;
  row.style.cssText='display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-bottom:10px';
  row.innerHTML=`<div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">#${n} Amount (₹ Lakhs)</label><input type="number" id="pp-amt-${n}" placeholder="e.g. 5" min="0" class="hl-lead-inp" oninput="updatePrepayBadge()"/></div><div><label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">After Year</label><input type="number" id="pp-yr-${n}" placeholder="e.g. 10" min="1" max="30" class="hl-lead-inp" oninput="updatePrepayBadge()"/></div><div style="padding-bottom:1px"><button onclick="removePrepayRow(${n})" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);color:var(--red);width:34px;height:36px;border-radius:7px;cursor:pointer;font-size:15px;line-height:1">✕</button></div>`;
  document.getElementById('prepay-rows').appendChild(row);
  document.getElementById('prepay-add-btn').style.opacity=prepayRowCount>=MAX_PREPAY?'0.4':'1';
  document.getElementById('prepay-add-btn').disabled=prepayRowCount>=MAX_PREPAY;
  updatePrepayBadge();
}
function removePrepayRow(n){
  const row=document.getElementById('pr-'+n);
  if(row)row.remove();
  if(n===prepayRowCount)prepayRowCount--;
  document.getElementById('prepay-add-btn').style.opacity='1';
  document.getElementById('prepay-add-btn').disabled=false;
  updatePrepayBadge();
}
function getPrepayments(){
  const list=[];
  for(let i=1;i<=MAX_PREPAY;i++){
    const aEl=document.getElementById('pp-amt-'+i);
    const yEl=document.getElementById('pp-yr-'+i);
    if(!aEl||!yEl)continue;
    const amt=(parseFloat(aEl.value)||0)*100000;
    const yr=parseInt(yEl.value)||0;
    if(amt>0&&yr>=1)list.push({amt,yr});
  }
  list.sort((a,b)=>a.yr-b.yr);
  return list;
}
function updatePrepayBadge(){
  const list=getPrepayments();
  const badge=document.getElementById('prepay-badge');
  if(list.length===0){badge.style.display='none';return;}
  badge.style.display='inline';
  const total=list.reduce((s,p)=>s+p.amt,0);
  badge.textContent=`${list.length} prepayment${list.length>1?'s':''} · ₹${(total/100000).toFixed(0)}L total`;
}
function calcHomeLoan(){
  const pv=parseFloat(document.getElementById('hl-propval').value)*100000;
  const dp=parseFloat(document.getElementById('hl-down').value)/100;
  const ar=parseFloat(document.getElementById('hl-rate').value)/100;
  const yrs=parseInt(document.getElementById('hl-tenure').value);
  const prepays=getPrepayments().filter(p=>p.yr<=yrs);
  const hasPrepay=prepays.length>0;
  // Group by year (sum if same year)
  const prepayMap={};
  prepays.forEach(p=>{prepayMap[p.yr]=(prepayMap[p.yr]||0)+p.amt;});
  const loan=pv*(1-dp),mr=ar/12,n=yrs*12;
  const emi=loan*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1);
  const baseTotal=emi*n,baseTotalInt=baseTotal-loan;
  loanAmortData=[];
  let bal=loan,tbody='',totalPrinc=0,totalInterest=0,totalEMIPaid=0,totalPrepaid=0;
  let effectiveTenure=yrs,loanPaidOff=false;
  const prepayTh=hasPrepay?'<th style="color:var(--amber)">Prepayment</th>':'';
  document.querySelector('#hl-amort-table thead tr').innerHTML=`<th>Year</th><th>Opening Balance</th><th>Annual EMI</th>${prepayTh}<th>Principal Paid</th><th>Interest Paid</th><th>Closing Balance</th>`;
  for(let y=1;y<=yrs;y++){
    if(loanPaidOff)break;
    const open=bal;let annPrinc=0,annInt=0;
    for(let m=0;m<12&&bal>0;m++){
      const intM=bal*mr;const princM=Math.min(emi-intM,bal);
      annInt+=intM;annPrinc+=princM;bal-=princM;
    }
    let prepayThisYear=0;
    if(hasPrepay&&prepayMap[y]&&bal>0){
      prepayThisYear=Math.min(prepayMap[y],bal);
      bal=Math.max(0,bal-prepayThisYear);
      totalPrepaid+=prepayThisYear;
    }
    const annEMI=annPrinc+annInt;
    totalPrinc+=annPrinc+prepayThisYear;totalInterest+=annInt;totalEMIPaid+=annEMI;
    if(bal<=0&&!loanPaidOff){effectiveTenure=y;loanPaidOff=true;}
    loanAmortData.push({year:y,open,annEMI,prepay:prepayThisYear,annPrinc,annInt,close:Math.max(0,bal)});
    const prepayCell=hasPrepay?(prepayThisYear>0?`<td style="color:var(--amber);font-weight:800">₹${(prepayThisYear/100000).toFixed(1)}L ✓</td>`:`<td style="color:var(--muted)">—</td>`):'';
    const rowStyle=prepayThisYear>0?' style="background:rgba(240,165,32,0.1)"':'';
    tbody+=`<tr${rowStyle}><td>${y}</td><td>₹${(open/100000).toFixed(2)}L</td><td>₹${Math.round(annEMI).toLocaleString('en-IN')}</td>${prepayCell}<td class="principal">₹${Math.round(annPrinc).toLocaleString('en-IN')}</td><td class="interest">₹${Math.round(annInt).toLocaleString('en-IN')}</td><td>₹${(Math.max(0,bal)/100000).toFixed(2)}L</td></tr>`;
  }
  const prepayTotalCell=hasPrepay?`<td style="color:var(--amber);font-weight:800">₹${(totalPrepaid/100000).toFixed(1)}L</td>`:'';
  tbody+=`<tr><td>Total</td><td>—</td><td>₹${Math.round(totalEMIPaid).toLocaleString('en-IN')}</td>${prepayTotalCell}<td class="principal">₹${(totalPrinc/100000).toFixed(2)}L</td><td class="interest">₹${(totalInterest/100000).toFixed(2)}L</td><td>₹0</td></tr>`;
  document.getElementById('hl-amort-body').innerHTML=tbody;
  const interestSaved=hasPrepay?Math.max(0,baseTotalInt-totalInterest):0;
  const yrsSaved=hasPrepay?yrs-effectiveTenure:0;
  const prepayDesc=prepays.length>1?`${prepays.length} prepayments`:`₹${(prepays[0]?.amt/100000||0).toFixed(0)}L in yr ${prepays[0]?.yr||''}`;
  const fxEMI=midRate?`<div class="ri"><div class="ri-lbl">EMI in ${baseCur}</div><div class="ri-val" style="font-size:20px">${baseCur} ${Math.round(emi/midRate).toLocaleString()}</div><div class="ri-sub">at today's rate</div></div>`:'';
  const prepayResult=hasPrepay?`
    <div class="ri" style="border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.06)"><div class="ri-lbl">&#127881; Interest Saved</div><div class="ri-val" style="color:var(--green)">₹${(interestSaved/100000).toFixed(1)}L</div><div class="ri-sub">${prepayDesc}</div></div>
    <div class="ri" style="border:1px solid rgba(240,165,32,0.3);background:rgba(240,165,32,0.06)"><div class="ri-lbl">&#9200; New Tenure</div><div class="ri-val" style="color:var(--amber)">${effectiveTenure} yrs</div><div class="ri-sub">${yrsSaved} year${yrsSaved!==1?'s':''} saved!</div></div>`:'';
  document.getElementById('hl-result-grid').innerHTML=`
    <div class="ri"><div class="ri-lbl">Loan Amount</div><div class="ri-val" style="font-size:20px">₹${(loan/100000).toFixed(1)}L</div><div class="ri-sub">${(dp*100).toFixed(0)}% down paid</div></div>
    <div class="ri"><div class="ri-lbl">Monthly EMI</div><div class="ri-val">₹${Math.round(emi).toLocaleString('en-IN')}</div><div class="ri-sub">for ${yrs} years</div></div>
    <div class="ri"><div class="ri-lbl">Total Interest</div><div class="ri-val" style="color:var(--red)">₹${(baseTotalInt/100000).toFixed(1)}L</div><div class="ri-sub">${hasPrepay?'without prepayment':'cost of borrowing'}</div></div>
    <div class="ri"><div class="ri-lbl">Total Paid</div><div class="ri-val" style="font-size:20px">₹${((totalEMIPaid+totalPrepaid)/100000).toFixed(1)}L</div><div class="ri-sub">EMI${hasPrepay?' + ₹'+(totalPrepaid/100000).toFixed(1)+'L prepaid':''}</div></div>
    ${fxEMI}${prepayResult}`;
  document.getElementById('hl-tip').innerHTML=`<div style="font-size:13px;color:var(--amber);font-weight:800;margin-bottom:8px">💡 NRI Home Loan Checklist</div><div style="font-size:13px;color:var(--muted);line-height:1.75">• EMI debited from NRE/NRO account via ECS/NACH mandate<br/>• Power of Attorney required for local India representative<br/>• Sec 24b deduction: up to ₹2L/yr interest if filing India returns<br/>• Pre-payment: most banks allow 2 free pre-payments/yr — reduces interest significantly</div>`;
  document.getElementById('hl-result').style.display='block';
}
function downloadLoanCSV(){
  const rows=[['Year','Opening Balance (₹)','Annual EMI (₹)','Principal Paid (₹)','Interest Paid (₹)','Closing Balance (₹)']];
  loanAmortData.forEach(r=>rows.push([r.year,Math.round(r.open),Math.round(r.annEMI),Math.round(r.annPrinc),Math.round(r.annInt),Math.round(r.close)]));
  triggerDownload(rows.map(r=>r.join(',')).join('\n'),'text/csv','home-loan-schedule.csv');
}
function downloadLoanPDF(){
  const tbl=document.getElementById('hl-amort-table');
  const rate=document.getElementById('hl-rate').value;
  const tenure=document.getElementById('hl-tenure').value;
  const propval=document.getElementById('hl-propval').value;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Home Loan Schedule</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111;}h2{font-size:18px;margin-bottom:4px;}p{font-size:12px;color:#555;margin-bottom:20px;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#f3f4f6;padding:8px 12px;text-align:right;border:1px solid #ddd;font-size:11px;}th:first-child{text-align:center;}td{padding:7px 12px;border:1px solid #e5e7eb;text-align:right;}td:first-child{text-align:center;}tr:last-child{background:#f9fafb;font-weight:700;}tr:nth-child(even){background:#fafafa;}.principal{color:#059669;}.interest{color:#dc2626;}</style></head><body><h2>Home Loan Amortization Schedule</h2><p>Property: ₹${propval}L · Rate: ${rate}% p.a. · Tenure: ${tenure} years · Generated: ${new Date().toLocaleDateString()}</p>${tbl.outerHTML}
<!-- BOTTOM TAB BAR (mobile) -->
<nav class="bottom-tabs" id="bottomTabs">
  <button class="btab active" id="btab-rates" onclick="showTab('rates',document.querySelector('[data-tab=rates]'))"><span class="btab-ico">&#128202;</span><span class="btab-lbl">Rates</span></button>
  <button class="btab" id="btab-nrenro" onclick="showTab('nrenro',document.querySelector('[data-tab=nrenro]'))"><span class="btab-ico">&#127963;</span><span class="btab-lbl">FD</span></button>
  <button class="btab" id="btab-homeloan" onclick="showTab('homeloan',document.querySelector('[data-tab=homeloan]'))"><span class="btab-ico">&#127968;</span><span class="btab-lbl">Loan</span></button>
  <button class="btab" id="btab-dtaa" onclick="showTab('dtaa',document.querySelector('[data-tab=dtaa]'))"><span class="btab-ico">&#128176;</span><span class="btab-lbl">Tax</span></button>
  <button class="btab" id="btab-more" onclick="openDrawer()"><span class="btab-ico">&#9776;</span><span class="btab-lbl">More</span></button>
</nav>
</body></html>`);
  win.document.close();setTimeout(()=>{win.print();},400);
}

// ── CITY PRESETS ────────────────────────────────
const CITY_PRESETS={
  metro:{food:20000,rent:30000,transport:8000,util:6000,lifeins:5000,healthins:5000,medical:5000,edu:20000,ent:10000,travel:6000,clothing:5000,misc:5000},
  tier2:{food:15000,rent:18000,transport:5000,util:4000,lifeins:4000,healthins:3500,medical:4000,edu:12000,ent:6000,travel:4000,clothing:3000,misc:3500},
  tier3:{food:10000,rent:8000,transport:3000,util:2500,lifeins:3000,healthins:2500,medical:3000,edu:7000,ent:3000,travel:2500,clothing:2000,misc:2000},
  tier4:{food:8000,rent:5000,transport:2000,util:2000,lifeins:2500,healthins:2000,medical:2500,edu:5000,ent:2000,travel:2000,clothing:1500,misc:1500},
  tier5:{food:6000,rent:3000,transport:1500,util:1500,lifeins:2000,healthins:1500,medical:2000,edu:3000,ent:1500,travel:1500,clothing:1000,misc:1000},
};
function setCity(tier,btn){
  document.querySelectorAll('.city-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const p=CITY_PRESETS[tier];
  ['food','rent','transport','util','lifeins','healthins','medical','edu','ent','travel','clothing','misc'].forEach(k=>document.getElementById('exp-'+k).value=p[k]);
  updateExpTotal();
  // Update Step 1 hint with chosen city
  var hint=document.getElementById('rp-step1-hint');
  if(hint) hint.textContent=btn.textContent.trim();
  // Auto-expand expense grid so user can review pre-filled values
  var grid=document.getElementById('rp-exp-grid-wrap');
  var tb=document.getElementById('rp-exp-toggle-btn');
  if(grid&&grid.style.display==='none'){
    grid.style.display='block';
    if(tb) tb.innerHTML='&#9650; Collapse Expense Categories';
  }
}
// ── Hero country strip ───────────────────────────────────────────────────────
function heroPickCountry(btn, cur){
  // Find matching cur-item in the currency panel and call selectCurrency
  var items=document.querySelectorAll('.cur-item[data-val="'+cur+'"]');
  if(items.length>0) selectCurrency(items[0]);
}
// Fixed pill currencies in hero strip
var HERO_STRIP_CURS=['AED','GBP','USD','SGD','AUD','CAD','SAR','MYR','NZD','JPY'];
function updateHeroStrip(cur){
  if(!cur) return;
  var pills=document.querySelectorAll('.hero-cpill[data-cur]');
  var found=false;
  pills.forEach(function(p){
    var match=p.dataset.cur===cur;
    p.classList.toggle('active',match);
    if(match) found=true;
  });
  // If country not in the 8 pills, inject a dynamic "current country" pill
  var wrap=document.getElementById('hero-cpills');
  var dynPill=document.getElementById('hero-cpill-dyn');
  if(!found&&wrap){
    var meta=CUR_META[cur]||{flag:'🌐',name:cur};
    var cc=(cur==='EUR'?'eu':cur.toLowerCase().slice(0,2));
    var imgHtml='<img src="https://flagcdn.com/20x15/'+cc+'.png" width="16" height="12" style="border-radius:2px;vertical-align:middle;margin-right:4px" alt="'+cur+'"/> ';
    if(!dynPill){
      dynPill=document.createElement('button');
      dynPill.id='hero-cpill-dyn';
      dynPill.className='hero-cpill active';
      dynPill.dataset.cur=cur;
      dynPill.setAttribute('onclick','heroPickCountry(this,this.dataset.cur)');
      // Insert before the "+more" pill
      var morePill=wrap.querySelector('.hero-cpill-more');
      if(morePill) wrap.insertBefore(dynPill,morePill);
      else wrap.appendChild(dynPill);
    }
    dynPill.dataset.cur=cur;
    dynPill.innerHTML=imgHtml+(meta.name||cur);
    dynPill.classList.add('active');
  } else if(dynPill){
    // Country is in the 8 — remove dynamic pill
    dynPill.remove();
  }
}
function rpOpenStep(n){
  var body=document.getElementById('rp-step-body-'+n);
  var chev=document.getElementById('rp-chev-'+n);
  if(!body) return;
  body.style.display='block';
  if(chev) chev.classList.remove('rp-chev-closed');
  // scroll step into view
  var step=document.getElementById('rp-step-'+n);
  if(step) setTimeout(function(){step.scrollIntoView({behavior:'smooth',block:'nearest'});},120);
}
function rpToggleStep(n){
  var body=document.getElementById('rp-step-body-'+n);
  var chev=document.getElementById('rp-chev-'+n);
  if(!body) return;
  var open=body.style.display!=='none';
  body.style.display=open?'none':'block';
  if(chev){ if(open) chev.classList.add('rp-chev-closed'); else chev.classList.remove('rp-chev-closed'); }
}
function rpToggleResult(){
  var body=document.getElementById('rp-result-body');
  var btn=document.getElementById('rp-result-toggle');
  if(!body) return;
  var open=body.style.display!=='none';
  body.style.display=open?'none':'block';
  if(btn) btn.innerHTML=open?'&#9658; Expand':'&#9660; Collapse';
}
function rpToggleExpenses(){
  var grid=document.getElementById('rp-exp-grid-wrap');
  var btn=document.getElementById('rp-exp-toggle-btn');
  if(!grid) return;
  var open=grid.style.display!=='none';
  grid.style.display=open?'none':'block';
  if(btn) btn.innerHTML=open?'&#9998; Edit Expense Categories &#9660;':'&#9650; Collapse Expense Categories';
}
function updateExpTotal(){
  const ids=['food','rent','transport','util','lifeins','healthins','medical','edu','ent','travel','clothing','misc'];
  const total=ids.reduce((s,id)=>s+(parseFloat(document.getElementById('exp-'+id).value)||0),0);
  document.getElementById('exp-total-display').textContent='₹'+Math.round(total).toLocaleString('en-IN');
  // Show local currency equivalent in Step 2
  var loc=document.getElementById('exp-total-local');
  if(loc) loc.textContent=midRate>0?'≈ '+baseCur+' '+Math.round(total/midRate).toLocaleString('en-IN',{maximumFractionDigits:0})+'/mo':'';
  // Update Step 2 hint with total
  var h2=document.getElementById('rp-step2-hint');
  if(h2&&total>0) h2.textContent='Total: ₹'+Math.round(total).toLocaleString('en-IN')+(midRate>0?' · ≈ '+baseCur+' '+Math.round(total/midRate).toLocaleString('en-IN',{maximumFractionDigits:0}):'');
  return total;
}
// ── Init expense total on page load ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded',function(){
  updateExpTotal();
  if(typeof updateHeroStrip==='function') updateHeroStrip(baseCur||'AED');
});
document.addEventListener('input',e=>{if(e.target.id&&e.target.id.startsWith('exp-'))updateExpTotal();});

// ── RETURN PLANNER ──────────────────────────────
function calcReturn(){
  const ids=['food','rent','transport','util','lifeins','healthins','medical','edu','ent','travel','clothing','misc'];
  const baseMonthly=ids.reduce((s,id)=>s+(parseFloat(document.getElementById('exp-'+id).value)||0),0);
  const inflation=parseFloat(document.getElementById('rp-inflation').value)/100;
  const roi=parseFloat(document.getElementById('rp-roi').value)/100;
  const indiaIncome=parseFloat(document.getElementById('rp-income').value)||0;
  const years=parseInt(document.getElementById('rp-years').value);
  const savingsNow=parseFloat(document.getElementById('rp-savings').value)*100000;
  const monthlySavings=parseFloat(document.getElementById('rp-monthly').value)*100000;
  document.getElementById('exp-total-display').textContent='₹'+Math.round(baseMonthly).toLocaleString('en-IN');
  const mr=roi/12,n=years*12;
  const fvSavings=savingsNow*Math.pow(1+mr,n);
  const fvContrib=monthlySavings*(Math.pow(1+mr,n)-1)/mr;
  const projCorpus=fvSavings+fvContrib;
  const returnMonthly=baseMonthly*Math.pow(1+inflation,years);
  const shortfall=Math.max(0,returnMonthly-indiaIncome);
  const netRate=roi-inflation;
  const corpusNeeded=netRate>0?shortfall*12/netRate:shortfall*12*30;
  // Drawdown simulation — starts at return date with projCorpus
  returnProjData=[];
  let corpus=projCorpus,expM=returnMonthly,tbody='',surviveYears=0,depleted=false;
  const maxSimYears=40;
  for(let y=1;y<=maxSimYears;y++){
    const open=corpus;
    const annExp=expM*12;
    const annIncome=indiaIncome*12;
    const netWithdraw=Math.max(0,annExp-annIncome);
    const returns=corpus*roi;
    corpus=Math.max(0,corpus+returns-netWithdraw);
    const close=corpus;
    returnProjData.push({year:y,open:Math.round(open),annExp:Math.round(annExp),annIncome:Math.round(annIncome),returns:Math.round(returns),close:Math.round(close)});
    if(close>0)surviveYears=y; else if(!depleted){depleted=true;surviveYears=y;}
    const pct=projCorpus>0?close/projCorpus:0;
    const colr=close<=0?'var(--red)':pct>0.5?'var(--green)':pct>0.15?'var(--amber)':'var(--red)';
    const status=close<=0?'✘ Depleted':pct>0.5?'✔ Healthy':pct>0.15?'⚠ Low':'⚠ Critical';
    const rowStyle=close<=0?' style="opacity:0.5"':'';
    // Dual currency helpers for table cells
    const lcFmt=(v)=>midRate>0&&v>0?`<div class="rp-local">${baseCur} ${(v/midRate/100000).toFixed(1)}L</div>`:'';
    const lcClose=lcFmt(close);
    tbody+=`<tr${rowStyle}><td>${y}</td>`;
    tbody+=`<td>₹${(open/100000).toFixed(1)}L${lcFmt(open)}</td>`;
    tbody+=`<td style="color:var(--red)">₹${(annExp/100000).toFixed(1)}L${lcFmt(annExp)}</td>`;
    tbody+=`<td style="color:var(--muted)">₹${(annIncome/100000).toFixed(1)}L${lcFmt(annIncome)}</td>`;
    tbody+=`<td style="color:var(--green)">₹${(returns/100000).toFixed(1)}L${lcFmt(returns)}</td>`;
    tbody+=`<td><strong style="color:${colr}">₹${(close/100000).toFixed(1)}L</strong>${lcClose}</td>`;
    tbody+=`<td style="color:${colr};font-weight:700">${status}</td></tr>`;
    expM*=(1+inflation);
    if(depleted)break;
  }
  document.getElementById('rp-year-body').innerHTML=tbody;
  const lc=(inr)=>midRate>0?baseCur+' '+Math.round(inr/midRate).toLocaleString('en-IN'):null;
  const lcL=(inr)=>midRate>0?baseCur+' '+(inr/midRate/100000).toFixed(1)+'L':null;
  const lcSub=(inr)=>lc(inr)?`<div class="ri-local">≈ ${lc(inr)}</div>`:'';
  const lcLSub=(inr)=>lcL(inr)?`<div class="ri-local">≈ ${lcL(inr)}</div>`:'';
  const survivalLabel=depleted?`${surviveYears} years`:'40+ years';
  const survivalColor=depleted?(surviveYears<15?'var(--red)':'var(--amber)'):'var(--green)';
  const survivalSub=depleted?`corpus runs out in year ${surviveYears}`:'sustainable through 40 years';
  // Break-even monthly: max withdrawal so corpus hits ₹0 exactly at year 40
  // PV of inflation-growing annuity: PV = PMT × [1 - ((1+g)/(1+r))^n] / (r-g)
  const beNetRate=roi-inflation;
  const beN=40;
  const beFactor=beNetRate>0.0001?(1-Math.pow((1+inflation)/(1+roi),beN))/beNetRate:beN/(1+inflation);
  const beAnnual=projCorpus>0&&beFactor>0?projCorpus/beFactor:0;
  const beMonthly=Math.round(beAnnual/12);
  // Sustainable forever (real perpetuity): corpus × (roi-inflation) / 12
  const beSustainMonthly=beNetRate>0?Math.round(projCorpus*beNetRate/12):0;
  const beLcSub=midRate>0&&beMonthly>0?`<div class="ri-local">≈ ${baseCur} ${Math.round(beMonthly/midRate).toLocaleString('en-IN')}/mo</div>`:'';
  document.getElementById('rp-result-grid').innerHTML=`
    <div class="ri"><div class="ri-lbl">Monthly Expenses Today</div><div class="rp-dual"><div class="ri-val" style="font-size:20px">₹${Math.round(baseMonthly).toLocaleString('en-IN')}</div>${lcSub(baseMonthly)}</div><div class="ri-sub">before inflation</div></div>
    <div class="ri"><div class="ri-lbl">Monthly at Return</div><div class="rp-dual"><div class="ri-val">₹${Math.round(returnMonthly).toLocaleString('en-IN')}</div>${lcSub(returnMonthly)}</div><div class="ri-sub">after ${years}yr × ${(inflation*100).toFixed(0)}% inflation</div></div>
    <div class="ri"><div class="ri-lbl">Projected Corpus</div><div class="rp-dual"><div class="ri-val" style="color:${projCorpus>=corpusNeeded?'var(--green)':'var(--red)'}">₹${(projCorpus/100000).toFixed(1)}L</div>${lcLSub(projCorpus)}</div><div class="ri-sub">at return date</div></div>
    <div class="ri"><div class="ri-lbl">Corpus Required</div><div class="rp-dual"><div class="ri-val" style="font-size:20px">₹${(corpusNeeded/100000).toFixed(1)}L</div>${lcLSub(corpusNeeded)}</div><div class="ri-sub">for inflation-adjusted income</div></div>
    <div class="ri" style="border-color:${survivalColor};background:${depleted&&surviveYears<15?'rgba(239,68,68,0.06)':'rgba(74,222,128,0.05)'}"><div class="ri-lbl">&#9200; Corpus Survives</div><div class="ri-val" style="color:${survivalColor}">${survivalLabel}</div><div class="ri-sub">${survivalSub}</div></div>
    <div class="ri" style="border-color:var(--teal);background:rgba(20,184,166,0.05);grid-column:1/-1"><div class="ri-lbl">&#128181; Max Monthly Take-Home from Corpus</div><div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end;margin-top:6px"><div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">40-year drawdown (corpus → ₹0)</div><div class="ri-val" style="color:var(--teal);font-size:22px">₹${beMonthly.toLocaleString('en-IN')}<span style="font-size:13px;font-weight:500">/mo</span></div>${beLcSub}</div><div style="width:1px;background:var(--border);align-self:stretch"></div><div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">Sustainable forever (corpus stays intact)</div><div class="ri-val" style="color:var(--green);font-size:22px">₹${beSustainMonthly.toLocaleString('en-IN')}<span style="font-size:13px;font-weight:500">/mo</span></div>${midRate>0?`<div class="ri-local">≈ ${baseCur} ${Math.round(beSustainMonthly/midRate).toLocaleString('en-IN')}/mo</div>`:''}</div></div><div style="font-size:11px;color:var(--muted);margin-top:8px">&#128161; Starting monthly — grows with ${(inflation*100).toFixed(0)}% inflation each year · add India income of ₹${indiaIncome.toLocaleString('en-IN')}/mo on top</div></div>`;
  const onTrack=projCorpus>=corpusNeeded*0.9;
  const gapInr=(corpusNeeded-projCorpus);
  const gapLocal=midRate>0?` (${baseCur} ${(gapInr/midRate/100000).toFixed(1)}L)`:'';
  const projLocal=midRate>0?` · ${baseCur} ${(projCorpus/midRate/100000).toFixed(1)}L`:'';
  document.getElementById('rp-verdict').innerHTML=onTrack
    ?`<div class="box-green">✅ <strong>You're on track!</strong> Projected corpus of ₹${(projCorpus/100000).toFixed(1)}L${projLocal} covers your inflation-adjusted lifestyle. Ensure you are invested in equity mutual funds + NPS + NRE FDs for the optimal return mix.</div>`
    :`<div class="box-red">⚠️ <strong>Gap of ~₹${(gapInr/100000).toFixed(1)}L${gapLocal}.</strong> Options: stay longer abroad · increase monthly savings · reduce expenses by switching to Tier 2 city · consult a SEBI-RIA for a personalised plan.</div>`;
  // Update currency badge in results header
  var badge=document.getElementById('rp-result-cur-badge');
  if(badge&&baseCur) badge.textContent='₹ INR + '+baseCur;
  // Ensure result body is visible (not collapsed)
  var rb=document.getElementById('rp-result-body');
  var rt=document.getElementById('rp-result-toggle');
  if(rb) rb.style.display='block';
  if(rt) rt.innerHTML='&#9660; Collapse';
  var res=document.getElementById('rp-result');
  res.style.display='block';
  setTimeout(function(){res.scrollIntoView({behavior:'smooth',block:'start'});},80);
}
function toggleRpTable(){
  const wrap=document.getElementById('rp-table-wrap');
  const btn=document.getElementById('rp-table-toggle');
  const hidden=wrap.style.display==='none';
  wrap.style.display=hidden?'block':'none';
  btn.innerHTML=hidden?'&#9660; Year-by-Year Table':'&#9658; Year-by-Year Table';
}
function downloadReturnCSV(){
  const rows=[['Year','Opening Corpus (₹)','Annual Expenses (₹)','India Income (₹)','Returns Earned (₹)','Closing Corpus (₹)']];
  returnProjData.forEach(r=>rows.push([r.year,r.open,r.annExp,r.annIncome,r.returns,r.close]));
  triggerDownload(rows.map(r=>r.join(',')).join('\n'),'text/csv','return-india-projection.csv');
}

// ── HELPERS ──────────────────────────────────────
function triggerDownload(content,type,filename){
  const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);
}
// ── DRAWER ──────────────────────────────────────
const TOOL_META={
  rates:{icon:'📊',name:'Live Rates'},
  invest:{icon:'📈',name:'SIP & SWP'},
  nrenro:{icon:'🏛',name:'NRE vs NRO'},
  homeloan:{icon:'🏠',name:'Home Loan'},
  realty:{icon:'🏘️',name:'Real Estate ROI'},
  dtaa:{icon:'💰',name:'Tax & DTAA'},
  return:{icon:'✈️',name:'Return Planner'},
  edplan:{icon:'🎓',name:'Education Planner'},
  cards:{icon:'💳',name:'NRI Credit Cards'},
};
function openDrawer(){
  document.getElementById('navDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  document.getElementById('navDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.style.overflow='';
}
function showTab(id,btn){setActiveBottomTab(id);
  if(history&&history.pushState)history.pushState(null,'','#'+id);
  document.querySelectorAll('.tool-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.drawer-item').forEach(t=>t.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+id);if(!tabEl)return;
  tabEl.classList.add('active');
  // Mark active in drawer
  const drawerItem=document.querySelector(`.drawer-item[data-tab="${id}"]`);
  if(drawerItem)drawerItem.classList.add('active');
  // Update active tool bar
  const meta=TOOL_META[id]||{icon:'📊',name:'Tools'};
  const icon=document.getElementById('atbIcon');
  const name=document.getElementById('atbName');
  if(icon)icon.innerHTML=meta.icon;
  if(name)name.textContent=meta.name;
  // Close drawer & scroll to the active tab section (skip hero/rates header)
  closeDrawer();
  setTimeout(()=>{
    const el=document.getElementById('tab-'+id);
    if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-82,behavior:'smooth'});
  },50);
}

// ── INIT ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  // Deep-link: open specific tool tab when arriving from a guide page or standalone page
  const hash=location.hash;
  const TAB_IDS=['rates','timer','invest','nrenro','homeloan','return','dtaa','realty','edplan','edabroad','taxres','articles','proptds','epf','panaadhaar','budget','flights','deals','cards'];
  const _startTab=window._defaultTab||(hash&&TAB_IDS.includes(hash.slice(1))?hash.slice(1):null);
  if(_startTab){
    const btn=document.querySelector('[data-tab="'+_startTab+'"]');
    if(btn){
      showTab(_startTab,btn);
      if(_startTab==='timer')initRateTimer();
      if(_startTab==='edabroad'){initEdAbroad();if(typeof initEdExtraTools==='function')initEdExtraTools();}
      if(_startTab==='deals')initDeals();
      if(_startTab==='cards')initCards();
      setTimeout(()=>{const m=document.querySelector('.main');if(m)window.scrollTo({top:m.getBoundingClientRect().top+window.scrollY-80,behavior:'smooth'});},120);
    }
  }
  // Deep-link: handle #article/key in URL
  if(hash.startsWith('#article/')){
    const key=hash.replace('#article/','');
    showTab('articles',document.querySelector('[data-tab=articles]'));
    setTimeout(()=>openArticle(key),100);
  }
  updateExpTotal();
  // ── Render default (AED) IMMEDIATELY so page is not blank ──
  updateHeroBg('AED');
  updateAll();
  // Country → supported currency map
  const COUNTRY_CUR={
    AE:'AED',SA:'SAR',QA:'QAR',KW:'KWD',BH:'BHD',OM:'OMR', // Gulf
    MY:'MYR',SG:'SGD',                                         // SE Asia
    AU:'AUD',NZ:'NZD',                                         // Oceania
    US:'USD',CA:'CAD',                                         // Americas
    GB:'GBP',IE:'EUR',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',     // Europe
    NL:'EUR',BE:'EUR',AT:'EUR',PT:'EUR',FI:'EUR',GR:'EUR',
    IN:'AED' // Indians likely in Gulf — default AED
  };
  const SUPPORTED=Object.keys(FB);
  // Try IP detection with 3s timeout
  // Race 3 IP-geo APIs — whichever responds first wins
  function applyDetectedCur(cc){
    const cur=COUNTRY_CUR[cc]||null;
    if(cur&&SUPPORTED.includes(cur)){
      baseCur=cur;
      const el=document.querySelector(`.cur-item[data-val="${cur}"]`);
      if(el){
        document.querySelectorAll('.ci-check').forEach(c=>c.style.display='none');
        document.querySelectorAll('.cur-item').forEach(c=>c.classList.remove('active'));
        el.classList.add('active');
        const ck=document.getElementById('ck-'+cur);if(ck)ck.style.display='';
        const meta=CUR_META[cur]||{flag:'🌐',region:''};
        document.getElementById('curBtnFlag').innerHTML=meta.flag;
        document.getElementById('curBtnCode').textContent=cur;
        document.getElementById('curBtnRegion').textContent=meta.region;
        // Sync cflag pills
        document.querySelectorAll('.cflag').forEach(b=>b.classList.remove('active'));
        const pill=document.querySelector('.cflag[data-cur="'+cur+'"]');
        if(pill)pill.classList.add('active');
        updateHeroBg(cur);
      }
    }
  }
  const t=(ms)=>new Promise((_,r)=>setTimeout(()=>r('timeout'),ms));
  Promise.any([
    Promise.race([fetch('https://ipapi.co/json/').then(r=>r.json()).then(d=>d.country_code),t(4000)]),
    Promise.race([fetch('https://ip-api.com/json/').then(r=>r.json()).then(d=>d.countryCode),t(4000)]),
    Promise.race([fetch('https://ipinfo.io/json').then(r=>r.json()).then(d=>d.country),t(4000)]),
  ]).then(cc=>{if(cc&&cc!=='timeout')applyDetectedCur(cc);})
    .catch(()=>{})
    .finally(()=>{
      // Re-render with detected currency (or keep AED if detection failed)
      updateAll();
    });
});
// ══ DTAA TAX CALCULATOR ═════════════════════════════════════════════════════
const DTAA_RATES={
  AED:{country:'UAE',         interest:12.5, dividend:10, stcg:15, ltcg:10, rental:30, note:'UAE has no personal income tax. DTAA signed 1992. Submit TRC + Form 10F to bank.'},
  SAR:{country:'Saudi Arabia',interest:10,   dividend:10, stcg:15, ltcg:10, rental:30, note:'India-KSA DTAA 2006. Reduced 10% on interest/dividends. Submit TRC to claim.'},
  QAR:{country:'Qatar',       interest:10,   dividend:10, stcg:15, ltcg:10, rental:30, note:'India-Qatar DTAA 1999. Claim by submitting Tax Residency Certificate to your bank.'},
  KWD:{country:'Kuwait',      interest:10,   dividend:10, stcg:15, ltcg:10, rental:30, note:'India-Kuwait DTAA 2006. Submit TRC + Form 10F before year end for TDS relief.'},
  BHD:{country:'Bahrain',     interest:10,   dividend:10, stcg:15, ltcg:10, rental:30, note:'India-Bahrain DTAA. Bahrain has no income tax, so interest TDS reduced to 10%.'},
  OMR:{country:'Oman',        interest:12.5, dividend:12.5,stcg:15,ltcg:10, rental:30, note:'India-Oman DTAA 1997. Interest rate capped at 12.5%.'},
  MYR:{country:'Malaysia',    interest:10,   dividend:10, stcg:15, ltcg:10, rental:30, note:'India-Malaysia DTAA 1976 (revised). 10% on interest income.'},
  SGD:{country:'Singapore',   interest:15,   dividend:15, stcg:15, ltcg:10, rental:30, note:'India-Singapore DTAA 1994. Interest/dividends capped at 15%.'},
  AUD:{country:'Australia',   interest:15,   dividend:15, stcg:15, ltcg:10, rental:30, note:'India-Australia DTAA 1991. 15% withholding on interest/dividends.'},
  NZD:{country:'New Zealand', interest:10,   dividend:15, stcg:15, ltcg:10, rental:30, note:'India-NZ DTAA 1986. Interest reduced to 10%, dividends 15%.'},
  USD:{country:'USA',         interest:15,   dividend:25, stcg:15, ltcg:10, rental:30, note:'India-USA DTAA 1990. Note: Dividends TDS 25% (US treaty). FATCA compliance required for MF investments.'},
  CAD:{country:'Canada',      interest:15,   dividend:25, stcg:15, ltcg:10, rental:30, note:'India-Canada DTAA 1996. Dividends 25%, interest 15%. File ITR in India for refund.'},
  EUR:{country:'Germany/EU',  interest:10,   dividend:10, stcg:15, ltcg:10, rental:30, note:'India-Germany DTAA (representative). Most EU countries: 10–15% on interest. Check specific country treaty.'},
  GBP:{country:'UK',          interest:15,   dividend:15, stcg:15, ltcg:10, rental:30, note:'India-UK DTAA 1993. 15% on interest and dividends. Must file ITR in India to claim DTAA.'},
};
const STD_TDS={interest:31.2,dividend:20.8,stcg:15.6,ltcg:10.4,rental:31.2};
const TYPE_LABEL={interest:'NRO FD/Savings Interest',dividend:'Dividend Income',stcg:'Short-Term Capital Gains',ltcg:'Long-Term Capital Gains',rental:'Rental Income'};

function calcDTAA(){
  const cur=document.getElementById('dtaa-country').value;
  const type=document.getElementById('dtaa-type').value;
  const income=parseFloat(document.getElementById('dtaa-income').value)||0;
  const d=DTAA_RATES[cur];
  const stdRate=STD_TDS[type];
  const dtaaRate=d[type];
  const stdTax=income*stdRate/100;
  const dtaaTax=income*dtaaRate/100;
  const saving=stdTax-dtaaTax;
  const savingPct=((saving/stdTax)*100).toFixed(1);

  const fmt=v=>'₹'+Math.round(v).toLocaleString('en-IN');
  document.getElementById('dtaa-result').style.display='block';
  document.getElementById('dtaa-grid').innerHTML=`
    <div class="rg-card"><div class="rg-lbl">Standard TDS Rate</div><div class="rg-val" style="color:var(--red)">${stdRate}%</div><div class="rg-sub">Without DTAA benefit</div></div>
    <div class="rg-card"><div class="rg-lbl">DTAA Rate (${d.country})</div><div class="rg-val" style="color:var(--green)">${dtaaRate}%</div><div class="rg-sub">With treaty benefit</div></div>
    <div class="rg-card"><div class="rg-lbl">Standard TDS Amount</div><div class="rg-val" style="color:var(--red)">${fmt(stdTax)}</div><div class="rg-sub">Per year on ${fmt(income)}</div></div>
    <div class="rg-card"><div class="rg-lbl">DTAA TDS Amount</div><div class="rg-val" style="color:var(--teal)">${fmt(dtaaTax)}</div><div class="rg-sub">Reduced under treaty</div></div>
    <div class="rg-card" style="border:1px solid var(--amber-glow);background:var(--amber-dim)"><div class="rg-lbl">💰 Annual Tax Saving</div><div class="rg-val" style="color:var(--amber)">${fmt(saving)}</div><div class="rg-sub">That's ${savingPct}% less tax</div></div>
    <div class="rg-card"><div class="rg-lbl">Effective Rate After DTAA</div><div class="rg-val">${dtaaRate}%</div><div class="rg-sub">vs ${stdRate}% standard</div></div>`;

  document.getElementById('dtaa-info').innerHTML=`<strong>📋 How to Claim:</strong> ${d.note}<br><br>
    <strong>Steps:</strong> (1) Obtain Tax Residency Certificate (TRC) from your country's tax authority &nbsp;·&nbsp;
    (2) Fill <strong>Form 10F</strong> on the Indian Income Tax portal &nbsp;·&nbsp;
    (3) Submit TRC + Form 10F + self-declaration to your Indian bank/broker before receiving income &nbsp;·&nbsp;
    (4) File ITR in India to claim refund if excess TDS was deducted.`;

  // DTAA rates comparison table
  const rows=Object.entries(DTAA_RATES).map(([k,v])=>{
    const rate=v[type];
    const saving=((STD_TDS[type]-rate)/STD_TDS[type]*100).toFixed(0);
    const isCur=k===cur;
    return`<tr style="${isCur?'background:var(--amber-dim);':''}">
      <td>${v.country}</td>
      <td style="color:var(--red)">${STD_TDS[type]}%</td>
      <td style="color:var(--green);font-weight:${isCur?700:400}">${rate}%</td>
      <td style="color:var(--amber)">${saving}% saved</td>
    </tr>`;
  }).join('');
  document.getElementById('dtaa-rates-table').innerHTML=`
    <div class="card-hd" style="margin-bottom:12px"><div class="card-hd-bar"></div>DTAA Rates Comparison — ${TYPE_LABEL[type]}</div>
    <div class="year-table-wrap"><table class="year-table">
      <thead><tr><th>Country</th><th>Standard TDS</th><th>DTAA Rate</th><th>Saving</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

// ══ REAL ESTATE ROI CALCULATOR ═══════════════════════════════════════════════
function calcRealty(){
  const val=parseFloat(document.getElementById('re-value').value)||0;   // lakhs
  const dp=parseFloat(document.getElementById('re-dp').value)||20;
  const rate=parseFloat(document.getElementById('re-rate').value)||8.5;
  const tenure=parseFloat(document.getElementById('re-tenure').value)||20;
  const rent=parseFloat(document.getElementById('re-rent').value)||0;   // monthly
  const maint=parseFloat(document.getElementById('re-maint').value)||0; // annual
  const ptax=parseFloat(document.getElementById('re-ptax').value)||0;   // annual
  const apprec=parseFloat(document.getElementById('re-apprec').value)||6;
  const fdRate=parseFloat(document.getElementById('re-fd').value)||7;

  const propVal=val*100000; // in ₹
  const loanAmt=propVal*(1-dp/100);
  const downPay=propVal*(dp/100);
  const mr=rate/12/100;
  const n=tenure*12;
  const emi=loanAmt>0?Math.round(loanAmt*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1)):0;

  const annualRent=rent*12;
  const netAnnualRent=annualRent-maint-ptax;
  const grossYield=(annualRent/propVal*100).toFixed(2);
  const netYield=(netAnnualRent/propVal*100).toFixed(2);
  const annualEMI=emi*12;
  const annualCashFlow=netAnnualRent-annualEMI;
  const totalROI=(parseFloat(netYield)+apprec).toFixed(2);
  const fdReturn=(downPay*fdRate/100);
  const appreciationGain=propVal*apprec/100;
  const totalAnnualGain=netAnnualRent+appreciationGain;
  const effROI=(totalAnnualGain/propVal*100).toFixed(2);

  const fmt=v=>'₹'+Math.round(v).toLocaleString('en-IN');
  const fmtL=v=>'₹'+(v/100000).toFixed(1)+'L';
  document.getElementById('realty-result').style.display='block';
  document.getElementById('realty-grid').innerHTML=`
    <div class="rg-card"><div class="rg-lbl">Monthly EMI</div><div class="rg-val" style="color:var(--red)">${fmt(emi)}</div><div class="rg-sub">On ${fmtL(loanAmt)} loan @ ${rate}%</div></div>
    <div class="rg-card"><div class="rg-lbl">Gross Rental Yield</div><div class="rg-val">${grossYield}%</div><div class="rg-sub">Annual rent ÷ property value</div></div>
    <div class="rg-card"><div class="rg-lbl">Net Rental Yield</div><div class="rg-val" style="color:var(--teal)">${netYield}%</div><div class="rg-sub">After maintenance &amp; tax</div></div>
    <div class="rg-card"><div class="rg-lbl">Annual Cash Flow</div><div class="rg-val" style="color:${annualCashFlow>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(annualCashFlow))}</div><div class="rg-sub">${annualCashFlow>=0?'Surplus (rent > EMI)':'Shortfall (EMI > rent)'}</div></div>
    <div class="rg-card"><div class="rg-lbl">Total ROI (yield + appreciation)</div><div class="rg-val" style="color:var(--amber)">${effROI}%</div><div class="rg-sub">vs NRE FD ${fdRate}%</div></div>
    <div class="rg-card" style="${parseFloat(effROI)>fdRate?'border:1px solid var(--green);background:var(--green-dim)':'border:1px solid var(--red);background:var(--red-dim)'}">
      <div class="rg-lbl">${parseFloat(effROI)>fdRate?'✅ Beats NRE FD':'⚠️ Below NRE FD'}</div>
      <div class="rg-val">${(parseFloat(effROI)-fdRate).toFixed(1)}% ${parseFloat(effROI)>fdRate?'extra':'less'}</div>
      <div class="rg-sub">Property ROI vs FD benchmark</div></div>`;

  // Year-by-year projection (10 years)
  let pv=propVal, tbody='', cumRent=0, cumEMI=0;
  for(let y=1;y<=10;y++){
    pv*=(1+apprec/100);
    const yr=annualRent*Math.pow(1+0.04,y-1); // rent grows 4% p.a.
    cumRent+=yr; cumEMI+=annualEMI;
    const netRent=yr-maint-ptax;
    const cf=netRent-annualEMI;
    const totalReturn=cumRent+(pv-propVal)-cumEMI;
    tbody+=`<tr>
      <td>${y}</td>
      <td>${fmtL(pv)}</td>
      <td>${fmt(yr)}</td>
      <td style="color:var(--red)">${fmt(annualEMI)}</td>
      <td style="color:${cf>=0?'var(--green)':'var(--red)'}">${fmt(Math.abs(cf))} ${cf>=0?'▲':'▼'}</td>
      <td style="color:var(--amber)">${fmtL(totalReturn)}</td>
    </tr>`;
  }
  document.getElementById('realty-year-body').innerHTML=tbody;

  const verdict=parseFloat(effROI)>fdRate
    ?`<div class="info" style="border-color:var(--green)">✅ <strong>Good investment:</strong> Your total ROI of ${effROI}% beats the NRE FD benchmark of ${fdRate}%. The property generates both rental income and capital appreciation. Ensure you factor in stamp duty (5–7%), registration fees, and FEMA repatriation rules.</div>`
    :`<div class="info" style="border-color:var(--amber)">⚠️ <strong>Consider carefully:</strong> Total ROI ${effROI}% is below NRE FD at ${fdRate}%. The rental yield is low relative to the property price. Either negotiate a lower price, target higher rent, or consider NRE FD as a safer alternative. Real estate has illiquidity risk.</div>`;
  document.getElementById('realty-verdict').innerHTML=verdict;
}

// ── DASHBOARD REDESIGN JS ──────────────────────────────────────────────────
function quickSelectCur(cur, btn) {
  document.querySelectorAll('.cflag').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const item = document.querySelector('.cur-item[data-val="' + cur + '"]');
  if(item) selectCurrency(item);
}

function setActiveBottomTab(id) {
  document.querySelectorAll('.btab').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('btab-' + id);
  if(el) el.classList.add('active');
}

function updateHeroRate() {
  const v = document.getElementById('hero-rate-val');
  if(v && midRate) v.textContent = midRate.toFixed(2);
  const st = document.getElementById('hrd-status');
  if(st) st.innerHTML = rateIsLive
    ? '<div class="live-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);animation:blink 2s infinite;flex-shrink:0"></div>&nbsp;Live rate &middot; Updated ' + new Date().toLocaleTimeString()
    : '<span style="color:var(--amber)">&#127313; Approximate rate (offline fallback)</span>';
  const dr = document.getElementById('dash-rate');
  if(dr && midRate) dr.textContent = '₹' + midRate.toFixed(4);
  const dc = document.getElementById('dash-cur');
  if(dc) dc.textContent = baseCur;
  updateHeroReceive();
  syncCurrencyToCalcs();
}

function updateHeroReceive() {
  const amt = parseFloat(document.getElementById('heroAmount') && document.getElementById('heroAmount').value) || 1000;
  const el = document.getElementById('har-rcv');
  if(el && midRate) el.textContent = '\u20B9' + (amt * midRate).toLocaleString('en-IN', {maximumFractionDigits:0});
}

// ── TAX RESIDENCY CALCULATOR ─────────────────────────────────────────────────
function updateTrBar(i,v){
  const bar=document.getElementById('tr-bar-'+i);
  if(!bar)return;
  const pct=Math.min(100,Math.round(Math.max(0,parseInt(v)||0)/366*100));
  bar.style.width=pct+'%';
  bar.className='tr-bar-fill'+(pct>=50?' amber':'')+(pct>=100?' red':'');
}

function calcTaxResidency(){
  const days=[];
  for(let i=0;i<=9;i++){
    const el=document.getElementById('tr-y'+i);
    days.push(el?Math.min(366,Math.max(0,parseInt(el.value)||0)):0);
  }
  const y0=days[0]; // current year
  const prev4=days[1]+days[2]+days[3]+days[4]; // FY last 4 years
  const prev7nri=days.slice(1,8); // 7 preceding years for RNOR check

  // ── STEP 1: Is person Resident in current year? ──────────────────────────
  // Primary rule: >=182 days
  const basicResident = y0>=182;
  // Secondary rule: >=60 days AND >=365 in preceding 4 years
  // (Citizens leaving for employment abroad: secondary rule does NOT apply — treated as NRI if <182 days)
  // We assume general case (not crew/employment exception) for simplicity
  const secondaryResident = y0>=60 && prev4>=365;
  const isResident = basicResident || secondaryResident;

  // ── STEP 2: If Resident, check RNOR conditions ──────────────────────────
  // RNOR if: (a) NRI in 9 of preceding 10 years, OR (b) India stay <=729 days in preceding 7 years
  let status='NRI', statusColor='var(--teal)', bgColor='var(--teal-dim)', subtitle='';
  let rnorCondA=false, rnorCondB=false;

  if(isResident){
    // Count NRI years in preceding 10 years (days[1]..days[9] + one more but we only have 9 slots after y0)
    const nriYears=days.slice(1).filter(d=>d<182).length; // out of 9 collected years
    rnorCondA = nriYears>=9; // effectively: 9 of 9 collected, or close enough

    const prev7total=days.slice(1,8).reduce((a,b)=>a+b,0);
    rnorCondB = prev7total<=729;

    if(rnorCondA||rnorCondB){
      status='RNOR';
      statusColor='var(--amber)';
      bgColor='var(--amber-dim)';
      subtitle='Resident but Not Ordinarily Resident';
    } else {
      status='Resident';
      statusColor='var(--red)';
      bgColor='var(--red-dim)';
      subtitle='Resident & Ordinarily Resident';
    }
  } else {
    subtitle='Non-Resident Indian';
  }

  // ── STEP 3: Days remaining this year ────────────────────────────────────
  const daysLeft=366-y0; // approximate
  const daysTo182=Math.max(0,182-y0);
  const daysTo60=Math.max(0,60-y0);

  // ── RENDER ───────────────────────────────────────────────────────────────
  // Colours
  const statusConf={
    NRI:  {bg:'rgba(20,184,166,0.08)',border:'rgba(20,184,166,0.35)',color:'var(--teal)',emoji:'🌍',label:'Non-Resident Indian'},
    RNOR: {bg:'rgba(240,165,32,0.08)',border:'rgba(240,165,32,0.35)',color:'var(--amber)',emoji:'🔄',label:'Resident but Not Ordinarily Resident'},
    Resident:{bg:'rgba(239,68,68,0.07)',border:'rgba(239,68,68,0.30)',color:'#f43f5e',emoji:'🏠',label:'Resident & Ordinarily Resident'}
  };
  const sc=statusConf[status];

  // Status hero card
  document.getElementById('tr-status-hero').innerHTML=
    '<div style="background:'+sc.bg+';border:2px solid '+sc.border+';border-radius:18px;padding:26px 24px;text-align:center;margin-bottom:18px">'+
    '<div style="font-size:38px;margin-bottom:10px">'+sc.emoji+'</div>'+
    '<div style="font-size:32px;font-weight:900;color:'+sc.color+';letter-spacing:-.5px;margin-bottom:6px">'+status+'</div>'+
    '<div style="font-size:14px;font-weight:600;color:var(--muted)">'+sc.label+'</div>'+
    '</div>';

  // Threshold cards
  const prev7total=days.slice(1,8).reduce((a,b)=>a+b,0);
  document.getElementById('tr-thresholds').innerHTML=
    '<div class="tr-thresh"><div class="tr-thresh-val" style="color:'+((y0>=182)?'var(--green)':'var(--text)')+'">'+y0+' <span style="font-size:11px;font-weight:500;color:var(--muted)">/ 182</span></div><div class="tr-thresh-lbl">Days this year<br>(primary rule)</div></div>'+
    '<div class="tr-thresh"><div class="tr-thresh-val" style="color:'+(prev4>=365?'var(--green)':'var(--text)')+'">'+prev4+' <span style="font-size:11px;font-weight:500;color:var(--muted)">/ 365</span></div><div class="tr-thresh-lbl">Prior 4-yr total<br>(secondary rule)</div></div>'+
    '<div class="tr-thresh"><div class="tr-thresh-val" style="color:'+(prev7total<=729?'var(--green)':'#f43f5e')+'">'+prev7total+' <span style="font-size:11px;font-weight:500;color:var(--muted)">/ 729</span></div><div class="tr-thresh-lbl">Prior 7-yr total<br>(RNOR threshold)</div></div>';

  // Rules explanation
  const rules={
    NRI:'<strong>Why NRI?</strong> You spent '+y0+' days in India this year — below the 182-day primary threshold. The secondary rule (≥60 days + ≥365 in prior 4 years) also does not apply. You are a <strong>Non-Resident Indian</strong> for FY 2025-26.',
    RNOR:'<strong>Why RNOR?</strong> You crossed the resident threshold ('+y0+' days), but qualify for RNOR because '+(rnorCondA?'you were NRI for 9+ of the preceding 10 years':'')+(rnorCondA&&rnorCondB?' and ':'')+(rnorCondB?'your total India stay in the prior 7 years is ≤729 days':'')+'. RNOR status can last up to <strong>2 fiscal years</strong> after returning to India.',
    Resident:'<strong>Why Resident (ROR)?</strong> You spent <strong>'+y0+' days</strong> in India this year and do not qualify for RNOR. All your worldwide income is taxable in India from this fiscal year.'
  };
  document.getElementById('tr-rules').innerHTML=rules[status];

  // Implications cards
  const imp={
    NRI:[
      {icon:'💸',title:'Only India-sourced income is taxable',text:'Foreign salary, overseas business income, and capital gains abroad are not taxable in India.'},
      {icon:'🏦',title:'NRE interest is tax-free; NRO is taxable',text:'Interest earned on NRE accounts is exempt from tax. NRO account interest is taxable and subject to TDS.'},
      {icon:'📄',title:'DTAA benefits available',text:'Claim relief under the India-'+' Double Tax Avoidance Agreement to avoid being taxed twice on the same income.'}
    ],
    RNOR:[
      {icon:'🌐',title:'Foreign income still exempt — for now',text:'Only India-sourced income and income from a business controlled in India is taxable. Your overseas income stays exempt.'},
      {icon:'⏳',title:'Act now — window is limited',text:'RNOR lasts at most 2 fiscal years. This is the ideal window to repatriate NRE FD proceeds and sell overseas assets before they become taxable.'},
      {icon:'🏦',title:'NRE interest remains tax-free during RNOR',text:'Keep NRE accounts active during this period — interest is still exempt under the Income Tax Act.'}
    ],
    Resident:[
      {icon:'🌍',title:'Global income is taxable in India',text:'Foreign salary, overseas investment gains, and all worldwide income must be reported and may be taxable in India.'},
      {icon:'🔄',title:'Convert NRE account to Resident/RFC',text:'Your NRE account must be redesignated to a Resident or RFC (Resident Foreign Currency) account immediately.'},
      {icon:'📋',title:'Disclose foreign assets in ITR',text:'Foreign bank accounts, investments, and assets must be reported in Schedule FA of your Income Tax Return each year.'}
    ]
  };
  document.getElementById('tr-implications').innerHTML=imp[status].map(function(c){
    return '<div class="tr-impl-card"><div class="tr-impl-icon2">'+c.icon+'</div><div class="tr-impl-body"><div class="tr-impl-title2">'+c.title+'</div><div class="tr-impl-text2">'+c.text+'</div></div></div>';
  }).join('');

  // Next-year outlook
  let outlook='';
  if(status==='NRI'&&y0<182){
    const canStay=181-y0;
    outlook='<div class="tr-rules-card" style="border-color:rgba(20,184,166,0.25);background:rgba(20,184,166,0.06)"><strong>📊 Outlook:</strong> You can spend up to <strong>'+canStay+' more days</strong> in India this year and retain NRI status. Crossing 182 days triggers the basic Resident rule.</div>';
  } else if(status==='RNOR'){
    outlook='<div class="tr-rules-card" style="border-color:rgba(240,165,32,0.25);background:rgba(240,165,32,0.06)"><strong>⏳ Action window:</strong> RNOR status is temporary. Use this period to repatriate NRE FD proceeds, sell overseas assets, and plan your tax residency transition carefully.</div>';
  } else {
    outlook='<div class="tr-rules-card" style="border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.05)"><strong>📁 Filing requirement:</strong> As a Resident (ROR), you must file an ITR disclosing your global income and foreign assets (Schedule FA). Consult a CA if you have overseas investments.</div>';
  }
  document.getElementById('tr-nextyear').innerHTML=outlook;

  document.getElementById('tr-result').style.display='block';
}


// ── CURRENCY CONTEXT BARS ─────────────────────────────────────────────────────
const CCB_TABS=['invest','nrenro','homeloan','return','dtaa','realty','taxres'];

// ── COUNTRY PERSONALIZATION ──────────────────────────────────────────────────
const COUNTRY_HUB = {
  AED:{name:'UAE',emoji:'🇦🇪',label:'UAE NRI Hub',guide:'tax-saving.html',guideLbl:'UAE DTAA Guide'},
  SAR:{name:'Saudi Arabia',emoji:'🇸🇦',label:'Saudi NRI Hub',guide:'tax-saving.html',guideLbl:'KSA DTAA Guide'},
  QAR:{name:'Qatar',emoji:'🇶🇦',label:'Qatar NRI Hub',guide:'tax-saving.html',guideLbl:'Qatar DTAA Guide'},
  KWD:{name:'Kuwait',emoji:'🇰🇼',label:'Kuwait NRI Hub',guide:'tax-saving.html',guideLbl:'Kuwait DTAA Guide'},
  MYR:{name:'Malaysia',emoji:'🇲🇾',label:'Malaysia NRI Hub',guide:'tax-saving.html',guideLbl:'Malaysia DTAA Guide'},
  SGD:{name:'Singapore',emoji:'🇸🇬',label:'Singapore NRI Hub',guide:'tax-saving.html',guideLbl:'Singapore DTAA Guide'},
  GBP:{name:'UK',emoji:'🇬🇧',label:'UK NRI Hub',guide:'tax-saving.html',guideLbl:'UK DTAA Guide'},
  USD:{name:'USA',emoji:'🇺🇸',label:'USA NRI Hub',guide:'tax-saving.html',guideLbl:'US DTAA Guide'},
  AUD:{name:'Australia',emoji:'🇦🇺',label:'Australia NRI Hub',guide:'tax-saving.html',guideLbl:'Australia DTAA Guide'},
  CAD:{name:'Canada',emoji:'🇨🇦',label:'Canada NRI Hub',guide:'tax-saving.html',guideLbl:'Canada DTAA Guide'},
  EUR:{name:'Europe',emoji:'🇪🇺',label:'Europe NRI Hub',guide:'tax-saving.html',guideLbl:'Europe DTAA Guide'},
};
function updateCountryPersonalization(){
  const hub = COUNTRY_HUB[baseCur];
  const el = document.getElementById('countryWelcome');
  const flagEl = document.getElementById('countryWelcomeFlag');
  const txtEl = document.getElementById('countryWelcomeText');
  if(!el||!hub)return;
  flagEl.innerHTML = '<img src="https://flagcdn.com/20x15/' + baseCur.toLowerCase().slice(0,2) + '.png" width="20" height="15" style="border-radius:2px;vertical-align:middle;margin-right:4px;" alt=""/> ';
  txtEl.innerHTML = '<strong>' + hub.label + '</strong> &mdash; rates, tax &amp; guides for ' + hub.name + ' NRIs';
  el.style.display = 'flex';
}

function syncCurrencyToCalcs(){
  if(typeof updateRpLocal==='function')updateRpLocal();
  if(typeof calcEdPlan==='function')calcEdPlan();
  updateCountryPersonalization();
  if(!midRate||!baseCur)return;
  const meta=CUR_META[baseCur]||{flag:'',name:baseCur,region:''};
  CCB_TABS.forEach(tid=>{
    const flagEl=document.getElementById('ccb-flag-'+tid);
    const rateEl=document.getElementById('ccb-rate-'+tid);
    const curEl=document.getElementById('ccb-cur-'+tid);
    if(flagEl)flagEl.innerHTML=meta.flag;
    if(rateEl)rateEl.innerHTML='1 <strong>'+baseCur+'</strong> = <span>₹'+midRate.toFixed(4)+'</span>';
    if(curEl)curEl.textContent=baseCur;
    ccbConvert(tid);
  });
}
function ccbConvert(tid){
  if(!midRate)return;
  const inp=document.getElementById('ccb-inp-'+tid);
  const out=document.getElementById('ccb-out-'+tid);
  if(!inp||!out)return;
  const amt=parseFloat(inp.value);
  if(!isNaN(amt)&&amt>0){
    out.textContent='₹'+(amt*midRate).toLocaleString('en-IN',{maximumFractionDigits:0});
  } else {
    out.textContent='₹—';
  }
}

function updateRpLocal(){
  const sav=parseFloat(document.getElementById('rp-savings').value)||0;
  const mon=parseFloat(document.getElementById('rp-monthly').value)||0;
  const roi=(parseFloat(document.getElementById('rp-roi').value)||8)/100;
  const yrs=parseInt(document.getElementById('rp-years').value)||0;
  // Projected corpus at return date
  const mr=roi/12,n=yrs*12;
  const fvSav=(sav*100000)*Math.pow(1+mr,n);
  const fvCon=mr>0?(mon*100000)*(Math.pow(1+mr,n)-1)/mr:(mon*100000)*n;
  const proj=fvSav+fvCon;
  const yc=document.getElementById('rp-years-corpus');
  if(yc&&yrs>0){
    const inrStr='₹'+(proj/100000).toFixed(1)+'L projected corpus';
    const lcStr=midRate>0?' (≈ '+baseCur+' '+(proj/midRate/100000).toFixed(1)+'L)':'';
    yc.textContent=inrStr+lcStr;
  }
  if(!midRate)return;
  const sl=document.getElementById('rp-savings-local');
  const ml=document.getElementById('rp-monthly-local');
  const il=document.getElementById('rp-income-local');
  const inc=parseFloat(document.getElementById('rp-income').value)||0;
  if(sl)sl.textContent=sav>0?'≈ '+baseCur+' '+(sav*100000/midRate).toLocaleString('en-IN',{maximumFractionDigits:0}):'';
  if(ml)ml.textContent=mon>0?'≈ '+baseCur+' '+(mon*100000/midRate).toLocaleString('en-IN',{maximumFractionDigits:0})+'/mo':'';
  if(il)il.textContent=inc>0?'≈ '+baseCur+' '+Math.round(inc/midRate).toLocaleString('en-IN',{maximumFractionDigits:0})+'/mo':'';
}

// ── RETURN CHECKLIST ──────────────────────────────────────────────────────────
const CL_KEY='nri_return_checklist';
const CL_PHASES={1:[1,2,3,4,5],2:[6,7,8,9],3:[10,11,12]};
const CL_TOTAL=12;

function clLoad(){
  try{return JSON.parse(localStorage.getItem(CL_KEY)||'{}');}catch(e){return {};}
}
function clSave(state){
  try{localStorage.setItem(CL_KEY,JSON.stringify(state));}catch(e){}
}
function toggleCheck(id){
  const state=clLoad();
  state[id]=!state[id];
  clSave(state);
  renderChecklist();
}
function resetChecklist(){
  if(!confirm('Reset all checklist items?'))return;
  clSave({});
  renderChecklist();
}
function renderChecklist(){
  const state=clLoad();
  let done=0;
  for(let i=1;i<=CL_TOTAL;i++){
    const el=document.getElementById('cl-'+i);
    if(!el)continue;
    if(state['cl-'+i]){el.classList.add('done');done++;}
    else el.classList.remove('done');
  }
  // Progress bar
  const pct=Math.round((done/CL_TOTAL)*100);
  const fill=document.getElementById('cl-fill');
  const pctEl=document.getElementById('cl-pct');
  if(fill)fill.style.width=pct+'%';
  if(pctEl){
    pctEl.textContent=pct+'%';
    pctEl.style.color=pct===100?'var(--green)':pct>=50?'var(--teal)':'var(--amber)';
  }
  // Phase subtitles
  Object.entries(CL_PHASES).forEach(([phase,ids])=>{
    const phaseDone=ids.filter(i=>state['cl-'+i]).length;
    const sub=document.getElementById('cl-phase'+phase+'-sub');
    if(sub)sub.textContent=phaseDone+' / '+ids.length+' done';
  });
}
// Init checklist on page load
document.addEventListener('DOMContentLoaded',()=>{renderChecklist();});

// ── RATE ALERT SIGNUP ─────────────────────────────────────────────────────────

// ── EDUCATION CORPUS PLANNER ─────────────────────────────────────────────
function setEdCost(val){
  document.getElementById('ed-cost').value=val;
  calcEdPlan();
}

function calcEdPlan(){
  const age=parseInt(document.getElementById('ed-age').value)||0;
  const startAge=parseInt(document.getElementById('ed-start-age').value)||18;
  const duration=parseInt(document.getElementById('ed-duration').value)||4;
  const costToday=(parseFloat(document.getElementById('ed-cost').value)||0)*100000;
  const edInf=(parseFloat(document.getElementById('ed-inflation').value)||8)/100;
  const savings=(parseFloat(document.getElementById('ed-savings').value)||0)*100000;
  const sipM=parseFloat(document.getElementById('ed-sip').value)||0;
  const roi=(parseFloat(document.getElementById('ed-roi').value)||12)/100;

  const yrsToStart=Math.max(0,startAge-age);
  const mr=roi/12;
  const n=yrsToStart*12;

  // Local currency sub-labels
  const cl=document.getElementById('ed-cost-local');
  const sl=document.getElementById('ed-sip-local');
  if(cl)cl.textContent=midRate>0&&costToday>0?'≈ '+baseCur+' '+Math.round(costToday/midRate).toLocaleString('en-IN')+'/yr':'';
  if(sl)sl.textContent=midRate>0&&sipM>0?'≈ '+baseCur+' '+Math.round(sipM/midRate).toLocaleString('en-IN')+'/mo':'';

  if(yrsToStart<0||costToday===0)return;

  // Total corpus needed: sum of inflated annual costs over duration
  let totalNeeded=0;
  const annualCosts=[];
  for(let d=0;d<duration;d++){
    const inflatedCost=costToday*Math.pow(1+edInf,yrsToStart+d);
    annualCosts.push(inflatedCost);
    totalNeeded+=inflatedCost;
  }

  // Projected corpus at start age
  const fvSavings=savings*Math.pow(1+mr,n);
  const fvSip=mr>0?sipM*(Math.pow(1+mr,n)-1)/mr:sipM*n;
  const projCorpus=fvSavings+fvSip;

  const gap=totalNeeded-projCorpus;
  const onTrack=projCorpus>=totalNeeded;

  // Required SIP to meet target
  let reqSip=0;
  if(gap>0&&n>0){
    const fvNeeded=totalNeeded-fvSavings;
    reqSip=mr>0?fvNeeded*mr/(Math.pow(1+mr,n)-1):fvNeeded/n;
  }

  // Year-by-year table
  let tbody='',edDataRows=[];
  const tableYears=yrsToStart+duration;
  let corpus=savings;
  for(let y=1;y<=tableYears;y++){
    // Monthly compounding
    corpus=corpus*(1+mr)+sipM;
    const childAge=age+y;
    const isEdYear=childAge>=startAge&&childAge<startAge+duration;
    const edCostThisYear=isEdYear?costToday*Math.pow(1+edInf,y):0;
    const corpusL=(corpus/100000).toFixed(1);
    const edCostL=isEdYear?(edCostThisYear/100000).toFixed(1):'—';
    const rowClass=isEdYear?'style="background:rgba(240,165,32,0.06)"':'';
    tbody+=`<tr ${rowClass}><td>${y}</td><td>${childAge}</td><td>₹${corpusL}L</td><td>${isEdYear?'₹'+edCostL+'L':'—'}</td></tr>`;
  }
  document.getElementById('ed-table-body').innerHTML=tbody;

  // Render progress ring
  const pct=Math.min(100,Math.round(projCorpus/totalNeeded*100));
  const arc=(document.getElementById('ed-ring-arc')||{style:{},setAttribute:function(){}});
  if(arc){
    arc.style.strokeDashoffset=String(Math.round(314*(1-pct/100)));
    arc.style.stroke=onTrack?'var(--green)':pct>=70?'var(--amber)':'#f43f5e';
  }
  const ringPct=document.getElementById('ed-ring-pct');
  if(ringPct)ringPct.textContent=pct+'%';

  // Stat cards
  const lc=(inr)=>midRate>0?'≈ '+baseCur+' '+(inr/midRate/100000).toFixed(1)+'L':'';
  const qs=id=>document.getElementById(id);
  qs('ed-s-needed').textContent='₹'+(totalNeeded/100000).toFixed(1)+'L';
  qs('ed-s-needed').style.color='var(--text)';
  qs('ed-s-needed-sub').textContent=lc(totalNeeded);
  qs('ed-s-proj').textContent='₹'+(projCorpus/100000).toFixed(1)+'L';
  qs('ed-s-proj').style.color=onTrack?'var(--green)':'var(--amber)';
  qs('ed-s-proj-sub').textContent=lc(projCorpus);
  qs('ed-s-years').textContent=yrsToStart+' yrs';
  qs('ed-s-years-sub').textContent='Child '+age+' → starts at '+startAge;
  const gapLbl=qs('ed-s-gap-lbl');
  const gapVal=qs('ed-s-gap');
  if(onTrack){
    gapLbl.textContent='Surplus';
    gapVal.textContent='₹'+(Math.abs(gap)/100000).toFixed(1)+'L';
    gapVal.style.color='var(--green)';
  } else {
    gapLbl.textContent='Shortfall';
    gapVal.textContent='₹'+(gap/100000).toFixed(1)+'L';
    gapVal.style.color='#f43f5e';
  }
  qs('ed-s-gap-sub').textContent=lc(Math.abs(gap));

  // Status strip
  const statusBox=document.getElementById('ed-status-box');
  if(onTrack){
    statusBox.style.background='rgba(34,197,94,0.07)';
    statusBox.style.border='1px solid rgba(34,197,94,0.22)';
    statusBox.innerHTML='<div class="ed-status-strip-icon">✅</div><div><div class="ed-status-strip-title" style="color:var(--green)">You are on track!</div><div class="ed-status-strip-text" style="color:var(--muted)">Projected corpus of <strong style="color:var(--text)">₹'+(projCorpus/100000).toFixed(1)+'L</strong> covers the full education cost of <strong style="color:var(--text)">₹'+(totalNeeded/100000).toFixed(1)+'L</strong> with a surplus of <strong style="color:var(--green)">₹'+(Math.abs(gap)/100000).toFixed(1)+'L</strong>.</div></div>';
  } else {
    statusBox.style.background='rgba(240,165,32,0.07)';
    statusBox.style.border='1px solid rgba(240,165,32,0.22)';
    const sipStr='₹'+Math.round(reqSip).toLocaleString('en-IN')+'/mo'+(midRate>0?' (≈ '+baseCur+' '+Math.round(reqSip/midRate).toLocaleString('en-IN')+'/mo)':'');
    statusBox.innerHTML='<div class="ed-status-strip-icon">⚠️</div><div><div class="ed-status-strip-title" style="color:var(--amber)">Shortfall of ₹'+(gap/100000).toFixed(1)+'L</div><div class="ed-status-strip-text" style="color:var(--muted)">Your current SIP and savings will leave a gap. Increase your monthly SIP to close it.</div><div class="ed-sip-pill">💡 Recommended SIP: '+sipStr+'</div></div>';
  }

  document.getElementById('ed-results').style.display='block';
}

function toggleEdTable(){
  const wrap=document.getElementById('ed-table-wrap');
  const btn=document.getElementById('ed-table-toggle');
  const hidden=wrap.style.display==='none';
  wrap.style.display=hidden?'block':'none';
  btn.innerHTML=hidden?'▼ Year-by-Year Growth':'▶ Year-by-Year Growth';
}

// ── ARTICLES ──────────────────────────────────────
const ARTICLES={
  'nre-nro':{
    tag:'banking',tagLabel:'Banking',readTime:'6 min read',
    metaTitle:'NRE vs NRO Account: Which Is Better for NRIs? (2026 Guide)',
    metaDesc:'Understand the key differences between NRE and NRO accounts — tax treatment, repatriation rules, FD interest rates, and when to use each account type.',
    metaKw:'NRE account, NRO account, NRE vs NRO difference, NRI bank account India 2026',
    title:'NRE vs NRO Account: Which One Do You Actually Need?',
    content:`
      <div class="art-callout indigo"><strong>Quick answer:</strong> If you earn abroad and want tax-free returns — open an NRE account. If you have income in India (rent, dividends, pension) — you need an NRO account. Most NRIs with both income types should have both.</div>
      <h2>What Is an NRE Account?</h2>
      <p>A <strong>Non-Resident External (NRE)</strong> account lets you park your foreign earnings in India in Indian Rupees. The key benefits are hard to beat:</p>
      <ul>
        <li><strong>Tax-free interest</strong> — interest earned is completely exempt from Indian income tax</li>
        <li><strong>Fully repatriable</strong> — you can move both principal and interest back abroad at any time</li>
        <li><strong>Rupee account</strong> — you convert your foreign currency to INR at the time of deposit, so you take the exchange rate risk</li>
        <li>Available as savings accounts and fixed deposits (FDs)</li>
      </ul>
      <div class="art-callout green"><strong>Best for:</strong> Parking overseas salary savings you might want to bring back one day, or investing in Indian markets via SIP/mutual funds from a clean, tax-free account.</div>
      <h2>What Is an NRO Account?</h2>
      <p>A <strong>Non-Resident Ordinary (NRO)</strong> account is designed for income that originates in India — rent from a property, dividends from Indian stocks, pension payments, or money gifted by Indian residents.</p>
      <ul>
        <li><strong>Interest is taxable</strong> — TDS of 30% is deducted at source (can be reduced via DTAA)</li>
        <li><strong>Repatriation limit</strong> — you can repatriate up to USD 1 million per financial year after paying tax</li>
        <li>You cannot freely move money from NRO to an overseas account without satisfying FEMA conditions</li>
      </ul>
      <h2>Side-by-Side Comparison</h2>
      <table class="art-table">
        <thead><tr><th>Feature</th><th>NRE Account</th><th>NRO Account</th></tr></thead>
        <tbody>
          <tr><td>Purpose</td><td>Foreign earnings in India</td><td>India-sourced income</td></tr>
          <tr><td>Tax on Interest</td><td>Nil (fully exempt)</td><td>30% TDS</td></tr>
          <tr><td>Repatriation</td><td>Freely repatriable</td><td>Up to $1M/yr after tax</td></tr>
          <tr><td>Joint account</td><td>With another NRI only</td><td>With NRI or resident Indian</td></tr>
          <tr><td>Currency</td><td>INR (converted from forex)</td><td>INR</td></tr>
          <tr><td>Deposits from India</td><td>Not allowed</td><td>Allowed</td></tr>
        </tbody>
      </table>
      <h2>What About FCNR Accounts?</h2>
      <p>There's a third option: <strong>Foreign Currency Non-Resident (FCNR)</strong> deposits. These are fixed deposits held in your home currency (USD, AED, GBP, EUR, etc.) — so you eliminate exchange rate risk entirely. Interest is tax-free. Great for large sums you do not want to convert to INR yet.</p>
      <h2>Common Mistakes NRIs Make</h2>
      <ul>
        <li><strong>Keeping a regular savings account after becoming NRI</strong> — illegal under FEMA. Must convert to NRO within 6 months of becoming NRI.</li>
        <li><strong>Mixing foreign and India income in one account</strong> — defeats the purpose and creates tax complexity.</li>
        <li><strong>Not claiming DTAA benefit on NRO interest</strong> — you can reduce TDS from 30% to 10–15% in many countries.</li>
      </ul>
      <div class="art-callout"><strong>Action checklist:</strong> 1) Open NRE account for your overseas salary · 2) Convert your old Indian savings account to NRO · 3) Check DTAA with your country of residence to reduce NRO TDS · 4) Consider FCNR FD for amounts above ₹20L you will not touch for 1–5 years</div>
      <div class="art-cta"><div><div class="art-cta-text">Compare NRE FD Rates Across Banks</div><div class="art-cta-sub">See which bank offers the best NRE fixed deposit rate right now</div></div><button class="art-cta-btn" onclick="closeArticle();showTab('nrenro',document.querySelector('[data-tab=nrenro]'))">Open FD Calculator &#8594;</button></div>
    `},
  'tax-saving':{
    tag:'tax',
    metaTitle:'NRI Tax Saving Guide India 2026 — DTAA, ELSS, NRE FD & More',
    metaDesc:'Complete tax-saving guide for NRIs: how to use DTAA to avoid double taxation, best tax-saving investments, Section 80C options, and LTCG exemptions.',
    metaKw:'NRI tax saving India, DTAA double tax, Section 80C NRI, NRI capital gains tax 2026',tagLabel:'Tax',readTime:'8 min read',
    title:'How NRIs Can Save Tax in 2026 (DTAA, Form 15CA & More)',
    content:`
      <div class="art-callout indigo"><strong>Key principle:</strong> India taxes you on income that arises or is received in India. Foreign income is generally not taxable in India if you are an NRI. The real savings come from structuring your India-based income correctly.</div>
      <h2>Your Residential Status Determines Everything</h2>
      <p>India's tax system is residence-based, not citizenship-based. Your tax liability depends entirely on whether you are classified as:</p>
      <ul>
        <li><strong>NRI (Non-Resident Indian)</strong> — present in India fewer than 182 days in the financial year</li>
        <li><strong>RNOR (Resident but Not Ordinarily Resident)</strong> — transitional status, taxed like NRI for most foreign income</li>
        <li><strong>Resident</strong> — taxed on global income</li>
      </ul>
      <div class="art-callout"><strong>Watch your days:</strong> If you plan to visit India for extended periods, track your days carefully. Crossing 182 days in a year — or 120 days under certain conditions — can flip your status and expose your entire global income to Indian tax.</div>
      <h2>Tax-Free Income as an NRI</h2>
      <p>Several income sources are completely exempt from Indian tax for NRIs:</p>
      <ul>
        <li><strong>NRE account interest</strong> — fully exempt, no TDS, no declaration needed</li>
        <li><strong>FCNR deposit interest</strong> — fully exempt</li>
        <li><strong>Long-term capital gains on equity mutual funds</strong> — up to ₹1.25L per year tax-free (FY 2024–25 onwards)</li>
        <li><strong>Overseas income</strong> — your foreign salary, business income, or rental income abroad is not taxable in India</li>
      </ul>
      <h2>DTAA: Your Most Powerful Tax Tool</h2>
      <p>India has <strong>Double Tax Avoidance Agreements (DTAA)</strong> with 90+ countries. These treaties prevent you from paying tax twice on the same income. Key benefits:</p>
      <table class="art-table">
        <thead><tr><th>Country</th><th>NRO Interest TDS (Normal)</th><th>With DTAA</th></tr></thead>
        <tbody>
          <tr><td>UAE</td><td>30%</td><td>0% (UAE has no income tax)</td></tr>
          <tr><td>UK</td><td>30%</td><td>15%</td></tr>
          <tr><td>USA</td><td>30%</td><td>15%</td></tr>
          <tr><td>Malaysia</td><td>30%</td><td>10%</td></tr>
          <tr><td>Singapore</td><td>30%</td><td>15%</td></tr>
          <tr><td>Australia</td><td>30%</td><td>15%</td></tr>
          <tr><td>Canada</td><td>30%</td><td>25%</td></tr>
        </tbody>
      </table>
      <p>To claim DTAA benefit, submit a <strong>Tax Residency Certificate (TRC)</strong> from your country of residence to your Indian bank, along with <strong>Form 10F</strong>. The bank will then deduct TDS at the lower DTAA rate.</p>
      <h2>Form 15CA and 15CB</h2>
      <p>When you repatriate money from India (especially large amounts from NRO accounts), you need these forms:</p>
      <ul>
        <li><strong>Form 15CA</strong> — a declaration you file online on the Income Tax portal confirming tax has been paid</li>
        <li><strong>Form 15CB</strong> — a CA certificate verifying the remittance is legal and taxes are settled. Required for amounts above ₹5 lakh</li>
      </ul>
      <h2>Filing Indian Tax Returns as an NRI</h2>
      <p>You must file an Indian tax return (ITR-2) if your India-sourced income exceeds the basic exemption limit (₹2.5L under old regime, ₹3L under new regime). Even if you have no tax liability, filing is good practice and required for loan applications.</p>
      <div class="art-callout green"><strong>Big opportunity:</strong> NRIs can claim a deduction under Section 80C (up to ₹1.5L) on ELSS mutual fund investments, home loan principal, and life insurance premiums paid in India. Section 24b allows ₹2L deduction on home loan interest. These can significantly reduce your taxable India income.</div>
      <div class="art-cta"><div><div class="art-cta-text">Check Your Tax Residency Status</div><div class="art-cta-sub">Use our calculator to determine NRI / RNOR / Resident status</div></div><button class="art-cta-btn" onclick="closeArticle();showTab('taxres',document.querySelector('[data-tab=taxres]'))">Open Tax Residency Tool &#8594;</button></div>
    `},
  'home-buying':{
    tag:'property',
    metaTitle:'NRI Home Buying Guide India 2026 — Eligibility, Loan & Repatriation',
    metaDesc:'Can NRIs buy property in India? Yes. Here is everything: FEMA rules, NRI home loan eligibility, EMI from NRE account, and how to repatriate sale proceeds.',
    metaKw:'NRI home buying India, NRI property purchase, NRI home loan 2026, FEMA property NRI',tagLabel:'Property',readTime:'10 min read',
    title:'The Complete NRI Home Buying Guide (2026)',
    content:`
      <div class="art-callout indigo"><strong>Can NRIs buy property in India?</strong> Yes. NRIs and PIOs can buy residential and commercial property in India without RBI approval. Agricultural land, plantation property, and farmhouses are not permitted.</div>
      <h2>Step 1: Decide Your Structure</h2>
      <p>Before searching for property, decide:</p>
      <ul>
        <li><strong>Self-use or investment?</strong> — Tax treatment and loan eligibility differ</li>
        <li><strong>Jointly or solo?</strong> — Many NRIs add a local family member as co-owner for practical reasons (signing, possession)</li>
        <li><strong>Loan or self-funded?</strong> — NRI home loans are available from most major banks at 7.25–9% p.a.</li>
      </ul>
      <h2>Step 2: Power of Attorney (POA)</h2>
      <p>Since you are abroad, you will need a <strong>Power of Attorney</strong> — a legal document authorising a trusted person in India (parent, sibling, spouse) to act on your behalf for signing agreements, registering the property, and taking possession.</p>
      <ul>
        <li>POA must be executed before an Indian consulate or notarised and apostilled in the country where you reside</li>
        <li>The original POA must be sent to India; your representative will get it stamped and registered</li>
        <li>Use a specific POA (limited to this transaction) rather than a general POA for security</li>
      </ul>
      <h2>Step 3: NRI Home Loan Eligibility</h2>
      <p>Most major banks (SBI, ICICI, HDFC, Axis) offer NRI home loans. Key requirements:</p>
      <table class="art-table">
        <thead><tr><th>Requirement</th><th>Details</th></tr></thead>
        <tbody>
          <tr><td>NRE/NRO Account</td><td>Mandatory — EMI must be debited from your Indian account</td></tr>
          <tr><td>Min Employment</td><td>Usually 1–2 years in current job abroad</td></tr>
          <tr><td>Income proof</td><td>3–6 months payslips, employment contract, overseas bank statements</td></tr>
          <tr><td>Credit score</td><td>CIBIL score 700+ preferred; some banks accept overseas credit reports</td></tr>
          <tr><td>Max LTV</td><td>Up to 90% of property value</td></tr>
          <tr><td>Max tenure</td><td>Up to 30 years</td></tr>
        </tbody>
      </table>
      <h2>Step 4: Payment Rules (FEMA)</h2>
      <p>All payments for property must come from:</p>
      <ul>
        <li>Inward remittance from abroad via normal banking channels</li>
        <li>Funds in your NRE or NRO account</li>
        <li>Home loan proceeds</li>
      </ul>
      <p>Cash transactions are <strong>not permitted</strong>. Keep all payment records — you will need them to prove source of funds when you sell.</p>
      <h2>Step 5: Registration and Stamp Duty</h2>
      <p>Property must be registered in India. Your POA holder can execute this in your absence. Stamp duty varies by state (typically 3–7% of property value). Registration fee is typically 1%. Budget 6–8% of property value for total acquisition costs including stamp duty, registration, and legal fees.</p>
      <h2>Tax on Rental Income</h2>
      <p>If you rent out the property, rental income is taxable in India under "Income from House Property." TDS of 30% is deducted by the tenant if the tenant is an Indian resident paying rent above ₹50,000/month. You can claim deductions for municipal taxes paid and 30% standard deduction on net rent.</p>
      <h2>Selling the Property</h2>
      <ul>
        <li><strong>Short-term capital gains</strong> (held &lt;2 years): Taxed at your slab rate</li>
        <li><strong>Long-term capital gains</strong> (held &gt;2 years): 12.5% (from FY25) with no indexation benefit</li>
        <li>Buyer must deduct TDS of 20% on sale amount if seller is NRI</li>
        <li>You can repatriate sale proceeds up to the original investment amount from NRO account</li>
      </ul>
      <div class="art-callout"><strong>Pro tip:</strong> Invest in under-construction property from a RERA-registered developer. This gives legal protection, allows you to verify project status online, and ensures the builder cannot deviate from approved plans.</div>
      <div class="art-cta"><div><div class="art-cta-text">Calculate Your NRI Home Loan EMI</div><div class="art-cta-sub">See EMI, amortization schedule, and interest saved with prepayments</div></div><button class="art-cta-btn" onclick="closeArticle();showTab('homeloan',document.querySelector('[data-tab=homeloan]'))">Open Home Loan Calculator &#8594;</button></div>
    `},
  'send-money':{
    tag:'transfer',
    metaTitle:'Best Way to Send Money to India as NRI in 2026 — Wise vs InstaReM vs Remitly',
    metaDesc:'Compare the top remittance services for sending money to India: exchange rates, fees, transfer speed, and which service wins for your country.',
    metaKw:'best way to send money to India NRI, Wise vs InstaReM, remittance India 2026, lowest fee money transfer India',tagLabel:'Transfer',readTime:'5 min read',
    title:'Best Ways to Send Money to India: Full Cost Comparison',
    content:`
      <div class="art-callout green"><strong>The hidden cost:</strong> The exchange rate margin — not the fee — is where you lose the most money. A provider charging "zero fee" but offering a rate 2% below mid-market costs far more than one charging a small fee at a near-perfect rate.</div>
      <h2>How Transfer Costs Work</h2>
      <p>Every international money transfer has two components:</p>
      <ul>
        <li><strong>Exchange rate margin (spread)</strong> — the gap between the mid-market rate (what banks trade between themselves) and what you actually receive. This is the invisible cost.</li>
        <li><strong>Transfer fee</strong> — the flat or percentage fee charged per transaction. Easier to see, but often not the biggest cost.</li>
      </ul>
      <p>Example: You're sending AED 5,000 to India. Mid-market rate = ₹22.80 per AED. If a provider gives you ₹22.35 instead, that is a 2% margin — you lose ₹2,250 on that one transfer.</p>
      <h2>The Main Transfer Methods Compared</h2>
      <table class="art-table">
        <thead><tr><th>Method</th><th>Typical Margin</th><th>Fee</th><th>Speed</th><th>Best For</th></tr></thead>
        <tbody>
          <tr><td>Wise</td><td>0.4–0.6%</td><td>Small flat fee</td><td>Seconds–hours</td><td>Best overall rate</td></tr>
          <tr><td>InstaReM</td><td>0.2–0.5%</td><td>Low/nil</td><td>2–4 hours</td><td>Best for Gulf & SE Asia</td></tr>
          <tr><td>LuluMoney</td><td>0.8–1.2%</td><td>None</td><td>Same day</td><td>Gulf NRIs, cash pickup</td></tr>
          <tr><td>Bank wire (SWIFT)</td><td>2–4%</td><td>₹500–2,000</td><td>1–3 days</td><td>Large regulated transfers</td></tr>
          <tr><td>Exchange house</td><td>1–2.5%</td><td>Varies</td><td>Same day</td><td>Cash, large amounts</td></tr>
          <tr><td>Western Union / MoneyGram</td><td>2–3%</td><td>0–small</td><td>Minutes</td><td>Urgency only</td></tr>
        </tbody>
      </table>
      <h2>How to Get the Best Rate Every Time</h2>
      <ul>
        <li><strong>Always compare on our rates tab</strong> — we show estimated INR received side by side for your currency</li>
        <li><strong>Send larger amounts less frequently</strong> — many providers have flat fees, so the effective cost drops on bigger amounts</li>
        <li><strong>Time your transfers</strong> — rates fluctuate. Sending on weekdays (Tuesday–Thursday) typically gives better rates than weekends</li>
        <li><strong>Lock in a rate</strong> — Wise and some others let you lock the rate for a few hours or days. Use this if you see a good rate</li>
        <li><strong>Check for promos</strong> — InstaReM, Remitly, and others frequently run zero-fee first-transfer promotions</li>
      </ul>
      <h2>What's the Real Annual Cost?</h2>
      <p>If you send ₹5L to India per year via bank wire at a 3% margin, you lose roughly ₹15,000/year. Switching to Wise or InstaReM (0.5% margin) cuts that to ₹2,500/year — a saving of ₹12,500 every year for the same transfers.</p>
      <div class="art-callout"><strong>Tax note:</strong> Remittances to India from NRE funds are not taxable. Money in NRO accounts being repatriated may require Form 15CA/15CB above ₹5L. Gifts to parents up to ₹50,000/year from relatives are tax-free for the recipient.</div>
      <div class="art-cta"><div><div class="art-cta-text">See Live Rates for Your Currency</div><div class="art-cta-sub">Compare all providers side-by-side right now</div></div><button class="art-cta-btn" onclick="closeArticle();showTab('rates',document.querySelector('[data-tab=rates]'))">Compare Rates Now &#8594;</button></div>
    `},
  'return-planner':{
    tag:'planning',
    metaTitle:'How to Use the NRI Return Planner — Simulate Corpus & Retirement (2026)',
    metaDesc:'Step-by-step guide to using the Return Planner tool: enter savings, years abroad, monthly expenses, and see exactly how long your corpus will last in India.',
    metaKw:'NRI return to India planner, NRI retirement corpus calculator, return to India financial planning, NRI corpus simulation',tagLabel:'Planning',readTime:'5 min read',
    title:'How to Use the Return Planner: Simulate Your Corpus & Retirement',
    content:`
      <div class="art-callout indigo"><strong>What this tool does:</strong> The Return Planner projects your corpus at the time you return to India, then simulates year-by-year how long that corpus survives based on your expenses, income, inflation, and investment returns.</div>

      <h2>Step 1 — Enter Your Savings Profile</h2>
      <p><strong>Current Savings Abroad (₹ Lakhs):</strong> The total amount you have invested or saved today — NRE FDs, mutual funds, PPF, overseas savings converted to ₹. If you hold foreign currency, use today's exchange rate to estimate the ₹ equivalent.</p>
      <p><strong>Monthly Savings Rate (₹ Lakhs/mo):</strong> How much you add to this corpus every month. Include SIP, FD instalments, or any disciplined savings. Even ₹50,000/month (₹0.5L) makes a dramatic difference over 10 years.</p>
      <p>As you type, the tool shows you the <strong>local currency equivalent</strong> (e.g., MYR, USD, AED) so you can quickly cross-check against your payslip.</p>

      <h2>Step 2 — Set Your Return Timeline</h2>
      <p><strong>Years Until You Return:</strong> How many more years you plan to stay abroad and keep saving. The tool instantly shows you the <strong>projected corpus at return date</strong>, compounding your current savings and monthly contributions at your chosen ROI.</p>
      <p>Try changing this number and watch the projected corpus update — this is the most powerful input. An extra 2–3 years abroad can add crores to your corpus.</p>
      <table class="art-table">
        <thead><tr><th>Current Savings</th><th>Monthly SIP</th><th>ROI</th><th>5 Years</th><th>10 Years</th><th>15 Years</th></tr></thead>
        <tbody>
          <tr><td>₹50L</td><td>₹1.5L/mo</td><td>8%</td><td>~₹1.9 Cr</td><td>~₹4.0 Cr</td><td>~₹7.0 Cr</td></tr>
          <tr><td>₹1 Cr</td><td>₹2L/mo</td><td>8%</td><td>~₹3.1 Cr</td><td>~₹5.7 Cr</td><td>~₹9.2 Cr</td></tr>
          <tr><td>₹50L</td><td>₹1.5L/mo</td><td>10%</td><td>~₹2.1 Cr</td><td>~₹4.9 Cr</td><td>~₹9.5 Cr</td></tr>
        </tbody>
      </table>

      <h2>Step 3 — Set Your Post-Return Expenses</h2>
      <p><strong>Monthly Expenses in India (₹/mo):</strong> Your expected spending after returning — rent/EMI, groceries, utilities, education, healthcare, travel, lifestyle. Be realistic. Most NRIs underestimate this because they forget how expensive children's education and healthcare become.</p>
      <p>A practical benchmark: if you currently spend MYR 8,000/month abroad, a comfortable India equivalent is around ₹1.5–2L/month in a metro.</p>
      <p><strong>India Inflation Rate (% p.a.):</strong> Default is 6%, which is the historical average for India. Healthcare and education inflate faster (8–10%), so if those are major buckets for you, nudge this to 7%.</p>

      <h2>Step 4 — Set Corpus Return & Income</h2>
      <p><strong>Investment Return on Corpus (% p.a.):</strong> The return your corpus earns after you return. Assume 8–9% for a balanced equity+debt portfolio, or 6–7% for a conservative FD-heavy approach. Do not use aggressive equity-only assumptions for money you will actually be spending.</p>
      <p><strong>Expected India Income After Return (₹/mo):</strong> Any income you will earn in India — consultancy, rental income, part-time work, pension, interest from FDs. This reduces how much you withdraw from the corpus each month. Even ₹30,000/month in rental income can add 5–7 years to corpus life.</p>

      <h2>Reading the Results</h2>
      <p>After clicking Calculate, you will see four key outputs:</p>
      <ul>
        <li><strong>Projected Corpus at Return:</strong> What you will have when you land in India, based on your savings + contributions + ROI over the years until return.</li>
        <li><strong>Corpus Survives X Years:</strong> How many years your money lasts given your expenses, income, inflation, and investment returns.</li>
        <li><strong>Break-Even Monthly (Zero in 40 yrs):</strong> The maximum monthly spend that allows your corpus to last exactly 40 years — useful for setting a budget ceiling.</li>
        <li><strong>Sustainable Monthly (Forever):</strong> Monthly spend at which your corpus never depletes — the interest earned covers all withdrawals indefinitely.</li>
      </ul>

      <h2>The Year-by-Year Table</h2>
      <p>Click <strong>▼ Year-by-Year Table</strong> to expand the full simulation. Each row shows:</p>
      <ul>
        <li><strong>Opening / Closing Corpus:</strong> Balance at start and end of each year. Watch for the year the closing balance turns red — that is when you run out of money.</li>
        <li><strong>Investment Returns:</strong> What your corpus earned that year (grows as the corpus grows).</li>
        <li><strong>Net Annual Expenses:</strong> Your total spend minus any income — this is what actually gets withdrawn from the corpus.</li>
      </ul>
      <div class="art-callout"><strong>Pro tip — stress test your plan:</strong> Run the calculation twice. First with your "base case" numbers. Then increase expenses by 20% and reduce ROI by 1%. If the corpus still survives 30+ years in the stress case, your plan is solid. If it collapses to 15 years, you need a larger corpus or lower expenses.</div>

      <h2>Common Mistakes to Avoid</h2>
      <p><strong>Ignoring inflation:</strong> Many people enter today's expenses and use a 0% inflation assumption. At 6% inflation, ₹1L/month today becomes ₹1.8L/month in 10 years. The planner auto-escalates expenses by your entered inflation rate each year.</p>
      <p><strong>Over-estimating ROI:</strong> Using 12–15% equity returns for your post-retirement corpus is dangerous. You cannot afford a 3-year market downturn when you are actually spending the money. Use 7–9% max.</p>
      <p><strong>Forgetting one-time costs:</strong> Children's higher education, medical emergencies, home purchase. Add ₹30–50L to your required corpus as a one-time buffer for these.</p>

      <div class="art-cta"><div><div class="art-cta-text">Open the Return Planner</div><div class="art-cta-sub">Run your numbers with the interactive simulation</div></div><button class="art-cta-btn" onclick="closeArticle();showTab('return',document.querySelector('[data-tab=return]'))">Open Return Planner &#8594;</button></div>
    `},
  'retirement':{
    tag:'planning',
    metaTitle:'NRI Retirement Planning with SIP and SWP — Complete India Guide 2026',
    metaDesc:'How to build a retirement corpus using SIP while abroad and sustainably withdraw using SWP after returning to India. With real corpus numbers and tax tips.',
    metaKw:'NRI retirement planning India, SIP SWP NRI, retire in India corpus, NRI retirement calculator 2026',tagLabel:'Planning',readTime:'7 min read',
    title:'How to Plan Your India Retirement Using SIP & SWP',
    content:`
      <div class="art-callout indigo"><strong>The two-phase framework:</strong> Phase 1 — Accumulate a corpus using SIP (Systematic Investment Plan) while you are earning abroad. Phase 2 — Withdraw sustainably using SWP (Systematic Withdrawal Plan) after you return to India.</div>
      <h2>What Corpus Do You Actually Need?</h2>
      <p>The most common question — and the most personal. But here's a framework:</p>
      <ul>
        <li>Estimate your monthly expenses in India in today's money (include rent/EMI, food, healthcare, lifestyle, travel)</li>
        <li>Apply the <strong>25× rule</strong>: corpus needed = annual expenses × 25. This assumes a 4% annual withdrawal rate, which is considered sustainable for 30 years</li>
        <li>Add a buffer of 20% for healthcare costs that rise faster than inflation</li>
      </ul>
      <p>Example: If you need ₹1.5L/month (₹18L/year), your target corpus is ₹18L × 25 = <strong>₹4.5 crore</strong>. With 20% healthcare buffer, aim for ₹5.4 crore.</p>
      <h2>Building the Corpus with SIP</h2>
      <p>SIP in Indian equity mutual funds is the most efficient accumulation tool for NRIs. Key facts:</p>
      <ul>
        <li>NRIs can invest in Indian mutual funds from their NRE account (tax-free returns on equity gains up to ₹1.25L/year)</li>
        <li>Historical equity mutual fund returns: 12–15% CAGR over 10+ year periods</li>
        <li>Use <strong>step-up SIP</strong> — increase your SIP by 10% each year to match salary growth. This dramatically accelerates corpus building</li>
      </ul>
      <table class="art-table">
        <thead><tr><th>Monthly SIP</th><th>Step-Up</th><th>Years</th><th>Corpus (at 12%)</th></tr></thead>
        <tbody>
          <tr><td>₹25,000</td><td>10%/yr</td><td>15</td><td>~₹1.8 Cr</td></tr>
          <tr><td>₹50,000</td><td>10%/yr</td><td>15</td><td>~₹3.7 Cr</td></tr>
          <tr><td>₹1,00,000</td><td>10%/yr</td><td>15</td><td>~₹7.4 Cr</td></tr>
          <tr><td>₹50,000</td><td>10%/yr</td><td>20</td><td>~₹8.5 Cr</td></tr>
        </tbody>
      </table>
      <h2>Withdrawing Sustainably with SWP</h2>
      <p>Once you return to India and stop earning, switch to SWP from your corpus. Instead of selling mutual fund units in a lump sum, SWP sells just enough units each month to fund your withdrawal — while the remaining corpus keeps compounding.</p>
      <ul>
        <li>Keep withdrawal rate at or below 4–5% of corpus per year for long-term sustainability</li>
        <li>Step up your withdrawal by 5–6% per year to offset inflation</li>
        <li>Keep 1–2 years of expenses in liquid funds / FD as a buffer — do not touch equity in a market downturn</li>
      </ul>
      <div class=
      <div class="art-callout"><strong>The bucket strategy:</strong> Bucket 1 — 2 years expenses in FD/liquid fund. Bucket 2 — next 5 years in balanced/hybrid funds. Bucket 3 — remaining in equity funds. Refill Bucket 1 from Bucket 2 annually, and Bucket 2 from Bucket 3 every 3–4 years.</div>
      <h2>Tax on SWP After Return to India</h2>
      <p>When you return and become a resident, your SWP withdrawals from equity funds are taxed as capital gains:</p>
      <ul>
        <li><strong>LTCG</strong> (units held &gt;1 year): 12.5% on gains above &#8377;1.25L/year</li>
        <li><strong>STCG</strong> (units held &lt;1 year): 20%</li>
        <li>Debt fund gains: Taxed at slab rate regardless of holding period (post-2023)</li>
      </ul>
      <p>Structure your SWP to stay within the &#8377;1.25L LTCG exemption where possible, especially in early retirement years.</</p>
    `},

  'kids-education-return':{
    tag:'return',tagLabel:'Return Planning',readTime:'9 min read',
    metaTitle:'Returning to India with Kids: Schools, JEE/NEET & Education Planning (2026)',
    metaDesc:'Practical guide for NRI parents planning to return to India — how to navigate CBSE vs IB, competitive exams, international schools, and education costs.',
    metaKw:'NRI return to India kids education, JEE NEET NRI children, international schools India, CBSE IB IGCSE comparison NRI',
    title:'Returning to India with Kids: Education, Exams and Your Real Options',
    content:`
      <div class="art-callout indigo"><strong>The honest summary:</strong> India has world-class schools and deeply broken exam systems — sometimes in the same city. The good news is NRI families have more options than local parents, and planning 2 years ahead makes the difference between a smooth transition and a stressful one.</div>
      <h2>Why This Hits Differently for Returning NRIs</h2>
      <p>When you lived abroad, your children's school was a given — decent teachers, manageable workloads, reasonably fair assessment. Moving back to India introduces a different equation: a school system that ranges from genuinely excellent to overwhelmingly competitive to, in some cases, outright broken.</p>
      <p>The JEE (engineering) and NEET (medicine) entrance exams are the most competitive in the world by sheer volume — over 1.3 million students appear for NEET each year. Recent paper leak scandals have shaken confidence in the system further. For NRI parents who have spent years building a plan around returning home, discovering this landscape can be jarring.</p>
      <div class="art-callout green"><strong>Key insight:</strong> The problem is not "India" — it is not choosing the right path for your child specifically. Many NRI families who return do extremely well educationally. What fails them is assuming the system works like it did when they left, or like it works abroad.</div>
      <h2>The Four School Board Options — What Each Actually Means</h2>
      <table class="art-table">
        <thead><tr><th>Board</th><th>Best for</th><th>University pathway</th><th>Annual cost (approx)</th></tr></thead>
        <tbody>
          <tr><td><strong>CBSE</strong></td><td>Students targeting IIT, NIT, AIIMS</td><td>JEE / NEET / Indian universities</td><td>&#8377;80K &ndash; &#8377;3L</td></tr>
          <tr><td><strong>ICSE</strong></td><td>Well-rounded academics, language strength</td><td>Indian universities + some UK/Australia</td><td>&#8377;1L &ndash; &#8377;4L</td></tr>
          <tr><td><strong>IB (IBDP)</strong></td><td>Students likely heading abroad for university</td><td>US, UK, Canada, Europe — all major systems</td><td>&#8377;6L &ndash; &#8377;18L</td></tr>
          <tr><td><strong>Cambridge (IGCSE/A-Level)</strong></td><td>UK-oriented or global pathway</td><td>UK, Australia, Singapore, Canada</td><td>&#8377;5L &ndash; &#8377;15L</td></tr>
        </tbody>
      </table>
      <p>The cost difference is significant: a CBSE school might cost &#8377;1L/year, while an IB school in Mumbai or Bangalore can run &#8377;15L+. Over 5 years of senior school, that is a &#8377;50&ndash;70L difference — money that could fund 2 years of a foreign university instead.</p>
      <h2>The JEE and NEET Reality in 2026</h2>
      <p>If your child is academically strong and interested in engineering or medicine, the Indian competitive exam route is still viable — and the IITs and AIIMS remain genuinely world-class. But parents should go in with clear eyes:</p>
      <ul>
        <li><strong>JEE Advanced cutoffs:</strong> Roughly 1 in 50 JEE Main qualifiers make it to IIT. Only the top 2.5% of JEE Main candidates clear Advanced.</li>
        <li><strong>NEET:</strong> 1.3 million+ applicants for approximately 110,000 MBBS seats — a 1-in-12 shot even before quality filtering.</li>
        <li><strong>2-year coaching culture:</strong> Most serious JEE/NEET aspirants do Class 11&ndash;12 in coaching-heavy cities (Kota, Hyderabad, Chennai). This is an enormous lifestyle and psychological commitment.</li>
        <li><strong>Paper integrity concerns:</strong> The 2024 NEET paper leak scandal was a serious blow to systemic trust. The Supreme Court and NTA are under scrutiny. Reforms are pending, but uncertainty remains.</li>
      </ul>
      <div class="art-callout"><strong>Practical note:</strong> NRI children who have studied abroad often find the transition to coaching-oriented CBSE Class 11&ndash;12 genuinely difficult — not due to intelligence, but due to rote-heavy methodology. Factor in at least 6&ndash;12 months for academic adjustment.</div>
      <h2>The Four Realistic Paths for NRI Families</h2>
      <p><strong>Path 1 — International school in India, then abroad for university.</strong> Enroll in an IB or Cambridge school in a metro city. Your child gets peer stability, India exposure, and a globally recognized credential. University abroad follows naturally. Cost: &#8377;8&ndash;18L/year for school + &#8377;40&ndash;80L for undergraduate abroad.</p>
      <p><strong>Path 2 — Top CBSE school, target IIT/NIT/BITS.</strong> Works well if your child adapts to the Indian study style and has the aptitude. Outcome can be excellent — IIT graduates are among the most employable in the world. Requires genuine buy-in from the child, not just the parents.</p>
      <p><strong>Path 3 — CBSE/ICSE for school, then abroad for university.</strong> A practical middle ground. Lower school fees, normal Indian childhood, then shift abroad at 18. Increasingly chosen by NRI families who want their kids to "grow up Indian" but not be limited to Indian career options.</p>
      <p><strong>Path 4 — Return to origin country for university, spend school years in India.</strong> Some families use India as a base during the lower and middle school years (ages 6&ndash;15) and return to the UAE, Singapore, or UK for A-levels and university.</p>
      <h2>Which Cities Have the Best Options?</h2>
      <table class="art-table">
        <thead><tr><th>City</th><th>International schools</th><th>Top CBSE options</th><th>NRI family verdict</th></tr></thead>
        <tbody>
          <tr><td>Bangalore</td><td>Excellent (Indus, Inventure, Canadian International)</td><td>Strong (DPS, NPS, Greenwood)</td><td>Most popular with tech NRIs</td></tr>
          <tr><td>Mumbai</td><td>Excellent (Dhirubhai Ambani, ASB, Ecole Mondiale)</td><td>Very good</td><td>High cost of living; best school density</td></tr>
          <tr><td>Pune</td><td>Good (Symbiosis, Indus International)</td><td>Very good</td><td>Lower cost than Mumbai; growing NRI base</td></tr>
          <tr><td>Delhi / Gurgaon</td><td>Very good (GD Goenka, The Shri Ram)</td><td>Excellent</td><td>Strong for CBSE; good international options in Gurgaon</td></tr>
          <tr><td>Hyderabad</td><td>Good (Oakridge, Chirec)</td><td>Excellent (coaching culture strong)</td><td>Good value; strong STEM ecosystem</td></tr>
          <tr><td>Chennai</td><td>Limited</td><td>Very good</td><td>Strong local academics; less international variety</td></tr>
          <tr><td>Kochi / Trivandrum</td><td>Limited</td><td>Good</td><td>Good Kerala state options; quieter lifestyle</td></tr>
        </tbody>
      </table>
      <h2>The Financial Planning Angle</h2>
      <p>Most NRI families underestimate the cost of quality education in India. A 12-year IB school education can cost &#8377;1.5 &ndash; 2 crore in total fees. Add coaching for competitive exams (&#8377;2&ndash;5L/year in Kota-model programs), and education can rival your housing EMI.</p>
      <ul>
        <li><strong>Sukanya Samriddhi Yojana (SSY):</strong> If you have a daughter under 10, this scheme offers 8.2% interest tax-free. &#8377;1.5L/year max. Good base layer.</li>
        <li><strong>NRE FD ladder:</strong> Park 5-year education corpus in NRE FDs now (tax-free interest, 7.5&ndash;8% at major banks) while you still have NRI status.</li>
        <li><strong>Education loans:</strong> If your child gets into a top IIT or a foreign university, education loans are available and interest is tax-deductible under Section 80E — no cap on deduction amount.</li>
        <li><strong>Foreign remittance from parents abroad:</strong> If extended family is still abroad, gifts from NRI relatives are tax-free in India — can supplement education costs without gift tax.</li>
      </ul>
      <h2>What NRI Parents Who Have Done This Actually Say</h2>
      <p>Patterns from real returning NRI families across forums and community groups:</p>
      <ul>
        <li><strong>Plan 2 years ahead.</strong> Admissions to top IB or CBSE schools in Bangalore, Mumbai, and Gurgaon are oversubscribed. Several schools have 12&ndash;18 month waitlists. Start the application process before you land.</li>
        <li><strong>Avoid the Class 9 switch.</strong> Changing schools or boards in Class 9&ndash;10 is particularly disruptive — exams and boards solidify at that point. If possible, time your return for Class 1&ndash;6 or post-Class 10.</li>
        <li><strong>Do not push IIT if the child does not want it.</strong> The coaching burden for JEE is extreme. Families who go down this road without genuine child buy-in report the highest levels of regret.</li>
        <li><strong>Budget for tutoring.</strong> Even in good schools, the academic gap from overseas education can take 6&ndash;12 months to close. Budget &#8377;5&ndash;15K/month for subject tutoring in the transition year.</li>
      </ul>
      <div class="art-callout green"><strong>Bottom line:</strong> Returning to India with children is absolutely doable and often works out beautifully — but it requires researching schools before choosing your city, not after. The school decision should drive the neighbourhood decision, not the other way around.</div>
      <div class="art-cta"><div><div class="art-cta-text">Plan Your Return to India Financially</div><div class="art-cta-sub">Calculate corpus needed, cost of living, and tax residency timeline</div></div><button class="art-cta-btn" onclick="closeArticle();showTab('return',document.querySelector('[data-tab=return]'))">Open Return Planner &#8594;</button></div>
    `}

};
function openArticle(key){
  const art=ARTICLES[key];
  if(!art)return;
  const seoTitle=art.metaTitle||art.title+' | NRI Finance Hub';
  const seoDesc=art.metaDesc||art.title;
  document.title=seoTitle;
  let dm=document.querySelector('meta[name="description"]');
  if(dm)dm.setAttribute('content',seoDesc);
  let ogT=document.querySelector('meta[property="og:title"]');
  if(ogT)ogT.setAttribute('content',seoTitle);
  let ogD=document.querySelector('meta[property="og:description"]');
  if(ogD)ogD.setAttribute('content',seoDesc);
  let ogU=document.querySelector('meta[property="og:url"]');
  if(ogU)ogU.setAttribute('content','https://nrifinancehub.com/#article/'+key);
  history.replaceState(null,'','#article/'+key);
  const tagClass=art.tag;
  document.getElementById('art-content').innerHTML=`
    <span class="art-reader-tag art-tag ${tagClass}">${art.tagLabel}</span>
    <h1>${art.title}</h1>
    <div class="art-reader-meta">${art.readTime} &nbsp;&middot;&nbsp; Last updated June 2026 &nbsp;&middot;&nbsp; For informational purposes only</div>
    ${art.content}`;
  document.getElementById('art-list').style.display='none';
  document.getElementById('art-reader').style.display='block';
  setTimeout(()=>{
    const el=document.getElementById('tab-articles');
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },30);
}
function closeArticle(){
  document.getElementById('art-reader').style.display='none';
  document.getElementById('art-list').style.display='block';
  document.title='NRI Finance Hub — Live Remittance Rates, Calculators & Guides for Indians Abroad';
  let dm=document.querySelector('meta[name="description"]');
  if(dm)dm.setAttribute('content','Free tools for NRIs: compare live remittance rates, NRE/NRO FD rates, home loan EMI, SIP/SWP planner, DTAA tax guide and India return planner.');
  history.replaceState(null,'','#guides');
}


// ── JUMP NAV ────────────────────────────────────────────────────────────────────────
function jumpTo(id){
  const el=document.getElementById(id);
  if(!el)return;
  const offset=64;
  const top=el.getBoundingClientRect().top+window.scrollY-offset;
  window.scrollTo({top,behavior:'smooth'});
}
(function(){
  let ticking=false;
  // tab name → jn-link index mapping
  const tabOrder=['rates','nrenro','realty','dtaa','return','invest','articles'];
  window.addEventListener('scroll',function(){
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(function(){
      const jn=document.getElementById('jumpNav');
      if(!jn){ticking=false;return;}
      jn.style.display=window.scrollY>300?'block':'none';
      // highlight jn-link matching the active tab
      const activeTab=document.querySelector('.drawer-item.active');
      const activeTabName=activeTab?activeTab.getAttribute('data-tab'):'';
      const links=jn.querySelectorAll('.jn-link');
      links.forEach((l,i)=>{
        l.classList.toggle('active',tabOrder[i]===activeTabName);
      });
      ticking=false;
    });
  },{passive:true});
})();
function searchArticles(q){
  const cards=document.querySelectorAll('#art-list .art-card');
  const noRes=document.getElementById('artNoResults');
  const term=q.trim().toLowerCase();
  let visible=0;
  cards.forEach(card=>{
    const text=card.textContent.toLowerCase();
    const show=!term||text.includes(term);
    card.style.display=show?'':'none';
    if(show)visible++;
  });
  if(noRes)noRes.style.display=(visible===0&&term)?'block':'none';
}

// ── HERO WIDGET ────────────────────────────────
function updateHeroWidget(){
  var amt=parseFloat(document.getElementById('heroWidgetAmt').value)||1000;
  var el=document.getElementById('heroWidgetResult');
  if(!el)return;
  // Use P[baseCur] (the live providers object) + midRate (fetched live FX rate)
  if(typeof midRate!=='undefined'&&midRate&&typeof P!=='undefined'&&P[baseCur]){
    var bestInr=0;
    P[baseCur].forEach(function(p){
      var rate=midRate*(1-p.spread);
      var inr=Math.max(0,amt-(p.fee||0))*rate;
      if(inr>bestInr)bestInr=inr;
    });
    el.textContent=bestInr>0?'₹'+Math.round(bestInr).toLocaleString('en-IN'):'₹—';
  } else {
    el.textContent='₹—';
  }
}
// Update hero widget when currency changes
var _origSelectCurrency=typeof selectCurrency==='function'?selectCurrency:null;
if(_origSelectCurrency){
  selectCurrency=function(el){
    _origSelectCurrency(el);
    var cur=el.getAttribute('data-val');
    var flagEl=document.getElementById('heroWidgetFlag');
    var curEl=document.getElementById('heroWidgetCur');
    var curLbl=document.getElementById('heroWidgetCurLabel');
    if(flagEl)flagEl.innerHTML=el.querySelector('.ci-flag').innerHTML;
    if(curEl)curEl.textContent=cur;
    if(curLbl)curLbl.textContent=cur;
    updateHeroWidget();
  };
}
setTimeout(updateHeroWidget,1000);

// ── STAT COUNTERS ──────────────────────────────
(function(){
  var observed=false;
  var els=document.querySelectorAll('.stat-accent[data-target]');
  if(!els.length)return;
  function animateCounters(){
    if(observed)return;observed=true;
    els.forEach(function(el){
      var target=parseInt(el.getAttribute('data-target'))||0;
      var suffix=el.getAttribute('data-suffix')||'';
      var start=0;var dur=1200;var startTime=null;
      function step(ts){
        if(!startTime)startTime=ts;
        var prog=Math.min((ts-startTime)/dur,1);
        var ease=1-Math.pow(1-prog,3);
        el.textContent=Math.round(start+(target-start)*ease)+suffix;
        if(prog<1)requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting)animateCounters();});
    },{threshold:0.3});
    var statsSection=document.querySelector('.stats-section');
    if(statsSection)io.observe(statsSection);
  } else {
    setTimeout(animateCounters,500);
  }
})();

// ── NAV SCROLL EFFECT ──────────────────────────
(function(){
  var nav=document.getElementById('siteNav');
  if(!nav)return;
  window.addEventListener('scroll',function(){
    if(window.scrollY>40){
      nav.style.background='rgba(5,8,15,0.97)';
      nav.style.borderBottomColor='rgba(255,255,255,0.1)';
    } else {
      nav.style.background='rgba(5,8,15,0.85)';
      nav.style.borderBottomColor='rgba(255,255,255,0.07)';
    }
  },{passive:true});
})();

// ── THEME TOGGLE ───────────────────────────────
(function(){
  // Apply saved theme immediately to avoid flash
  var saved = localStorage.getItem('nri-theme') || 'dark';
  if(saved === 'light') document.documentElement.setAttribute('data-theme','light');
})();

function toggleTheme(){
  var current = document.documentElement.getAttribute('data-theme');
  var next = (current === 'light') ? 'dark' : 'light';
  if(next === 'dark'){
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  localStorage.setItem('nri-theme', next);
}

// ── SIP / SWP TEMPLATES ──────────────────────────────────────────────────────
function applySIPTpl(amount, ret, years, stepup) {
  document.getElementById('sip-amount').value = amount;
  document.getElementById('sip-return').value = ret;
  document.getElementById('sip-years').value = years;
  document.getElementById('sip-stepup').value = stepup;
  calcSIP();
}
function applySWPTpl(corpusLakhs, monthly, ret, inflation, stepup) {
  document.getElementById('swp-corpus').value = corpusLakhs;
  document.getElementById('swp-monthly').value = monthly;
  document.getElementById('swp-return').value = ret;
  document.getElementById('swp-inflation').value = inflation;
  document.getElementById('swp-stepup').value = stepup;
  calcSWP();
}

// ── Return to India Preview Calculator ──────────────────
function rtpSetCity(btn){
  document.querySelectorAll('.rtp-city-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('rtp-p-monthly').value=btn.dataset.monthly;
  calcRtpPreview();
}
function fmtCr(v){
  if(v>=10000000)return'\u20b9'+(v/10000000).toFixed(1)+' Cr';
  if(v>=100000)return'\u20b9'+(v/100000).toFixed(1)+' L';
  return'\u20b9'+Math.round(v).toLocaleString('en-IN');
}
var _hcpMonthly=120000,_hcpYears=5;
function calcHeroCorpus(monthly,years){
  if(monthly!==undefined)_hcpMonthly=monthly;
  if(years!==undefined)_hcpYears=years;
  monthly=_hcpMonthly; years=_hcpYears;
  var inflation=0.06,roi=0.08;
  var returnMonthly=monthly*Math.pow(1+inflation,years);
  var shortfall=Math.max(0,returnMonthly);
  var netRate=roi-inflation;
  var corpus=netRate>0?shortfall*12/netRate:shortfall*12*30;
  // SIP at 12%
  var mr=0.01,n=years*12;
  var sip=corpus*mr/(Math.pow(1+mr,n)-1);
  // Sustain years
  var c=corpus,em=returnMonthly,survive=0;
  for(var y=1;y<=50;y++){c=c+c*roi-em*12;em*=(1+inflation);if(c>0)survive=y;else break;}
  var el=document.getElementById('hcp-corpus');
  var sipEl=document.getElementById('hcp-sip');
  var susEl=document.getElementById('hcp-sustain');
  var fxEl=document.getElementById('hcp-corpus-fx');
  var sipFxEl=document.getElementById('hcp-sip-fx');
  if(el)el.textContent=fmtCr(corpus);
  var subEl=document.getElementById('hcp-corpus-sub');
  if(subEl)subEl.textContent='At 8% return · 6% inflation · '+years+' yr'+(years>1?'s':'');
  if(sipEl)sipEl.textContent=sip>0?'₹'+Math.round(sip/1000).toFixed(0)+'K/mo':'₹—';
  if(susEl)susEl.textContent=survive>=40?'40+ yrs':survive+' yrs';
  // FX equivalents
  if(typeof midRate!=='undefined'&&midRate>0&&typeof baseCur!=='undefined'){
    if(fxEl)fxEl.textContent='≈ '+baseCur+' '+Math.round(corpus/midRate/100000).toFixed(1)+'L';
    if(sipFxEl)sipFxEl.textContent='≈ '+baseCur+' '+Math.round(sip/midRate).toLocaleString('en-IN');
  } else {
    if(fxEl)fxEl.textContent='';
    if(sipFxEl)sipFxEl.textContent='';
  }
}
function hcpSetCity(btn){
  document.querySelectorAll('.hcp-city-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  calcHeroCorpus(parseFloat(btn.dataset.monthly)||120000,undefined);
}
function hcpSetYears(btn){
  document.querySelectorAll('.hcp-yr-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  calcHeroCorpus(undefined,parseInt(btn.dataset.years)||5);
}


function hcpSetTab(tabId,btn){
  document.querySelectorAll('.hcp-tab-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.hcp-tab-pane').forEach(function(p){p.classList.remove('active');});
  if(btn)btn.classList.add('active');
  var pane=document.getElementById('hcp-pane-'+tabId);
  if(pane)pane.classList.add('active');
}

var _hlAmount=3000000;
function calcHeroHomeLoan(amount){
  if(amount!==undefined)_hlAmount=amount;
  var rate=8.5/100/12,n=20*12;
  var emi=_hlAmount*rate*Math.pow(1+rate,n)/(Math.pow(1+rate,n)-1);
  var totalInterest=emi*n-_hlAmount;
  var intPct=Math.round(totalInterest/_hlAmount*100);
  var emiStr=emi>=100000?('\u20b9'+(emi/100000).toFixed(1)+'L/mo'):('\u20b9'+(emi/1000).toFixed(1)+'K/mo');
  var el=document.getElementById('hcp-hl-emi');
  var subEl=document.getElementById('hcp-hl-sub');
  var intEl=document.getElementById('hcp-hl-interest');
  var pctEl=document.getElementById('hcp-hl-pct');
  var fxEl=document.getElementById('hcp-hl-fx');
  if(el)el.textContent=emiStr;
  if(subEl)subEl.textContent='For '+fmtCr(_hlAmount)+' loan \u00b7 8.5% \u00b7 20yr';
  if(intEl)intEl.textContent=fmtCr(totalInterest);
  if(pctEl)pctEl.textContent=intPct+'% of loan';
  if(fxEl&&typeof midRate!=='undefined'&&midRate>0&&typeof baseCur!=='undefined'){
    fxEl.textContent='\u2248 '+baseCur+' '+Math.round(emi/midRate).toLocaleString('en-IN')+'/mo';
  }
}
function hlSetAmount(btn){
  document.querySelectorAll('#hcp-pane-homeloan .hcp-city-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  calcHeroHomeLoan(parseFloat(btn.dataset.loan)||3000000);
}

var _reValue=3000000;
function calcHeroRealty(val){
  if(val!==undefined)_reValue=val;
  var monthlyRent=_reValue*0.03/12;
  var val10yr=_reValue*Math.pow(1.07,10);
  var gain=val10yr-_reValue;
  var el=document.getElementById('hcp-re-val10');
  var subEl=document.getElementById('hcp-re-sub');
  var rentEl=document.getElementById('hcp-re-rent');
  var gainEl=document.getElementById('hcp-re-gain');
  var fxEl=document.getElementById('hcp-re-fx');
  if(el)el.textContent=fmtCr(val10yr);
  if(subEl)subEl.textContent='From '+fmtCr(_reValue)+' \u00b7 7% p.a. growth';
  var rentStr=monthlyRent>=100000?('\u20b9'+(monthlyRent/100000).toFixed(1)+'L/mo'):('\u20b9'+(monthlyRent/1000).toFixed(1)+'K/mo');
  if(rentEl)rentEl.textContent=rentStr;
  if(gainEl)gainEl.textContent=fmtCr(gain);
  if(fxEl&&typeof midRate!=='undefined'&&midRate>0&&typeof baseCur!=='undefined'){
    fxEl.textContent='\u2248 '+baseCur+' '+Math.round(val10yr/midRate/100000).toFixed(1)+'L';
  }
}
function reSetValue(btn){
  document.querySelectorAll('#hcp-pane-realty .hcp-city-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  calcHeroRealty(parseFloat(btn.dataset.prop)||3000000);
}

function calcRtpPreview(){
  const monthly=parseFloat(document.getElementById('rtp-p-monthly').value)||120000;
  const years=parseInt(document.getElementById('rtp-p-years').value)||5;
  const income=parseFloat(document.getElementById('rtp-p-income').value)||0;
  const inflation=0.06,roi=0.08;
  // Expenses at return date
  const returnMonthly=monthly*Math.pow(1+inflation,years);
  // Corpus needed
  const shortfall=Math.max(0,returnMonthly-income);
  const netRate=roi-inflation;
  const corpusNeeded=netRate>0?shortfall*12/netRate:shortfall*12*30;
  // Simulate survival years
  let c=corpusNeeded,em=returnMonthly,survive=0;
  for(let y=1;y<=50;y++){
    const net=Math.max(0,em*12-income*12);
    c=c+c*roi-net;
    em*=(1+inflation);
    if(c>0)survive=y; else break;
  }
  // Update DOM
  document.getElementById('rtp-r-monthly').textContent='\u20b9'+Math.round(returnMonthly).toLocaleString('en-IN');
  document.getElementById('rtp-r-monthly-sub').textContent='After 6% inflation over '+years+' yr'+(years>1?'s':'');
  document.getElementById('rtp-r-corpus').textContent=fmtCr(corpusNeeded);
  // SIP needed to build corpus in N years at 12% p.a.
  const sipRate=0.01; // 12%/12
  const sipN=years*12;
  const sipNeeded=sipN>0&&sipRate>0?corpusNeeded*sipRate/(Math.pow(1+sipRate,sipN)-1):0;
  const sipEl=document.getElementById('rtp-r-sip');
  if(sipEl)sipEl.textContent=sipNeeded>0?'\u20b9'+Math.round(sipNeeded).toLocaleString('en-IN')+'/mo':'\u20b9—';
  const sipSubEl=document.getElementById('rtp-r-sip-sub');
  if(sipSubEl)sipSubEl.textContent='Over '+years+' yr'+(years>1?'s':'')+' · 12% p.a.';
  const card=document.getElementById('rtp-r-sustain-card');
  if(survive>=40){
    document.getElementById('rtp-r-sustain').textContent='40+ yrs';
    card.className='rtp-stat good';
    document.getElementById('rtp-r-bar').style.width='100%';
  } else if(survive>=20){
    document.getElementById('rtp-r-sustain').textContent=survive+' yrs';
    card.className='rtp-stat good';
    document.getElementById('rtp-r-bar').style.width=Math.round(survive/40*100)+'%';
  } else {
    document.getElementById('rtp-r-sustain').textContent=survive+' yrs';
    card.className='rtp-stat warn';
    document.getElementById('rtp-r-bar').style.width=Math.round(survive/40*100)+'%';
  }
}
// Init on page load
window.addEventListener('DOMContentLoaded',function(){calcRtpPreview();calcHeroCorpus(120000);calcHeroHomeLoan(3000000);calcHeroRealty(3000000);});
/* ── Property TDS Calculator ── */
function calcPropTDS(){
  var sale=parseFloat(document.getElementById('pt-sale').value)||0;
  var cost=parseFloat(document.getElementById('pt-cost').value)||0;
  var hold=document.getElementById('pt-hold').value;
  var gain=Math.max(0, sale-cost);
  var tdsRate, tdsLabel, gainLabel;
  if(hold==='lt'){
    // STCG: 30% + surcharge + cess on sale price
    var sur = sale>10000000?0.15:sale>5000000?0.10:0;
    tdsRate = (0.30*(1+sur)*1.04);
    tdsLabel='STCG: 30%'+(sur>0?' + '+(sur*100)+'% sur':'')+' + 4% cess';
    gainLabel='Short-term gain';
  } else {
    // LTCG: 20% + surcharge + cess
    var sur2 = sale>20000000?0.25:sale>10000000?0.15:sale>5000000?0.10:0;
    tdsRate = (0.20*(1+sur2)*1.04);
    tdsLabel='LTCG: 20%'+(sur2>0?' + '+(sur2*100)+'% sur':'')+' + 4% cess';
    gainLabel='Long-term gain (indexed)';
  }
  var tdsAmt = sale * tdsRate;
  var net = sale - tdsAmt;
  document.getElementById('pt-rate').textContent = (tdsRate*100).toFixed(2)+'%';
  document.getElementById('pt-tds').textContent = fmtCr(tdsAmt);
  document.getElementById('pt-tds-sub').textContent = tdsLabel;
  document.getElementById('pt-gain').textContent = fmtCr(gain);
  document.getElementById('pt-gain-sub').textContent = gainLabel;
  document.getElementById('pt-net').textContent = fmtCr(net);
  var fxStr='';
  if(typeof midRate!=='undefined'&&midRate>0&&typeof baseCur!=='undefined'){
    fxStr = '≈ '+baseCur+' '+Math.round(net/midRate).toLocaleString('en-IN');
  }
  document.getElementById('pt-net-sub').textContent = fxStr||'After TDS deduction';
  var advice = document.getElementById('pt-advice');
  if(advice){
    var tips = hold==='gt'
      ? '<strong>💡 Section 54 Exemption:</strong> Reinvest capital gains in another residential property within 2 years (or under construction within 3 years) to claim full LTCG exemption. Or invest in Capital Gains Bonds (Section 54EC) within 6 months — up to ₹50L exempt.<br><br><strong>📋 Lower TDS:</strong> Apply to your Assessing Officer for a Lower Deduction Certificate under Section 197 before the sale to reduce TDS to actual tax liability.'
      : '<strong>⚠️ Short-term Capital Gain:</strong> TDS applies at 30% on the full sale price since holding period is under 2 years. Very limited exemptions available. Consider deferring sale beyond 2 years if possible to benefit from LTCG rates.';
    advice.innerHTML = tips;
  }
}

/* ── EPF Withdrawal Calculator ── */
function calcEPF(){
  var bal=parseFloat(document.getElementById('epf-bal').value)||0;
  var yrs=parseFloat(document.getElementById('epf-yrs').value)||0;
  var sal=parseFloat(document.getElementById('epf-sal').value)||0;
  var reason=document.getElementById('epf-reason').value;
  // EPS: ₹1250/month capped, up to 10 years
  var epsMonths = Math.min(yrs*12, 120);
  var epsPerMonth = Math.min(sal*0.0833, 1250);
  var epsAmt = epsMonths * epsPerMonth;
  // EPF = balance (includes both employee + employer contributions)
  var epfAmt = bal;
  // Taxability
  var taxFree = yrs>=5 || reason==='retire';
  var tds=0, taxNote='';
  if(!taxFree){
    if(bal>50000){ tds=bal*0.10; taxNote='10% TDS deducted (service < 5 yrs, balance > ₹50K)'; }
    else { taxNote='No TDS but taxable as salary income in ITR'; }
  } else {
    taxNote = yrs>=5 ? 'Tax-free (5+ years service)' : 'Tax-free (retirement)';
  }
  var net = epfAmt - tds;
  document.getElementById('epf-out-epf').textContent = fmtCr(epfAmt);
  document.getElementById('epf-out-eps').textContent = fmtCr(epsAmt);
  document.getElementById('epf-eps-sub').textContent = yrs>=10?'Eligible for monthly pension':'Lump sum (< 10 yrs)';
  document.getElementById('epf-out-tax').textContent = taxFree?'Tax-Free':'Taxable';
  document.getElementById('epf-out-tax').style.color = taxFree?'var(--teal)':'var(--amber)';
  document.getElementById('epf-tax-sub').textContent = taxNote;
  document.getElementById('epf-out-net').textContent = fmtCr(net);
  var fxStr='';
  if(typeof midRate!=='undefined'&&midRate>0&&typeof baseCur!=='undefined'){
    fxStr='≈ '+baseCur+' '+Math.round(net/midRate).toLocaleString('en-IN');
  }
  document.getElementById('epf-net-sub').textContent = fxStr||(tds>0?'After '+fmtCr(tds)+' TDS':'Full amount');
  var advice=document.getElementById('epf-advice');
  if(advice){
    var msg = reason==='nri'
      ? '<strong>🌍 NRI EPF Withdrawal Steps:</strong> (1) Activate UAN on EPFO portal. (2) Link Aadhaar + bank account to UAN. (3) Submit Form 19 (EPF) + Form 10C (EPS) online. (4) Amount credited to NRO account within 15–30 days. <br><br><strong>💡 Tip:</strong> If you plan to return to India, consider keeping EPF invested — it earns 8.25% p.a. interest and accumulates tax-free.'
      : taxFree
        ? '<strong>✅ Good news:</strong> Your withdrawal is fully tax-free. Submit Form 19 + 10C on the EPFO UAN portal. Ensure Aadhaar and bank account are linked and KYC is approved.'
        : '<strong>⚠️ Tax Alert:</strong> Since your service is under 5 years, the withdrawal is taxable. Consider whether you can defer withdrawal or transfer to new employer to avoid tax. Submit Form 15G (if income below taxable limit) to avoid TDS.';
    advice.innerHTML = msg;
  }
}

window.addEventListener('DOMContentLoaded',function(){
  calcPropTDS();
  calcEPF();
});

function toggleNavDD(id){
  var dd=document.getElementById(id);
  if(!dd)return;
  dd.classList.toggle('open');
  document.addEventListener('click',function h(e){
    if(!e.target.closest('.nav-dropdown-wrap')){dd.classList.remove('open');document.removeEventListener('click',h);}
  });
}
function closeNavDD(){
  document.querySelectorAll('.nav-dropdown').forEach(function(d){d.classList.remove('open');});
}



// ── NRI BUDGET TRACKER ─────────────────────────────────────────────────────
(function(){
  var BGT_KEY = 'nriBudget_v1';
  var bgtData = {};
  var bgtYear, bgtMonth; // current view

  var BGT_CATS = {
    income: ['Salary / Wages','Freelance / Consulting','Rental Income (India)','Dividends / Interest','Business Income','Other Income'],
    overseas: ['Housing / Rent','Groceries & Food','Transport / Fuel','Utilities','Insurance','Children Education','Entertainment','Healthcare','Dining Out','Clothing','Personal Care','Subscriptions','Misc Overseas'],
    india: ['Family Support','Home Loan EMI','Car / Other EMI','LIC / Insurance','Property Maintenance','SIP / Investments','PPF / NPS','School / College Fees','Medical (India)','Misc India']
  };

  function bgtKey(y,m){return y+'-'+(m<10?'0'+m:m);}

  function bgtLoad(){
    try{ bgtData = JSON.parse(localStorage.getItem(BGT_KEY)||'{}'); }
    catch(e){ bgtData={}; }
  }
  function bgtSave(){
    try{ localStorage.setItem(BGT_KEY, JSON.stringify(bgtData)); }
    catch(e){}
  }

  function bgtGetMonth(y,m){
    var k=bgtKey(y,m);
    if(!bgtData[k]) bgtData[k]={entries:[],rate:83.5,cur:'USD'};
    return bgtData[k];
  }

  var MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];

  function bgtInit(){
    bgtLoad();
    var now=new Date();
    bgtYear=now.getFullYear();
    bgtMonth=now.getMonth()+1;
    bgtUpdateMonthLabel();
    bgtUpdateAddForm();
    bgtRender();
  }

  function bgtUpdateMonthLabel(){
    var el=document.getElementById('bgt-month-label');
    if(el) el.textContent=MONTH_NAMES[bgtMonth-1]+' '+bgtYear;
  }

  window.bgtPrevMonth=function(){
    bgtMonth--;
    if(bgtMonth<1){bgtMonth=12;bgtYear--;}
    bgtUpdateMonthLabel();
    bgtSyncControls();
    bgtRender();
  };
  window.bgtNextMonth=function(){
    bgtMonth++;
    if(bgtMonth>12){bgtMonth=1;bgtYear++;}
    bgtUpdateMonthLabel();
    bgtSyncControls();
    bgtRender();
  };

  function bgtSyncControls(){
    var d=bgtGetMonth(bgtYear,bgtMonth);
    var curEl=document.getElementById('bgt-cur');
    var rateEl=document.getElementById('bgt-rate');
    if(curEl) curEl.value=d.cur||'USD';
    if(rateEl) rateEl.value=d.rate||83.5;
    bgtUpdateCurLabels();
  }

  function bgtUpdateCurLabels(){
    var cur=(document.getElementById('bgt-cur')||{}).value||'USD';
    document.querySelectorAll('.bgt-cur-sym').forEach(function(el){el.textContent=cur;});
    var lbl=document.getElementById('bgt-add-cur-lbl');
    var sec=(document.getElementById('bgt-add-sec')||{}).value||'income';
    if(lbl) lbl.textContent = sec==='india' ? 'INR' : cur;
  }

  window.bgtOnCurChange=function(){
    bgtSaveRate();
    bgtUpdateCurLabels();
    bgtRender();
  };

  window.bgtSaveRate=function(){
    var d=bgtGetMonth(bgtYear,bgtMonth);
    var curEl=document.getElementById('bgt-cur');
    var rateEl=document.getElementById('bgt-rate');
    if(curEl) d.cur=curEl.value;
    if(rateEl) d.rate=parseFloat(rateEl.value)||83.5;
    bgtSave();
  };

  window.bgtUpdateAddForm=function(){
    var sec=(document.getElementById('bgt-add-sec')||{}).value||'income';
    var catEl=document.getElementById('bgt-add-cat');
    if(!catEl) return;
    var cats=BGT_CATS[sec]||[];
    catEl.innerHTML=cats.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
    bgtUpdateCurLabels();
  };

  window.bgtAddEntry=function(){
    var sec=(document.getElementById('bgt-add-sec')||{}).value;
    var cat=(document.getElementById('bgt-add-cat')||{}).value;
    var desc=((document.getElementById('bgt-add-desc')||{}).value||'').trim();
    var amt=parseFloat((document.getElementById('bgt-add-amt')||{}).value)||0;
    if(!amt){alert('Please enter an amount.');return;}
    var d=bgtGetMonth(bgtYear,bgtMonth);
    var curEl=document.getElementById('bgt-cur');
    var rateEl=document.getElementById('bgt-rate');
    d.cur=(curEl||{}).value||'USD';
    d.rate=parseFloat((rateEl||{}).value)||83.5;
    d.entries.push({id:Date.now(),section:sec,category:cat,desc:desc,amount:amt});
    bgtSave();
    var descEl=document.getElementById('bgt-add-desc');
    var amtEl=document.getElementById('bgt-add-amt');
    if(descEl) descEl.value='';
    if(amtEl) amtEl.value='';
    bgtRender();
  };

  window.bgtDeleteEntry=function(id){
    var d=bgtGetMonth(bgtYear,bgtMonth);
    d.entries=d.entries.filter(function(e){return e.id!==id;});
    bgtSave();
    bgtRender();
  };

  function fmtCur(n,cur){
    return cur+' '+n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
  }
  function fmtINR(n){
    return '₹'+Math.round(n).toLocaleString('en-IN');
  }

  window.bgtRender=function(){
    var d=bgtGetMonth(bgtYear,bgtMonth);
    var cur=d.cur||'USD';
    var rate=d.rate||83.5;
    bgtSyncControls();

    var income=d.entries.filter(function(e){return e.section==='income';});
    var overseas=d.entries.filter(function(e){return e.section==='overseas';});
    var india=d.entries.filter(function(e){return e.section==='india';});

    var totIncCur=income.reduce(function(s,e){return s+e.amount;},0);
    var totOvCur=overseas.reduce(function(s,e){return s+e.amount;},0);
    var totIndINR=india.reduce(function(s,e){return s+e.amount;},0);
    var totIncINR=totIncCur*rate;
    var totOvINR=totOvCur*rate;
    var savings=totIncINR-totOvINR-totIndINR;
    var rate_pct=totIncINR>0?Math.round(savings/totIncINR*100):0;

    function setEl(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
    setEl('bgt-sum-income',fmtCur(totIncCur,cur));
    setEl('bgt-sum-income-inr',fmtINR(totIncINR));
    setEl('bgt-sum-overseas',fmtCur(totOvCur,cur));
    setEl('bgt-sum-overseas-inr',fmtINR(totOvINR));
    setEl('bgt-sum-india',fmtINR(totIndINR));
    setEl('bgt-sum-savings',fmtINR(savings));
    setEl('bgt-sum-rate', rate_pct+'%');
    setEl('bgt-tot-income-cur',fmtCur(totIncCur,cur));
    setEl('bgt-tot-income-inr',fmtINR(totIncINR));
    setEl('bgt-tot-overseas-cur',fmtCur(totOvCur,cur));
    setEl('bgt-tot-overseas-inr',fmtINR(totOvINR));
    setEl('bgt-tot-india',fmtINR(totIndINR));

    function buildRows(entries,isIndia){
      if(!entries.length) return '<tr><td colspan="'+(isIndia?4:5)+'" class="bgt-empty">No entries yet</td></tr>';
      return entries.map(function(e){
        var amtStr = isIndia ? fmtINR(e.amount) : fmtCur(e.amount,cur);
        var inrStr = isIndia ? '' : '<td class="bgt-inr-note">'+fmtINR(e.amount*rate)+'</td>';
        var pillCls = isIndia ? 'india' : (e.section==='income'?'income':'');
        return '<tr><td><span class="bgt-cat-pill '+pillCls+'">'+e.category+'</span></td><td>'+
          (e.desc||'—')+'</td><td>'+amtStr+'</td>'+inrStr+
          '<td><button class="bgt-del" onclick="bgtDeleteEntry('+e.id+')" title="Delete">✕</button></td></tr>';
      }).join('');
    }

    var bodyInc=document.getElementById('bgt-body-income');
    var bodyOv=document.getElementById('bgt-body-overseas');
    var bodyInd=document.getElementById('bgt-body-india');
    if(bodyInc) bodyInc.innerHTML=buildRows(income,false);
    if(bodyOv) bodyOv.innerHTML=buildRows(overseas,false);
    if(bodyInd) bodyInd.innerHTML=buildRows(india,true);

    // Colour savings rate
    var rateEl=document.getElementById('bgt-sum-rate');
    if(rateEl){
      rateEl.className='bgt-sum-val'+(rate_pct>=30?' teal':rate_pct>=10?' amber':' red');
    }
  };

  // Init when tab is opened
  var _bgtInited=false;
  var _bgtOrig=window.showTab;
  window.showTab=function(tabId,el){
    if(typeof _bgtOrig==='function') _bgtOrig(tabId,el);
    if(tabId==='budget' && !_bgtInited){
      _bgtInited=true;
      setTimeout(bgtInit,50);
    }
  };
  // Also init if already on tab
  document.addEventListener('DOMContentLoaded',function(){
    if(document.getElementById('tab-budget') &&
       document.getElementById('tab-budget').style.display!=='none'){
      bgtInit();
    }
  });
})();
// ── END BUDGET TRACKER ─────────────────────────────────────────────────────



// ── FLIGHTS TO INDIA ──────────────────────────────────────────────────────
(function(){
  const FL={
    AED:{country:'UAE',origins:[{code:'DXB',name:'Dubai'},{code:'AUH',name:'Abu Dhabi'},{code:'SHJ',name:'Sharjah'}],
      routes:{BOM:{min:800,max:2400,dur:'~3–4 hrs',airlines:'Air India, IndiGo, Emirates, flydubai'},DEL:{min:900,max:2600,dur:'~3–4 hrs',airlines:'Air India, IndiGo, Emirates, flydubai'},BLR:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},MAA:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Emirates'},HYD:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},COK:{min:650,max:1800,dur:'~3 hrs',airlines:'Air Arabia, IndiGo, Air India Express'},CCU:{min:1000,max:2700,dur:'~4–5 hrs',airlines:'IndiGo, Air India'},TRV:{min:700,max:1900,dur:'~3 hrs',airlines:'Air India Express, Air Arabia'},AMD:{min:850,max:2400,dur:'~3 hrs',airlines:'IndiGo, Air India'},GOI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CNN:{min:680,max:1900,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo',TRZ:{min:700,max:1950,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},IXM:{min:720,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express'}}}}},
    SAR:{country:'Saudi Arabia',origins:[{code:'RUH',name:'Riyadh'},{code:'JED',name:'Jeddah'},{code:'DMM',name:'Dammam'}],
      routes:{BOM:{min:700,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Saudia'},DEL:{min:750,max:2100,dur:'~4 hrs',airlines:'Air India, IndiGo, Saudia'},BLR:{min:800,max:2200,dur:'~4 hrs',airlines:'IndiGo, Air India'},MAA:{min:700,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},HYD:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},COK:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CCU:{min:900,max:2400,dur:'~5 hrs',airlines:'IndiGo, Air India'},TRV:{min:650,max:1800,dur:'~3–4 hrs',airlines:'Air India Express'},AMD:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},GOI:{min:800,max:2200,dur:'~4 hrs',airlines:'IndiGo, Air India'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:580,max:1650,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CNN:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo',TRZ:{min:620,max:1750,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},IXM:{min:640,max:1800,dur:'~3–4 hrs',airlines:'IndiGo, Air India'}}}}},
    QAR:{country:'Qatar',origins:[{code:'DOH',name:'Doha'}],
      routes:{BOM:{min:800,max:2200,dur:'~3 hrs',airlines:'Qatar Airways, IndiGo, Air India'},DEL:{min:850,max:2300,dur:'~3–4 hrs',airlines:'Qatar Airways, Air India, IndiGo'},BLR:{min:850,max:2300,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'},MAA:{min:800,max:2200,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'},HYD:{min:820,max:2200,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'},COK:{min:700,max:1900,dur:'~3 hrs',airlines:'Qatar Airways, Air India Express'},CCU:{min:950,max:2500,dur:'~4 hrs',airlines:'Qatar Airways, IndiGo'},TRV:{min:750,max:2000,dur:'~3 hrs',airlines:'Qatar Airways'},AMD:{min:850,max:2300,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'},GOI:{min:900,max:2400,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:680,max:1850,dur:'~3 hrs',airlines:'Qatar Airways, Air India Express'},CNN:{min:700,max:1900,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo',TRZ:{min:720,max:1950,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'},IXM:{min:740,max:2000,dur:'~3–4 hrs',airlines:'Qatar Airways, IndiGo'}}}}},
    KWD:{country:'Kuwait',origins:[{code:'KWI',name:'Kuwait City'}],
      routes:{BOM:{min:80,max:220,dur:'~3–4 hrs',airlines:'Jazeera Airways, Air India Express, IndiGo'},DEL:{min:85,max:240,dur:'~4 hrs',airlines:'Air India, IndiGo, Jazeera Airways'},BLR:{min:90,max:235,dur:'~4 hrs',airlines:'IndiGo, Air India'},MAA:{min:80,max:220,dur:'~4 hrs',airlines:'IndiGo, Air India'},HYD:{min:85,max:225,dur:'~4 hrs',airlines:'IndiGo, Air India'},COK:{min:70,max:175,dur:'~3 hrs',airlines:'Air India Express, IndiGo'},CCU:{min:95,max:255,dur:'~5 hrs',airlines:'IndiGo, Air India'},TRV:{min:75,max:185,dur:'~3 hrs',airlines:'Air India Express'},AMD:{min:85,max:225,dur:'~4 hrs',airlines:'IndiGo, Air India'},GOI:{min:90,max:235,dur:'~4 hrs',airlines:'IndiGo, Air India'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:65,max:170,dur:'~3 hrs',airlines:'Air India Express, IndiGo'},CNN:{min:68,max:178,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo',TRZ:{min:68,max:180,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},IXM:{min:70,max:185,dur:'~3–4 hrs',airlines:'IndiGo, Air India'}}}}},
    BHD:{country:'Bahrain',origins:[{code:'BAH',name:'Bahrain'}],
      routes:{BOM:{min:90,max:240,dur:'~3 hrs',airlines:'Air Arabia, Gulf Air, IndiGo'},DEL:{min:95,max:255,dur:'~3–4 hrs',airlines:'Air Arabia, Gulf Air, Air India'},BLR:{min:95,max:250,dur:'~3–4 hrs',airlines:'IndiGo, Air Arabia'},MAA:{min:90,max:240,dur:'~3–4 hrs',airlines:'IndiGo, Gulf Air'},HYD:{min:90,max:245,dur:'~3–4 hrs',airlines:'IndiGo, Air Arabia'},COK:{min:78,max:195,dur:'~3 hrs',airlines:'Air Arabia, Air India Express'},CCU:{min:105,max:270,dur:'~4–5 hrs',airlines:'IndiGo, Gulf Air'},TRV:{min:82,max:200,dur:'~3 hrs',airlines:'Air Arabia, Air India Express'},AMD:{min:90,max:250,dur:'~3–4 hrs',airlines:'IndiGo, Air Arabia'},GOI:{min:95,max:255,dur:'~3–4 hrs',airlines:'IndiGo, Air Arabia'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:75,max:190,dur:'~3 hrs',airlines:'Air Arabia, Air India Express'},CNN:{min:78,max:198,dur:'~3–4 hrs',airlines:'Air Arabia, IndiGo',TRZ:{min:78,max:200,dur:'~3–4 hrs',airlines:'Air Arabia, IndiGo'},IXM:{min:80,max:205,dur:'~3–4 hrs',airlines:'Air Arabia, IndiGo'}}}}},
    OMR:{country:'Oman',origins:[{code:'MCT',name:'Muscat'}],
      routes:{BOM:{min:90,max:250,dur:'~3 hrs',airlines:'Oman Air, Air India, IndiGo'},DEL:{min:95,max:260,dur:'~3–4 hrs',airlines:'Oman Air, Air India, IndiGo'},BLR:{min:95,max:255,dur:'~3–4 hrs',airlines:'IndiGo, Oman Air'},MAA:{min:90,max:250,dur:'~3–4 hrs',airlines:'IndiGo, Oman Air'},HYD:{min:92,max:255,dur:'~3–4 hrs',airlines:'IndiGo, Oman Air'},COK:{min:78,max:200,dur:'~3 hrs',airlines:'Air India Express, Oman Air'},CCU:{min:100,max:270,dur:'~4–5 hrs',airlines:'IndiGo, Oman Air'},TRV:{min:80,max:205,dur:'~3 hrs',airlines:'Oman Air, Air India Express'},AMD:{min:92,max:255,dur:'~3–4 hrs',airlines:'IndiGo, Oman Air'},GOI:{min:95,max:260,dur:'~3–4 hrs',airlines:'IndiGo, Oman Air'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:75,max:195,dur:'~3 hrs',airlines:'Oman Air, Air India Express'},CNN:{min:78,max:200,dur:'~3–4 hrs',airlines:'Oman Air, IndiGo',TRZ:{min:80,max:205,dur:'~3–4 hrs',airlines:'Oman Air, IndiGo'},IXM:{min:82,max:210,dur:'~3–4 hrs',airlines:'Oman Air, IndiGo'}}}}},
    SGD:{country:'Singapore',origins:[{code:'SIN',name:'Singapore'}],
      routes:{BOM:{min:350,max:900,dur:'~5–6 hrs',airlines:'IndiGo, Air India, Singapore Airlines'},DEL:{min:350,max:900,dur:'~6 hrs',airlines:'Air India, Singapore Airlines, IndiGo'},BLR:{min:320,max:850,dur:'~5 hrs',airlines:'IndiGo, Air India, Scoot'},MAA:{min:300,max:800,dur:'~4–5 hrs',airlines:'IndiGo, Scoot, Air India'},HYD:{min:320,max:850,dur:'~5–6 hrs',airlines:'IndiGo, Air India'},COK:{min:350,max:900,dur:'~5 hrs',airlines:'IndiGo, Air India, Scoot'},CCU:{min:380,max:950,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Scoot'},TRV:{min:330,max:850,dur:'~5 hrs',airlines:'Scoot, Air India'},AMD:{min:360,max:900,dur:'~6 hrs',airlines:'IndiGo, Air India'},GOI:{min:370,max:920,dur:'~5 hrs',airlines:'IndiGo, Air India'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:320,max:840,dur:'~5 hrs',airlines:'IndiGo, Scoot'},CNN:{min:330,max:860,dur:'~5 hrs',airlines:'IndiGo, Air India',TRZ:{min:310,max:820,dur:'~4–5 hrs',airlines:'IndiGo, Scoot'},IXM:{min:320,max:840,dur:'~4–5 hrs',airlines:'IndiGo, Scoot'}}}}},
    MYR:{country:'Malaysia',origins:[{code:'KUL',name:'Kuala Lumpur'},{code:'PEN',name:'Penang'}],
      routes:{BOM:{min:1050,max:2100,dur:'~5–6 hrs',airlines:'AirAsia, Air India, Batik Air'},DEL:{min:1050,max:2100,dur:'~6 hrs',airlines:'AirAsia, Air India, MAS'},BLR:{min:950,max:1950,dur:'~5 hrs',airlines:'AirAsia, IndiGo'},MAA:{min:900,max:1800,dur:'~4 hrs',airlines:'AirAsia, IndiGo'},HYD:{min:950,max:1950,dur:'~5 hrs',airlines:'AirAsia, IndiGo'},COK:{min:1000,max:1850,dur:'~5 hrs',airlines:'AirAsia, Air India'},CCU:{min:1150,max:2250,dur:'~3 hrs',airlines:'Batik Air, IndiGo'},TRV:{min:950,max:1850,dur:'~5 hrs',airlines:'AirAsia'},AMD:{min:1050,max:2100,dur:'~6 hrs',airlines:'AirAsia, IndiGo'},GOI:{min:1050,max:2050,dur:'~5–6 hrs',airlines:'AirAsia, IndiGo'},PNQ:{min:800,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Air Arabia'},JAI:{min:900,max:2500,dur:'~3–4 hrs',airlines:'IndiGo, Air India, flydubai'},ATQ:{min:850,max:2300,dur:'~3–4 hrs',airlines:'IndiGo, Air India Express, Air Arabia'},IXE:{min:650,max:1800,dur:'~3 hrs',airlines:'Air India Express, IndiGo, Air Arabia'},CJB:{min:750,max:2100,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:850,max:2400,dur:'~3–4 hrs',airlines:'IndiGo, Air India'},LKO:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India, flydubai'},NAG:{min:900,max:2500,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:920,max:1820,dur:'~5 hrs',airlines:'AirAsia, Air India'},CNN:{min:940,max:1850,dur:'~5 hrs',airlines:'AirAsia, IndiGo',TRZ:{min:900,max:1820,dur:'~4–5 hrs',airlines:'AirAsia, IndiGo'},IXM:{min:920,max:1850,dur:'~4–5 hrs',airlines:'AirAsia, IndiGo'}}}}},
    AUD:{country:'Australia',origins:[{code:'SYD',name:'Sydney'},{code:'MEL',name:'Melbourne'},{code:'PER',name:'Perth'},{code:'BNE',name:'Brisbane'}],
      routes:{BOM:{min:900,max:2400,dur:'~14–18 hrs',airlines:'Qantas, Air India, Singapore Airlines'},DEL:{min:900,max:2400,dur:'~15–18 hrs',airlines:'Air India, Qantas, Emirates'},BLR:{min:950,max:2500,dur:'~14–18 hrs',airlines:'Singapore Airlines, Air India'},MAA:{min:1000,max:2600,dur:'~13–17 hrs',airlines:'Singapore Airlines, Air India'},HYD:{min:950,max:2500,dur:'~14–18 hrs',airlines:'Singapore Airlines, Air India'},COK:{min:1000,max:2600,dur:'~14–18 hrs',airlines:'Singapore Airlines, Air India'},CCU:{min:1050,max:2700,dur:'~12–15 hrs',airlines:'Singapore Airlines, Air India'},TRV:{min:1000,max:2600,dur:'~13–17 hrs',airlines:'Air India, Singapore Airlines'},AMD:{min:950,max:2500,dur:'~15–18 hrs',airlines:'Air India, Singapore Airlines'},GOI:{min:1000,max:2600,dur:'~14–18 hrs',airlines:'Air India, Singapore Airlines'},PNQ:{min:700,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Saudia'},JAI:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India, Saudia'},ATQ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},IXE:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CJB:{min:680,max:1900,dur:'~4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},LKO:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},NAG:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:1000,max:2600,dur:'~14–18 hrs',airlines:'Singapore Airlines, Air India'},CNN:{min:1020,max:2650,dur:'~15–19 hrs',airlines:'Singapore Airlines, Air India',TRZ:{min:980,max:2580,dur:'~13–17 hrs',airlines:'Singapore Airlines, Air India'},IXM:{min:1000,max:2620,dur:'~14–18 hrs',airlines:'Singapore Airlines, Air India'}}}}},
    NZD:{country:'New Zealand',origins:[{code:'AKL',name:'Auckland'},{code:'WLG',name:'Wellington'}],
      routes:{BOM:{min:1800,max:4200,dur:'~20–24 hrs',airlines:'Air India, Singapore Airlines, Emirates'},DEL:{min:1800,max:4200,dur:'~20–24 hrs',airlines:'Air India, Singapore Airlines'},BLR:{min:1900,max:4400,dur:'~20–25 hrs',airlines:'Singapore Airlines, Air India'},MAA:{min:1900,max:4400,dur:'~18–22 hrs',airlines:'Singapore Airlines, Air India'},HYD:{min:1900,max:4400,dur:'~20–24 hrs',airlines:'Singapore Airlines, Air India'},COK:{min:1950,max:4500,dur:'~20–24 hrs',airlines:'Singapore Airlines, Air India'},CCU:{min:2000,max:4600,dur:'~18–22 hrs',airlines:'Singapore Airlines, Air India'},TRV:{min:1950,max:4500,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines'},AMD:{min:1900,max:4400,dur:'~20–25 hrs',airlines:'Singapore Airlines, Air India'},GOI:{min:1950,max:4500,dur:'~20–25 hrs',airlines:'Singapore Airlines, Air India'},PNQ:{min:700,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Saudia'},JAI:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India, Saudia'},ATQ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},IXE:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CJB:{min:680,max:1900,dur:'~4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},LKO:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},NAG:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:1950,max:4500,dur:'~20–24 hrs',airlines:'Singapore Airlines, Air India'},CNN:{min:1980,max:4550,dur:'~20–25 hrs',airlines:'Singapore Airlines, Air India',TRZ:{min:1900,max:4420,dur:'~18–22 hrs',airlines:'Singapore Airlines, Air India'},IXM:{min:1920,max:4460,dur:'~18–23 hrs',airlines:'Singapore Airlines, Air India'}}}}},
    USD:{country:'USA',origins:[{code:'JFK',name:'New York (JFK)'},{code:'EWR',name:'New York (EWR)'},{code:'ORD',name:'Chicago'},{code:'LAX',name:'Los Angeles'},{code:'SFO',name:'San Francisco'},{code:'IAD',name:'Washington DC'},{code:'IAH',name:'Houston'},{code:'ATL',name:'Atlanta'}],
      routes:{BOM:{min:700,max:1800,dur:'~16–20 hrs',airlines:'Air India, United, Emirates'},DEL:{min:650,max:1750,dur:'~16–20 hrs',airlines:'Air India (non-stop), United, Lufthansa'},BLR:{min:750,max:1900,dur:'~18–22 hrs',airlines:'Air India, United, Lufthansa'},MAA:{min:750,max:1900,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines, Lufthansa'},HYD:{min:750,max:1900,dur:'~18–22 hrs',airlines:'Air India, United, Singapore Airlines'},COK:{min:800,max:2000,dur:'~20–24 hrs',airlines:'Air India, Singapore Airlines'},CCU:{min:800,max:2000,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines'},TRV:{min:800,max:2000,dur:'~20–24 hrs',airlines:'Air India, Singapore Airlines'},AMD:{min:750,max:1900,dur:'~18–22 hrs',airlines:'Air India, Lufthansa'},GOI:{min:800,max:2000,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines'},PNQ:{min:700,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Saudia'},JAI:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India, Saudia'},ATQ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},IXE:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CJB:{min:680,max:1900,dur:'~4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},LKO:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},NAG:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:780,max:1950,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines'},CNN:{min:800,max:2000,dur:'~19–23 hrs',airlines:'Air India, Singapore Airlines',TRZ:{min:760,max:1920,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines'},IXM:{min:775,max:1940,dur:'~18–22 hrs',airlines:'Air India, Singapore Airlines'}}}}},
    CAD:{country:'Canada',origins:[{code:'YYZ',name:'Toronto'},{code:'YVR',name:'Vancouver'},{code:'YUL',name:'Montreal'}],
      routes:{BOM:{min:950,max:2400,dur:'~16–20 hrs',airlines:'Air India, Air Canada'},DEL:{min:900,max:2300,dur:'~15–19 hrs',airlines:'Air India, Air Canada'},BLR:{min:1000,max:2500,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},MAA:{min:1000,max:2500,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},HYD:{min:1000,max:2500,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},COK:{min:1050,max:2600,dur:'~20–24 hrs',airlines:'Air India, Air Canada'},CCU:{min:1050,max:2600,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},TRV:{min:1050,max:2600,dur:'~20–24 hrs',airlines:'Air India, Singapore Airlines'},AMD:{min:1000,max:2500,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},GOI:{min:1050,max:2600,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},PNQ:{min:700,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Saudia'},JAI:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India, Saudia'},ATQ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},IXE:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CJB:{min:680,max:1900,dur:'~4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},LKO:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},NAG:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:1030,max:2580,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},CNN:{min:1050,max:2620,dur:'~19–23 hrs',airlines:'Air India, Air Canada',TRZ:{min:1010,max:2560,dur:'~18–22 hrs',airlines:'Air India, Air Canada'},IXM:{min:1030,max:2590,dur:'~18–23 hrs',airlines:'Air India, Air Canada'}}}}},
    EUR:{country:'Europe (EUR)',origins:[{code:'FRA',name:'Frankfurt'},{code:'MUC',name:'Munich'},{code:'AMS',name:'Amsterdam'},{code:'CDG',name:'Paris'},{code:'ZRH',name:'Zurich'}],
      routes:{BOM:{min:500,max:1400,dur:'~9–11 hrs',airlines:'Lufthansa, Air India, KLM'},DEL:{min:480,max:1350,dur:'~8–10 hrs',airlines:'Lufthansa, Air India (non-stop), KLM'},BLR:{min:530,max:1450,dur:'~9–12 hrs',airlines:'Lufthansa, Air India, KLM'},MAA:{min:530,max:1450,dur:'~10–13 hrs',airlines:'Air India, Lufthansa, KLM'},HYD:{min:530,max:1450,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'},COK:{min:560,max:1500,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'},CCU:{min:560,max:1500,dur:'~10–12 hrs',airlines:'Air India, Lufthansa'},TRV:{min:550,max:1480,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'},AMD:{min:530,max:1450,dur:'~10–12 hrs',airlines:'Air India, Lufthansa'},GOI:{min:550,max:1480,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'},PNQ:{min:700,max:2000,dur:'~3–4 hrs',airlines:'IndiGo, Air India, Saudia'},JAI:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India, Saudia'},ATQ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},IXE:{min:600,max:1700,dur:'~3–4 hrs',airlines:'Air India Express, IndiGo'},CJB:{min:680,max:1900,dur:'~4 hrs',airlines:'IndiGo, Air India'},VTZ:{min:720,max:2000,dur:'~4 hrs',airlines:'IndiGo, Air India'},LKO:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India'},NAG:{min:750,max:2100,dur:'~4 hrs',airlines:'IndiGo, Air India',CCJ:{min:530,max:1460,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'},CNN:{min:540,max:1480,dur:'~11–14 hrs',airlines:'Air India, Lufthansa',TRZ:{min:520,max:1440,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'},IXM:{min:530,max:1460,dur:'~10–13 hrs',airlines:'Air India, Lufthansa'}}}}},
    GBP:{country:'United Kingdom',origins:[{code:'LHR',name:'London Heathrow'},{code:'LGW',name:'London Gatwick'},{code:'BHX',name:'Birmingham'},{code:'MAN',name:'Manchester'}],
      routes:{BOM:{min:380,max:950,dur:'~9–10 hrs',airlines:'Air India (non-stop), British Airways, Virgin'},DEL:{min:360,max:920,dur:'~8–9 hrs',airlines:'Air India (non-stop), British Airways'},BLR:{min:400,max:1000,dur:'~10–12 hrs',airlines:'Air India, British Airways'},MAA:{min:400,max:1000,dur:'~10–12 hrs',airlines:'Air India, British Airways'},HYD:{min:400,max:1000,dur:'~10–12 hrs',airlines:'Air India, British Airways'},COK:{min:420,max:1050,dur:'~10–12 hrs',airlines:'Air India, British Airways'},CCU:{min:400,max:1000,dur:'~10–12 hrs',airlines:'Air India, British Airways'},TRV:{min:410,max:1020,dur:'~10–12 hrs',airlines:'Air India, British Airways'},AMD:{min:400,max:1000,dur:'~10–12 hrs',airlines:'Air India, British Airways'},GOI:{min:420,max:1050,dur:'~10–12 hrs',airlines:'Air India, British Airways, IndiGo',PNQ:{min:390,max:980,dur:'~9–11 hrs',airlines:'Air India, British Airways'},JAI:{min:370,max:950,dur:'~9–10 hrs',airlines:'Air India, British Airways'},ATQ:{min:370,max:950,dur:'~9–10 hrs',airlines:'Air India, British Airways'},IXE:{min:410,max:1030,dur:'~10–12 hrs',airlines:'Air India, British Airways'},CJB:{min:400,max:1010,dur:'~10–12 hrs',airlines:'Air India, British Airways'},VTZ:{min:400,max:1010,dur:'~10–12 hrs',airlines:'Air India, British Airways'},LKO:{min:370,max:950,dur:'~9–10 hrs',airlines:'Air India, British Airways'},NAG:{min:380,max:960,dur:'~10–12 hrs',airlines:'Air India, British Airways',CCJ:{min:405,max:1015,dur:'~10–12 hrs',airlines:'Air India, British Airways'},CNN:{min:415,max:1030,dur:'~11–13 hrs',airlines:'Air India, British Airways',TRZ:{min:395,max:1000,dur:'~10–12 hrs',airlines:'Air India, British Airways'},IXM:{min:405,max:1015,dur:'~10–12 hrs',airlines:'Air India, British Airways'}}}}}},
    CHF:{country:'Switzerland',origins:[{code:'ZRH',name:'Zurich'},{code:'GVA',name:'Geneva'}],
      routes:{BOM:{min:550,max:1500,dur:'~9–11 hrs',airlines:'Swiss, Lufthansa, Air India'},DEL:{min:530,max:1450,dur:'~8–10 hrs',airlines:'Swiss, Lufthansa, Air India'},BLR:{min:580,max:1580,dur:'~10–12 hrs',airlines:'Swiss, Lufthansa, Air India'},MAA:{min:580,max:1580,dur:'~10–13 hrs',airlines:'Swiss, Air India'},HYD:{min:580,max:1580,dur:'~10–13 hrs',airlines:'Swiss, Lufthansa, Air India'},COK:{min:600,max:1600,dur:'~10–13 hrs',airlines:'Swiss, Air India'},CCU:{min:600,max:1620,dur:'~10–13 hrs',airlines:'Swiss, Air India'},TRV:{min:590,max:1590,dur:'~10–13 hrs',airlines:'Swiss, Air India'},AMD:{min:570,max:1560,dur:'~10–12 hrs',airlines:'Swiss, Lufthansa'},GOI:{min:590,max:1590,dur:'~10–13 hrs',airlines:'Swiss, Air India'},PNQ:{min:560,max:1540,dur:'~10–12 hrs',airlines:'Swiss, Lufthansa'},JAI:{min:540,max:1480,dur:'~9–11 hrs',airlines:'Swiss, Lufthansa'},ATQ:{min:540,max:1480,dur:'~9–11 hrs',airlines:'Swiss, Lufthansa'},IXE:{min:590,max:1600,dur:'~11–14 hrs',airlines:'Swiss, Air India'},CJB:{min:580,max:1580,dur:'~11–13 hrs',airlines:'Swiss, Air India'},VTZ:{min:580,max:1580,dur:'~11–13 hrs',airlines:'Swiss, Air India'},LKO:{min:545,max:1490,dur:'~9–11 hrs',airlines:'Swiss, Lufthansa'},NAG:{min:555,max:1510,dur:'~10–12 hrs',airlines:'Swiss, Lufthansa'},CCJ:{min:590,max:1600,dur:'~11–13 hrs',airlines:'Swiss, Air India'},CNN:{min:600,max:1620,dur:'~11–14 hrs',airlines:'Swiss, Air India'},TRZ:{min:575,max:1570,dur:'~11–13 hrs',airlines:'Swiss, Air India'},IXM:{min:580,max:1580,dur:'~11–13 hrs',airlines:'Swiss, Air India'}}},
    SEK:{country:'Sweden',origins:[{code:'ARN',name:'Stockholm'},{code:'GOT',name:'Gothenburg'}],
      routes:{BOM:{min:5200,max:14000,dur:'~10–13 hrs',airlines:'SAS, Lufthansa, Air India'},DEL:{min:4900,max:13500,dur:'~9–12 hrs',airlines:'SAS, Lufthansa, Air India'},BLR:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},MAA:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},HYD:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},COK:{min:5600,max:15000,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CCU:{min:5500,max:14800,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},TRV:{min:5500,max:14800,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},AMD:{min:5100,max:13800,dur:'~10–13 hrs',airlines:'Lufthansa, Air India'},GOI:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},PNQ:{min:5200,max:14000,dur:'~10–13 hrs',airlines:'Lufthansa, Air India'},JAI:{min:5000,max:13600,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},ATQ:{min:5000,max:13600,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},IXE:{min:5500,max:14800,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CJB:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},VTZ:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},LKO:{min:5000,max:13600,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},NAG:{min:5100,max:13800,dur:'~10–13 hrs',airlines:'Lufthansa, Air India'},CCJ:{min:5500,max:14800,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CNN:{min:5600,max:15000,dur:'~12–15 hrs',airlines:'Lufthansa, Air India'},TRZ:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},IXM:{min:5400,max:14500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'}}},
    NOK:{country:'Norway',origins:[{code:'OSL',name:'Oslo'},{code:'BGO',name:'Bergen'}],
      routes:{BOM:{min:6200,max:17000,dur:'~10–13 hrs',airlines:'SAS, Lufthansa, Air India'},DEL:{min:5900,max:16500,dur:'~9–12 hrs',airlines:'SAS, Lufthansa, Air India'},BLR:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},MAA:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},HYD:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},COK:{min:6700,max:18000,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CCU:{min:6600,max:17800,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},TRV:{min:6600,max:17800,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},AMD:{min:6100,max:16600,dur:'~10–13 hrs',airlines:'Lufthansa, Air India'},GOI:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},PNQ:{min:6200,max:17000,dur:'~10–13 hrs',airlines:'Lufthansa, Air India'},JAI:{min:6000,max:16500,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},ATQ:{min:6000,max:16500,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},IXE:{min:6600,max:17800,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CJB:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},VTZ:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},LKO:{min:6000,max:16500,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},NAG:{min:6100,max:16600,dur:'~10–13 hrs',airlines:'Lufthansa, Air India'},CCJ:{min:6600,max:17800,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CNN:{min:6700,max:18000,dur:'~12–15 hrs',airlines:'Lufthansa, Air India'},TRZ:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},IXM:{min:6500,max:17500,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'}}},
    DKK:{country:'Denmark',origins:[{code:'CPH',name:'Copenhagen'}],
      routes:{BOM:{min:3800,max:10500,dur:'~10–12 hrs',airlines:'SAS, Lufthansa, Air India'},DEL:{min:3600,max:10000,dur:'~9–11 hrs',airlines:'SAS, Lufthansa, Air India'},BLR:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},MAA:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},HYD:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},COK:{min:4100,max:11200,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CCU:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},TRV:{min:4000,max:11000,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},AMD:{min:3800,max:10500,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},GOI:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},PNQ:{min:3900,max:10700,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},JAI:{min:3700,max:10200,dur:'~10–11 hrs',airlines:'Lufthansa, Air India'},ATQ:{min:3700,max:10200,dur:'~10–11 hrs',airlines:'Lufthansa, Air India'},IXE:{min:4100,max:11200,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CJB:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},VTZ:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},LKO:{min:3700,max:10200,dur:'~10–11 hrs',airlines:'Lufthansa, Air India'},NAG:{min:3800,max:10400,dur:'~10–12 hrs',airlines:'Lufthansa, Air India'},CCJ:{min:4100,max:11200,dur:'~11–14 hrs',airlines:'Lufthansa, Air India'},CNN:{min:4200,max:11500,dur:'~12–14 hrs',airlines:'Lufthansa, Air India'},TRZ:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'},IXM:{min:4000,max:11000,dur:'~11–13 hrs',airlines:'Lufthansa, Air India'}}},
    JPY:{country:'Japan',origins:[{code:'NRT',name:'Tokyo Narita'},{code:'KIX',name:'Osaka'},{code:'NGO',name:'Nagoya'}],
      routes:{BOM:{min:60000,max:160000,dur:'~10–12 hrs',airlines:'Air India, JAL, ANA, Singapore Airlines'},DEL:{min:58000,max:155000,dur:'~10–12 hrs',airlines:'Air India, JAL, ANA'},BLR:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},MAA:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},HYD:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},COK:{min:68000,max:175000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},CCU:{min:55000,max:145000,dur:'~7–10 hrs',airlines:'Air India, ANA, IndiGo'},TRV:{min:66000,max:172000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},AMD:{min:62000,max:162000,dur:'~11–13 hrs',airlines:'Air India, Singapore Airlines'},GOI:{min:66000,max:172000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},PNQ:{min:62000,max:162000,dur:'~11–13 hrs',airlines:'Air India, Singapore Airlines'},JAI:{min:60000,max:158000,dur:'~11–12 hrs',airlines:'Air India, Singapore Airlines'},ATQ:{min:60000,max:158000,dur:'~11–12 hrs',airlines:'Air India, Singapore Airlines'},IXE:{min:66000,max:172000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},CJB:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},VTZ:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},LKO:{min:60000,max:158000,dur:'~11–12 hrs',airlines:'Air India, Singapore Airlines'},NAG:{min:62000,max:162000,dur:'~11–13 hrs',airlines:'Air India, Singapore Airlines'},CCJ:{min:66000,max:172000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},CNN:{min:67000,max:175000,dur:'~12–14 hrs',airlines:'Air India, Singapore Airlines'},TRZ:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'},IXM:{min:65000,max:170000,dur:'~11–14 hrs',airlines:'Air India, Singapore Airlines'}}},
    HKD:{country:'Hong Kong',origins:[{code:'HKG',name:'Hong Kong'}],
      routes:{BOM:{min:2800,max:7500,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India, IndiGo'},DEL:{min:2900,max:7800,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India'},BLR:{min:2700,max:7200,dur:'~5–6 hrs',airlines:'Cathay Pacific, IndiGo, Air India'},MAA:{min:2700,max:7200,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India'},HYD:{min:2750,max:7300,dur:'~5–6 hrs',airlines:'Cathay Pacific, IndiGo'},COK:{min:2800,max:7500,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India'},CCU:{min:2400,max:6500,dur:'~3–4 hrs',airlines:'Cathay Pacific, IndiGo, Air India'},TRV:{min:2850,max:7600,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},AMD:{min:2900,max:7700,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},GOI:{min:2850,max:7600,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},PNQ:{min:2850,max:7600,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},JAI:{min:2950,max:7800,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},ATQ:{min:2950,max:7800,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},IXE:{min:2800,max:7500,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},CJB:{min:2750,max:7300,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},VTZ:{min:2800,max:7500,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},LKO:{min:2950,max:7800,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},NAG:{min:2900,max:7700,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},CCJ:{min:2800,max:7500,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India'},CNN:{min:2850,max:7600,dur:'~5–7 hrs',airlines:'Cathay Pacific, Air India'},TRZ:{min:2750,max:7300,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India'},IXM:{min:2750,max:7300,dur:'~5–6 hrs',airlines:'Cathay Pacific, Air India'}}}
  };

  const DEST={
    BOM:{name:'Mumbai',       icon:'🏙️',tip:'Best: Nov–Jan · Cool &amp; festive',        deal:'Feb–Mar, Jun–Aug',dealNote:'Monsoon &amp; shoulder'},
    DEL:{name:'Delhi',        icon:'🕌',tip:'Best: Oct–Mar · Pleasant weather',           deal:'Jan–Mar, Jun–Aug',dealNote:'Post-peak &amp; monsoon'},
    BLR:{name:'Bangalore',    icon:'💻',tip:'Best: Sep–Nov · Mild &amp; green',           deal:'Jan–Feb, Jun–Aug',dealNote:'Off-peak deals'},
    MAA:{name:'Chennai',      icon:'🌊',tip:'Best: Nov–Feb · Cool, post-monsoon',         deal:'Feb–Apr, Jun–Jul',dealNote:'Shoulder season'},
    HYD:{name:'Hyderabad',    icon:'🏯',tip:'Best: Oct–Feb · Comfortable &amp; dry',      deal:'Feb–Mar, Jun–Aug',dealNote:'Low season fares'},
    COK:{name:'Kochi',        icon:'⛵',tip:'Best: Oct–Feb · Backwater season',           deal:'Mar–May, Jul–Aug',dealNote:'Shoulder &amp; off-peak'},
    CCU:{name:'Kolkata',      icon:'🎭',tip:'Best: Oct–Feb · Durga Puja &amp; winter',    deal:'Feb–Apr, Jul–Aug',dealNote:'Off-peak deals'},
    TRV:{name:'Trivandrum',   icon:'🏝️',tip:'Best: Oct–Feb · Coast &amp; beach',         deal:'Mar–May, Jul–Aug',dealNote:'Low season fares'},
    AMD:{name:'Ahmedabad',    icon:'🏺',tip:'Best: Nov–Jan · Cool &amp; events',          deal:'Jun–Sep',         dealNote:'Up to 40% off in monsoon'},
    GOI:{name:'Goa',          icon:'🌴',tip:'Best: Oct–Mar · Peak beach season',          deal:'Jun–Sep',         dealNote:'Up to 60% off in monsoon'},
    PNQ:{name:'Pune',         icon:'🏫',tip:'Best: Oct–Feb · Pleasant hill city',         deal:'Jun–Aug',         dealNote:'Monsoon deals'},
    JAI:{name:'Jaipur',       icon:'🏰',tip:'Best: Oct–Mar · Cool &amp; colourful',       deal:'Jun–Aug',         dealNote:'Summer/monsoon off-peak'},
    ATQ:{name:'Amritsar',     icon:'🛕',tip:'Best: Oct–Feb · Golden Temple &amp; cool',   deal:'Jun–Aug',         dealNote:'Off-season fares'},
    IXE:{name:'Mangalore',    icon:'🌿',tip:'Best: Oct–Feb · Coastal &amp; scenic',       deal:'Jun–Sep',         dealNote:'Monsoon off-peak'},
    CJB:{name:'Coimbatore',   icon:'🏔️',tip:'Best: Oct–Feb · Gateway to Ooty',           deal:'Apr–Jul',         dealNote:'Summer off-peak'},
    VTZ:{name:'Visakhapatnam',icon:'⚓',tip:'Best: Oct–Feb · Beach &amp; ports',          deal:'May–Jul',         dealNote:'Off-season deals'},
    LKO:{name:'Lucknow',      icon:'🕍',tip:'Best: Oct–Mar · Nawabi culture &amp; food',  deal:'Jun–Aug',         dealNote:'Monsoon off-peak'},
    NAG:{name:'Nagpur',       icon:'🟡',tip:'Best: Nov–Feb · Wildlife &amp; oranges',     deal:'Jun–Aug',         dealNote:'Monsoon deals'},
    CCJ:{name:'Kozhikode',    icon:'🕌',tip:'Best: Oct–Feb · Malabar coast &amp; culture',  deal:'Jun–Sep',         dealNote:'Monsoon off-peak'},
    CNN:{name:'Kannur',       icon:'🏖️',tip:'Best: Oct–Feb · Beaches &amp; forts',         deal:'Jun–Sep',         dealNote:'Monsoon off-peak'},
    TRZ:{name:'Trichy',       icon:'🛕',tip:'Best: Oct–Feb · Temples &amp; culture',       deal:'Apr–Jul',         dealNote:'Summer off-peak'},
    IXM:{name:'Madurai',      icon:'🏛️',tip:'Best: Oct–Feb · Meenakshi temple &amp; culture',deal:'Apr–Jul',         dealNote:'Summer off-peak'}
  };

  // ─── AI INTELLIGENCE DATA ─────────────────────────────────────────────────
  // Monthly fare index Jan–Dec (1.0 = avg). Based on GCC/global→India seasonal patterns.
  var MONTHLY_IDX=[1.15,0.88,0.78,0.73,0.78,0.88,0.68,0.65,0.82,1.10,1.28,1.38];
  var FL_MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Major Indian festivals with price spike data
  var FESTIVALS=[
    {name:'Diwali',         m:9, d:20, spike:70, note:'Fares spike 50–80%'},
    {name:'Christmas &amp; NY',m:11,d:24,spike:85,note:'Fares spike 60–90%'},
    {name:'Holi',           m:2, d:3,  spike:40, note:'Fares spike 30–50%'},
    {name:'Eid al-Fitr',    m:2, d:19, spike:55, note:'Fares spike 40–65%'},
    {name:'Navratri',       m:8, d:22, spike:45, note:'Fares spike 35–55%'},
    {name:'Pongal',         m:0, d:14, spike:30, note:'Fares spike 20–40%'},
  ];

  // Best dates advice per month (Jan=0 … Dec=11)
  var BEST_DATES=[
    {best:'Jan 7–16',avoid:'Jan 1–6 (New Year), Jan 25–27 (Republic Day wknd)',bookBy:'5–7 wks ahead',dayTip:'Fly Tue–Thu — ~20% cheaper',note:'Post-NY prices drop fast. Jan 8+ is good value.'},
    {best:'Feb 3–20',avoid:'None major — whole month is shoulder',bookBy:'4–5 wks ahead',dayTip:'Any midweek day — lowest demand',note:'One of the best-value months for India flights.'},
    {best:'Mar 1–7 and Mar 18–28',avoid:'Mar 10–17 (Holi week — 40–50% spike)',bookBy:'5 wks; 8 wks for Holi dates',dayTip:'Avoid the Tue before Holi weekend',note:'Split by Holi. Before and after = great value.'},
    {best:'Apr 7–25 (entire mid-month)',avoid:'Apr 1–5 (Easter weekend)',bookBy:'3–4 wks ahead — demand is low',dayTip:'Best value month — any day works',note:'Excellent deals. India is hot so fewer tourists.'},
    {best:'May 6–22',avoid:'May 1 (Labour Day), May 23–31 (early summer rush)',bookBy:'4–5 wks ahead',dayTip:'Fly Tue/Wed — school holidays push Fri/Sun up',note:'Good value early-mid May; avoid last week.'},
    {best:'Jun 9–26',avoid:'Jun 1–8 (school holiday rush), Jun 27–30',bookBy:'6–7 wks ahead',dayTip:'Midweek — weekends 20–25% pricier in Jun',note:'Monsoon begins in South India — great deals if you\'re OK with rain.'},
    {best:'Jul 8–18 (sweet spot)',avoid:'Jul 1–7 (peak school hol start), Jul 25–31',bookBy:'6–8 wks ahead to lock in low fares',dayTip:'Fly Tue–Thu. Fri/Sun can be 25–30% higher',note:'Cheapest month overall — book well ahead.'},
    {best:'Aug 5–13 and Aug 19–28',avoid:'Aug 14–17 (Independence Day ±2 days, ~30% spike)',bookBy:'5–6 wks ahead',dayTip:'Tue/Wed cheapest — lowest demand month',note:'Deep monsoon = lowest fares of the year.'},
    {best:'Sep 2–15 only',avoid:'Sep 16–30 (Navratri begins — prices rising 20–30%)',bookBy:'Book by Aug 1 for Sep travel',dayTip:'Fly early September — prices climb week by week',note:'Book early; avoid anything close to Navratri start.'},
    {best:'None — entire month is peak festival season',avoid:'Oct 1–31 (Navratri + Diwali = 50–80% above avg)',bookBy:'Book 10–14 wks ahead or consider Nov instead',dayTip:'Price difference by day is minimal — all expensive',note:'Diwali month: most expensive. Book months ahead or shift to Nov.'},
    {best:'Nov 15–28 (post-Diwali sweet spot)',avoid:'Nov 1–14 (Diwali hangover + wedding season peak)',bookBy:'7–9 wks ahead',dayTip:'Tue–Thu mid-November onwards',note:'Fares drop sharply after Diwali. Nov 15+ is a great window.'},
    {best:'Dec 3–12 only',avoid:'Dec 13–31 (Christmas &amp; NY — 60–90% above avg)',bookBy:'12–16 wks ahead for Dec 20–Jan 5 travel',dayTip:'Dec 3–12: Tue/Thu best. Dec 13+: all days expensive',note:'Dec 3–12 is a hidden gem. Dec 20+ is the priciest window of the year.'},
  ];

  // Best connections for long-haul countries (Gulf/Asia = direct, no entry needed)
  var CONNECTIONS={
    USD:{longHaul:true,country:'USA',directHrs:'15–17 hrs (Air India non-stop DEL/BOM from JFK/SFO)',hubs:[
      {rank:1,via:'Doha (DOH)',airline:'Qatar Airways',addTime:'+2–4 hrs',saving:'~30–40% cheaper than direct — consistently cheapest option',tip:'Daily from JFK, ORD, LAX, SFO, IAD, ATL, BOS, MIA',stopover:'12hr+ layover = free Doha stopover (visit Museum of Islamic Art)'},
      {rank:2,via:'Dubai (DXB)',airline:'Emirates',addTime:'+2–4 hrs',saving:'~25–35% cheaper than direct',tip:'Daily from JFK, EWR, ORD, LAX, SFO, IAD, IAH, ATL',stopover:'12hr+ = free Dubai stopover via Emirates program'},
      {rank:3,via:'Abu Dhabi (AUH)',airline:'Etihad Airways',addTime:'+2–4 hrs',saving:'~20–30% cheaper than direct',tip:'Daily from JFK, ORD, LAX, SFO, IAD',stopover:'US immigration pre-clearance at AUH — faster US return'},
      {rank:4,via:'London (LHR)',airline:'British Airways / Virgin',addTime:'+4–6 hrs',saving:'~15–20% cheaper than Air India direct',tip:'Good for East Coast — daily from JFK, BOS, ORD, LAX',stopover:'6hr+ layover = London city visit visa-free for many'},
    ]},
    GBP:{longHaul:true,country:'UK',directHrs:'8–9 hrs (Air India / BA non-stop)',hubs:[
      {rank:1,via:'Doha (DOH)',airline:'Qatar Airways',addTime:'+1–2 hrs',saving:'~25–40% cheaper than BA/Virgin direct — often UK\'s cheapest',tip:'Daily from LHR, LGW, MAN, EDI',stopover:'3hr connection usually. Doha stopover packages from $15/night'},
      {rank:2,via:'Dubai (DXB)',airline:'Emirates',addTime:'+1–2 hrs',saving:'~20–35% cheaper than direct',tip:'Multiple daily from LHR, LGW, MAN, BHX — most flexible',stopover:'12hr+ = free Dubai stopover program'},
      {rank:3,via:'Abu Dhabi (AUH)',airline:'Etihad Airways',addTime:'+1–2 hrs',saving:'~20–30% cheaper than direct',tip:'Daily from LHR. Smooth 2–3hr connection at AUH',stopover:'Short layover option for fastest connection'},
    ]},
    EUR:{longHaul:true,country:'Europe',directHrs:'8–11 hrs (Lufthansa, KLM, Air France direct)',hubs:[
      {rank:1,via:'Doha (DOH)',airline:'Qatar Airways',addTime:'+1–3 hrs',saving:'~30–45% cheaper than European carriers',tip:'Daily from FRA, MUC, AMS, CDG, ZRH, BCN, MAD, FCO',stopover:'Often under 3hrs connection — very smooth'},
      {rank:2,via:'Dubai (DXB)',airline:'Emirates',addTime:'+1–3 hrs',saving:'~25–40% cheaper than direct',tip:'Daily from 30+ European cities including FRA, AMS, CDG, ZRH',stopover:'DXB has all Indian cities as hub — best connectivity'},
      {rank:3,via:'Abu Dhabi (AUH)',airline:'Etihad Airways',addTime:'+2–3 hrs',saving:'~20–30% cheaper than direct',tip:'From FRA, AMS, CDG, MXP, MUC',stopover:'Modern terminal — comfortable connection'},
    ]},
    CAD:{longHaul:true,country:'Canada',directHrs:'15–16 hrs (Air India non-stop YYZ/YVR)',hubs:[
      {rank:1,via:'Doha (DOH)',airline:'Qatar Airways',addTime:'+2–4 hrs',saving:'~35–45% cheaper than Air Canada direct — often cheapest option',tip:'Daily from YYZ, YVR, YUL',stopover:'Check fares 8–12 weeks ahead for best CAD→India rates'},
      {rank:2,via:'Dubai (DXB)',airline:'Emirates',addTime:'+2–4 hrs',saving:'~25–35% cheaper than direct',tip:'Daily from YYZ, YVR, YUL',stopover:'12hr+ = free Dubai stopover program'},
      {rank:3,via:'London (LHR)',airline:'Air Canada / British Airways',addTime:'+3–5 hrs',saving:'~15–20% cheaper',tip:'Good for stopover — daily from YYZ, YVR',stopover:'Great if you want a London stopover'},
    ]},
    AUD:{longHaul:true,country:'Australia',directHrs:'11–14 hrs (Air India direct from MEL/SYD)',hubs:[
      {rank:1,via:'Singapore (SIN)',airline:'Singapore Airlines / Scoot',addTime:'+1–3 hrs',saving:'~20–35% vs Air India direct — most popular routing',tip:'Daily from SYD, MEL, BNE, PER. 1.5–3hr layover at SIN',stopover:'SIN airport is world-class — comfortable connection'},
      {rank:2,via:'Kuala Lumpur (KUL)',airline:'AirAsia / Malaysia Airlines',addTime:'+2–4 hrs',saving:'~35–50% cheaper — often cheapest AUS→India option',tip:'Daily from SYD, MEL, BNE, PER',stopover:'AirAsia: check baggage fees. MAS: full-service at mid-price'},
      {rank:3,via:'Dubai (DXB)',airline:'Emirates',addTime:'+3–5 hrs',saving:'~20–30% cheaper than direct',tip:'Daily from SYD, MEL, BNE, PER, ADL',stopover:'12hr+ = free Dubai stopover. Best for comfortable journey'},
      {rank:4,via:'Doha (DOH)',airline:'Qatar Airways',addTime:'+3–5 hrs',saving:'~25–35% cheaper than direct',tip:'Daily from SYD, MEL, PER',stopover:'Award-winning service — great premium economy option'},
    ]},
    NZD:{longHaul:true,country:'New Zealand',directHrs:'No direct flights — all require connections',hubs:[
      {rank:1,via:'Singapore (SIN)',airline:'Singapore Airlines',addTime:'Most seamless option',saving:'Best service quality for NZ→India journey',tip:'Daily from AKL, CHC, WLG. 2–4hr layover at SIN',stopover:'SIN transit hotel available for long layovers'},
      {rank:2,via:'Kuala Lumpur (KUL)',airline:'AirAsia / Malaysia Airlines',addTime:'Budget option',saving:'~30–40% cheaper than Singapore Airlines',tip:'Multiple weekly from AKL. Watch for AirAsia add-on costs',stopover:'KUL is a decent stopover — budget accommodation options'},
      {rank:3,via:'Dubai (DXB)',airline:'Emirates',addTime:'Longer but comfortable',saving:'Mid-range pricing — good for premium economy',tip:'Daily from AKL, CHC',stopover:'12hr+ = free Dubai stopover program'},
    ]},
  };

  function _getDealInfo(){
    var m=new Date().getMonth(), idx=MONTHLY_IDX[m];
    if(idx<=0.73) return {cls:'low',     label:'🟢 Best Deals',     pct:Math.round((1-idx)*100)};
    if(idx<=0.90) return {cls:'shoulder',label:'🟡 Shoulder Season', pct:Math.round((1-idx)*100)};
    if(idx<=1.05) return {cls:'avg',     label:'⚪ Average Fares',   pct:0};
    return               {cls:'peak',    label:'🔴 Peak Season',     pct:Math.round((idx-1)*100)};
  }

  function _getTrend(){
    var m=new Date().getMonth();
    var curr=MONTHLY_IDX[m], next=MONTHLY_IDX[(m+1)%12];
    var pct=Math.round((next-curr)/curr*100);
    if(pct> 6) return {arrow:'↑',color:'#ef4444',label:'Rising next month'};
    if(pct<-6) return {arrow:'↓',color:'var(--teal)',label:'Falling next month'};
    return            {arrow:'→',color:'var(--amber)',label:'Stable next 30 days'};
  }

  function _getBookNudge(){
    var m=new Date().getMonth(), idx=MONTHLY_IDX[m];
    if(idx<=0.73) return '🎯 You\'re in the cheapest window — book now';
    if(idx<=0.90) return '✓ Shoulder season — good fares, book 3–4 weeks out';
    if(idx>=1.20) return '⚡ Peak season — book 8–10 weeks ahead';
    return '📅 Book 4–6 weeks out for best availability';
  }

  function _getFestivalAlert(){
    var now=new Date(), y=now.getFullYear();
    for(var i=0;i<FESTIVALS.length;i++){
      var f=FESTIVALS[i];
      var fd=new Date(y,f.m,f.d);
      if(fd<now) fd=new Date(y+1,f.m,f.d);
      var days=Math.round((fd-now)/86400000);
      if(days>=0&&days<=60) return {name:f.name,days:days,spike:f.spike,note:f.note};
    }
    return null;
  }

  function _getHeatmapHTML(){
    var m=new Date().getMonth(), out='<div class="fl-hm">';
    for(var i=0;i<12;i++){
      var idx=MONTHLY_IDX[i];
      var cls=idx<=0.73?'fl-hm-low':idx<=0.90?'fl-hm-sh':idx<=1.05?'fl-hm-avg':'fl-hm-peak';
      var cur=i===m?' fl-hm-cur':'';
      var h=Math.max(4,Math.round(idx*22));
      out+='<div class="fl-hm-bar'+cur+'" title="'+FL_MONTH_NAMES[i]+': '+(idx<0.85?'Cheap':idx<1.05?'Average':'Expensive')+'">'
        +'<div class="fl-hm-fill '+cls+'" style="height:'+h+'px"></div>'
        +'<div class="fl-hm-lbl">'+FL_MONTH_NAMES[i][0]+'</div>'
        +'</div>';
    }
    return out+'</div>';
  }

  function _renderFestivalBanner(){
    var el=document.getElementById('fl-festival-banner');
    if(!el) return;
    var f=_getFestivalAlert();
    if(!f){el.style.display='none';return;}
    el.style.display='block';
    el.innerHTML='<strong>⚠️ '+f.name+'</strong> in '+f.days+' days — '+f.note+'. Book immediately or plan 2+ weeks after.';
  }

  function _renderDealStrip(){
    var el=document.getElementById('fl-deal-strip');
    if(!el) return;
    var deal=_getDealInfo(), trend=_getTrend();
    el.className='fl-deal-strip fl-ds-'+deal.cls;
    el.innerHTML='<span class="fl-ds-score">'+deal.label
      +(deal.pct>0?' &nbsp;·&nbsp; ~'+deal.pct+'% '+(deal.cls==='low'?'below avg':'above avg'):'')+'</span>'
      +'<span class="fl-ds-sep">·</span>'
      +'<span class="fl-ds-trend" style="color:'+trend.color+'">'+trend.arrow+' '+trend.label+'</span>'
      +'<span class="fl-ds-sep">·</span>'
      +'<span class="fl-ds-nudge">'+_getBookNudge()+'</span>';
  }

  let _flOrigin=null;

  function initFlights(){
    // Reset all UI to defaults on every (re-)init
    var inp=document.getElementById('fl-planner-input');
    var res=document.getElementById('fl-planner-result');
    if(inp){inp.value='';inp._resetBound=false;}
    if(res){res.style.display='none';res.innerHTML='';}
    var sm=document.getElementById('fl-opt-month');
    var sd=document.getElementById('fl-opt-dur');
    var sc=document.getElementById('fl-opt-cabin');
    var sp=document.getElementById('fl-opt-pax');
    if(sm){var _nm=(new Date().getMonth()+1)%12;sm.selectedIndex=_nm+1;}
    if(sd){for(var i=0;i<sd.options.length;i++){if(sd.options[i].value==='7 nights'){sd.selectedIndex=i;break;}}}
    if(sc) sc.selectedIndex=0;
    if(sp){for(var i=0;i<sp.options.length;i++){if(sp.options[i].value==='2 people'){sp.selectedIndex=i;break;}}}
    document.querySelectorAll('.fl-ai-chip').forEach(function(c){c.classList.remove('active');});

    var cur=baseCur||'AED';
    var data=FL[cur]||FL['AED'];
    _flOrigin=data.origins[0].code;
    // Update departure label
    var lbl=document.getElementById('fl-cur-label');
    if(lbl) lbl.innerHTML='Showing routes from <strong>'+data.country+'</strong> ('+cur+') &mdash; change country via the currency selector above';
    // Render departure airport pills
    renderOrigins(data);
    // Render all destination chips
    var chipWrap=document.getElementById('fl-ai-chips');
    if(chipWrap){
      chipWrap.innerHTML=Object.keys(DEST).map(function(code){
        var d=DEST[code];
        return '<button class="fl-ai-chip" data-city="'+d.name+'" onclick="flFillChip(this)">'+d.icon+' '+d.name+'</button>';
      }).join('');
    }
    // Pre-fill Delhi as default destination (no auto-trigger)
    var _di=document.getElementById('fl-planner-input');
    if(_di) _di.value='Delhi';
    document.querySelectorAll('.fl-ai-chip').forEach(function(c){
      if(c.getAttribute('data-city')==='Delhi') c.classList.add('active');
    });
    // Reset result on new input
    var inp=document.getElementById('fl-planner-input');
    if(inp&&!inp._resetBound){
      inp._resetBound=true;
      inp.addEventListener('input',function(){
        var res=document.getElementById('fl-planner-result');
        if(res&&res.style.display!=='none'){res.style.display='none';res.innerHTML='';}
        document.querySelectorAll('.fl-ai-chip').forEach(function(c){c.classList.remove('active');});
      });
    }
  }
  window.initFlights=initFlights;

  function renderOrigins(data){
    var wrap=document.getElementById('fl-origins');
    if(!wrap) return;
    wrap.innerHTML=data.origins.map(function(o,i){
      return '<button class="fl-pill'+(i===0?' active':'')+'" onclick="flPick(\''+o.code+'\',this)">'+o.code+' · '+o.name+'</button>';
    }).join('');
  }

  window.flPick=function(code,el){
    _flOrigin=code;
    document.querySelectorAll('.fl-pill').forEach(function(p){p.classList.remove('active');});
    el.classList.add('active');
    var cur=baseCur||'AED';
    renderDests(cur,FL[cur]||FL['AED']);
    // Re-run plan if city already selected
    var inp=document.getElementById('fl-planner-input');
    if(inp&&inp.value.trim()&&typeof flPlanTrip==='function') setTimeout(flPlanTrip,50);
  };

  // ── CARD CLICK → PLANNER ────────────────────────────────────────────────
  window._flPlanDest=function(card,query){
    var inp=document.getElementById('fl-planner-input');
    var planner=document.getElementById('fl-planner');
    if(!inp) return;
    inp.value=query;
    if(planner) planner.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(function(){
      if(typeof window.flPlanTrip==='function') window.flPlanTrip();
    },350);
  };

  function renderDests(cur,data){
    var wrap=document.getElementById('fl-dest-grid');
    if(!wrap) return;
    var from=_flOrigin||data.origins[0].code;
    var trend=_getTrend();
    // Build destination pills + detail panel
    var pills=Object.keys(DEST).map(function(code,i){
      var d=DEST[code];
      return '<button class="fl-dest-pill'+(i===0?' active':'')+'" data-code="'+code+'" onclick="flPickDest(\''+code+'\',this)">'+d.icon+' '+d.name+'</button>';
    }).join('');
    // Build detail for first city by default
    var firstCode=Object.keys(DEST)[0];
    wrap.innerHTML='<div class="fl-dest-pills-wrap"><div class="fl-dest-pills">'+pills+'</div></div>'
      +'<div id="fl-dest-detail"></div>';
    flShowDestDetail(firstCode,from,cur,data,trend);
  }

  window.flPickDest=function(code,el){
    document.querySelectorAll('.fl-dest-pill').forEach(function(p){p.classList.remove('active');});
    el.classList.add('active');
    var cur=baseCur||'AED';
    var flD=FL[cur]||FL['AED'];
    var from=_flOrigin||flD.origins[0].code;
    var trend=_getTrend();
    flShowDestDetail(code,from,cur,flD,trend);
  };

  window.flShowDestDetail=function(code,from,cur,data,trend){
    var panel=document.getElementById('fl-dest-detail');
    if(!panel) return;
    var d=DEST[code];
    if(!d){panel.innerHTML='';return;}
    var r=data.routes[code]||{min:null,max:null,dur:'varies',airlines:'Compare on Kiwi.com'};
    var price=typeof r.min==='number'
      ? cur+' '+r.min.toLocaleString()+' – '+r.max.toLocaleString()
      : '—';
    var kiwiUrl='https://kiwi.tpx.gr/i3IFxDSh?sub_id='+from.toLowerCase()+'-'+code.toLowerCase();
    var aviUrl='https://aviasales.tpx.gr/o76pMR9j?sub_id='+from.toLowerCase()+'-'+code.toLowerCase();
    panel.innerHTML='<div class="fl-dest-card-detail">'
      +'<div class="fl-dcd-top">'
      +'<span class="fl-dcd-icon">'+d.icon+'</span>'
      +'<div class="fl-dcd-info">'
      +'<div class="fl-dcd-name">'+d.name+'</div>'
      +'<div class="fl-dcd-tip">'+d.tip+'</div>'
      +'</div>'
      +'<div class="fl-dcd-fare">'
      +'<div class="fl-dcd-price">'+price+'</div>'
      +'<div class="fl-dcd-label">RT Economy</div>'
      +'</div>'
      +'</div>'
      +'<div class="fl-dcd-row2">'
      +'<span class="fl-dcd-route">'+from+' &#8594; '+code+'</span>'
      +'<span class="fl-dcd-dur">&#128336; '+r.dur+'</span>'
      +'<span class="fl-dcd-airlines">&#9992; '+r.airlines+'</span>'
      +'<span class="fl-dcd-trend" style="color:'+trend.color+'">'+trend.arrow+' '+trend.label+'</span>'
      +'</div>'
      +'<div class="fl-dcd-search-lbl">Search flights on:</div>'
      +'<div class="fl-dcd-providers">'
      +'<a class="fl-prov-btn fl-prov-kiwi" href="'+kiwiUrl+'" target="_blank" rel="noopener sponsored" title="Best for multi-city &amp; flexible dates"><img src="https://www.google.com/s2/favicons?domain=kiwi.com&sz=32" class="fl-prov-logo"> Kiwi.com</a>'
      +'<a class="fl-prov-btn fl-prov-avi" href="'+aviUrl+'" target="_blank" rel="noopener sponsored" title="Great for Gulf routes"><img src="https://www.google.com/s2/favicons?domain=aviasales.com&sz=32" class="fl-prov-logo"> Aviasales</a>'
      +'<a class="fl-prov-btn fl-prov-sky" href="https://www.skyscanner.net/transport/flights/'+from+'/'+code+'/" target="_blank" rel="noopener" title="Best price calendar"><img src="https://www.google.com/s2/favicons?domain=skyscanner.net&sz=32" class="fl-prov-logo"> Skyscanner</a>'
      +'<a class="fl-prov-btn fl-prov-gf" href="https://www.google.com/travel/flights?q=flights+'+from+'+to+'+encodeURIComponent(d.name+', India')+'" target="_blank" rel="noopener" title="Quick overview"><img src="https://www.google.com/s2/favicons?domain=google.com&sz=32" class="fl-prov-logo"> Google</a>'
      +'</div>'
      +'<div class="fl-dcd-section-lbl">Activities &amp; Experiences:</div>'
      +'<div class="fl-dcd-tours">'
      +'<a class="fl-dcd-tour-btn fl-tour-kkday" href="https://kkday.tpx.gr/7KJdYsht?sub_id=kkday-'+code.toLowerCase()+'" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=kkday.com&sz=32" class="fl-prov-logo"> KKday</a>'
      +'<a class="fl-dcd-tour-btn fl-tour-klook" href="https://klook.tpx.gr/u3SlWr1u?sub_id=klook-'+code.toLowerCase()+'" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=klook.com&sz=32" class="fl-prov-logo"> Klook</a>'
      +'</div>'
      +'<div class="fl-dcd-section-lbl">Get India eSIM:</div>'
      +'<div class="fl-dcd-esim">'
      +'<a class="fl-dcd-esim-btn fl-esim-airalo" href="https://airalo.tpx.gr/V7ilOl0Q?sub_id=esim-'+code.toLowerCase()+'" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=airalo.com&sz=32" class="fl-prov-logo"> Airalo</a>'
      +'<a class="fl-dcd-esim-btn fl-esim-yesim" href="https://yesim.tpx.gr/hTX1bFGO?sub_id=esim-'+code.toLowerCase()+'" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=yesim.tech&sz=32" class="fl-prov-logo"> Yesim</a>'
      +'</div>'
      +'<div class="fl-dcd-actions">'
      +'<button class="fl-dcd-btn fl-dcd-plan" onclick="window.flChip(\''
      +d.name+' next month, 2 people\')">✶ Plan with AI</button>'
      +'</div>'
      +'</div>';
  };

  // flChip — fill AI planner input and trigger plan
  window.flChip=function(q){
    var inp=document.getElementById('fl-planner-input');
    var res=document.getElementById('fl-planner-result');
    if(inp){inp.value=q;inp.focus();}
    if(res){res.style.display='none';res.innerHTML='';}
    inp&&inp.scrollIntoView({behavior:'smooth',block:'center'});
  };

  // Fill input from chip button — city name only; selectors supply month/cabin/pax
  window.flFillChip=function(el){
    var city=el.getAttribute('data-city');
    var inp=document.getElementById('fl-planner-input');
    if(inp) inp.value=city;
    document.querySelectorAll('.fl-ai-chip').forEach(function(c){c.classList.remove('active');});
    el.classList.add('active');
    // Auto-run plan immediately on city selection
    if(typeof flPlanTrip==='function') flPlanTrip();
  };

  // Reset result panel (called by selector changes)
  window.flResetResult=function(){
    var res=document.getElementById('fl-planner-result');
    if(res&&res.style.display!=='none'){res.style.display='none';res.innerHTML='';}
  };

  // ─── AI TRIP PLANNER ─────────────────────────────────────────────────────
  // ─── DATE WINDOW ENGINE ──────────────────────────────────────────────────

  // ── WEATHER + HOTEL DATA ─────────────────────────────────────────────────
  // Per destination: 12 months of weather. Fields: w=weather emoji, t=temp range,
  // r=rain label, note=activity note, hotel=hotel demand (1-5), hotelNote=warning
  var DEST_WEATHER={
    GOI:[ // Goa
      {w:'☀️',t:'23–32°C',r:'Dry',    note:'Peak beach season. Busy but perfect weather.',          hotel:5,hotelNote:'Fully booked by Nov. Book accommodation 3+ months ahead.'},
      {w:'☀️',t:'23–33°C',r:'Dry',    note:'Still peak. Water sports season.',                      hotel:5,hotelNote:'High demand. Hotels 80%+ booked weeks ahead.'},
      {w:'🌤️',t:'25–34°C',r:'Dry',    note:'Shoulder. Less crowded, good value.',                  hotel:3,hotelNote:'Good availability, book 4 weeks ahead.'},
      {w:'🌤️',t:'26–35°C',r:'Dry',    note:'Hot but quiet. Great deals on hotels.',                hotel:2,hotelNote:'Easy availability. Walk-in possible.'},
      {w:'🌦️',t:'27–34°C',r:'Pre-monsoon','note':'Pre-monsoon showers begin.',                     hotel:2,hotelNote:'Low demand. Great hotel deals.'},
      {w:'🌧️',t:'25–30°C',r:'Heavy',  note:'Monsoon. Beaches unsafe, some closures.',              hotel:1,hotelNote:'Very low demand. Up to 60% off hotels.'},
      {w:'⛈️',t:'24–29°C',r:'Very Heavy','note':'Peak monsoon. Most beach shacks closed.',         hotel:1,hotelNote:'Cheapest hotels of the year. Few tourists.'},
      {w:'🌧️',t:'24–30°C',r:'Heavy',  note:'Monsoon easing. Lush green landscape.',               hotel:1,hotelNote:'Still low demand. Great for budget travelers.'},
      {w:'🌦️',t:'25–32°C',r:'Light',  note:'Post-monsoon. Nature is beautiful.',                  hotel:2,hotelNote:'Rising demand. Book 3 weeks ahead.'},
      {w:'⛅',t:'24–32°C',r:'Minimal', note:'Season starting. Crowds building.',                   hotel:4,hotelNote:'Book 6 weeks ahead — season demand rising fast.'},
      {w:'☀️',t:'23–32°C',r:'Dry',    note:'Full peak season begins.',                             hotel:5,hotelNote:'Book 3+ months ahead. Festival + tourist rush.'},
      {w:'☀️',t:'22–31°C',r:'Dry',    note:'Peak Christmas & NYE. Most expensive.',                hotel:5,hotelNote:'Fully booked by October. Book immediately.'}
    ],
    COK:[ // Kochi
      {w:'☀️',t:'23–31°C',r:'Dry',    note:'Pleasant cool season. Great for sightseeing.',         hotel:4,hotelNote:'High demand. Book 4–6 weeks ahead.'},
      {w:'☀️',t:'24–32°C',r:'Dry',    note:'Best month. Warm and dry.',                            hotel:3,hotelNote:'Good availability. Book 3 weeks ahead.'},
      {w:'🌤️',t:'25–33°C',r:'Dry',    note:'Hot days. Perfect for backwaters.',                   hotel:3,hotelNote:'Moderate demand.'},
      {w:'🌤️',t:'27–34°C',r:'Dry',    note:'Hot and humid. Off-peak.',                            hotel:2,hotelNote:'Good availability and deals.'},
      {w:'🌦️',t:'28–33°C',r:'Pre-monsoon','note':'Pre-monsoon rains begin.',                      hotel:2,hotelNote:'Low demand. Hotel discounts available.'},
      {w:'🌧️',t:'25–29°C',r:'Very Heavy','note':'Peak Kerala monsoon. Ayurveda season.',          hotel:2,hotelNote:'Monsoon packages available. Book Ayurveda retreats early.'},
      {w:'⛈️',t:'24–28°C',r:'Very Heavy','note':'Heavy rains. Houseboat rides limited.',          hotel:1,hotelNote:'Very low demand. Cheapest rates of year.'},
      {w:'🌧️',t:'24–28°C',r:'Heavy',  note:'Rains continue. Onam festival this month.',           hotel:3,hotelNote:'Onam week: book early. Rest of month easy.'},
      {w:'🌦️',t:'24–30°C',r:'Moderate',note:'Post-monsoon. Greenery at its best.',               hotel:3,hotelNote:'Rising demand. Book 3 weeks ahead.'},
      {w:'⛅',t:'23–30°C',r:'Light',   note:'Tourist season begins. Great weather.',               hotel:4,hotelNote:'Book 4–6 weeks ahead — season picks up fast.'},
      {w:'☀️',t:'23–30°C',r:'Dry',    note:'Peak season. Film festival in Thiruvananthapuram.',   hotel:4,hotelNote:'High demand across Kerala. Book 6 weeks ahead.'},
      {w:'☀️',t:'22–30°C',r:'Dry',    note:'Peak Christmas. Backwaters very popular.',            hotel:5,hotelNote:'Fully booked weeks ahead. Book immediately.'}
    ],
    BOM:[ // Mumbai
      {w:'☀️',t:'17–31°C',r:'Dry',    note:'Best season. Cool, comfortable, festive.',             hotel:4,hotelNote:'High demand. Book 4–5 weeks ahead.'},
      {w:'☀️',t:'18–32°C',r:'Dry',    note:'Pleasant. Good for Elephanta & Marine Drive.',        hotel:3,hotelNote:'Moderate demand.'},
      {w:'🌤️',t:'21–33°C',r:'Dry',    note:'Getting hot. Holi festival.',                         hotel:3,hotelNote:'Holi weekend: book early.'},
      {w:'☀️',t:'24–36°C',r:'Dry',    note:'Very hot. Low tourist season.',                       hotel:2,hotelNote:'Good deals available.'},
      {w:'🌦️',t:'27–35°C',r:'Pre-monsoon','note':'Pre-monsoon. Hot and humid.',                   hotel:2,hotelNote:'Low season deals.'},
      {w:'🌧️',t:'26–30°C',r:'Very Heavy','note':'Monsoon arrives. Heavy flooding possible.',      hotel:1,hotelNote:'Lowest demand. Up to 50% off hotels.'},
      {w:'⛈️',t:'25–29°C',r:'Very Heavy','note':'Peak monsoon. City flooding common.',            hotel:1,hotelNote:'Cheapest rates. Business travel only.'},
      {w:'🌧️',t:'25–29°C',r:'Heavy',  note:'Monsoon continues. Independence Day.',               hotel:2,hotelNote:'Low demand except Independence Day weekend.'},
      {w:'🌦️',t:'25–31°C',r:'Moderate','note':'Monsoon ending. Ganesh Chaturthi festival.',      hotel:3,hotelNote:'Ganesh Chaturthi: very high demand 3 days.'},
      {w:'⛅',t:'24–33°C',r:'Light',   note:'Post-monsoon. Navratri & Diwali.',                   hotel:4,hotelNote:'Festival demand. Book 6+ weeks ahead for Diwali.'},
      {w:'☀️',t:'20–33°C',r:'Dry',    note:'Season starts. Mild and pleasant.',                   hotel:4,hotelNote:'High demand. Book 4 weeks ahead.'},
      {w:'☀️',t:'17–32°C',r:'Dry',    note:'Peak Christmas. Busiest month.',                      hotel:5,hotelNote:'Fully booked. Book 3+ months ahead.'}
    ],
    DEL:[ // Delhi
      {w:'🥶',t:'4–20°C', r:'Dry',    note:'Cold but clear. Republic Day parade.',                hotel:4,hotelNote:'Peak winter. Book 4–6 weeks ahead.'},
      {w:'🌤️',t:'7–22°C', r:'Dry',    note:'Pleasant. Best sightseeing weather.',                hotel:3,hotelNote:'Good demand. Book 3 weeks ahead.'},
      {w:'🌸',t:'13–28°C',r:'Dry',    note:'Spring. Holi festival. Flowers blooming.',            hotel:3,hotelNote:'Holi weekend books fast.'},
      {w:'☀️',t:'19–36°C',r:'Dry',    note:'Getting hot. Less ideal for outdoor sights.',         hotel:2,hotelNote:'Low season deals available.'},
      {w:'🌡️',t:'25–41°C',r:'Dry',    note:'Extreme heat. Avoid outdoor midday.',                hotel:1,hotelNote:'Cheapest rates. Indoor activities only.'},
      {w:'🌧️',t:'27–38°C',r:'Moderate','note':'Monsoon begins. Some relief from heat.',          hotel:1,hotelNote:'Very low demand. Great hotel deals.'},
      {w:'🌧️',t:'26–35°C',r:'Heavy',  note:'Peak monsoon. Waterlogging in streets.',             hotel:1,hotelNote:'Cheapest hotels of the year.'},
      {w:'🌦️',t:'25–34°C',r:'Moderate','note':'Monsoon easing. Independence Day.',               hotel:2,hotelNote:'Low demand. Budget-friendly.'},
      {w:'⛅',t:'21–34°C',r:'Light',   note:'Best post-monsoon. Navratri & Dussehra.',            hotel:3,hotelNote:'Festival week demand spikes.'},
      {w:'☀️',t:'14–33°C',r:'Dry',    note:'Perfect season. Diwali. Pleasant days.',             hotel:5,hotelNote:'Diwali: fully booked. Book 3+ months ahead.'},
      {w:'☀️',t:'8–28°C', r:'Dry',    note:'Cool and crisp. Great for monuments.',               hotel:4,hotelNote:'High demand. Book 4–5 weeks ahead.'},
      {w:'🥶',t:'5–22°C', r:'Dry',    note:'Cold winter. Foggy mornings. Christmas.',            hotel:5,hotelNote:'Peak demand. Book 3+ months ahead for Dec.'}
    ],
    BLR:[ // Bangalore
      {w:'☀️',t:'15–27°C',r:'Dry',    note:'Perfect weather. Cool evenings.',                     hotel:3,hotelNote:'Moderate demand. Book 3 weeks ahead.'},
      {w:'☀️',t:'16–29°C',r:'Dry',    note:'Best month. Comfortable all day.',                   hotel:3,hotelNote:'Good availability.'},
      {w:'🌤️',t:'18–31°C',r:'Dry',    note:'Warm days. Tech events season.',                     hotel:3,hotelNote:'Tech conference demand — check dates.'},
      {w:'🌤️',t:'19–33°C',r:'Minimal','note':'Hot afternoons. Pre-summer.',                       hotel:2,hotelNote:'Good deals available.'},
      {w:'🌦️',t:'20–32°C',r:'Light',  note:'Pre-monsoon showers. Cooling down.',                hotel:2,hotelNote:'Low season.'},
      {w:'🌧️',t:'19–28°C',r:'Moderate','note':'Monsoon season. Lush greenery.',                 hotel:2,hotelNote:'Low demand. Hotel discounts.'},
      {w:'🌧️',t:'18–26°C',r:'Moderate','note':'Comfortable despite rains. Gardens beautiful.',  hotel:2,hotelNote:'Good budget options.'},
      {w:'🌦️',t:'18–27°C',r:'Moderate','note':'Mild rains. Pleasant temperatures.',              hotel:2,hotelNote:'Low demand continues.'},
      {w:'⛅',t:'18–27°C',r:'Light',   note:'Post-monsoon. Navratri.',                            hotel:3,hotelNote:'Rising demand. Book 3 weeks ahead.'},
      {w:'☀️',t:'17–27°C',r:'Dry',    note:'Perfect cool weather. Diwali.',                      hotel:4,hotelNote:'Festival demand. Book 4–6 weeks ahead.'},
      {w:'☀️',t:'16–27°C',r:'Dry',    note:'Ideal conditions. Tech events resume.',              hotel:4,hotelNote:'Conference season — check event calendar.'},
      {w:'☀️',t:'15–26°C',r:'Dry',    note:'Cool Christmas. Year-end events.',                   hotel:4,hotelNote:'Book 4 weeks ahead for December.'}
    ],
    MAA:[ // Chennai
      {w:'☀️',t:'20–31°C',r:'Dry',    note:'Cool season. Best for sightseeing.',                  hotel:4,hotelNote:'High demand. Book 4 weeks ahead.'},
      {w:'☀️',t:'22–33°C',r:'Dry',    note:'Warm but manageable. Music season ends.',            hotel:3,hotelNote:'Moderate demand.'},
      {w:'🌤️',t:'24–35°C',r:'Dry',    note:'Getting hot. Water parks popular.',                  hotel:2,hotelNote:'Low season deals.'},
      {w:'🌡️',t:'27–38°C',r:'Dry',    note:'Very hot. Low tourist period.',                      hotel:1,hotelNote:'Cheapest rates of year.'},
      {w:'🌡️',t:'29–40°C',r:'Dry',    note:'Hottest month. Stay indoors midday.',                hotel:1,hotelNote:'Very low demand. Great value hotels.'},
      {w:'🌧️',t:'28–36°C',r:'Moderate',note:'South-west monsoon begins.',                       hotel:2,hotelNote:'Low season.'},
      {w:'🌧️',t:'27–34°C',r:'Moderate','note':'Monsoon. Beach visits limited.',                  hotel:2,hotelNote:'Low demand. Budget-friendly.'},
      {w:'🌧️',t:'27–33°C',r:'Moderate','note':'Monsoon continues. Indoor activities best.',      hotel:2,hotelNote:'Good deals available.'},
      {w:'🌧️',t:'26–33°C',r:'Heavy',  note:'North-east monsoon peak. Flooding risk.',           hotel:2,hotelNote:'Check weather forecast before travel.'},
      {w:'🌧️',t:'24–31°C',r:'Heavy',  note:'Cyclone season. Monitor weather closely.',           hotel:2,hotelNote:'Travel insurance strongly recommended.'},
      {w:'⛅',t:'22–30°C',r:'Light',   note:'Season starts. Classical music season begins.',      hotel:4,hotelNote:'Music season demand. Book 5 weeks ahead.'},
      {w:'☀️',t:'20–29°C',r:'Dry',    note:'Peak season. Pongal preparations.',                  hotel:4,hotelNote:'High demand. Book 4–6 weeks ahead.'}
    ],
    HYD:[ // Hyderabad
      {w:'☀️',t:'15–28°C',r:'Dry',    note:'Perfect cool weather. Charminar sightseeing.',       hotel:3,hotelNote:'Good demand. Book 3 weeks ahead.'},
      {w:'☀️',t:'16–30°C',r:'Dry',    note:'Pleasant. Best for outdoor heritage sites.',         hotel:3,hotelNote:'Moderate demand.'},
      {w:'🌤️',t:'20–33°C',r:'Dry',    note:'Warm. Holi festival.',                               hotel:3,hotelNote:'Holi week picks up.'},
      {w:'☀️',t:'24–38°C',r:'Dry',    note:'Very hot. Indoor activities best.',                  hotel:2,hotelNote:'Low season deals.'},
      {w:'🌡️',t:'27–40°C',r:'Dry',    note:'Hottest month. Avoid outdoor midday.',              hotel:1,hotelNote:'Cheapest rates. Business travel only.'},
      {w:'🌧️',t:'25–33°C',r:'Moderate','note':'Monsoon relief. Temperatures drop.',              hotel:2,hotelNote:'Low demand.'},
      {w:'🌧️',t:'23–30°C',r:'Heavy',  note:'Peak monsoon. Lakes full. Green city.',             hotel:1,hotelNote:'Very low demand. Cheapest hotels.'},
      {w:'🌧️',t:'22–29°C',r:'Moderate','note':'Rains continue. Pleasant temperatures.',          hotel:2,hotelNote:'Low demand continues.'},
      {w:'⛅',t:'21–30°C',r:'Light',   note:'Post-monsoon. Navratri & Bathukamma.',               hotel:3,hotelNote:'Festival demand. Book early for Navratri.'},
      {w:'☀️',t:'18–30°C',r:'Dry',    note:'Ideal weather. Diwali. Very pleasant.',              hotel:4,hotelNote:'Diwali demand. Book 4–6 weeks ahead.'},
      {w:'☀️',t:'16–29°C',r:'Dry',    note:'Great conditions. Slightly cooler.',                 hotel:3,hotelNote:'Moderate demand.'},
      {w:'🥶',t:'12–26°C',r:'Dry',    note:'Cool nights. Christmas. Comfortable days.',          hotel:4,hotelNote:'Year-end demand. Book 4 weeks ahead.'}
    ],
    CCU:[ // Kolkata
      {w:'🥶',t:'12–24°C',r:'Dry',    note:'Cool and pleasant. Post Durga Puja glow.',           hotel:3,hotelNote:'Moderate demand.'},
      {w:'☀️',t:'13–27°C',r:'Dry',    note:'Best month. Saraswati Puja.',                        hotel:3,hotelNote:'Puja days book fast.'},
      {w:'🌸',t:'18–31°C',r:'Dry',    note:'Spring. Holi festival. Flowers everywhere.',         hotel:3,hotelNote:'Holi demand.'},
      {w:'☀️',t:'23–36°C',r:'Dry',    note:'Hot and humid. Low tourist period.',                 hotel:2,hotelNote:'Good deals.'},
      {w:'🌡️',t:'27–38°C',r:'Pre-monsoon','note':'Pre-monsoon. Storms possible.',               hotel:2,hotelNote:'Low season rates.'},
      {w:'🌧️',t:'27–34°C',r:'Heavy',  note:'Monsoon. Humidity very high.',                      hotel:1,hotelNote:'Cheapest rates. Very low demand.'},
      {w:'⛈️',t:'26–32°C',r:'Very Heavy','note':'Peak monsoon. Flooding common.',               hotel:1,hotelNote:'Cheapest hotels of year.'},
      {w:'🌧️',t:'26–32°C',r:'Heavy',  note:'Monsoon continues. Independence Day.',              hotel:2,hotelNote:'Low demand.'},
      {w:'🌦️',t:'25–33°C',r:'Moderate','note':'Monsoon ending. Durga Puja preparations.',       hotel:4,hotelNote:'Durga Puja: FULLY BOOKED. Book 3+ months ahead.'},
      {w:'⛅',t:'21–31°C',r:'Light',   note:'Post-puja. Kali Puja & Diwali.',                    hotel:4,hotelNote:'Festival season. Book 6 weeks ahead.'},
      {w:'☀️',t:'16–28°C',r:'Dry',    note:'Pleasant cool season begins.',                       hotel:3,hotelNote:'Good demand. Book 4 weeks ahead.'},
      {w:'🥶',t:'12–24°C',r:'Dry',    note:'Cool Christmas. Book fair & events.',                hotel:4,hotelNote:'Year-end demand. Book 4+ weeks ahead.'}
    ],
    TRV:[ // Trivandrum
      {w:'☀️',t:'22–31°C',r:'Dry',    note:'Best season. Beaches perfect.',                      hotel:4,hotelNote:'High demand. Book 4–6 weeks ahead.'},
      {w:'☀️',t:'23–32°C',r:'Dry',    note:'Great weather. Ideal beach holiday.',                hotel:3,hotelNote:'Good demand. Book 3 weeks ahead.'},
      {w:'🌤️',t:'25–33°C',r:'Dry',    note:'Hot. Less crowded. Good deals.',                    hotel:3,hotelNote:'Moderate demand.'},
      {w:'🌤️',t:'26–34°C',r:'Dry',    note:'Hot and humid. Off-peak.',                          hotel:2,hotelNote:'Good availability.'},
      {w:'🌦️',t:'27–33°C',r:'Pre-monsoon','note':'Pre-monsoon showers begin.',                  hotel:2,hotelNote:'Low season rates.'},
      {w:'🌧️',t:'24–28°C',r:'Very Heavy','note':'Peak monsoon. Beaches unsafe for swimming.',   hotel:1,hotelNote:'Very low demand. Up to 50% off hotels.'},
      {w:'⛈️',t:'23–27°C',r:'Very Heavy','note':'Heaviest rains of year. Nature is stunning.',  hotel:1,hotelNote:'Cheapest rates. Ayurveda season.'},
      {w:'🌧️',t:'23–28°C',r:'Heavy',  note:'Onam festival. Heavy rains easing.',               hotel:3,hotelNote:'Onam: book early. Hotels fill for the festival.'},
      {w:'🌦️',t:'23–30°C',r:'Light',  note:'Post-monsoon. Greenery beautiful.',                 hotel:3,hotelNote:'Rising demand. Book 3 weeks ahead.'},
      {w:'☀️',t:'22–30°C',r:'Dry',    note:'Season starts. Kerala temple festivals.',            hotel:4,hotelNote:'Season building. Book 5 weeks ahead.'},
      {w:'☀️',t:'22–30°C',r:'Dry',    note:'Peak begins. Padmanabhaswamy temple events.',       hotel:4,hotelNote:'High demand. Book 6 weeks ahead.'},
      {w:'☀️',t:'21–30°C',r:'Dry',    note:'Peak Christmas. Beach holiday season.',             hotel:5,hotelNote:'Fully booked. Book 3+ months ahead.'}
    ],
    AMD:[ // Ahmedabad
      {w:'🥶',t:'11–25°C',r:'Dry',    note:'Cool and pleasant. Kite Festival (Uttarayan).',      hotel:4,hotelNote:'Uttarayan: fully booked 2 days. Book 2+ months ahead.'},
      {w:'☀️',t:'12–28°C',r:'Dry',    note:'Best weather. Comfortable days.',                    hotel:3,hotelNote:'Moderate demand.'},
      {w:'🌤️',t:'17–33°C',r:'Dry',    note:'Warm. Holi festival.',                               hotel:3,hotelNote:'Holi demand.'},
      {w:'🌡️',t:'23–39°C',r:'Dry',    note:'Very hot. Low tourist season.',                      hotel:1,hotelNote:'Cheapest rates. Business travel.'},
      {w:'🌡️',t:'28–42°C',r:'Dry',    note:'Hottest. Extreme heat. Avoid outdoor.',             hotel:1,hotelNote:'Very low demand.'},
      {w:'🌧️',t:'27–36°C',r:'Moderate','note':'Monsoon brings relief.',                          hotel:1,hotelNote:'Low season.'},
      {w:'🌧️',t:'25–32°C',r:'Heavy',  note:'Peak monsoon. Flooded streets possible.',           hotel:1,hotelNote:'Cheapest hotels. Very low demand.'},
      {w:'🌧️',t:'25–32°C',r:'Moderate','note':'Rains easing. Independence Day.',                hotel:2,hotelNote:'Low demand.'},
      {w:'⛅',t:'23–33°C',r:'Light',   note:'Post-monsoon. Navratri festival.',                   hotel:5,hotelNote:'Navratri: FULLY BOOKED. Book 3+ months ahead.'},
      {w:'☀️',t:'18–33°C',r:'Dry',    note:'Perfect weather. Diwali.',                           hotel:4,hotelNote:'Diwali demand. Book 4–6 weeks ahead.'},
      {w:'☀️',t:'14–30°C',r:'Dry',    note:'Cool and pleasant.',                                  hotel:3,hotelNote:'Moderate demand.'},
      {w:'🥶',t:'11–26°C',r:'Dry',    note:'Cool Christmas. Great for heritage walks.',          hotel:3,hotelNote:'Year-end demand. Book 3 weeks ahead.'}
    ]
  };

  function _renderWeatherHotel(destCode, travelM, route){
    var dw=DEST_WEATHER[destCode];
    if(!dw) return '';
    var w=dw[travelM];
    var hotelColor=w.hotel>=5?'#ef4444':w.hotel>=4?'#f59e0b':w.hotel>=3?'#14b8a6':'#64748b';
    var hotelBars='';
    for(var i=1;i<=5;i++){
      hotelBars+='<span class="fl-hotel-dot" style="background:'+(i<=w.hotel?hotelColor:'var(--border)')+'"></span>';
    }
    var hotelLabel=w.hotel>=5?'Fully Booked Season':w.hotel>=4?'High Demand':w.hotel>=3?'Moderate Demand':w.hotel>=2?'Easy Availability':'Very Low Demand';
    return '<div class="fl-weather-card">'
      +'<div class="fl-weather-top">'
      +'<span class="fl-weather-icon">'+w.w+'</span>'
      +'<div class="fl-weather-info">'
      +'<div class="fl-weather-temp">'+w.t+'</div>'
      +'<div class="fl-weather-rain">'+w.r+' &nbsp;&middot;&nbsp; '+w.note+'</div>'
      +'</div>'
      +'</div>'
      +'<div class="fl-hotel-row">'
      +'<span class="fl-hotel-label">&#127968; Hotel demand:</span>'
      +'<div class="fl-hotel-dots">'+hotelBars+'</div>'
      +'<span class="fl-hotel-grade" style="color:'+hotelColor+'">'+hotelLabel+'</span>'
      +'</div>'
      +'<div class="fl-hotel-note">'+w.hotelNote+'</div>'
      +'</div>';
  }


  // ── BEST DAY TO BOOK ─────────────────────────────────────────────────────
  // Per-airline booking intelligence
  var AIRLINE_TIPS={
    'Emirates':      {day:'Tue or Wed',time:'5–8 AM',why:'Emirates releases fare adjustments Tuesday morning. Mid-week searches beat weekend prices by 8–15%.'},
    'Air India':     {day:'Wed or Thu',time:'6–9 AM',why:'Air India drops fares mid-week after Monday inventory resets. Thursday morning often has surprise deals.'},
    'IndiGo':        {day:'Tue',       time:'Early AM',why:'IndiGo flash sales typically launch Tuesday. Set an alert and check first thing in the morning.'},
    'AirAsia':       {day:'Mon or Tue',time:'Midnight–2 AM',why:'AirAsia Big Sales launch Monday midnight MYT. Their Tuesday fares are consistently the lowest of the week.'},
    'Batik Air':     {day:'Tue',       time:'Early AM',why:'Batik Air follows AirAsia sale cycles. Tuesday morning searches give best prices.'},
    'Qatar Airways': {day:'Tue or Wed',time:'5–9 AM',why:'Qatar Airways adjusts pricing mid-week. Tuesday/Wednesday searches often surface 10–20% cheaper fares.'},
    'Etihad':        {day:'Mon or Tue',time:'6–9 AM',why:'Etihad Monday promotions carry into Tuesday. Avoid Friday/Saturday when prices peak.'},
    'flydubai':      {day:'Wed',       time:'Any',why:'flydubai runs mid-week promotions. Wednesday searches consistently outperform weekend prices.'},
    'Air Arabia':    {day:'Tue or Wed',time:'Early AM',why:'Air Arabia promotional fares typically go live Tuesday. Mid-week window beats weekend by 10–18%.'},
    'Singapore Airlines':{day:'Tue',  time:'5–8 AM',why:'SIA Tuesday fare adjustments are well-documented. Early morning searches before 8 AM get the best rates.'},
    'Malaysia Airlines': {day:'Tue or Wed',time:'Early AM',why:'MAS mid-week pricing is notably cheaper. Avoid booking Friday–Sunday.'},
    'Scoot':         {day:'Tue',       time:'Any',why:'Scoot launches promotions Tuesday. Sign up for their newsletter for advance notice.'},
    'British Airways':{day:'Tue',      time:'5–9 AM',why:'BA adjusts fares overnight Monday into Tuesday. Early morning Tuesday is optimal for Gulf and India routes.'},
    'Lufthansa':     {day:'Wed',       time:'Early AM',why:'Lufthansa mid-week fares are typically 12–18% below weekend prices on India routes.'},
    'Air Canada':    {day:'Tue or Wed',time:'6–9 AM',why:'Air Canada fare sales launch mid-week. Tuesday/Wednesday morning is the optimal search window.'},
    'United Airlines':{day:'Tue',      time:'Early AM',why:'US carriers traditionally adjust fares Tuesday morning following weekend inventory changes.'},
    'Qantas':        {day:'Tue or Wed',time:'Early AM',why:'Qantas mid-week fares on India routes are consistently 10–15% below Friday/Saturday prices.'}
  };

  // Optimal booking window by route region
  var BOOKING_WINDOW={
    gulf:   {sweet:'6–10 weeks',early:'12 weeks',late:'3 weeks', tip:'Gulf routes are competitive — airlines adjust prices frequently. The 6–10 week window gives best mix of price and availability.'},
    sea:    {sweet:'4–8 weeks', early:'10 weeks',late:'2 weeks', tip:'SE Asia routes (AirAsia/budget carriers) often hold prices well. Flash sales at 4–6 weeks can beat early-bird fares.'},
    longhaul:{sweet:'8–14 weeks',early:'16 weeks',late:'4 weeks',tip:'Long-haul routes require more lead time. Business class especially — book 12+ weeks ahead for best availability.'}
  };

  function _getRouteRegion(cur){
    var gulf=['AED','SAR','QAR','KWD','BHD','OMR'];
    var sea=['MYR','SGD'];
    if(gulf.indexOf(cur)>=0) return 'gulf';
    if(sea.indexOf(cur)>=0) return 'sea';
    return 'longhaul';
  }

  function _renderBookingTips(route, cur, wks, cabinClass){
    if(!route) return '';
    var region=_getRouteRegion(cur);
    var bw=BOOKING_WINDOW[region];

    // Find best airline tip from route airlines string
    var airStr=route.airlines||'';
    var bestTip=null;
    var bestAirline='';
    for(var al in AIRLINE_TIPS){
      if(airStr.indexOf(al)>=0){bestTip=AIRLINE_TIPS[al];bestAirline=al;break;}
    }

    // Booking window status
    var wkNum=wks||0;
    var sweetParts=bw.sweet.split('–');
    var sweetMin=parseInt(sweetParts[0]);
    var sweetMax=parseInt(sweetParts[1]||sweetParts[0]);
    var inSweet=wkNum>=sweetMin&&wkNum<=sweetMax;
    var tooEarly=wkNum>sweetMax;
    var tooLate=wkNum<sweetMin;
    var windowCls=inSweet?'fl-bk-sweet':tooEarly?'fl-bk-early':'fl-bk-late';
    var windowIcon=inSweet?'🎯':tooEarly?'⏳':'⚡';
    var windowLabel=inSweet?'You are in the sweet spot!':tooEarly?'Too early — wait '+(wkNum-sweetMax)+' weeks':' Book immediately — past optimal window';

    var html='<div class="fl-bk-card">'
      +'<div class="fl-bk-title">&#128197; Booking intelligence</div>'

      // Booking window
      +'<div class="fl-bk-window '+windowCls+'">'
      +'<div class="fl-bk-win-top">'+windowIcon+' <strong>'+windowLabel+'</strong></div>'
      +'<div class="fl-bk-win-detail">Sweet spot for this route: <strong>'+bw.sweet+' before travel</strong> &nbsp;&middot;&nbsp; You are at: <strong>~'+wkNum+' weeks</strong></div>'
      +'<div class="fl-bk-win-tip">'+bw.tip+'</div>'
      +'</div>';

    // Best day tip
    if(bestTip){
      html+='<div class="fl-bk-day">'
        +'<div class="fl-bk-day-top">'
        +'<span class="fl-bk-day-label">Best day to search — <strong>'+bestAirline+'</strong></span>'
        +'<span class="fl-bk-day-val">'+bestTip.day+'</span>'
        +'</div>'
        +'<div class="fl-bk-day-time">&#9200; Best time: '+bestTip.time+'</div>'
        +'<div class="fl-bk-day-why">'+bestTip.why+'</div>'
        +'</div>';
    }

    // Business class note
    if(cabinClass==='business'){
      html+='<div class="fl-bk-biz">&#128188; Business class tip: Book <strong>12+ weeks ahead</strong> for best seat selection. Last-minute business fares are typically 2–3× more expensive than advance purchase.</div>';
    }

    html+='</div>';
    return html;
  }


  // ── INDIA DAILY COST ESTIMATOR ───────────────────────────────────────────
  // Per city, 3 tiers. All costs in INR/day per person.
  // hotel=per night, food=meals, transport=local, act=activities/entry
  var CITY_COSTS={
    GOI:{city:'Goa',
      budget:{total:2500, hotel:800,  food:900,  transport:400, act:400, note:'Guesthouse near beach, beach shacks & local joints, scooter rental, free beaches'},
      mid:   {total:6500, hotel:3000, food:1800, transport:800, act:900, note:'Beach resort or boutique hotel, mix of cafes & restaurants, taxi/Ola, water sports'},
      luxury:{total:18000,hotel:10000,food:4000, transport:2000,act:2000,note:'5-star resort, fine dining, private transfers, premium water sports & spa'}
    },
    COK:{city:'Kochi',
      budget:{total:2000, hotel:700,  food:700,  transport:300, act:300, note:'Homestay, Kerala meals & local eateries, bus & auto, Fort Kochi walk'},
      mid:   {total:5000, hotel:2200, food:1500, transport:700, act:600, note:'Heritage hotel, seafood restaurants, Ola/cab, houseboat day trip'},
      luxury:{total:14000,hotel:7500, food:3000, transport:1500,act:2000,note:'Luxury houseboat overnight, fine dining, private driver, Ayurveda treatments'}
    },
    BOM:{city:'Mumbai',
      budget:{total:2800, hotel:900,  food:900,  transport:500, act:500, note:'Budget hotel in suburbs, local trains & dabba food, Marine Drive & free sights'},
      mid:   {total:7000, hotel:3500, food:1800, transport:800, act:900, note:'3-star business hotel, mid-range restaurants, Uber, Gateway of India tours'},
      luxury:{total:20000,hotel:12000,food:4500, transport:2000,act:1500,note:'Taj/Oberoi, fine dining at Trishna or Trisha, private car, Elephanta premium tour'}
    },
    DEL:{city:'Delhi',
      budget:{total:2200, hotel:700,  food:700,  transport:400, act:400, note:'Budget guesthouse in Paharganj, dhabas & street food, Metro, Old Delhi walk'},
      mid:   {total:5500, hotel:2500, food:1500, transport:700, act:800, note:'3-star hotel near Connaught Place, restaurants, Uber, Qutub Minar & museum entry'},
      luxury:{total:18000,hotel:10000,food:4000, transport:2000,act:2000,note:'ITC Maurya or Leela, fine dining, private chauffeur, exclusive heritage tours'}
    },
    BLR:{city:'Bangalore',
      budget:{total:2000, hotel:700,  food:700,  transport:350, act:250, note:'PG or budget hotel, Darshinis (local eateries), Metro & bus, Lalbagh & Cubbon Park'},
      mid:   {total:5000, hotel:2200, food:1500, transport:600, act:700, note:'3-star hotel, cafes & restaurants, Ola, tech parks & brewery tours'},
      luxury:{total:15000,hotel:8000, food:3500, transport:1500,act:2000,note:'JW Marriott or ITC Windsor, fine dining, private car, vineyard day trips'}
    },
    MAA:{city:'Chennai',
      budget:{total:2000, hotel:650,  food:700,  transport:350, act:300, note:'Budget lodge, filter coffee & meals, bus & auto, Marina Beach & temples'},
      mid:   {total:5000, hotel:2200, food:1500, transport:600, act:700, note:'3-star hotel, seafood & restaurants, cab, Mahabalipuram day trip'},
      luxury:{total:16000,hotel:9000, food:3500, transport:1500,act:2000,note:'ITC Grand Chola or Taj Coromandel, fine dining, private driver, temple circuit'}
    },
    HYD:{city:'Hyderabad',
      budget:{total:2000, hotel:650,  food:700,  transport:350, act:300, note:'Budget hotel near Old City, biryani & irani chai, TSRTC bus, Charminar area'},
      mid:   {total:5000, hotel:2200, food:1500, transport:600, act:700, note:'3-star hotel, Bawarchi & Paradise biryani, Ola, Golconda Fort & Ramoji'},
      luxury:{total:15000,hotel:8500, food:3000, transport:1500,act:2000,note:'Taj Falaknuma Palace or ITC Kohenur, fine dining, private transfers, Nizam heritage tours'}
    },
    CCU:{city:'Kolkata',
      budget:{total:1800, hotel:600,  food:600,  transport:300, act:300, note:'Guest house, mishti doi & kathi rolls, tram & Metro, Victoria Memorial free gardens'},
      mid:   {total:4500, hotel:2000, food:1300, transport:600, act:600, note:'3-star hotel, Arsalan biryani & restaurants, Uber, Museum & Howrah Bridge tour'},
      luxury:{total:14000,hotel:8000, food:3000, transport:1500,act:1500,note:'Taj Bengal or ITC Royal Bengal, fine dining, private car, exclusive heritage & cultural tours'}
    },
    TRV:{city:'Trivandrum',
      budget:{total:1800, hotel:600,  food:650,  transport:300, act:250, note:'Homestay, Kerala sadya & tea shops, bus & auto, Padmanabhaswamy Temple area'},
      mid:   {total:4500, hotel:2000, food:1300, transport:600, act:600, note:'3-star hotel, seafood & Keralite cuisine, cab, Kovalam beach & backwaters'},
      luxury:{total:13000,hotel:7000, food:3000, transport:1500,act:1500,note:'Leela Kovalam or Taj Green Cove, Ayurveda resort, private driver, houseboat overnight'}
    },
    AMD:{city:'Ahmedabad',
      budget:{total:1800, hotel:600,  food:600,  transport:300, act:300, note:'Guest house, thali & street food, BRTS bus & auto, Sabarmati Ashram (free entry)'},
      mid:   {total:4500, hotel:2000, food:1200, transport:600, act:700, note:'3-star hotel, Agashiye rooftop restaurant, Ola, Heritage walk & Adalaj step well'},
      luxury:{total:13000,hotel:7000, food:2800, transport:1500,act:1700,note:'House of MG or Hyatt, fine Gujarati dining, private car, Modhera Sun Temple day trip'}
    }
  };

  function _renderCityCosts(destCode, tripDays, groupN, midRateVal){
    var cc=CITY_COSTS[destCode];
    if(!cc) return '';
    var days=tripDays||7;
    var pax=groupN||1;
    var rate=midRateVal||85; // fallback INR rate

    function tripTotal(daily){ return Math.round(daily*days*pax); }
    function toFx(inr){ return Math.round(inr/rate); }

    var tiers=[
      {key:'budget',label:'&#127807; Budget',color:'#14b8a6', data:cc.budget},
      {key:'mid',   label:'&#11088; Mid-range',color:'#f59e0b',data:cc.mid},
      {key:'luxury',label:'&#128081; Luxury',  color:'#6366f1', data:cc.luxury}
    ];

    var html='<div class="fl-cost-card">'
      +'<div class="fl-cost-title">&#128176; '+cc.city+' — daily spend per person (INR)</div>'
      +'<div class="fl-cost-tiers">';

    for(var ti=0;ti<tiers.length;ti++){
      var t=tiers[ti]; var d=t.data;
      var tripT=tripTotal(d.total);
      html+='<div class="fl-cost-tier">'
        +'<div class="fl-cost-tier-hd" style="color:'+t.color+'">'+t.label+'</div>'
        +'<div class="fl-cost-total">&#8377;'+d.total.toLocaleString()+'/day</div>'
        +'<div class="fl-cost-breakdown">'
        +'<div class="fl-cost-row"><span>&#127968; Hotel/night</span><span>&#8377;'+d.hotel.toLocaleString()+'</span></div>'
        +'<div class="fl-cost-row"><span>&#127860; Food</span><span>&#8377;'+d.food.toLocaleString()+'</span></div>'
        +'<div class="fl-cost-row"><span>&#128663; Transport</span><span>&#8377;'+d.transport.toLocaleString()+'</span></div>'
        +'<div class="fl-cost-row"><span>&#127981; Activities</span><span>&#8377;'+d.act.toLocaleString()+'</span></div>'
        +'</div>'
        +'<div class="fl-cost-trip">'+days+'n &times;'+pax+' = &#8377;'+tripT.toLocaleString()+'</div>'
        +'<div class="fl-cost-note">'+d.note+'</div>'
        +'</div>';
    }

    html+='</div></div>';
    return html;
  }


  // ── DEPARTURE AIRPORT COMPARISON ─────────────────────────────────────────
  // Per currency: airport fare differentials vs base airport (index 0)
  // diff: negative = cheaper than main hub, positive = more expensive
  var AIRPORT_CMP={
    AED:{
      airports:[
        {code:'DXB',name:'Dubai',diff:0,     note:'Most routes, highest frequency — Emirates, flydubai, Air India'},
        {code:'AUH',name:'Abu Dhabi',diff:-50, note:'Etihad hub. Often AED 50–150 cheaper on Etihad routes. Check direct vs via DXB'},
        {code:'SHJ',name:'Sharjah',diff:-120, note:'Air Arabia home base. Typically cheapest for economy. Add ~45 min drive from Dubai'}
      ],
      tip:'SHJ is consistently cheapest but limited routes. AUH via Etihad beats DXB for South India.'
    },
    GBP:{
      airports:[
        {code:'LHR',name:'London Heathrow',diff:0,    note:'Main hub. Most airlines, most routes. Expensive — Heathrow surcharges add £30–60'},
        {code:'LGW',name:'London Gatwick', diff:-80,  note:'Often £60–100 cheaper than LHR. IndiGo and some Air India flights depart here'},
        {code:'MAN',name:'Manchester',     diff:-120,  note:'Great for North England. Direct flights to Mumbai, Delhi, Amritsar. Often £80–140 cheaper than LHR'},
        {code:'BHX',name:'Birmingham',     diff:-90,  note:'Large Indian diaspora hub. Direct routes to several India cities. Check Jet2 and TUI'}
      ],
      tip:'MAN and BHX consistently beat LHR for India routes. Worth the journey from London if saving £100+.'
    },
    AUD:{
      airports:[
        {code:'SYD',name:'Sydney',   diff:0,    note:'Most routes, best frequency. Singapore Airlines, Qantas, Air India all operate'},
        {code:'MEL',name:'Melbourne',diff:-80,  note:'Strong competition — AUD 50–120 cheaper than SYD on many routes. Air India direct to DEL'},
        {code:'PER',name:'Perth',    diff:-200, note:'Closest Australian city to India (5–6 hr less travel). Often AUD 150–250 cheaper. IndiGo and Scoot serve PER'},
        {code:'BNE',name:'Brisbane', diff:-60,  note:'Good for QLD residents. Via Singapore or Kuala Lumpur — check layover times'}
      ],
      tip:'PER is dramatically cheaper and closer to India. MEL often beats SYD on Air India direct routes.'
    },
    USD:{
      airports:[
        {code:'JFK',name:'New York JFK',diff:0,    note:'Busiest route. Air India, United, Jet Blue. High competition but also high demand'},
        {code:'EWR',name:'Newark',       diff:-40,  note:'Often USD 30–60 cheaper than JFK. United hub. Easy from Manhattan via NJ Transit'},
        {code:'ORD',name:'Chicago',      diff:-80,  note:'Air India direct to DEL/BOM. USD 60–120 cheaper than NYC for Midwest travelers'},
        {code:'SFO',name:'San Francisco',diff:-60,  note:'Good for West Coast. Air India and United direct. USD 40–80 cheaper than JFK for Bay Area'}
      ],
      tip:'Chicago (ORD) has strong Air India direct service at competitive prices. PHL and IAD also worth checking.'
    },
    MYR:{
      airports:[
        {code:'KUL',name:'Kuala Lumpur', diff:0,   note:'KLIA — main hub. AirAsia, Malaysia Airlines, Air India all operate. Most routes'},
        {code:'PEN',name:'Penang',        diff:-80, note:'MYR 60–120 cheaper for some routes. AirAsia KLIA2-style budget terminal. Fewer direct routes to India'}
      ],
      tip:'KUL has far more frequency and competition. PEN worth checking if you live in Northern Malaysia.'
    },
    CAD:{
      airports:[
        {code:'YYZ',name:'Toronto',    diff:0,    note:'Main hub. Air India, Air Canada, WestJet. Most Canada-India routes originate here'},
        {code:'YVR',name:'Vancouver',  diff:-100, note:'West Coast — shorter flight to India. Air India direct to DEL. CAD 80–150 cheaper than YYZ'},
        {code:'YUL',name:'Montreal',   diff:-60,  note:'Good for Quebec residents. Air India via LHR or direct. CAD 40–90 cheaper than YYZ'}
      ],
      tip:'YVR is geographically closer to India and often significantly cheaper. Worth the positioning flight from Toronto.'
    },
    EUR:{
      airports:[
        {code:'FRA',name:'Frankfurt',  diff:0,   note:'Lufthansa hub. Most India connections. Premium pricing but excellent connectivity'},
        {code:'AMS',name:'Amsterdam',  diff:-60, note:'KLM hub. Often EUR 40–90 cheaper than FRA. Good connections to all India metros'},
        {code:'CDG',name:'Paris CDG',  diff:-40, note:'Air France hub. EUR 30–60 cheaper for some routes. Direct to Mumbai and Delhi'},
        {code:'ZRH',name:'Zurich',     diff:-30, note:'Swiss/Edelweiss. Niche but competitive pricing especially for South India routes'}
      ],
      tip:'AMS consistently offers the best EUR fares for India. FRA has the best connectivity but highest prices.'
    }
  };

  function _renderAirportCompare(cur, destCode, route, cabinFareMult){
    var cmp=AIRPORT_CMP[cur];
    if(!cmp||!route) return '';
    var airports=cmp.airports;
    if(airports.length<2) return '';

    var html='<div class="fl-apt-card">'
      +'<div class="fl-apt-title">&#9992; Departure airport comparison — '+cmp.tip+'</div>'
      +'<div class="fl-apt-rows">';

    var baseMin=Math.round(route.min*cabinFareMult);
    var baseMax=Math.round(route.max*cabinFareMult);

    for(var ai=0;ai<airports.length;ai++){
      var ap=airports[ai];
      var aptMin=baseMin+ap.diff;
      var aptMax=baseMax+ap.diff;
      var isBest=ap.diff===Math.min.apply(null,airports.map(function(a){return a.diff;}));
      var isMost=ai===0;
      var diffLabel=ap.diff===0?'Base':ap.diff<0?'Save '+cur+' '+Math.abs(ap.diff):'+ '+cur+' '+ap.diff;
      var skUrl='https://kiwi.tpx.gr/i3IFxDSh?sub_id='+ap.code.toLowerCase()+'-'+(destCode||'BOM').toLowerCase();

      html+='<div class="fl-apt-row'+(isBest?' fl-apt-best':'')+'">'
        +'<div class="fl-apt-left">'
        +'<span class="fl-apt-code">'+ap.code+'</span>'
        +'<span class="fl-apt-name">'+ap.name+'</span>'
        +(isBest?'<span class="fl-apt-badge">&#127775; Cheapest</span>':'')
        +'</div>'
        +'<div class="fl-apt-mid">'
        +'<div class="fl-apt-fare">'+cur+' '+Math.max(0,aptMin).toLocaleString()+'&ndash;'+Math.max(0,aptMax).toLocaleString()+'</div>'
        +'<div class="fl-apt-diff'+(ap.diff<0?' fl-apt-save':ap.diff===0?' fl-apt-base':' fl-apt-prem')+'">'+diffLabel+'</div>'
        +'</div>'
        +'<a class="fl-apt-search" href="'+skUrl+'" target="_blank" rel="noopener">Search &#8599;</a>'
        +'</div>'
        +'<div class="fl-apt-note">'+ap.note+'</div>';
    }

    html+='</div></div>';
    return html;
  }


  // ── MILES & POINTS VALUE v6.8 ────────────────────────────────────────────
  // Per currency: frequent flyer programs with approximate India route awards
  // econ/biz = miles needed one-way, cpm = local currency value per mile
  var FF_PROGRAMS={
    AED:[
      {prog:'Emirates Skywards',    econ:12000,biz:50000,cpm:0.045,link:'https://www.emirates.com/english/skywards/'},
      {prog:'Etihad Guest',         econ:10000,biz:40000,cpm:0.042,link:'https://www.etihad.com/en/etihad-guest'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.035,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    SAR:[
      {prog:'Saudia Alfursan',      econ:10000,biz:40000,cpm:0.065,link:'https://www.saudia.com/experience/alfursan'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.040,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    QAR:[
      {prog:'Qatar Airways Privilege Club',econ:12000,biz:45000,cpm:0.055,link:'https://www.qatarairways.com/en/privilege-club.html'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.040,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    KWD:[
      {prog:'Kuwait Airways Oasis',  econ:9000,biz:36000,cpm:0.016,link:'https://www.kuwaitairways.com/'},
      {prog:'Emirates Skywards',     econ:12000,biz:50000,cpm:0.013,link:'https://www.emirates.com/english/skywards/'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.010,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    BHD:[
      {prog:'Gulf Air Falconflyer',  econ:9000,biz:36000,cpm:0.016,link:'https://www.gulfair.com/falconflyer'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.013,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    OMR:[
      {prog:'Oman Air Sindbad',      econ:9000,biz:36000,cpm:0.017,link:'https://www.omanair.com/en/sindbad'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.013,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    MYR:[
      {prog:'AirAsia BIG Points',    econ:8000,biz:null,cpm:0.025,link:'https://www.airasia.com/big/en/'},
      {prog:'Malaysia Airlines Enrich',econ:10000,biz:40000,cpm:0.028,link:'https://www.malaysiaairlines.com/my/en/enrich.html'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.020,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    SGD:[
      {prog:'Singapore KrisFlyer',   econ:12000,biz:45000,cpm:0.020,link:'https://www.singaporeair.com/en_UK/krisflyer/'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.018,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    AUD:[
      {prog:'Qantas Frequent Flyer', econ:18000,biz:54000,cpm:0.022,link:'https://www.qantas.com/au/en/frequent-flyer.html'},
      {prog:'Velocity (Virgin Aus)', econ:14000,biz:50000,cpm:0.020,link:'https://www.virginaustralia.com/au/en/velocity/'},
      {prog:'Singapore KrisFlyer',   econ:12000,biz:45000,cpm:0.018,link:'https://www.singaporeair.com/en_UK/krisflyer/'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.015,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    NZD:[
      {prog:'Air NZ Airpoints',      econ:null,biz:null,cpm:0,link:'https://www.airnewzealand.co.nz/airpoints',note:'Airpoints uses dollar values not miles'},
      {prog:'Qantas Frequent Flyer', econ:18000,biz:54000,cpm:0.019,link:'https://www.qantas.com/au/en/frequent-flyer.html'},
      {prog:'Singapore KrisFlyer',   econ:12000,biz:45000,cpm:0.016,link:'https://www.singaporeair.com/en_UK/krisflyer/'}
    ],
    GBP:[
      {prog:'British Airways Avios', econ:8500,biz:30000,cpm:0.012,link:'https://www.britishairways.com/en-gb/executive-club'},
      {prog:'Virgin Atlantic Flying Club',econ:9000,biz:35000,cpm:0.011,link:'https://www.virginatlantic.com/en/gb/flying-club.html'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.009,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    USD:[
      {prog:'United MileagePlus',    econ:15000,biz:55000,cpm:0.014,link:'https://www.united.com/en/us/fly/mileageplus.html'},
      {prog:'Delta SkyMiles',        econ:14000,biz:50000,cpm:0.012,link:'https://www.delta.com/us/en/skymiles/overview'},
      {prog:'American AAdvantage',   econ:15000,biz:55000,cpm:0.013,link:'https://www.aa.com/aadvantage/home.do'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.010,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    CAD:[
      {prog:'Aeroplan (Air Canada)', econ:15000,biz:55000,cpm:0.018,link:'https://www.aircanada.com/ca/en/aco/home/aeroplan.html'},
      {prog:'WestJet Rewards',       econ:null,biz:null,cpm:0,link:'https://www.westjet.com/en-ca/westjet-rewards',note:'WestJet uses dollar values not miles'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.010,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ],
    EUR:[
      {prog:'Lufthansa Miles & More',econ:12500,biz:45000,cpm:0.013,link:'https://www.miles-and-more.com/'},
      {prog:'Air France/KLM Flying Blue',econ:11000,biz:42000,cpm:0.014,link:'https://www.flyingblue.com/'},
      {prog:'Air India Flying Returns',econ:7500,biz:30000,cpm:0.009,link:'https://www.airindia.com/en-in/frequent-flyer'}
    ]
  };

  function _renderMilesValue(cur,route,cabinFareMult,cabinClass){
    var progs=FF_PROGRAMS[cur];
    if(!progs||!route) return '';

    var cashEcon=Math.round(route.min*1);
    var cashBiz=Math.round(route.min*( (typeof BUSINESS_MULT!=='undefined'&&BUSINESS_MULT[cur])||3.5 ));
    var isBiz=(cabinClass==='business');
    var cashFare=isBiz?cashBiz:cashEcon;

    var rows='';
    for(var pi=0;pi<progs.length;pi++){
      var p=progs[pi];
      var milesNeeded=isBiz?p.biz:p.econ;
      if(p.note){
        rows+='<div class="fl-mi-row"><div class="fl-mi-prog"><a href="'+p.link+'" target="_blank" rel="noopener" class="fl-mi-link">'+p.prog+'</a></div>'
          +'<div class="fl-mi-detail fl-mi-note">'+p.note+'</div></div>';
        continue;
      }
      if(!milesNeeded) continue;
      var milesVal=Math.round(milesNeeded*p.cpm);
      var ratio=cashFare>0?milesVal/cashFare:0;
      var verdict='';
      var vClass='';
      if(ratio>=1.2){verdict='&#127775; Great redemption — miles beat cash';vClass='fl-mi-great';}
      else if(ratio>=0.9){verdict='&#9989; Fair — similar to cash price';vClass='fl-mi-fair';}
      else if(ratio>=0.6){verdict='&#9888;&#65039; Below average — consider cash instead';vClass='fl-mi-weak';}
      else{verdict='&#10060; Poor value — pay cash';vClass='fl-mi-poor';}

      rows+='<div class="fl-mi-row">'
        +'<div class="fl-mi-prog"><a href="'+p.link+'" target="_blank" rel="noopener" class="fl-mi-link">'+p.prog+'</a></div>'
        +'<div class="fl-mi-detail">'
        +'<span class="fl-mi-miles">'+milesNeeded.toLocaleString()+' pts &rarr; ~'+cur+' '+milesVal.toLocaleString()+' value</span>'
        +'<span class="fl-mi-vs"> vs cash '+cur+' '+cashFare.toLocaleString()+'</span>'
        +'</div>'
        +'<div class="fl-mi-verdict '+vClass+'">'+verdict+'</div>'
        +'</div>';
    }

    if(!rows) return '';

    return '<div class="fl-mi-card">'
      +'<div class="fl-mi-title">&#127760; Miles &amp; Points Value &mdash; '+(isBiz?'Business Class':'Economy Class')+'</div>'
      +'<div class="fl-mi-sub">Points needed (one-way) &amp; whether redemption beats the cash fare of '+cur+' '+cashFare.toLocaleString()+'</div>'
      +rows
      +'<div class="fl-mi-footer">Redemption values are estimates. Award availability varies. Always compare cash vs points before booking.</div>'
      +'</div>';
  }


  // ── BOOK IN WHICH CURRENCY v6.9 ─────────────────────────────────────────
  var BOOK_CUR={
    AED:{
      best:'INR',
      bestNote:'Air India, IndiGo and SpiceJet are priced in INR — booking directly on their Indian site or MMT India is consistently cheaper than AED-converted OTA prices.',
      rules:[
        {airline:'Air India',        rec:'INR', saving:'5–12%', how:'Book at airindia.com (India) or via MakeMyTrip India — prices shown in INR, no forex needed'},
        {airline:'Emirates',         rec:'AED', saving:'0–3%',  how:'Emirates.com AED pricing matches USD. Either works — use a zero-forex card if paying USD'},
        {airline:'Etihad',           rec:'AED', saving:'2–5%',  how:'AUH-origin Etihad fares in AED slightly beat USD pricing. Book direct at etihad.com'},
        {airline:'IndiGo / SpiceJet',rec:'INR', saving:'8–15%', how:'These carriers only price in INR. Booking via GCC OTAs adds a 10–15% markup — always use Indian OTAs or direct'}
      ],
      cardTip:'Zero-forex cards (Emirates NBD Beyond, FAB Cashback, ADCB Payback) eliminate the 2.5–3% foreign currency fee when booking in INR or USD.',
      dcWarn:'At checkout, if any non-AED airline offers to convert your total "to AED for convenience" — always decline. Dynamic Currency Conversion adds 3–5% instantly.'
    },
    SAR:{
      best:'INR',
      bestNote:'Budget Indian carriers priced in INR are 8–15% cheaper than SAR-converted OTA fares. Saudia flights best booked in SAR direct.',
      rules:[
        {airline:'Air India',        rec:'INR', saving:'5–12%', how:'Book at airindia.com (India) for INR pricing'},
        {airline:'Saudia',           rec:'SAR', saving:'0–3%',  how:'saudia.com in SAR is the reference price. USD booking matches but adds forex risk'},
        {airline:'IndiGo / SpiceJet',rec:'INR', saving:'8–15%', how:'SAR OTAs mark up these carriers heavily — use Indian booking sites directly'}
      ],
      cardTip:'Saudi MADA cards do not support international online transactions well. Use a Visa/Mastercard credit card with low forex fees for INR bookings.',
      dcWarn:'Decline DCC at checkout — always pay in the the airline home currency.'
    },
    QAR:{
      best:'INR',
      bestNote:'Qatar Airways in QAR is the fair price. For Indian carriers, INR booking beats any QAR-converted OTA price.',
      rules:[
        {airline:'Qatar Airways',    rec:'QAR', saving:'1–4%',  how:'qatarairways.com QAR pricing is home-market baseline. USD is equivalent minus forex'},
        {airline:'Air India',        rec:'INR', saving:'5–12%', how:'airindia.com India for INR — cheapest for direct Doha-India routes'},
        {airline:'IndiGo',           rec:'INR', saving:'8–14%', how:'QAR OTAs add significant markup for Indian budget carriers'}
      ],
      cardTip:'Qatar National Bank and Commercial Bank Visa cards often have low forex fees for INR transactions.',
      dcWarn:'Qatar Airways checkout sometimes offers QAR conversion for non-QAR cards. Always decline and pay in card billing currency.'
    },
    KWD:{
      best:'INR',
      bestNote:'Kuwait has few direct Indian budget routes — connecting via Gulf hubs is common. Book each leg in its home currency for best rates.',
      rules:[
        {airline:'Jazeera Airways',  rec:'KWD', saving:'0–3%',  how:'jazeeraairways.com KWD pricing is most accurate for Kuwait-origin routes'},
        {airline:'Air India',        rec:'INR', saving:'5–10%', how:'INR booking on AI India site beats KWD-converted OTA prices'},
        {airline:'Emirates / Flydubai',rec:'AED',saving:'2–5%', how:'These operate from DXB — compare AED pricing direct vs KWD on local OTAs'}
      ],
      cardTip:'NBK Travel Card and Burgan Bank Infinite Visa have competitive forex rates for INR bookings.',
      dcWarn:'Decline DCC — always pay in merchant local currency.'
    },
    BHD:{
      best:'INR',
      bestNote:'Gulf Air is the home carrier. For Indian budget airlines, book in INR via Indian platforms.',
      rules:[
        {airline:'Gulf Air',         rec:'BHD', saving:'0–3%',  how:'gulfair.com BHD pricing is the baseline. Book direct for best fares'},
        {airline:'Air India',        rec:'INR', saving:'5–10%', how:'INR booking on AI India site consistently cheaper than BHD OTA price'},
        {airline:'Flydubai',         rec:'AED', saving:'2–4%',  how:'Flydubai AED pricing via BHD OTAs often inflated — book direct in AED'}
      ],
      cardTip:'BHD is pegged to USD. A USD-friendly card with low forex fees works well for most international bookings.',
      dcWarn:'Always pay in the airline home currency — decline any conversion offer at checkout.'
    },
    OMR:{
      best:'INR',
      bestNote:'Oman Air is the flag carrier. Indian budget airlines should be booked in INR on Indian platforms for best prices.',
      rules:[
        {airline:'Oman Air',         rec:'OMR', saving:'0–3%',  how:'omanair.com OMR pricing is the reference. USD equivalent on the same site'},
        {airline:'Air India',        rec:'INR', saving:'5–10%', how:'airindia.com India in INR beats any OMR-converted price'},
        {airline:'IndiGo',           rec:'INR', saving:'8–13%', how:'Oman OTAs mark up IndiGo heavily — book via Indian sites directly'}
      ],
      cardTip:'Bank Muscat and HSBC Oman cards offer reasonable forex rates. A dedicated travel card saves 2–3% on INR bookings.',
      dcWarn:'Decline DCC at checkout — pay in merchant local currency.'
    },
    MYR:{
      best:'MYR',
      bestNote:'AirAsia is cheapest in MYR on its own app. For Air India, INR booking beats MYR OTA pricing.',
      rules:[
        {airline:'AirAsia',          rec:'MYR', saving:'3–8%',  how:'AirAsia app/website in MYR is always cheaper than OTA prices — book direct'},
        {airline:'Malaysia Airlines', rec:'MYR', saving:'2–5%', how:'MHonline.com MYR pricing is baseline — USD booking adds forex'},
        {airline:'Air India',        rec:'INR', saving:'5–10%', how:'airindia.com India in INR beats MYR-converted OTA prices'}
      ],
      cardTip:'Maybank Visa and CIMB Travel cards offer zero forex fees on foreign currency bookings. Great for INR transactions.',
      dcWarn:'Decline DCC — AirAsia sometimes offers MYR conversion for non-MYR cards at checkout.'
    },
    SGD:{
      best:'SGD',
      bestNote:'Singapore Airlines and Scoot are best booked in SGD on Singapore sites. For Air India, INR booking saves 5–10%.',
      rules:[
        {airline:'Singapore Airlines',rec:'SGD', saving:'2–5%',  how:'singaporeair.com SGD pricing is the home market rate — cheaper than USD equivalent'},
        {airline:'Scoot',            rec:'SGD', saving:'3–6%',  how:'flyscoot.com SGD pricing — USD booking adds 2–4% forex'},
        {airline:'Air India',        rec:'INR', saving:'5–10%', how:'INR booking on AI India site consistently beats SGD OTA prices'}
      ],
      cardTip:'DBS Altitude, Citi PremierMiles and UOB PRVI Miles cards earn miles with zero forex fees — ideal for mixed-currency bookings.',
      dcWarn:'Decline DCC at checkout — Singapore airports and airlines sometimes offer SGD conversion for foreign cards.'
    },
    AUD:{
      best:'AUD',
      bestNote:'Qantas and Virgin Australia are cheapest in AUD on Australian sites. Air India in INR saves 8–15% vs AUD OTA prices.',
      rules:[
        {airline:'Qantas',           rec:'AUD', saving:'2–6%',  how:'qantas.com AUD pricing is home-market baseline — always book direct'},
        {airline:'Singapore Airlines',rec:'AUD', saving:'1–3%', how:'singaporeair.com AU site in AUD — slightly cheaper than USD equivalent'},
        {airline:'Air India',        rec:'INR', saving:'8–15%', how:'The biggest savings opportunity: AI India site INR pricing vs AUD OTA markup'}
      ],
      cardTip:'28 Degrees Mastercard and Bankwest Zero Platinum have zero forex fees. Essential for INR flight bookings from Australia.',
      dcWarn:'Decline DCC — Australian travellers are frequently offered AUD conversion abroad. Always decline.'
    },
    NZD:{
      best:'NZD',
      bestNote:'Qantas and Air NZ are cheapest in NZD. Air India in INR beats NZD OTA pricing by 8–15%.',
      rules:[
        {airline:'Air New Zealand',  rec:'NZD', saving:'1–4%',  how:'airnewzealand.co.nz NZD pricing is baseline — Airpoints earn requires NZD booking'},
        {airline:'Qantas',           rec:'NZD', saving:'2–5%',  how:'qantas.com NZ site in NZD — book via Singapore hub for India connections'},
        {airline:'Air India',        rec:'INR', saving:'8–15%', how:'Biggest opportunity: AI India site INR prices vs NZD OTA conversion'}
      ],
      cardTip:'Wise multi-currency card or Revolut lets you hold INR and pay at interbank rate — saves 3–4% vs NZD credit card.',
      dcWarn:'Decline DCC — always pay in merchant local currency.'
    },
    GBP:{
      best:'GBP',
      bestNote:'British Airways and Virgin are cheapest in GBP on UK sites. Air India in INR saves 8–12% vs GBP OTA prices.',
      rules:[
        {airline:'British Airways',  rec:'GBP', saving:'3–7%',  how:'ba.com GBP pricing is home market baseline — Avios earn requires GBP booking'},
        {airline:'Air India',        rec:'INR', saving:'8–12%', how:'AI India site INR prices consistently beat GBP OTA conversion — biggest saving'},
        {airline:'Virgin Atlantic',  rec:'GBP', saving:'2–5%',  how:'virginatlantic.com GBP pricing — avoid USD which adds forex'}
      ],
      cardTip:'Barclaycard Avios and Amex Platinum (UK) earn Avios on all spend. Chase UK and Starling have zero forex fees for INR bookings.',
      dcWarn:'UK travellers are rarely pushed DCC but decline if offered — pay in INR or GBP as appropriate.'
    },
    USD:{
      best:'INR',
      bestNote:'For Indian budget carriers, INR booking via Indian platforms beats USD OTA prices by 10–20%. US carriers are best booked in USD.',
      rules:[
        {airline:'Air India',        rec:'INR', saving:'10–18%',how:'Biggest gap: AI India site INR prices vs USD OTA prices. Use a Wise or Revolut card to pay in INR'},
        {airline:'United / Delta',   rec:'USD', saving:'0%',    how:'USD is home currency — no foreign booking arbitrage'},
        {airline:'IndiGo / SpiceJet',rec:'INR', saving:'10–20%',how:'US-based OTAs add huge markup. Book via Indian OTAs or direct in INR — savings can be $50–150 per ticket'}
      ],
      cardTip:'Wise or Revolut lets you pay in INR at interbank rate. Capital One Venture and Chase Sapphire have zero forex fees for INR bookings.',
      dcWarn:'When paying in INR on Indian sites, your US card may offer "pay in USD" — always decline. That DCC adds 4–6%.'
    },
    CAD:{
      best:'INR',
      bestNote:'Air India INR booking saves 10–15% vs CAD OTA prices. Air Canada is cheapest in CAD on its own site.',
      rules:[
        {airline:'Air India',        rec:'INR', saving:'10–15%',how:'AI India site INR pricing consistently beats CAD OTA markup — biggest saving'},
        {airline:'Air Canada',       rec:'CAD', saving:'0%',    how:'aircanada.com CAD is home currency baseline — no arbitrage benefit'},
        {airline:'WestJet',          rec:'CAD', saving:'0%',    how:'westjet.com CAD is baseline — book direct to earn Rewards dollars'}
      ],
      cardTip:'Scotiabank Passport Visa Infinite and HSBC World Elite have zero forex fees — ideal for INR bookings from Canada.',
      dcWarn:'Decline DCC when booking in INR on Indian sites with a CAD card — typically adds 3–5%.'
    },
    EUR:{
      best:'EUR',
      bestNote:'European carriers are cheapest in EUR on home-market sites. Air India in INR saves 8–12% vs EUR OTA prices.',
      rules:[
        {airline:'Lufthansa',        rec:'EUR', saving:'2–6%',  how:'lufthansa.com EUR pricing is home baseline. USD booking on same site adds forex'},
        {airline:'Air France / KLM', rec:'EUR', saving:'2–5%',  how:'airfrance.com and klm.com EUR pricing — Flying Blue earn requires EUR/home currency booking'},
        {airline:'Air India',        rec:'INR', saving:'8–12%', how:'AI India site INR prices beat EUR OTA conversion — biggest saving for EUR-zone NRIs'}
      ],
      cardTip:'N26 Metal, Revolut Metal and Wise cards have zero forex fees across EUR and INR. Essential for cross-currency bookings.',
      dcWarn:'Decline DCC at checkout — some Indian booking sites offer EUR conversion for EU cards. Always decline.'
    }
  };

  function _renderBookCurrency(cur,route){
    var b=BOOK_CUR[cur];
    if(!b||!route) return '';

    var rows='';
    for(var ri=0;ri<b.rules.length;ri++){
      var r=b.rules[ri];
      rows+='<div class="fl-bc-row">'
        +'<div class="fl-bc-airline">'+r.airline+'</div>'
        +'<div class="fl-bc-rec">'
          +'<span class="fl-bc-cur">'+r.rec+'</span>'
          +(r.saving!=='0%'?'<span class="fl-bc-save">saves ~'+r.saving+'</span>':'<span class="fl-bc-base">home currency</span>')
        +'</div>'
        +'<div class="fl-bc-how">'+r.how+'</div>'
        +'</div>';
    }

    return '<div class="fl-bc-card">'
      +'<div class="fl-bc-title">&#128179; Book in which currency?</div>'
      +'<div class="fl-bc-best">&#9989; Best strategy: Book <strong>'+b.best+'</strong> when available — '+b.bestNote+'</div>'
      +'<div class="fl-bc-rows">'+rows+'</div>'
      +'<div class="fl-bc-info">'
        +'<div class="fl-bc-ctip">&#128179; <strong>Card tip:</strong> '+b.cardTip+'</div>'
        +'<div class="fl-bc-dcc">&#9888;&#65039; <strong>DCC warning:</strong> '+b.dcWarn+'</div>'
      +'</div>'
      +'</div>';
  }

  var _flTripDays=10;
  var _flCabinClass='economy';

  // Business class fare multipliers by currency (vs economy base)
  var BUSINESS_MULT={
    AED:3.5,SAR:3.5,QAR:3.8,KWD:3.5,BHD:3.5,OMR:3.5,
    SGD:4.0,MYR:3.8,
    AUD:4.2,NZD:4.5,
    USD:4.0,CAD:4.2,
    EUR:3.8,GBP:3.8
  };

  // Airlines that only operate economy (no business cabin)
  var ECONOMY_ONLY_AIRLINES=['airasia','indigo','spicejet','goair','akasa','flydubai','air arabia','wizz','scoot','jetstar'];

  function _isEconomyOnly(airlinesStr){
    var al=(airlinesStr||'').toLowerCase();
    for(var i=0;i<ECONOMY_ONLY_AIRLINES.length;i++){
      if(al.indexOf(ECONOMY_ONLY_AIRLINES[i])>=0) return true;
    }
    return false;
  }

  function _addDays(d,n){var r=new Date(d.getTime());r.setDate(r.getDate()+n);return r;}

  function _fmtLong(d){
    var D=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return D[d.getDay()]+', '+d.getDate()+' '+M[d.getMonth()]+' '+d.getFullYear();
  }

  function _fmtSK(d){
    // Skyscanner YYMMDD format
    return String(d.getFullYear()).slice(2)
      +String(d.getMonth()+1).padStart(2,'0')
      +String(d.getDate()).padStart(2,'0');
  }

  function _fmtGF(d){
    // Google Flights YYYY-MM-DD
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function _fmtAvi(d){
    // Aviasales DDMM
    return String(d.getDate()).padStart(2,'0')+String(d.getMonth()+1).padStart(2,'0');
  }

  function _nthWeekday(year,month,n,wd){
    // nth (0-based) occurrence of weekday wd (0=Sun…6=Sat) in month
    var count=-1;
    for(var day=1;day<=28;day++){
      var dt=new Date(year,month,day);
      if(dt.getDay()===wd){count++;if(count===n)return dt;}
    }
    return new Date(year,month,8);
  }

  function _bestHub(cur){
    var c=CONNECTIONS[cur];
    return (c&&c.longHaul&&c.hubs&&c.hubs[0])?c.hubs[0]:null;
  }

  function _dateWindows(monthIdx,tripDays){
    var now=new Date(), y=now.getFullYear();
    var test=new Date(y,monthIdx,1);
    if(test<=now) y++;
    var baseIdx=MONTHLY_IDX[monthIdx];
    // Window 1: 2nd Tuesday (cheapest – midweek week 2)
    var dep1=_nthWeekday(y,monthIdx,1,2); // 2nd Tue
    // Window 2: 3rd Wednesday
    var dep2=_nthWeekday(y,monthIdx,2,3); // 3rd Wed
    // Window 3: Last Friday (peak – weekend end of month)
    var dep3=_nthWeekday(y,monthIdx,3,5); // 4th Fri
    if(!dep3||dep3.getMonth()!==monthIdx) dep3=_nthWeekday(y,monthIdx,2,5);
    function lvl(idx){
      if(idx<=0.73) return {cls:'win-best',badge:'🟢 Best Price'};
      if(idx<=0.90) return {cls:'win-good',badge:'🟢 Good Value'};
      if(idx<=1.05) return {cls:'win-avg', badge:'🟡 Average'};
      if(idx<=1.20) return {cls:'win-high',badge:'🟡 Above Avg'};
      return               {cls:'win-peak',badge:'🔴 Peak Price'};
    }
    return [
      {dep:dep1,ret:_addDays(dep1,tripDays),idx:baseIdx*0.93,lv:lvl(baseIdx*0.93),why:'2nd week · Tue departure — typically cheapest'},
      {dep:dep2,ret:_addDays(dep2,tripDays),idx:baseIdx,     lv:lvl(baseIdx),     why:'3rd week · Wed departure — solid option'},
      {dep:dep3,ret:_addDays(dep3,tripDays),idx:baseIdx*1.15,lv:lvl(baseIdx*1.15),why:'4th week · Fri departure — weekend premium'},
    ];
  }

  window.flDurSet=function(days,btn){
    _flTripDays=days;
    document.querySelectorAll('.fl-dur-btn').forEach(function(b){b.classList.remove('active');});
    if(btn)btn.classList.add('active');
    // Sync dropdown
    var sd=document.getElementById('fl-opt-dur');
    if(sd){for(var i=0;i<sd.options.length;i++){if(sd.options[i].value===days+' nights'||sd.options[i].value===days+' night'){sd.selectedIndex=i;break;}}}
    var inp=document.getElementById('fl-planner-input');
    if(inp&&inp.value.trim())flPlanTrip();
  };

  window.flCabinSet=function(cls,btn){
    _flCabinClass=cls;
    document.querySelectorAll('.fl-cabin-btn').forEach(function(b){b.classList.remove('fl-cabin-active');});
    if(btn)btn.classList.add('fl-cabin-active');
    // Sync dropdown
    var sc=document.getElementById('fl-opt-cabin');
    if(sc) sc.value=cls;
    flPlanTrip();
  };


  // ── BUY NOW vs WAIT signal ──────────────────────────────────
  function _getBuySignal(travelM, wksAway, mIdx, cur){
    var hasFestival=false;
    for(var fi=0;fi<FESTIVALS.length;fi++){
      if(FESTIVALS[fi].m===travelM&&FESTIVALS[fi].spike>=50){hasFestival=true;break;}
    }
    var curMIdx=MONTHLY_IDX[new Date().getMonth()];
    var rising=mIdx>curMIdx*1.05;
    var dailyCost=Math.round(mIdx*120);

    if(wksAway<=3){
      return {cls:'signal-now',icon:'🔴',label:'Book Immediately',
        reason:'Less than 3 weeks away — fares rising '+dailyCost.toLocaleString()+' '+cur+' daily. Every day of delay costs more.',
        tip:'Open all 3 date windows and book the cheapest available seat today.'};
    }
    if(wksAway<=6){
      if(hasFestival||rising){
        return {cls:'signal-now',icon:'🔴',label:'Book This Week',
          reason:'Peak or festival period — you are in the surge window. Fares will not drop from here.',
          tip:'Pick your preferred date window and book within 2-3 days.'};
      }
      return {cls:'signal-soon',icon:'🟡',label:'Book Within 2 Weeks',
        reason:'Good availability still exists but fares are rising as departure approaches.',
        tip:'Set a price alert on Kiwi.com. If fares rise 10%, book immediately.'};
    }
    if(wksAway<=10){
      if(hasFestival){
        return {cls:'signal-now',icon:'🔴',label:'Book Soon — Festival Surge',
          reason:'Festival period drives heavy demand. Seats fill 8-10 weeks ahead on this route.',
          tip:'Do not wait. Book the Best Price window (🟢) now.'};
      }
      if(rising){
        return {cls:'signal-soon',icon:'🟡',label:'Book in Next 3 Weeks',
          reason:'Travel month fares are rising above current levels. The climb has likely started.',
          tip:'The 2nd week Tuesday window offers the best current value.'};
      }
      return {cls:'signal-wait',icon:'🟢',label:'Safe to Wait 2–3 Weeks',
        reason:'You are in the sweet spot booking window. Fares are stable right now.',
        tip:'Monitor prices weekly. Book once the fare holds steady for 3+ days in a row.'};
    }
    if(wksAway<=16){
      return {cls:'signal-wait',icon:'🟢',label:'Monitor — Book in 4–6 Weeks',
        reason:'Too early. Airlines may release cheaper seats closer to departure.',
        tip:'Check prices weekly. Optimal booking window for this route is 6-10 weeks before travel.'};
    }
    return {cls:'signal-early',icon:'⬜',label:'Too Early to Book',
      reason:'More than 4 months out. Initial fares are rarely the cheapest.',
      tip:'Set a Kiwi.com alert and revisit in '+(wksAway-12)+' weeks.'};
  }




  // ── BEST MONTH BAR CHART ─────────────────────────────────────
  function _renderMonthChart(travelM, route, cur, cabinFareMult){
    var avg=MONTHLY_IDX.reduce(function(a,b){return a+b;},0)/12;
    // Sort to find cheapest/priciest
    var sorted=MONTHLY_IDX.slice().sort(function(a,b){return a-b;});
    var cheapThresh=sorted[2];   // top-3 cheapest
    var peakThresh=sorted[9];    // top-3 priciest

    var html='<div class="fl-mc-wrap">'
      +'<div class="fl-mc-title">&#128197; Best months to fly — fare index vs average</div>'
      +'<div class="fl-mc-bars">';

    var maxIdx=Math.max.apply(null,MONTHLY_IDX);
    for(var m=0;m<12;m++){
      var idx=MONTHLY_IDX[m];
      var barPct=Math.round((idx/maxIdx)*100);
      var fare=Math.round(route.min*idx*cabinFareMult);
      var fareMax=Math.round(route.max*idx*cabinFareMult);
      var isCheap=idx<=cheapThresh;
      var isPeak=idx>=peakThresh;
      var isSel=m===travelM;
      var pctVsAvg=Math.round((idx/avg-1)*100);
      var pctLabel=(pctVsAvg>=0?'+':'')+pctVsAvg+'%';
      var barCls=isSel?'fl-mc-bar-sel':isCheap?'fl-mc-bar-cheap':isPeak?'fl-mc-bar-peak':'fl-mc-bar-mid';

      html+='<div class="fl-mc-col'+(isSel?' fl-mc-col-sel':'')+'">'
        +'<div class="fl-mc-pct" style="'+(isCheap?'color:#14b8a6':isPeak?'color:#ef4444':'color:#64748b')+'">'+pctLabel+'</div>'
        +'<div class="fl-mc-bar-track">'
        +'<div class="fl-mc-bar '+barCls+'" style="height:'+barPct+'%"></div>'
        +'</div>'
        +'<div class="fl-mc-fare">'+cur+'<br>'+fare.toLocaleString()+'</div>'
        +'<div class="fl-mc-mn">'+FL_MONTH_NAMES[m].slice(0,3)+'</div>'
        +(isSel?'<div class="fl-mc-sel-dot">&#9650;</div>':'')
        +'</div>';
    }

    html+='</div>'
      +'<div class="fl-mc-legend">'
      +'<span class="fl-mc-leg fl-mc-leg-cheap">&#9632; Cheapest months</span>'
      +'<span class="fl-mc-leg fl-mc-leg-peak">&#9632; Peak / avoid</span>'
      +'<span class="fl-mc-leg fl-mc-leg-sel">&#9650; Your month</span>'
      +'</div>'
      +'</div>';
    return html;
  }

  // ── ACCORDION TOGGLE + HELPER ──────────────────────────────────────────
  window._flT=function(btn){
    btn.classList.toggle('fl-acc-open');
    var c=btn.nextElementSibling;
    c.style.display=c.style.display==='none'?'block':'none';
  };
  function _flAcc(title,body,open){
    if(!body||!body.trim()) return '';
    return '<div class="fl-acc">'
      +'<button class="fl-acc-hd'+(open?' fl-acc-open':'')+'" onclick="_flT(this)">'
      +title
      +'</button>'
      +'<div class="fl-acc-body" style="display:'+(open?'block':'none')+'">'
      +body
      +'</div>'
      +'</div>';
  }

    window.flPlanTrip=function(){
    var inp=document.getElementById('fl-planner-input');
    var res=document.getElementById('fl-planner-result');
    if(!inp||!res)return;
    // Build query from structured selectors + free text
    var freeText=(inp.value||'').trim();
    var selMonth=document.getElementById('fl-opt-month');
    var selDur=document.getElementById('fl-opt-dur');
    var selCabin=document.getElementById('fl-opt-cabin');
    var selPax=document.getElementById('fl-opt-pax');
    var month=selMonth?selMonth.value:'';
    var dur=selDur?selDur.value:'';
    var cabin=selCabin?selCabin.value:'economy';
    var pax=selPax?selPax.value:'2 people';
    // Compose q: city from free text, then append structured parts if not already present
    var q=freeText;
    if(month && q.toLowerCase().indexOf(month.toLowerCase())<0) q+=(q?' in ':'')+month;
    if(dur && q.toLowerCase().indexOf(dur.toLowerCase().split(' ')[0])<0) q+=(q?', ':'')+dur;
    if(pax && q.toLowerCase().indexOf(pax.split(' ')[0])<0) q+=(q?', ':'')+pax;
    if(cabin==='business' && q.toLowerCase().indexOf('business')<0) q+=(q?', ':'')+'business class';
    if(!q){res.style.display='none';return;}
    var lq=q.toLowerCase();

    var destMap={
      'mumbai':'BOM','bombay':'BOM','bom':'BOM',
      'delhi':'DEL','new delhi':'DEL','ndls':'DEL','del':'DEL',
      'bangalore':'BLR','bengaluru':'BLR','blr':'BLR',
      'chennai':'MAA','madras':'MAA','maa':'MAA',
      'hyderabad':'HYD','hyd':'HYD','secunderabad':'HYD',
      'kochi':'COK','cochin':'COK','ernakulam':'COK','cok':'COK',
      'kolkata':'CCU','calcutta':'CCU','ccu':'CCU',
      'trivandrum':'TRV','thiruvananthapuram':'TRV','trv':'TRV',
      'ahmedabad':'AMD','amd':'AMD',
      'goa':'GOI','panaji':'GOI','goi':'GOI',
      'pune':'PNQ','pnq':'PNQ',
      'jaipur':'JAI','pink city':'JAI','jai':'JAI',
      'amritsar':'ATQ','atq':'ATQ','golden temple':'ATQ',
      'mangalore':'IXE','mangaluru':'IXE','ixe':'IXE',
      'coimbatore':'CJB','cjb':'CJB',
      'visakhapatnam':'VTZ','vizag':'VTZ','visakha':'VTZ','vtZ':'VTZ','vtz':'VTZ',
      'lucknow':'LKO','lko':'LKO',
      'nagpur':'NAG','nag':'NAG',
      'kozhikode':'CCJ','calicut':'CCJ','ccj':'CCJ','malabar':'CCJ',
      'kannur':'CNN','cannanore':'CNN','cnn':'CNN',
      'trichy':'TRZ','tiruchirappalli':'TRZ','tiruchirapalli':'TRZ','trz':'TRZ',
      'madurai':'IXM','ixm':'IXM'
    };
    var destCode=null;
    for(var k in destMap){if(lq.indexOf(k)>=0){destCode=destMap[k];break;}}
    var d=destCode?DEST[destCode]:null;

    var mFull=['january','february','march','april','may','june','july','august','september','october','november','december'];
    var mShort=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    var travelM=-1;
    for(var i=0;i<12;i++){
      if(lq.indexOf(mFull[i])>=0||lq.indexOf(mShort[i])>=0){travelM=i;break;}
    }

    var gm=lq.match(/(\d+)\s*(person|people|pax|adults?|passenger|travell?er)/);
    var groupN=gm?parseInt(gm[1]):1;
    if(lq.indexOf('couple')>=0) groupN=2;
    if(lq.indexOf('family')>=0&&!gm) groupN=4;

    var nums=(q.match(/[\d,]+/g)||[]).map(function(n){return parseInt(n.replace(/,/g,''));}).filter(function(n){return n>200;});
    var budget=nums.length?Math.max.apply(null,nums):null;

    var cur=baseCur||'AED';
    var flData=FL[cur]||FL['AED'];
    var route=destCode&&flData.routes[destCode]?flData.routes[destCode]:null;
    // Sync internal vars from dropdowns (dropdowns are source of truth)
    var selDurVal=selDur?selDur.value:'7 nights';
    var durMatch=selDurVal.match(/(\d+)/);
    if(durMatch) _flTripDays=parseInt(durMatch[1]);
    if(cabin==='economy'||cabin==='business') _flCabinClass=cabin;
    var tripDays=_flTripDays||7;
    var cabinClass=_flCabinClass||'economy';
    var bizMult=BUSINESS_MULT[cur]||3.8;
    var cabinFareMult=(cabinClass==='business')?bizMult:1.0;
    var economyOnly=route?_isEconomyOnly(route.airlines):false;

    var html='<div class="fl-plan">';

    // Duration picker
    html+='<div class="fl-dur-row">'
      +'<span class="fl-dur-label">Trip length:</span>'
      +'<button class="fl-dur-btn'+(tripDays===2?' fl-dur-active':'')+'" onclick="flDurSet(2,this)">2 nights</button>'
      +'<button class="fl-dur-btn'+(tripDays===3?' fl-dur-active':'')+'" onclick="flDurSet(3,this)">3 nights</button>'
      +'<button class="fl-dur-btn'+(tripDays===7?' fl-dur-active':'')+'" onclick="flDurSet(7,this)">7 nights</button>'
      +'<button class="fl-dur-btn'+(tripDays===10?' fl-dur-active':'')+'" onclick="flDurSet(10,this)">10 nights</button>'
      +'<button class="fl-dur-btn'+(tripDays===14?' fl-dur-active':'')+'" onclick="flDurSet(14,this)">14 nights</button>'
      +'<button class="fl-dur-btn'+(tripDays===30?' fl-dur-active':'')+'" onclick="flDurSet(30,this)">30 nights</button>'
      +'</div>'
      +'<div class="fl-cabin-row">'
      +'<span class="fl-dur-label">Cabin:</span>'
      +'<button class="fl-cabin-btn'+(_flCabinClass==='economy'?' fl-cabin-active':'')+'" onclick="flCabinSet(&quot;economy&quot;,this)">&#9992; Economy</button>'
      +'<button class="fl-cabin-btn'+(_flCabinClass==='business'?' fl-cabin-active':'')+'" onclick="flCabinSet(&quot;business&quot;,this)">&#128188; Business</button>'
      +'</div>';

    var destLabel=d?d.icon+' '+d.name:'India';
    var cabinLabel=(cabinClass==='business')?'&#128188; Business':'&#9992; Economy';
    html+='<div class="fl-plan-hd">&#10022; Date Decision Tool &mdash; '+cur+' &rarr; '+destLabel+' &nbsp;<span class="fl-cabin-badge">'+cabinLabel+'</span></div>';

    if(!d){
      html+='<div class="fl-plan-section"><div class="fl-plan-sub">&#128161; Mention a city: Mumbai, Goa, Kochi, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Trivandrum, Ahmedabad</div></div>';
    }
    if(!route&&d){
      html+='<div class="fl-plan-section"><div class="fl-plan-sub">Route data not available for this origin.</div></div>';
    }

    if(travelM>=0&&route&&typeof route.min==='number'){
      var now=new Date();
      var tYear=now.getFullYear();
      var tDate=new Date(tYear,travelM,1);
      if(tDate<=now) tYear++;
      var mIdx=MONTHLY_IDX[travelM];
      var tDate2=new Date(tYear,travelM,1);
      var wks=Math.max(0,Math.round((tDate2-now)/604800000));
      var windows=_dateWindows(travelM,tripDays);
      var fromCode=_flOrigin||(flData.origins[0]?flData.origins[0].code:'DXB');

      // ── Best Travel Dates accordion (open by default) ───────────────────────
      var secDates='<div class="fl-dates-row">';
      for(var wi=0;wi<windows.length;wi++){
        var w=windows[wi];
        var depDate=w.dep;
        var retDate=w.ret;

        var rtMin=Math.round(route.min*w.idx*cabinFareMult);
        var rtMax=Math.round(route.max*w.idx*cabinFareMult);
        var outMin=Math.round(rtMin*0.55);
        var outMax=Math.round(rtMax*0.60);
        var retMin=Math.round(rtMin*0.42);
        var retMax=Math.round(rtMax*0.50);
        var sepMin=outMin+retMin;
        var sepMax=outMax+retMax;
        var savMin=sepMin-rtMin;
        var savMax=sepMax-rtMax;
        var savNote=savMin<0?'Save '+cur+' '+Math.abs(savMin).toLocaleString()+'&ndash;'+Math.abs(savMax).toLocaleString()+' vs RT':'Similar to round-trip price';

        var depSK=_fmtSK(depDate);
        var retSK=_fmtSK(retDate);
        var kiwiDep=_fmtGF(depDate);
        var kiwiRet=_fmtGF(retDate);
        var aviDep=_fmtAvi(depDate);
        var aviRet=_fmtAvi(retDate);
        var _skCabin=cabinClass==='business'?'?cabin=business&currency='+cur:'?cabin=economy&currency='+cur;
        var skRT='https://kiwi.tpx.gr/i3IFxDSh?sub_id='+fromCode.toLowerCase()+'-'+destCode.toLowerCase()+'-rt-'+kiwiDep;
        var skOut='https://kiwi.tpx.gr/i3IFxDSh?sub_id='+fromCode.toLowerCase()+'-'+destCode.toLowerCase()+'-out-'+kiwiDep;
        var skRet='https://aviasales.tpx.gr/o76pMR9j?sub_id='+destCode.toLowerCase()+'-'+fromCode.toLowerCase()+'-ret-'+aviDep+'-'+aviRet;

        var gMult=groupN>1?' (&times;'+groupN+')':'';
        var grpRtMin=Math.round(rtMin*groupN);
        var grpRtMax=Math.round(rtMax*groupN);
        var grpOutMin=Math.round(outMin*groupN);
        var grpOutMax=Math.round(outMax*groupN);
        var grpRetMin=Math.round(retMin*groupN);
        var grpRetMax=Math.round(retMax*groupN);
        var grpSepMin=grpOutMin+grpRetMin;
        var grpSepMax=grpOutMax+grpRetMax;

        var connData=CONNECTIONS[cur];
        var connTip='';
        if(connData&&connData.longHaul&&connData.hubs&&connData.hubs.length){
          var bh=connData.hubs[0];
          connTip='<div class="fl-win-conn">&#129351; Best via '+bh.via+' ('+bh.airline+') &mdash; '+bh.saving+'</div>';
        }

        secDates+='<div class="fl-window'+(wi===0?' fl-window-best':'')+'">'
          +'<div class="fl-win-header">'
          +'<span class="fl-win-label">'+w.lv.badge+'</span>'
          +'<span class="fl-win-desc">'+w.why+'</span>'
          +'</div>'
          +'<div class="fl-win-dates">'
          +'<div class="fl-win-date-blk"><div class="fl-win-dt-label">DEPART</div><div class="fl-win-dt">'+_fmtLong(depDate)+'</div></div>'
          +'<div class="fl-win-arrow">&#9992; '+tripDays+'n &rarr;</div>'
          +'<div class="fl-win-date-blk"><div class="fl-win-dt-label">RETURN</div><div class="fl-win-dt">'+_fmtLong(retDate)+'</div></div>'
          +'</div>'
          +'<div class="fl-win-search-lbl">Search flights:</div>'
          +'<div class="fl-win-providers">'
          +'<a class="fl-wprov fl-wprov-kiwi" href="'+skRT+'" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=kiwi.com&sz=32" class="fl-prov-logo"> Kiwi.com</a>'
          +'<a class="fl-wprov fl-wprov-avi" href="'+skRet+'" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=aviasales.com&sz=32" class="fl-prov-logo"> Aviasales</a>'
          +'<a class="fl-wprov fl-wprov-sky" href="https://www.skyscanner.net/transport/flights/'+fromCode+'/'+destCode+'/'+depSK+'/'+retSK+'/" target="_blank" rel="noopener"><img src="https://www.google.com/s2/favicons?domain=skyscanner.net&sz=32" class="fl-prov-logo"> Skyscanner</a>'
          +'<a class="fl-wprov fl-wprov-gf" href="https://www.google.com/travel/flights?q=flights+'+fromCode+'+to+'+destCode+'" target="_blank" rel="noopener"><img src="https://www.google.com/s2/favicons?domain=google.com&sz=32" class="fl-prov-logo"> Google</a>'
          +'</div>'
          +'<div class="fl-win-protect">'
          +'<a class="fl-wprot fl-wprot-ah" href="https://airhelp.tpx.gr/1VvvXbdE" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=airhelp.com&sz=32" class="fl-prov-logo"> Claim delay comp</a>'
          +'<a class="fl-wprot fl-wprot-ekta" href="https://ektatraveling.tpx.gr/4Gwp3ZwH" target="_blank" rel="noopener sponsored"><img src="https://www.google.com/s2/favicons?domain=ektatraveling.com&sz=32" class="fl-prov-logo"> Travel insurance</a>'
          +'</div>'
          +'<details class="fl-win-fare-details" open><summary class="fl-win-fare-summary">&#128202; Fare estimates</summary>'
          +'<div class="fl-win-fares"><div class="fl-win-fare-est">&#128200; Estimated fare range &mdash; verify on booking sites</div>'
          +'<div class="fl-win-fare-row"><span class="fl-win-fare-lbl">&#9992; Outbound'+gMult+' ('+fromCode+'&rarr;'+destCode+')</span><strong class="fl-win-fare-val">'+cur+' '+grpOutMin.toLocaleString()+'&ndash;'+grpOutMax.toLocaleString()+'</strong>'+(groupN>1?' <span class="fl-win-fare-pp">&nbsp;&#8776;&nbsp;'+cur+' '+outMin.toLocaleString()+'&ndash;'+outMax.toLocaleString()+'/person</span>':'')+' </div>'
          +'<div class="fl-win-fare-row"><span class="fl-win-fare-lbl">&#9992; Return'+gMult+' ('+destCode+'&rarr;'+fromCode+')</span><strong class="fl-win-fare-val">'+cur+' '+grpRetMin.toLocaleString()+'&ndash;'+grpRetMax.toLocaleString()+'</strong>'+(groupN>1?' <span class="fl-win-fare-pp">&nbsp;&#8776;&nbsp;'+cur+' '+retMin.toLocaleString()+'&ndash;'+retMax.toLocaleString()+'/person</span>':'')+' </div>'
          +'<div class="fl-win-fare-sep"></div>'
          +'<div class="fl-win-fare-row"><span class="fl-win-fare-lbl">&#128202; Separate total'+gMult+'</span><strong class="fl-win-fare-val">'+cur+' '+grpSepMin.toLocaleString()+'&ndash;'+grpSepMax.toLocaleString()+'</strong>'+(groupN>1?' <span class="fl-win-fare-pp">&nbsp;&#8776;&nbsp;'+cur+' '+sepMin.toLocaleString()+'&ndash;'+sepMax.toLocaleString()+'/person</span>':'')+' </div>'
          +'<div class="fl-win-fare-row fl-win-fare-muted"><span class="fl-win-fare-lbl">&#128260; vs Round-trip'+gMult+'</span><span class="fl-win-fare-val">'+cur+' '+grpRtMin.toLocaleString()+'&ndash;'+grpRtMax.toLocaleString()+' &nbsp;&middot;&nbsp; '+savNote+'</span></div>'
          +'</div>'
          +'</details>'
          +(economyOnly&&cabinClass==='business'?'<div class="fl-win-economy-note">&#9888;&#65039; Most flights on this route ('+route.airlines+') are <strong>economy-only</strong>. Check Air India or Emirates for business class.</div>':'')
          +connTip
          +'</div>';
      }
      secDates+='</div>';

      // Month summary appended to dates section
      // mIdx and wks already computed above
      var mGrade=mIdx<=0.73?'&#127802; Best Deals Season':mIdx<=0.90?'&#127845; Shoulder &mdash; Good Value':mIdx<=1.05?'&#9898; Average Fares':'&#128308; Peak &mdash; Expensive';
      var bookAdvice=wks<4?'&#9889; Under 4 weeks away &mdash; book immediately'
        :wks<8?'&#10003; Book this week for best fares'
        :wks<14?'Good time to compare &mdash; book within 3&ndash;4 weeks'
        :'Monitor prices; book 8&ndash;10 weeks before travel';
      secDates+='<div class="fl-plan-section">'
        +'<div class="fl-plan-row"><span>&#128197; '+FL_MONTH_NAMES[travelM]+' '+tYear+'</span><strong>'+mGrade+'</strong></div>'
        +'<div class="fl-plan-row"><span>&#8987; Booking window</span><span>~'+wks+' weeks away &nbsp;&middot;&nbsp; '+bookAdvice+'</span></div>'
        +'<div class="fl-plan-row"><span>&#8987; Flight duration</span><span>'+route.dur+'</span></div>'
        +'<div class="fl-plan-row"><span>&#9992; Airlines</span><span>'+route.airlines+'</span></div>'
        +'</div>';
      html+=_flAcc('&#128197; Best Travel Dates',secDates,true);
      // ── Buy Now signal (always visible) ──────────────────────────────────
      var sig=_getBuySignal(travelM,wks,mIdx,cur);
      html+='<div class="fl-signal fl-signal-'+sig.cls+'">'
        +'<div class="fl-signal-top">'
        +'<span class="fl-signal-icon">'+sig.icon+'</span>'
        +'<span class="fl-signal-label">'+sig.label+'</span>'
        +'</div>'
        +'<div class="fl-signal-reason">'+sig.reason+'</div>'
        +'<div class="fl-signal-tip">&#128161; '+sig.tip+'</div>'
        +'</div>';

      // ── Fare Trends accordion (closed) ────────────────────────────────────
      var festHtml='';
      for(var fi=0;fi<FESTIVALS.length;fi++){
        if(FESTIVALS[fi].m===travelM){
          festHtml='<div class="fl-plan-festival">&#9888;&#65039; <strong>'+FESTIVALS[fi].name+'</strong> in '+FL_MONTH_NAMES[travelM]+' &mdash; '+FESTIVALS[fi].note+'. Check dates overlap below.</div>';
          break;
        }
      }
      var secFare=festHtml+_renderMonthChart(travelM,route,cur,cabinFareMult);
      html+=_flAcc('&#128202; Monthly Fare Trends',secFare,false);

      // ── Destination Guide accordion (closed) ──────────────────────────────
      var secDest='';
      if(destCode) secDest+=_renderWeatherHotel(destCode,travelM,route);
      if(destCode) secDest+=_renderCityCosts(destCode,tripDays,groupN,typeof midRate!=='undefined'?midRate:85);
      if(secDest) html+=_flAcc('&#127760; Destination Guide',secDest,false);

      // ── Booking Strategy accordion (closed) ───────────────────────────────
      var secBook='';
      secBook+=_renderAirportCompare(cur,destCode,route,cabinFareMult);
      secBook+=_renderBookCurrency(cur,route);
      secBook+=_renderMilesValue(cur,route,cabinFareMult,_flCabinClass);
      secBook+=_renderBookingTips(route,cur,wks,cabinClass);
      html+=_flAcc('&#9992; Booking Strategy',secBook,false);

    } else if(travelM<0&&route){
      html+='<div class="fl-plan-section">'
        +'<div class="fl-plan-sub">&#128197; Mention a month to get exact date windows with pre-filled booking links.</div>'
        +'<div class="fl-plan-row"><span>&#9992; Price range'+(groupN>1?' (&times;'+groupN+')':'')+' per person</span><strong>'+cur+' '+route.min.toLocaleString()+'&ndash;'+route.max.toLocaleString()+'</strong></div>'
        +'<div class="fl-plan-row"><span>&#8987; Flight time</span><span>'+route.dur+'</span></div>'
        +'<div class="fl-plan-row"><span>&#9992; Airlines</span><span>'+route.airlines+'</span></div>'
        +'</div>';
    }

    if(budget&&route&&typeof route.min==='number'){
      var flMin=route.min*cabinFareMult*groupN;
      var flMax=route.max*cabinFareMult*groupN;
      var rem=budget-flMin;
      html+='<div class="fl-plan-section">';
      html+='<div class="fl-plan-row"><span>&#128176; Your budget</span><strong>'+cur+' '+budget.toLocaleString()+'</strong></div>';
      html+='<div class="fl-plan-row"><span>&#9992; Flights ('+groupN+'&times;, min est.)</span><span>&minus;'+cur+' '+Math.round(flMin).toLocaleString()+'</span></div>';
      if(rem>0){
        var rate=typeof midRate==='number'&&midRate>0?midRate:85;
        var remINR=Math.round(rem*rate);
        var days=tripDays;
        var pdINR=Math.round(remINR/days);
        var comfort=pdINR>15000?'Luxury &mdash; 4&#9733; hotels, fine dining, activities'
          :pdINR>8000?'Comfortable &mdash; good hotels, mix of dining'
          :pdINR>4000?'Budget-friendly &mdash; guesthouses, local food'
          :'Very tight &mdash; plan every expense carefully';
        html+='<div class="fl-plan-row"><span>&#127968; Hotels + local (remaining)</span><strong>'+cur+' '+Math.round(rem).toLocaleString()+'</strong></div>';
        html+='<div class="fl-plan-row"><span>&#8377; India spending</span><span>&asymp; &#8377;'+remINR.toLocaleString()+' ('+days+' nights)</span></div>';
        html+='<div class="fl-plan-row"><span>&#128197; Daily India budget</span><span>&asymp; &#8377;'+pdINR.toLocaleString()+'/day</span></div>';
        html+='<div class="fl-plan-advice">'+comfort+'</div>';
      } else {
        html+='<div class="fl-plan-advice">&#9888;&#65039; Budget may be tight for '+groupN+' traveller'+(groupN>1?'s':'')+' &mdash; min est. '+cur+' '+Math.round(flMin).toLocaleString()+'</div>';
      }
      html+='</div>';
    }

    html+='</div>';
    res.innerHTML=html;
    res.style.display='block';
    // Scroll to results so user sees "Best Travel Dates" immediately
    setTimeout(function(){res.scrollIntoView({behavior:'smooth',block:'start'});},120);
  };

  // Hook showTab — init flights when tab is opened
  var _flShowOrig=window.showTab;
  window.showTab=function(tab,el){
    if(typeof _flShowOrig==='function') _flShowOrig(tab,el);
    if(tab==='flights'&&typeof window.initFlights==='function'){
      setTimeout(window.initFlights,80);
    }
  };
  document.addEventListener('DOMContentLoaded',function(){
    if(document.getElementById('tab-flights')&&
       document.getElementById('tab-flights').style.display!=='none'&&
       typeof window.initFlights==='function'){
      window.initFlights();
    }
  });
})();

/* ── v7.5: Bottom nav active state sync ── */
window.setMobBnav=function(tabId){
  document.querySelectorAll('.mob-bnav-btn').forEach(function(b){b.classList.remove('mob-active');});
  var el=document.getElementById('mbn-'+tabId);
  if(el) el.classList.add('mob-active');
};

/* ══════════════════════════════════════════════════════
   v7.14 — BULK & BLOCK DEALS ENGINE
   ══════════════════════════════════════════════════════ */

/* ── Trading day calculator ── */
function _tradingDays(n){
  var days=[],d=new Date(),added=0;
  // Indian market holidays 2026 (approx)
  var holidays=['2026-01-26','2026-03-25','2026-04-14','2026-04-02','2026-08-15','2026-10-02','2026-10-20','2026-11-04','2026-12-25'];
  while(added<n){
    d.setDate(d.getDate()-1);
    var dow=d.getDay();
    if(dow===0||dow===6) continue;
    var ds=d.toISOString().slice(0,10);
    if(holidays.indexOf(ds)>-1) continue;
    days.push(ds);
    added++;
  }
  return days;
}

/* ── Format helpers ── */
function _fmtCr(v){
  if(v>=10000) return (v/10000).toFixed(1)+'L Cr';
  if(v>=100) return (v/100).toFixed(0)+' Cr';
  return v.toFixed(1)+' Cr';
}
function _fmtQ(v){
  if(v>=10000000) return (v/10000000).toFixed(2)+' Cr';
  if(v>=100000) return (v/100000).toFixed(2)+' L';
  if(v>=1000) return (v/1000).toFixed(1)+'K';
  return v.toString();
}

/* ── Sample deal data generator ── */
(function(){
  var BULK_TMPL=[
    {sym:'HDFCBANK',co:'HDFC Bank Ltd',clients:['BlackRock Emerging Mkts Fund','Norges Bank Investment Mgmt','Vanguard Emerging Markets Fund','SBI Life Insurance Co Ltd'],price:1842,sector:'Banking'},
    {sym:'RELIANCE',co:'Reliance Industries Ltd',clients:['SBI Mutual Fund - ELSS','LIC of India','Morgan Stanley Asia Pacific','GIC Singapore Pte Ltd'],price:2983,sector:'Energy'},
    {sym:'TCS',co:'Tata Consultancy Services Ltd',clients:['ICICI Prudential MF - Bluechip','Fidelity India Fund','Dimensional Fund Advisors','Nippon India MF'],price:3978,sector:'IT'},
    {sym:'INFY',co:'Infosys Ltd',clients:['UTI MF - Equity Fund','Mirae Asset MF','T Rowe Price Funds','Franklin Templeton India'],price:1826,sector:'IT'},
    {sym:'WIPRO',co:'Wipro Ltd',clients:['Government Pension Fund Global','Azim Premji Trust','DSP MF - Tax Saver','HDFC Mutual Fund'],price:542,sector:'IT'},
    {sym:'ICICIBANK',co:'ICICI Bank Ltd',clients:['Kotak MF - Flexi Cap','GIC Re','Invesco India MF','Allianz Global Investors'],price:1385,sector:'Banking'},
    {sym:'KOTAKBANK',co:'Kotak Mahindra Bank Ltd',clients:['Uday Kotak - Promoter','Aberdeen Asset Mgmt','Axis Mutual Fund','Jupiter Asset Mgmt'],price:2240,sector:'Banking'},
    {sym:'SBIN',co:'State Bank of India',clients:['Government of India - Promoter','LIC of India','SBI MF - Large Cap','HDFC Life Insurance'],price:824,sector:'Banking'},
    {sym:'AXISBANK',co:'Axis Bank Ltd',clients:['Bain Capital - PE','Max Life Insurance','HDFC MF - Banking ETF','Mirae Asset MF'],price:1343,sector:'Banking'},
    {sym:'BAJFINANCE',co:'Bajaj Finance Ltd',clients:['GQG Partners LLC','SBI MF - Large Mid Cap','Bajaj Holdings - Promoter','Fidelity India Fund'],price:7245,sector:'NBFC'},
    {sym:'MARUTI',co:'Maruti Suzuki India Ltd',clients:['Suzuki Motor - Promoter','Nippon India MF','ICICI Pru Life Insurance','Franklin India Fund'],price:13250,sector:'Auto'},
    {sym:'TATAMOTORS',co:'Tata Motors Ltd',clients:['Tata Sons Pvt Ltd - Promoter','Clsa Ltd','HDFC MF - Equity','UBS AG London Branch'],price:984,sector:'Auto'},
    {sym:'SUNPHARMA',co:'Sun Pharmaceutical Industries',clients:['Dilip Shanghvi - Promoter','DSP MF - Flexi Cap','HDFC MF - Mid Cap','Invesco India MF'],price:1926,sector:'Pharma'},
    {sym:'DRREDDY',co:'Dr Reddys Laboratories Ltd',clients:['Aberdeen India Equity','K Satish Reddy - Promoter','Axis MF - Long Term','Mirae Asset India Equity'],price:6340,sector:'Pharma'},
    {sym:'ADANIENT',co:'Adani Enterprises Ltd',clients:['GQG Partners Emerging Mkts','Adani Infra - Promoter','SBI Life Insurance','Societe Generale'],price:2890,sector:'Conglomerate'},
    {sym:'ADANIPORTS',co:'Adani Ports and SEZ Ltd',clients:['GQG Partners LLC','Adani Family - Promoter','ICICI Prudential Life','Morgan Stanley Funds'],price:1582,sector:'Infra'},
    {sym:'ITC',co:'ITC Ltd',clients:['BAT Group - Promoter Entity','LIC of India','Nippon India MF','UTI MF - Value Fund'],price:463,sector:'FMCG'},
    {sym:'HUL',co:'Hindustan Unilever Ltd',clients:['Unilever NV - Promoter','DSP MF - India Equity','Axis Life Insurance','HDFC MF - Balanced Adv'],price:2735,sector:'FMCG'},
    {sym:'ONGC',co:'Oil and Natural Gas Corp Ltd',clients:['Government of India - Promoter','LIC of India','SBI MF - Value Fund','ICICI Pru Large Cap'],price:278,sector:'Energy'},
    {sym:'NTPC',co:'NTPC Ltd',clients:['Government of India','LIC - Pension Fund','DSP MF - Equity','Axis MF - Banking'],price:384,sector:'Power'},
    {sym:'HCLTECH',co:'HCL Technologies Ltd',clients:['Shiv Nadar Trust - Promoter','Vanguard Institutional Index','SBI MF - Contra','Aberdeen Asset Mgmt'],price:1862,sector:'IT'},
    {sym:'TECHM',co:'Tech Mahindra Ltd',clients:['Mahindra and Mahindra - Promoter','Franklin Templeton India','Kotak MF - Emerging Equity','Mirae Asset MF'],price:1765,sector:'IT'},
    {sym:'NESTLEIND',co:'Nestle India Ltd',clients:['Nestle SA - Promoter','HDFC MF - Focussed','Axis MF - Bluechip','UTI Equity Fund'],price:2425,sector:'FMCG'},
    {sym:'BAJAJFINSV',co:'Bajaj Finserv Ltd',clients:['Bajaj Group - Promoter','Sanjiv Bajaj - Director','SBI MF - Small Cap','ICICI Pru MF'],price:1890,sector:'Finance'},
    {sym:'POWERGRID',co:'Power Grid Corp of India',clients:['Government of India','LIC of India','HDFC MF - Infrastructure','Nippon India ETF'],price:342,sector:'Power'},
    {sym:'COALINDIA',co:'Coal India Ltd',clients:['Government of India - Promoter','LIC of India - Markets','DSP MF - Value Fund','SBI MF - Contra'],price:498,sector:'Mining'},
    {sym:'HINDALCO',co:'Hindalco Industries Ltd',clients:['Aditya Birla Group','Fidelity India Equity','HSBC Global Asset Mgmt','Axis MF - Flexi Cap'],price:718,sector:'Metals'},
    {sym:'TATASTEEL',co:'Tata Steel Ltd',clients:['Tata Sons - Promoter','GIC Singapore','SBI MF - PSU Banking','DSP MF - Equity Savings'],price:192,sector:'Metals'},
    {sym:'JSWSTEEL',co:'JSW Steel Ltd',clients:['JSW Group - Promoter','Fidelity Emerging Mkts','Nippon India MF','HDFC MF - Equity Savings'],price:1025,sector:'Metals'},
    {sym:'ZOMATO',co:'Zomato Ltd',clients:['Tiger Global Mgmt LLC','Ant Group Investment','Mirae Asset MF','UTI MF - Flexi Cap'],price:264,sector:'Consumer Tech'},
  ];

  var BLOCK_EXTRA=[
    {sym:'HDFCLIFE',co:'HDFC Life Insurance Co Ltd',clients:['Standard Life Aberdeen','HDFC Ltd - Promoter','Nippon India MF','Axis MF'],price:724,sector:'Insurance'},
    {sym:'SBILIFE',co:'SBI Life Insurance Co Ltd',clients:['State Bank of India - Promoter','BNP Paribas Cardif','ICICI Pru Life','HDFC MF'],price:1892,sector:'Insurance'},
    {sym:'DMART',co:'Avenue Supermarts Ltd',clients:['Radhakishan Damani - Promoter','SBI MF - Dividend Yield','Mirae Asset India','Franklin India Opp'],price:5240,sector:'Retail'},
    {sym:'NAUKRI',co:'Info Edge India Ltd',clients:['Sanjeev Bikhchandani - Founder','Tiger Global Mgmt','ICICI Prudential MF','SBI MF - Bluechip'],price:8620,sector:'Internet'},
    {sym:'PIDILITIND',co:'Pidilite Industries Ltd',clients:['Madhukar Parekh - Promoter','Vanguard Emerging Mkts','HDFC MF - Equity','DSP MF - Flexi Cap'],price:3120,sector:'Chemicals'},
  ];

  function _rnd(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
  function _pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

  function _genDeals(days,type){
    var out=[];
    var pool=type==='block'?BULK_TMPL.slice(0,20).concat(BLOCK_EXTRA):BULK_TMPL;
    var id=1;
    days.forEach(function(dateStr,di){
      var nDeals=type==='block'?_rnd(8,16):_rnd(22,38);
      var usedPairs={};
      var count=0;
      while(count<nDeals){
        var item=_pick(pool);
        var client=_pick(item.clients);
        var key=item.sym+'|'+client;
        if(usedPairs[key]) continue;
        usedPairs[key]=1;
        var bs=Math.random()>0.48?'B':'S';
        var priceVar=(1+(_rnd(-8,8)/100));
        var price=Math.round(item.price*priceVar*100)/100;
        var qty,minQ,maxQ;
        if(type==='block'){
          // Block: >5L shares OR >5cr value
          var minShares=Math.max(500000,Math.ceil(5000000/price));
          qty=minShares+_rnd(100000,2000000);
        } else {
          // Bulk: 0.5-3% of typical float
          qty=_rnd(200000,4500000);
        }
        var val=(qty*price)/10000000; // crore
        out.push({
          id:id++,date:dateStr,
          exch:Math.random()>0.45?'NSE':'BSE',
          sym:item.sym,co:item.co,sector:item.sector,
          client:client,bs:bs,qty:qty,price:price,val:val
        });
        count++;
      }
    });
    return out;
  }

  /* ── State ── */
  window._dealsState={
    bulk:[],block:[],
    activeType:'bulk',   // bulk | block
    exchFilter:'ALL',    // ALL | NSE | BSE
    bsFilter:'ALL',      // ALL | B | S
    search:'',
    sortCol:'date',sortDir:-1,
    loaded:false,liveOk:false
  };

  /* ── Init ── */
  window.initDeals=function(){
    var ds=window._dealsState;
    if(ds.loaded) { _renderDeals(); return; }
    var days=_tradingDays(7);
    ds.bulk=_genDeals(days,'bulk');
    ds.block=_genDeals(days,'block');
    ds.loaded=true;
    ds.liveOk=false;
    // Try live NSE fetch (CORS will likely block; graceful fallback)
    _tryLiveFetch(days).then(function(ok){
      ds.liveOk=ok;
      _renderDeals();
    });
    _renderDeals();
  };

  function _tryLiveFetch(days){
    return new Promise(function(resolve){
      var to=days[0],from=days[days.length-1];
      var url='https://www.nseindia.com/api/bulk-deals-data?type=bulk_deals&from_date='+
              from.split('-').reverse().join('-')+'&to_date='+to.split('-').reverse().join('-');
      var timer=setTimeout(function(){resolve(false);},4000);
      fetch(url,{headers:{'Accept':'application/json'},mode:'cors'})
        .then(function(r){return r.json();})
        .then(function(data){
          clearTimeout(timer);
          if(data&&(data.data||data.bulkDealData)){
            // Parse live data if available
            var rows=data.data||data.bulkDealData||[];
            if(rows.length>0){
              // Map NSE fields to our format
              window._dealsState.bulk=rows.map(function(r,i){
                return {
                  id:i+1,
                  date:r.BD_DT_DATE||r.date||'',
                  exch:'NSE',
                  sym:r.BD_SYMBOL||r.symbol||'',
                  co:r.BD_COMP_NAME||r.companyName||'',
                  client:r.BD_CLIENT_NAME||r.clientName||'',
                  bs:(r.BD_BUY_SELL||r.buySell||'B').trim().charAt(0),
                  qty:parseInt(r.BD_QTY_TRD||r.quantity||0),
                  price:parseFloat(r.BD_TP_WATP||r.price||0),
                  val:parseFloat(r.BD_REMARKS||0)||((parseInt(r.BD_QTY_TRD||0)*parseFloat(r.BD_TP_WATP||0))/10000000)
                };
              });
              resolve(true);
            } else { resolve(false); }
          } else { resolve(false); }
        })
        .catch(function(){ clearTimeout(timer); resolve(false); });
    });
  }

  /* ── Filter & sort ── */
  function _filteredData(){
    var ds=window._dealsState;
    var data=ds.activeType==='bulk'?ds.bulk:ds.block;
    var s=ds.search.toLowerCase();
    return data
      .filter(function(r){
        if(ds.exchFilter!=='ALL'&&r.exch!==ds.exchFilter) return false;
        if(ds.bsFilter!=='ALL'&&r.bs!==ds.bsFilter) return false;
        if(s&&r.sym.toLowerCase().indexOf(s)<0&&r.co.toLowerCase().indexOf(s)<0&&r.client.toLowerCase().indexOf(s)<0) return false;
        return true;
      })
      .sort(function(a,b){
        var col=ds.sortCol,dir=ds.sortDir;
        var av=a[col],bv=b[col];
        if(typeof av==='string') av=av.toLowerCase(),bv=bv.toLowerCase();
        return av<bv?dir:av>bv?-dir:0;
      });
  }

  /* ── Stats ── */
  function _computeStats(rows){
    var buyVal=0,sellVal=0,buyCount=0,sellCount=0;
    rows.forEach(function(r){
      if(r.bs==='B'){ buyVal+=r.val; buyCount++; }
      else { sellVal+=r.val; sellCount++; }
    });
    return {buyVal:buyVal,sellVal:sellVal,buyCount:buyCount,sellCount:sellCount,total:rows.length};
  }

  /* ── Render ── */
  function _renderDeals(){
    var ds=window._dealsState;
    var rows=_filteredData();
    var stats=_computeStats(rows);

    // Update stats cards
    var el=function(id){return document.getElementById(id);};
    if(el('deals-stat-total')) el('deals-stat-total').textContent=rows.length;
    if(el('deals-stat-buy')) el('deals-stat-buy').textContent=_fmtCr(stats.buyVal);
    if(el('deals-stat-sell')) el('deals-stat-sell').textContent=_fmtCr(stats.sellVal);
    if(el('deals-stat-net')){
      var net=stats.buyVal-stats.sellVal;
      el('deals-stat-net').textContent=(net>=0?'+':'')+_fmtCr(Math.abs(net));
      el('deals-stat-net').className='deals-stat-val '+(net>=0?'buy':'sell');
    }

    // Update badge
    var badge=el('deals-data-badge');
    if(badge){
      if(ds.liveOk){
        badge.className='deals-live-badge';
        badge.innerHTML='<span class="deals-live-dot"></span>Live NSE Data';
      } else {
        badge.className='deals-error-badge';
        badge.innerHTML='&#9888; Sample Data &#8212; NSE blocked (CORS)';
      }
    }

    // Build table rows
    var tbody=el('deals-tbody');
    if(!tbody) return;
    if(rows.length===0){
      tbody.innerHTML='<tr><td colspan="9" class="deals-empty"><div class="deals-empty-icon">&#128269;</div>No deals match your filter</td></tr>';
      return;
    }
    var html='';
    rows.forEach(function(r){
      var bsCls=r.bs==='B'?'deals-badge-buy':'deals-badge-sell';
      var bsTxt=r.bs==='B'?'BUY':'SELL';
      var exchCls=r.exch==='NSE'?'deals-exch-nse':'deals-exch-bse';
      html+='<tr>'
        +'<td class="deals-date">'+r.date+'</td>'
        +'<td><span class="'+exchCls+'">'+r.exch+'</span></td>'
        +'<td><div class="deals-sym">'+r.sym+'</div><div class="deals-co">'+r.co+'</div></td>'
        +'<td class="deals-client" title="'+r.client+'">'+r.client+'</td>'
        +'<td><span class="'+bsCls+'">'+bsTxt+'</span></td>'
        +'<td class="deals-val" style="text-align:right">'+_fmtQ(r.qty)+'</td>'
        +'<td style="text-align:right">&#8377;'+r.price.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td>'
        +'<td class="deals-val" style="text-align:right">&#8377;'+_fmtCr(r.val)+'</td>'
        +'</tr>';
    });
    tbody.innerHTML=html;
  }

  /* ── Public API ── */
  window.dealsSetType=function(type,btn){
    window._dealsState.activeType=type;
    document.querySelectorAll('.deals-stab').forEach(function(b){b.classList.remove('active');});
    if(btn) btn.classList.add('active');
    _renderDeals();
  };
  window.dealsSetExch=function(v,btn){
    window._dealsState.exchFilter=v;
    document.querySelectorAll('.deals-filter-group.exch .deals-fbtn').forEach(function(b){b.classList.remove('active');});
    if(btn) btn.classList.add('active');
    _renderDeals();
  };
  window.dealsSetBS=function(v,btn){
    window._dealsState.bsFilter=v;
    document.querySelectorAll('.deals-filter-group.bs .deals-fbtn').forEach(function(b){b.classList.remove('active');});
    if(btn) btn.classList.add('active');
    _renderDeals();
  };
  window.dealsSearch=function(v){
    window._dealsState.search=v;
    _renderDeals();
  };
  window.dealsSort=function(col,thEl){
    var ds=window._dealsState;
    if(ds.sortCol===col) ds.sortDir*=-1;
    else { ds.sortCol=col; ds.sortDir=-1; }
    document.querySelectorAll('.deals-table th').forEach(function(t){t.className='';});
    if(thEl) thEl.className=ds.sortDir===1?'sort-asc':'sort-desc';
    _renderDeals();
  };
  window.dealsRefresh=function(btn){
    btn.classList.add('spinning');
    window._dealsState.loaded=false;
    window.initDeals();
    setTimeout(function(){btn.classList.remove('spinning');},1800);
  };
})();

/* ============================================================
   v7.14 — SEND NOW OR WAIT? RATE TIMER
   ============================================================ */
(function(){

  /* Currency pairs config — matches all currencies in top flag dropdown */
  var RT_PAIRS = [
    /* Gulf */
    {id:'AED',label:'AED → INR',flag:'🇦🇪',fi:'ae',key:'inr',cross:'aed',region:'Gulf'},
    {id:'SAR',label:'SAR → INR',flag:'🇸🇦',fi:'sa',key:'inr',cross:'sar',region:'Gulf'},
    {id:'QAR',label:'QAR → INR',flag:'🇶🇦',fi:'qa',key:'inr',cross:'qar',region:'Gulf'},
    {id:'KWD',label:'KWD → INR',flag:'🇰🇼',fi:'kw',key:'inr',cross:'kwd',region:'Gulf'},
    {id:'BHD',label:'BHD → INR',flag:'🇧🇭',fi:'bh',key:'inr',cross:'bhd',region:'Gulf'},
    {id:'OMR',label:'OMR → INR',flag:'🇴🇲',fi:'om',key:'inr',cross:'omr',region:'Gulf'},
    /* Western */
    {id:'USD',label:'USD → INR',flag:'🇺🇸',fi:'us',key:'inr',cross:null,region:'Western'},
    {id:'GBP',label:'GBP → INR',flag:'🇬🇧',fi:'gb',key:'inr',cross:'gbp',region:'Western'},
    {id:'EUR',label:'EUR → INR',flag:'🇪🇺',fi:'eu',key:'inr',cross:'eur',region:'Western'},
    {id:'CAD',label:'CAD → INR',flag:'🇨🇦',fi:'ca',key:'inr',cross:'cad',region:'Western'},
    {id:'AUD',label:'AUD → INR',flag:'🇦🇺',fi:'au',key:'inr',cross:'aud',region:'Western'},
    {id:'NZD',label:'NZD → INR',flag:'🇳🇿',fi:'nz',key:'inr',cross:'nzd',region:'Western'},
    {id:'CHF',label:'CHF → INR',flag:'🇨🇭',fi:'ch',key:'inr',cross:'chf',region:'Western'},
    {id:'SEK',label:'SEK → INR',flag:'🇸🇪',fi:'se',key:'inr',cross:'sek',region:'Western'},
    {id:'NOK',label:'NOK → INR',flag:'🇳🇴',fi:'no',key:'inr',cross:'nok',region:'Western'},
    {id:'DKK',label:'DKK → INR',flag:'🇩🇰',fi:'dk',key:'inr',cross:'dkk',region:'Western'},
    /* Asia-Pacific */
    {id:'SGD',label:'SGD → INR',flag:'🇸🇬',fi:'sg',key:'inr',cross:'sgd',region:'Asia'},
    {id:'MYR',label:'MYR → INR',flag:'🇲🇾',fi:'my',key:'inr',cross:'myr',region:'Asia'},
    {id:'JPY',label:'JPY → INR',flag:'🇯🇵',fi:'jp',key:'inr',cross:'jpy',region:'Asia'},
    {id:'HKD',label:'HKD → INR',flag:'🇭🇰',fi:'hk',key:'inr',cross:'hkd',region:'Asia'}
  ];

  /* State */
  var _rtPair = RT_PAIRS[0];
  var _rtTf   = 90;
  var _rtData  = {};   /* { 'YYYY-MM-DD': rate } */
  var _rtLoading = false;

  /* Fetch rate for a single date from jsDelivr currency CDN */
  function _rtFetch(dateStr) {
    var url = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@' + dateStr + '/v1/currencies/usd.json';
    return fetch(url, {signal: AbortSignal.timeout(6000)})
      .then(function(r){ return r.json(); })
      .then(function(d){ return d.usd || {}; })
      .catch(function(){ return null; });
  }

  /* Get cross rate from USD-base data */
  function _rtRate(usdData, pair) {
    if (!usdData) return null;
    var inr = usdData[pair.key];
    if (!inr) return null;
    if (!pair.cross) return inr;
    var crossVal = usdData[pair.cross];
    if (!crossVal) return null;
    return inr / crossVal;
  }

  /* Build date strings going back N days (weekly samples) */
  function _rtDates(days) {
    var dates = [];
    var step  = Math.max(7, Math.floor(days / 26));
    var d     = new Date();
    var added = 0;
    while (added < 26 && (d - new Date(Date.now() - days * 86400000)) > 0) {
      d.setDate(d.getDate() - step);
      var ds = d.toISOString().slice(0,10);
      dates.push(ds);
      added++;
    }
    return dates;
  }

  /* Percentile: what % of historical rates are <= current rate */
  function _rtPercentile(current, hist) {
    if (!hist.length) return 50;
    var below = hist.filter(function(v){ return v <= current; }).length;
    return Math.round((below / hist.length) * 100);
  }

  /* Recommendation based on percentile */
  function _rtRec(pct) {
    if (pct >= 65) return {cls:'rt-rec-send', icon:'✅', text:'Send Now', sub:'Rate is better than ' + pct + '% of recent days'};
    if (pct >= 40) return {cls:'rt-rec-neutral', icon:'⏳', text:'Rate is Average', sub:'Neutral — ' + pct + '% of recent days were lower'};
    return {cls:'rt-rec-wait', icon:'⏳', text:'Consider Waiting', sub:'Rate is lower than ' + (100-pct) + '% of recent days'};
  }

  /* Draw sparkline chart */
  function _rtDrawChart(dates, rates, currentRate) {
    var canvas = document.getElementById('rt-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.offsetWidth || 600;
    var H = canvas.offsetHeight || 160;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, W, H);

    if (!rates.length) return;

    var pad = {t:10, r:10, b:28, l:50};
    var cW  = W - pad.l - pad.r;
    var cH  = H - pad.t - pad.b;

    var allRates = rates.concat([currentRate]);
    var minR = Math.min.apply(null, allRates) * 0.999;
    var maxR = Math.max.apply(null, allRates) * 1.001;
    var range = maxR - minR || 1;

    function xPos(i, total){ return pad.l + (i / (total - 1)) * cW; }
    function yPos(v){ return pad.t + cH - ((v - minR) / range) * cH; }

    /* Grid lines */
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + (g / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(pad.l + cW, gy); ctx.stroke();
      var val = maxR - (g / 4) * range;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('₹' + val.toFixed(2), pad.l - 4, gy + 4);
    }

    /* Historical avg line */
    var avg = rates.reduce(function(a,b){return a+b;},0) / rates.length;
    var avgY = yPos(avg);
    ctx.strokeStyle = 'rgba(240,165,32,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(pad.l, avgY); ctx.lineTo(pad.l + cW, avgY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(240,165,32,0.6)';
    ctx.font = '9px Arial'; ctx.textAlign = 'left';
    ctx.fillText('avg ₹' + avg.toFixed(2), pad.l + 4, avgY - 3);

    /* Line path + gradient fill */
    var gradient = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    gradient.addColorStop(0, 'rgba(0,212,170,0.3)');
    gradient.addColorStop(1, 'rgba(0,212,170,0)');

    ctx.beginPath();
    rates.forEach(function(v, i){
      var x = xPos(i, rates.length); var y = yPos(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0,212,170,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Fill area */
    ctx.lineTo(xPos(rates.length-1, rates.length), pad.t + cH);
    ctx.lineTo(pad.l, pad.t + cH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    /* Dots at each point */
    ctx.fillStyle = 'rgba(0,212,170,0.6)';
    rates.forEach(function(v, i){
      ctx.beginPath();
      ctx.arc(xPos(i, rates.length), yPos(v), 2.5, 0, Math.PI*2);
      ctx.fill();
    });

    /* Current rate marker */
    var curX = pad.l + cW;
    var curY = yPos(currentRate);
    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, Math.PI*2);
    ctx.fillStyle = '#f0a520';
    ctx.fill();
    ctx.strokeStyle = 'var(--bg, #060b1c)';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* X-axis date labels */
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Arial'; ctx.textAlign = 'center';
    var step = Math.max(1, Math.floor(dates.length / 5));
    dates.forEach(function(d, i){
      if (i % step === 0) {
        var x = xPos(i, dates.length);
        var label = d.slice(5); /* MM-DD */
        ctx.fillText(label, x, H - pad.b + 14);
      }
    });
  }

  /* Update sim result */
  function _rtUpdateSim() {
    var inp = document.getElementById('rt-sim-amt');
    var res = document.getElementById('rt-sim-res');
    var avg30 = parseFloat(document.getElementById('rt-stat-30d') && document.getElementById('rt-stat-30d').dataset.raw);
    var cur   = parseFloat(document.getElementById('rt-rate-val') && document.getElementById('rt-rate-val').dataset.raw);
    if (!inp || !res || !avg30 || !cur) return;
    var amt = parseFloat(inp.value) || 1000;
    var diff = (cur - avg30) * amt;
    var sign = diff >= 0 ? '+' : '';
    res.textContent = 'vs 30D avg: ' + sign + '₹' + Math.round(diff).toLocaleString('en-IN');
    res.className = 'rt-sim-result ' + (diff >= 0 ? 'pos' : 'neg');
  }

  /* Render the full UI with fetched data */
  function _rtRender(currentRate, datesSorted, ratesSorted) {
    var hist = ratesSorted.slice();

    var pct   = _rtPercentile(currentRate, hist);
    var rec   = _rtRec(pct);

    /* Rate display */
    var rateEl = document.getElementById('rt-rate-val');
    if (rateEl) { rateEl.textContent = '₹' + currentRate.toFixed(4); rateEl.dataset.raw = currentRate; }

    var subEl = document.getElementById('rt-rate-sub');
    if (subEl) subEl.textContent = '1 ' + _rtPair.id + ' = ₹' + currentRate.toFixed(2);

    /* Recommendation */
    var pillEl = document.getElementById('rt-rec-pill');
    if (pillEl) { pillEl.textContent = rec.icon + ' ' + rec.text; pillEl.className = 'rt-rec-pill ' + rec.cls; }
    var subRecEl = document.getElementById('rt-rec-sub');
    if (subRecEl) subRecEl.textContent = rec.sub;

    /* Percentile bar */
    var fillEl = document.getElementById('rt-pct-fill');
    var markEl = document.getElementById('rt-pct-marker');
    var pctValEl = document.getElementById('rt-pct-val');
    if (fillEl) fillEl.style.width = pct + '%';
    if (markEl) markEl.style.left = pct + '%';
    if (pctValEl) pctValEl.textContent = 'Better than ' + pct + '% of the last ' + _rtTf + ' days';

    /* Stats */
    var last30  = ratesSorted.slice(-4);
    var last90  = ratesSorted.slice(-13);
    var avg30v  = last30.reduce(function(a,b){return a+b;},0) / (last30.length||1);
    var avg90v  = last90.reduce(function(a,b){return a+b;},0) / (last90.length||1);
    var hiV     = Math.max.apply(null, hist);
    var loV     = Math.min.apply(null, hist);

    function _setS(id, val, raw) {
      var el = document.getElementById(id);
      if (el) { el.textContent = '₹' + val.toFixed(2); if (raw !== undefined) el.dataset.raw = raw; }
    }
    _setS('rt-stat-30d', avg30v, avg30v);
    _setS('rt-stat-90d', avg90v);
    _setS('rt-stat-hi', hiV);
    _setS('rt-stat-lo', loV);

    var s30 = document.getElementById('rt-stat-30d');
    if (s30) s30.className = 'rt-stat-val ' + (currentRate >= avg30v ? 'up' : 'dn');

    /* Chart */
    _rtDrawChart(datesSorted, ratesSorted, currentRate);

    /* Sim */
    _rtUpdateSim();

    /* Updated time */
    var upEl = document.getElementById('rt-updated');
    if (upEl) upEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();

    /* Hide skeleton */
    var sk = document.getElementById('rt-skeleton-msg');
    if (sk) sk.style.display = 'none';
  }

  /* Main init — called when tab opens */
  window.initRateTimer = function() {
    if (_rtLoading) return;
    _rtLoading = true;

    var sk = document.getElementById('rt-skeleton-msg');
    if (sk) sk.style.display = 'block';

    var today = new Date().toISOString().slice(0,10);
    var histDates = _rtDates(_rtTf);

    var allDates = histDates.concat([today]);
    var promises = allDates.map(function(d){ return _rtFetch(d); });

    Promise.all(promises).then(function(results) {
      var currentRaw = results[results.length - 1];
      var currentRate = _rtRate(currentRaw, _rtPair);

      if (!currentRate) {
        /* Fallback sample rates if API fails */
        var FALLBACK = {AED:23.02,SAR:22.53,QAR:23.20,KWD:275.1,BHD:224.5,OMR:219.8,USD:84.5,GBP:107.2,EUR:91.4,CAD:62.1,AUD:55.3,NZD:50.2,CHF:95.8,SEK:8.42,NOK:8.15,DKK:12.25,SGD:63.8,MYR:23.58,JPY:0.555,HKD:10.85};
        currentRate = FALLBACK[_rtPair.id] || 84.5;
      }

      var datesSorted = [];
      var ratesSorted = [];
      histDates.forEach(function(d, i) {
        var r = _rtRate(results[i], _rtPair);
        if (r) { datesSorted.push(d); ratesSorted.push(r); }
      });

      /* Sort oldest to newest */
      var combined = datesSorted.map(function(d,i){return {d:d,r:ratesSorted[i]};});
      combined.sort(function(a,b){return a.d < b.d ? -1 : 1;});
      datesSorted = combined.map(function(x){return x.d;});
      ratesSorted = combined.map(function(x){return x.r;});

      _rtData = {};
      datesSorted.forEach(function(d,i){_rtData[d]=ratesSorted[i];});

      _rtLoading = false;
      _rtRender(currentRate, datesSorted, ratesSorted);
    }).catch(function(){
      _rtLoading = false;
      var sk2 = document.getElementById('rt-skeleton-msg');
      if (sk2) sk2.textContent = 'Could not load rate data. Check your connection.';
    });
  };

  /* Pair switch */
  window.rtSetPair = function(id, el) {
    document.querySelectorAll('.rt-pair-btn').forEach(function(b){b.classList.remove('rt-active');});
    if (el) el.classList.add('rt-active');
    _rtPair = RT_PAIRS.filter(function(p){return p.id===id;})[0] || RT_PAIRS[0];
    _rtData = {};
    _rtLoading = false;
    initRateTimer();
  };

  /* Timeframe switch */
  window.rtSetTf = function(days, el) {
    document.querySelectorAll('.rt-tf-btn').forEach(function(b){b.classList.remove('rt-tf-active');});
    if (el) el.classList.add('rt-tf-active');
    _rtTf = days;
    _rtData = {};
    _rtLoading = false;
    initRateTimer();
  };

  /* Sim input */
  window.rtSimCalc = function() { _rtUpdateSim(); };

})();

/* ============================================================
   v7.14 — EDUCATION ABROAD COST PLANNER
   ============================================================ */
(function(){

  /* ── Country + University data ──────────────────────────────── */
  var EDAB = {
    USA:{name:'United States',flag:'🇺🇸',fi:'us',cur:'USD',inrRate:84.5,edInflation:5,
      courses:{
        'UG (4yr)':{dur:4,tuition:[32000,62000],living:[18000,24000]},
        'MS / MTech':{dur:2,tuition:[14000,65000],living:[20000,26000]},
        'MBA':{dur:2,tuition:[65000,90000],living:[24000,30000]},
        'MBBS / MD':{dur:4,tuition:[55000,75000],living:[22000,28000]},
        'PhD':{dur:5,tuition:[0,15000],living:[20000,26000]}
      },
      unis:{
        'UG (4yr)':[
          {name:'MIT',city:'Cambridge, MA',rank:'#1 QS',tuition:57986,living:21000,schol:'Need-blind for intl students'},
          {name:'Stanford University',city:'Palo Alto, CA',rank:'#5 QS',tuition:62484,living:22000,schol:'Need-based aid available'},
          {name:'Princeton University',city:'Princeton, NJ',rank:'#13 QS',tuition:59710,living:20000,schol:'Meets 100% demonstrated need'},
          {name:'Univ. of Texas Austin',city:'Austin, TX',rank:'#197 QS',tuition:40032,living:18000,schol:'Merit scholarships available'},
          {name:'Purdue University',city:'West Lafayette, IN',rank:'#109 QS',tuition:32192,living:16000,schol:'Strong for Engineering & CS'},
          {name:'Arizona State Univ.',city:'Tempe, AZ',rank:'#216 QS',tuition:30000,living:15000,schol:'Several intl merit scholarships'}
        ],
        'MS / MTech':[
          {name:'MIT (EECS / CS)',city:'Cambridge, MA',rank:'#1 QS',tuition:61990,living:21000,schol:'Research assistant fellowships'},
          {name:'Stanford (CS / EE)',city:'Palo Alto, CA',rank:'#5 QS',tuition:63585,living:22000,schol:'Knight-Hennessy Scholars (full)'},
          {name:'Carnegie Mellon (MSCS)',city:'Pittsburgh, PA',rank:'#52 QS',tuition:53000,living:19000,schol:'Limited TA/RA positions'},
          {name:'Georgia Tech (MSCS)',city:'Atlanta, GA',rank:'#89 QS',tuition:13948,living:18000,schol:'Most affordable top-10 CS MS'},
          {name:'Univ. of Michigan (Eng)',city:'Ann Arbor, MI',rank:'#23 QS',tuition:24546,living:20000,schol:'Rackham Merit Fellowship'},
          {name:'Purdue (MS Eng)',city:'W. Lafayette, IN',rank:'#109 QS',tuition:17000,living:16000,schol:'RA/TA stipends widely available'}
        ],
        'MBA':[
          {name:'Harvard Business School',city:'Boston, MA',rank:'#5 FT MBA',tuition:73440,living:30000,schol:'Need-based; no merit awards'},
          {name:'Wharton (Univ. of Penn)',city:'Philadelphia, PA',rank:'#3 FT MBA',tuition:83286,living:28000,schol:'Wharton Fellowship (need-based)'},
          {name:'Chicago Booth',city:'Chicago, IL',rank:'#2 FT MBA',tuition:79548,living:26000,schol:'Forgivable Loan Program'},
          {name:'Kellogg (Northwestern)',city:'Evanston, IL',rank:'#9 FT MBA',tuition:80199,living:24000,schol:'Kellogg Merit Fellowships'},
          {name:'MIT Sloan',city:'Cambridge, MA',rank:'#6 FT MBA',tuition:84000,living:28000,schol:'Sloan Fellowship (partial)'},
          {name:'Haas (UC Berkeley)',city:'Berkeley, CA',rank:'#7 FT MBA',tuition:67396,living:24000,schol:'Haas Merit Scholarships'}
        ],
        'MBBS / MD':[
          {name:'Harvard Medical School',city:'Boston, MA',rank:'#1 Med',tuition:68370,living:30000,schol:'Need-based aid; limited for intl'},
          {name:'Johns Hopkins School of Med.',city:'Baltimore, MD',rank:'#2 Med',tuition:63825,living:26000,schol:'Need-blind; limited intl seats'},
          {name:'Mayo Clinic Sch. of Medicine',city:'Rochester, MN',rank:'#1 US News',tuition:58800,living:22000,schol:'Fully funded MD program'},
          {name:'UCSF School of Medicine',city:'San Francisco, CA',rank:'#3 US News',tuition:38000,living:28000,schol:'Needs-based grants available'},
          {name:'Columbia Vagelos P&S',city:'New York, NY',rank:'Top 5 Med',tuition:72000,living:30000,schol:'Full cost of attendance grants'},
          {name:'Yale School of Medicine',city:'New Haven, CT',rank:'Top 10 Med',tuition:65430,living:28000,schol:'Need-based scholarships'}
        ],
        'PhD':[
          {name:'MIT',city:'Cambridge, MA',rank:'#1 QS',tuition:0,living:21000,schol:'Full tuition waiver + ~$38K stipend'},
          {name:'Stanford University',city:'Palo Alto, CA',rank:'#5 QS',tuition:0,living:22000,schol:'Full funding + ~$40K stipend'},
          {name:'Caltech',city:'Pasadena, CA',rank:'#6 QS',tuition:0,living:22000,schol:'Full funding + ~$38K stipend'},
          {name:'Princeton University',city:'Princeton, NJ',rank:'#13 QS',tuition:0,living:20000,schol:'Full tuition + $35K/yr stipend'},
          {name:'Univ. of Chicago',city:'Chicago, IL',rank:'#10 QS',tuition:0,living:24000,schol:'Full funding + $33K/yr stipend'},
          {name:'UC Berkeley',city:'Berkeley, CA',rank:'#32 QS',tuition:0,living:28000,schol:'Full funding + $32K/yr stipend'}
        ]
      }},
    UK:{name:'United Kingdom',flag:'🇬🇧',fi:'gb',cur:'GBP',inrRate:107.5,edInflation:4,
      courses:{
        'UG (3yr)':{dur:3,tuition:[22000,38000],living:[12000,18000]},
        'MSc (1yr)':{dur:1,tuition:[22000,40000],living:[13000,18000]},
        'MBA':{dur:1,tuition:[35000,95000],living:[15000,20000]},
        'MBBS (5yr)':{dur:5,tuition:[25000,38000],living:[12000,16000]},
        'PhD':{dur:3,tuition:[18000,28000],living:[13000,17000]}
      },
      unis:{
        'UG (3yr)':[
          {name:'University of Oxford',city:'Oxford',rank:'#3 QS',tuition:32000,living:16000,schol:'Clarendon Scholarship (full)'},
          {name:'University of Cambridge',city:'Cambridge',rank:'#5 QS',tuition:35000,living:15000,schol:'Cambridge Commonwealth Trust'},
          {name:'Imperial College London',city:'London',rank:'#8 QS',tuition:35000,living:18000,schol:'President Scholarship (partial)'},
          {name:'UCL',city:'London',rank:'#9 QS',tuition:30000,living:18000,schol:'UCL Global Scholarships'},
          {name:'University of Edinburgh',city:'Edinburgh',rank:'#27 QS',tuition:24000,living:13000,schol:'Global Scholarship Programme'},
          {name:'University of Manchester',city:'Manchester',rank:'#32 QS',tuition:22000,living:12000,schol:'Global Future Leaders'}
        ],
        'MSc (1yr)':[
          {name:'Imperial College London',city:'London',rank:'#8 QS',tuition:36000,living:18000,schol:'President MSc Scholarship'},
          {name:'UCL',city:'London',rank:'#9 QS',tuition:32000,living:18000,schol:'Denys Holland Scholarship'},
          {name:'University of Cambridge',city:'Cambridge',rank:'#5 QS',tuition:33000,living:15000,schol:'Gates Cambridge (full)'},
          {name:'University of Edinburgh',city:'Edinburgh',rank:'#27 QS',tuition:26000,living:13000,schol:'Principal Career Dev. Scholarship'},
          {name:'Univ. of Southampton',city:'Southampton',rank:'#100 QS',tuition:22000,living:12000,schol:'Vice-Chancellor Scholarship'},
          {name:'University of Bristol',city:'Bristol',rank:'#61 QS',tuition:23000,living:12000,schol:'Think Big Postgraduate Award'}
        ],
        'MBA':[
          {name:'London Business School',city:'London',rank:'#7 FT MBA',tuition:62000,living:24000,schol:'Merit & need-based awards'},
          {name:'Said Business School (Oxford)',city:'Oxford',rank:'#10 FT MBA',tuition:56000,living:18000,schol:'Skoll Scholarship (full)'},
          {name:'Cambridge Judge Business School',city:'Cambridge',rank:'#16 FT MBA',tuition:62000,living:16000,schol:'Gates Cambridge Scholarship'},
          {name:'Warwick Business School',city:'Coventry',rank:'#22 FT MBA',tuition:40000,living:12000,schol:'WBS Scholarship — 20% off'},
          {name:'Imperial College Business School',city:'London',rank:'Top 30 FT',tuition:44000,living:18000,schol:'ICBS Full Scholarship'},
          {name:'Alliance Manchester BS',city:'Manchester',rank:'Top 40 FT',tuition:34000,living:12000,schol:'Dean Scholarship (30% off)'}
        ],
        'MBBS (5yr)':[
          {name:'University of Oxford',city:'Oxford',rank:'#3 QS Med',tuition:32000,living:16000,schol:'Weidenfeld-Hoffmann Scholarship'},
          {name:'University of Cambridge',city:'Cambridge',rank:'#5 QS Med',tuition:35000,living:15000,schol:'Cambridge Commonwealth Trust'},
          {name:'Imperial College London',city:'London',rank:'#8 QS Med',tuition:35000,living:18000,schol:'Intl Medical Scholarship'},
          {name:'UCL',city:'London',rank:'#9 QS Med',tuition:30000,living:18000,schol:'Global Excellence Scholarship'},
          {name:'University of Edinburgh',city:'Edinburgh',rank:'#27 QS Med',tuition:25000,living:13000,schol:'Intl Undergraduate Scholarship'},
          {name:"King's College London",city:'London',rank:'#40 QS Med',tuition:26000,living:18000,schol:"King's Intl Scholarship"}
        ],
        'PhD':[
          {name:'University of Oxford',city:'Oxford',rank:'#3 QS',tuition:26000,living:16000,schol:'Clarendon Fund (full cost)'},
          {name:'University of Cambridge',city:'Cambridge',rank:'#5 QS',tuition:26000,living:15000,schol:'Gates Cambridge (full cost)'},
          {name:'Imperial College London',city:'London',rank:'#8 QS',tuition:28000,living:18000,schol:'Schrödinger Scholarship'},
          {name:'UCL',city:'London',rank:'#9 QS',tuition:25000,living:18000,schol:'Overseas Research Scholarship'},
          {name:'University of Edinburgh',city:'Edinburgh',rank:'#27 QS',tuition:20000,living:13000,schol:'Edinburgh Global PhD Scholarship'},
          {name:'University of Manchester',city:'Manchester',rank:'#32 QS',tuition:19000,living:12000,schol:'President Doctoral Scholarship'}
        ]
      }},
    AUS:{name:'Australia',flag:'🇦🇺',fi:'au',cur:'AUD',inrRate:55.2,edInflation:4.5,
      courses:{
        'UG (3yr)':{dur:3,tuition:[32000,48000],living:[20000,28000]},
        'MS (2yr)':{dur:2,tuition:[34000,52000],living:[22000,30000]},
        'MBA':{dur:2,tuition:[38000,65000],living:[24000,30000]},
        'MBBS (5yr)':{dur:5,tuition:[56000,75000],living:[20000,28000]},
        'PhD':{dur:4,tuition:[0,5000],living:[22000,28000]}
      },
      unis:{
        'UG (3yr)':[
          {name:'Univ. of Melbourne',city:'Melbourne, VIC',rank:'#13 QS',tuition:44000,living:26000,schol:'Melbourne International Scholarship'},
          {name:'Univ. of Sydney',city:'Sydney, NSW',rank:'#18 QS',tuition:45000,living:28000,schol:'Sydney International Scholarship'},
          {name:'UNSW Sydney',city:'Sydney, NSW',rank:'#19 QS',tuition:44000,living:28000,schol:'UNSW Scientia Scholarship'},
          {name:'ANU',city:'Canberra, ACT',rank:'#30 QS',tuition:41000,living:22000,schol:'Chancellor Excellence Scholarship'},
          {name:'Monash University',city:'Melbourne, VIC',rank:'#42 QS',tuition:38000,living:24000,schol:'Monash International Merit'},
          {name:'Univ. of Queensland',city:'Brisbane, QLD',rank:'#40 QS',tuition:36000,living:21000,schol:'UQ Excellence Scholarship'}
        ],
        'MS (2yr)':[
          {name:'Univ. of Melbourne',city:'Melbourne, VIC',rank:'#13 QS',tuition:48000,living:26000,schol:'Melbourne Research Scholarship (PhD+MS)'},
          {name:'UNSW Sydney',city:'Sydney, NSW',rank:'#19 QS',tuition:46000,living:28000,schol:'UNSW Scientia (research pathway)'},
          {name:'ANU',city:'Canberra, ACT',rank:'#30 QS',tuition:44000,living:22000,schol:'ANU Vice-Chancellor Scholarship'},
          {name:'Univ. of Sydney',city:'Sydney, NSW',rank:'#18 QS',tuition:48000,living:28000,schol:'Sydney Achievers Scholarship'},
          {name:'Monash University',city:'Melbourne, VIC',rank:'#42 QS',tuition:40000,living:24000,schol:'Monash Graduate Scholarship'},
          {name:'Univ. of Queensland',city:'Brisbane, QLD',rank:'#40 QS',tuition:40000,living:21000,schol:'UQ Graduate Scholarship'}
        ],
        'MBA':[
          {name:'Melbourne Business School',city:'Melbourne, VIC',rank:'#51 FT MBA',tuition:62000,living:28000,schol:'MBS Merit Scholarship'},
          {name:'AGSM @ UNSW Business',city:'Sydney, NSW',rank:'Top 75 FT',tuition:55000,living:28000,schol:'AGSM Scholarship (partial)'},
          {name:'Macquarie Graduate School',city:'Sydney, NSW',rank:'Top 100 FT',tuition:45000,living:26000,schol:'MGSM Scholarship (20% off)'},
          {name:'QUT Business School',city:'Brisbane, QLD',rank:'Top 150 FT',tuition:38000,living:21000,schol:'QUT Postgraduate Excellence'},
          {name:'Deakin Business School',city:'Melbourne, VIC',rank:'Top 150 FT',tuition:36000,living:22000,schol:'Deakin Vice-Chancellor Award'},
          {name:'Bond Business School',city:'Gold Coast, QLD',rank:'Top 200 FT',tuition:40000,living:20000,schol:'Bond University Scholarship'}
        ],
        'MBBS (5yr)':[
          {name:'Univ. of Melbourne',city:'Melbourne, VIC',rank:'#13 QS',tuition:70000,living:26000,schol:'Melbourne Medical Scholarship'},
          {name:'Univ. of Sydney',city:'Sydney, NSW',rank:'#18 QS',tuition:72000,living:28000,schol:'Sydney Merit Award'},
          {name:'Monash University',city:'Melbourne, VIC',rank:'#42 QS',tuition:65000,living:24000,schol:'Monash Medical Excellence Award'},
          {name:'ANU Medical School',city:'Canberra, ACT',rank:'#30 QS',tuition:62000,living:22000,schol:'ANU Medical Scholarship'},
          {name:'Univ. of Queensland',city:'Brisbane, QLD',rank:'#40 QS',tuition:58000,living:21000,schol:'UQ Medical Scholarship'},
          {name:'Bond University',city:'Gold Coast, QLD',rank:'Accredited',tuition:56000,living:20000,schol:'Bond Health Sciences Scholarship'}
        ],
        'PhD':[
          {name:'Univ. of Melbourne',city:'Melbourne, VIC',rank:'#13 QS',tuition:0,living:26000,schol:'Full tuition waiver + AUD 32K/yr stipend'},
          {name:'ANU',city:'Canberra, ACT',rank:'#30 QS',tuition:0,living:22000,schol:'Full tuition waiver + AUD 30K/yr stipend'},
          {name:'Univ. of Sydney',city:'Sydney, NSW',rank:'#18 QS',tuition:0,living:28000,schol:'RTP Scholarship (full funding)'},
          {name:'UNSW Sydney',city:'Sydney, NSW',rank:'#19 QS',tuition:0,living:28000,schol:'RTP + UNSW Tuition Fee Scholarship'},
          {name:'Monash University',city:'Melbourne, VIC',rank:'#42 QS',tuition:0,living:24000,schol:'Monash Graduate Scholarship (full)'},
          {name:'Univ. of Queensland',city:'Brisbane, QLD',rank:'#40 QS',tuition:0,living:21000,schol:'RTP Scholarship — stipend + fees'}
        ]
      }},
    CAN:{name:'Canada',flag:'🇨🇦',fi:'ca',cur:'CAD',inrRate:62.3,edInflation:4,
      courses:{
        'UG (4yr)':{dur:4,tuition:[28000,44000],living:[16000,24000]},
        'MS (2yr)':{dur:2,tuition:[18000,38000],living:[18000,24000]},
        'MBA':{dur:2,tuition:[38000,60000],living:[20000,26000]},
        'MBBS/MD':{dur:4,tuition:[30000,50000],living:[18000,24000]},
        'PhD':{dur:4,tuition:[0,10000],living:[18000,24000]}
      },
      unis:{
        'UG (4yr)':[
          {name:'Univ. of Toronto',city:'Toronto, ON',rank:'#25 QS',tuition:44000,living:22000,schol:'Lester B. Pearson Scholarship (full)'},
          {name:'UBC',city:'Vancouver, BC',rank:'#34 QS',tuition:38000,living:24000,schol:'Intl Leader of Tomorrow Award'},
          {name:'McGill University',city:'Montreal, QC',rank:'#46 QS',tuition:28000,living:16000,schol:'McGill Entrance Scholarship'},
          {name:'Univ. of Waterloo',city:'Waterloo, ON',rank:'#112 QS',tuition:38000,living:18000,schol:'Pres. Intl Experience Award'},
          {name:'Univ. of Alberta',city:'Edmonton, AB',rank:'#111 QS',tuition:28000,living:16000,schol:'Intl Entrance Scholarship'},
          {name:'Queen University',city:'Kingston, ON',rank:'#209 QS',tuition:32000,living:18000,schol:'Chancellor Scholarship'}
        ],
        'MS (2yr)':[
          {name:'Univ. of Toronto',city:'Toronto, ON',rank:'#25 QS',tuition:28000,living:22000,schol:'Fellowship + TA/RA positions'},
          {name:'UBC',city:'Vancouver, BC',rank:'#34 QS',tuition:24000,living:24000,schol:'Four Year Doctoral Fellowship'},
          {name:'Univ. of Waterloo (CS/Eng)',city:'Waterloo, ON',rank:'#112 QS',tuition:22000,living:18000,schol:'Waterloo Graduate Scholarship'},
          {name:'McGill University',city:'Montreal, QC',rank:'#46 QS',tuition:20000,living:16000,schol:'FRQNT/NSERC scholarships'},
          {name:'Univ. of Alberta',city:'Edmonton, AB',rank:'#111 QS',tuition:18000,living:16000,schol:'Alberta Graduate Excellence Scholarship'},
          {name:'Simon Fraser Univ.',city:'Vancouver, BC',rank:'#308 QS',tuition:14000,living:22000,schol:'SFU Graduate Fellowship'}
        ],
        'MBA':[
          {name:'Rotman (Univ. of Toronto)',city:'Toronto, ON',rank:'#41 FT MBA',tuition:58000,living:22000,schol:'Rotman Excellence Scholarship'},
          {name:'Sauder (UBC)',city:'Vancouver, BC',rank:'#55 FT MBA',tuition:47000,living:24000,schol:'Sauder MBA Scholarship'},
          {name:'Ivey (Western University)',city:'London, ON',rank:'#65 FT MBA',tuition:48000,living:16000,schol:'Ivey Emerging Leaders Award'},
          {name:'Smith (Queen University)',city:'Kingston, ON',rank:'#78 FT MBA',tuition:36000,living:16000,schol:'Smith MBA Scholarship'},
          {name:'HEC Montreal',city:'Montreal, QC',rank:'Top 100 FT',tuition:28000,living:16000,schol:'HEC Excellence Scholarship'},
          {name:'Schulich (York University)',city:'Toronto, ON',rank:'Top 75 FT',tuition:55000,living:22000,schol:'Schulich Leaders Scholarship'}
        ],
        'MBBS/MD':[
          {name:'Univ. of Toronto',city:'Toronto, ON',rank:'#25 QS Med',tuition:40000,living:22000,schol:'Intl Student Award (limited)'},
          {name:'McGill University',city:'Montreal, QC',rank:'#46 QS Med',tuition:30000,living:16000,schol:'McCall MacBain Scholarship'},
          {name:'UBC Faculty of Medicine',city:'Vancouver, BC',rank:'#34 QS Med',tuition:35000,living:24000,schol:'Need-based award only'},
          {name:'McMaster (PBL Method)',city:'Hamilton, ON',rank:'#189 QS Med',tuition:32000,living:18000,schol:'McMaster Medical Award'},
          {name:'Western University',city:'London, ON',rank:'#170 QS Med',tuition:32000,living:16000,schol:'Western Scholarship of Distinction'},
          {name:"Queen's University",city:'Kingston, ON',rank:'#209 QS Med',tuition:28000,living:16000,schol:"Queen's Health Sciences Award"}
        ],
        'PhD':[
          {name:'Univ. of Toronto',city:'Toronto, ON',rank:'#25 QS',tuition:0,living:22000,schol:'Full funding + CAD 27K/yr stipend'},
          {name:'UBC',city:'Vancouver, BC',rank:'#34 QS',tuition:0,living:24000,schol:'Full funding + CAD 26K/yr stipend'},
          {name:'McGill University',city:'Montreal, QC',rank:'#46 QS',tuition:0,living:16000,schol:'FRQNT Doctoral (full + stipend)'},
          {name:'Univ. of Waterloo',city:'Waterloo, ON',rank:'#112 QS',tuition:0,living:18000,schol:'Graduate Research Studentship'},
          {name:'Univ. of Alberta',city:'Edmonton, AB',rank:'#111 QS',tuition:0,living:16000,schol:'Alberta Innovates Scholarship'},
          {name:'McMaster University',city:'Hamilton, ON',rank:'#189 QS',tuition:0,living:18000,schol:'Vanier Canada Graduate Scholarship'}
        ]
      }},
    SGP:{name:'Singapore',flag:'🇸🇬',fi:'sg',cur:'SGD',inrRate:63.7,edInflation:3.5,
      courses:{
        'UG (4yr)':{dur:4,tuition:[28000,38000],living:[16000,22000]},
        'MS (1-2yr)':{dur:2,tuition:[30000,48000],living:[18000,24000]},
        'MBA':{dur:1,tuition:[60000,80000],living:[20000,26000]},
        'PhD':{dur:4,tuition:[0,8000],living:[18000,24000]}
      },
      unis:{
        'UG (4yr)':[
          {name:'NUS',city:'Singapore',rank:'#8 QS',tuition:34400,living:20000,schol:'ASEAN Undergraduate Scholarship (full)'},
          {name:'NTU',city:'Singapore',rank:'#15 QS',tuition:32000,living:19000,schol:'Nanyang Scholarship (full)'},
          {name:'SMU',city:'Singapore',rank:'#500 QS',tuition:30000,living:20000,schol:'SMU Merit Scholarship'},
          {name:'SUTD',city:'Singapore',rank:'Specialty',tuition:28000,living:18000,schol:'SUTD Merit Award (40% off)'}
        ],
        'MS (1-2yr)':[
          {name:'NUS School of Computing',city:'Singapore',rank:'#8 QS',tuition:40000,living:20000,schol:'NUS Graduate Scholarship'},
          {name:'NTU SCSE / MAE',city:'Singapore',rank:'#15 QS',tuition:36000,living:19000,schol:'Nanyang President Graduate Scholarship'},
          {name:'NUS Business Analytics',city:'Singapore',rank:'#8 QS',tuition:44000,living:20000,schol:'Limited merit scholarships'},
          {name:'SMU Postgraduate',city:'Singapore',rank:'#500 QS',tuition:30000,living:20000,schol:'SMU Postgraduate Scholarship'}
        ],
        'MBA':[
          {name:'NUS Business School (MBA)',city:'Singapore',rank:'#22 FT MBA',tuition:68000,living:22000,schol:'MBA Merit Scholarship'},
          {name:'NTU Nanyang Business School',city:'Singapore',rank:'#38 FT MBA',tuition:62000,living:20000,schol:'NTU MBA Scholarship'},
          {name:'SMU Lee Kong Chian School',city:'Singapore',rank:'Top 100 FT',tuition:60000,living:20000,schol:'SMU MBA Scholarship'},
          {name:'INSEAD (Asia Campus)',city:'Singapore',rank:'#3 FT MBA',tuition:90000,living:24000,schol:'INSEAD Scholarship (competitive)'}
        ],
        'PhD':[
          {name:'NUS',city:'Singapore',rank:'#8 QS',tuition:0,living:20000,schol:'Full tuition + SGD 24K/yr stipend'},
          {name:'NTU',city:'Singapore',rank:'#15 QS',tuition:0,living:19000,schol:'Full tuition + SGD 24K/yr stipend'},
          {name:'SMU',city:'Singapore',rank:'#500 QS',tuition:0,living:20000,schol:'SMU PhD Fellowship (partial)'},
          {name:'SUTD',city:'Singapore',rank:'Specialty',tuition:0,living:18000,schol:'SUTD Research Scholarship'}
        ]
      }},
    GER:{name:'Germany',flag:'🇩🇪',fi:'de',cur:'EUR',inrRate:91.5,edInflation:3,
      courses:{
        'UG (3yr)':{dur:3,tuition:[500,3000],living:[10000,14000]},
        'MS (2yr)':{dur:2,tuition:[500,5000],living:[10000,14000]},
        'MBA':{dur:2,tuition:[15000,35000],living:[11000,15000]},
        'Medicine (6yr)':{dur:6,tuition:[500,3000],living:[10000,14000]},
        'PhD':{dur:3,tuition:[0,1500],living:[10000,14000]}
      },
      unis:{
        'UG (3yr)':[
          {name:'TU Munich (TUM)',city:'Munich',rank:'#37 QS',tuition:144,living:12000,schol:'Nearly free — admin fee only'},
          {name:'LMU Munich',city:'Munich',rank:'#59 QS',tuition:144,living:12000,schol:'DAAD Scholarship available'},
          {name:'Heidelberg University',city:'Heidelberg',rank:'#87 QS',tuition:1500,living:11000,schol:'Heidelberg Excellence Scholarship'},
          {name:'RWTH Aachen',city:'Aachen',rank:'#106 QS',tuition:650,living:10000,schol:'DAAD — up to €1,200/month'},
          {name:'TU Berlin',city:'Berlin',rank:'#154 QS',tuition:307,living:12000,schol:'Deutschlandstipendium'},
          {name:'Freiburg University',city:'Freiburg',rank:'#172 QS',tuition:1500,living:10000,schol:'Baden-Württemberg Scholarship'}
        ],
        'MS (2yr)':[
          {name:'TU Munich (TUM)',city:'Munich',rank:'#37 QS',tuition:144,living:12000,schol:'TUM Graduate School + DAAD'},
          {name:'RWTH Aachen',city:'Aachen',rank:'#106 QS',tuition:2000,living:10000,schol:'RWTH Excellence Scholarship'},
          {name:'KIT Karlsruhe',city:'Karlsruhe',rank:'#131 QS',tuition:1500,living:11000,schol:'KIT Graduate Scholarship'},
          {name:'TU Berlin',city:'Berlin',rank:'#154 QS',tuition:307,living:12000,schol:'Deutschlandstipendium'},
          {name:'TU Dresden',city:'Dresden',rank:'#200 QS',tuition:600,living:10000,schol:'DAAD STIBET Scholarship'},
          {name:'Univ. of Stuttgart',city:'Stuttgart',rank:'#292 QS',tuition:1500,living:11000,schol:'Landesstipendium BW'}
        ],
        'MBA':[
          {name:'WHU Otto Beisheim',city:'Koblenz / Düsseldorf',rank:'#54 FT MBA',tuition:30000,living:12000,schol:'WHU Scholarship (competitive)'},
          {name:'Mannheim Business School',city:'Mannheim',rank:'#37 FT MBA',tuition:28000,living:10000,schol:'MBS Scholarship (partial)'},
          {name:'Frankfurt School of Finance',city:'Frankfurt',rank:'Top 50 FT',tuition:32000,living:14000,schol:'Frankfurt School Scholarship'},
          {name:'HHL Leipzig Grad School',city:'Leipzig',rank:'Top 75 FT',tuition:25000,living:10000,schol:'HHL Merit Scholarship'},
          {name:'ESMT Berlin',city:'Berlin',rank:'Top 75 FT',tuition:28000,living:12000,schol:'ESMT Scholarship (20% off)'},
          {name:'TUM School of Management',city:'Munich',rank:'Top 100 FT',tuition:15000,living:12000,schol:'TUM MBA Scholarship'}
        ],
        'Medicine (6yr)':[
          {name:'Heidelberg University',city:'Heidelberg',rank:'#87 QS',tuition:1500,living:11000,schol:'DAAD Medical Scholarship'},
          {name:'LMU Munich',city:'Munich',rank:'#59 QS',tuition:144,living:12000,schol:'Deutschlandstipendium'},
          {name:'TU Munich (TUM)',city:'Munich',rank:'#37 QS',tuition:144,living:12000,schol:'Freistaat Bayern Scholarship'},
          {name:'Charité Berlin',city:'Berlin',rank:'Top Medical DE',tuition:307,living:12000,schol:'Charité Foundation Scholarship'},
          {name:'Univ. Freiburg (Medicine)',city:'Freiburg',rank:'#172 QS',tuition:1500,living:10000,schol:'Baden-Württemberg Scholarship'},
          {name:'Univ. Hamburg-Eppendorf',city:'Hamburg',rank:'Top Medical DE',tuition:500,living:12000,schol:'Hamburg State Scholarship'}
        ],
        'PhD':[
          {name:'TU Munich (TUM)',city:'Munich',rank:'#37 QS',tuition:0,living:12000,schol:'Full funding + €2,400/month stipend'},
          {name:'LMU Munich',city:'Munich',rank:'#59 QS',tuition:0,living:12000,schol:'DAAD Research Grant (full)'},
          {name:'Heidelberg University',city:'Heidelberg',rank:'#87 QS',tuition:0,living:11000,schol:'Heidelberg Postdoctoral Fellowship'},
          {name:'RWTH Aachen',city:'Aachen',rank:'#106 QS',tuition:0,living:10000,schol:'RWTH Research Scholarship'},
          {name:'TU Berlin',city:'Berlin',rank:'#154 QS',tuition:0,living:12000,schol:'Einstein Foundation Fellowship'},
          {name:'Univ. of Bonn',city:'Bonn',rank:'#180 QS',tuition:0,living:11000,schol:'Hausdorff Center Scholarship'}
        ]
      }}
  };

  var _edCountry = 'USA';
  var _edCourse  = 'UG (4yr)';

  /* ── Helpers ─────────────────────────────────────────────── */
  function _edFmt(n, cur){ return cur+' '+Math.round(n).toLocaleString(); }
  function _edFmtINR(n, rate){ return '≈ ₹'+Math.round(n*rate/100000).toFixed(1)+'L'; }

  function _edCalcFV(todayCost, yearsAway, inflation){
    return todayCost * Math.pow(1 + inflation/100, yearsAway);
  }

  function _edMonthlyInvestment(futureAmount, yearsAway, annualReturn){
    var months = yearsAway * 12;
    var r = annualReturn / 100 / 12;
    if(r === 0) return futureAmount / months;
    return futureAmount * r / (Math.pow(1+r, months) - 1);
  }

  /* ── Render university table ─────────────────────────────── */
  function _edRenderTable(){
    var d = EDAB[_edCountry];
    if(!d) return;
    var c = d.courses[_edCourse] || Object.values(d.courses)[0];
    var minFee = c.tuition[0], maxFee = c.tuition[1];
    var minLiv = c.living[0],  maxLiv = c.living[1];
    var dur    = c.dur;
    var rate   = d.inrRate;

    /* Cost overview cards */
    var totalLow  = (minFee + minLiv) * dur;
    var totalHigh = (maxFee + maxLiv) * dur;
    var s = document.getElementById('edab-cost-tuition'); if(s) s.textContent = _edFmt(minFee,d.cur)+'–'+_edFmt(maxFee,d.cur)+'/yr';
    var l = document.getElementById('edab-cost-living');  if(l) l.textContent = _edFmt(minLiv,d.cur)+'–'+_edFmt(maxLiv,d.cur)+'/yr';
    var t = document.getElementById('edab-cost-total');   if(t) t.textContent = _edFmt(totalLow,d.cur)+'–'+_edFmt(totalHigh,d.cur);
    var r = document.getElementById('edab-cost-inr');     if(r) r.textContent = '₹'+Math.round(totalLow*rate/100000).toFixed(0)+'L–₹'+Math.round(totalHigh*rate/100000).toFixed(0)+'L';

    /* Course-specific university table */
    var tbody = document.getElementById('edab-tbody');
    if(!tbody) return;
    /* Pick unis for current course; fall back to first available */
    var uniMap = d.unis;
    var uniList = uniMap[_edCourse] || uniMap[Object.keys(uniMap)[0]] || [];
    var rows = '';
    uniList.forEach(function(u){
      var totalCost = (u.tuition + u.living) * dur;
      rows += '<tr>'
        +'<td><div class="edab-uni-name">'+u.name+'</div><div class="edab-uni-city">'+u.city+'</div></td>'
        +'<td><span class="edab-rank-badge">'+u.rank+'</span></td>'
        +'<td class="edab-fee-hi">'+_edFmt(u.tuition,d.cur)+'<span class="edab-fee-inr">'+_edFmtINR(u.tuition,rate)+'/yr</span></td>'
        +'<td>'+_edFmt(u.living,d.cur)+'<span class="edab-fee-inr">'+_edFmtINR(u.living,rate)+'/yr</span></td>'
        +'<td><span class="edab-total-badge">'+_edFmt(totalCost,d.cur)+'</span><span class="edab-fee-inr">'+_edFmtINR(totalCost,rate)+'</span></td>'
        +'<td style="font-size:.72rem;color:var(--muted)">'+u.schol+'</td>'
        +'</tr>';
    });
    tbody.innerHTML = rows || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">No data for this combination</td></tr>';

    /* Update duration sub-label */
    var dl = document.getElementById('edab-dur-lbl');
    if(dl) dl.textContent = dur+'-year programme · '+d.cur;
  }

  /* ── Savings calculator ──────────────────────────────────── */
  window.edabCalc = function(){
    var d = EDAB[_edCountry];
    if(!d) return;
    var c = d.courses[_edCourse] || Object.values(d.courses)[0];

    var childAge = parseInt(document.getElementById('edab-age').value) || 0;
    var startAge = parseInt(document.getElementById('edab-start-age').value) || 18;
    var yearsAway = Math.max(1, startAge - childAge);
    var annualReturn = parseFloat(document.getElementById('edab-return').value) || 10;

    var tuitionAvg = (c.tuition[0] + c.tuition[1]) / 2;
    var livingAvg  = (c.living[0]  + c.living[1])  / 2;
    var annualCostNow = (tuitionAvg + livingAvg) * d.inrRate; /* in INR */
    var totalCostNow  = annualCostNow * c.dur;

    /* Inflate by education inflation + currency depreciation (3% INR/yr) */
    var effectiveInflation = d.edInflation + 3;
    var futureTotalINR = _edCalcFV(totalCostNow, yearsAway, effectiveInflation);

    /* Monthly SIP needed */
    var monthly = _edMonthlyInvestment(futureTotalINR, yearsAway, annualReturn);

    var fv = document.getElementById('edab-res-future');
    var sm = document.getElementById('edab-res-sip');
    var ti = document.getElementById('edab-res-today');
    if(fv) fv.textContent = '₹'+Math.round(futureTotalINR/100000).toFixed(1)+'L';
    if(sm) sm.textContent = '₹'+Math.round(monthly/1000).toFixed(1)+'K/mo';
    if(ti) ti.textContent = '₹'+Math.round(totalCostNow/100000).toFixed(1)+'L';

    var note = document.getElementById('edab-infl-note');
    if(note) note.textContent = 'Assuming '+d.edInflation+'% education inflation + 3% INR depreciation/yr = '+effectiveInflation+'% effective inflation. SIP return: '+annualReturn+'% p.a. Starting in '+yearsAway+' years when child is '+startAge+'.';
  };

  /* ── Public: set country ─────────────────────────────────── */
  window.edabSetCountry = function(code, el){
    _edCountry = code;
    document.querySelectorAll('.edab-country-card').forEach(function(c){ c.classList.remove('edab-active'); });
    if(el) el.classList.add('edab-active');

    /* Reset course to first available */
    var d = EDAB[code];
    if(d){
      var courses = Object.keys(d.courses);
      _edCourse = courses[0];
      /* Update course buttons */
      var row = document.getElementById('edab-course-row');
      if(row){
        row.innerHTML = courses.map(function(k,i){
          return '<button class="edab-course-btn'+(i===0?' edab-active':'')+'" onclick="edabSetCourse(\''+k+'\',this)">'+k+'</button>';
        }).join('');
      }
      /* Update currency label */
      var cl = document.getElementById('edab-cur-lbl');
      if(cl) cl.textContent = 'Costs in '+d.cur+' · 1 '+d.cur+' ≈ ₹'+d.inrRate;
    }
    _edRenderTable();
    window.edabCalc();
  };

  /* ── Public: set course ──────────────────────────────────── */
  window.edabSetCourse = function(course, el){
    _edCourse = course;
    document.querySelectorAll('.edab-course-btn').forEach(function(b){ b.classList.remove('edab-active'); });
    if(el) el.classList.add('edab-active');
    _edRenderTable();
    window.edabCalc();
  };

  /* ── Init ─────────────────────────────────────────────────── */
  window.initEdAbroad = function(){
    edabSetCountry('USA', document.querySelector('.edab-country-card'));
  };

})();

/* ══════════════════════════════════════════════════════════════════════════
   EDUCATION TAB — EXTRA TOOLS  v8.7
   1. Country Comparison
   2. Degree ROI / Payback
   3. Education Loan EMI
   4. Scholarship Finder
══════════════════════════════════════════════════════════════════════════ */

(function(){

/* ── DATA ───────────────────────────────────────────────────────────────── */

var ED_DATA={
  USA:{name:'United States',cur:'USD',sym:'$',inrRate:84.5,
    courses:{
      'UG (4yr)':{tuition:[32000,90000],living:[15000,22000],yrs:4},
      'MS / MTech':{tuition:[28000,70000],living:[14000,20000],yrs:2},
      'MBA':{tuition:[55000,120000],living:[18000,28000],yrs:2},
      'PhD':{tuition:[0,10000],living:[20000,28000],yrs:5},
      'MBBS / MD':{tuition:[40000,85000],living:[16000,24000],yrs:4}
    },
    workRights:'OPT 1-3 yrs post-study',
    prPath:'H-1B lottery, EB-2/3 green card (5-10 yrs)',
    salaries:{
      tech:{'UG (4yr)':[65000,90000],'MS / MTech':[105000,140000],'MBA':[120000,160000],'PhD':[90000,120000],'MBBS / MD':[60000,80000]},
      business:{'UG (4yr)':[52000,72000],'MS / MTech':[80000,110000],'MBA':[130000,180000],'PhD':[75000,100000],'MBBS / MD':[55000,70000]},
      health:{'UG (4yr)':[50000,70000],'MS / MTech':[85000,110000],'MBA':[90000,120000],'PhD':[70000,95000],'MBBS / MD':[70000,90000]},
      arts:{'UG (4yr)':[38000,55000],'MS / MTech':[55000,75000],'MBA':[70000,100000],'PhD':[50000,70000],'MBBS / MD':[45000,60000]}
    }
  },
  UK:{name:'United Kingdom',cur:'GBP',sym:'£',inrRate:108,
    courses:{
      'UG (4yr)':{tuition:[20000,42000],living:[12000,18000],yrs:3},
      'MS / MTech':{tuition:[18000,45000],living:[12000,18000],yrs:1},
      'MBA':{tuition:[35000,95000],living:[15000,22000],yrs:1},
      'PhD':{tuition:[5000,15000],living:[14000,20000],yrs:3},
      'MBBS / MD':{tuition:[25000,50000],living:[13000,18000],yrs:5}
    },
    workRights:'Graduate visa 2-3 yrs post-study',
    prPath:'Skilled Worker visa, ILR after 5 yrs',
    salaries:{
      tech:{'UG (4yr)':[32000,45000],'MS / MTech':[42000,65000],'MBA':[60000,90000],'PhD':[45000,65000],'MBBS / MD':[35000,50000]},
      business:{'UG (4yr)':[28000,40000],'MS / MTech':[38000,55000],'MBA':[65000,100000],'PhD':[40000,60000],'MBBS / MD':[30000,45000]},
      health:{'UG (4yr)':[27000,38000],'MS / MTech':[38000,52000],'MBA':[45000,70000],'PhD':[38000,55000],'MBBS / MD':[32000,52000]},
      arts:{'UG (4yr)':[22000,32000],'MS / MTech':[30000,45000],'MBA':[40000,65000],'PhD':[28000,42000],'MBBS / MD':[22000,32000]}
    }
  },
  AUS:{name:'Australia',cur:'AUD',sym:'A$',inrRate:55,
    courses:{
      'UG (4yr)':{tuition:[32000,65000],living:[18000,28000],yrs:3},
      'MS / MTech':{tuition:[32000,60000],living:[18000,26000],yrs:2},
      'MBA':{tuition:[40000,80000],living:[20000,30000],yrs:2},
      'PhD':{tuition:[20000,35000],living:[22000,30000],yrs:3},
      'MBBS / MD':{tuition:[40000,70000],living:[20000,28000],yrs:4}
    },
    workRights:'485 Temp Graduate visa 2-4 yrs',
    prPath:'Skilled Nominated/Independent visa (PR in 3-4 yrs)',
    salaries:{
      tech:{'UG (4yr)':[75000,95000],'MS / MTech':[95000,130000],'MBA':[105000,145000],'PhD':[85000,115000],'MBBS / MD':[80000,110000]},
      business:{'UG (4yr)':[62000,82000],'MS / MTech':[78000,105000],'MBA':[110000,150000],'PhD':[70000,95000],'MBBS / MD':[65000,90000]},
      health:{'UG (4yr)':[60000,80000],'MS / MTech':[80000,105000],'MBA':[90000,125000],'PhD':[75000,100000],'MBBS / MD':[85000,115000]},
      arts:{'UG (4yr)':[50000,68000],'MS / MTech':[62000,82000],'MBA':[72000,100000],'PhD':[55000,75000],'MBBS / MD':[52000,70000]}
    }
  },
  CAN:{name:'Canada',cur:'CAD',sym:'C$',inrRate:62,
    courses:{
      'UG (4yr)':{tuition:[24000,55000],living:[12000,18000],yrs:4},
      'MS / MTech':{tuition:[18000,40000],living:[12000,18000],yrs:2},
      'MBA':{tuition:[30000,75000],living:[15000,22000],yrs:2},
      'PhD':{tuition:[6000,18000],living:[14000,20000],yrs:4},
      'MBBS / MD':{tuition:[30000,60000],living:[14000,20000],yrs:4}
    },
    workRights:'PGWP up to 3 yrs post-study',
    prPath:'Express Entry (fastest path, 6-12 months)',
    salaries:{
      tech:{'UG (4yr)':[65000,88000],'MS / MTech':[88000,120000],'MBA':[100000,138000],'PhD':[80000,108000],'MBBS / MD':[75000,100000]},
      business:{'UG (4yr)':[52000,72000],'MS / MTech':[70000,95000],'MBA':[105000,145000],'PhD':[65000,88000],'MBBS / MD':[60000,82000]},
      health:{'UG (4yr)':[52000,70000],'MS / MTech':[72000,95000],'MBA':[82000,112000],'PhD':[68000,92000],'MBBS / MD':[78000,105000]},
      arts:{'UG (4yr)':[42000,58000],'MS / MTech':[55000,75000],'MBA':[65000,90000],'PhD':[50000,68000],'MBBS / MD':[45000,62000]}
    }
  },
  SGP:{name:'Singapore',cur:'SGD',sym:'S$',inrRate:63,
    courses:{
      'UG (4yr)':{tuition:[28000,65000],living:[12000,18000],yrs:4},
      'MS / MTech':{tuition:[25000,55000],living:[12000,18000],yrs:1},
      'MBA':{tuition:[40000,90000],living:[15000,22000],yrs:1},
      'PhD':{tuition:[8000,20000],living:[14000,20000],yrs:4},
      'MBBS / MD':{tuition:[35000,70000],living:[14000,20000],yrs:5}
    },
    workRights:'Employment Pass (no cap)',
    prPath:'PR application after 2 yrs employment',
    salaries:{
      tech:{'UG (4yr)':[55000,75000],'MS / MTech':[75000,105000],'MBA':[95000,135000],'PhD':[72000,98000],'MBBS / MD':[65000,90000]},
      business:{'UG (4yr)':[48000,65000],'MS / MTech':[65000,88000],'MBA':[100000,145000],'PhD':[60000,82000],'MBBS / MD':[55000,78000]},
      health:{'UG (4yr)':[46000,62000],'MS / MTech':[65000,88000],'MBA':[78000,110000],'PhD':[62000,85000],'MBBS / MD':[68000,95000]},
      arts:{'UG (4yr)':[38000,52000],'MS / MTech':[50000,68000],'MBA':[65000,90000],'PhD':[45000,62000],'MBBS / MD':[40000,55000]}
    }
  },
  GER:{name:'Germany',cur:'EUR',sym:'€',inrRate:91,
    courses:{
      'UG (4yr)':{tuition:[500,3000],living:[10000,14000],yrs:3},
      'MS / MTech':{tuition:[500,3000],living:[10000,14000],yrs:2},
      'MBA':{tuition:[12000,30000],living:[10000,14000],yrs:2},
      'PhD':{tuition:[0,2000],living:[10000,14000],yrs:3},
      'MBBS / MD':{tuition:[500,3000],living:[10000,14000],yrs:6}
    },
    workRights:'Job seeker visa 18 months post-study',
    prPath:'Permanent residency after 5 yrs',
    salaries:{
      tech:{'UG (4yr)':[42000,58000],'MS / MTech':[58000,78000],'MBA':[68000,95000],'PhD':[55000,75000],'MBBS / MD':[50000,70000]},
      business:{'UG (4yr)':[36000,50000],'MS / MTech':[50000,68000],'MBA':[72000,100000],'PhD':[48000,65000],'MBBS / MD':[42000,60000]},
      health:{'UG (4yr)':[36000,48000],'MS / MTech':[50000,68000],'MBA':[60000,82000],'PhD':[48000,65000],'MBBS / MD':[55000,78000]},
      arts:{'UG (4yr)':[30000,42000],'MS / MTech':[40000,55000],'MBA':[50000,70000],'PhD':[38000,52000],'MBBS / MD':[35000,50000]}
    }
  }
};

var ED_LOANS=[
  {name:'SBI Student Loan',bank:'State Bank of India',rate:10.75,max:2000000,tenure:15,note:'No collateral up to ₹7.5L · Subsidy scheme for EWS'},
  {name:'HDFC Credila',bank:'HDFC Credila',rate:12.25,max:15000000,tenure:12,note:'Fastest processing · covers tuition + living + laptop'},
  {name:'Avanse Education Loans',bank:'Avanse',rate:11.75,max:7500000,tenure:12,note:'100% cost coverage · study abroad specialist'},
  {name:'ICICI Bank Education Loan',bank:'ICICI Bank',rate:11.25,max:5000000,tenure:10,note:'Online application · quick disbursals'},
  {name:'Axis Bank Education Loan',bank:'Axis Bank',rate:13.7,max:2000000,tenure:15,note:'No collateral up to ₹7.5L'}
];

var SCHOLARSHIPS=[
  {name:'Inlaks Shivdasani Foundation',amt:'Up to $100,000',country:'ALL',course:['MS / MTech','MBA','UG (4yr)'],deadline:'February',link:'https://inlaksfoundation.org',note:'One of India\'s most prestigious private scholarships'},
  {name:'JN Tata Endowment',amt:'₹10L–₹20L',country:'ALL',course:['MS / MTech','MBA','PhD'],deadline:'December',link:'https://www.jntataendowment.org',note:'Indian nationals pursuing higher education abroad'},
  {name:'Narotam Sekhsaria Foundation',amt:'₹12L–₹20L',country:'ALL',course:['MS / MTech','MBA','PhD'],deadline:'December',link:'https://www.nsfoundation.co.in',note:'Merit + need based; one of the largest private scholarships'},
  {name:'DAAD Scholarship (Germany)',amt:'€1,200/month stipend',country:'GER',course:['MS / MTech','PhD'],deadline:'October',link:'https://www.daad.de/en',note:'German Academic Exchange Service; top for research'},
  {name:'Commonwealth Scholarship (UK)',amt:'Full tuition + stipend',country:'UK',course:['MS / MTech','PhD'],deadline:'October',link:'https://cscuk.fcdo.gov.uk',note:'UK FCDO funded; highly competitive'},
  {name:'Australia Awards',amt:'Full scholarship',country:'AUS',course:['MS / MTech','UG (4yr)'],deadline:'April',link:'https://www.australiaawards.gov.au',note:'Australian Government; covers all costs'},
  {name:'Vanier Canada Graduate Scholarships',amt:'CAD 50,000/yr',country:'CAN',course:['PhD'],deadline:'November',link:'https://vanier.gc.ca',note:'Top Canadian PhD scholarship; 3 year award'},
  {name:'NUS Merit Scholarship (Singapore)',amt:'Full tuition + SGD 6,000 living',country:'SGP',course:['UG (4yr)','MS / MTech'],deadline:'January',link:'https://nus.edu.sg/oam/scholarships',note:'National University of Singapore merit award'},
  {name:'Gates Cambridge Scholarship',amt:'Full cost + stipend',country:'UK',course:['MS / MTech','PhD'],deadline:'December',link:'https://www.gatescambridge.org',note:'University of Cambridge only; extremely competitive'},
  {name:'Erasmus+ (Europe)',amt:'€500–€700/month',country:'GER',course:['MS / MTech','UG (4yr)'],deadline:'Varies',link:'https://erasmus-plus.ec.europa.eu',note:'EU exchange programme; partial funding'},
  {name:'Aga Khan Foundation International Scholarship',amt:'50% grant + 50% loan',country:'ALL',course:['MS / MTech','MBA'],deadline:'March',link:'https://www.akdn.org',note:'Need-based; exceptional academic merit required'},
  {name:'Rotary Foundation Global Grant',amt:'$30,000+',country:'ALL',course:['MS / MTech','UG (4yr)'],deadline:'Varies',link:'https://www.rotary.org/en/our-programs/scholarships',note:'Must align with Rotary\'s areas of focus'}
];

/* ── UTILITY ─────────────────────────────────────────────────────────────── */
function _edFmt(n,sym){return sym+(Math.round(n/1000))+'K';}
function _edFmtINR(n){
  if(n>=10000000) return '&#8377;'+(n/10000000).toFixed(1)+'Cr';
  if(n>=100000) return '&#8377;'+(n/100000).toFixed(1)+'L';
  return '&#8377;'+Math.round(n).toLocaleString();
}
function _edTotalCostINR(ctry,course){
  var d=ED_DATA[ctry];if(!d)return 0;
  var c=d.courses[course];if(!c)return 0;
  var tuAvg=(c.tuition[0]+c.tuition[1])/2;
  var livAvg=(c.living[0]+c.living[1])/2;
  return (tuAvg+livAvg)*c.yrs*d.inrRate;
}
function _edEmi(principal,annualRate,months){
  var r=annualRate/100/12;
  if(r===0) return principal/months;
  return principal*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1);
}

/* ── 1. COUNTRY COMPARISON ──────────────────────────────────────────────── */
window.edabCompare=function(){
  var a=document.getElementById('edab-cmp-a').value;
  var b=document.getElementById('edab-cmp-b').value;
  var course=document.getElementById('edab-cmp-course').value;
  var res=document.getElementById('edab-cmp-result');
  if(!res)return;
  if(a===b){res.innerHTML='<div class="edab-cmp-warn">Please select two different countries.</div>';return;}

  function colHTML(ctry,course,side){
    var d=ED_DATA[ctry];if(!d)return '';
    var c=d.courses[course]||d.courses['MS / MTech'];
    var tu=(c.tuition[0]+c.tuition[1])/2;
    var lv=(c.living[0]+c.living[1])/2;
    var tot=(tu+lv)*c.yrs;
    var totINR=tot*d.inrRate;
    return '<div class="edab-cmp-panel edab-cmp-'+side+'">'
      +'<div class="edab-cmp-ctry">'+d.name+'</div>'
      +'<div class="edab-cmp-row"><span>Tuition / yr</span><strong>'+_edFmt(tu,d.sym)+'</strong></div>'
      +'<div class="edab-cmp-row"><span>Living / yr</span><strong>'+_edFmt(lv,d.sym)+'</strong></div>'
      +'<div class="edab-cmp-row"><span>Duration</span><strong>'+c.yrs+' yrs</strong></div>'
      +'<div class="edab-cmp-row edab-cmp-total"><span>Total cost</span><strong>'+_edFmt(tot,d.sym)+'</strong></div>'
      +'<div class="edab-cmp-row edab-cmp-inr"><span>In INR</span><strong>'+_edFmtINR(totINR)+'</strong></div>'
      +'<div class="edab-cmp-row"><span>Work rights</span><span class="edab-cmp-info">'+d.workRights+'</span></div>'
      +'<div class="edab-cmp-row"><span>PR pathway</span><span class="edab-cmp-info">'+d.prPath+'</span></div>'
      +'</div>';
  }

  var da=ED_DATA[a],db=ED_DATA[b];
  var ca=da.courses[course]||da.courses['MS / MTech'];
  var cb=db.courses[course]||db.courses['MS / MTech'];
  var totA=((ca.tuition[0]+ca.tuition[1])/2+(ca.living[0]+ca.living[1])/2)*ca.yrs*da.inrRate;
  var totB=((cb.tuition[0]+cb.tuition[1])/2+(cb.living[0]+cb.living[1])/2)*cb.yrs*db.inrRate;
  var cheaper=totA<totB?da.name:db.name;
  var saving=Math.abs(totA-totB);
  var verdict='<div class="edab-cmp-verdict">&#128198; <strong>'+cheaper+'</strong> is cheaper by <strong>'+_edFmtINR(saving)+'</strong> for '+course+'</div>';

  res.innerHTML='<div class="edab-cmp-panels">'+colHTML(a,course,'left')+colHTML(b,course,'right')+'</div>'+verdict;
};

/* ── 2. DEGREE ROI / PAYBACK ─────────────────────────────────────────────── */
window.edabRoi=function(){
  var ctry=document.getElementById('edab-roi-country').value;
  var course=document.getElementById('edab-roi-course').value;
  var field=document.getElementById('edab-roi-field').value;
  var res=document.getElementById('edab-roi-result');
  if(!res)return;
  var d=ED_DATA[ctry];if(!d){res.innerHTML='';return;}
  var c=d.courses[course]||d.courses['MS / MTech'];
  var sal=d.salaries[field]&&d.salaries[field][course]?d.salaries[field][course]:[50000,80000];
  var tu=(c.tuition[0]+c.tuition[1])/2;
  var lv=(c.living[0]+c.living[1])/2;
  var totalFx=(tu+lv)*c.yrs;
  var totalINR=totalFx*d.inrRate;
  var salMid=(sal[0]+sal[1])/2;
  var salINR=salMid*d.inrRate;
  var annualINR=salINR*12;
  // Payback: assume 30% of annual income goes to repayment
  var repayINR=annualINR*0.30;
  var paybackYrs=(repayINR>0)?totalINR/repayINR:99;
  // 10yr wealth: cumulative salary - total cost
  var tenYrGross=annualINR*10;
  var netWealth=tenYrGross-totalINR;
  var pb=Math.ceil(paybackYrs);
  var pbColor=pb<=3?'var(--green)':pb<=6?'var(--amber)':'var(--red)';
  res.innerHTML='<div class="edab-roi-grid">'
    +'<div class="edab-roi-card"><div class="edab-roi-label">Total investment</div><div class="edab-roi-val">'+_edFmtINR(totalINR)+'</div><div class="edab-roi-sub">'+d.sym+Math.round(totalFx/1000)+'K total</div></div>'
    +'<div class="edab-roi-card"><div class="edab-roi-label">Avg starting salary</div><div class="edab-roi-val">'+d.sym+Math.round(salMid/1000)+'K/yr</div><div class="edab-roi-sub">'+_edFmtINR(salINR*12)+' p.a.</div></div>'
    +'<div class="edab-roi-card" style="border-color:'+pbColor+'"><div class="edab-roi-label">Payback period</div><div class="edab-roi-val" style="color:'+pbColor+'">'+pb+' yrs</div><div class="edab-roi-sub">at 30% income to repayment</div></div>'
    +'<div class="edab-roi-card" style="border-color:var(--green)"><div class="edab-roi-label">10-yr net earnings</div><div class="edab-roi-val" style="color:var(--green)">'+_edFmtINR(netWealth)+'</div><div class="edab-roi-sub">after recovering full cost</div></div>'
    +'</div>'
    +'<div class="edab-roi-range">Salary range: '+d.sym+sal[0].toLocaleString()+' – '+d.sym+sal[1].toLocaleString()+'/yr &nbsp;·&nbsp; Based on '+field.replace('tech','Tech/Engineering').replace('business','Business/Finance').replace('health','Healthcare').replace('arts','Arts/Humanities')+' roles in '+d.name+'</div>';
};

/* ── 3. EDUCATION LOAN EMI ───────────────────────────────────────────────── */
window.edabLoan=function(){
  var principal=parseFloat(document.getElementById('edab-loan-amt').value)||4000000;
  var tenure=parseInt(document.getElementById('edab-loan-tenure').value)||10;
  var morat=parseInt(document.getElementById('edab-loan-morat').value)||12;
  var res=document.getElementById('edab-loan-result');
  if(!res)return;
  var rows='';
  ED_LOANS.forEach(function(l){
    var emi=_edEmi(principal,l.rate,tenure*12);
    var totalRepay=emi*tenure*12;
    var totalInt=totalRepay-principal;
    rows+='<div class="edab-loan-card">'
      +'<div class="edab-loan-top">'
      +'<div><div class="edab-loan-name">'+l.name+'</div><div class="edab-loan-note">'+l.note+'</div></div>'
      +'<div class="edab-loan-rate">'+l.rate+'% p.a.</div>'
      +'</div>'
      +'<div class="edab-loan-nums">'
      +'<div class="edab-loan-num"><span>EMI / month</span><strong>'+_edFmtINR(emi)+'</strong></div>'
      +'<div class="edab-loan-num"><span>Total interest</span><strong style="color:var(--red)">'+_edFmtINR(totalInt)+'</strong></div>'
      +'<div class="edab-loan-num"><span>Total repayment</span><strong>'+_edFmtINR(totalRepay)+'</strong></div>'
      +'<div class="edab-loan-num"><span>Moratorium</span><strong>'+morat+' months</strong></div>'
      +'</div>'
      +'</div>';
  });
  res.innerHTML=rows+'<div class="edab-loan-tip">&#128161; Section 80E: Education loan interest is fully deductible from India taxable income for 8 years — saving you tax if you have India earnings.</div>';
};

/* ── 4. SCHOLARSHIP FINDER ───────────────────────────────────────────────── */
window.edabScholar=function(){
  var ctry=document.getElementById('edab-sch-country').value;
  var course=document.getElementById('edab-sch-course').value;
  var res=document.getElementById('edab-sch-result');
  if(!res)return;
  var filtered=SCHOLARSHIPS.filter(function(s){
    var cMatch=ctry==='ALL'||s.country==='ALL'||s.country===ctry;
    var crMatch=course==='ALL'||s.course.indexOf(course)>=0;
    return cMatch&&crMatch;
  });
  if(!filtered.length){res.innerHTML='<div class="edab-sch-empty">No scholarships match this filter. Try "All Countries".</div>';return;}
  var rows=filtered.map(function(s){
    return '<div class="edab-sch-card">'
      +'<div class="edab-sch-top">'
      +'<div class="edab-sch-name">'+s.name+'</div>'
      +'<div class="edab-sch-amt">'+s.amt+'</div>'
      +'</div>'
      +'<div class="edab-sch-note">'+s.note+'</div>'
      +'<div class="edab-sch-meta">'
      +'<span class="edab-sch-tag">'+s.country+'</span>'
      +'<span class="edab-sch-tag">'+s.course.join(', ')+'</span>'
      +'<span class="edab-sch-tag edab-sch-dl">Deadline: '+s.deadline+'</span>'
      +'<a class="edab-sch-link" href="'+s.link+'" target="_blank" rel="noopener">Apply &#8599;</a>'
      +'</div>'
      +'</div>';
  }).join('');
  res.innerHTML=rows;
};

/* ── AUTO-INIT ────────────────────────────────────────────────────────────── */
window.initEdExtraTools=function(){
  if(document.getElementById('edab-cmp-result')) edabCompare();
  if(document.getElementById('edab-roi-result')) edabRoi();
  if(document.getElementById('edab-loan-result')) edabLoan();
  if(document.getElementById('edab-sch-result')) edabScholar();
};

document.addEventListener('DOMContentLoaded',function(){
  // Hook into existing showTab to init extra tools when education tab opens
  var _origShow=window.showTab;
  if(typeof _origShow==='function'){
    window.showTab=function(tab,el){
      _origShow(tab,el);
      if(tab==='edabroad') setTimeout(window.initEdExtraTools,100);
    };
  }
});

})();
/* ── END EDUCATION EXTRA TOOLS ─────────────────────────────────────────── */

