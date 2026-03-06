/**
 * API Test & Performance Bot
 * Version: 1.0.0
 *
 * A general-purpose API testing and performance monitoring bot.
 * Pre-configured with the RecruitingHub Tracking API endpoints.
 *
 * Features:
 *   - Run individual or all API tests on demand
 *   - Latency measurement per call (min / avg / max / p95)
 *   - Pass / Fail assertion engine (status code, response time, body shape)
 *   - Full history log of every test run
 *   - Multi-run benchmark mode (N sequential calls) with statistics
 *   - Live comparison table across all endpoints
 *
 * Intents:
 *   init               — dashboard: summary cards + last-run results for all APIs
 *   run_all_tests      — run every configured endpoint once, show full report
 *   run_single_test    — run one endpoint by id          (params: { endpointId })
 *   benchmark          — run one endpoint N times        (params: { endpointId, runs? })
 *   view_history       — full paginated test-run log     (params: { page? })
 *   view_response      — raw response body for a run     (params: { runId })
 *   clear_history      — reset all stored test results
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ENDPOINT REGISTRY ────────────────────────────────────────────────────────
// Add / remove endpoints here. Each entry is self-contained.
// ═══════════════════════════════════════════════════════════════════════════════
const ENDPOINTS = [
  {
    id         : 'org_tracking',
    label      : 'Org Tracking',
    description: 'Fetch all candidate tracking records for the organisation',
    method     : 'GET',
    url        : 'https://app-recruitinghub.gateway.apiplatform.io/v1/get-tracking?org_id=org-m0kjxzg1-6s0x0',
    headers    : {
      'pkey'  : '3fe6763df06a1b793fde07bde9af77d8',
      'apikey': 'aI307LzvXPt6KW9OnYXXhLGTvCljUkFq',
      'Accept': 'application/json',
    },
    body       : null,
    assertions : [
      { type: 'status',        expected: 200,    label: 'HTTP 200 OK'                },
      { type: 'responseTime',  expected: 3000,   label: 'Responds within 3 s'        },
      { type: 'isArray',       path: null,       label: 'Response contains an array' },
      { type: 'minLength',     expected: 1,      label: 'At least 1 record returned' },
    ],
  },
  {
    id         : 'job_tracking',
    label      : 'Job Tracking (job_id=200)',
    description: 'Fetch all candidate tracking records for job ID 200',
    method     : 'GET',
    url        : 'https://app-recruitinghub.gateway.apiplatform.io/v1/get-tracking?job_id=200',
    headers    : {
      'pkey'  : '3fe6763df06a1b793fde07bde9af77d8',
      'apikey': 'aI307LzvXPt6KW9OnYXXhLGTvCljUkFq',
      'Accept': 'application/json',
    },
    body       : null,
    assertions : [
      { type: 'status',        expected: 200,    label: 'HTTP 200 OK'                },
      { type: 'responseTime',  expected: 3000,   label: 'Responds within 3 s'        },
      { type: 'isArray',       path: null,       label: 'Response contains an array' },
      { type: 'minLength',     expected: 1,      label: 'At least 1 record returned' },
      { type: 'fieldExists',   path: '[0].job_id',      label: 'Records have job_id field'      },
      { type: 'fieldExists',   path: '[0].status',      label: 'Records have status field'      },
      { type: 'fieldExists',   path: '[0].candidate_id',label: 'Records have candidate_id field' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ─── TEST HISTORY STORE ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** @type {TestRun[]} */
const _history = [];
let   _runIdSeq = 0;

/**
 * @typedef {Object} AssertionResult
 * @property {string}  label
 * @property {boolean} passed
 * @property {string}  detail
 */

/**
 * @typedef {Object} TestRun
 * @property {number}   id
 * @property {string}   endpointId
 * @property {string}   endpointLabel
 * @property {string}   method
 * @property {string}   url
 * @property {number}   durationMs
 * @property {number|null} httpStatus
 * @property {boolean}  passed          — all assertions passed
 * @property {AssertionResult[]} assertions
 * @property {string}   errorMessage    — network / parse error if any
 * @property {any}      responseBody
 * @property {number}   recordCount
 * @property {string}   timestamp
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HELPERS ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Safely resolve a dot-bracket path like "[0].job_id" from an object */
function resolvePath(obj, path) {
  if (!path) return obj;
  // Convert [0] notation to .0 then split
  const parts = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '').split('.');
  return parts.reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
}

