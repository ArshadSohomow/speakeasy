import { describe, it, expect } from 'vitest';
import { processTranscript, parseCommand, formatOutput, applySpokenPunctuation, diffWords, isQuestion, DEFAULT_PREFS } from '../src/lib/textProcessing';

const run = (text: string, mode: 'verbatim' | 'clean' | 'polished' = 'clean') => processTranscript([{ text }], mode, DEFAULT_PREFS).text;

describe('filler detection keeps meaningful language', () => {
  it('keeps "like" as a verb', () => {
    expect(run('I like the design', 'polished')).toBe('I like the design.');
  });
  it('keeps "you know" with an object', () => {
    expect(run('you know the answer', 'polished')).toBe('You know the answer.');
  });
  it('keeps "looks like" and "something like"', () => {
    expect(run('it looks like rain and something like that', 'polished')).toBe('It looks like rain and something like that.');
  });
  it('removes "like" used as filler in polished mode', () => {
    expect(run('it was like really good', 'polished')).toBe('It was really good.');
  });
  it('removes um and uh in clean mode', () => {
    expect(run('um so I think uh we should go')).toBe('So I think we should go.');
  });
  it('removes trailing "you know" filler in polished mode', () => {
    expect(run('it was a long day you know', 'polished')).toBe('It was a long day.');
  });
});

describe('modes are distinct', () => {
  const spoken = 'can you move the meeting to two actually make that three and send everyone the notes';
  it('verbatim preserves every word', () => {
    expect(run('um I I think so', 'verbatim')).toBe('Um I I think so.');
  });
  it('clean does not resolve self-corrections', () => {
    expect(run(spoken, 'clean')).toContain('two actually make that three');
  });
  it('polished resolves the self-correction', () => {
    expect(run(spoken, 'polished')).toBe('Can you move the meeting to three and send everyone the notes?');
  });
  it('resolves anchored corrections', () => {
    expect(run('send it to John I mean to Sarah', 'polished')).toBe('Send it to Sarah.');
  });
  it('resolves "no wait"', () => {
    expect(run("let's meet on Tuesday no wait Wednesday", 'polished')).toBe("Let's meet on Wednesday.");
  });
  it('does not treat a plain apology as a correction', () => {
    expect(run("I'm sorry I'm late", 'polished')).toBe("I'm sorry I'm late.");
  });
  it('removes repeated starts', () => {
    expect(run('I want to I want to go home')).toBe('I want to go home.');
  });
});

describe('punctuation', () => {
  it('applies spoken punctuation', () => {
    expect(applySpokenPunctuation('hello comma how are you question mark')).toBe('hello , how are you ?');
  });
  it('splits paragraphs on "new paragraph"', () => {
    const r = processTranscript([{ text: 'first point full stop new paragraph second point' }], 'clean');
    expect(r.paragraphs.length).toBe(2);
  });
  it('detects questions', () => {
    expect(isQuestion('what time is it'.split(' '))).toBe(true);
    expect(isQuestion('when I got home it was late'.split(' '))).toBe(false);
  });
});

describe('voice commands', () => {
  it('recognises short whole-utterance commands', () => {
    expect(parseCommand('Delete the last sentence.')?.id).toBe('delete-last');
    expect(parseCommand('make that more formal')?.id).toBe('formal');
    expect(parseCommand('stop recording')?.id).toBe('stop');
  });
  it('ignores commands embedded in dictation', () => {
    expect(parseCommand('I told him to delete the last sentence of the report yesterday')).toBeNull();
    expect(parseCommand('we should save this for the meeting')).toBeNull();
  });
});

describe('formatting', () => {
  it('formats a dictated list as bullets', () => {
    const out = formatOutput([['We need eggs, milk, bread and coffee.']], 'bullets');
    expect(out.split('\n').length).toBe(4);
  });
  it('extracts action items', () => {
    const out = formatOutput([['The launch went well.', 'Can you send everyone the notes?']], 'meeting', { date: 'today' });
    expect(out).toContain('☐ Send everyone the notes');
  });
});

describe('diff', () => {
  it('finds deletions', () => {
    const ops = diffWords('um I think so', 'I think so');
    expect(ops[0]).toEqual({ type: 'del', text: 'um' });
  });
});
