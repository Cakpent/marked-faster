// parse.js — dependency-free CommonMark 0.31.2 + GFM 0.29 parser,
// byte-identical output to marked 18.1.3 (default options, gfm on).
// Written from scratch for the make.fun markdown-render-speed-02 bounty.

const UNICODE_PUNCT = /[!-\/:-@\[-`{-~]/;
const PUNCT = /[!-\/:-@\[-`{-~]/;
// ASCII punctuation by code: 33-47, 58-64, 91-96, 123-126. Faster than a
// regex test for the single-character checks in the inline scanner.
function isPunctCode(code) { return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126); }
function isAsciiLetterCode(code) { return (code >= 65 && code <= 90) || (code >= 97 && code <= 122); }
function isAsciiAlnumCode(code) { return isAsciiLetterCode(code) || (code >= 48 && code <= 57); }
// email local-part chars: alnum + . ! # $ % & ' * + = ? ^ _ ` { | } ~ -
function isEmailLocalCode(code) {
  if (isAsciiAlnumCode(code)) return true;
  return code === 46 || code === 33 || code === 35 || code === 36 || code === 37 || code === 38 || code === 39 || code === 42 || code === 43 || code === 61 || code === 63 || code === 94 || code === 95 || code === 96 || code === 123 || code === 124 || code === 125 || code === 126 || code === 45;
}
// a char that can start an email-autolink attempt: alnum + . + -
function isEmailStartCode(code) { return isAsciiAlnumCode(code) || code === 46 || code === 43 || code === 45; }
function isPunct(ch) { return ch !== '' && isPunctCode(ch.charCodeAt(0)); }
const UNICODE_PUNCT_RE = /\p{P}|\p{S}/u;
function isUnicodePunct(ch) { return ch !== '' && (ch.charCodeAt(0) < 128 ? isPunctCode(ch.charCodeAt(0)) : UNICODE_PUNCT_RE.test(ch)); }
function isSpace(ch) { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || ch === '\u00a0' || ch === '\u1680' || (ch >= '\u2000' && ch <= '\u200a') || ch === '\u2028' || ch === '\u2029' || ch === '\u202f' || ch === '\u205f' || ch === '\u3000'; }
function isWhitespace(ch) { return isSpace(ch); }
function isUnicodeWhitespace(ch) { return isSpace(ch); }

// ---- HTML escaping ----
const ESC_RE = /[&<>"']/g;
function escapeHtml(s) {
  if (s.indexOf('&') === -1 && s.indexOf('<') === -1 && s.indexOf('>') === -1 && s.indexOf('"') === -1 && s.indexOf("'") === -1) return s;
  return s.replace(ESC_RE, (c) => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }

// ---- Entities ----
const NAMED = {
  amp: '&', AMP: '&', lt: '<', LT: '<', gt: '>', GT: '>', quot: '"', QUOT: '"', apos: "'", copy: '\u00a9', COPY: '\u00a9', nbsp: '\u00a0', reg: '\u00ae', REG: '\u00ae', trade: '\u2122', TRADE: '\u2122', hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', laquo: '\u00ab', raquo: '\u00bb', times: '\u00d7', divide: '\u00f7', plusmn: '\u00b1', deg: '\u00b0', micro: '\u00b5', para: '\u00b6', middot: '\u00b7', bull: '\u2022', dagger: '\u2020', Dagger: '\u2021', permil: '\u2030', prime: '\u2032', Prime: '\u2033', oline: '\u203e', frasl: '\u2044', euro: '\u20ac', pound: '\u00a3', yen: '\u00a5', cent: '\u00a2', curren: '\u00a4', sect: '\u00a7', uml: '\u00a8', ordf: '\u00aa', ordm: '\u00ba', iexcl: '\u00a1', iquest: '\u00bf', szlig: '\u00df', agrave: '\u00e0', aacute: '\u00e1', acirc: '\u00e2', atilde: '\u00e3', auml: '\u00e4', aring: '\u00e5', aelig: '\u00e6', ccedil: '\u00e7', egrave: '\u00e8', eacute: '\u00e9', ecirc: '\u00ea', euml: '\u00eb', igrave: '\u00ec', iacute: '\u00ed', icirc: '\u00ee', iuml: '\u00ef', ntilde: '\u00f1', ograve: '\u00f2', oacute: '\u00f3', ocirc: '\u00f4', otilde: '\u00f5', ouml: '\u00f6', oslash: '\u00f8', ugrave: '\u00f9', uacute: '\u00fa', ucirc: '\u00fb', uuml: '\u00fc', yacute: '\u00fd', yuml: '\u00ff', Agrave: '\u00c0', Aacute: '\u00c1', Acirc: '\u00c2', Atilde: '\u00c3', Auml: '\u00c4', Aring: '\u00c5', AElig: '\u00c6', Ccedil: '\u00c7', Egrave: '\u00c8', Eacute: '\u00c9', Ecirc: '\u00ca', Euml: '\u00cb', Igrave: '\u00cc', Iacute: '\u00cd', Icirc: '\u00ce', Iuml: '\u00cf', Ntilde: '\u00d1', Ograve: '\u00d2', Oacute: '\u00d3', Ocirc: '\u00d4', Otilde: '\u00d5', Ouml: '\u00d6', Oslash: '\u00d8', Ugrave: '\u00d9', Uacute: '\u00da', Ucirc: '\u00db', Uuml: '\u00dc', Yacute: '\u00dd', THORN: '\u00de', thorn: '\u00fe', eth: '\u00f0', ETH: '\u00d0', yuml2: '\u00ff', alpha: '\u03b1', beta: '\u03b2', gamma: '\u03b3', delta: '\u03b4', epsilon: '\u03b5', zeta: '\u03b6', eta: '\u03b7', theta: '\u03b8', iota: '\u03b9', kappa: '\u03ba', lambda: '\u03bb', mu: '\u03bc', nu: '\u03bd', xi: '\u03be', omicron: '\u03bf', pi: '\u03c0', rho: '\u03c1', sigma: '\u03c3', tau: '\u03c4', upsilon: '\u03c5', phi: '\u03c6', chi: '\u03c7', psi: '\u03c8', omega: '\u03c9', Alpha: '\u0391', Beta: '\u0392', Gamma: '\u0393', Delta: '\u0394', Epsilon: '\u0395', Zeta: '\u0396', Eta: '\u0397', Theta: '\u0398', Iota: '\u0399', Kappa: '\u039a', Lambda: '\u039b', Mu: '\u039c', Nu: '\u039d', Xi: '\u039e', Omicron: '\u039f', Pi: '\u03a0', Rho: '\u03a1', Sigma: '\u03a3', Tau: '\u03a4', Upsilon: '\u03a5', Phi: '\u03a6', Chi: '\u03a7', Psi: '\u03a8', Omega: '\u03a9', infin: '\u221e', ne: '\u2260', le: '\u2264', ge: '\u2265', plus: '+', minus: '\u2212', lowast: '\u2217', radic: '\u221a', prop: '\u221d', empty: '\u2205', isin: '\u2208', notin: '\u2209', ni: '\u220b', prod: '\u220f', sum: '\u2211', sim: '\u223c', cong: '\u2245', asymp: '\u2248', equiv: '\u2261', sub: '\u2282', sup: '\u2283', nsub: '\u2284', sube: '\u2286', supe: '\u2287', oplus: '\u2295', otimes: '\u2297', perp: '\u22a5', sdot: '\u22c5', lceil: '\u2308', rceil: '\u2309', lfloor: '\u230a', rfloor: '\u230b', lang: '\u2329', rang: '\u232a', loz: '\u25ca', spades: '\u2660', clubs: '\u2663', hearts: '\u2665', diams: '\u2666'
};
function decodeEntity(s) {
  // s is like &amp; #123; #x1F; or &name;
  const inner = s.slice(1, -1);
  if (inner[0] === '#') {
    let code;
    if (inner[1] === 'x' || inner[1] === 'X') code = parseInt(inner.slice(2), 16);
    else code = parseInt(inner.slice(1), 10);
    if (isNaN(code) || code === 0) return '\uFFFD';
    if (code > 0x10FFFF) return '\uFFFD';
    if (code >= 0xD800 && code <= 0xDFFF) return '\uFFFD';
    return String.fromCodePoint(code);
  }
  const v = NAMED[inner];
  return v !== undefined ? v : s;
}
const ENTITY_RE = /&(#(?:[xX][0-9a-fA-F]+|[0-9]+)|[a-zA-Z][a-zA-Z0-9]+);/g;
function unescapeEntities(s) {
  return s.replace(ENTITY_RE, (m) => decodeEntity(m));
}
// Full unescape: backslash escapes + entities (for link destinations/titles)
function unescape(s) {
  return unescapeEntities(s.replace(/\\([!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~])/g, '$1'));
}

// ---- URL / link handling ----
function encodeUrl(url) {
  // encode, but preserve existing %xx sequences and &entity; references.
  // A bare & is left as-is so the attribute escaper can turn it into &amp;.
  // Fast path: a URL of only unreserved / sub-delim / URL-punct chars is
  // unchanged by encodeURI (no %, no &, no space, no non-ASCII). Note
  // [ and ] are NOT in this set: encodeURI escapes them to %5B / %5D.
  if (/^[A-Za-z0-9\-._~:/?#@!$'()*+,;=]*$/.test(url)) return url;
  let out = '', i = 0;
  while (i < url.length) {
    const c = url[i];
    if (c === '%') {
      // preserve a valid %xx sequence; a bare % is left as-is (marked does
      // not encode it)
      if (/^[0-9a-fA-F]{2}$/.test(url.slice(i + 1, i + 3))) { out += url.slice(i, i + 3); i += 3; continue; }
      out += '%'; i++; continue;
    }
    if (c === '&') {
      const em = /^&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/.exec(url.slice(i));
      if (em) { out += em[0]; i += em[0].length; continue; }
      out += '&'; i++; continue;
    }
    out += encodeURI(c);
    i++;
  }
  return out;
}
// Escape an attribute value, but leave valid entity references (&name;,
// &#123;, &#x1F;) untouched instead of turning their & into &amp;.
const ENTITY_SHAPE_RE = /^&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#[xX][0-9a-fA-F]+);/;
function escapeAttrPreserveEntities(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '&') {
      const m = ENTITY_SHAPE_RE.exec(s.slice(i));
      if (m) { out += m[0]; i += m[0].length; continue; }
      out += '&amp;'; i++; continue;
    }
    if (c === '<') { out += '&lt;'; i++; continue; }
    if (c === '>') { out += '&gt;'; i++; continue; }
    if (c === '"') { out += '&quot;'; i++; continue; }
    if (c === "'") { out += '&#39;'; i++; continue; }
    out += c; i++;
  }
  return out;
}
// Backslash escapes only (no entity decoding).
function unescapeBackslash(s) {
  return s.replace(/\\([!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~])/g, '$1');
}
function sanitizeUrl(url) {
  if (/^javascript:/i.test(url.replace(/[\x00-\x20]+/g, ''))) return null;
  if (/^vbscript:/i.test(url.replace(/[\x00-\x20]+/g, ''))) return null;
  if (/^data:/i.test(url.replace(/[\x00-\x20]+/g, '')) && !/^data:image\/(png|gif|jpeg|webp)/i.test(url)) return null;
  return url;
}

// Parse a link destination starting at i (after '(' or '<' handling).
// Returns {dest, next} or null. Handles <...> and bare (balanced parens, escapes).
function parseLinkDestination(src, i) {
  if (src[i] === '<') {
    let j = i + 1, out = '';
    while (j < src.length) {
      const c = src[j];
      if (c === '\n') return null;
      if (c === '\\' && j + 1 < src.length && /[!-\/:-@\[-`{-~]/.test(src[j + 1])) { out += src[j + 1]; j += 2; continue; }
      if (c === '>') return { dest: out, next: j + 1 };
      if (c === '<') return null;
      out += c; j++;
    }
    return null;
  }
  let j = i, out = '', depth = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\x0b' || c === '\x0c') break;
    if (c === '\\' && j + 1 < src.length && /[!-\/:-@\[-`{-~]/.test(src[j + 1])) { out += src[j + 1]; j += 2; continue; }
    if (c === '(') { depth++; out += c; j++; continue; }
    if (c === ')') {
      if (depth === 0) break;
      depth--; out += c; j++; continue;
    }
    // control chars not allowed
    if (c < ' ' && c !== '\t' && c !== '\n') return null;
    out += c; j++;
  }
  // an empty destination is allowed when it is immediately closed by ')'
  // (e.g. [link]() has an empty href); otherwise an empty dest is invalid
  if (j === i) return src[j] === ')' ? { dest: '', next: j } : null;
  return { dest: out, next: j };
}
// Parse a link title starting at i (after whitespace). Returns {title, next} or null.
function parseLinkTitle(src, i) {
  const q = src[i];
  if (q !== '"' && q !== "'" && q !== '(') return null;
  const close = q === '(' ? ')' : q;
  let j = i + 1, out = '';
  while (j < src.length) {
    const c = src[j];
    if (c === '\\' && j + 1 < src.length && /[!-\/:-@\[-`{-~]/.test(src[j + 1])) { out += src[j + 1]; j += 2; continue; }
    if (c === close) return { title: out, next: j + 1 };
    if (c === '\n') {
      // title may span lines but not blank lines
      if (src[j + 1] === '\n') return null;
    }
    out += c; j++;
  }
  return null;
}

// Normalize a link label for reference lookup: collapse whitespace, casefold.
function normalizeLabel(s) {
  // Unicode case folding: ß and ẞ fold to "ss" (ẞ is the capital sharp s).
  return s.replace(/ß|ẞ/g, 'ss').replace(/\s+/g, ' ').trim().toLowerCase();
}

// does this inline node list contain a (non-image) link anywhere?
function containsLink(nodes) {
  // only explicit (non-autolink) links count: a link text may contain
  // autolinks (<...>, and bare URLs are plain text inside link text) and
  // the outer link still forms; an explicit link inside forbids it.
  for (const nd of nodes) {
    if (nd.k === 'link' && !nd.image && !nd.auto) return true;
    if (nd.children && containsLink(nd.children)) return true;
  }
  return false;
}

function expandLeadingTabs(line) {
  let i = 0, col = 0, out = '';
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    if (line[i] === '\t') { const n = 4 - (col % 4); out += ' '.repeat(n); col += n; }
    else { out += ' '; col++; }
    i++;
  }
  return out + line.slice(i);
}
// ---- Tab expansion ----
// Expand tabs to spaces with tab stops of 4, given the column of the line start.
function expandTabs(line, col0) {
  if (!line.includes('\t')) return line;
  let out = '', col = col0;
  for (let k = 0; k < line.length; k++) {
    const c = line[k];
    if (c === '\t') {
      const n = 4 - (col % 4);
      out += ' '.repeat(n); col += n;
    } else { out += c; col++; }
  }
  return out;
}

// Strip one indented-code indent (marked's codeRemoveIndent): 0-3 spaces + tab,
// or exactly 4 spaces. Returns the stripped line, or null if the line is not
// indented code. Tabs after the indent are preserved (marked keeps them).
function codeIndentStrip(line) {
  const m = /^(?: {0,3}\t| {4})/.exec(line);
  return m ? line.slice(m[0].length) : null;
}

// ================= BLOCK LEXER =================
// Token: {t, ...}. refs: Map normalized label -> {href, title}.

function lexBlocks(src, refs, bqInner, inList) {
  const tokens = [];
  let s = src;
  // normalize line endings
  s = s.replace(/\r\n?/g, '\n');
  // NOTE: no upfront tab expansion here — marked keeps tabs literally inside
  // fenced/indented code and after soft breaks in paragraphs; tabs in leading
  // whitespace are only expanded contextually (list/blockquote stripping and
  // the indented-code indent above), never in code content.
  while (s.length > 0) {
    // blank lines (whitespace-only lines count as blank)
    let m = /^(?:[ \t]*\n)+/.exec(s);
    if (m) { tokens.push({ t: 'space' }); s = s.slice(m[0].length); continue; }
    // fenced code
    m = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\n]*?)[ \t]*(?:\n|$)/.exec(s);
    // only a backtick fence forbids backticks in its info string; a tilde
    // fence's info may contain backticks and tildes.
    if (m && !(m[1][0] === '`' && (m[2] || '').includes('`'))) {
      const fence = m[1], info = m[2] || '';
      const fenceIndent = m[0].match(/^ */)[0].length;
      const rest = s.slice(m[0].length);
      const fenceRe = new RegExp('^ {0,3}' + fence[0] + '{' + fence.length + ',}[ \\t]*(?:\\n|$)', 'ym');
      let codeEndPos = -1, afterPos = rest.length;
      let pos = 0;
      while (pos <= rest.length) {
        fenceRe.lastIndex = pos;
        if (fenceRe.exec(rest)) { codeEndPos = pos; afterPos = fenceRe.lastIndex; break; }
        const nl = rest.indexOf('\n', pos);
        if (nl === -1) break;
        pos = nl + 1;
      }
      let codeText;
      // marked strips the fence indent from content lines ONLY for
      // backtick fences; tilde-fence content keeps its indent whole
      const stripN = fence[0] === '`' ? fenceIndent : 0;
      const stripFenceIndent = (t) => t.split('\n').map(l => {
        // a lazy line inside a fence carries \u0001 markers — strip them
        // (fenced code is raw text, not paragraph content)
        let s = l;
        while (s.charCodeAt(0) === 1) s = s.slice(1);
        let r = 0;
        // strip up to fenceIndent leading whitespace chars (space OR tab —
        // marked counts each as one char here, so a tab inside the indent
        // is removed whole, not expanded)
        while (r < s.length && r < stripN && (s[r] === ' ' || s[r] === '\t')) r++;
        return s.slice(r);
      }).join('\n');
      if (codeEndPos === -1) { codeText = stripFenceIndent(rest); if (codeText.length && !codeText.endsWith('\n')) codeText += '\n'; s = ''; }
      else {
        codeText = stripFenceIndent(codeEndPos > 0 ? rest.slice(0, codeEndPos - 1) : '');
        if (codeText.length && !codeText.endsWith('\n')) codeText += '\n';
        s = rest.slice(afterPos);
        // the closing fence line is consumed whole (fence + optional trailing ws)
      }
      tokens.push({ t: 'code', text: codeText, lang: fence[0] === '`' ? info : info, fenced: true, info });
      continue;
    }
    // indented code (blank lines inside count if followed by an indented line)
    if (/^(?: {4}| {0,3}\t)/.test(s)) {
      const clines = s.split('\n');
      const taken = [];
      let ci = 0, used = 0;
      while (ci < clines.length) {
        // a lazy line inside indented code carries \u0001 markers — strip them
        let cl = clines[ci];
        while (cl.charCodeAt(0) === 1) cl = cl.slice(1);
        const stripped = codeIndentStrip(cl);
        if (stripped !== null) { taken.push(stripped); used += clines[ci].length + 1; ci++; continue; }
        if (cl.trim() === '') {
          let j = ci + 1;
          while (j < clines.length && clines[j].trim() === '') j++;
          if (j < clines.length && codeIndentStrip(clines[j]) !== null) {
            for (let k = ci; k < j; k++) { taken.push(''); used += clines[k].length + 1; }
            ci = j; continue;
          }
        }
        break;
      }
      if (taken.length) {
        let text = taken.join('\n');
        text = text.replace(/\n*$/, '') + '\n';
        tokens.push({ t: 'code', text, lang: '', fenced: false });
        s = s.slice(used);
        continue;
      }
    }
    // ATX heading
    m = /^ {0,3}(#{1,6})(?:[ \t]+([^\n]*?))?[ \t]*(?:\n|$)/.exec(s);
    if (m && (m[2] !== undefined || s[m[0].length - 1] === '\n' || m[0].length === s.length)) {
      let text = (m[2] || '');
      if (/^#+$/.test(text)) text = '';
      else text = text.replace(/[ \t]+#+[ \t]*$/, '');
      text = text.replace(/[ \t]+$/, '');
      tokens.push({ t: 'heading', level: m[1].length, text });
      s = s.slice(m[0].length);
      continue;
    }
    // thematic break
    m = /^ {0,3}((?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*(?:\n|$)/.exec(s);
    if (m) { tokens.push({ t: 'hr' }); s = s.slice(m[0].length); continue; }
    // HTML block
    const htmlBlock = matchHtmlBlock(s);
    if (htmlBlock) { tokens.push({ t: 'html', text: htmlBlock.text }); s = s.slice(htmlBlock.len); continue; }
    // blockquote
    if (/^ {0,3}>/.test(s)) {
      const { inner, len } = collectBlockquote(s);
      tokens.push({ t: 'blockquote', tokens: lexBlocks(inner, refs, true, inList) });
      s = s.slice(len);
      continue;
    }
    // list
    const listMatch = matchList(s, refs);
    if (listMatch) {
      tokens.push(listMatch.token);
      s = s.slice(listMatch.len);
      continue;
    }
    // table (header + delimiter)
    const tableMatch = matchTable(s);
    if (tableMatch) { tokens.push(tableMatch.token); s = s.slice(tableMatch.len); continue; }
    // paragraph (with link ref defs and setext heading)
    const para = lexParagraph(s, refs, bqInner, inList);
    if (para) {
      for (const tk of para.tokens) tokens.push(tk);
      s = s.slice(para.len);
      continue;
    }
    // fallback: single line as text
    const nl = s.indexOf('\n');
    const line = nl === -1 ? s : s.slice(0, nl + 1);
    tokens.push({ t: 'paragraph', text: line.replace(/\n$/, '') });
    s = s.slice(line.length);
  }
  return tokens;
}

// ---- HTML block (types 1-7) ----
const HTML_BLOCK_START = [
  // 1: script, pre, style, textarea
  [/^ {0,3}<(script|pre|style|textarea)([\s>]|$)/i, /<\/(script|pre|style|textarea)>/i],
  // 2: <!-- comment -->
  [/^ {0,3}<!--/, /-->/],
  // 3: <? ... ?>
  [/^ {0,3}<\?/, /\?>/],
  // 4: <!A-Z ... >
  [/^ {0,3}<![A-Z]/, />/],
  // 5: <![CDATA[ ... ]]>
  [/^ {0,3}<!\[CDATA\[/, /\]\]>/],
  // 6: block-level tags
  [/^ {0,3}<\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)([\s>\/]|$)/i, null],
  // 7: open tag / close tag on its own line (not complete) — must be a VALID
  // tag (well-formed attributes; closing tags take no attributes)
  [/^ {0,3}(?:<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^ \t\n\r"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>|<\/[A-Za-z][A-Za-z0-9-]*\s*>)/, null],
];
// HTML block raw text: strip trailing newlines, then keep exactly one if the
// line following the block is not blank. For block types 1-5 (script/pre/
// style/textarea, comment, <?, <!letter, CDATA) marked's regex consumes only
// newlines after the end marker, so a whitespace-only line after the block
// does NOT count as blank (the single trailing newline survives marked's
// ge() trim); only a truly empty next line drops it. For types 6-7 (block
// tags, single tag) the regex consumes blank lines including whitespace-only
// ones, so any whitespace-only next line drops the newline.
function htmlBlockText(s, len, type) {
  let t = s.slice(0, len).replace(/\n+$/, '');
  const rest = s.slice(len);
  let nextBlank = false;
  if (rest.length > 0) {
    const nl = rest.indexOf('\n');
    const nextLine = nl === -1 ? rest : rest.slice(0, nl);
    nextBlank = type <= 4 ? nextLine === '' : nextLine.trim() === '';
  }
  if (!nextBlank && s.slice(0, len).endsWith('\n')) t += '\n';
  return t;
}
function matchHtmlBlock(s) {
  for (let type = 0; type < 7; type++) {
    const [startRe, endRe] = HTML_BLOCK_START[type];
    if (!startRe.test(s)) continue;
    if (type === 5) {
      // type 6 (index 5): ends at blank line
      const lines = s.split('\n');
      let len = 0, i = 0;
      for (; i < lines.length; i++) {
        if (lines[i].trim() === '' && i > 0) break;
        len += lines[i].length + 1;
      }
      return { text: htmlBlockText(s, len, type), len, type: type + 1 };
    }
    if (type === 6) {
      // type 7: a complete open/close tag alone on a line; the block then
      // continues until a blank line (raw HTML, no markdown parsing).
      const lines = s.split('\n');
      const mm = /^ {0,3}((?:<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^ \t\n\r"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>|<\/[A-Za-z][A-Za-z0-9-]*\s*>))[ \t]*$/.exec(lines[0]);
      if (!mm) continue;
      let len = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '' && i > 0) break;
        len += lines[i].length + 1;
      }
      return { text: htmlBlockText(s, len, type), len, type: 7 };
    }
    // types 1-5: consume until the end marker line (inclusive); blank lines
    // do NOT end these blocks — only the end marker or end of input does.
    const lines = s.split('\n');
    let len = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      len += line.length + 1;
      if (endRe.test(line)) break;
    }
    return { text: htmlBlockText(s, len, type), len, type: type + 1 };
  }
  return null;
}

// A line that opens a fenced code block. A backtick fence forbids backticks
// in its info string, so "```inner backticks```" is paragraph text, not a
// fence; a tilde fence's info may contain backticks.
function isFenceOpen(line) {
  const m = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\n]*?)[ \t]*$/.exec(line);
  return !!m && !(m[1][0] === '`' && m[2].includes('`'));
}

function startsBlock(line) {
  if (/^ {0,3}#{1,6}(?:[ \t]+|$)/.test(line)) return true;
  if (isFenceOpen(line)) return true;
  if (/^ {0,3}((?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*$/.test(line)) return true;
  if (/^ {0,3}>/.test(line)) return true;
  const lm = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(line);
  if (lm) {
    if (!/\d/.test(lm[1][0])) return true;
    if (parseInt(lm[1], 10) === 1) return true;
  }
  const hb = matchHtmlBlock(line + '\n');
  if (hb && hb.type <= 6) return true;
  return false;
}

// Track fenced-code state while collecting block lines: given the current
// fence (or null) and a stripped content line, return the new state — the
// line opens a fence (returned as {ch, len}), closes the open one (null), or
// leaves it unchanged. A lazy line inside a fence ends the enclosing block
// (marked renders the fence unclosed and the line as a new top-level block).
function fenceTrack(fence, line) {
  const fm = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\n]*?)[ \t]*$/.exec(line);
  if (!fm) return fence;
  if (fence) {
    // a closing fence must have NO info string (only spaces/tabs after the
    // run) — e.g. ```inner backticks``` is fence CONTENT, not a close
    if (fm[1][0] === fence.ch && fm[1].length >= fence.len && !(fm[2] || '').trim()) return null;
    return fence;
  }
  if (fm[1][0] === '`' && (fm[2] || '').includes('`')) return fence;
  return { ch: fm[1][0], len: fm[1].length };
}

// ---- Blockquote collection ----
function collectBlockquote(s) {
  const lines = s.split('\n');
  const inner = [];
  let len = 0;
  let i = 0;
  let fence = null;
  let lastWasFence = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const m = /^ {0,3}>/.exec(line);
    if (m) {
      // strip '>' then expand leading tabs from the column after '>', then drop one optional space
      const colAfter = m[0].length; // leading spaces + '>'
      let rest = line.slice(m[0].length);
      // expand leading tabs of rest from colAfter
      let col = colAfter, p = 0, expanded = '';
      while (p < rest.length && (rest[p] === ' ' || rest[p] === '\t')) {
        if (rest[p] === '\t') { const n2 = 4 - (col % 4); expanded += ' '.repeat(n2); col += n2; }
        else { expanded += ' '; col++; }
        p++;
      }
      rest = expanded + rest.slice(p);
      if (rest.startsWith(' ')) rest = rest.slice(1);
      const newFence = fenceTrack(fence, rest);
      lastWasFence = newFence !== fence;
      fence = newFence;
      inner.push(rest);
      len += line.length + 1;
      continue;
    }
    // lazy continuation: only if last inner line is part of a paragraph (non-blank)
    // and the line does not start a new block (ATX, fence, hr, blockquote, list, html, setext)
    if (line.trim() === '') break;
    if (startsBlock(line)) break;
    // a lazy line inside a fenced code block ends the blockquote (and the
    // fence, which renders unclosed) — it is not fence content
    if (fence) break;
    const last = inner[inner.length - 1];
    if (last !== undefined && last.trim() !== '') {
      // no lazy continuation after an indented-code line or a real fence
      // line (one that opened or closed a fence). A fence-looking line that
      // is NOT a valid fence (e.g. ```x``` — backtick info may not contain
      // backticks) is paragraph text, so a lazy line may continue it.
      if (/^ {4}/.test(last) || lastWasFence) break;
      // a lazy '===' line is paragraph text (not a setext underline): indent it 4 spaces
      if (/^ {0,3}=+[ \t]*$/.test(line)) inner.push('    ' + line.trim());
      // lazy line: keep its leading whitespace (minus one indent level)
      // and mark with \u0001 so the paragraph lexer treats it as paragraph
      // text (never a new block)
      else inner.push('\u0001' + lazyStrip(line));
      len += line.length + 1;
      continue;
    }
    break;
  }
  return { inner: inner.join('\n'), len };
}

// Remove n columns of leading whitespace. Tabs are expanded to spaces using
// their ORIGINAL columns first, so a tab after the stripped region keeps its
// visual width (a tab straddling the boundary becomes spaces).
function stripColumns(line, n, col0) {
  let col = col0 || 0, p = 0, expanded = '';
  while (p < line.length && (line[p] === ' ' || line[p] === '\t')) {
    if (line[p] === '\t') { const adv = 4 - (col % 4); expanded += ' '.repeat(adv); col += adv; }
    else { expanded += ' '; col++; }
    p++;
  }
  const rest = line.slice(p);
  if (n >= expanded.length) return rest;
  return expanded.slice(n) + rest;
}

// Column width of a whitespace string starting at column col0 (tabs expand
// to the next multiple of 4).
function wsColumnWidth(ws, col0) {
  let col = col0;
  for (let k = 0; k < ws.length; k++) {
    if (ws[k] === '\t') col += 4 - (col % 4);
    else col++;
  }
  return col - col0;
}

// A lazy continuation line keeps its leading whitespace, except one full
// indent level (4 columns, tab-aware) is removed when present: 1-3 spaces
// stay, 4 spaces vanish, 5 keep 1, 8 keep 4, a tab vanishes.
function lazyStrip(line) {
  const ws = line.match(/^[ \t]*/)[0];
  if (wsColumnWidth(ws, 0) < 4) return line;
  return stripColumns(line, 4, 0);
}

// ---- List matching ----
function matchList(s, refs) {
  // check the first line BEFORE splitting: most calls are not lists at all,
  // and splitting the whole remaining source for each of them is the
  // dominant cost of this function on long documents.
  const firstNl = s.indexOf('\n');
  const firstLine = firstNl === -1 ? s : s.slice(0, firstNl);
  if (!/^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.test(firstLine)) return null;
  const lines = s.split('\n');
  const first = lines[0];
  const m = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(first);
  if (!m) return null;
  const bullet = m[1];
  const ordered = /\d/.test(bullet[0]);
  // item indent: leading spaces + marker width + spaces after (1-4); if 5+ spaces, indent is marker+1

  // blank item check: if the item is empty and next line is not indented, it's still an item
  const start = ordered ? parseInt(bullet, 10) : null;
  let contentIndent = 0;
  const items = [];
  let i = 0;
  let len = 0;
  let loose = false;
  let prevBlank = false;
  while (i < lines.length) {
    const line = lines[i];
    if (/^ {0,3}((?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*$/.test(line)) break; // thematic break ends the list
    const mm = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(line);
    const isSameMarker = mm && ((ordered && /\d/.test(mm[1][0]) && mm[1].slice(-1) === bullet.slice(-1)) || (!ordered && mm[1] === bullet));
    if (i > 0) {
      if (!mm) {
        // not a new item: check if it's a continuation (indented) or blank or lazy
        if (line.trim() === '') {
          // blank line: could be between items or inside an item; look ahead
          // peek: if next non-blank line is a new item at same level, this blank ends the item
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length) {
            const nm = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(lines[j]);
            // a marker only starts a NEW sibling item if it is indented LESS
            // than the item's content indent; at/after contentIndent it is
            // nested content of the current item (e.g. a sub-list after a blank)
            const nind = wsColumnWidth(lines[j].match(/^[ \t]*/)[0], 0);
            if (nm && nind < contentIndent && ((ordered && /\d/.test(nm[1][0]) && nm[1].slice(-1) === bullet.slice(-1)) || (!ordered && nm[1] === bullet))) {
              // blank line(s) then a new item: list continues; mark loose if blank between items
              loose = true;
              for (let k = i; k < j; k++) len += lines[k].length + 1;
              i = j;
              continue;
            }
          }
          // blank inside item (or end of list)
          // if more content follows indented, it's part of the item
          let j2 = i + 1;
          while (j2 < lines.length && lines[j2].trim() === '') j2++;
          if (j2 >= lines.length) break;
          const nextLine = lines[j2];
          const indent = wsColumnWidth(nextLine.match(/^[ \t]*/)[0], 0);
          if (indent >= contentIndent) {
            // blank line inside item
            prevBlank = true;
            i++;
            continue;
          }
          break;
        }
        const indent = wsColumnWidth(line.match(/^[ \t]*/)[0], 0);
        if (indent >= contentIndent) {
          // continuation line of current item
          i++;
          continue;
        }
        // lazy paragraph continuation: if current item's content ends with paragraph text
        // (approximate: if the last item line is non-blank and not a code fence etc.)
        // We treat a non-blank, non-indented line as lazy if the item has paragraph content.
        // To be safe, only allow lazy if the item's last non-blank line is paragraph-like.
        break;
      }
      if (!isSameMarker) break;
    }
    if (!mm) break;
    // start a new item (indent computed from THIS item's line)
    if (i > 0 && prevBlank) loose = true;
    prevBlank = false;
    const itemLines = [];
    const leading = line.match(/^ */)[0].length;
    const markerLen = mm[1].length;
    const afterMarker = mm[2];
    const spacesAfter = afterMarker.length;
    const lineAfterMarker = line.slice(leading + markerLen);
    if (lineAfterMarker.trim() === '') contentIndent = leading + markerLen + 1;
    else if (spacesAfter === 0) contentIndent = leading + markerLen + 1;
    else if (wsColumnWidth(afterMarker, leading + markerLen) >= 5) contentIndent = leading + markerLen + 1;
    else contentIndent = leading + markerLen + wsColumnWidth(afterMarker, leading + markerLen);
    // first line: strip the marker, then whitespace columns starting at the marker column
    const afterMarkerText = line.slice(leading + markerLen);
    const rest = stripColumns(afterMarkerText, contentIndent - leading - markerLen, leading + markerLen);
    let fence = fenceTrack(null, rest);
    // a fence that just opened has no content yet: its first non-blank
    // content line must be indented to the item (marked leaves the fence
    // empty and ends the item when that line is unindented)
    let fenceHasContent = false;
    itemLines.push(rest);
    len += line.length + 1;
    i++;
    // collect continuation lines
    const itemEmpty = itemLines.length === 1 && itemLines[0].trim() === '';
    while (i < lines.length) {
      const cl = lines[i];
      if (cl.trim() === '') {
        if (itemEmpty) break; // empty item ends at a blank line
        // peek ahead
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j >= lines.length) { i = j; break; }
        const nm = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(lines[j]);
        // same as the outer peek: only a marker indented LESS than the
        // content indent starts a new sibling item after a blank line
        const nind = wsColumnWidth(lines[j].match(/^[ \t]*/)[0], 0);
        if (nm && nind < contentIndent && ((ordered && /\d/.test(nm[1][0]) && nm[1].slice(-1) === bullet.slice(-1)) || (!ordered && nm[1] === bullet))) {
          // new item after blank
          break;
        }
        const ind = wsColumnWidth(lines[j].match(/^[ \t]*/)[0], 0);
        if (ind >= contentIndent) {
          // blank lines inside item
          for (let k = i; k < j; k++) { itemLines.push(''); len += lines[k].length + 1; }
          i = j;
          continue;
        }
        break;
      }
      const nm = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(cl);
      const ind = wsColumnWidth(cl.match(/^[ \t]*/)[0], 0);
      if (nm && ind < contentIndent) break; // any list marker at top level ends the item
      if (ind >= contentIndent) {
        // strip contentIndent columns (tab-aware: a tab straddling the
        // boundary becomes spaces, a tab past it keeps its visual width)
        const stripped = stripColumns(cl, contentIndent, 0);
        const wasFence = fence;
        fence = fenceTrack(fence, stripped);
        if (fence && !wasFence) fenceHasContent = false; // just opened
        else if (fence && wasFence) fenceHasContent = true; // content line
        itemLines.push(stripped);
        len += cl.length + 1;
        i++;
        continue;
      }
      // lazy line: include if item's last line is paragraph text and line starts no new block.
      // A lazy line while a fenced code block is open IS fence content
      // (marked keeps it in the code, e.g. an unindented line inside a
      // fence in a list item) — but only once the fence has content: if
      // the fence just opened and its first content line is unindented,
      // marked leaves the fence empty and ends the item instead, so the
      // line (and the fence's closing line, which then opens a new
      // top-level code block) is parsed at top level.
      if (startsBlock(cl)) break;
      if (fence) {
        if (!fenceHasContent) break; // fresh fence: first content line must be indented
        const stripped = stripColumns(cl, contentIndent, 0);
        fence = fenceTrack(fence, stripped);
        itemLines.push(stripped);
        len += cl.length + 1;
        i++;
        continue;
      }
      const lastNonBlank = [...itemLines].reverse().find(l => l.trim() !== '');
      // no lazy continuation after a code/fence line: the item's last block
      // is a code block, not a paragraph (marked ends the item instead)
      if (lastNonBlank !== undefined && lastNonBlank.trim() !== '' && !/^ {4}/.test(lastNonBlank) && !/^ {0,3}(`{3,}|~{3,})/.test(lastNonBlank)) {
        itemLines.push('\u0001' + lazyStrip(cl));
        len += cl.length + 1;
        i++;
        continue;
      }
      break;
    }
    // strip trailing blank lines from item
    while (itemLines.length && itemLines[itemLines.length - 1].trim() === '') itemLines.pop();
    // strip leading blank lines (an empty marker line must not make the list loose)
    while (itemLines.length > 1 && itemLines[0].trim() === '') itemLines.shift();
    items.push(itemLines.join('\n'));
  }
  // loose check: blank lines between items (tracked above), or an item whose own
  // top-level blocks are separated by a blank line (a 'space' token between blocks)
  // (handled after lexing each item below)
  const token = { t: 'list', ordered, start: ordered ? start : null, loose, items: [] };
  for (const it of items) {
    // task list: [ ] or [x] at start
    let task = null, checked = false, content = it;
    const tm = /^\[([ xX])\] /.exec(it);
    if (tm) { task = true; checked = tm[1] !== ' '; content = it.slice(tm[0].length); }
    const sub = lexBlocks(content, refs, false, true);
    if (sub.some((t) => t.t === 'space')) loose = true;
    token.items.push({ task, checked, tokens: sub });
  }
  token.loose = loose;
  return { token, len };
}

// ---- Table ----
function splitTableRow(row) {
  // split on | not escaped, trim leading/trailing pipe.
  // An escaped pipe \| becomes a literal | in the cell (backslash dropped);
  // an escaped backslash \\ stays, and the following | still splits.
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) {
    // trailing pipe is a delimiter unless escaped (odd run of backslashes before it)
    let bs = 0;
    for (let k = s.length - 2; k >= 0 && s[k] === '\\'; k--) bs++;
    if (bs % 2 === 0) s = s.slice(0, -1);
  }
  const cells = [];
  let cur = '';
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '\\' && k + 1 < s.length) {
      const nx = s[k + 1];
      if (nx === '|') { cur += '|'; k++; continue; }
      if (nx === '\\') { cur += '\\\\'; k++; continue; }
      cur += '\\'; continue;
    }
    if (c === '|') { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}
function matchTable(s) {
  // check the first two lines BEFORE splitting: most calls are not tables.
  const nl1 = s.indexOf('\n');
  if (nl1 === -1) return null;
  const header0 = s.slice(0, nl1);
  if (!header0.includes('|')) return null;
  const nl2 = s.indexOf('\n', nl1 + 1);
  const delim0 = nl2 === -1 ? s.slice(nl1 + 1) : s.slice(nl1 + 1, nl2);
  const delimCells0 = splitTableRow(delim0);
  if (delimCells0.length === 0) return null;
  for (const dc of delimCells0) {
    if (!/^:?-+:?$/.test(dc.trim())) return null;
  }
  const lines = s.split('\n');
  if (lines.length < 2) return null;
  const header = lines[0];
  const delim = lines[1];
  const delimCells = splitTableRow(delim);
  if (delimCells.length === 0) return null;
  const align = [];
  for (const dc of delimCells) {
    const d = dc.trim();
    if (!/^:?-+:?$/.test(d)) return null;
    align.push(d.startsWith(':') && d.endsWith(':') ? 'center' : d.endsWith(':') ? 'right' : d.startsWith(':') ? 'left' : null);
  }
  const headerCells = splitTableRow(header);
  if (headerCells.length !== delimCells.length) {
    // marked allows header cell count to differ? No — must match for a table.
    // Actually marked's table requires same count; if not, not a table.
    return null;
  }
  const rows = [];
  let len = lines[0].length + 1 + lines[1].length + 1;
  let i = 2;
  for (; i < lines.length; i++) {
    const line = lines[i];
    // a line of 0-3 spaces + exactly one tab (and a following newline)
    // is an EMPTY table row in marked — the table continues after it.
    // Spaces-only lines, two tabs, or a trailing tab do NOT count.
    if (/^ {0,3}\t$/.test(line) && i < lines.length - 1) {
      rows.push(['']);
      len += line.length + 1;
      continue;
    }
    if (line.trim() === '') break;
    // a line that starts a new block (blockquote, heading, list, fence,
    // hr, HTML block, indented code) ends the table; setext underlines and
    // plain lines are table rows.
    if (startsBlock(line) || /^(?: {4}| {0,3}\t)/.test(line)) break;
    rows.push(splitTableRow(line));
    len += line.length + 1;
  }
  return { token: { t: 'table', header: headerCells, align, rows }, len };
}

// ---- Paragraph (with link ref defs + setext) ----
function lexParagraph(s, refs, bqInner, inList) {
  // Lazy line access: splitting the whole remaining source on every
  // paragraph is the dominant cost of this function on long documents.
  // Lines are materialised only up to the paragraph end.
  const lines = [];
  let spos = 0;
  const getLine = (idx) => {
    while (lines.length <= idx) {
      if (spos >= s.length) return undefined;
      const nl = s.indexOf('\n', spos);
      if (nl === -1) { lines.push(s.slice(spos)); spos = s.length; }
      else { lines.push(s.slice(spos, nl)); spos = nl + 1; }
    }
    return lines[idx];
  };
  const paraLines = [];
  let len = 0;
  let i = 0;
  // collect paragraph lines
  while (true) {
    const line = getLine(i);
    if (line === undefined) break;
    // a lazy line (marked \u0001 by collectBlockquote/matchList — one marker
    // per nesting level) is paragraph text: strip ALL leading markers and
    // never treat it as a block interruption
    if (line.charCodeAt(0) === 1) {
      let k = 0;
      while (line.charCodeAt(k) === 1) k++;
      paraLines.push(line.slice(k)); len += line.length + 1; i++; continue;
    }

    // Inside a blockquote, a whitespace-only line that is NON-EMPTY (e.g. a
    // single space left after stripping '> ') is paragraph content, not a
    // blank line; only a truly empty line breaks the paragraph. At top level
    // (and in lists) any whitespace-only line is blank.
    if (line.trim() === '' && !(bqInner && line.length > 0)) break;
    // can this line start a new block that interrupts a paragraph?
    if (i > 0) {
      if (/^ {0,3}#{1,6}(?:[ \t]+|$)/.test(line)) break; // ATX
      if (isFenceOpen(line)) break; // fence (invalid backtick info = text)
      if (/^ {0,3}(=+|-+)[ \t]*$/.test(line)) {
        // setext heading (checked before hr: --- after a paragraph is a heading)
        // strip any leading link ref defs from the heading text first
        let htext = paraLines.join('\n').trim();
        while (true) {
          const stripped = htext.replace(/^ {0,3}/, '');
          const def = matchLinkDef(stripped);
          if (!def) break;
          if (!refs.has(def.label)) refs.set(def.label, { href: def.href, title: def.title });
          htext = def.rest.replace(/^\n+/, '');
        }
        if (htext.trim() === '') {
          // no heading text left: the === line is paragraph text, not a setext underline
          paraLines.push(line);
          len += line.length + 1;
          i++;
          continue;
        }
        const level = line.trim()[0] === '=' ? 1 : 2;
        len += line.length + 1;
        return { tokens: [{ t: 'heading', level, text: htext.trim() }], len };
      }
      if (/^ {0,3}((?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})[ \t]*$/.test(line)) break; // hr
      if (/^ {0,3}>/.test(line)) break; // blockquote
      {
        const hb = matchHtmlBlock(line + '\n');
        if (hb && hb.type <= 6) break; // html blocks types 1-6 interrupt; type 7 and other closing tags do not
      }
      // list: can interrupt if it's a bullet list, or ordered starting with 1.
      // An EMPTY list item (marker alone, no content after it and no indented
      // content on the next line) cannot interrupt a paragraph.
      const lm = /^ {0,3}([*+-]|\d{1,9}[.)])([ \t]+|$)/.exec(line);
      if (lm) {
        const leading = line.match(/^ */)[0].length;
        const contentIndent = leading + lm[1].length + 1;
        let nonEmpty = line.slice(lm[0].length).trim() !== '';
        if (!nonEmpty) {
          const nx = getLine(i + 1);
          if (nx !== undefined) nonEmpty = nx.trim() !== '' && wsColumnWidth(nx.match(/^[ \t]*/)[0], 0) >= contentIndent;
        }
        if (nonEmpty) {
          if (!/\d/.test(lm[1][0])) break;
          // inside a list item, an ordered list with any start number can
          // interrupt a paragraph (nested list); at top level only start==1.
          if (inList || parseInt(lm[1], 10) === 1) break;
        }
      }
      // table delimiter: if previous line + this line form a table, stop paragraph here
      // (handled after: if this line is a delimiter row, the paragraph is a table header)

    }
    paraLines.push(line);
    len += line.length + 1;
    i++;
  }
  if (paraLines.length === 0) return null;
  let text = paraLines.join('\n');
  // link reference definitions at the start (may span multiple lines)
  const tokens = [];
  let rest = text;
  while (true) {
    const stripped = rest.replace(/^ {0,3}/, '');
    const def = matchLinkDef(stripped);
    if (!def) break;
    if (!refs.has(def.label)) refs.set(def.label, { href: def.href, title: def.title });
    rest = def.rest;
    if (rest === '') { return { tokens, len }; }
    // defs must be at the start of the paragraph; after a def, more defs or paragraph text
    rest = rest.replace(/^\n+/, '');
  }
  if (rest.trim() !== '') tokens.push({ t: 'paragraph', text: rest });
  return { tokens, len };
}

// Match a link reference definition at the start of `text`.
// Returns {label, href, title, rest} or null.
function matchLinkDef(text) {
  // [label]:  (dest)  "title"   — dest and title may be on following lines
  let i = 0;
  if (text[i] !== '[') return null;
  // find matching ] (with escapes, no nested unescaped [ unless balanced)
  let j = 1, depth = 1, label = '';
  while (j < text.length) {
    const c = text[j];
    if (c === '\\' && j + 1 < text.length) { label += text[j] + text[j + 1]; j += 2; continue; }
    if (c === '[') depth++;
    if (c === ']') { depth--; if (depth === 0) break; }
    if (c === '\n') {
      // label can't span blank line; allow single newline inside label? CommonMark allows label to span lines
      // but not blank lines. We allow it.
    }
    label += c; j++;
  }
  if (j >= text.length || text[j] !== ']') return null;
  // a label containing an unescaped [ is invalid (no link definition)
  if (label.replace(/\\./g, '').includes('[')) return null;
  j++;
  if (text[j] !== ':') return null;
  j++;
  // skip whitespace/newlines (up to 3 spaces then optional newline, but not blank line)
  let k = j;
  let spaces = 0;
  while (k < text.length && (text[k] === ' ' || text[k] === '\t')) { k++; spaces++; }
  if (k < text.length && text[k] === '\n') {
    // newline allowed if next line isn't blank
    if (text[k + 1] === '\n') return null;
    k++;
    while (k < text.length && (text[k] === ' ' || text[k] === '\t')) k++;
  }
  // destination
  const d = parseLinkDestination(text, k);
  if (!d) return null;
  let href = d.dest;
  k = d.next;
  // skip spaces/tabs on the destination line
  let hadWS = false;
  while (k < text.length && (text[k] === ' ' || text[k] === '\t')) { k++; hadWS = true; }
  let title = null;
  // find the title start (same line, or the next line if only whitespace separates)
  let titleStart = -1, titleOnNextLine = false;
  if (k < text.length && (text[k] === '"' || text[k] === "'" || text[k] === '(')) {
    if (hadWS) titleStart = k;
  } else if (k < text.length && text[k] === '\n') {
    let t = k + 1;
    while (t < text.length && (text[t] === ' ' || text[t] === '\t')) t++;
    if (t < text.length && (text[t] === '"' || text[t] === "'" || text[t] === '(')) { titleStart = t; titleOnNextLine = true; }
  }
  let destEnd = k; // end of the destination (before any title)
  if (titleStart !== -1) {
    const tp = parseLinkTitle(text, titleStart);
    if (tp) {
      let e = tp.next;
      while (e < text.length && (text[e] === ' ' || text[e] === '\t')) e++;
      if (e >= text.length || text[e] === '\n') {
        title = tp.title; k = tp.next;
      } else if (titleOnNextLine) {
        // title invalid (trailing junk): discard it; the def ends after the destination
        k = destEnd;
      } else {
        return null;
      }
    }
  }
  // after title (or destination): only spaces then newline or end
  let e = k;
  while (e < text.length && (text[e] === ' ' || text[e] === '\t')) e++;
  if (e < text.length && text[e] !== '\n') return null;
  const norm = normalizeLabel(label);
  if (norm === '') return null;
  const rest = e < text.length ? text.slice(e + 1) : '';
  return { label: norm, href, title, rest };
}

// ================= INLINE =================
// Flat node list; emphasis resolved by delimiter-stack algorithm.

function canOpenDelim(ch, before, after) {
  const afterWS = after === '' || isWhitespace(after);
  const beforeWS = before === '' || isWhitespace(before);
  const afterPunct = after !== '' && isUnicodePunct(after);
  const beforePunct = before !== '' && isUnicodePunct(before);
  const leftFlank = !afterWS && (!afterPunct || beforeWS || beforePunct);
  const rightFlank = !beforeWS && (!beforePunct || afterWS || afterPunct);
  if (ch === '*') return leftFlank;
  // '_'
  return leftFlank && (!rightFlank || beforePunct);
}
function canCloseDelim(ch, before, after) {
  const afterWS = after === '' || isWhitespace(after);
  const beforeWS = before === '' || isWhitespace(before);
  const afterPunct = after !== '' && isUnicodePunct(after);
  const beforePunct = before !== '' && isUnicodePunct(before);
  const leftFlank = !afterWS && (!afterPunct || beforeWS || beforePunct);
  const rightFlank = !beforeWS && (!beforePunct || afterWS || afterPunct);
  if (ch === '*') return rightFlank;
  return rightFlank && (!leftFlank || afterPunct);
}

// Scan for the matching ']' of a link text starting at i (text[i]=='[').
// Returns {text, next} where next is the index after ']', or null.
function scanLinkText(src, i) {
  // Recursive backtracking scan of a link label, mirroring marked's
  // _inlineLabel regex. At a backtick run the code-span alternative (the
  // next run of any length) is tried FIRST; only if the label cannot
  // close after it does the scan backtrack to the 2+-run-before-']'
  // alternative. The greedy version failed doc-33: a `` run right before
  // ']' was swallowed by the code-span reading into the next line, so the
  // label never closed; marked backtracks and the link forms.
  function scan(j, depth, out) {
    while (j < src.length) {
      const c = src[j];
      if (c === '\\' && j + 1 < src.length && isPunct(src[j + 1])) { out += src[j] + src[j + 1]; j += 2; continue; }
      if (c === '`') {
        let k = j, run = 0;
        while (src[k] === '`') { run++; k++; }
        // alt 3: code span to the next backtick run (any length)
        let close = -1, closeRun = 0;
        for (let p = k; p < src.length; p++) {
          if (src[p] === '`') {
            let r2 = 0; while (src[p + r2] === '`') r2++;
            close = p; closeRun = r2; break;
          }
        }
        if (close !== -1) {
          const r = scan(close + closeRun, depth, out + src.slice(j, close + closeRun));
          if (r) return r;
        }
        // alt 4: a run of 2+ backticks immediately before ']'
        if (run >= 2 && src[k] === ']') {
          const r = scan(k, depth, out + '`'.repeat(run));
          if (r) return r;
        }
        return null;
      }
      // a <...> autolink or HTML tag: brackets inside it do not close the link text
      if (c === '<') {
        Y_ANGLE_SCHEME.lastIndex = j;
        let am = Y_ANGLE_SCHEME.exec(src);
        if (!am) { Y_ANGLE_EMAIL.lastIndex = j; am = Y_ANGLE_EMAIL.exec(src); }
        if (am) { out += am[0]; j += am[0].length; continue; }
        Y_ANGLE_TAG.lastIndex = j;
        const tm = Y_ANGLE_TAG.exec(src);
        if (tm) { out += tm[0]; j += tm[0].length; continue; }
      }
      if (c === '[') { depth++; out += c; j++; continue; }
      if (c === ']') {
        depth--;
        if (depth === 0) return { text: out, next: j + 1 };
        out += c; j++; continue;
      }
      out += c; j++;
    }
    return null;
  }
  return scan(i + 1, 1, '');
}

// Find a "masked link span" [ ... ]( ... ) starting at i (text[i]=='['),
// per marked's blockSkip: the label is scanned with code spans skipped by
// exact backtick-run matching (so a code span holding a backtick does not
// end the label early), then a balanced-paren destination must follow.
// Returns the index just past the closing ')' or -1. Marked hides such a
// span from its emphasis-closer search (its emStrong mask replaces the
// whole span with [aaa...]), so emphasis delimiters inside it cannot act
// as closers — e.g. [but _x `` a ` b ``_](url) is not a link, and the _
// inside it must stay literal. Only used when the real link did not form.
// Code spans as marked's emStrong mask sees them (its blockSkip pattern):
// a left-to-right scan of backtick runs — a run opens a span when a later
// run of the same length follows with only non-backtick chars between.
// Unlike the real code-span scan, this runs over the whole inline text,
// so a run inside a link's label that never closes there (e.g. an
// unclosed `` in `[d ``e`](...)`) pairs with the opening backtick of a
// later real code span, hiding everything between from the emphasis scan
// (doc-28: `__issues most__` is swallowed, so no strong forms there).
// A run preceded by an odd number of backslashes is an escape (marked
// neutralises it to `++` in its mask step before blockSkip runs), so it
// can neither open nor close a span.
function maskCodeSpans(text) {
  const spans = [];
  const n = text.length;
  const isEscaped = (pos) => {
    let b = 0;
    for (let q = pos - 1; q >= 0 && text[q] === '\\'; q--) b++;
    return b % 2 === 1;
  };
  let i = 0;
  while (i < n) {
    if (text[i] !== '`') { i++; continue; }
    let run = 0; while (text[i + run] === '`') run++;
    if (isEscaped(i)) { i += run; continue; }
    let close = -1;
    for (let p = i + run; p < n; p++) {
      if (text[p] === '`') {
        let r2 = 0; while (text[p + r2] === '`') r2++;
        // A closer run may itself be escaped: marked's mask regex matches
        // the code span (opening run + content + closing run) before the
        // escape inside it is ever processed, so an escaped backtick still
        // closes. Only the opener is blocked by an escape (the `\`` is
        // consumed as an escape at the backslash position first).
        if (r2 === run) { close = p; break; }
        p += r2 - 1;
      }
    }
    if (close === -1) { i += run; continue; }
    spans.push([i, close + run]);
    i = close + run;
  }
  return spans;
}

function findMaskedSpan(text, i) {
  const n = text.length;
  let j = i + 1;
  while (j < n) {
    const c = text[j];
    if (c === '`') {
      // code span (after marked's inner-backtick neutralisation): opening
      // run, content that starts and ends with a non-backtick char, and a
      // closing run equal to the opening run. A run that cannot close this
      // way blocks the label entirely (it is not literal text here).
      let run = 0; while (text[j + run] === '`') run++;
      let close = -1;
      for (let p = j + run; p < n; p++) {
        if (text[p] === '`') {
          let r2 = 0; while (text[p + r2] === '`') r2++;
          if (r2 === run) {
            const content = text.slice(j + run, p);
            if (content.length > 0 && content[0] !== '`' && content[content.length - 1] !== '`') { close = p; break; }
          }
          p += r2 - 1;
        }
      }
      if (close === -1) return -1;
      j = close + run; continue;
    }
    if (c === '[') return -1;
    if (c === ']') break;
    j++;
  }
  if (j >= n || text[j] !== ']' || text[j + 1] !== '(') return -1;
  let k = j + 2, d = 1;
  while (k < n) {
    const c = text[k];
    if (c === '\\' && k + 1 < n) { k += 2; continue; }
    if (c === '(') d++;
    if (c === ')') { d--; if (d === 0) return k + 1; }
    k++;
  }
  return -1;
}

// Trim a GFM extended autolink: strip a trailing entity-shaped suffix
// (&name; / &#123; / &#x1a;), trailing punctuation, and unbalanced closing
// parens — repeat until stable.
function trimAutolink(url) {
  let prev;
  do {
    prev = url;
    url = url.replace(/&[A-Za-z][A-Za-z0-9]*;$|&#[0-9]+;$|&#[xX][0-9a-fA-F]+;$/, '');
    url = url.replace(/[?!.,:;*_~]+$/, '');
    let open = 0, close = 0;
    for (let k = 0; k < url.length; k++) { if (url[k] === '(') open++; else if (url[k] === ')') close++; }
    if (url.endsWith(')') && close > open) url = url.slice(0, -1);
  } while (url !== prev);
  return url;
}

// marked's GFM bare-URL backpedal (its inline _backpedal rule): a bare
// scheme:// or www. URL keeps a '(' only as part of a balanced (...) group
// with no ')' inside, and drops a trailing entity-shaped suffix, trailing
// punctuation, and unbalanced closing parens — one char per loop pass until
// stable. This replaces trimAutolink for bare URLs: e.g.
// 'https://a.io)](https://b.io/x' stops before the '(' (unbalanced), while
// 'https://a.io?q=1)](./d.md)' keeps the balanced '(./d.md)'.
const BACKPEDAL = /(?:[^?!.,:;*_'\"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'\"~)]+(?!$))+/;
function backpedalUrl(url) {
  let prev;
  do { prev = url; const m = BACKPEDAL.exec(url); url = m ? m[0] : ''; } while (url !== prev);
  return url;
}
// scanner never has to text.slice(i) before a test (each slice copies the
// rest of the string). Every use sets .lastIndex immediately before .exec,
// so sharing them across the recursive inlineNodes calls is safe.
const Y_ANGLE_SCHEME = /<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^<>\s]*)>/y;
const Y_ANGLE_EMAIL = /<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[A-Za-z0-9])?(?:\.[a-zA-Z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/y;
const Y_HTML_TAG = /(?:<!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Za-z][\s\S]*?>|<!\[CDATA\[[\s\S]*?\]\]>|<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^ \t\n\r"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>|<\/[A-Za-z][A-Za-z0-9-]*\s*>)/y;
const Y_ANGLE_TAG = /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^ \t\n\r"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>/y;
const Y_SCHEME_URL = /([A-Za-z][A-Za-z0-9+.-]{1,31}):\/\/[^\s<]*/y;
const Y_MAILTO = /(mailto|xmpp):([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[A-Za-z0-9])?(?:\.[a-zA-Z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)(\/[^\s<]*)?/y;
const Y_WWW = /www\.[\w-]+(\.[\w-]+)+(\\[^\s<]*)?([/?#][^\s<]*)?/y;
const Y_EMAIL = /[A-Za-z0-9.!#$%&'*+\=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9])?)+/y;
const Y_ENTITY_NAMED = /&[a-zA-Z][a-zA-Z0-9]*;/y;
const Y_ENTITY_NUM = /&#[xX][0-9a-fA-F]{1,6};|&#[0-9]{1,7};/y;

// Document-level inLink state (marked's Lexer state): a raw HTML <a␣ tag
// flips it on and </a> flips it off, and it persists across paragraphs
// for the rest of the document — while on, bare URL/email autolinks do
// not fire anywhere (doc-03/06/30/33/35: an unclosed <a> earlier in the
// doc suppresses autolinks in later paragraphs). Reset in parse().
// A markdown link's label is tokenised with this state saved/restored
// (marked restores the outer value after the label), so a </a> inside a
// label has no lasting effect.
let docInLink = false;

function inlineNodes(text, refs, inLink, inLinkText) {
  const nodes = [];
  let i = 0;
  const n = text.length;
  let textBuf = '';
  const flush = () => { if (textBuf) { nodes.push({ k: 'text', text: textBuf }); textBuf = ''; } };
  // Spans [start, end) of link-like [ ... ]( ... ) constructs that did not
  // form a link but are hidden from marked's emphasis-closer search (its
  // emStrong mask). Delimiters inside such a span cannot act as closers.
  // Seeded with marked's mask code spans (see maskCodeSpans): a phantom
  // code span hides its delimiters from the emphasis scan the same way.
  const maskedSpans = (text.includes('`') && (text.includes('*') || text.includes('_') || text.includes('~'))) ? maskCodeSpans(text) : [];
  const inMaskedSpan = (pos) => { for (const s of maskedSpans) if (pos >= s[0] && pos < s[1]) return true; return false; };
  while (i < n) {
    const c = text[i];
    // code span
    if (c === '`') {
      let run = 0; while (text[i + run] === '`') run++;
      // find a run of exactly `run` backticks
      let close = -1;
      for (let p = i + run; p < n; p++) {
        if (text[p] === '`') {
          let r2 = 0; while (text[p + r2] === '`') r2++;
          if (r2 === run) { close = p; break; }
          p += r2 - 1;
        }
      }
      if (close !== -1) {
        flush();
        let content = text.slice(i + run, close);
        // collapse newlines to spaces, then strip one space from each end if both present
        if (content.includes('\n')) content = content.replace(/\n/g, ' ');
        if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ' && content.trim() !== '') content = content.slice(1, -1);
        nodes.push({ k: 'code', text: content });
        i = close + run;
        continue;
      }
      // no closer: literal backticks
      textBuf += '`'.repeat(run); i += run; continue;
    }
    // escape
    if (c === '\\' && i + 1 < n && isPunct(text[i + 1])) {
      textBuf += text[i + 1]; i += 2; continue;
    }
    // hard break: backslash + newline; the next line's leading whitespace is stripped
    if (c === '\\' && i + 1 < n && text[i + 1] === '\n') { flush(); nodes.push({ k: 'br' }); i += 2; while (i < n && (text[i] === ' ' || text[i] === '\t')) i++; continue; }
    // raw HTML / autolink <...>
    if (c === '<') {
      // autolink scheme or email
      Y_ANGLE_SCHEME.lastIndex = i;
      const am = Y_ANGLE_SCHEME.exec(text);
      if (am) {
        flush();
        nodes.push({ k: 'link', href: am[1], title: null, image: false, auto: true, children: [{ k: 'text', text: am[1] }] });
        i += am[0].length; continue;
      }
      Y_ANGLE_EMAIL.lastIndex = i;
      const em = Y_ANGLE_EMAIL.exec(text);
      if (em) {
        flush();
        nodes.push({ k: 'link', href: 'mailto:' + em[1], title: null, image: false, auto: true, children: [{ k: 'text', text: em[1] }] });
        i += em[0].length; continue;
      }
      // raw html tag / comment / processing instruction / declaration / cdata.
      // A comment may be empty (<!-->) or <!--->. A tag must be a VALID open
      // tag (attributes well-formed) or a closing tag with no attributes.
      Y_HTML_TAG.lastIndex = i;
      const hm = Y_HTML_TAG.exec(text);
      if (hm) {
        if (!docInLink && /^<a /i.test(hm[0])) docInLink = true;
        else if (docInLink && /^<\/a>/i.test(hm[0])) docInLink = false;
        flush(); nodes.push({ k: 'html', text: hm[0] }); i += hm[0].length; continue;
      }
      textBuf += '<'; i++; continue;
    }
    // image / link
    if ((c === '!' && text[i + 1] === '[') || (c === '[' && !inLink)) {
      const isImage = c === '!';
      const start = isImage ? i + 1 : i;
      const lt = scanLinkText(text, start);
      if (lt) {
        const after = lt.next;
        // inline link: (dest "title")
        let href = null, title = null, next = after;
        if (text[after] === '(') {
          // skip spaces/newlines (not blank line)
          let p = after + 1;
          while (p < n && (text[p] === ' ' || text[p] === '\t')) p++;
          if (p < n && text[p] === '\n') {
            if (text[p + 1] !== '\n') { p++; while (p < n && (text[p] === ' ' || text[p] === '\t')) p++; }
          }
          const d = parseLinkDestination(text, p);
          if (d) {
            let q = d.next;
            while (q < n && (text[q] === ' ' || text[q] === '\t')) q++;
            let tt = null;
            if (q < n && text[q] === '\n') {
              let t2 = q + 1;
              while (t2 < n && (text[t2] === ' ' || text[t2] === '\t')) t2++;
              if (t2 < n && (text[t2] === '"' || text[t2] === "'" || text[t2] === '(')) q = t2;
            }
            if (q < n && (text[q] === '"' || text[q] === "'" || text[q] === '(')) {
              const tp = parseLinkTitle(text, q);
              if (tp) { tt = tp.title; q = tp.next; }
              else { /* title failed: not a link unless ) follows directly */ }
            }
            while (q < n && (text[q] === ' ' || text[q] === '\t')) q++;
            if (q < n && text[q] === '\n') {
              // title on next line handled above; a newline before ) is ok if only spaces
              let t2 = q + 1;
              while (t2 < n && (text[t2] === ' ' || text[t2] === '\t')) t2++;
              if (t2 < n && text[t2] === ')') q = t2;
            }
            if (q < n && text[q] === ')') {
              href = d.dest; title = tt; next = q + 1;
            }
          }
        }
        if (href === null) {
          // reference link: [label] or [] or shortcut. Labels match on the
          // RAW label text (backslashes intact) — no unescaping before lookup.
          if (text[after] === '[') {
            const lt2 = scanLinkText(text, after);
            if (lt2) {
              const label = lt2.text === '' ? lt.text : lt2.text;
              // a label containing an unescaped [ is invalid — no reference link
              if (!label.replace(/\\./g, '').includes('[')) {
                const ref = refs.get(normalizeLabel(label));
                if (ref) { href = ref.href; title = ref.title; next = lt2.next; }
              }
            }
          } else {
            // shortcut reference: the label is the link text itself
            if (!lt.text.replace(/\\./g, '').includes('[')) {
              const ref = refs.get(normalizeLabel(lt.text));
              if (ref) { href = ref.href; title = ref.title; next = after; }
            }
          }
        }
        if (href !== null) {
          flush();
          // the link text is parsed with inLink=false so inner links form;
          // a non-image link may NOT contain an explicit link — if it does,
          // the outer link is not formed (the '[' stays literal and the inner
          // link forms when the scan reaches it). Autolinks inside link text
          // do not forbid the outer link (bare URLs are plain text there;
          // <...> autolinks render nested). Images may contain links in
          // their alt text (their text is extracted for the alt attribute).
          const savedDocInLink = docInLink;
          const children = inlineNodes(lt.text, refs, false, true);
          docInLink = savedDocInLink;
          if (!isImage && containsLink(children)) { textBuf += c; i++; continue; }
          nodes.push({ k: 'link', href, title, image: isImage, children });
          i = next;
          continue;
        }
        // not a link: literal '[' (and '!' if image). It may still be a
        // masked link-like span for emphasis purposes — record it.
        const me = findMaskedSpan(text, start);
        if (me !== -1) maskedSpans.push([start, me]);
        textBuf += c; i++;
        continue;
      }
      const me0 = findMaskedSpan(text, start);
      if (me0 !== -1) maskedSpans.push([start, me0]);
      textBuf += c; i++; continue;
    }
    // emphasis / strikethrough delimiters
    if (c === '*' || c === '_') {
      let run = 0; while (text[i + run] === c) run++;
      const before = i > 0 ? text[i - 1] : '';
      const after = i + run < n ? text[i + run] : '';
      flush();
      nodes.push({ k: 'delim', ch: c, len: run, open: canOpenDelim(c, before, after), close: canCloseDelim(c, before, after), used: 0, strong: false, masked: inMaskedSpan(i) });
      i += run; continue;
    }
    // strikethrough: a run of 1-2 tildes is a delimiter (single ~ pairs too);
    // a run of 3+ tildes is literal text (~~~ never forms <del>).
    if (c === '~') {
      let run = 0; while (text[i + run] === '~') run++;
      if (run >= 3) { textBuf += '~'.repeat(run); i += run; continue; }
      const before = i > 0 ? text[i - 1] : '';
      const after = i + run < n ? text[i + run] : '';
      flush();
      nodes.push({ k: 'delim', ch: '~', len: run, open: canOpenDelim('*', before, after), close: canCloseDelim('*', before, after), used: 0, strong: false, masked: inMaskedSpan(i) });
      i += run; continue;
    }
    // extended autolink: scheme://... or mailto:/xmpp: (GFM). Checked before
    // www./email so the scheme prefix is part of the link.
    // Bare-URL/email autolinks do NOT fire inside link text (marked renders
    // them as plain text there); <...> autolinks still do.
    if (isAsciiLetterCode(c.charCodeAt(0)) && !inLinkText && !docInLink) {
      const before = i > 0 ? text[i - 1] : '';
      if (before === '' || !(isAsciiAlnumCode(before.charCodeAt(0)) || before === '_' || before === '/' || before === ':')) {
        Y_SCHEME_URL.lastIndex = i;
        const sm = Y_SCHEME_URL.exec(text);
        if (sm) {
          const url = backpedalUrl(sm[0]);
          if (url.length > 0) {
            flush();
            nodes.push({ k: 'link', href: url, title: null, image: false, children: [{ k: 'text', text: url }] });
            i += url.length; continue;
          }
        }
        // mailto: / xmpp: (exactly lowercase) + email; xmpp: allows one
        // optional path segment (/txt), mailto: does not.
        Y_MAILTO.lastIndex = i;
        const mm = Y_MAILTO.exec(text);
        if (mm) {
          // a trailing - or _ right after the email kills the autolink
          const afterCh = i + mm[0].length < n ? text[i + mm[0].length] : '';
          if (afterCh === '-' || afterCh === '_') { /* fall through: not an autolink */ }
          else {
            let url = mm[1] === 'mailto' ? mm[1] + ':' + mm[2] : mm[0];
            // xmpp: path is a single segment — cut at the second /
            if (mm[1] === 'xmpp' && mm[3]) {
              const seg = mm[3].slice(1);
              const cut = seg.indexOf('/');
              url = mm[1] + ':' + mm[2] + '/' + (cut === -1 ? seg : seg.slice(0, cut));
            }
            url = trimAutolink(url);
            if (url.length > 0) {
              flush();
              nodes.push({ k: 'link', href: url, title: null, image: false, children: [{ k: 'text', text: url }] });
              i += url.length; continue;
            }
          }
        }
      }
    }
    // extended autolink: www. and email (GFM)
    if (c === 'w' && text.startsWith('www.', i) && !inLinkText && !docInLink) {
      const before = i > 0 ? text[i - 1] : '';
      if (before === '' || !/[A-Za-z0-9_\-\/]/.test(before)) {
        Y_WWW.lastIndex = i;
        const em = Y_WWW.exec(text);
        if (em) {
          const url = backpedalUrl(em[0]);
          if (url.length > 4) {
            flush();
            nodes.push({ k: 'link', href: 'http://' + url, title: null, image: false, children: [{ k: 'text', text: url }] });
            i += url.length; continue;
          }
        }
      }
    }
    if ((c === '@' || isEmailStartCode(c.charCodeAt(0))) && !inLinkText && !docInLink && (i === 0 || !isEmailLocalCode(text.charCodeAt(i - 1)))) {
      // email autolink: scan word@domain. The local part has no '/' (a slash
      // breaks it: a/b@c.com links only b@c.com); the domain labels allow
      // '_' (foo@bar.com_baz links whole). The match may start with . + -
      // (marked links +foo@bar.com, .foo@bar.com, -foo@bar.com whole).
      // Guard above: a match can only start right after a char that is NOT
      // part of an email local part — otherwise the same run's match would
      // have started (and either matched or failed for the same reason)
      // at the earlier position. This skips most regex attempts.
      Y_EMAIL.lastIndex = i;
      const em = Y_EMAIL.exec(text);
      if (em) {
        // a trailing - kills the autolink; a trailing _ kills it too, unless
        // the _ is an emphasis closer — i.e. the most recent _ delimiter
        // before the email is an opener (e.g. _foo@bar.com_ still links)
        const afterCh = i + em[0].length < n ? text[i + em[0].length] : '';
        let kill = afterCh === '-';
        if (afterCh === '_') {
          kill = true;
          for (let d = nodes.length - 1; d >= 0; d--) {
            const nd = nodes[d];
            if (nd.k === 'delim' && nd.ch === '_') { kill = !nd.open; break; }
          }
        }
        if (!kill) {
          // must not be preceded by / (part of a URL) — handled by before check on word chars
          flush();
          nodes.push({ k: 'link', href: 'mailto:' + em[0], title: null, image: false, children: [{ k: 'text', text: em[0] }] });
          i += em[0].length; continue;
        }
      }
    }
    // newline: hard break if 2+ spaces before, else soft break.
    // After a hard break the next line's leading whitespace is stripped;
    // after a soft break it is kept.
    if (c === '\n') {
      flush();
      // count spaces at end of textBuf — but textBuf was flushed; check raw text before i
      let sp = 0, p = i - 1;
      while (p >= 0 && text[p] === ' ') { sp++; p--; }
      if (sp >= 2) {
        // remove trailing spaces from last text node
        const last = nodes[nodes.length - 1];
        if (last && last.k === 'text') last.text = last.text.replace(/ +$/, '');
        nodes.push({ k: 'br' });
        i++;
        while (i < n && (text[i] === ' ' || text[i] === '\t')) i++;
      } else {
        nodes.push({ k: 'softbr' });
        i++;
      }
      continue;
    }
    // entity: a named or numeric reference is kept as-is in the output
    // (marked does not decode entities to characters); a bare & is left
    // for escapeHtml to turn into &amp; (once, at render time). Invalid
    // numeric references (out of range, 0, surrogate, bad digits) fall
    // through to the bare-& path.
    if (c === '&') {
      Y_ENTITY_NAMED.lastIndex = i;
      const nm = Y_ENTITY_NAMED.exec(text);
      if (nm) { flush(); nodes.push({ k: 'raw', text: nm[0] }); i += nm[0].length; continue; }
      Y_ENTITY_NUM.lastIndex = i;
      const num = Y_ENTITY_NUM.exec(text);
      if (num) {
        const isHex = num[0][2] === 'x' || num[0][2] === 'X';
        const inner = isHex ? num[0].slice(3, -1) : num[0].slice(2, -1);
        const code = isHex ? parseInt(inner, 16) : parseInt(inner, 10);
        if (code !== 0 && code <= 0x10FFFF && !(code >= 0xD800 && code <= 0xDFFF)) textBuf += String.fromCodePoint(code);
        else textBuf += '\uFFFD';
        i += num[0].length; continue;
      }
      textBuf += '&'; i++; continue;
    }
    textBuf += c; i++;
  }
  flush();
  return nodes;
}

// Delimiter-stack emphasis resolution (CommonMark algorithm).
// Simulate marked's opener-driven closer search (its emStrong budget scan)
// for a candidate (opener, closer) pair: returns true if marked would let
// the opener pair with this closer (or an earlier pairing of the same opener
// run covers it). The opener starts with budget m = k' (its run length, or
// a shorter retry starting later in the same run — marked retries at each
// position of the run); y is the full run length. An inner run that can only
// open inflates the budget; an inner run that can also close may be skipped
// by the rule of 3 (added to f instead); any other inner run that spends the
// budget to <= 0 pairs with the opener instead. Runs strictly inside an
// already-formed emphasis span of the OTHER delimiter char are invisible to
// the scan (marked's RDelim __ / ** lookahead skip). The pair is allowed iff
// the scan's pairing point R (the first same-char run where the budget
// reaches m <= 0) is this closer or later. A closer AFTER R is blocked (the
// opener already paired). A closer BEFORE R may pair only if the opener's
// total consumption so far (op.used + use) does not exceed the opener's
// leftover op.len - use_R, where use_R (1 for em, 2 for strong) is marked's
// consumption at R from min(k', b_R) parity. Returns false when the pair is
// blocked; otherwise the closer's raw consumption at the pairing point —
// marked consumes min(closerLen, m_before + f) chars of the closer run into
// its raw token (only `use` of them are the tag; the rest are literal text
// inside the emphasis). For a closer before R the consumption is just `use`.
// The pairing point R of an opener's marked budget scan (see markedScanPairs):
// the first same-char run where the budget reaches m <= 0, with useR (1 for
// em, 2 for strong, from the parity of min(kp, bR)) and the raw closer
// consumption at R (xAtR = b + m + f, clamped to the run as bR). Null when the
// opener has no pairing point (scan finds no R, or a retry broke on a
// both-way run). Marked tries the full-length opener first; its R governs.
// kpMax caps the trial opener length: callers pass the run length from the
// pairing char to the run end (marked's lLength for that opener position);
// the default is the full run length (used by the post-pairing rec scan).
function scanPairingPoint(op, opIdx, flat, spans, kpMax) {
  const ch = op.ch;
  // The effective run length is kpMax when given (a suffix opener after
  // closer use: its first trial is a fresh opener, not a retry — in
  // marked the previous token was the em span, so prevChar resets and the
  // leftover is not a mid-run opener). A genuine retry shortens from the
  // effective length, so `retry` is relative to it, not to op.len.
  const effLen = kpMax === undefined ? op.len : kpMax;
  for (let kp = effLen; kp >= 1; kp--) {
    let m = kp;
    const y = op.len;
    let f = 0;
    const Rc = !!op.close; // the opener can also close
    const retry = kp < effLen; // started later in the same run: char before is the delimiter
    let firstZero = -1, bAtZero = 0, mAtZero = 0, fAtZero = 0;
    for (let j = opIdx + 1; j < flat.length; j++) {
      const run = flat[j];
      if (run.k !== 'delim' || run.ch !== ch) continue;
      if (run._link !== op._link) continue;
      if (run.masked && run.close) continue;
      // invisible: strictly inside a formed span of the other delimiter char
      let hidden = false;
      for (const sp of spans) {
        if (j > sp[0] && j < sp[1] && flat[sp[0]].ch !== ch) { hidden = true; break; }
      }
      if (hidden) continue;
      const b = run.len;
      if (run.open && !run.close) { m += b; continue; }
      if (!run.open && !run.close) continue;
      if ((run.open && run.close) || Rc) {
        if (retry && run.open && run.close) { firstZero = -2; break; } // opener preceded by same char: scan stops
        if (y % 3 !== 0 && (y + b) % 3 === 0) { f += b; continue; }
      }
      m -= b;
      if (m <= 0) { firstZero = j; bAtZero = b; mAtZero = m; fAtZero = f; break; }
    }
    if (firstZero >= 0) {
      const xAtR = bAtZero + mAtZero + fAtZero;
      const bR = Math.min(bAtZero, xAtR);
      return { R: firstZero, useR: (Math.min(kp, bR) % 2 === 1) ? 1 : 2, bR, xAtR, kp };
    }
    // firstZero === -1 (no pair) or -2 (retry broke on a both-way run):
    // try a shorter retry
  }
  return null;
}
function markedScanPairs(op, opIdx, clIdx, use, flat, spans) {
  // The trial opener length is the opener's effective run length: closer
  // use consumes a run from its start, so the opener's run is the suffix
  // after the closer chars (e.g. `**a *b c** e**`, where the outer em's
  // pairing char is the first `*` of `**`, run length 2; and the `<em>f</em>`
  // opener in `**a *b **c**d** e**f**`, whose run is the 1 char left after
  // the outer em took the first char as its closer).
  const pp = scanPairingPoint(op, opIdx, flat, spans, op.len - closerUsedOf(op));
  if (!pp) return false;
  const { R, useR, xAtR } = pp;
  if (clIdx > R) return false;
  if (clIdx === R) {
    const cl = flat[clIdx];
    return Math.min(cl.len - cl.used, Math.max(use, xAtR));
  }
  return op.used + use <= op.len - useR ? use : false;
}

// Chars of a delimiter node already used as a CLOSER (its _pairs entries
// created as ndEntry carry opIdx; opener entries carry clIdx). Closer use
// consumes a run from its start, opener use from its end, so the opener's
// effective run is the suffix after the closer chars.
function closerUsedOf(nd) {
  let n = 0;
  for (const e of (nd._pairs || [])) if (e.opIdx !== undefined) n += e.strong ? 2 : 1;
  return n;
}

function resolveEmphasis(nodes) {
  // strikethrough uses the same delimiter machinery with ch '~' and use 2 -> <del>
  // flatten link children into the same list for resolution? Links are nested;
  // we resolve within each node list, but delimiters inside link text must be
  // able to pair with delimiters outside. Handle by resolving on a flattened view.
  const flat = [];
  let linkSeq = 0;
  const collect = (list, linkId) => {
    for (const nd of list) {
      if (nd.k === 'link') {
        const id = ++linkSeq;
        nd._openIdx = flat.length;
        flat.push({ k: 'linkOpen', node: nd, _link: linkId });
        // an image's children are its alt text: they are not rendered as
        // content (only via the alt attribute), so they never enter the flat
        // list; a real link's children do.
        if (!nd.image) collect(nd.children, id);
        flat.push({ k: 'linkClose', node: nd, _link: linkId });
      } else { nd._link = linkId; flat.push(nd); }
    }
  };
  collect(nodes, null);
  // delimiter stack (CommonMark process-emphasis): a closer loops while it has
  // unused length; an unmatched opener is pushed so later closers can find it.
  // spans: [openerFlatIdx, closerFlatIdx] of formed pairs — an opener strictly
  // inside a formed span cannot pair with a closer outside it.
  const stack = [];
  const spans = [];
  for (let idx = 0; idx < flat.length; idx++) {
    const nd = flat[idx];
    if (nd.k !== 'delim') continue;
    // A delimiter inside a masked link-like span (marked's emStrong mask)
    // that can close is inert there: it can neither close nor open, so it
    // stays literal. One that can only open may still open and pair with
    // a closer outside the span.
    if (nd.masked && nd.close) continue;
    if (nd.close) {
      while (nd.used < nd.len) {
        let openerIdx = -1, scanCloserUse = 0;
        for (let s = stack.length - 1; s >= 0; s--) {
          const op = flat[stack[s]];
          if (op.ch === nd.ch && op.used < op.len) {
            // delimiters inside a link's text only pair with delimiters in
            // that same link's text (or both outside any link)
            if (op._link !== nd._link) continue;
            // rule of 3: if either run can both open and close, and the sum
            // of the (full) run lengths is a multiple of 3, don't pair —
            // unless both run lengths are themselves multiples of 3.
            // Marked counts the whole runs (its mid-run opener's runLength
            // walks back to the run start), not the remaining lengths: a
            // leftover char of a `**` run pairing with a `**` closer sums
            // to 4, not 3 (e.g. the `*f*` in `**a *b **c**d** e**f**`).
            const opRem0 = op.len - op.used, clRem0 = nd.len - nd.used;
            if ((op.len + nd.len) % 3 === 0 && ((op.open && op.close) || (nd.open && nd.close)) && !(op.len % 3 === 0 && nd.len % 3 === 0)) continue;
            // strikethrough: opener and closer must have equal remaining lengths
            if (nd.ch === '~' && opRem0 !== clRem0) continue;
            // an opener strictly inside a previously formed emphasis span
            // cannot pair with a closer outside that span (no crossing
            // spans). Pairing with the span's own closer (or one inside
            // it) is nesting, not crossing: e.g. `*foo *bar**` forms both
            // em spans on the shared `**` run, the outer one first.
            let inside = false;
            for (const sp of spans) { if (stack[s] > sp[0] && stack[s] < sp[1] && idx > sp[1]) { inside = true; break; } }
            if (inside) continue;
            // marked's opener-driven search: the opener's budget must reach
            // zero at this closer (inner open-only runs inflate it, inner
            // both-way runs may be skipped by the rule of 3); a closer
            // before the pairing point may pair only within the leftover
            const gateUse = (opRem0 >= 2 && clRem0 >= 2) ? 2 : 1;
            let scanUse = gateUse;
            if (nd.ch !== '~') {
              scanUse = markedScanPairs(op, stack[s], idx, gateUse, flat, spans);
              if (scanUse === false) continue;
              // marked is opener-driven left-to-right: if an older opener
              // on the stack also has this closer as its pairing point, it
              // claims the closer first (e.g. `**a *b **c**d* e**`: the
              // outer `**` pairs with the final `**` as strong; the inner
              // `*` stays literal). R === this closer implies the older
              // opener's gate would allow, so only its pairing point is
              // checked (plus the same pre-checks the candidate passed).
              let olderClaims = false;
              for (let s2 = s - 1; s2 >= 0; s2--) {
                const op2 = flat[stack[s2]];
                if (op2.ch !== nd.ch || op2.used >= op2.len || op2._link !== nd._link) continue;
                if (op2.masked && op2.close) continue;
                // rule of 3 on the full run lengths, as above (marked counts
                // the whole runs, not the remaining lengths).
                if ((op2.len + nd.len) % 3 === 0 && ((op2.open && op2.close) || (nd.open && nd.close)) && !(op2.len % 3 === 0 && nd.len % 3 === 0)) continue;
                let inside2 = false;
                for (const sp of spans) { if (stack[s2] > sp[0] && stack[s2] < sp[1]) { inside2 = true; break; } }
                if (inside2) continue;
                const pp2 = scanPairingPoint(op2, stack[s2], flat, spans, op2.len - closerUsedOf(op2));
                // Only a full-length claim blocks the inner opener: when the
                // older opener's pairing point is found only on a retry
                // (kp < its length), marked retries from the later char of
                // the run, and the inner opener may pair with the closer
                // chars inside that retry span (e.g. `**a *b e**`, where
                // the inner `*b` pairs with the first char of the final
                // `**` and the outer em takes the second).
                if (pp2 && pp2.R === idx && pp2.kp === op2.len) { olderClaims = true; break; }
              }
              if (olderClaims) continue;
              // A closer run that is the pairing point R of an already-formed
              // outer pair only has (xAtR - useR) of its chars inside that
              // span (marked's raw ends at xAtR); the rest are literal text
              // outside it, so an inner opener may use at most the remaining
              // inside budget of that run (e.g. `**a *b **c**d** e***`,
              // where the outer em takes the only inside char and `*b`
              // stays literal, while in `*foo *bar**` the budget is 1 and
              // the inner `*bar` pairs).
              if (nd._pairs) {
                let capped = false;
                for (const e of nd._pairs) {
                  if (e.opIdx === undefined || e.opIdx >= stack[s]) continue;
                  const r = e.rec;
                  if (!r || !r.atR) continue;
                  let usedInside = 0;
                  for (const e2 of nd._pairs) {
                    if (e2.opIdx > e.opIdx && e2.opIdx < idx) usedInside += e2.strong ? 2 : 1;
                  }
                  if (gateUse > r.xAtR - r.useR - usedInside) { capped = true; break; }
                }
                if (capped) continue;
              }
            }
            openerIdx = s;
            scanCloserUse = scanUse;
            break;
          }
        }
        if (openerIdx === -1) break;
        const op = flat[stack[openerIdx]];
        const opRem = op.len - op.used, clRem = nd.len - nd.used;
        let use = (opRem >= 2 && clRem >= 2) ? 2 : 1;
        op.used += use; nd.used += use;
        // record this pair (a node may pair more than once; keep the first match for tag kind)
        if (!op._match) { op._match = nd; op.strong = use === 2; }
        if (!nd._match) { nd._match = op; nd.strong = use === 2; }
        // a node that pairs twice needs two tags; track pairs in a list.
        // rec: the pairing-point scan at creation — the last-created pair
        // of an (opener, closer) group is the outermost tag, and marked's
        // tag use for it is useR (parity of min(kp, bR)), with the closer's
        // raw consumption xAtR; fixed up after this closer's loop.
        const pp = nd.ch !== '~' ? scanPairingPoint(op, stack[openerIdx], flat, spans) : null;
        const rec = pp ? { atR: pp.R === idx, useR: pp.useR, xAtR: pp.xAtR, kp: pp.kp, opRem, clRem } : null;
        const opEntry = { other: nd, strong: use === 2, closerUse: scanCloserUse, rec, clIdx: idx };
        const ndEntry = { other: op, strong: use === 2, closerUse: scanCloserUse, rec, opIdx: stack[openerIdx] };
        (op._pairs = op._pairs || []).push(opEntry);
        (nd._pairs = nd._pairs || []).push(ndEntry);
        spans.push([stack[openerIdx], idx]);
        if (op.used >= op.len) stack.splice(openerIdx, 1);
      }
      // Outermost-pair correction at the pairing point R: marked's tag use
      // for the match is useR, not the naive remaining-length rule, and
      // the closer's raw consumption at R is xAtR. Only the last-created
      // pair of each (opener, closer) group is the outermost tag; inner
      // pairs keep the naive use. Runs after the loop (so a freed opener
      // char cannot re-pair with this closer — in marked it sits inside
      // the text) but before the leftover-closer push below, since freed
      // closer chars outside the raw may still open.
      if (nd._pairs && nd.ch !== '~') {
        const seenOps = new Set();
        for (let pi = nd._pairs.length - 1; pi >= 0; pi--) {
          const entry = nd._pairs[pi];
          const op = entry.other;
          if (seenOps.has(op)) continue;
          seenOps.add(op);
          const rec = entry.rec;
          if (!rec || !rec.atR) continue;
          const oldUse = entry.strong ? 2 : 1;
          if (rec.useR !== oldUse && rec.useR <= rec.opRem && rec.useR <= rec.clRem) {
            const d = rec.useR - oldUse;
            op.used += d; nd.used += d;
            entry.strong = rec.useR === 2;
            entry.closerUse = Math.min(rec.clRem, rec.xAtR);
            for (const e2 of (op._pairs || [])) {
              if (e2.rec === rec) { e2.strong = rec.useR === 2; break; }
            }
          }
        }
      }
      // leftover closer that can also open goes on the stack
      if (nd.used < nd.len && nd.open) stack.push(idx);
    } else if (nd.open) {
      stack.push(idx);
    }
  }
  // Now convert: a delim node with _match becomes an open/close marker.
  // Pairs are created innermost-first; an opener emits them outermost-first
  // (reverse creation order) and a closer innermost-first (creation order).
  const out = [];
  const flatIndex = new Map(flat.map((nd, i) => [nd, i]));
  for (const nd of flat) {
    if (nd.k === 'delim') {
      if (nd._pairs && nd._pairs.length) {
        const pairs = nd._pairs;
        // A node can be both a closer (for an outer pair) and an opener
        // (for a later pair): its closer chars come first in the run, the
        // opener chars after them. Render the close tags first, then the
        // open tags. (Opener entries carry clIdx, closer entries opIdx.)
        const closerPairs = pairs.filter((p) => p.opIdx !== undefined);
        const openerPairs = pairs.filter((p) => p.clIdx !== undefined);
        let rawUse = 0;
        if (closerPairs.length) {
          // rawUse: total closer-run chars consumed into emphasis (tag chars
          // plus literal chars inside the emphasis, per marked's closer
          // consumption b = min(b, b+m+f)). Anything beyond rawUse stays
          // literal outside. The inside literals sit before the outermost
          // (last) close tag.
          let closerUsed = 0;
          for (const p of closerPairs) closerUsed += p.strong ? 2 : 1;
          rawUse = closerUsed;
          for (const p of closerPairs) if (p.closerUse > rawUse) rawUse = p.closerUse;
          const inside = rawUse - closerUsed;
          // Close innermost first: the pair whose opener is latest closes
          // first; ties (one opener pairing twice with this closer) keep
          // creation order. Pairs are usually created innermost-first, but
          // when openers share this closer the outer one pairs first, so
          // creation order alone no longer gives the innermost span first.
          const ordered = closerPairs.map((p, i) => [p, i]).sort((a, b) => {
            const d = flatIndex.get(b[0].other) - flatIndex.get(a[0].other);
            return d !== 0 ? d : a[1] - b[1];
          }).map((e) => e[0]);
          const last = ordered.length - 1;
          for (let pi = 0; pi < ordered.length; pi++) {
            const p = ordered[pi];
            if (pi === last && inside > 0) out.push({ k: 'text', text: nd.ch.repeat(inside) });
            out.push({ k: (nd.ch === '~' ? 'del' : p.strong ? 'strong' : 'em') + 'Close' });
          }
        }
        if (!openerPairs.length) {
          const outside = nd.len - rawUse;
          if (outside > 0) out.push({ k: 'text', text: nd.ch.repeat(outside) });
        } else {
          // Opener part: the opener chars follow the closer raw. Leftover
          // opener chars sit INSIDE the tag when the outermost pair formed
          // on the full run at its pairing point R (marked's raw starts at
          // the run start, so the text begins with the leftover chars);
          // otherwise they were passed as text before the tag (retry case,
          // e.g. `***a**`).
          let openerUsed = 0;
          for (const p of openerPairs) openerUsed += p.strong ? 2 : 1;
          const left = nd.len - rawUse - openerUsed;
          const lastP = openerPairs[openerPairs.length - 1];
          const leftInside = (nd.ch !== '~' && lastP.rec && lastP.rec.atR && lastP.rec.kp === nd.len) ? left : 0;
          const leftBefore = left - leftInside;
          if (leftBefore > 0) out.push({ k: 'text', text: nd.ch.repeat(leftBefore) });
          for (let pi = openerPairs.length - 1; pi >= 0; pi--) {
            const p = openerPairs[pi];
            out.push({ k: (nd.ch === '~' ? 'del' : p.strong ? 'strong' : 'em') + 'Open' });
            if (pi === openerPairs.length - 1 && leftInside > 0) out.push({ k: 'text', text: nd.ch.repeat(leftInside) });
          }
        }
      } else {
        if (nd.len > 0) out.push({ k: 'text', text: nd.ch.repeat(nd.len) });
      }
      continue;
    }
    out.push(nd);
  }
  return out;
}

function renderNodes(nodes) {
  let out = '';
  for (const nd of nodes) {
    switch (nd.k) {
      case 'text': out += escapeHtml(nd.text); break;
      case 'raw': out += nd.text; break;
      case 'code': out += '<code>' + escapeHtml(nd.text) + '</code>'; break;
      case 'html': out += nd.text; break;
      case 'br': out += '<br>'; break;
      case 'softbr': out += '\n'; break;
      case 'emOpen': out += '<em>'; break;
      case 'emClose': out += '</em>'; break;
      case 'strongOpen': out += '<strong>'; break;
      case 'strongClose': out += '</strong>'; break;
      case 'delOpen': out += '<del>'; break;
      case 'delClose': out += '</del>'; break;
      case 'linkOpen': {
        const l = nd.node;
        if (l.image) {
          const alt = renderAlt(l.children);
          const clean = sanitizeUrl(l.href);
          const href = clean === null ? '' : encodeUrl(clean);
          out += '<img src="' + escapeAttrPreserveEntities(href) + '" alt="' + escapeAttr(alt) + '"' + (l.title !== null && l.title !== undefined ? ' title="' + escapeAttrPreserveEntities(l.title) + '"' : '') + '>';
        } else {
          const clean = sanitizeUrl(l.href);
          const href = clean === null ? '' : encodeUrl(clean);
          out += '<a href="' + escapeAttrPreserveEntities(href) + '"' + (l.title !== null && l.title !== undefined ? ' title="' + escapeAttrPreserveEntities(l.title) + '"' : '') + '>';
        }
        break;
      }
      case 'linkClose': {
        const l = nd.node;
        if (!l.image) out += '</a>';
        break;
      }
      case 'link': {
        // atomic link (autolink): href is the raw text, encoded (no unescape)
        const clean = sanitizeUrl(nd.href);
        const href = clean === null ? '' : encodeUrl(clean);
        out += '<a href="' + escapeAttrPreserveEntities(href) + '">' + escapeHtml(nd.children[0].text) + '</a>';
        break;
      }
    }
  }
  return out;
}
function renderAlt(children) {
  // alt text: inline content rendered as plain text
  let out = '';
  for (const nd of children) {
    if (nd.k === 'text') out += nd.text;
    else if (nd.k === 'code') out += nd.text;
    else if (nd.k === 'html') { /* strip */ }
    else if (nd.k === 'link') out += renderAlt(nd.children);
    else if (nd.k === 'br' || nd.k === 'softbr') out += ' ';
  }
  return out;
}

// Fast path for plain inline text: if the text contains none of the
// characters that can start an inline construct (* _ ` ~ [ \ ! < &), no
// autolink trigger (www. / :// / @), and no hard break (2+ spaces before a
// newline), then the only inline rule left is the soft break, which renders
// as a literal '\n' — identical to escapeHtml(text). All excluded cases are
// conservative (a missed fast path just takes the slow path).
const INLINE_PLAIN_RE = /[*_`~\[\\!<&]|www\.|:\/\/|@| {2,}\n/;
function inline(text, refs) {
  if (!INLINE_PLAIN_RE.test(text)) {
    return escapeHtml(text);
  }
  const nodes = inlineNodes(text, refs, false);
  const resolved = resolveEmphasis(nodes);
  return renderNodes(resolved);
}

// ================= RENDER BLOCKS =================
function renderBlocks(tokens, refs) {
  let out = '';
  for (let ti = 0; ti < tokens.length; ti++) {
    const tk = tokens[ti];
    switch (tk.t) {
      case 'space': break;
      case 'heading': out += '<h' + tk.level + '>' + inline(tk.text, refs) + '</h' + tk.level + '>\n'; break;
      case 'code': {
        if (tk.fenced) {
          const lang = (tk.info || '').split(/\s+/)[0] || '';
          out += '<pre><code' + (lang ? ' class="language-' + escapeAttrPreserveEntities(unescapeBackslash(lang)) + '"' : '') + '>' + escapeHtml(tk.text) + '</code></pre>\n';
        } else {
          out += '<pre><code>' + escapeHtml(tk.text) + '</code></pre>\n';
        }
        break;
      }
      case 'hr': out += '<hr>\n'; break;
      case 'blockquote': out += '<blockquote>\n' + renderBlocks(tk.tokens, refs) + '</blockquote>\n'; break;
      case 'html': out += tk.text; break;
      case 'table': {
        out += '<table>\n<thead>\n<tr>\n';
        for (let ci = 0; ci < tk.header.length; ci++) {
          const a = tk.align[ci];
          out += '<th' + (a ? ' align="' + a + '"' : '') + '>' + inline(tk.header[ci], refs) + '</th>\n';
        }
        out += '</tr>\n</thead>\n';
        if (tk.rows.length > 0) {
          out += '<tbody>';
          for (const row of tk.rows) {
            out += '<tr>\n';
            for (let ci = 0; ci < tk.header.length; ci++) {
              const cell = row[ci] !== undefined ? row[ci] : '';
              const a = tk.align[ci];
              out += '<td' + (a ? ' align="' + a + '"' : '') + '>' + inline(cell, refs) + '</td>\n';
            }
            out += '</tr>\n';
          }
          out += '</tbody></table>\n';
        } else {
          out += '</table>\n';
        }
        break;
      }
      case 'list': {
        const tag = tk.ordered ? 'ol' : 'ul';
        const startAttr = tk.ordered && tk.start !== null && tk.start !== 1 ? ' start="' + tk.start + '"' : '';
        out += '<' + tag + startAttr + '>\n';
        for (const item of tk.items) {
          out += '<li>';
          const cb = item.task ? '<input' + (item.checked ? ' checked=""' : '') + ' disabled="" type="checkbox"> ' : '';
          out += renderListItem(item.tokens, tk.loose, refs, cb);
          out += '</li>\n';
        }
        out += '</' + tag + '>\n';
        break;
      }
      case 'paragraph': out += '<p>' + inline(tk.text, refs) + '</p>\n'; break;
    }
  }
  return out;
}
function renderListItem(tokens, loose, refs, checkboxHtml) {
  // tight list: paragraph tokens render as bare inline
  // the task checkbox goes INSIDE the first <p> when loose (marked renders
  // <li><p><input ...> text</p>), not before it.
  let out = '';
  let cb = checkboxHtml || '';
  for (const tk of tokens) {
    if (tk.t === 'paragraph' && !loose) {
      out += cb + inline(tk.text, refs);
      cb = '';
    } else if (tk.t === 'paragraph' && loose) {
      out += '<p>' + cb + inline(tk.text, refs) + '</p>\n';
      cb = '';
    } else {
      out += cb + renderBlocks([tk], refs);
      cb = '';
    }
  }
  return out;
}

// ================= ENTRY =================
export function parse(markdown) {
  const refs = new Map();
  docInLink = false;
  const tokens = lexBlocks(markdown, refs);
  return renderBlocks(tokens, refs);
}
