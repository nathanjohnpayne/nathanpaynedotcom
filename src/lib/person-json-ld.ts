/**
 * Person facts shared by the homepage and résumé JSON-LD (#1166).
 *
 * Both pages emit a Person node with the same `@id`, so a fact they both
 * state has to be the same fact. Before #1166 each page typed its own: the
 * homepage listed Disney as the alumnus organization, the résumé George Mason,
 * and each spelled out the location by hand. These helpers derive those facts
 * from the `myself`, `education` and `experience` collections instead.
 *
 * Each page still chooses which properties its node carries; only the facts
 * come from here.
 */

interface EducationLike {
  data: { school: string; year: number };
}

interface ExperienceLike {
  data: { order: number; alumniOrganization?: string };
}

export interface AlumniOfNode {
  '@type': 'CollegeOrUniversity' | 'Organization';
  name: string;
}

/**
 * The Person `alumniOf` list: every school in `education`, oldest first, then
 * every organization an `experience` entry names in `alumniOrganization`, most
 * recent role first, each listed once.
 */
export function alumniOf(
  education: readonly EducationLike[],
  experience: readonly ExperienceLike[],
): AlumniOfNode[] {
  const schools = [...education]
    .sort((a, b) => a.data.year - b.data.year)
    .map((entry): AlumniOfNode => ({ '@type': 'CollegeOrUniversity', name: entry.data.school }));

  const organizations = [...experience]
    .sort((a, b) => a.data.order - b.data.order)
    .flatMap((entry) => (entry.data.alumniOrganization ? [entry.data.alumniOrganization] : []))
    .map((name): AlumniOfNode => ({ '@type': 'Organization', name }));

  const seen = new Set<string>();
  return [...schools, ...organizations].filter((node) => {
    if (seen.has(node.name)) return false;
    seen.add(node.name);
    return true;
  });
}

export interface Address {
  locality: string;
  region: string;
  regionName: string;
  country: string;
  countryName: string;
}

/** "San Francisco, CA": the résumé header and metadata panel form. */
export function shortLocation(address: Address): string {
  return `${address.locality}, ${address.region}`;
}

/** "San Francisco, California, United States": the homepage `homeLocation` name. */
export function longLocation(address: Address): string {
  return `${address.locality}, ${address.regionName}, ${address.countryName}`;
}
