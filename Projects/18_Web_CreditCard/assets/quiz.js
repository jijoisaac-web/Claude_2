
var QUIZ_STATE = { country: null, goal: null, spend: null, fee: null, profile: null };
var QUIZ_STEPS = ['country', 'goal', 'spend', 'fee', 'profile'];
var QUIZ_INDEX = 0;

function quizGoTo(i) {
  document.querySelectorAll('.quiz-step').forEach(function (el) { el.classList.remove('active'); });
  var step = document.getElementById('step-' + QUIZ_STEPS[i]);
  if (step) step.classList.add('active');
  var progress = document.getElementById('quiz-progress');
  if (progress) progress.textContent = 'Step ' + (i + 1) + ' of ' + QUIZ_STEPS.length;
  QUIZ_INDEX = i;
}

function quizSelect(key, value, el) {
  QUIZ_STATE[key] = value;
  var siblings = el.parentElement.querySelectorAll('.quiz-option');
  siblings.forEach(function (s) { s.classList.remove('selected'); });
  el.classList.add('selected');
  setTimeout(function () {
    if (QUIZ_INDEX < QUIZ_STEPS.length - 1) {
      quizGoTo(QUIZ_INDEX + 1);
    } else {
      quizShowResults();
    }
  }, 220);
}

function quizBack() {
  if (QUIZ_INDEX > 0) quizGoTo(QUIZ_INDEX - 1);
}

var GOAL_TO_CATEGORY = { cashback: 'cashback', travel: 'travel', credit: 'student', business: 'business', debt: 'balance-transfer' };
var FEE_MAX = { none: 0, low: 100, any: 999999 };

function currencyFor(country) {
  return { us: '$', in: '₹', my: 'RM' }[country] || '';
}

function quizShowResults() {
  document.getElementById('step-results').classList.add('active');
  document.querySelectorAll('.quiz-step:not(#step-results)').forEach(function (el) { el.classList.remove('active'); });
  document.getElementById('quiz-progress').textContent = 'Your matches';

  var country = QUIZ_STATE.country;
  var category = GOAL_TO_CATEGORY[QUIZ_STATE.goal];
  var feeMax = FEE_MAX[QUIZ_STATE.fee];
  var newToCredit = QUIZ_STATE.profile === 'new';

  var pool = CARDS.filter(function (c) { return c.country === country && c.category === category; });
  var filtered = pool.filter(function (c) { return c.annual_fee_value <= feeMax; });
  if (filtered.length === 0) filtered = pool;

  if (newToCredit) {
    filtered.sort(function (a, b) {
      var aFit = /no credit|limited|no income/i.test(a.credit_needed) ? 0 : 1;
      var bFit = /no credit|limited|no income/i.test(b.credit_needed) ? 0 : 1;
      if (aFit !== bFit) return aFit - bFit;
      return a.annual_fee_value - b.annual_fee_value;
    });
  } else {
    filtered.sort(function (a, b) { return a.annual_fee_value - b.annual_fee_value; });
  }

  var top = filtered.slice(0, 3);
  var wrap = document.getElementById('quiz-results-list');
  var cur = currencyFor(country);
  if (top.length === 0) {
    wrap.innerHTML = '<p>No exact matches — browse the <a href="/' + country + '/' + category + '.html">full category</a> instead.</p>';
    return;
  }
  wrap.innerHTML = top.map(function (c, i) {
    return '<div class="quiz-result-card">' +
      '<span class="rank">Match ' + (i + 1) + '</span>' +
      '<h3 style="margin:4px 0 4px;">' + c.name + '</h3>' +
      '<p style="color:#5b6676; font-size:0.85rem; margin:0 0 10px;">' + c.issuer + ' &middot; Annual fee: ' + c.annual_fee + '</p>' +
      '<p style="font-size:0.9rem; margin:0 0 10px;"><strong>Rewards:</strong> ' + c.reward_rate + '</p>' +
      '<a href="/' + country + '/' + category + '.html" style="font-size:0.85rem;">See full details in the ' + category.replace('-', ' ') + ' category →</a>' +
      '</div>';
  }).join('') + '<p style="margin-top:16px;"><a href="/' + country + '/compare.html">Compare all ' + country.toUpperCase() + ' cards →</a></p>';
}

function quizRestart() {
  QUIZ_STATE = { country: null, goal: null, spend: null, fee: null, profile: null };
  document.querySelectorAll('.quiz-option.selected').forEach(function (el) { el.classList.remove('selected'); });
  document.getElementById('step-results').classList.remove('active');
  quizGoTo(0);
}

document.addEventListener('DOMContentLoaded', function () { quizGoTo(0); });
