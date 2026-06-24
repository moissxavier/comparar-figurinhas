/**
 * ui.js
 * -------------------------------------------------------------------------
 * Handles all DOM manipulation and UI state transitions.
 * Keeps UI logic separate from business logic (parser / comparator).
 * -------------------------------------------------------------------------
 */

const UI = (() => {

  // -------------------------------------------------------------------------
  // Element references (resolved once on first use via getters)
  // -------------------------------------------------------------------------
  const el = {
    get myRepeats()       { return document.getElementById('my-repeats'); },
    get theirNeeds()      { return document.getElementById('their-needs'); },
    get myCount()         { return document.getElementById('my-repeats-count'); },
    get theirCount()      { return document.getElementById('their-needs-count'); },
    get btnCompare()      { return document.getElementById('btn-compare'); },
    get btnClear()        { return document.getElementById('btn-clear'); },
    get btnCopy()         { return document.getElementById('btn-copy'); },
    get resultsSection()  { return document.getElementById('results-section'); },
    get resultsList()     { return document.getElementById('results-list'); },
    get resultsListWrap() { return document.getElementById('results-list-wrapper'); },
    get resultsEmpty()    { return document.getElementById('results-empty'); },
    get resultsActions()  { return document.getElementById('results-actions'); },
    get resultsTotal()    { return document.getElementById('results-total'); },
    get copyFeedback()    { return document.getElementById('copy-feedback'); },
  };

  // -------------------------------------------------------------------------
  // Counter update: shows how many stickers were detected in real time
  // -------------------------------------------------------------------------
  function updateCounter(countEl, counterEl) {
    const text  = countEl.value;
    const codes = StickerParser.parse(text);
    const count = codes.length;

    const wrapper = counterEl.parentElement;

    if (count === 0) {
      counterEl.textContent = '0 figurinhas detectadas';
      wrapper.classList.remove('has-stickers');
    } else {
      counterEl.textContent = `${count} figurinha${count !== 1 ? 's' : ''} detectada${count !== 1 ? 's' : ''}`;
      wrapper.classList.add('has-stickers');
    }
  }

  // -------------------------------------------------------------------------
  // Show results
  // -------------------------------------------------------------------------
  function showResults(matches) {
    const section = el.resultsSection;
    section.classList.remove('hidden');

    // Scroll into view smoothly
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (matches.length === 0) {
      el.resultsTotal.textContent     = '0 encontradas';
      el.resultsEmpty.classList.remove('hidden');
      el.resultsListWrap.classList.add('hidden');
      el.resultsActions.classList.add('hidden');
      return;
    }

    // Badge
    el.resultsTotal.textContent = `${matches.length} figurinha${matches.length !== 1 ? 's' : ''} encontrada${matches.length !== 1 ? 's' : ''}`;

    // Build chips
    el.resultsList.innerHTML = '';
    for (const code of matches) {
      const chip = document.createElement('span');
      chip.className   = 'sticker-chip';
      chip.textContent = code;
      el.resultsList.appendChild(chip);
    }

    el.resultsEmpty.classList.add('hidden');
    el.resultsListWrap.classList.remove('hidden');
    el.resultsActions.classList.remove('hidden');
  }

  // -------------------------------------------------------------------------
  // Hide results
  // -------------------------------------------------------------------------
  function hideResults() {
    el.resultsSection.classList.add('hidden');
    el.resultsEmpty.classList.add('hidden');
    el.resultsListWrap.classList.add('hidden');
    el.resultsActions.classList.add('hidden');
    el.resultsList.innerHTML = '';
  }

  // -------------------------------------------------------------------------
  // Clear everything
  // -------------------------------------------------------------------------
  function clearAll() {
    el.myRepeats.value  = '';
    el.theirNeeds.value = '';
    updateCounter(el.myRepeats,  el.myCount);
    updateCounter(el.theirNeeds, el.theirCount);
    hideResults();
  }

  // -------------------------------------------------------------------------
  // Copy results to clipboard
  // -------------------------------------------------------------------------
  function copyResults(matches) {
    if (!matches || matches.length === 0) return;

    const text = matches.join('\n') + `\nTotal: ${matches.length} figurinha${matches.length !== 1 ? 's' : ''}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback();
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (_) { /* silent */ }
    document.body.removeChild(ta);
    showCopyFeedback();
  }

  function showCopyFeedback() {
    const fb = el.copyFeedback;
    fb.classList.remove('hidden');
    clearTimeout(fb._timer);
    fb._timer = setTimeout(() => {
      fb.classList.add('hidden');
    }, 2500);
  }

  // -------------------------------------------------------------------------
  // Expose public interface
  // -------------------------------------------------------------------------
  return {
    el,
    updateCounter,
    showResults,
    hideResults,
    clearAll,
    copyResults,
  };

})();
