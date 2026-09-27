// dse-paper2/js/rational-display.js
// Display formatting. SEPARATE from canonical form on the server.
// Input: { type: "rational", numerator: "<int-string>", denominator: "<int-string>" }
// Output: human-readable string for the student.

export function displayRational(r) {
  if (!r || r.type !== 'rational') return '?';
  const n = r.numerator;
  const d = r.denominator;
  if (d === '1') return n;
  if (n === '0') return '0';
  return `${n}/${d}`;
}

// For the (a^m)^n / a^k form, we display the problem given the parameters.
export function displayParameters({ a, m, n, k }) {
  const exp = (e) => (e === 1 ? '' : e === -1 ? '⁻¹' : superscript(e));
  function superscript(e) {
    // small unicode superscript
    const map = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };
    return String(e).split('').map((c) => map[c] || c).join('');
  }
  const aStr = String(a);
  const mStr = exp(m);
  const nStr = exp(n);
  const kStr = exp(k);
  return `( ${aStr}${mStr} )${nStr} / ${aStr}${kStr}`;
}
