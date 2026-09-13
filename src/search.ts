const COMPARISON_COUNTS = [218, 1684, 2649, 3497, 4181, 9098, 22542, 31757, 32954, 42689, 60749];
const SEARCH_URL = 'https://www.courtlistener.com/api/rest/v4/search/';

export type SearchResult = {
  term: string;
  count: number;
  percentile: number;
  comparisonSize: number;
  case: null | { name: string; court: string; year: string; citation: string; summary: string; url: string };
};

type CourtListenerOpinion = { snippet?: string };
type CourtListenerCase = {
  absolute_url?: string;
  caseName?: string;
  citation?: string[];
  court?: string;
  dateFiled?: string;
  opinions?: CourtListenerOpinion[];
  suitNature?: string;
  syllabus?: string;
};
type CourtListenerResponse = { count?: number; results?: CourtListenerCase[]; detail?: string };

export async function searchOpinions(input: string): Promise<SearchResult> {
  const term = input.trim().replace(/\s+/g, ' ');
  if (!term || term.length > 80) throw new Error('Enter a word or short phrase, up to 80 characters.');
  if (/[\u0000-\u001f\u007f]/.test(term)) throw new Error('That search contains unsupported characters.');

  const url = new URL(SEARCH_URL);
  url.searchParams.set('type', 'o');
  url.searchParams.set('q', `"${term.replace(/[\\"]/g, '\\$&')}"`);

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('The opinion archive did not answer. Please try again.');
  }

  if (response.status === 429) throw new Error('The opinion archive is busy. Give it a moment, then try again.');
  if (!response.ok) throw new Error('The opinion archive did not answer. Please try again.');

  const data = await response.json() as CourtListenerResponse;
  const count = typeof data.count === 'number' ? data.count : 0;
  const selected = chooseCase(data.results || [], term);
  const below = COMPARISON_COUNTS.filter((comparison) => count > comparison).length;

  return {
    term,
    count,
    percentile: Math.round((below / COMPARISON_COUNTS.length) * 100),
    comparisonSize: COMPARISON_COUNTS.length,
    case: selected ? {
      name: selected.caseName || 'Untitled judicial opinion',
      court: selected.court || 'U.S. court',
      year: selected.dateFiled?.slice(0, 4) || 'Year unavailable',
      citation: selected.citation?.[0] || '',
      summary: makeSummary(selected, term),
      url: `https://www.courtlistener.com${selected.absolute_url}`,
    } : null,
  };
}

function chooseCase(results: CourtListenerCase[], term: string) {
  const lowered = term.toLocaleLowerCase('en-US');
  const containsTerm = (result: CourtListenerCase) => result.opinions?.some((opinion) => cleanText(opinion.snippet || '').toLocaleLowerCase('en-US').includes(lowered));
  return results.find((result) => result.absolute_url && containsTerm(result) && (result.suitNature || result.syllabus))
    || results.find((result) => result.absolute_url && containsTerm(result))
    || results.find((result) => result.absolute_url)
    || null;
}

function makeSummary(result: CourtListenerCase, term: string) {
  const context = excerptAroundTerm(result.opinions?.[0]?.snippet || '', term);
  const nature = cleanText(result.suitNature || result.syllabus || '').toLocaleLowerCase('en-US').replace(/[.\s]+$/, '');
  if (nature && context) return `The dispute concerned ${nature}. The matching passage reads: “${context}”`;
  if (context) return `The court’s opinion includes “${term}” in this passage: “${context}”`;
  return `CourtListener found “${term}” in this opinion’s indexed text.`;
}

function excerptAroundTerm(html: string, term: string) {
  const value = cleanText(html);
  const index = value.toLocaleLowerCase('en-US').indexOf(term.toLocaleLowerCase('en-US'));
  if (index < 0) return trimExcerpt(value);
  const start = Math.max(0, index - 85);
  const end = Math.min(value.length, index + term.length + 120);
  const excerpt = value.slice(start, end).replace(/^\S*\s/, start ? '' : '$&').replace(/\s\S*$/, end < value.length ? '' : '$&').trim();
  return `${start ? '…' : ''}${excerpt}${end < value.length ? '…' : ''}`;
}

function trimExcerpt(value: string) {
  if (!value) return '';
  return value.length > 220 ? `${value.slice(0, 217).replace(/\s+\S*$/, '')}…` : value;
}

function cleanText(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}
