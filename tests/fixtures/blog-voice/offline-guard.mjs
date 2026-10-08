// Test-only execution boundary: reject network access, providers and persistent writes.
import childProcess from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
const temporaryRoot = fs.realpathSync(tmpdir());
function writableTemporary(path) {
  const candidate = resolve(String(path));
  let ancestor = candidate;
  while (!fs.existsSync(ancestor)) ancestor = dirname(ancestor);
  const canonical = join(fs.realpathSync(ancestor), relative(ancestor, candidate));
  return /^(?:blog-voice-|voice-diff-)[^/]+(?:\/|$)/u.test(relative(temporaryRoot, canonical));
}
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
tls.connect = forbidden;
for (const name of ['spawn', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'])
  childProcess[name] = forbidden;
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
for (const name of [
  'writeFileSync',
  'mkdirSync',
  'rmSync',
  'appendFileSync',
  'writeFile',
  'appendFile',
  'mkdir',
  'rm',
  'unlink',
  'unlinkSync',
  'truncate',
  'truncateSync',
  'createWriteStream',
]) {
  const original = fs[name];
  fs[name] = (path, ...args) => {
    if (!writableTemporary(path)) throw new Error(`Persistent write forbidden: ${path}`);
    return original(path, ...args);
  };
}
for (const name of ['rename', 'renameSync', 'copyFile', 'copyFileSync']) {
  const original = fs[name];
  fs[name] = (source, destination, ...args) => {
    const paths = name.startsWith('rename') ? [source, destination] : [destination];
    if (paths.some((path) => !writableTemporary(path)))
      throw new Error(`Persistent write forbidden: ${destination}`);
    return original(source, destination, ...args);
  };
}
for (const name of [
  'writeFile',
  'appendFile',
  'mkdir',
  'rm',
  'unlink',
  'truncate',
  'rename',
  'copyFile',
]) {
  const original = fs.promises[name];
  fs.promises[name] = async (path, ...args) => {
    const destinations =
      name === 'rename' ? [path, args[0]] : name === 'copyFile' ? [args[0]] : [path];
    if (destinations.some((value) => !writableTemporary(value)))
      throw new Error(`Persistent write forbidden: ${path}`);
    return original(path, ...args);
  };
}
syncBuiltinESMExports();
