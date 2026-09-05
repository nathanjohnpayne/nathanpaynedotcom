const EXPRESSION_POSITION = '(,=:[!&|?{};+-*%~^<>';
const EXPRESSION_KEYWORDS =
  /(?:^|[^\w$])(return|throw|yield|await|typeof|instanceof|case|in|of|new|void|delete|do|else)\s*$/;

export function scanJs(source, visit) {
  let index = 0;
  let codeFrom = 0;
  const interpolations = []; // brace depth per open `${ … }`
  const flush = (to) => { if (to > codeFrom) visit('code', codeFrom, to); };
  const emit = (kind, from, to) => { visit(kind, from, to); index = to; codeFrom = to; };

  // From a backtick (or the `}` resuming one), find where this chunk ends.
  const templateChunk = (from) => {
    for (let j = from + 1; j < source.length; j += 1) {
      const c = source[j];
      if (c === '\\') { j += 1; continue; }
      if (c === '`') return { end: j + 1, interp: false };
      if (c === '$' && source[j + 1] === '{') return { end: j, interp: true };
    }
    return { end: source.length, interp: false };
  };

  while (index < source.length) {
    const c = source[index];
    const n = source[index + 1];
    const top = interpolations.length ? interpolations[interpolations.length - 1] : null;

    if (top !== null && c === '{') { top.depth += 1; index += 1; continue; }
    if (top !== null && c === '}') {
      if (top.depth > 0) { top.depth -= 1; index += 1; continue; }
      flush(index + 1);              // the `}` closes the interpolation: still code
      interpolations.pop();
      const { end, interp } = templateChunk(index);
      const to = interp ? end + 2 : end;
      visit('string', index + 1, interp ? end : to);
      if (interp) { interpolations.push({ depth: 0 }); visit('code', end, end + 2); }
      index = to; codeFrom = to;
      continue;
    }

    if (c === '/' && (n === '/' || n === '*')) {
      flush(index);
      const block = n === '*';
      const found = block ? source.indexOf('*/', index + 2) : source.indexOf('\n', index);
      emit('comment', index, found === -1 ? source.length : found + (block ? 2 : 0));
      continue;
    }

    if (c === '/') {
      const before = source.slice(0, index).replace(/\s+$/, '');
      const last = before.slice(-1);
      if (last === '' || EXPRESSION_POSITION.includes(last) || EXPRESSION_KEYWORDS.test(before)) {
        let escaped = false, inClass = false, closed = -1;
        for (let j = index + 1; j < source.length; j += 1) {
          const d = source[j];
          if (escaped) escaped = false;
          else if (d === '\\') escaped = true;
          else if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '\n') break;
          else if (d === '/' && !inClass) { closed = j; break; }
        }
        if (closed !== -1) { flush(index); emit('regex', index, closed + 1); continue; }
      }
    }

    if (c === "'" || c === '"') {
      flush(index);
      let end = source.length;
      for (let j = index + 1; j < source.length; j += 1) {
        const d = source[j];
        if (d === '\\') { j += 1; continue; }
        if (d === c) { end = j + 1; break; }
        if (d === '\n') { end = j; break; }   // not a string: an apostrophe in markup
      }
      emit('string', index, end);
      continue;
    }

    if (c === '`') {
      flush(index);
      const { end, interp } = templateChunk(index);
      visit('string', index, end);
      if (interp) { interpolations.push({ depth: 0 }); visit('code', end, end + 2); index = end + 2; }
      else index = end;
      codeFrom = index;
      continue;
    }

    index += 1;
  }
  flush(source.length);
}
