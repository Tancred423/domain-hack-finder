const tldListUrl = new URL("../tld-list.json", import.meta.url);
const rawTlds = JSON.parse(
  await Deno.readTextFile(tldListUrl),
) as string[];

const tlds = rawTlds.map((tld) => tld.toLowerCase()).sort((a, b) => {
  return b.length - a.length || a.localeCompare(b);
});

export interface DomainHackSuggestion {
  domain: string;
  host: string;
  tld: string;
  left: string;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "");
}

export function findDomainHacks(query: string): DomainHackSuggestion[] {
  const sanitized = normalizeQuery(query);
  if (!sanitized) {
    return [];
  }

  const matches: DomainHackSuggestion[] = [];

  for (const tld of tlds) {
    if (!sanitized.endsWith(tld)) {
      continue;
    }

    const leftPart = sanitized.slice(0, sanitized.length - tld.length);
    if (!leftPart) {
      continue;
    }

    const domain = `${leftPart}.${tld}`;
    matches.push({
      domain,
      host: domain,
      tld,
      left: leftPart,
    });
  }

  return matches;
}
