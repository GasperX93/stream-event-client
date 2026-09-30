import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from '@playwright/test';

import { onChatWrite, refuseOtherOrigins, serveConfig, watchAndChat } from './journey';
import { RECORDING_OUT, STAMP_FILE } from './record/output';
import { type ChatWriteAnswer, GATEWAY_URL_PATTERN, RecordingFile } from './recording';

test('records the Bee answers of the smoke journey', async ({ page, context }) => {
  const read = (file: string) => JSON.parse(readFileSync(join(RECORDING_OUT, file), 'utf8'));
  const stamp = readFileSync(STAMP_FILE, 'utf8');

  await refuseOtherOrigins(context);
  await page.routeFromHAR(join(RECORDING_OUT, RecordingFile.HAR), {
    url: GATEWAY_URL_PATTERN,
    update: true,
    updateContent: 'attach',
    updateMode: 'minimal',
  });
  await serveConfig(page, read(RecordingFile.CONFIG));

  // The page writes without a stamp, which the event's chat endpoint adds. This node is not such an endpoint, so the
  // stamp is added here. The write is also deferred, because a node with no peers has nobody to push to. The answer
  // is the node's own, and the smoke test hands it to the page's write on replay.
  await onChatWrite(page, async (route) => {
    const headers = { ...route.request().headers(), 'swarm-postage-batch-id': stamp, 'swarm-deferred-upload': 'true' };
    const response = await route.fetch({ headers });
    const answer: ChatWriteAnswer = {
      status: response.status(),
      contentType: response.headers()['content-type'] ?? '',
      body: await response.text(),
    };
    writeFileSync(join(RECORDING_OUT, RecordingFile.CHAT_WRITE_ANSWER), `${JSON.stringify(answer, null, 2)}\n`);
    await route.fulfill({ response });
  });

  await watchAndChat(page, read(RecordingFile.PUBLISHED));
  // A last look lets the polls that follow a finished stream and an open chat land in the recording too.
  await page.waitForTimeout(3000);
  await context.close();
});
