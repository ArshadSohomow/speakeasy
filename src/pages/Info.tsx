import type { ReactNode } from 'react';
import { Wordmark } from '../components/ui';
import { Link } from '../lib/router';

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="site-nav scrolled"><div className="inner"><Wordmark /><div className="row" style={{ marginLeft: 'auto' }}><Link className="btn" to="/app">Open app</Link></div></div></header>
      <main id="main" className="wrap" style={{ maxWidth: 760, padding: '40px var(--gutter) 80px' }}>
        <h1>{title}</h1>
        <div className="stack">{children}</div>
      </main>
    </>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy">
      <p>Speakeasy is a speaking app, so it handles your voice. Here’s exactly what happens in this demo build.</p>
      <h2>Microphone</h2>
      <p>We only ask for microphone access when you press a microphone button. You can say no and use text instead.</p>
      <h2>Speech recognition</h2>
      <p>Transcription uses your browser’s built-in speech recognition. In Chrome and Edge, audio is sent to the browser maker’s speech service to be transcribed; Safari may process it on your device. Speakeasy itself doesn’t receive or store your audio in this demo.</p>
      <h2>Recordings</h2>
      <p>Recordings for replay are off by default. If you turn them on, audio is kept only in the open browser tab and is discarded when you leave the page.</p>
      <h2>Your learning data</h2>
      <p>Settings, vocabulary, session summaries and recurring mistakes are stored in your browser’s local storage. You can view, export or delete them in Settings at any time. Clearing your browser data also removes them.</p>
      <h2>When accounts and AI are switched on</h2>
      <p>In the production version, conversation turns are sent to an AI provider to generate replies, and data is stored on our servers so you can use it across devices. We will say clearly which providers process your speech and text, never use your recordings to train models without explicit consent, and let you delete everything.</p>
      <p className="muted small">Speakeasy offers language and speaking practice. It isn’t a clinical service and doesn’t diagnose or treat speech conditions.</p>
    </Page>
  );
}

const ROWS: [string, string, string, string][] = [
  ['Landing, onboarding, navigation, themes', 'Works', '—', 'Production auth and server profile'],
  ['Mascot previews and language samples', 'Works with your device’s voices', 'Studio-quality voices need a TTS provider', 'Licensed neural voices per dialect'],
  ['Conversation Coach', 'Voice loop works (listen → reply → speak), hands-free, barge-in, translation, explain, summaries', 'Replies come from a scripted demo engine; the /api/converse adapter is ready for an LLM key', 'LLM conversation with retrieval of validated expressions'],
  ['Corrections and “How people say it”', 'Rule-based teaching engine for common English and starter Spanish/French/German patterns', 'Broad coverage needs the AI feedback endpoint', 'Native-speaker-validated knowledge base'],
  ['Voice Studio', 'Live transcription, verbatim/clean/polished, filler detection, self-corrections, 12 formats, voice commands, diff, undo, export', 'Hard rewrites (“make it more formal”) are rule-based', 'Streaming STT provider and LLM rewrite'],
  ['Pronunciation', 'Reference audio, recording, replay, word-level recognition check', 'Phoneme-level scoring needs a pronunciation-assessment API', 'Sound-level feedback where the provider supports it'],
  ['Speaking Practice', 'Timer, live transcript, pace, fillers, pauses (approximate), transitions, report with evidence', '—', 'Acoustic measures where validated'],
  ['Vocabulary and review', 'Spaced repetition with recall, listening and use-it tasks', '—', 'Sync across devices'],
  ['Daily challenge and community quotes', 'Daily content, dictated quotes, voting and reporting (local to your browser)', 'A shared community pool needs the backend and moderation tools', 'Moderation queue and featured selection job'],
  ['Progress', 'Calculated from your real sessions; sample data is clearly labelled', '—', 'Server-side analytics'],
];

export function About() {
  return (
    <Page title="What’s real in this demo">
      <p>Speakeasy is being built in stages. This build runs entirely in your browser with no paid services connected, so some features use honest stand-ins. Nothing here pretends to be connected when it isn’t.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Feature</th><th>Works now</th><th>Needs credentials or a service</th><th>Planned</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{i === 0 ? <strong>{c}</strong> : c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="muted small">Best experienced in Chrome, Edge or Safari, which support speech recognition. Firefox works with typing.</p>
    </Page>
  );
}
