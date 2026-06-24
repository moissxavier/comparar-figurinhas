/**
 * comparator.js
 * -------------------------------------------------------------------------
 * Responsible for comparing two lists of sticker codes and finding
 * the intersection: stickers that I have (repeated) AND the other
 * person needs.
 * -------------------------------------------------------------------------
 */

const StickerComparator = (() => {

  /**
   * Finds the intersection of two sticker code arrays.
   * Result is deduplicated and sorted by official album order.
   *
   * @param {string[]} myRepeats   - Codes I have as repeated stickers
   * @param {string[]} theirNeeds  - Codes the other person still needs
   * @returns {string[]}           - Codes I can give them
   */
  function compare(myRepeats, theirNeeds) {
    if (!myRepeats.length || !theirNeeds.length) return [];

    const needsSet = new Set(theirNeeds);
    const intersection = myRepeats.filter(code => needsSet.has(code));

    // Deduplicate and sort by album order
    return StickerParser.sortStickers([...new Set(intersection)]);
  }

  return { compare };

})();
