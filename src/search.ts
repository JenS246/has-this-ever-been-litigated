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
  url.searchParams.set('highlight', 'on');
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
      name: cleanText(selected.caseName || 'Untitled judicial opinion'),
      court: selected.court || 'U.S. court',
      year: selected.dateFiled?.slice(0, 4) || 'Year unavailable',
      citation: selected.citation?.[0] || '',
      summary: makeSummary(selected, term),
      url: `https://www.courtlistener.com${selected.absolute_url}`,
    } : null,
  };
}

export function chooseCase(results: CourtListenerCase[], term: string) {
  const lowered = term.toLocaleLowerCase('en-US');
  const ranked = results
    .filter((result) => result.absolute_url)
    .map((result, index) => {
      const snippetHtml = result.opinions?.map((opinion) => opinion.snippet || '').join(' ') || '';
      const snippet = cleanText(snippetHtml).toLocaleLowerCase('en-US');
      const caseName = cleanText(result.caseName || '').toLocaleLowerCase('en-US');
      const matchCount = countOccurrences(snippet, lowered);
      const hasHighlightedMatch = /<mark\b[^>]*>/i.test(snippetHtml) && matchCount > 0;
      const metadata = cleanText(`${result.suitNature || ''} ${result.syllabus || ''}`).toLocaleLowerCase('en-US');
      const context = contextsAroundTerm(snippet, lowered, 180).join(' ');
      const hasSubstantiveContext = SUBSTANTIVE_CUES.test(context);
      const looksLikePartyIdentification = PARTY_IDENTIFICATION_CUES.test(context);
      const looksLikeEntityName = entityNamePattern(lowered).test(context);

      let score = hasHighlightedMatch ? 100 : -500;
      score += Math.min(matchCount, 3) * 12;
      score += Math.max(0, 20 - index);
      if (caseName.includes(lowered)) score -= 25;
      if (metadata.includes(lowered)) score += 80;
      if (hasSubstantiveContext) score += 90;
      if (looksLikeEntityName) score -= 160;
      if (looksLikePartyIdentification && !hasSubstantiveContext) score -= 140;
      if (INCIDENTAL_CUES.test(context) && !hasSubstantiveContext) score -= 50;

      return { result, score, hasHighlightedMatch };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.find((candidate) => candidate.hasHighlightedMatch)?.result
    || ranked[0]?.result
    || null;
}

function makeSummary(result: CourtListenerCase, term: string) {
  const snippets = result.opinions?.map((opinion) => opinion.snippet || '').join(' ') || '';
  const context = excerptAroundTerm(snippets, term);
  const nature = shortNature(result.suitNature || result.syllabus || '');
  if (nature && context) return `The dispute concerned ${nature}. The matching passage reads: “${context}”`;
  if (context) return `The court’s opinion includes “${term}” in this passage: “${context}”`;
  if (nature) return `The dispute concerned ${nature}. CourtListener indexes “${term}” in the opinion text.`;
  return `CourtListener indexes “${term}” in this opinion, but its preview does not show the surrounding passage.`;
}

function excerptAroundTerm(html: string, term: string) {
  const value = cleanText(html);
  const index = value.toLocaleLowerCase('en-US').indexOf(term.toLocaleLowerCase('en-US'));
  if (index < 0) return '';
  const start = Math.max(0, index - 85);
  const end = Math.min(value.length, index + term.length + 120);
  const excerpt = value.slice(start, end).replace(/^\S*\s/, start ? '' : '$&').replace(/\s\S*$/, end < value.length ? '' : '$&').trim();
  return `${start ? '…' : ''}${excerpt}${end < value.length ? '…' : ''}`;
}

function contextsAroundTerm(value: string, term: string, radius: number) {
  const contexts: string[] = [];
  let position = 0;
  while ((position = value.indexOf(term, position)) >= 0) {
    contexts.push(value.slice(Math.max(0, position - radius), Math.min(value.length, position + term.length + radius)));
    position += term.length;
  }
  return contexts;
}

function countOccurrences(value: string, term: string) {
  if (!term) return 0;
  let count = 0;
  let position = 0;
  while ((position = value.indexOf(term, position)) >= 0) {
    count += 1;
    position += term.length;
  }
  return count;
}

function entityNamePattern(term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:\\b${escaped}\\s+(?:co(?:mpan(?:y|ies))?|corp(?:oration)?|inc(?:orporated)?|llc)\\b|\\b(?:co(?:mpan(?:y|ies))?|corp(?:oration)?|inc(?:orporated)?|llc)\\s+(?:of\\s+)?${escaped}\\b)`, 'i');
}

function shortNature(value: string) {
  const text = cleanText(value).replace(/[.\s]+$/, '');
  if (!text) return '';
  const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim().replace(/[.\s]+$/, '') || text;
  const shortened = firstSentence.length <= 260 ? firstSentence : `${firstSentence.slice(0, 257).replace(/\s+\S*$/, '')}…`;
  return shortened.charAt(0).toLocaleLowerCase('en-US') + shortened.slice(1);
}

function cleanText(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

const SUBSTANTIVE_CUES = /\b(?:ban|caused|commerce|consumer|copyright|damage|defect|endangered|habitat|illegal|infring|injur|manufactur|market|merchandise|patent|population|product|protect|purchase|regulat|sale|sell|sold|species|stole|theft|trademark|treatment)\w*\b/i;
const PARTY_IDENTIFICATION_CUES = /\b(?:appellant|appellee|company|corporation|defendant|incorporated|limited liability|llc|petitioner|plaintiff|respondent)\b/i;
const INCIDENTAL_CUES = /\b(?:color|found|liked|mentioned|notice|noticed|photograph|wear|wearing|wore)\w*\b/i;
