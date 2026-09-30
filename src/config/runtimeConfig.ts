import { z } from 'zod';

// Imported by its file name, so Node reads this schema without the bundler, as the deployment's own tests do.
import { DEFAULT_THEME, THEME_NAMES, type ThemeName } from '../design/themeNames.ts';

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

const PRIVATE_KEY = /^(0x)?[0-9a-fA-F]{64}$/;

const isRootedPathOrHttpUrl = (value: string) =>
  (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\/[^/]/i.test(value);

const gatewayUrlSchema = filledIn.refine(isRootedPathOrHttpUrl, {
  message: 'must be a path on this site, such as /bee, or an http or https address',
});

const ethAddress = filledIn.refine((value) => ETH_ADDRESS.test(value), { message: 'must be an Ethereum address' });

const notEmpty = filledIn.refine((value) => value.trim().length > 0, { message: 'must not be empty' });

const catalogSchema = z.object({
  owner: ethAddress,
  topic: notEmpty,
});

const chatEndpoint = filledIn.refine(isRootedPathOrHttpUrl, {
  message: 'must be a path on this site or an http or https address',
});

const enabledChatSchema = z.object({
  enabled: z.literal(true),
  /** Where the chat's feed and history files are read, a gateway that serves only reads. */
  readUrl: chatEndpoint,
  /** Where messages are written, a gateway that stamps each write, apart from the one that reads. */
  writeUrl: chatEndpoint,
  /** The one endpoint of before, refused by name so a config written for it says what replaced it. */
  beeUrl: z.undefined({ message: 'is replaced by chat.readUrl and chat.writeUrl' }).optional(),
  /**
   * A private key every viewer receives, so it is configuration and not a secret: the GSOC address it
   * signs for is where the chat aggregator listens, and every viewer writes there with the same key.
   */
  gsocResourceId: filledIn.refine((value) => PRIVATE_KEY.test(value), {
    message: 'must be 32 bytes written as 64 hex digits',
  }),
  gsocTopic: notEmpty,
  feedOwner: ethAddress,
  pollIntervalMs: z.number().int().positive(),
});

/** Chat switched off is not read any further, so its example placeholders can stay. */
const disabledChatSchema = z.looseObject({ enabled: z.literal(false) });

const chatSchema = z.discriminatedUnion('enabled', [enabledChatSchema, disabledChatSchema]);

const runtimeConfigSchema = z.object({
  /** Which of this build's themes the page wears. Absent means the default. */
  theme: z.enum(THEME_NAMES, { message: `must be one of ${THEME_NAMES.join(', ')}` }).optional(),
  gatewayUrl: gatewayUrlSchema,
  catalog: catalogSchema,
  chat: chatSchema.optional(),
});

export type ChatConfig = z.infer<typeof enabledChatSchema>;

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

export type RuntimeConfigResult = { ok: true; config: RuntimeConfig } | { ok: false; problem: string };

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : 'the config'}: ${issue.message}`)
    .join('; ');
}

/** The theme this deployment wears. */
export function selectedTheme(config: RuntimeConfig): ThemeName {
  return config.theme ?? DEFAULT_THEME;
}

/** The chat's settings when chat is on, and null when it is off or not configured. */
export function enabledChat(config: RuntimeConfig): ChatConfig | null {
  return config.chat?.enabled ? config.chat : null;
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
