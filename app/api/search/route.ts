const COMPARISON_COUNTS = [218, 1684, 2649, 3497, 4181, 9098, 22542, 31757, 32954, 42689, 60749];

type CourtListenerOpinion = { snippet?: string };
type CourtListenerResult = {
  absolute_url?: string;
  caseName?: string;
  citation?: string[];
  court?: string;
  dateFiled?: string;
  opinions?: CourtListenerOpinion[];
  suitNature?: string;
  syllabus?: string;
};
type CourtListenerResponse = { count?: number; results?: CourtListenerResult[] };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = (searchParams.get('q') || '').trim().replace(/\s+/g, ' ');
  if (!term || term.length > 80) return Response.json({ error: 'Enter a word or short phrase, up to 80 characters.' }, { status: 400 });
  if (/[\u0000-\u001f\u007f]/.test(term)) return Response.json({ error: 'That search contains unsupported characters.' }, { status: 400 });

  const exactQuery = `"${term.replace(/[\\"]/g, '\\$&')}"`;
  const url = new URL('https://www.courtlistener.com/api/rest/v4/search/');
  url.searchParams.set('type', 'o');
  url.searchParams.set('q', exactQuery);

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'HasThisEverBeenLitigated/1.0 (public web game)' } });
  } catch {
    return Response.json({ error: 'The opinion archive did not answer. Please try again.' }, { status: 502 });
  }
  if (upstream.status === 429) return Response.json({ error: 'The opinion archive is busy. Give it a moment, then try again.' }, { status: 503 });
  if (!upstream.ok) return Response.json({ error: 'The opinion archive did not answer. Please try again.' }, { status: 502 });

  const data = await upstream.json() as CourtListenerResponse;
  const count = typeof data.count === 'number' ? data.count : 0;
  const selected = chooseCase(data.results || [], term);
  const below = COMPARISON_COUNTS.filter((comparison) => count > comparison).length;

  return Response.json({
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
  }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
}

function chooseCase(results: CourtListenerResult[], term: string) {
  const lowered = term.toLocaleLowerCase('en-US');
  const containsTerm = (result: CourtListenerResult) => result.opinions?.some((opinion) => cleanText(opinion.snippet || '').toLocaleLowerCase('en-US').includes(lowered));
  return results.find((result) => result.absolute_url && containsTerm(result) && (result.suitNature || result.syllabus))
    || results.find((result) => result.absolute_url && containsTerm(result))
    || results.find((result) => result.absolute_url)
    || null;
}

function makeSummary(result: CourtListenerResult, term: string) {
  const context = excerptAroundTerm(result.opinions?.[0]?.snippet || '', term);
  const nature = cleanText(result.suitNature || result.syllabus || '').toLocaleLowerCase('en-US').replace(/[.\s]+$/, '');
  if (nature && context) return `The dispute concerned ${lowerFirst(nature)}. The matching passage reads: “${context}”`;
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

function lowerFirst(value: string) {
  return value.charAt(0).toLocaleLowerCase('en-US') + value.slice(1);
}
