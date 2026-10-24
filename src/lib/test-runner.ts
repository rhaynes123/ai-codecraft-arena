// Browser-only test runner: transpiles TS files with sucrase and runs them in a Web Worker.
export type VFile = { path: string; content: string };
export type TestResult = { file: string; name: string; passed: boolean; error?: string; hidden?: boolean };
export type RunOutput = { results: TestResult[]; logs: string[]; error?: string };

const WORKER_SRC = `
const modules = {}; const cache = {}; const logs = []; const tests = [];
const fmt = (a) => a.map(x => typeof x === 'string' ? x : (()=>{try{return JSON.stringify(x)}catch{return String(x)}})()).join(' ');
console.log = (...a) => logs.push(fmt(a)); console.error = (...a) => logs.push('[error] ' + fmt(a)); console.warn = (...a) => logs.push('[warn] ' + fmt(a));
function norm(base, rel) {
  const parts = base.split('/'); parts.pop();
  for (const p of rel.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); }
  return parts.join('/');
}
function req(from, spec) {
  const base = norm(from, spec);
  const cands = [base, base + '.ts', base + '.js', base + '/index.ts'];
  const hit = cands.find(c => modules[c] !== undefined);
  if (!hit) throw new Error('Cannot find module ' + spec + ' from ' + from);
  if (cache[hit]) return cache[hit].exports;
  const module = { exports: {} }; cache[hit] = module;
  new Function('require','module','exports', modules[hit])((s) => req(hit, s), module, module.exports);
  return module.exports;
}
const eq = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; } };
const show = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
function matchErr(e, m) { const msg = e && e.message !== undefined ? e.message : String(e); if (m !== undefined && !msg.includes(m)) throw new Error('Expected error containing "' + m + '" but got "' + msg + '"'); }
function expect(actual) {
  const api = {
    toBe: (e) => { if (actual !== e) throw new Error('Expected ' + show(actual) + ' to be ' + show(e)); },
    toEqual: (e) => { if (!eq(actual, e)) throw new Error('Expected ' + show(actual) + ' to equal ' + show(e)); },
    toBeTruthy: () => { if (!actual) throw new Error('Expected ' + show(actual) + ' to be truthy'); },
    toThrow: (m) => { let threw = false; try { actual(); } catch (e) { threw = true; matchErr(e, m); } if (!threw) throw new Error('Expected function to throw'); },
    rejects: { toThrow: async (m) => { let threw = false; try { await actual; } catch (e) { threw = true; matchErr(e, m); } if (!threw) throw new Error('Expected promise to reject'); } },
  };
  return api;
}
self.onmessage = async (ev) => {
  const { files, tests: testFiles } = ev.data;
  for (const f of files) modules[f.path] = f.code;
  const results = [];
  for (const tf of testFiles) {
    tests.length = 0;
    self.test = self.it = (name, fn) => tests.push({ name, fn });
    self.expect = expect;
    try { req(tf.path, './' + tf.path.split('/').pop()); }
    catch (e) { results.push({ file: tf.path, name: 'load ' + tf.path, passed: false, error: String(e && e.message || e), hidden: tf.hidden }); continue; }
    for (const t of tests) {
      try {
        await Promise.race([Promise.resolve().then(t.fn), new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out after 2000ms')), 2000))]);
        results.push({ file: tf.path, name: t.name, passed: true, hidden: tf.hidden });
      } catch (e) { results.push({ file: tf.path, name: t.name, passed: false, error: String(e && e.message || e), hidden: tf.hidden }); }
    }
  }
  self.postMessage({ results, logs });
};`;

export async function runTests(
  files: VFile[],
  testFiles: (VFile & { hidden?: boolean })[],
  timeoutMs = 15000,
): Promise<RunOutput> {
  const { transform } = await import("sucrase");
  const all = [...files, ...testFiles];
  const compiled: { path: string; code: string }[] = [];
  for (const f of all) {
    if (!/\.(ts|js)$/.test(f.path)) continue;
    try {
      compiled.push({ path: f.path, code: transform(f.content, { transforms: ["typescript", "imports"] }).code });
    } catch (e: any) {
      return { results: [], logs: [], error: `Syntax error in ${f.path}: ${e.message}` };
    }
  }
  const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  try {
    return await new Promise<RunOutput>((resolve) => {
      const timer = setTimeout(() => resolve({ results: [], logs: [], error: "Test run timed out (possible infinite loop)" }), timeoutMs);
      worker.onmessage = (ev) => { clearTimeout(timer); resolve(ev.data); };
      worker.onerror = (ev) => { clearTimeout(timer); resolve({ results: [], logs: [], error: ev.message }); };
      worker.postMessage({ files: compiled, tests: testFiles.map((t) => ({ path: t.path, hidden: !!t.hidden })) });
    });
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
}
