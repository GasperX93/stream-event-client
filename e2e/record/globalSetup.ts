import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { RecordingFile } from '../recording';
import { BEE_VERSION, beeApiUrl, buyStamp, nodeLogs, startBeeNode, stopBeeNode } from './beeNode';
import { publish } from './publish';
import { RECORDING_OUT, STAMP_FILE } from './output';

/** Starts the node, publishes the stream and the chat, and returns the teardown that keeps the node's logs. */
export default async function recordSetup(): Promise<() => void> {
  mkdirSync(RECORDING_OUT, { recursive: true });
  await startBeeNode();
  const stamp = await buyStamp(20);
  const { config, published } = await publish(beeApiUrl(), stamp, BEE_VERSION);
  writeFileSync(join(RECORDING_OUT, RecordingFile.CONFIG), `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(join(RECORDING_OUT, RecordingFile.PUBLISHED), `${JSON.stringify(published, null, 2)}\n`);
  // The stamp stays out of the recording: the recording test hands it to the page's one write, as a gateway would.
  writeFileSync(STAMP_FILE, stamp);
  return () => {
    const logs = join(RECORDING_OUT, '..', 'recorder-node-logs');
    mkdirSync(logs, { recursive: true });
    for (const [name, text] of Object.entries(nodeLogs())) writeFileSync(join(logs, `${name}.log`), text);
    stopBeeNode();
  };
}
