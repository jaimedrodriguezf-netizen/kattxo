import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../src/common/sample';

describe('Scaffolding smoke test', () => {
  it('loads sample common constant', () => {
    expect(APP_NAME).toBe('Kattxo SRI Retenciones');
  });

  it('runs in happy-dom environment with window and document', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    const el = document.createElement('div');
    el.id = 'kattxo-test';
    document.body.appendChild(el);
    expect(document.getElementById('kattxo-test')).not.toBeNull();
  });
});
