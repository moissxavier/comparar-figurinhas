/**
 * parser.js
 * -------------------------------------------------------------------------
 * Responsible for extracting sticker codes from free-form text input.
 *
 * Supported input formats
 * -----------------------
 * 1. Direct codes, no space:    FWC1, CC14, MEX20, BRA8
 * 2. Prefix + space + number:   BRA 17, FWC 4, KOR 16
 * 3. Prefix colon + numbers:    MEX: 1, 2, 3  ->  MEX1, MEX2, MEX3
 * 4. Prefix colon + hyphen-sep: MEX: 2-6-17   ->  MEX2, MEX6, MEX17
 * 5. Prefix space + hyphen-sep: FWC 4-7-8     ->  FWC4, FWC7, FWC8
 *                               SWE 1- 8-9-10 ->  SWE1, SWE8, SWE9, SWE10
 * 6. Prefix space + csv:        BRA 1,9        ->  BRA1, BRA9
 *                               COL 8,9,18     ->  COL8, COL9, COL18
 * 7. Mixed separators: commas, spaces, line-breaks, hyphens between numbers
 * 8. App-copy text: flags, percentages, section titles are ignored
 *
 * A valid sticker code prefix: 2-5 uppercase letters.
 * A valid sticker number:       1-3 digits.
 * -------------------------------------------------------------------------
 */

