import { type FormEvent, useRef, useState } from 'react';
import { searchOpinions, type SearchResult } from './search';

export default function App() {
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTerm = term.trim();
    if (!cleanTerm || loading) return;
    setLoading(true);
    setError('');

    try {
      setResult(await searchOpinions(cleanTerm));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The court records are being difficult. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setResult(null);
    setError('');
    setTerm('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (loading) {
    return (
      <main className="game-shell result-shell" aria-live="polite">
        <div className="loading-stage">
          <p className="stamp">SEARCHING THE RECORD</p>
          <div className="loading-line wide" /><div className="loading-line" /><div className="loading-line short" />
          <p className="loading-copy">Asking several million opinions a very specific question.</p>
        </div>
      </main>
    );
  }

  if (result) {
    const displayTerm = smartTitle(result.term);
    const foundCase = result.count > 0 ? result.case : null;

    return (
      <main className="game-shell result-shell">
        <div className="doodle courthouse result-doodle" aria-hidden="true"><i /><b /><b /><b /><b /><span /></div>
        <article className="result-stage" aria-live="polite">
          {foundCase ? (
            <>
              <p className="verdict">OH YES.</p>
              <h1 className="result-count"><strong>{result.count.toLocaleString('en-US')}</strong> opinions.</h1>
              <p className="result-sentence">“{displayTerm}” appears in {result.count.toLocaleString('en-US')} U.S. judicial opinions indexed by CourtListener.</p>
              <p className="percentile">That puts it above <strong>{result.percentile}%</strong> of a mix of everyday and oddball comparison terms.</p>

              <section className="case-file">
                <p className="case-label">ONE REAL CASE</p>
                <h2>{foundCase.name}</h2>
                <p className="case-meta">{foundCase.court} <span>/</span> {foundCase.year}{foundCase.citation ? <><span>/</span> {foundCase.citation}</> : null}</p>
                <p className="case-summary">{foundCase.summary}</p>
                <a className="primary-link" href={foundCase.url} target="_blank" rel="noreferrer">READ THE CASE</a>
              </section>
            </>
          ) : (
            <>
              <p className="verdict unicorn">LEGAL UNICORN</p>
              <h1 className="unicorn-title">We couldn’t find “{displayTerm}” in the opinions we searched.</h1>
            </>
          )}

          <button className="again-button" type="button" onClick={restart}>SEARCH SOMETHING ELSE</button>
          <p className="disclaimer">No results here does not mean the subject has never been involved in a lawsuit. This game searches available judicial opinions, not every case ever filed.</p>
          <p className="source-note">Live results from <a href="https://www.courtlistener.com/" target="_blank" rel="noreferrer">CourtListener</a>, a Free Law Project service. Counts change as its collection grows.</p>
        </article>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <div className="doodle courthouse" aria-hidden="true"><i /><b /><b /><b /><b /><span /></div>
      <div className="doodle gavel" aria-hidden="true"><i /><span /></div>
      <div className="doodle scales" aria-hidden="true"><i /><span /><b /><b /></div>
      <div className="doodle case-page" aria-hidden="true"><i /><b /><b /><b /></div>
      <section className="search-stage" aria-labelledby="game-title">
        <p className="stamp">A QUESTIONABLE USE OF PUBLIC RECORDS</p>
        <h1 id="game-title">Has This Ever<br />Been <em>Litigated?</em></h1>
        <p className="lede">Type anything. Someone may have gone to court over it.</p>
        <form onSubmit={submit} className="search-form">
          <label htmlFor="term">Your word or short phrase</label>
          <div className="search-row">
            <input ref={inputRef} id="term" name="term" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="pickle, squirrel, glitter..." autoComplete="off" maxLength={80} autoFocus />
            <button type="submit" disabled={!term.trim()}>SEARCH</button>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

function smartTitle(value: string) {
  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('en-US'));
}
