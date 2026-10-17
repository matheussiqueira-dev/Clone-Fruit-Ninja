import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// SHA-256 of the canonical ms-tokens.css v1.0 (padrao-projetos, Appendix A.2). The file is copied, never edited.
const CANONICAL_SHA256 = '4ee1fcd1e10a7592079aebe6ba675cf46d971ae3fdce64b54efadedef1a4fe99';

describe('ms-tokens.css', () => {
  const contents = readFileSync(new URL('../styles/ms-tokens.css', import.meta.url));

  it('is byte-identical to the canonical design tokens', () => {
    expect(createHash('sha256').update(contents).digest('hex')).toBe(CANONICAL_SHA256);
  });

  it('keeps LF line endings (a CRLF checkout would change the hash)', () => {
    expect(contents.includes('\r\n')).toBe(false);
  });
});
