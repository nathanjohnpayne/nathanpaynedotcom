// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkVoice, parseArticle } from '../scripts/lib/blog-voice.mjs';

const file = 'src/content/blog/nested/protected-order.md';
const quote = 'Claude wrote: "I can ship."';
const fence = '```text\nAn unchanged command\n```';

describe('source order of protected review material', () => {
  it('warns when a quotation moves across an unchanged code fence', async () => {
    const beforeSource = `${quote}\n\n${fence}\n`;
    const source = `${fence}\n\n${quote}\n`;
    const report = await checkVoice({ source, file, beforeSource });
    expect(report.packet.protectedMaterial.before.map((p) => p.kind)).toEqual([
      'quotation',
      'code',
    ]);
    expect(report.packet.protectedMaterial.after.map((p) => p.kind)).toEqual(['code', 'quotation']);
    expect(report.findings.map((f) => f.rule)).toContain('review.protected-material-change');
    expect(report.findings.map((f) => f.rule)).not.toContain('review.negation-modal-change');
    expect(report.exitCode).toBe(0);
    expect(report.packet.manualMeaningReviewRequired).toBe(true);
    for (const [side, original] of [
      ['before', beforeSource],
      ['after', source],
    ]) {
      const quotation = report.packet.protectedMaterial[side].find((p) => p.kind === 'quotation');
      expect(quotation.text).toBe('"I can ship."');
      expect(quotation.excerpt).toBe(quote);
      expect(original.slice(quotation.location.start.offset, quotation.location.end.offset)).toBe(
        quotation.excerpt,
      );
    }
  });

  it('does not report protected changes in an unchanged article', async () => {
    const source = `${quote}\n\n${fence}\n`;
    const report = await checkVoice({ source, file, beforeSource: source });
    expect(report.packet.protectedMaterial.before).toEqual(report.packet.protectedMaterial.after);
    expect(report.findings.map((f) => f.rule)).not.toContain('review.protected-material-change');
  });

  it('orders metadata, quotations, blockquotes and fences by their original ranges', async () => {
    const source = `---\nsidebar:\n  - type: mermaid\n    content: graph TD\n---\n\n${quote}\n\n> A quoted prompt.\n\n${fence}\n\nClaude said: "A second quote."\n`;
    const article = await parseArticle(source, file);
    expect(article.protectedMaterial.map((p) => p.kind)).toEqual([
      'metadata',
      'quotation',
      'blockquote',
      'code',
      'quotation',
    ]);
    for (const item of article.protectedMaterial) {
      expect(source.slice(item.location.start.offset, item.location.end.offset)).toBe(item.excerpt);
    }
  });

  it('keeps focused quotation comparison when surrounding prose changes', async () => {
    const beforeSource = `${quote} I agreed.\n\n${fence}\n`;
    const source = beforeSource.replace('I agreed', 'I disagreed');
    const report = await checkVoice({ source, file, beforeSource });
    expect(report.findings.map((f) => f.rule)).not.toContain('review.protected-material-change');
    expect(report.packet.protectedMaterial.after[0].excerpt).toContain('I disagreed');
  });
});
