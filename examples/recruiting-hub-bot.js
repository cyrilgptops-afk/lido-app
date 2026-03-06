/**
 * RecruitingHub Jobs — Application Bot
 * Version: 1.0.0
 *
 * Connects to recruitinghub.com API, authenticates once per session,
 * then browses jobs with full detail and candidate breakdown.
 *
 * Intents:
 *   init              — login + KPI overview (total jobs, open, sectors)
 *   view_jobs         — paginated jobs list                    (params: { page? })
 *   view_job_detail   — full job detail + candidates table     (params: { jobId, jobTitle, page? })
 *   refresh_token     — force re-login and return to jobs list
 */

// ─── Config ──────────────────────────────────────────────────────────────────
const RH_BASE      = 'https://recruitinghub.com/api';
const RH_EMAIL     = 'haiva@recruitinghub.com';
const RH_PASSWORD  = 'haivarhonline123';
const PAGE_SIZE    = 5;   // candidates per page inside job detail
const JOBS_PER_PAGE = 10; // jobs per page in job list

// ─── In-process token cache (lives as long as the bot process) ────────────────
let _tokenCache = null;   // { token: string, expiresAt: number }

// ─── Status colour map ────────────────────────────────────────────────────────
const JOB_STATUS_COLORS = {
  'Open'           : 'success',
  'Closed'         : 'error',
  'Job Closed'     : 'error',
  'Job on Hold'    : 'warning',
  'Job Filled'     : 'info',
};

const CAND_STATUS_COLORS = {
  'Shortlisted'       : 'success',
  'Awaiting Feedback' : 'info',
  'Rejected'          : 'error',
  'Job Closed'        : 'default',
  'Job Filled'        : 'info',
  'Job on Hold'       : 'warning',
  'Duplicate'         : 'default',
  'Interviewing'      : 'primary',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d || d.startsWith('-')) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

function salary(job) {
  if (job.jobtype === 'Contract') {
    return job.currency ? `${job.currency} contract` : 'Contract';
  }
  if (job.minlakh || job.maxlakh) {
    return `₹${job.minlakh}–${job.maxlakh}L`;
  }
  return '—';
}

function experience(job) {
  if (!job.minex && !job.maxex) return '—';
  return `${job.minex}–${job.maxex} yrs`;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getToken() {
  if (_tokenCache && _tokenCache.expiresAt > Date.now()) {
    return _tokenCache.token;
  }

  const resp = await fetch(`${RH_BASE}/login`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': '*/*' },
    body   : JSON.stringify({ email: RH_EMAIL, password: RH_PASSWORD }),
  });

  if (!resp.ok) {
    throw new Error(`RecruitingHub login failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  // API returns token in data.token or data.access_token or data.data.token
  const token = data.token || data.access_token || data?.data?.token;
  if (!token) {
    throw new Error(`RecruitingHub login: no token in response — ${JSON.stringify(data)}`);
  }

  // Cache for 55 minutes (tokens typically last 60 min)
  _tokenCache = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return token;
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function fetchJobs(page = 1) {
  const token = await getToken();
  const resp  = await fetch(`${RH_BASE}/jobs?page=${page}`, {
    method : 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Jobs fetch failed: ${resp.status}`);
  return resp.json();
}

// ─── All-jobs cache (parallel fetch, 5-min TTL) ──────────────────────────────
let _jobsCache = null; // { jobs: [], expiresAt: number }

/**
 * Fetch every page of jobs in parallel and cache the combined list for 5 min.
 * Parallel fetching (vs. serial) reduces search latency from ~14×200ms to ~200ms.
 */
async function fetchAllJobs() {
  if (_jobsCache && _jobsCache.expiresAt > Date.now()) {
    return _jobsCache.jobs;
  }

  // Fetch page 1 first to learn last_page
  const first    = await fetchJobs(1);
  const lastPage = Math.min(first.last_page || 1, 20); // safety cap
  const allJobs  = [...(first.data || [])];

  if (lastPage > 1) {
    // Fetch remaining pages in parallel
    const rest = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) => fetchJobs(i + 2))
    );
    rest.forEach(d => allJobs.push(...(d.data || [])));
  }

  _jobsCache = { jobs: allJobs, expiresAt: Date.now() + 5 * 60 * 1000 };
  return allJobs;
}

