import {expect, test} from '@playwright/test';
import {readTypedTime} from '../src/components/time-field/typedTime';

// A pure function: no page needed, so it runs once, in the desktop project.
test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'desktop', 'runs once'));

test('a dot between hours and minutes is read as a time', () => {
  expect(readTypedTime('17.00')).toBe('17:00');
  expect(readTypedTime(' 9.30 ')).toBe('09:30');
  expect(readTypedTime('0.05')).toBe('00:05');
  expect(readTypedTime('23.59')).toBe('23:59');
  expect(readTypedTime('17.')).toBe('17:00');
});

test('times that don’t exist are not', () => {
  expect(readTypedTime('24.00')).toBeNull();
  expect(readTypedTime('17.60')).toBeNull();
  expect(readTypedTime('17.5')).toBeNull();
  expect(readTypedTime('117.00')).toBeNull();
});

test('what Astryx reads itself is left to Astryx', () => {
  for (const text of ['', '17', '1700', '17:00', '5:30 PM', '5.30 pm', '22. 11. 2026.', 'kraj dana']) {
    expect(readTypedTime(text)).toBeNull();
  }
});
