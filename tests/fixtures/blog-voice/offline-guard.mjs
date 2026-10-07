// Test-only execution boundary: reject network access, providers and persistent writes.
import childProcess from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
const forbidden = () => {
  throw new Error('Network/model/connector call forbidden in local voice checker');
};
globalThis.fetch = forbidden;
http.request = forbidden;
http.get = forbidden;
https.request = forbidden;
https.get = forbidden;
net.connect = forbidden;
net.createConnection = forbidden;
const spawnSync = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => {
  if (command === 'git' && options?.env?.GIT_NO_LAZY_FETCH !== '1')
    throw new Error('Git lazy fetching must be disabled');
  if (
    command === 'vale' ||
    (command === 'git' &&
      (['rev-parse', 'show'].includes(args[2]) ||
        (args[0] === 'diff' &&
          args.includes('--no-index') &&
          args.includes('--no-ext-diff') &&
          args.includes('--no-textconv'))))
  )
    return spawnSync(command, args, options);
  throw new Error(`Unexpected executable or Git mutation: ${command} ${args.join(' ')}`);
};
for (const name of ['writeFileSync', 'mkdirSync', 'rmSync']) {
  const original = fs[name];
  fs[name] = (path, ...args) => {
    if (!/(?:blog-voice-|voice-diff-)[^/]+(?:\/|$)/u.test(String(path)))
      throw new Error(`Persistent write forbidden: ${path}`);
    return original(path, ...args);
  };
}
syncBuiltinESMExports();