const StickerParser = (() => {

  // -------------------------------------------------------------------------
  // Noise prefixes to ignore (common Portuguese/English words that match
  // the letter pattern but are NEVER sticker prefixes).
  // NOTE: Keep this list minimal. Only add words you are 100% sure are
  // never used as country/section codes in any album.
  // DO NOT add "POR" here - it is Portugal's sticker prefix.
  // -------------------------------------------------------------------------
  const IGNORED_PREFIXES = new Set([
    // Portuguese prepositions / conjunctions
    'NO', 'SIM', 'DO', 'DA', 'DE', 'EM', 'COM', 'SE', 'NA',
    // English noise
    'TO', 'OF', 'IN', 'AT', 'BY',
    // URL fragments (from app share links)
    'HTTP', 'HTTPS', 'WWW',
  ]);

  // -------------------------------------------------------------------------
  // Official Copa 2026 album order.
  // Prefixes not listed here fall to the end, sorted alphabetically.
  // -------------------------------------------------------------------------
  const ALBUM_ORDER = [
    'FWC','MEX','RSA','KOR','CZE','CAN','BIH','QAT','SUI','BRA',
    'MAR','HAI','SCO','USA','PAR','AUS','TUR','GER','CUW','CIV',
    'ECU','NED','JPN','SWE','TUN','BEL','EGY','IRN','NZL','ESP',
    'CPV','KSA','URU','FRA','SEN','IRQ','NOR','ARG','ALG','AUT',
    'JOR','POR','COD','UZB','COL','ENG','CRO','GHA','PAN','CC',
  ];

  const PREFIX_RANK = Object.fromEntries(ALBUM_ORDER.map((p, i) => [p, i]));

  // -------------------------------------------------------------------------
  // Step 1 - Pre-process: normalise the raw text into a form that is easy
  // to tokenise line by line.
  // -------------------------------------------------------------------------
  function normalise(raw) {
    return raw
      .toUpperCase()
      // Remove quantity annotations like (1x), (2x), (10x) — they are not
      // sticker numbers and would be misread as such.
      .replace(/\(\d+X\)/g, '')
      // Collapse multiple spaces/tabs to one space
      .replace(/[ \t]+/g, ' ')
      // Ensure every comma or semicolon is followed by a space
      .replace(/[,;]+/g, ', ')
      .trim();
  }

  // -------------------------------------------------------------------------
  // Step 2 - Split into lines (primary unit of parsing)
  // -------------------------------------------------------------------------
  function toLines(text) {
    return text.split(/\r?\n/);
  }

  // -------------------------------------------------------------------------
  // Step 3 - Parse a single token (a comma-split fragment of a line).
  //
  // Cases:
  //   (A) One or more fully-formed codes:   MEX2, BRA14, CC14
  //   (B) Prefix + colon + numbers:         MEX: 2, 6, 17   or  MEX: 2-6-17
  //   (C) Prefix + space + numbers/hyphens: FWC 4-7-8  /  BRA 1  /  COL 8,9,18
  //   (D) Just numbers (inherits prefix from previous token on same line)
  //   (E) Noise / irrelevant
  //
  // Returns { codes: string[], nextPrefix: string|null }
  // nextPrefix is kept active so comma-separated tokens on the same line
  // can inherit the prefix (e.g. "BRA 1" -> nextPrefix=BRA, then "9" -> BRA9)
  // -------------------------------------------------------------------------
  function parseLine(token, inheritedPrefix) {
    const t = token.trim();
    if (!t) return { codes: [], nextPrefix: inheritedPrefix };

    const codes = [];

    // ------------------------------------------------------------------
    // (A) Fully-formed codes anywhere in the token
    //     e.g. MEX2, CC14, FRAN1, POR4
    // ------------------------------------------------------------------
    const directMatches = [...t.matchAll(/\b([A-Z]{2,5})(\d{1,3})\b/g)];
    if (directMatches.length > 0) {
      for (const m of directMatches) {
        if (!IGNORED_PREFIXES.has(m[1])) {
          codes.push(m[1] + m[2]);
        }
      }
      return { codes, nextPrefix: null };
    }

    // ------------------------------------------------------------------
    // (B) "PREFIX: numbers" or "PREFIX: num-num-num"
    //     e.g.  MEX: 2, 6, 17    MEX: 2-6-17    MEX:2,6,17
    // ------------------------------------------------------------------
    const colonMatch = /^([A-Z]{2,5})\s*:\s*(.*)$/.exec(t);
    if (colonMatch) {
      const prefix = colonMatch[1];
      const rest   = colonMatch[2];
      if (!IGNORED_PREFIXES.has(prefix)) {
        const nums = rest.match(/\d{1,3}/g) || [];
        nums.forEach(n => codes.push(prefix + n));
        // Keep prefix active for any following comma-split tokens
        return { codes, nextPrefix: prefix };
      }
    }

    // ------------------------------------------------------------------
    // (C) "PREFIX space numbers"
    //     e.g.  FWC 4-7-8   KOR 16   BRA 1   SWE 1- 8-9-10
    //     Rest of the token contains only numbers and separators.
    //     Keep prefix active so subsequent comma-tokens on the same line
    //     inherit it: "BRA 1, 9" -> tokens ["BRA 1", "9"] -> BRA1, BRA9
    // ------------------------------------------------------------------
    const spaceMatch = /^([A-Z]{2,5})\s+([\d\s\-]+)$/.exec(t);
    if (spaceMatch) {
      const prefix = spaceMatch[1];
      const rest   = spaceMatch[2];
      if (!IGNORED_PREFIXES.has(prefix)) {
        const nums = rest.match(/\d{1,3}/g) || [];
        nums.forEach(n => codes.push(prefix + n));
        return { codes, nextPrefix: prefix };
      }
    }

    // ------------------------------------------------------------------
    // (D) Only numbers - apply inherited prefix
    // ------------------------------------------------------------------
    if (inheritedPrefix && /^[\d\s\-]+$/.test(t)) {
      const nums = t.match(/\d{1,3}/g) || [];
      nums.forEach(n => codes.push(inheritedPrefix + n));
      return { codes, nextPrefix: inheritedPrefix };
    }

    // (E) Nothing useful
    return { codes, nextPrefix: inheritedPrefix };
  }

  // -------------------------------------------------------------------------
  // Step 4 - Sort by official album order, then numerically within prefix.
  // -------------------------------------------------------------------------
  function sortStickers(codes) {
    return codes.slice().sort((a, b) => {
      const ma = /^([A-Z]+)(\d+)$/.exec(a);
      const mb = /^([A-Z]+)(\d+)$/.exec(b);
      if (!ma || !mb) return a.localeCompare(b);

      const rankA = PREFIX_RANK[ma[1]] ?? (ALBUM_ORDER.length + ma[1].localeCompare(''));
      const rankB = PREFIX_RANK[mb[1]] ?? (ALBUM_ORDER.length + mb[1].localeCompare(''));

      if (rankA !== rankB) return rankA - rankB;
      return parseInt(ma[2], 10) - parseInt(mb[2], 10);
    });
  }

  // -------------------------------------------------------------------------
  // Main entry point
  // -------------------------------------------------------------------------
  function parse(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const text  = normalise(rawText);
    const lines = toLines(text);

    const allCodes = [];

    for (const line of lines) {
      // Split each line on commas so "BRA 1, 9, 14" becomes ["BRA 1", "9", "14"]
      // The prefix is kept active (nextPrefix) across tokens of the same line,
      // then reset to null at the end of the line.
      const tokens = line.split(/,\s*/);
      let linePrefix = null;

      for (const token of tokens) {
        const { codes, nextPrefix } = parseLine(token, linePrefix);
        allCodes.push(...codes);
        linePrefix = nextPrefix;
      }
      // Prefix does NOT carry over to the next line
    }

    // Deduplicate then sort
    return sortStickers([...new Set(allCodes)]);
  }

  // Public API
  return { parse, sortStickers };

})();
