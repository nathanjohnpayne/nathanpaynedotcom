// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkVoice, readableReport } from '../scripts/lib/blog-voice.mjs';

const file = 'src/content/blog/nested/quotation-review.md';

describe('conservative quotation attribution review', () => {
  it.each([
    '"Our colour." The deployment failed because Claude said nothing.',
    'Claude said no. "Our colour."',
    'Claude wrote: "Our colour."',
    '"Our colour," Claude wrote.',
    'I called it "the result".',
    'Claude wrote:\n\n> Our colour.',
    '> Our colour.\n\nClaude wrote.',
  ])('keeps an advisory instead of proving attribution: %s', async (body) => {
    const source = `---\ntitle: A quotation review\n---\n\n${body}\n`;
    const report = await checkVoice({ source, file });
    const warnings = report.findings.filter((f) => f.rule === 'review.quotation-attribution');
    expect(report.exitCode).toBe(0);
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
    for (const warning of warnings) {
      expect(warning).toMatchObject({ file, severity: 'warning' });
      expect(warning.location.start.line).toBe(body.includes('\n\n>') ? 7 : 5);
      expect(source.slice(warning.location.start.offset, warning.location.end.offset)).toBe(
        warning.excerpt,
      );
    }
    expect(report.packet.after.source).toBe(source);
    expect(report.packet.manualMeaningReviewRequired).toBe(true);
    expect(readableReport(report, true)).toContain('review.quotation-attribution');
  });

  it.each([
    'Claude wrote: "First." Then Alice wrote: "Second."\n',
    'Claude wrote: "Same." Then Alice wrote: "Same."\n',
  ])('keeps distinct review items for each recognized quotation: %s', async (source) => {
    const report = await checkVoice({ source, file });
    const warnings = report.findings.filter((f) => f.rule === 'review.quotation-attribution');
    expect(warnings).toHaveLength(2);
    expect(warnings[0].reason).toContain('quotation 1');
    expect(warnings[1].reason).toContain('quotation 2');
    for (const warning of warnings)
      expect(source.slice(warning.location.start.offset, warning.location.end.offset)).toBe(
        warning.excerpt,
      );
    expect(
      report.packet.protectedMaterial.after.filter((p) => p.kind === 'quotation'),
    ).toHaveLength(2);
    expect(report.exitCode).toBe(0);
  });

  it('retains removed baseline quotation advisories and their complete source ranges', async () => {
    const beforeSource = 'Claude wrote: "First." Then Alice wrote: "Second."\n';
    const source = 'I kept the original result.\n';
    const report = await checkVoice({ source, file, beforeSource });
    const warnings = report.findings.filter((f) => f.rule === 'review.quotation-attribution');
    expect(warnings).toHaveLength(2);
    for (const warning of warnings) {
      expect(warning.sourceVersion).toBe('before');
      expect(beforeSource.slice(warning.location.start.offset, warning.location.end.offset)).toBe(
        warning.excerpt,
      );
      expect(report.packet.warnings).toContainEqual(warning);
    }
    expect(report.packet.before.source).toBe(beforeSource);
    expect(report.packet.after.source).toBe(source);
    expect(report.exitCode).toBe(0);
  });

  it('matches unchanged baseline quotation warnings by occurrence without losing removed duplicates', async () => {
    const paragraph = 'Claude wrote: "Same."';
    const source = paragraph + '\n';
    const unchanged = await checkVoice({ source, file, beforeSource: source });
    expect(
      unchanged.findings.filter((f) => f.rule === 'review.quotation-attribution'),
    ).toHaveLength(1);
    const beforeSource = paragraph + '\n\n' + paragraph + '\n';
    const report = await checkVoice({ source, file, beforeSource });
    const warnings = report.findings.filter((f) => f.rule === 'review.quotation-attribution');
    expect(warnings).toHaveLength(2);
    const retained = warnings.find((f) => f.sourceVersion === 'before');
    expect(retained.location.start.line).toBe(3);
    expect(beforeSource.slice(retained.location.start.offset, retained.location.end.offset)).toBe(
      retained.excerpt,
    );
    expect(report.packet.before.source).toBe(beforeSource);
    expect(report.packet.after.source).toBe(source);
    expect(report.exitCode).toBe(0);
  });

  it('keeps directly attributed quote language and the full source excerpt protected', async () => {
    const source = 'Claude wrote: "We organised colour." I kept the original spelling.\n';
    const report = await checkVoice({ source, file });
    expect(report.packet.protectedMaterial.after).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'quotation',
          text: '"We organised colour."',
          excerpt: source.trimEnd(),
        }),
      ]),
    );
    expect(report.exitCode).toBe(0);
    expect(report.packet.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'review.quotation-attribution', severity: 'warning' }),
      ]),
    );
  });
});
