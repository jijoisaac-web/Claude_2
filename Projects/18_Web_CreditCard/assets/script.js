
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav.main-nav');
  if (toggle && nav) { toggle.addEventListener('click', function () { nav.classList.toggle('open'); }); }

  var filterBtns = document.querySelectorAll('.filter-btn');
  var rows = document.querySelectorAll('[data-category]');
  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cat = btn.getAttribute('data-filter');
        rows.forEach(function (row) {
          row.style.display = (cat === 'all' || row.getAttribute('data-category') === cat) ? '' : 'none';
        });
      });
    });
  }

  var countrySelect = document.querySelector('.country-select');
  if (countrySelect) {
    countrySelect.addEventListener('change', function () {
      window.location.href = this.value;
    });
  }
});
