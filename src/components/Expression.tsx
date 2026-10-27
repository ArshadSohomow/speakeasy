import { Dialog, SpeakButton, toast } from './ui';
import { Icon } from './Icon';
import type { Expression } from '../lib/catalog';
import { saveVocab } from '../lib/srs';
import type { Feedback } from '../lib/types';
import { CATEGORY_INFO } from '../lib/teaching';

const CAT_LABEL: Record<Expression['category'], string> = { natural: 'Natural and neutral', informal: 'Informal', slang: 'Slang', regional: 'Regional', register: 'Register-sensitive' };

export function ExpressionDialog({ expr, open, onClose }: { expr: Expression | null; open: boolean; onClose: () => void }) {
  if (!expr) return null;
  const save = () => {
    const { created } = saveVocab({ text: expr.natural, meaning: expr.meaning, lang: expr.lang, dialect: expr.dialect, context: expr.context, example: expr.example.join(' / '), source: 'explain', regional: expr.category === 'regional' });
    toast(created ? 'Saved to your vocabulary' : 'Already in your vocabulary');
  };
  return (
    <Dialog open={open} onClose={onClose} title={expr.natural}
      footer={<><SpeakButton text={expr.natural} dialect={expr.dialect} label="Play" /><SpeakButton text={expr.natural} dialect={expr.dialect} slow label="Slowly" /><button className="btn primary sm" onClick={save}><Icon name="bookmark" size={18} />Save</button></>}>
      <div className="row"><span className="tag lav">{CAT_LABEL[expr.category]}</span><span className="tag">{expr.formality}</span><span className="tag">{expr.currency}</span><span className="tag">{expr.dialect}</span></div>
      <dl className="dl">
        <dt>Means</dt><dd>{expr.meaning}</dd>
        <dt>Literally</dt><dd>{expr.literal}</dd>
        <dt>Say it</dt><dd>{expr.pronunciation}</dd>
        <dt>When</dt><dd>{expr.context}</dd>
        <dt>Who says it</dt><dd>{expr.whoUses}</dd>
        {expr.sensitivity && <><dt>Careful</dt><dd>{expr.sensitivity}</dd></>}
        <dt>Alternative</dt><dd>{expr.alternative}</dd>
      </dl>
      <div className="panel flat" style={{ padding: 12 }}>{expr.example.map((l, i) => <div key={i}>{l}</div>)}</div>
      <p className="small muted">Demo content, curated but not yet reviewed by native speakers for every region.</p>
    </Dialog>
  );
}

/** The “How people actually say it” card, driven by the teaching engine’s Feedback schema. */
export function FeedbackCard({ fb, compact = false }: { fb: Feedback; compact?: boolean }) {
  const info = CATEGORY_INFO[fb.category];
  const save = () => {
    const { created } = saveVocab({ text: fb.suggestedAlternative, meaning: fb.explanation, lang: fb.language, dialect: fb.dialect, context: `Instead of: “${fb.originalText}”`, example: fb.suggestedAlternative, source: 'conversation' });
    toast(created ? 'Saved to your vocabulary' : 'Already in your vocabulary');
  };
  return (
    <div className="nat-card">
      <div className="row">
        <span className={`tag ${info.tone === 'improve' ? 'improve' : info.tone === 'positive' ? 'good' : 'note'}`}>{info.label}</span>
        <span className="tag">{fb.dialect}</span>
        <span className="tag" title="How sure the teaching engine is">Confidence: {fb.confidence}</span>
      </div>
      <div className="nat-line"><div className="small muted">What you said</div>“{fb.originalText}”</div>
      <div className="nat-line better"><div className="small" style={{ fontWeight: 650 }}>A more natural option</div>“{fb.suggestedAlternative}”</div>
      {!compact && <p style={{ margin: 0 }}>{fb.explanation} <span className="muted">{fb.naturalnessAssessment}</span></p>}
      {fb.casualAlternative && !compact && (
        <div className="nat-line casual"><div className="small" style={{ fontWeight: 650 }}>Try it more casually</div>“{fb.casualAlternative.text}”<div className="small">{fb.casualAlternative.note}</div></div>
      )}
      <div className="row">
        <SpeakButton text={fb.suggestedAlternative} dialect={fb.dialect} label="Hear it" />
        <SpeakButton text={fb.suggestedAlternative} dialect={fb.dialect} slow label="Slowly" />
        <button className="btn sm" onClick={save}><Icon name="bookmark" size={18} />Save</button>
      </div>
    </div>
  );
}
