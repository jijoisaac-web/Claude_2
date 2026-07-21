
function fmt(n, cur) { return cur + Number(n).toLocaleString(undefined, {maximumFractionDigits: 2}); }

function initBreakeven() {
  var form = document.getElementById('breakeven-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = document.getElementById('be-currency').value;
    var fee = parseFloat(document.getElementById('be-fee').value) || 0;
    var spend = parseFloat(document.getElementById('be-spend').value) || 0;
    var newRate = (parseFloat(document.getElementById('be-new-rate').value) || 0) / 100;
    var oldRate = (parseFloat(document.getElementById('be-old-rate').value) || 0) / 100;
    var perks = parseFloat(document.getElementById('be-perks').value) || 0;
    var monthlyExtra = spend * (newRate - oldRate);
    var yearlyExtra = monthlyExtra * 12;
    var netYearly = yearlyExtra + perks - fee;
    var breakevenMonthlySpend = (newRate - oldRate) > 0 ? (fee - perks) / 12 / (newRate - oldRate) : null;
    var box = document.getElementById('breakeven-result');
    box.style.display = 'block';
    box.classList.toggle('bad', netYearly < 0);
    var html = '<h4>' + (netYearly >= 0 ? 'This card looks worth it at your spend level' : 'This card likely costs you money at your spend level') + '</h4>';
    html += '<p>Extra rewards earned vs. your current card: <strong>' + fmt(yearlyExtra, cur) + '/year</strong></p>';
    html += '<p>Plus perk value: <strong>' + fmt(perks, cur) + '/year</strong> — minus annual fee: <strong>' + fmt(fee, cur) + '</strong></p>';
    html += '<p>Net value: <strong>' + fmt(netYearly, cur) + '/year</strong></p>';
    if (breakevenMonthlySpend !== null && breakevenMonthlySpend > 0) {
      html += '<p>You need to spend roughly <strong>' + fmt(breakevenMonthlySpend, cur) + '/month</strong> on bonus-eligible categories just to break even on the fee.</p>';
    }
    box.innerHTML = html;
  });
}

function initBalanceTransfer() {
  var form = document.getElementById('bt-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = document.getElementById('bt-currency').value;
    var balance = parseFloat(document.getElementById('bt-balance').value) || 0;
    var currentApr = (parseFloat(document.getElementById('bt-current-apr').value) || 0) / 100;
    var transferFeePct = (parseFloat(document.getElementById('bt-fee-pct').value) || 0) / 100;
    var introMonths = parseFloat(document.getElementById('bt-intro-months').value) || 0;
    var monthlyPayment = parseFloat(document.getElementById('bt-payment').value) || 0;

    function simulate(apr, extraUpfrontFee, months) {
      var bal = balance + extraUpfrontFee;
      var monthsUsed = 0;
      var totalInterest = 0;
      var monthlyRate = apr / 12;
      while (bal > 0 && monthsUsed < 600) {
        var interest = (months === null || monthsUsed < months) ? 0 : bal * monthlyRate;
        if (months !== null && monthsUsed < months) interest = 0; else interest = bal * monthlyRate;
        totalInterest += interest;
        bal = bal + interest - monthlyPayment;
        monthsUsed++;
        if (monthlyPayment <= 0) break;
      }
      return { months: monthsUsed, interest: totalInterest, cleared: bal <= 0 };
    }

    var withoutTransfer = simulate(currentApr, 0, null);
    var withTransfer = simulate(0, balance * transferFeePct, introMonths);

    var box = document.getElementById('bt-result');
    box.style.display = 'block';
    var savings = withoutTransfer.interest - withTransfer.interest - (balance * transferFeePct);
    box.classList.toggle('bad', savings < 0);
    var html = '<h4>' + (savings >= 0 ? 'A balance transfer likely saves you money' : 'A balance transfer may not be worth it here') + '</h4>';
    html += '<p>Staying on your current card: about <strong>' + fmt(withoutTransfer.interest, cur) + '</strong> in total interest' + (withoutTransfer.cleared ? '' : ' (balance not fully cleared with this payment amount)') + '.</p>';
    html += '<p>Transferring (incl. ' + fmt(balance * transferFeePct, cur) + ' transfer fee): about <strong>' + fmt(withTransfer.interest, cur) + '</strong> in interest after the intro period' + (withTransfer.cleared ? '' : ' (balance not fully cleared with this payment amount)') + '.</p>';
    html += '<p>Estimated net savings: <strong>' + fmt(savings, cur) + '</strong></p>';
    html += '<p style="font-size:0.8rem; opacity:0.85;">Estimate only — assumes a fixed monthly payment and does not account for new spending or rate changes.</p>';
    box.innerHTML = html;
  });
}

function initPointsValue() {
  var form = document.getElementById('pv-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = document.getElementById('pv-currency').value;
    var points = parseFloat(document.getElementById('pv-points').value) || 0;
    var redemptionValue = parseFloat(document.getElementById('pv-value').value) || 0;
    var baseline = parseFloat(document.getElementById('pv-baseline').value) || 1;
    var cpp = points > 0 ? (redemptionValue / points) * 100 : 0;
    var box = document.getElementById('pv-result');
    box.style.display = 'block';
    var good = cpp >= baseline;
    box.classList.toggle('bad', !good);
    var html = '<h4>' + (good ? 'Good redemption value' : 'Below-average redemption value') + '</h4>';
    html += '<p>You are getting roughly <strong>' + cpp.toFixed(2) + ' ' + cur + ' per 100 points/miles</strong>.</p>';
    html += '<p>Your baseline for a solid redemption: <strong>' + Number(baseline).toFixed(2) + ' ' + cur + ' per 100 points/miles</strong>.</p>';
    html += '<p>' + (good ? 'This redemption meets or beats your baseline — a reasonable use of points.' : 'This redemption falls short of your baseline — consider saving points for a higher-value redemption (e.g. transfer partners or travel bookings) instead of cash-equivalent options.') + '</p>';
    box.innerHTML = html;
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initBreakeven();
  initBalanceTransfer();
  initPointsValue();
});
