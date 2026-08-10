/* ------------------------------------------------------------------
   Mirror fix-ups — harborviewpartners.com static copy
   ------------------------------------------------------------------
   Webflow's hosted commerce backend (/.wf_graphql/apollo) is not part of
   a static mirror, so the script that preselects a product's default
   variant never runs. On the live site the first pill of every option
   group carries `w--ecommerce-pill-selected`; this restores that, plus
   the click-to-switch behaviour, so product pages match visually.
   Purely cosmetic: no cart or checkout logic is reimplemented here.
   ------------------------------------------------------------------ */
(function () {
  var PILL = '.w-commerce-commerceaddtocartoptionpill';
  var SELECTED = 'w--ecommerce-pill-selected';

  function groupsOf(pills) {
    var byParent = new Map();
    pills.forEach(function (pill) {
      var parent = pill.parentElement;
      if (!parent) return;
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(pill);
    });
    return byParent;
  }

  function apply() {
    var pills = Array.prototype.slice.call(document.querySelectorAll(PILL));
    if (!pills.length) return;

    groupsOf(pills).forEach(function (group) {
      // leave alone if the real Webflow script already made a choice
      if (group.some(function (p) { return p.classList.contains(SELECTED); })) return;
      group[0].classList.add(SELECTED);
    });
  }

  document.addEventListener('click', function (e) {
    var pill = e.target.closest && e.target.closest(PILL);
    if (!pill || !pill.parentElement) return;
    Array.prototype.forEach.call(pill.parentElement.children, function (sib) {
      if (sib.classList && sib.classList.contains('w-commerce-commerceaddtocartoptionpill')) {
        sib.classList.remove(SELECTED);
      }
    });
    pill.classList.add(SELECTED);
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  // Webflow renders some pills asynchronously; re-apply once things settle
  setTimeout(apply, 800);
  setTimeout(apply, 2500);
})();