/** Client-side filter applied when the API has no search endpoint */
function filterJobs(jobs, query) {
  if (!query || !query.trim()) return jobs;
  const q = query.trim().toLowerCase();
  return jobs.filter(j =>
    (j.jobtitle      || '').toLowerCase().includes(q) ||
    (j.jobsector     || '').toLowerCase().includes(q) ||
    (j.jobtype       || '').toLowerCase().includes(q) ||
    (j.city          || '').toLowerCase().includes(q) ||
    (j.country       || '').toLowerCase().includes(q) ||
    (j.member?.company?.name || '').toLowerCase().includes(q)
  );
}

// ─── Module export ─────────────────────────────────────────────────────────────

module.exports = {
  name   : 'RecruitingHub Jobs',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[RecruitingHubBot] init user=${context.userId}`);
  },

  intents: {

    // ── Dashboard overview ──────────────────────────────────────────────────
    init: async (context) => {
      let loginStatus = 'success';
      let errorMsg    = null;
      let jobData     = null;

      try {
        jobData = await fetchJobs(1);
      } catch (err) {
        loginStatus = 'error';
        errorMsg    = err.message;
      }

      if (loginStatus === 'error') {
        return {
          layout: [
            {
              type    : 'alert',
              severity: 'error',
              title   : 'Connection Failed',
              message : errorMsg,
              action  : { label: 'Retry', intent: 'refresh_token' },
            },
          ],
        };
      }

      const jobs       = jobData.data || [];
      const totalJobs  = jobData.total || 0;
      const totalPages = jobData.last_page || 1;

      // Count open vs closed from first page as a sample
      const openCount   = jobs.filter(j => j.status === 'Open').length;
      const closedCount = jobs.filter(j => j.status !== 'Open').length;

      // Unique sectors
      const sectors = [...new Set(jobs.map(j => j.jobsector).filter(Boolean))];

      // Unique companies
      const companies = [...new Set(jobs.map(j => j.member?.company?.name).filter(Boolean))];

      // Summary rows for quick overview table
      const summaryRows = jobs.slice(0, 5).map(j => ({
        jobtitle  : j.jobtitle,
        company   : j.member?.company?.name || '—',
        location  : j.city || j.joblocation || '—',
        type      : j.jobtype || '—',
        status    : j.status,
        posted    : fmtDate(j.postdate),
      }));

      return {
        layout: [
          // Header
          {
            type   : 'text',
            content: '# 🧑‍💼 RecruitingHub Jobs Dashboard',
            markdown: true,
          },

          // KPI row
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Jobs',
                  value   : totalJobs,
                  icon    : 'Work',
                  color   : 'primary',
                  subtitle: `across ${totalPages} pages`,
                  action  : { label: 'Browse All', intent: 'view_jobs' },
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Open (this page)',
                  value   : openCount,
                  icon    : 'CheckCircle',
                  color   : 'success',
                  subtitle: 'Active positions',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Sectors',
                  value   : sectors.length,
                  icon    : 'Category',
                  color   : 'info',
                  subtitle: sectors.slice(0, 2).join(', ') || '—',
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Companies',
                  value   : companies.length,
                  icon    : 'Business',
                  color   : 'warning',
                  subtitle: 'Hiring now',
                }],
              },
            ],
          },

          // Recent jobs preview
          {
            type    : 'data_table',
            title   : 'Recent Jobs (first 5)',
            columns : [
              { field: 'jobtitle',  label: 'Title',    align: 'left'   },
              { field: 'company',   label: 'Company',  align: 'left'   },
              { field: 'location',  label: 'Location', align: 'left'   },
              { field: 'type',      label: 'Type',     align: 'center' },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: JOB_STATUS_COLORS },
              },
              { field: 'posted',    label: 'Posted',   align: 'center' },
            ],
            rows        : summaryRows,
            emptyMessage: 'No jobs found.',
          },

          // Actions
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 6,
                components: [{
                  type     : 'action_button',
                  label    : 'Browse All Jobs',
                  intent   : 'view_jobs',
                  variant  : 'contained',
                  color    : 'primary',
                  icon     : 'Work',
                  fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 6,
                components: [{
                  type     : 'action_button',
                  label    : 'Refresh Token',
                  intent   : 'refresh_token',
                  variant  : 'outlined',
                  color    : 'secondary',
                  icon     : 'Refresh',
                  fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── Paginated jobs list ─────────────────────────────────────────────────
    view_jobs: async (context) => {
      const page  = Math.max(1, Number(context.metadata?.page || 1));
      const query = context.metadata?.query || '';

      let jobData;
      try {
        jobData = await fetchJobs(page);
      } catch (err) {
        return {
          layout: [
            {
              type    : 'alert',
              severity: 'error',
              title   : 'Failed to load jobs',
              message : err.message,
              action  : { label: '← Dashboard', intent: 'init' },
            },
          ],
        };
      }

      const allJobs    = jobData.data || [];
      const jobs       = filterJobs(allJobs, query);
      const totalJobs  = query ? jobs.length : (jobData.total || 0);
      const totalPages = query ? Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE)) : (jobData.last_page || 1);

      const rows = jobs.map(j => ({
        jobid      : j.jobid,
        jobtitle   : j.jobtitle,
        company    : j.member?.company?.name || '—',
        sector     : j.jobsector || '—',
        location   : `${j.city || ''}${j.country ? ', ' + j.country : ''}`.replace(/^,\s*/, '') || '—',
        type       : j.jobtype || '—',
        vacancies  : `${j.filledvacancy}/${j.novacancies}`,
        salary     : salary(j),
        experience : experience(j),
        status     : j.status,
        closing    : fmtDate(j.closingdate),
      }));

      return {
        layout: [
          // Back + page info
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 8,
                components: [{
                  type    : 'text',
                  content : `## Jobs — Page ${page} of ${totalPages} (${totalJobs} total)`,
                  markdown: true,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type    : 'action_button',
                  label   : '← Dashboard',
                  intent  : 'init',
                  variant : 'outlined',
                  color   : 'secondary',
                  icon    : 'Home',
                  fullWidth: true,
                }],
              },
            ],
          },

          // Jobs table with pagination
          {
            type   : 'data_table',
            title  : `Jobs (page ${page} of ${totalPages})`,
            columns: [
              { field: 'jobtitle',  label: 'Title',      align: 'left'   },
              { field: 'company',   label: 'Company',    align: 'left'   },
              { field: 'location',  label: 'Location',   align: 'left'   },
              { field: 'sector',    label: 'Sector',     align: 'left'   },
              { field: 'type',      label: 'Type',       align: 'center' },
              { field: 'salary',    label: 'Salary',     align: 'center' },
              { field: 'experience',label: 'Exp',        align: 'center' },
              { field: 'vacancies', label: 'Filled/Total',align: 'center'},
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: JOB_STATUS_COLORS },
              },
              { field: 'closing',   label: 'Closing',    align: 'center' },
              {
                field  : '_actions', label: 'Detail', align: 'center',
                actions: [{
                  label : 'View',
                  intent: 'view_job_detail',
                  params: { jobId: '{{row.jobid}}', jobTitle: '{{row.jobtitle}}' },
                }],
              },
            ],
            rows        : rows,
            search      : {
              value      : query,
              placeholder: 'Search by title, company, sector, city…',
              intent     : 'search_jobs',
            },
            pagination  : {
              page,
              pageSize : JOBS_PER_PAGE,
              total    : totalJobs,
              intent   : 'view_jobs',
              params   : query ? { query } : undefined,
            },
            emptyMessage: query ? `No jobs matching "${query}".` : 'No jobs on this page.',
          },
        ],
      };
    },

    // ── Search jobs (client-side filter across current API page) ────────────
    search_jobs: async (context) => {
      // Delegates to view_jobs with the query in metadata
      const query = context.metadata?.query ?? '';
      const page  = Math.max(1, Number(context.metadata?.page || 1));

      let jobData;
      try {
        const allJobs    = await fetchAllJobs();
        const filtered   = filterJobs(allJobs, query);
        const totalJobs  = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
        const offset     = (page - 1) * JOBS_PER_PAGE;
        const pageJobs   = filtered.slice(offset, offset + JOBS_PER_PAGE);

        const rows = pageJobs.map(j => ({
          jobid      : j.jobid,
          jobtitle   : j.jobtitle,
          company    : j.member?.company?.name || '—',
          sector     : j.jobsector || '—',
          location   : `${j.city || ''}${j.country ? ', ' + j.country : ''}`.replace(/^,\s*/, '') || '—',
          type       : j.jobtype || '—',
          vacancies  : `${j.filledvacancy}/${j.novacancies}`,
          salary     : salary(j),
          experience : experience(j),
          status     : j.status,
          closing    : fmtDate(j.closingdate),
        }));

        logger.info(`search_jobs: query="${query}" matched=${totalJobs} page=${page}/${totalPages}`);

        return {
          layout: [
            {
              type   : 'grid',
              spacing: 2,
              columns: [
                {
                  xs: 12, sm: 8,
                  components: [{
                    type    : 'text',
                    content : query
                      ? `## Search results for "${query}" — ${totalJobs} job${totalJobs !== 1 ? 's' : ''} found`
                      : `## All Jobs — ${totalJobs} total`,
                    markdown: true,
                  }],
                },
                {
                  xs: 12, sm: 4,
                  components: [{
                    type     : 'action_button',
                    label    : '← Dashboard',
                    intent   : 'init',
                    variant  : 'outlined',
                    color    : 'secondary',
                    icon     : 'Home',
                    fullWidth: true,
                  }],
                },
              ],
            },
            {
              type        : 'data_table',
              title       : query ? `Results for "${query}" (page ${page} of ${totalPages})` : `All Jobs (page ${page} of ${totalPages})`,
              columns     : [
                { field: 'jobtitle',   label: 'Title',        align: 'left'   },
                { field: 'company',    label: 'Company',      align: 'left'   },
                { field: 'location',   label: 'Location',     align: 'left'   },
                { field: 'sector',     label: 'Sector',       align: 'left'   },
                { field: 'type',       label: 'Type',         align: 'center' },
                { field: 'salary',     label: 'Salary',       align: 'center' },
                { field: 'experience', label: 'Exp',          align: 'center' },
                { field: 'vacancies',  label: 'Filled/Total', align: 'center' },
                {
                  field: 'status', label: 'Status', align: 'center',
                  chip : { colorMap: JOB_STATUS_COLORS },
                },
                { field: 'closing', label: 'Closing', align: 'center' },
                {
                  field  : '_actions', label: 'Detail', align: 'center',
                  actions: [{
                    label : 'View',
                    intent: 'view_job_detail',
                    params: { jobId: '{{row.jobid}}', jobTitle: '{{row.jobtitle}}' },
                  }],
                },
              ],
              rows        : rows,
              search      : {
                value      : query,
                placeholder: 'Search by title, company, sector, city…',
                intent     : 'search_jobs',
              },
              pagination  : totalJobs > JOBS_PER_PAGE ? {
                page,
                pageSize : JOBS_PER_PAGE,
                total    : totalJobs,
                intent   : 'search_jobs',
                params   : { query },
              } : undefined,
              emptyMessage: query ? `No jobs matching "${query}".` : 'No jobs found.',
            },
          ],
        };
      } catch (err) {
        logger.error(`search_jobs failed: ${err.message}`);
        return {
          layout: [{
            type    : 'alert',
            severity: 'error',
            title   : 'Search Failed',
            message : err.message,
            action  : { label: '← Jobs', intent: 'view_jobs' },
          }],
        };
      }
    },

    // ── Job detail + candidates ─────────────────────────────────────────────
    view_job_detail: async (context) => {
      const jobId    = context.metadata?.jobId;
      const jobTitle = context.metadata?.jobTitle || `Job #${jobId}`;
      const page     = Math.max(1, Number(context.metadata?.page || 1));

      if (!jobId) {
        return {
          layout: [{
            type    : 'alert',
            severity: 'error',
            message : 'No jobId provided.',
            action  : { label: '← Jobs', intent: 'view_jobs' },
          }],
        };
      }

      // We need to find the job in the API — scan pages to locate it
      // Since the API only exposes a list endpoint, we search page by page
      // For efficiency we use the current page (jobs list page) or scan page 1-14
      let job = null;
      try {
        const allJobs = await fetchAllJobs();
        job = allJobs.find(j => String(j.jobid) === String(jobId)) || null;

        if (!job) {
          return {
            layout: [{
              type    : 'alert',
              severity: 'warning',
              title   : 'Job Not Found',
              message : `Could not find job #${jobId} in the API.`,
              action  : { label: '← Jobs', intent: 'view_jobs' },
            }],
          };
        }
      } catch (err) {
        return {
          layout: [{
            type    : 'alert',
            severity: 'error',
            title   : 'API Error',
            message : err.message,
            action  : { label: '← Jobs', intent: 'view_jobs' },
          }],
        };
      }

      const candidates     = job.submitted_candidates || [];
      const totalCands     = candidates.length;
      const totalCandPages = Math.max(1, Math.ceil(totalCands / PAGE_SIZE));
      const offset         = (page - 1) * PAGE_SIZE;
      const pageCands      = candidates.slice(offset, offset + PAGE_SIZE);

      // Candidate status breakdown
      const statusCounts = {};
      candidates.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
      const topStatuses  = Object.entries(statusCounts).sort(([,a],[,b]) => b - a).slice(0, 5);

      const company = job.member?.company || {};

      return {
        layout: [
          // Navigation
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 9,
                components: [{
                  type    : 'text',
                  content : `## ${job.jobtitle}`,
                  markdown: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type     : 'action_button',
                  label    : '← Back to Jobs',
                  intent   : 'view_jobs',
                  variant  : 'outlined',
                  color    : 'secondary',
                  icon     : 'ArrowBack',
                  fullWidth: true,
                }],
              },
            ],
          },

          // Job KPIs
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Vacancies',
                  value   : `${job.filledvacancy}/${job.novacancies}`,
                  icon    : 'People',
                  color   : 'primary',
                  subtitle: `${job.novacancies - job.filledvacancy} remaining`,
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Candidates',
                  value   : totalCands,
                  icon    : 'PersonAdd',
                  color   : 'info',
                  subtitle: `Page ${page} of ${totalCandPages}`,
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Salary',
                  value   : salary(job),
                  icon    : 'AttachMoney',
                  color   : 'success',
                  subtitle: `${experience(job)} experience`,
                }],
              },
              {
                xs: 6, sm: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Status',
                  value   : job.status,
                  icon    : 'Info',
                  color   : job.status === 'Open' ? 'success' : 'warning',
                  subtitle: fmtDate(job.closingdate),
                }],
              },
            ],
          },

          // Tabbed detail
          {
            type      : 'tabs',
            defaultTab: 0,
            tabs      : [
              // Tab 1 — Job Info
              {
                label     : 'Job Info',
                icon      : 'Work',
                components: [
                  {
                    type   : 'grid',
                    spacing: 2,
                    columns: [
                      {
                        xs: 12, sm: 6,
                        components: [{
                          type   : 'data_table',
                          title  : 'Job Details',
                          columns: [
                            { field: 'label', label: 'Field',  align: 'left' },
                            { field: 'value', label: 'Value',  align: 'left' },
                          ],
                          rows: [
                            { label: 'Job ID',        value: job.jobid       },
                            { label: 'Title',         value: job.jobtitle    },
                            { label: 'Sector',        value: job.jobsector   },
                            { label: 'Type',          value: job.jobtype     },
                            { label: 'Location',      value: `${job.city}, ${job.country}` },
                            { label: 'Working',       value: job.working     },
                            { label: 'Interview',     value: job.interviewmethod },
                            { label: 'Experience',    value: experience(job) },
                            { label: 'Salary',        value: salary(job)     },
                            { label: 'Notice (wks)',  value: job.notice      },
                            { label: 'Posted',        value: fmtDate(job.postdate)   },
                            { label: 'Closing',       value: fmtDate(job.closingdate) },
                            { label: 'Status',        value: job.status      },
                            { label: 'Priority',      value: job.priority === 1 ? 'High' : 'Normal' },
                            { label: 'Relocation',    value: job.considerrelocation ? 'Yes' : 'No' },
                          ],
                          emptyMessage: '',
                        }],
                      },
                      {
                        xs: 12, sm: 6,
                        components: [
                          {
                            type   : 'data_table',
                            title  : 'Company',
                            columns: [
                              { field: 'label', label: 'Field', align: 'left' },
                              { field: 'value', label: 'Value', align: 'left' },
                            ],
                            rows: [
                              { label: 'Company',   value: company.name          },
                              { label: 'Type',      value: company.companytype   },
                              { label: 'Website',   value: company.website       },
                              { label: 'Country',   value: company.country       },
                              { label: 'City',      value: company.city          },
                              { label: 'Sectors',   value: company.sectors       },
                              { label: 'Contact',   value: job.member?.email     },
                              { label: 'Phone',     value: job.member?.mobile    },
                              { label: 'HR Name',   value: `${(job.member?.firstname || '').trim()} ${(job.member?.lastname || '').trim()}`.trim() },
                            ],
                            emptyMessage: '',
                          },
                          ...(job.interviewcomments ? [{
                            type    : 'alert',
                            severity: 'info',
                            title   : 'Interview Notes',
                            message : job.interviewcomments,
                          }] : []),
                        ],
                      },
                    ],
                  },
                  // Description
                  ...(job.description ? [{
                    type    : 'text',
                    content : `**Job Description**\n\n${job.description.replace(/\r\n/g, '\n').trim()}`,
                    markdown: true,
                    variant : 'body2',
                  }] : []),
                ],
              },

              // Tab 2 — Candidates (paginated)
              {
                label     : `Candidates (${totalCands})`,
                icon      : 'People',
                components: [
                  // Status breakdown bar
                  ...(topStatuses.length > 0 ? [{
                    type   : 'grid',
                    spacing: 1,
                    columns: topStatuses.map(([status, count]) => ({
                      xs: 6, sm: Math.floor(12 / Math.min(topStatuses.length, 4)),
                      components: [{
                        type    : 'stat_card',
                        title   : status,
                        value   : count,
                        icon    : 'Person',
                        color   : CAND_STATUS_COLORS[status] || 'default',
                        subtitle: `${Math.round(count / totalCands * 100)}%`,
                      }],
                    })),
                  }] : []),

                  // Candidates table
                  {
                    type   : 'data_table',
                    title  : `Candidates (page ${page} of ${totalCandPages})`,
                    columns: [
                      { field: 'id',          label: '#',         align: 'center' },
                      { field: 'candidateid', label: 'Cand. ID',  align: 'center' },
                      { field: 'recruiterid', label: 'Recruiter', align: 'center' },
                      {
                        field: 'status', label: 'Status', align: 'center',
                        chip : { colorMap: CAND_STATUS_COLORS },
                      },
                      { field: 'submitdate',  label: 'Submitted',  align: 'center' },
                      { field: 'comment',     label: 'Comment',    align: 'left'   },
                      { field: 'viewnotes',   label: 'Notes',      align: 'left'   },
                    ],
                    rows: pageCands.map(c => ({
                      id          : c.id,
                      candidateid : c.candidateid,
                      recruiterid : c.recruiterid,
                      status      : c.status,
                      submitdate  : fmtDate(c.submitdate),
                      comment     : c.comment  || '—',
                      viewnotes   : c.viewnotes
                        ? (c.viewnotes.length > 80 ? c.viewnotes.slice(0, 80) + '…' : c.viewnotes)
                        : '—',
                    })),
                    pagination  : {
                      page,
                      pageSize : PAGE_SIZE,
                      total    : totalCands,
                      intent   : 'view_job_detail',
                      params   : { jobId, jobTitle },
                    },
                    emptyMessage: 'No candidates submitted for this job.',
                  },
                ],
              },
            ],
          },
        ],
      };
    },

    // ── Force re-login ──────────────────────────────────────────────────────
    refresh_token: async () => {
      _tokenCache = null;  // bust cache

      try {
        await getToken();    // re-authenticate immediately
        return {
          layout: [
            {
              type    : 'alert',
              severity: 'success',
              title   : 'Token Refreshed',
              message : 'Successfully re-authenticated with RecruitingHub.',
              action  : { label: 'Browse Jobs', intent: 'view_jobs' },
            },
          ],
        };
      } catch (err) {
        return {
          layout: [
            {
              type    : 'alert',
              severity: 'error',
              title   : 'Login Failed',
              message : err.message,
              action  : { label: 'Try Again', intent: 'refresh_token' },
            },
          ],
        };
      }
    },

  },
};
