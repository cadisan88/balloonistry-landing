import { describe, expect, it } from 'vitest';
import { faqEmptyMessage, faqMatches, faqResultsMessage, normalizeText } from '../src/lib/faq';

describe('normalizeText', () => {
  it('lowercases, removes accents and tidies spaces', () => {
    expect(normalizeText('  Café   ORDERING ')).toBe('cafe ordering');
    expect(normalizeText('Pâtisserie à Montréal')).toBe('patisserie a montreal');
  });
});

describe('faqMatches', () => {
  const question = 'How do I order?';
  const answer = 'Send us your list on WhatsApp. We reply within a day.';

  it('matches everything when the query is empty', () => {
    expect(faqMatches('', question, answer)).toBe(true);
    expect(faqMatches('   ', question, answer)).toBe(true);
  });

  it('matches the question or the answer, ignoring case', () => {
    expect(faqMatches('ORDER', question, answer)).toBe(true);
    expect(faqMatches('whatsapp', question, answer)).toBe(true);
  });

  it('ignores accents on both sides', () => {
    expect(faqMatches('répl', question, answer)).toBe(true);
    expect(faqMatches('reply', 'Quelle est la réponse?', 'Écrivez-nous.')).toBe(false);
    expect(faqMatches('reponse', 'Quelle est la réponse?', 'Écrivez-nous.')).toBe(true);
    expect(faqMatches('ecrivez', 'Quelle est la réponse?', 'Écrivez-nous.')).toBe(true);
  });

  it('needs every word, in any order', () => {
    expect(faqMatches('whatsapp order', question, answer)).toBe(true);
    expect(faqMatches('whatsapp pickup', question, answer)).toBe(false);
  });

  it('does not match a word that is not there', () => {
    expect(faqMatches('refund', question, answer)).toBe(false);
  });
});

describe('faqEmptyMessage', () => {
  it('wraps the query in curly quotes and has no replacement character', () => {
    const message = faqEmptyMessage('  balloons ');
    expect(message).toBe('No questions match “balloons”.');
    expect(message).not.toContain('�');
    expect(message).toContain('“');
    expect(message).toContain('”');
  });
});

describe('faqResultsMessage', () => {
  it('uses the right plural', () => {
    expect(faqResultsMessage(0)).toBe('0 questions found');
    expect(faqResultsMessage(1)).toBe('1 question found');
    expect(faqResultsMessage(3)).toBe('3 questions found');
  });
});
