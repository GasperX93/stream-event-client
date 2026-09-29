import { z } from 'zod';

/**
 * Served beside the page, so one build serves every deployment and a setting changes without a
 * rebuild. Relative, because the app is built with `base: './'` and may be served under a path.
 */
export const CONFIG_URL = './config.json';

const PLACEHOLDER = /^<.*>$/s;
const ETH_ADDRESS = /^(0x)?[0-9a-fA-F]{40}$/;

/** The example config ships `<...>` values, and a deployment that forgot one must not start on it. */
const filledIn = z.string().refine((value) => !PLACEHOLDER.test(value.trim()), {
  message: 'still holds the example placeholder',
});

const gatewayUrlSchema = filledIn.refine(
  (value) => (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\/[^/]/i.test(value),
  {
    message: 'must be a path on this site, such as /bee, or an http or https address',
  },
);

const catalogSchema = z.object({
  owner: filledIn.refine((value) => ETH_ADDRESS.test(value), { message: 'must be an Ethereum address' }),
  topic: filledIn.refine((value) => value.length > 0, { message: 'must not be empty' }),
});

/** Checked for shape only until the chat is built on it. */
const chatSchema = z.object({
  enabled: z.boolean(),
  beeUrl: z.string(),
  gsocResourceId: z.string(),
  gsocTopic: z.string(),
  feedOwner: z.string(),
  pollIntervalMs: z.number().int().positive(),
});

const runtimeConfigSchema = z.object({
  gatewayUrl: gatewayUrlSchema,
  catalog: catalogSchema,
  chat: chatSchema.optional(),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export type RuntimeConfigResult = { ok: true; config: RuntimeConfig } | { ok: false; problem: string };

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : 'the config'}: ${issue.message}`)
    .join('; ');
}

export function parseRuntimeConfig(raw: unknown): RuntimeConfigResult {
  const parsed = runtimeConfigSchema.safeParse(raw);
  return parsed.success ? { ok: true, config: parsed.data } : { ok: false, problem: describeIssues(parsed.error) };
}

/** Never rejects: every way the config can be missing or wrong comes back as a problem to show. */
export async function loadRuntimeConfig(fetchFn: typeof fetch = fetch): Promise<RuntimeConfigResult> {
  let response: Response;
  try {
    response = await fetchFn(CONFIG_URL, { cache: 'no-store' });
  } catch (error) {
    return { ok: false, problem: `${CONFIG_URL} could not be read: ${errorText(error)}` };
  }

  if (!response.ok) {
    return { ok: false, problem: `${CONFIG_URL} could not be read: the server answered ${response.status}` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await response.text());
  } catch {
    return { ok: false, problem: `${CONFIG_URL} is not JSON` };
  }

  return parseRuntimeConfig(raw);
}

export interface ConfigProblemText {
  title: string;
  detail: string;
  hint: string;
}

export function configProblemText(result: { ok: false; problem: string }): ConfigProblemText {
  return {
    title: 'This page cannot start',
    detail: `Its settings are missing or wrong. ${result.problem}.`,
    hint: `Whoever runs this site sets them in config.json, served beside the page.`,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
