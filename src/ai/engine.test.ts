import { describe, expect, it } from 'vitest';
import { pickGeminiModels } from './engine';

describe('pickGeminiModels', () => {
  it('pone primero el Flash-Lite más nuevo, luego el Flash más nuevo y al final los alias', () => {
    const names = [
      'models/gemini-2.5-flash',
      'models/gemini-3.5-flash-lite',
      'models/gemini-3.8-flash',
      'models/gemini-3.1-flash-lite',
      'models/gemini-3.8-flash-preview-09-2026',
      'models/gemini-3.1-pro',
      'models/gemini-3.8-flash-image',
      'models/text-embedding-004',
    ];
    expect(pickGeminiModels(names)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest']);
  });

  it('sin lista usa los alias', () => {
    expect(pickGeminiModels([])).toEqual(['gemini-flash-lite-latest', 'gemini-flash-latest']);
  });
});