/** Extract the array from various API response shapes */
function extractArray(data) {
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'records', 'items', 'results', 'tracking', 'applications', 'Count']) {
    if (Array.isArray(data[key])) return data[key];
  }
  const found = Object.values(data || {}).find(v => Array.isArray(v));
  return found || null;
}

/** Run all assertions against a response */
function evaluate(endpoint, durationMs, httpStatus, body, errorMessage) {
  const arr = body ? extractArray(body) : null;

  return endpoint.assertions.map(a => {
    let passed = false;
    let detail = '';

    try {
      switch (a.type) {
        case 'status':
          passed = httpStatus === a.expected;
          detail = `got ${httpStatus ?? 'none'}, expected ${a.expected}`;
          break;

        case 'responseTime':
          passed = durationMs <= a.expected;
          detail = `${durationMs} ms (threshold: ${a.expected} ms)`;
          break;

        case 'isArray':
          passed = Array.isArray(body) || arr !== null;
          detail = passed ? `array of ${(arr || body)?.length ?? 0} items` : 'not an array';
          break;

        case 'minLength': {
          const target = arr ?? (Array.isArray(body) ? body : []);
          passed = target.length >= a.expected;
          detail = `length ${target.length} (min ${a.expected})`;
          break;
        }

        case 'fieldExists': {
          const target = arr ?? (Array.isArray(body) ? body : body);
          const value  = resolvePath(target, a.path);
          passed = value !== undefined && value !== null;
          detail = passed ? `"${a.path}" = ${JSON.stringify(value)}`.slice(0, 60) : `"${a.path}" missing`;
          break;
        }

        case 'equals': {
          const value = resolvePath(body, a.path);
          passed = JSON.stringify(value) === JSON.stringify(a.expected);
          detail = `got ${JSON.stringify(value)}, expected ${JSON.stringify(a.expected)}`;
          break;
        }

        default:
          detail = `unknown assertion type "${a.type}"`;
      }
    } catch (e) {
      detail = `assertion error: ${e.message}`;
    }

    return { label: a.label, passed, detail };
  });
}

/** ms → colour for chip / stat_card */
function perfColor(ms) {
  if (ms <  500) return 'success';
  if (ms < 1500) return 'warning';
  return 'error';
}

/** Timestamp ISO string → human readable */
function fmtTs(iso) {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 19) + ' UTC';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CORE TEST RUNNER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a single endpoint test and store the result in _history.
 * @returns {TestRun}
 */
async function runTest(endpoint) {
  const t0          = performance.now();
  let httpStatus    = null;
  let responseBody  = null;
  let errorMessage  = '';
  let durationMs    = 0;

  try {
    const fetchOpts = {
      method : endpoint.method,
      headers: endpoint.headers,
    };
    if (endpoint.body && endpoint.method !== 'GET') {
      fetchOpts.body = typeof endpoint.body === 'string'
        ? endpoint.body
        : JSON.stringify(endpoint.body);
    }

    const resp   = await fetch(endpoint.url, fetchOpts);
    durationMs   = Math.round(performance.now() - t0);
    httpStatus   = resp.status;

    const rawText = await resp.text();
    try { responseBody = JSON.parse(rawText); }
    catch { responseBody = rawText; }

  } catch (err) {
    durationMs   = Math.round(performance.now() - t0);
    errorMessage = err.message || String(err);
  }

  const assertions = evaluate(endpoint, durationMs, httpStatus, responseBody, errorMessage);
  const passed     = errorMessage === '' && assertions.every(a => a.passed);
  const arr        = responseBody ? (extractArray(responseBody) ?? (Array.isArray(responseBody) ? responseBody : [])) : [];

  const run = {
    id           : ++_runIdSeq,
    endpointId   : endpoint.id,
    endpointLabel: endpoint.label,
    method       : endpoint.method,
    url          : endpoint.url,
    durationMs,
    httpStatus,
    passed,
    assertions,
    errorMessage,
    responseBody,
    recordCount  : Array.isArray(arr) ? arr.length : 0,
    timestamp    : new Date().toISOString(),
  };

  _history.push(run);
  return run;
}

