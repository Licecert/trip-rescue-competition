import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { brotliCompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';

const outputDir = '.rescue-mcp';
await mkdir(outputDir, { recursive: true });
const outfile = `${outputDir}/trip-rescue.cjs`;
await build({ entryPoints: ['scripts/mcp-stdio.ts'], outfile, bundle: true, platform: 'node', format: 'cjs', target: 'node22', minify: true, external: ['@modelcontextprotocol/sdk', 'zod'], legalComments: 'eof' });
const bundle = await readFile(outfile);
const sha256 = createHash('sha256').update(bundle).digest('hex');
const payload = brotliCompressSync(bundle, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).toString('base64');
// npx supplies a temporary dependency directory. Resolve only the pinned SDK in it.
const runner = `const p=require('node:path'),f=require('node:fs');const bin=process.env.PATH.split(p.delimiter).find(x=>f.existsSync(p.join(p.dirname(x),'@modelcontextprotocol/sdk/package.json'))&&f.existsSync(p.join(p.dirname(x),'zod/package.json')));if(!bin)throw new Error('Pinned MCP dependencies unavailable');const r=require('node:module').createRequire(p.join(p.dirname(p.dirname(bin)),'trip-rescue-loader.cjs'));const b=require('node:zlib').brotliDecompressSync(Buffer.from('${payload}','base64'));if(require('node:crypto').createHash('sha256').update(b).digest('hex')!=='${sha256}')throw new Error('Bundle integrity failed');new Function('require','module','exports',b.toString())(r,module,exports);`;
await writeFile(`${outputDir}/loader.cjs`, runner);
// FC code upload keeps the integrity-checked payload out of the startup command.
const fcStdioCommand = 'npx --yes --package=node@22.23.3 --package=@modelcontextprotocol/sdk@1.32.1 --package=zod@3.25.76 node /code/loader.cjs';
await writeFile(`${outputDir}/fc-startup-command.txt`, `supergateway --stdio '\"${fcStdioCommand}\"' --port 8080 --ssePath /sse --messagePath /message\n`);
const config = { mcpServers: { trip_rescue_decision_fc: { type: 'stdio', command: 'npx', args: ['--yes', '--package=node@22.23.3', '--package=@modelcontextprotocol/sdk@1.32.1', '--package=zod@3.25.76', 'node', '-e', runner] } } };
await writeFile(`${outputDir}/bailian-config.json`, JSON.stringify(config, null, 2));
await writeFile(`${outputDir}/metadata.json`, JSON.stringify({ sha256, bundleBytes: bundle.length, configBytes: JSON.stringify(config).length, sdk: '1.32.1', node: '22.23.3', generatedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ ok: true, sha256, bundleBytes: bundle.length, configBytes: JSON.stringify(config).length, outputDir }));
