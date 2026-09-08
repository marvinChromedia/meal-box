import { configure } from '@testing-library/dom';
import '@testing-library/jest-dom/vitest';

// TEST-235: several sessions share one dev machine, each running builds,
// suites and dev servers at once. Under that contention, a genuinely correct
// test can outrun the 1000ms default (a Button test has been observed taking
// 4.7s when the machine was saturated — nothing in the code was wrong).
// This is tolerance for a starved CPU, not a fix for a race: a test that
// asserts a mid-flight state by racing a real timer is still wrong and
// should be fixed at the test, not papered over by a longer timeout — see
// "Two ways a test can look flaky" below.
configure({ asyncUtilTimeout: 5000 });
