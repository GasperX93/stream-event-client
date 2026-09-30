import { join } from 'node:path';

/** A test-results folder is what a CI run keeps as its artifact. */
export const RECORDING_OUT = join(import.meta.dirname, '..', '..', 'test-results', 'recorded');
export const STAMP_FILE = join(import.meta.dirname, '..', '..', 'test-results', 'recorder-stamp');
