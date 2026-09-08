import { describe, expect, it } from 'vitest';
import { getEntryThemeToggleCopy } from './EntryThemeToggle';

describe('entry theme toggle copy', () => {
  it('describes the alternate theme rather than the active theme', () => {
    expect(getEntryThemeToggleCopy('light')).toEqual({
      action: 'Switch to dark mode',
      label: 'Dark mode',
    });
    expect(getEntryThemeToggleCopy('dark')).toEqual({
      action: 'Switch to light mode',
      label: 'Light mode',
    });
  });
});
