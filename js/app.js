/**
 * app.js
 * -------------------------------------------------------------------------
 * Application entry point.
 * Wires up event listeners and orchestrates parser, comparator, and UI.
 * -------------------------------------------------------------------------
 */

(function () {
  'use strict';

  // Store the last comparison result so the copy button can access it
  let lastMatches = [];

  // -------------------------------------------------------------------------
  // Live counters — update sticker count as the user types
  // -------------------------------------------------------------------------
  UI.el.myRepeats.addEventListener('input', () => {
    UI.updateCounter(UI.el.myRepeats, UI.el.myCount);
  });

  UI.el.theirNeeds.addEventListener('input', () => {
    UI.updateCounter(UI.el.theirNeeds, UI.el.theirCount);
  });

  // -------------------------------------------------------------------------
  // Compare button
  // -------------------------------------------------------------------------
  UI.el.btnCompare.addEventListener('click', () => {
    const myText    = UI.el.myRepeats.value;
    const theirText = UI.el.theirNeeds.value;

    const myRepeats  = StickerParser.parse(myText);
    const theirNeeds = StickerParser.parse(theirText);

    lastMatches = StickerComparator.compare(myRepeats, theirNeeds);

    UI.showResults(lastMatches);
  });

  // -------------------------------------------------------------------------
  // Clear button
  // -------------------------------------------------------------------------
  UI.el.btnClear.addEventListener('click', () => {
    lastMatches = [];
    UI.clearAll();
  });

  // -------------------------------------------------------------------------
  // Copy button
  // -------------------------------------------------------------------------
  UI.el.btnCopy.addEventListener('click', () => {
    UI.copyResults(lastMatches);
  });

  // -------------------------------------------------------------------------
  // Allow pressing Enter in textareas to not accidentally submit,
  // and allow Ctrl+Enter to trigger comparison
  // -------------------------------------------------------------------------
  [UI.el.myRepeats, UI.el.theirNeeds].forEach(textarea => {
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        UI.el.btnCompare.click();
      }
    });
  });

})();
