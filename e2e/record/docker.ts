import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';

/**
 * The docker CLI with both of its streams kept. The same shape as the chat aggregator's live test bed, whose cluster
 * this recorder's single node is a smaller copy of.
 */
export class DockerError extends Error {
  constructor(args: string[], status: number | null, stdout: string, stderr: string) {
    super(`docker ${args.join(' ')} exited ${status}\n--- stdout\n${stdout.trim()}\n--- stderr\n${stderr.trim()}`);
    this.name = 'DockerError';
  }
}

export interface DockerResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export function docker(args: string[], { allowFailure = false } = {}): DockerResult {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) throw new DockerError(args, result.status, result.stdout, result.stderr);
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

const CONTAINER_ID_IN_MOUNTINFO = /\/containers\/([0-9a-f]{64})\//;

/** The id of the container this process runs in, or null outside one the daemon knows. */
export function ownContainerId(): string | null {
  const candidates = [hostname()];
  try {
    const match = readFileSync('/proc/self/mountinfo', 'utf8').match(CONTAINER_ID_IN_MOUNTINFO);
    if (match) candidates.push(match[1]);
  } catch {
    // not Linux, so not in a container this daemon started
  }
  return candidates.find((id) => docker(['container', 'inspect', id], { allowFailure: true }).status === 0) ?? null;
}