/** Run all endpoints sequentially and return array of TestRuns */
async function runAllTests() {
  const results = [];
  for (const ep of ENDPOINTS) {
    results.push(await runTest(ep));
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LAYOUT BUILDERS (shared across intents) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Build the KPI stat_card columns for a set of runs */
function buildRunKpiColumns(runs) {
  const total   = runs.length;
  const passed  = runs.filter(r => r.passed).length;
  const failed  = total - passed;
  const avgMs   = total > 0 ? Math.round(runs.reduce((s, r) => s + r.durationMs, 0) / total) : 0;
  const maxMs   = total > 0 ? Math.max(...runs.map(r => r.durationMs)) : 0;

  return [
    {
      xs: 6, sm: 3,
      components: [{
        type    : 'stat_card',
        title   : 'Tests Run',
        value   : total,
        icon    : 'PlayArrow',
        color   : 'primary',
        subtitle: `${passed} passed · ${failed} failed`,
      }],
    },
    {
      xs: 6, sm: 3,
      components: [{
        type    : 'stat_card',
        title   : 'Pass Rate',
        value   : total > 0 ? `${Math.round((passed / total) * 100)}%` : '—',
        icon    : 'CheckCircle',
        color   : failed === 0 ? 'success' : failed === total ? 'error' : 'warning',
        subtitle: `${passed}/${total} endpoints passed`,
      }],
    },
    {
      xs: 6, sm: 3,
      components: [{
        type    : 'stat_card',
        title   : 'Avg Response',
        value   : `${avgMs} ms`,
        icon    : 'Speed',
        color   : perfColor(avgMs),
        subtitle: 'across all calls',
      }],
    },
    {
      xs: 6, sm: 3,
      components: [{
        type    : 'stat_card',
        title   : 'Slowest Call',
        value   : `${maxMs} ms`,
        icon    : 'HourglassBottom',
        color   : perfColor(maxMs),
        subtitle: 'worst single call',
      }],
    },
  ];
}

/** Build the assertions detail table rows for a TestRun */
function buildAssertionRows(run) {
  return run.assertions.map(a => ({
    label : a.label,
    result: a.passed ? 'PASS' : 'FAIL',
    detail: a.detail,
  }));
}

/** Build the endpoint summary table rows for a list of TestRuns */
function buildSummaryRows(runs) {
  return runs.map(r => ({
    _runId   : r.id,
    endpoint : r.endpointLabel,
    method   : r.method,
    status   : r.httpStatus ?? 'ERR',
    ms       : r.durationMs,
    records  : r.recordCount,
    result   : r.passed ? 'PASS' : 'FAIL',
    time     : fmtTs(r.timestamp),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MODULE EXPORT ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  name   : 'API Test & Performance',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[APITestBot] init user=${context.userId}`);
  },

  intents: {

    // ── Dashboard ─────────────────────────────────────────────────────────────
    init: async (context) => {
      // Get latest run per endpoint from history
      const latestByEndpoint = {};
      _history.forEach(r => { latestByEndpoint[r.endpointId] = r; });
      const latestRuns = Object.values(latestByEndpoint);

      const hasHistory = latestRuns.length > 0;

      return {
        layout: [
          // ── Header ──────────────────────────────────────────────────────
          {
            type    : 'text',
            content : '# 🧪 API Test & Performance Dashboard',
            markdown: true,
          },
          {
            type    : 'text',
            content : `> **${ENDPOINTS.length} endpoint${ENDPOINTS.length !== 1 ? 's' : ''} configured** · Run tests to measure response time, validate assertions and inspect payloads.`,
            markdown: true,
          },

          // ── KPI row (empty-state or last-run stats) ──────────────────────
          ...(hasHistory ? [{
            type   : 'grid',
            spacing: 2,
            columns: buildRunKpiColumns(latestRuns),
          }] : []),

          // ── Endpoint config table ────────────────────────────────────────
          {
            type   : 'data_table',
            title  : 'Configured Endpoints',
            columns: [
              { field: 'label',       label: 'Endpoint',    align: 'left'   },
              { field: 'method',      label: 'Method',      align: 'center' },
              { field: 'assertions',  label: 'Assertions',  align: 'center' },
              { field: 'last_result', label: 'Last Result', align: 'center',
                chip: { colorMap: { 'PASS': 'success', 'FAIL': 'error', 'NOT RUN': 'default' } } },
              { field: 'last_ms',     label: 'Last ms',     align: 'center' },
              {
                field  : '_actions', label: 'Actions', align: 'center',
                actions: [{ label: 'Run', intent: 'run_single_test', params: { endpointId: '{{row._id}}' } }],
              },
            ],
            rows: ENDPOINTS.map(ep => {
              const last = latestByEndpoint[ep.id];
              return {
                _id        : ep.id,
                label      : ep.label,
                method     : ep.method,
                assertions : ep.assertions.length,
                last_result: last ? (last.passed ? 'PASS' : 'FAIL') : 'NOT RUN',
                last_ms    : last ? `${last.durationMs} ms` : '—',
              };
            }),
            emptyMessage: 'No endpoints configured.',
          },

          // ── Action buttons ───────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type     : 'action_button',
                  label    : '▶ Run All Tests',
                  intent   : 'run_all_tests',
                  variant  : 'contained',
                  color    : 'primary',
                  icon     : 'PlayArrow',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type     : 'action_button',
                  label    : '📋 View History',
                  intent   : 'view_history',
                  variant  : 'outlined',
                  color    : 'info',
                  icon     : 'History',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type     : 'action_button',
                  label    : '🗑 Clear History',
                  intent   : 'clear_history',
                  variant  : 'outlined',
                  color    : 'error',
                  icon     : 'DeleteOutline',
                  fullWidth: true,
                }],
              },
            ],
          },

          // ── Last-run results table (if any) ──────────────────────────────
          ...(hasHistory ? [
            { type: 'text', content: '---\n### Last Run Results', markdown: true },
            {
              type   : 'data_table',
              title  : 'Last Run per Endpoint',
              columns: [
                { field: 'endpoint', label: 'Endpoint',    align: 'left'   },
                { field: 'status',   label: 'HTTP',        align: 'center' },
                { field: 'ms',       label: 'Duration ms', align: 'center' },
                { field: 'records',  label: 'Records',     align: 'center' },
                {
                  field: 'result', label: 'Result', align: 'center',
                  chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
                },
                { field: 'time',     label: 'Ran At',      align: 'left'   },
                {
                  field  : '_actions', label: 'Detail', align: 'center',
                  actions: [{ label: 'View', intent: 'view_response', params: { runId: '{{row._runId}}' } }],
                },
              ],
              rows        : buildSummaryRows(latestRuns),
              emptyMessage: 'No runs yet.',
            },
          ] : []),
        ],
      };
    },

    // ── Run all endpoints ─────────────────────────────────────────────────────
    run_all_tests: async (context) => {
      const batchStart = Date.now();
      const runs = await runAllTests();
      const batchMs = Date.now() - batchStart;

      const passed  = runs.filter(r => r.passed).length;
      const failed  = runs.length - passed;

      return {
        layout: [
          // Nav
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: '## ▶ Full Test Run Results', markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },

          // KPI row
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              ...buildRunKpiColumns(runs),
              {
                xs: 12, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Batch Time',
                  value   : `${batchMs} ms`,
                  icon    : 'Timer',
                  color   : 'info',
                  subtitle: `${runs.length} API${runs.length !== 1 ? 's' : ''} tested in series`,
                }],
              },
            ],
          },

          // Overall alert
          {
            type    : 'alert',
            severity: failed === 0 ? 'success' : failed === runs.length ? 'error' : 'warning',
            title   : failed === 0
              ? `✅ All ${runs.length} endpoints passed`
              : `⚠ ${failed} of ${runs.length} endpoint${failed !== 1 ? 's' : ''} failed`,
            message : failed === 0
              ? 'Every assertion passed. APIs are healthy.'
              : runs.filter(r => !r.passed).map(r => `${r.endpointLabel}: ${r.errorMessage || r.assertions.find(a => !a.passed)?.label}`).join(' · '),
          },

          // Summary table
          {
            type   : 'data_table',
            title  : 'Endpoint Summary',
            columns: [
              { field: 'endpoint', label: 'Endpoint',    align: 'left'   },
              { field: 'method',   label: 'Method',      align: 'center' },
              { field: 'status',   label: 'HTTP Status', align: 'center' },
              { field: 'ms',       label: 'Duration ms', align: 'center' },
              { field: 'records',  label: 'Records',     align: 'center' },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
              },
              {
                field  : '_actions', label: 'Details', align: 'center',
                actions: [{ label: 'Inspect', intent: 'view_response', params: { runId: '{{row._runId}}' } }],
              },
            ],
            rows        : buildSummaryRows(runs),
            emptyMessage: 'No results.',
          },

          // Per-endpoint assertion breakdown
          { type: 'text', content: '---\n### Assertion Results per Endpoint', markdown: true },

          ...runs.map(run => ({
            type   : 'data_table',
            title  : `${run.passed ? '✅' : '❌'} ${run.endpointLabel}  ·  ${run.durationMs} ms  ·  HTTP ${run.httpStatus ?? 'ERR'}`,
            columns: [
              { field: 'label',  label: 'Assertion',   align: 'left'   },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
              },
              { field: 'detail', label: 'Detail',     align: 'left'   },
            ],
            rows        : buildAssertionRows(run),
            emptyMessage: 'No assertions defined.',
          })),

          // Actions
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 6,
                components: [{
                  type: 'action_button', label: '🔄 Run Again', intent: 'run_all_tests',
                  variant: 'contained', color: 'primary', icon: 'Replay', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 6,
                components: [{
                  type: 'action_button', label: '📋 View History', intent: 'view_history',
                  variant: 'outlined', color: 'info', icon: 'History', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Run a single endpoint ─────────────────────────────────────────────────
    run_single_test: async (context) => {
      const endpointId = context.metadata?.endpointId;
      const endpoint   = ENDPOINTS.find(e => e.id === endpointId);

      if (!endpoint) {
        return {
          layout: [{
            type: 'alert', severity: 'error',
            message: `Unknown endpoint id "${endpointId}".`,
            action : { label: '← Dashboard', intent: 'init' },
          }],
        };
      }

      const run = await runTest(endpoint);

      return {
        layout: [
          // Nav
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 🔬 ${endpoint.label}`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },

          // Result alert
          {
            type    : 'alert',
            severity: run.passed ? 'success' : 'error',
            title   : run.passed ? '✅ All assertions passed' : '❌ One or more assertions failed',
            message : run.passed
              ? `${endpoint.label} responded in ${run.durationMs} ms with HTTP ${run.httpStatus}.`
              : run.errorMessage || run.assertions.filter(a => !a.passed).map(a => a.label).join(', '),
          },

          // KPI row
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'HTTP Status',
                  value   : run.httpStatus ?? 'ERR',
                  icon    : 'Http',
                  color   : run.httpStatus === 200 ? 'success' : 'error',
                  subtitle: run.httpStatus === 200 ? 'OK' : 'Not OK',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Response Time',
                  value   : `${run.durationMs} ms`,
                  icon    : 'Speed',
                  color   : perfColor(run.durationMs),
                  subtitle: run.durationMs < 500 ? 'Fast ✓' : run.durationMs < 1500 ? 'Acceptable' : 'Slow ⚠',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Records Returned',
                  value   : run.recordCount,
                  icon    : 'Storage',
                  color   : 'info',
                  subtitle: 'items in response',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Assertions',
                  value   : `${run.assertions.filter(a => a.passed).length}/${run.assertions.length}`,
                  icon    : 'CheckCircle',
                  color   : run.passed ? 'success' : 'error',
                  subtitle: 'passed / total',
                }],
              },
            ],
          },

          // Assertions table
          {
            type   : 'data_table',
            title  : 'Assertion Results',
            columns: [
              { field: 'label',  label: 'Check',   align: 'left'   },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
              },
              { field: 'detail', label: 'Detail', align: 'left'   },
            ],
            rows        : buildAssertionRows(run),
            emptyMessage: 'No assertions.',
          },

          // Actions
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'action_button', label: '🔄 Run Again', intent: 'run_single_test',
                  params: { endpointId }, variant: 'contained', color: 'primary',
                  icon: 'Replay', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'action_button', label: '📊 Benchmark', intent: 'benchmark',
                  params: { endpointId }, variant: 'outlined', color: 'warning',
                  icon: 'BarChart', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'action_button', label: '🔍 Inspect Response', intent: 'view_response',
                  params: { runId: run.id }, variant: 'outlined', color: 'info',
                  icon: 'Code', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Benchmark — run one endpoint N times and aggregate ───────────────────
    benchmark: async (context) => {
      const endpointId = context.metadata?.endpointId;
      const runs_n     = Math.min(20, Math.max(2, Number(context.metadata?.runs || 5)));
      const endpoint   = ENDPOINTS.find(e => e.id === endpointId);

      if (!endpoint) {
        return {
          layout: [{
            type: 'alert', severity: 'error',
            message: `Unknown endpoint id "${endpointId}".`,
            action : { label: '← Dashboard', intent: 'init' },
          }],
        };
      }

      // Run N times sequentially
      const results = [];
      for (let i = 0; i < runs_n; i++) {
        results.push(await runTest(endpoint));
      }

      const allMs    = results.map(r => r.durationMs).sort((a, b) => a - b);
      const avgMs    = Math.round(allMs.reduce((s, v) => s + v, 0) / allMs.length);
      const minMs    = allMs[0];
      const maxMs    = allMs[allMs.length - 1];
      const p50Ms    = allMs[Math.floor(allMs.length * 0.50)];
      const p95Ms    = allMs[Math.floor(allMs.length * 0.95)] ?? maxMs;
      const passRate = Math.round((results.filter(r => r.passed).length / results.length) * 100);

      const runRows = results.map((r, i) => ({
        run    : i + 1,
        ms     : r.durationMs,
        http   : r.httpStatus ?? 'ERR',
        records: r.recordCount,
        result : r.passed ? 'PASS' : 'FAIL',
      }));

      return {
        layout: [
          // Nav
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 📊 Benchmark — ${endpoint.label}  ×${runs_n}`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },

          // Stats KPI row
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 6, sm: 2,
                components: [{
                  type : 'stat_card', title: 'Min', value: `${minMs} ms`,
                  icon : 'KeyboardArrowDown', color: 'success', subtitle: 'fastest call',
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type : 'stat_card', title: 'Avg', value: `${avgMs} ms`,
                  icon : 'Speed', color: perfColor(avgMs), subtitle: 'mean response',
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type : 'stat_card', title: 'P50', value: `${p50Ms} ms`,
                  icon : 'TrendingFlat', color: perfColor(p50Ms), subtitle: 'median',
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type : 'stat_card', title: 'P95', value: `${p95Ms} ms`,
                  icon : 'TrendingUp', color: perfColor(p95Ms), subtitle: '95th percentile',
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type : 'stat_card', title: 'Max', value: `${maxMs} ms`,
                  icon : 'KeyboardArrowUp', color: perfColor(maxMs), subtitle: 'slowest call',
                }],
              },
              {
                xs: 6, sm: 2,
                components: [{
                  type : 'stat_card', title: 'Pass Rate', value: `${passRate}%`,
                  icon : 'CheckCircle',
                  color: passRate === 100 ? 'success' : passRate >= 80 ? 'warning' : 'error',
                  subtitle: `${results.filter(r => r.passed).length}/${runs_n} passed`,
                }],
              },
            ],
          },

          // Thresholds verdict
          {
            type    : 'alert',
            severity: p95Ms <= 3000 ? 'success' : p95Ms <= 5000 ? 'warning' : 'error',
            title   : p95Ms <= 3000
              ? `✅ P95 latency is excellent (${p95Ms} ms)`
              : p95Ms <= 5000
              ? `⚠ P95 latency is acceptable but could be faster (${p95Ms} ms)`
              : `❌ P95 latency is high (${p95Ms} ms) — consider caching or optimisation`,
            message : `min=${minMs}ms  avg=${avgMs}ms  p50=${p50Ms}ms  p95=${p95Ms}ms  max=${maxMs}ms  —  ${runs_n} sequential requests`,
          },

          // Per-run table
          {
            type   : 'data_table',
            title  : `Individual Runs (${runs_n} total)`,
            columns: [
              { field: 'run',     label: 'Run #',      align: 'center' },
              { field: 'ms',      label: 'Duration ms', align: 'center' },
              { field: 'http',    label: 'HTTP',        align: 'center' },
              { field: 'records', label: 'Records',     align: 'center' },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
              },
            ],
            rows        : runRows,
            emptyMessage: 'No runs.',
          },

          // Re-run options
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'action_button', label: `🔄 Benchmark ×${runs_n} Again`,
                  intent: 'benchmark', params: { endpointId, runs: runs_n },
                  variant: 'contained', color: 'primary', icon: 'Replay', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'action_button', label: '🔬 Run ×10',
                  intent: 'benchmark', params: { endpointId, runs: 10 },
                  variant: 'outlined', color: 'warning', icon: 'BarChart', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type: 'action_button', label: '← All Endpoints',
                  intent: 'run_all_tests',
                  variant: 'outlined', color: 'secondary', icon: 'List', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Full test history log ─────────────────────────────────────────────────
    view_history: async (context) => {
      const PAGE_SIZE  = 15;
      const page       = Math.max(1, Number(context.metadata?.page || 1));

      if (_history.length === 0) {
        return {
          layout: [{
            type: 'alert', severity: 'info', title: 'No History Yet',
            message: 'Run some tests first to see the history here.',
            action: { label: 'Run All Tests', intent: 'run_all_tests' },
          }],
        };
      }

      const reversed   = [..._history].reverse(); // newest first
      const total      = reversed.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const offset     = (page - 1) * PAGE_SIZE;
      const pageRuns   = reversed.slice(offset, offset + PAGE_SIZE);

      // Aggregate stats over entire history
      const allPassed  = _history.filter(r => r.passed).length;
      const allMs      = _history.map(r => r.durationMs).sort((a, b) => a - b);
      const avgMs      = Math.round(allMs.reduce((s, v) => s + v, 0) / allMs.length);
      const p95Ms      = allMs[Math.floor(allMs.length * 0.95)] ?? allMs[allMs.length - 1];

      return {
        layout: [
          // Nav
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 📋 Test History (${total} runs)`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← Dashboard', intent: 'init',
                  variant: 'outlined', color: 'secondary', icon: 'Home', fullWidth: true,
                }],
              },
            ],
          },

          // History KPI cards
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Total Runs', value: total,
                  icon: 'History', color: 'primary', subtitle: 'all time',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Overall Pass Rate',
                  value: `${Math.round((allPassed / total) * 100)}%`,
                  icon: 'CheckCircle',
                  color: allPassed === total ? 'success' : 'warning',
                  subtitle: `${allPassed}/${total} passed`,
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Historical Avg', value: `${avgMs} ms`,
                  icon: 'Speed', color: perfColor(avgMs), subtitle: 'mean response time',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Historical P95', value: `${p95Ms} ms`,
                  icon: 'TrendingUp', color: perfColor(p95Ms), subtitle: '95th pct latency',
                }],
              },
            ],
          },

          // History table
          {
            type   : 'data_table',
            title  : `History — Page ${page} of ${totalPages}`,
            columns: [
              { field: 'id',       label: 'Run #',      align: 'center' },
              { field: 'endpoint', label: 'Endpoint',   align: 'left'   },
              { field: 'method',   label: 'Method',     align: 'center' },
              { field: 'status',   label: 'HTTP',       align: 'center' },
              { field: 'ms',       label: 'Duration ms', align: 'center' },
              { field: 'records',  label: 'Records',    align: 'center' },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
              },
              { field: 'time', label: 'Timestamp', align: 'left' },
              {
                field  : '_actions', label: 'Response', align: 'center',
                actions: [{ label: 'View', intent: 'view_response', params: { runId: '{{row._runId}}' } }],
              },
            ],
            rows: pageRuns.map(r => ({
              _runId  : r.id,
              id      : r.id,
              endpoint: r.endpointLabel,
              method  : r.method,
              status  : r.httpStatus ?? 'ERR',
              ms      : r.durationMs,
              records : r.recordCount,
              result  : r.passed ? 'PASS' : 'FAIL',
              time    : fmtTs(r.timestamp),
            })),
            pagination  : { page, pageSize: PAGE_SIZE, total, intent: 'view_history' },
            emptyMessage: 'No history.',
          },
        ],
      };
    },

    // ── Raw response inspector ────────────────────────────────────────────────
    view_response: async (context) => {
      const runId = Number(context.metadata?.runId);
      const run   = _history.find(r => r.id === runId);

      if (!run) {
        return {
          layout: [{
            type: 'alert', severity: 'warning',
            message: `Run #${runId} not found.`,
            action : { label: '← History', intent: 'view_history' },
          }],
        };
      }

      // Serialise response body for display — truncate if huge
      let bodyPreview = '';
      try {
        const full = JSON.stringify(run.responseBody, null, 2);
        bodyPreview = full.length > 4000 ? full.slice(0, 4000) + '\n\n… (truncated)' : full;
      } catch { bodyPreview = String(run.responseBody); }

      return {
        layout: [
          // Nav
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{ type: 'text', content: `## 🔍 Run #${run.id} — ${run.endpointLabel}`, markdown: true }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: '← History', intent: 'view_history',
                  variant: 'outlined', color: 'secondary', icon: 'ArrowBack', fullWidth: true,
                }],
              },
            ],
          },

          // Meta row
          {
            type: 'grid', spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'HTTP Status',
                  value: run.httpStatus ?? 'ERR', icon: 'Http',
                  color: run.httpStatus === 200 ? 'success' : 'error',
                  subtitle: fmtTs(run.timestamp),
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Response Time',
                  value: `${run.durationMs} ms`, icon: 'Speed',
                  color: perfColor(run.durationMs), subtitle: 'measured duration',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Records', value: run.recordCount,
                  icon: 'Storage', color: 'info', subtitle: 'items in response',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type: 'stat_card', title: 'Overall',
                  value: run.passed ? 'PASS' : 'FAIL', icon: 'CheckCircle',
                  color: run.passed ? 'success' : 'error',
                  subtitle: `${run.assertions.filter(a => a.passed).length}/${run.assertions.length} assertions`,
                }],
              },
            ],
          },

          // Assertion table
          {
            type   : 'data_table',
            title  : 'Assertions',
            columns: [
              { field: 'label',  label: 'Check',   align: 'left'   },
              {
                field: 'result', label: 'Result', align: 'center',
                chip : { colorMap: { 'PASS': 'success', 'FAIL': 'error' } },
              },
              { field: 'detail', label: 'Detail', align: 'left'   },
            ],
            rows        : buildAssertionRows(run),
            emptyMessage: 'No assertions.',
          },

          // Error message if any
          ...(run.errorMessage ? [{
            type: 'alert', severity: 'error',
            title: 'Network / Parse Error', message: run.errorMessage,
          }] : []),

          // Raw response body
          {
            type    : 'text',
            content : `**URL:** \`${run.url}\`\n\n**Raw Response:**\n\`\`\`json\n${bodyPreview}\n\`\`\``,
            markdown: true,
            variant : 'body2',
          },
        ],
      };
    },

    // ── Clear all history ─────────────────────────────────────────────────────
    clear_history: async () => {
      const cleared = _history.length;
      _history.length = 0;
      _runIdSeq       = 0;

      return {
        layout: [{
          type    : 'alert',
          severity: 'info',
          title   : 'History Cleared',
          message : `${cleared} test run${cleared !== 1 ? 's' : ''} removed.`,
          action  : { label: '← Dashboard', intent: 'init' },
        }],
      };
    },
  },
};
