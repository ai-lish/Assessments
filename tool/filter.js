/* ============================================================
   tool/filter.js — 共享篩選邏輯

   Used by both tool/index.html (browser) and test scripts (node).
   Keep this file dependency-free so it can be loaded via
   <script src="filter.js"></script> on the page and
   require('./tool/filter.js') in tests.
   ============================================================ */
(function (exports) {
  "use strict";

  /**
   * Strict hierarchical filter for the teacher tool.
   *
   *   filterBankStrict(questions, grade, term, topic)
   *
   * Returns the subset of `questions` matching the exact
   * (grade, term, topicKey) tuple.
   *
   * Important: any empty / falsy argument means "not selected yet"
   * and the result is `[]`. This is the deliberate behaviour the
   * tool must use so that selecting only the year, or only year+term,
   * never shows a non-empty list of unfiltered questions.
   *
   * Demo / uncategorised question types (where t.grade or t.term is
   * missing) will never match a real selection such as "s1"/"3" and
   * therefore stay out of the browser unless the user explicitly
   * picks a "未分類" pseudo-grade / pseudo-term.
   */
  function filterBankStrict(questions, grade, term, topic) {
    if (!Array.isArray(questions)) return [];
    if (!grade || !term || !topic) return [];
    return questions.filter(function (t) {
      return (t.grade || "") === grade
          && (t.term || "") === term
          && (t.topicKey || "uncategorized") === topic;
    });
  }

  /**
   * Helper used by the year/term dropdown population.
   * Returns the distinct non-empty values for the given key on the
   * current set of (grade, term) selections.
   */
  function uniqueValuesForKey(questions, key) {
    var set = new Set();
    for (var i = 0; i < questions.length; i++) {
      set.add(questions[i][key] || "");
    }
    return Array.from(set).sort();
  }

  exports.filterBankStrict = filterBankStrict;
  exports.uniqueValuesForKey = uniqueValuesForKey;
})(function () {
  // 挑個 namespace 物件：三個環境 (browser / node + require / node -e) 都會撞到
  if (typeof window !== "undefined") {
    var ns = (window.AssessTool = window.AssessTool || {});
    if (typeof globalThis !== "undefined" && !globalThis.AssessTool) globalThis.AssessTool = ns;
    return ns;
  }
  if (typeof globalThis !== "undefined") {
    return (globalThis.AssessTool = globalThis.AssessTool || {});
  }
  if (typeof module !== "undefined" && module.exports) {
    return (module.exports = module.exports || {});
  }
  return {};
}());
// 額外：node + require() 使用者要可以 require() 出 namespaced exports
// 同時 node -e 也要直接看到 `AssessTool.foo()`，所以 module.exports、globalThis.AssessTool、window.AssessTool 三個全部同步
(function syncExports() {
  if (typeof globalThis === "undefined") return;
  if (!globalThis.AssessTool) {
    if (typeof window !== "undefined" && window.AssessTool) {
      globalThis.AssessTool = window.AssessTool;
    } else if (typeof module !== "undefined" && module.exports) {
      globalThis.AssessTool = module.exports;
    }
  }
  if (typeof module !== "undefined" && module.exports && !module.exports.filterBankStrict && globalThis.AssessTool) {
    module.exports = globalThis.AssessTool;
  }
  if (typeof window !== "undefined" && !window.AssessTool && globalThis.AssessTool) {
    window.AssessTool = globalThis.AssessTool;
  }
}());
