import { describe, expect, it } from 'vitest';
import { addNote, initialState, newNote, restoreRevision, reviseNote } from './actions';

describe('versiones de los apuntes', () => {
  it('guarda la versión anterior y deja volver a ella', () => {
    const n = newNote('n1', 1, { markdown: 'v1' });
    let s = addNote(initialState(), n);
    s = reviseNote(s, 'n1', 'v2', 'Añadido un ejemplo', 10);
    s = reviseNote(s, 'n1', 'v3', 'Corregida la definición', 20);
    let note = s.notes[0];
    expect(note.markdown).toBe('v3');
    expect(note.revisions?.map((r) => [r.at, r.markdown, r.reason])).toEqual([[10, 'v1', 'Añadido un ejemplo'], [20, 'v2', 'Corregida la definición']]);
    s = restoreRevision(s, 'n1', 10, 30);
    note = s.notes[0];
    expect(note.markdown).toBe('v1');
    expect(note.revisions?.at(-1)?.markdown).toBe('v3');
    expect(reviseNote(s, 'n1', 'v1', 'sin cambios', 40).notes[0].revisions).toHaveLength(3);
  });
});
