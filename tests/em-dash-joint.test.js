import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { emDashJoint } from '../src/lib/em-dash-joint';

// The split that keeps a closed em dash from starting a line. See
// specs/resume.md § Dash punctuation and src/lib/em-dash-joint.ts for why the
// guard is a nowrap span rather than a word joiner.

describe('emDashJoint (src/lib/em-dash-joint.ts)', () => {
  it('is the shared splitter both résumé heading surfaces use', () => {
    for (const relativePath of [
      'src/components/resume/ExperienceSection.astro',
      'src/components/resume/ProjectsSection.astro',
    ]) {
      const source = readFileSync(resolve(relativePath), 'utf8');
      expect(source, relativePath).toContain('emDashJoint');
      expect(source, `${relativePath} should render the joint span`).toContain(
        'class="em-dash-joint"',
      );
    }
  });

  it('glues the dash to the word that closes on it', () => {
    expect(emDashJoint('Senior Product Manager—Disney Entertainment')).toEqual({
      head: 'Senior Product ',
      joint: 'Manager—',
      tail: 'Disney Entertainment',
    });
  });

  it('reassembles to the original string, for every heading the résumé renders', () => {
    // The whole safety property: the span may change where lines break and
    // must not change a single character of what is read out of the page.
    for (const text of [
      'Senior Product Manager—Disney Entertainment and ESPN Product & Technology',
      'Senior Technical Project Manager, Lead—Disney Streaming',
      'Technical Project Manager—MLB Advanced Media / BAMTech Media',
      'Director of Information Technology—AJ+',
      'Senior Systems Architect—Current TV',
      'Systems Architect / Support Roles—CNN',
      'Five Across—Live Multiplayer Social Bingo Platform',
      'Friends & Family Billing—Shared-Bill Coordination',
      'Matchline—AI Career CRM',
    ]) {
      const { head, joint, tail } = emDashJoint(text);
      expect(head + joint + tail, text).toBe(text);
      expect(joint, `${text}: the joint should close on the em dash`).toMatch(/—$/);
      expect(joint, `${text}: the joint should hold one word, not a phrase`).not.toMatch(/ /);
    }
  });

  it('passes text with no em dash through whole', () => {
    // Callers render head/joint/tail unconditionally, so a dashless heading
    // has to come back as itself with nothing to wrap.
    expect(emDashJoint('B.S., Management Information Systems')).toEqual({
      head: 'B.S., Management Information Systems',
      joint: '',
      tail: '',
    });
  });

  it('handles a dash inside the first word', () => {
    // `lastIndexOf(' ', dash)` returns -1 here; +1 makes the joint start at 0
    // rather than swallowing the string end-first.
    expect(emDashJoint('Matchline—AI Career CRM')).toEqual({
      head: '',
      joint: 'Matchline—',
      tail: 'AI Career CRM',
    });
  });

  it('splits on the first em dash when a string carries two', () => {
    // No heading does today. Pinned so the behaviour is decided rather than
    // discovered: the first dash is the construction's own join.
    expect(emDashJoint('One—two—three')).toEqual({
      head: '',
      joint: 'One—',
      tail: 'two—three',
    });
  });
});
