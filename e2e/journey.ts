import { expect, type BrowserContext, type Page, type Route } from '@playwright/test';

import { PREVIEW_ORIGIN, type Published, SMOKE_MESSAGE, SMOKE_USER } from './recording';

/** The codecs the event's streams are encoded with. A build without them loads every segment and shows nothing. */
const STREAM_CODECS = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
/** Seconds of the recorded stream that must have played before playback counts as working. */
const PLAYED_SECONDS = 1;

/** A chat write is `POST {chat endpoint}/soc/{owner}/{identifier}`, which the page makes and nothing else. */
const CHAT_WRITE_PATH = /\/soc\/[0-9a-f]{40}\/[0-9a-f]{64}$/;

/** Hands every chat write the page makes to `handle`, and every other request on to the routes before it. */
export async function onChatWrite(page: Page, handle: (route: Route) => Promise<void>): Promise<void> {
  await page.route(
    (url) => CHAT_WRITE_PATH.test(url.pathname),
    (route) => (route.request().method() === 'POST' ? handle(route) : route.fallback()),
  );
}

/** Nothing leaves the page's own origin, so a request the recording does not hold can only fail the test. */
export async function refuseOtherOrigins(context: BrowserContext): Promise<void> {
  await context.route(
    (url) => url.origin !== PREVIEW_ORIGIN,
    (route) => route.abort('blockedbyclient'),
  );
}

export async function serveConfig(page: Page, config: unknown): Promise<void> {
  await page.route(`${PREVIEW_ORIGIN}/config.json`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(config),
    }),
  );
}

/**
 * Opens the list, plays the recorded stream, reads its chat, joins and sends one message. The same steps record the
 * answers and replay them, so the recording holds exactly what the smoke test asks for.
 */
export async function watchAndChat(page: Page, published: Published): Promise<void> {
  await page.goto('/');
  const card = page.getByRole('link', { name: new RegExp(published.stream.title) });
  await expect(card, 'the finished stream is on the list').toBeVisible({ timeout: 20_000 });
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/watch/video/${published.stream.owner}/${published.stream.topic}`));

  const codecs = await page.evaluate((type) => MediaSource.isTypeSupported(type), STREAM_CODECS);
  expect(codecs, `this browser build cannot decode ${STREAM_CODECS}, so no stream would ever show a picture`).toBe(
    true,
  );
  await expect
    .poll(() => page.evaluate(() => document.querySelector('video')?.currentTime ?? 0), {
      message: `the stream plays past ${PLAYED_SECONDS} s`,
      timeout: 30_000,
    })
    .toBeGreaterThan(PLAYED_SECONDS);

  // Every name is matched exactly: Playwright matches a name as a substring by default, so "Message" also finds the
  // "Messages" list and each "Message actions" button, and "Send" finds "Resend".
  const chat = page.getByRole('region', { name: 'Chat', exact: true });
  for (const text of published.chat.texts) {
    await expect(chat.getByText(text, { exact: true }), `the chat shows "${text}"`).toBeVisible({ timeout: 20_000 });
  }

  await chat.getByRole('button', { name: 'Join the chat to send messages', exact: true }).click();
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill(SMOKE_USER);
  await page.getByRole('button', { name: 'Join', exact: true }).click();
  await chat.getByRole('textbox', { name: 'Message', exact: true }).fill(SMOKE_MESSAGE);
  await chat.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(chat.getByText(SMOKE_MESSAGE, { exact: true }), 'the sent message is shown').toBeVisible();
  await expect(chat.getByText('Not sent.'), 'the write was not refused').toHaveCount(0);
}
