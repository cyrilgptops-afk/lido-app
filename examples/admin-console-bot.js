/**
 * Lido Admin Console — Application Bot
 * Version: 1.0.0
 *
 * A live admin dashboard that reads directly from the Lido database via
 * the helpers.db API (DatabaseQuery). No mock data — all numbers are real.
 *
 * Supported intents:
 *   init                 — platform overview (users, orgs, bots KPIs)
 *   view_users           — all users table (live)
 *   view_user_detail     — single user profile + org membership (params: { userId })
 *   view_organizations   — all organizations table (live)
 *   view_org_detail      — org detail: info + member list + bot list (params: { orgId, orgName })
 *   view_bots            — all bot scripts for this org (live)
 *   view_bot_detail      — bot detail + recent execution log (params: { botId, botName })
 *   view_execution_logs  — recent executions across all bots (params: { botId? })
 *
 * NOTE: helpers.db.select() enforces soft-delete and org-scoped filters automatically:
 *   - `users`/`organizations` → global (no org filter)
 *   - `bot_scripts`          → filtered to current org
 *   - `user_organizations`   → filtered to current org
 *   - `bot_execution_logs`   → no automatic filter (query by bot_id manually)
 */

// ─── Pagination ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 5;

// ─── Status / type colour maps ────────────────────────────────────────────────
const USER_STATUS_COLORS  = { active: 'success', inactive: 'warning', suspended: 'error' };
const BOT_TYPE_COLORS     = { chat: 'primary', application: 'secondary' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fullName(u) {
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ');
  return n || u.email;
}

// ─── Module export ─────────────────────────────────────────────────────────────

module.exports = {
  name   : 'Admin Console',
  version: '1.0.0',

  async initialize(context) {
    console.log(`[AdminConsole] init user=${context.userId} org=${context.organizationId}`);
  },

  intents: {

    // ── Platform overview dashboard ─────────────────────────────────────────
    init: async (context, helpers) => {
      // Fetch all stats in parallel
      const [users, orgs, bots] = await Promise.all([
        helpers.db.select('users',         ['id', 'status', 'created_at'], {}, { limit: 5000 }),
        helpers.db.select('organizations', ['id', 'name', 'created_at'],   {}, { limit: 5000 }),
        helpers.db.select('bot_scripts',   ['id', 'type', 'is_active'],    {}, { limit: 5000 }),
      ]);

      const activeUsers    = users.filter(u => u.status === 'active').length;
      const inactiveUsers  = users.filter(u => u.status === 'inactive').length;
      const suspendedUsers = users.filter(u => u.status === 'suspended').length;
      const chatBots       = bots.filter(b => b.type === 'chat').length;
      const appBots        = bots.filter(b => b.type === 'application').length;
      const activeBots     = bots.filter(b => b.is_active).length;

      // Last 30-day new users
      const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newUsersMonth  = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;

      return {
        message: null,
        layout: [
          // ── KPI Row ────────────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Total Users',
                  value   : users.length,
                  subtitle: `${activeUsers} active · ${suspendedUsers} suspended`,
                  icon    : 'People',
                  color   : 'primary',
                  trend   : { value: `+${newUsersMonth} this month`, direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Organizations',
                  value   : orgs.length,
                  subtitle: 'Active workspaces',
                  icon    : 'Business',
                  color   : 'info',
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Bot Scripts',
                  value   : bots.length,
                  subtitle: `${chatBots} chat · ${appBots} application`,
                  icon    : 'SmartToy',
                  color   : 'secondary',
                  trend   : { value: `${activeBots} deployed`, direction: 'up' },
                }],
              },
              {
                xs: 12, sm: 6, md: 3,
                components: [{
                  type    : 'stat_card',
                  title   : 'Active Bots',
                  value   : activeBots,
                  subtitle: `of ${bots.length} total scripts`,
                  icon    : 'PlayCircle',
                  color   : activeBots > 0 ? 'success' : 'warning',
                }],
              },
            ],
          },

          // ── Suspended users alert ──────────────────────────────────────
          ...(suspendedUsers > 0 ? [{
            type      : 'alert',
            severity  : 'error',
            title     : `${suspendedUsers} suspended user(s)`,
            message   : 'Some accounts are suspended. Review the users list to manage their status.',
            dismissible: true,
            action    : { label: 'View Users', intent: 'view_users' },
          }] : []),

          // ── Summary breakdown tabs ─────────────────────────────────────
          {
            type: 'tabs',
            defaultTab: 0,
            tabs: [
              {
                label     : 'Users',
                icon      : 'People',
                components: [{
                  type : 'list',
                  title: 'User Status Breakdown',
                  items: [
                    { primary: 'Active',    description: `${activeUsers} users`,    icon: 'CheckCircle',   badge: String(activeUsers)    },
                    { primary: 'Inactive',  description: `${inactiveUsers} users`,  icon: 'PauseCircle',   badge: String(inactiveUsers)  },
                    { primary: 'Suspended', description: `${suspendedUsers} users`, icon: 'Cancel',        badge: String(suspendedUsers) },
                    { primary: 'New (30d)', description: 'Registered this month',   icon: 'PersonAdd',     badge: String(newUsersMonth)  },
                  ],
                }],
              },
              {
                label     : 'Bots',
                icon      : 'SmartToy',
                components: [{
                  type : 'list',
                  title: 'Bot Type Breakdown',
                  items: [
                    { primary: 'Chat Bots',         description: `${chatBots} scripts`,    icon: 'Chat',        badge: String(chatBots)    },
                    { primary: 'Application Bots',  description: `${appBots} scripts`,     icon: 'Apps',        badge: String(appBots)     },
                    { primary: 'Deployed (Active)',  description: `${activeBots} scripts`,  icon: 'PlayCircle',  badge: String(activeBots)  },
                    { primary: 'Inactive',           description: `${bots.length - activeBots} scripts`, icon: 'StopCircle', badge: String(bots.length - activeBots) },
                  ],
                }],
              },
              {
                label     : 'Orgs',
                icon      : 'Business',
                components: [{
                  type : 'list',
                  title: 'Organizations',
                  items: orgs.slice(0, 8).map(o => ({
                    primary    : o.name,
                    description: `Created ${fmtDate(o.created_at)}`,
                    icon       : 'Business',
                    intent     : 'view_org_detail',
                    params     : { orgId: o.id, orgName: o.name },
                  })),
                }],
              },
            ],
          },

          // ── Quick actions ─────────────────────────────────────────────
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'All Users',
                  intent: 'view_users', variant: 'outlined', color: 'primary',
                  icon: 'People', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'Organizations',
                  intent: 'view_organizations', variant: 'outlined', color: 'primary',
                  icon: 'Business', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'Bot Scripts',
                  intent: 'view_bots', variant: 'outlined', color: 'secondary',
                  icon: 'SmartToy', fullWidth: true,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type: 'action_button', label: 'Execution Logs',
                  intent: 'view_execution_logs', variant: 'outlined', color: 'primary',
                  icon: 'History', fullWidth: true,
                }],
              },
            ],
          },
        ],
      };
    },

    // ── All users table ─────────────────────────────────────────────────────
    view_users: async (context, helpers) => {
      const users = await helpers.db.select(
        'users',
        ['id', 'uuid', 'email', 'first_name', 'last_name', 'status', 'created_at', 'last_seen_at'],
        {},
        { limit: 200, orderBy: 'created_at DESC' },
      );

      const rows = users.map(u => ({
        ...u,
        name       : fullName(u),
        created_at : fmtDate(u.created_at),
        last_seen  : u.last_seen_at ? fmtTime(u.last_seen_at) : 'Never',
      }));

      const suspended = rows.filter(u => u.status === 'suspended').length;

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `All Users **(${rows.length})**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          ...(suspended > 0 ? [{
            type    : 'alert',
            severity: 'warning',
            title   : `${suspended} suspended account(s)`,
            message : 'These users cannot log in. Click "View" on a user to manage their status via the Admin Panel.',
            dismissible: true,
          }] : []),

          {
            type   : 'data_table',
            columns: [
              { field: 'name',       label: 'Name',       align: 'left'   },
              { field: 'email',      label: 'Email',      align: 'left'   },
              {
                field: 'status', label: 'Status', align: 'center',
                chip : { colorMap: USER_STATUS_COLORS },
              },
              { field: 'created_at', label: 'Registered', align: 'center' },
              { field: 'last_seen',  label: 'Last Seen',  align: 'center' },
              {
                field  : '_actions', label: 'Actions', align: 'center',
                actions: [
                  { label: 'View', intent: 'view_user_detail', params: { userId: '{{row.id}}' } },
                ],
              },
            ],
            rows        : rows,
            emptyMessage: 'No users found.',
          },

          {
            type    : 'text',
            content : `Showing up to 200 most recent users. Manage users at **Admin → Users**.`,
            markdown: true,
            variant : 'caption',
            color   : 'text.secondary',
          },
        ],
      };
    },

    // ── Single user detail ──────────────────────────────────────────────────
    view_user_detail: async (context, helpers) => {
      const userId = context.metadata?.userId;
      if (!userId) {
        return { layout: [{ type: 'alert', severity: 'error', message: 'No userId provided.', action: { label: '← Users', intent: 'view_users' } }] };
      }

      const users = await helpers.db.select(
        'users',
        ['id', 'uuid', 'email', 'first_name', 'last_name', 'status', 'created_at', 'updated_at', 'last_seen_at'],
        { id: userId },
        { limit: 1 },
      );
      const user = users[0];

      if (!user) {
        return { layout: [{ type: 'alert', severity: 'error', title: 'Not Found', message: `User #${userId} not found.`, action: { label: '← Users', intent: 'view_users' } }] };
      }

      // Fetch org memberships (scoped to current org only)
      const memberships = await helpers.db.select(
        'user_organizations',
        ['id', 'user_id', 'role_id', 'joined_at', 'is_active'],
        { user_id: userId },
        { limit: 20 },
      );

      // Fetch their bots (bots authored in the current org)
      const botRows = await helpers.db.select(
        'bot_scripts',
        ['id', 'name', 'type', 'is_active', 'version', 'created_at'],
        {},
        { limit: 50, orderBy: 'created_at DESC' },
      ).catch(() => []);

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `User: **${fullName(user)}**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Users',
                  intent: 'view_users', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type    : 'alert',
            severity: user.status === 'active' ? 'success' : user.status === 'suspended' ? 'error' : 'warning',
            message : `Account status: **${user.status.toUpperCase()}**`,
            markdown: true,
          },

          // KPI row
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Email',
                  value: user.email, icon: 'Email', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Status',
                  value: user.status, icon: 'VerifiedUser',
                  color: user.status === 'active' ? 'success' : user.status === 'suspended' ? 'error' : 'warning',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type    : 'stat_card', title: 'Registered',
                  value   : fmtDate(user.created_at),
                  icon    : 'CalendarToday', color: 'info',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type    : 'stat_card', title: 'Last Seen',
                  value   : user.last_seen_at ? fmtTime(user.last_seen_at) : 'Never',
                  icon    : 'AccessTime', color: 'secondary',
                }],
              },
            ],
          },

          // Org memberships
          {
            type : 'list',
            title: `Org Memberships (this workspace)`,
            items: memberships.length > 0
              ? memberships.map(m => ({
                  primary    : `Org #${m.org_id || 'current'}`,
                  description: `Role ID: ${m.role_id} · Joined ${fmtDate(m.joined_at)} · ${m.is_active ? 'Active' : 'Inactive'}`,
                  icon       : m.is_active ? 'CheckCircle' : 'PauseCircle',
                  badge      : m.is_active ? 'active' : 'inactive',
                }))
              : [{ primary: 'No membership in this workspace', icon: 'Info' }],
          },

          // Manage via admin panel notice
          {
            type    : 'alert',
            severity: 'info',
            message : 'To change this user\'s status or role, use **Admin → Users** in the navigation.',
            markdown: true,
            action  : { label: '← Back', intent: 'view_users' },
          },
        ],
      };
    },

    // ── All organizations table ─────────────────────────────────────────────
    view_organizations: async (context, helpers) => {
      const orgs = await helpers.db.select(
        'organizations',
        ['id', 'uuid', 'name', 'slug', 'created_at'],
        {},
        { limit: 200, orderBy: 'created_at DESC' },
      );

      const rows = orgs.map(o => ({
        ...o,
        created_at: fmtDate(o.created_at),
      }));

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `Organizations **(${rows.length})**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'data_table',
            columns: [
              { field: 'id',         label: 'ID',         align: 'center' },
              { field: 'name',       label: 'Name',       align: 'left'   },
              { field: 'slug',       label: 'Slug',       align: 'left'   },
              { field: 'created_at', label: 'Created',    align: 'center' },
              {
                field  : '_actions', label: 'Actions', align: 'center',
                actions: [
                  { label: 'View', intent: 'view_org_detail', params: { orgId: '{{row.id}}', orgName: '{{row.name}}' } },
                ],
              },
            ],
            rows        : rows,
            emptyMessage: 'No organizations found.',
          },
        ],
      };
    },

    // ── Organization detail ─────────────────────────────────────────────────
    view_org_detail: async (context, helpers) => {
      const orgId   = context.metadata?.orgId;
      const orgName = context.metadata?.orgName || `Org #${orgId}`;

      if (!orgId) {
        return { layout: [{ type: 'alert', severity: 'error', message: 'No orgId provided.', action: { label: '← Orgs', intent: 'view_organizations' } }] };
      }

      const orgs = await helpers.db.select(
        'organizations',
        ['id', 'uuid', 'name', 'slug', 'created_at', 'updated_at'],
        { id: orgId },
        { limit: 1 },
      );
      const org = orgs[0];

      if (!org) {
        return { layout: [{ type: 'alert', severity: 'error', title: 'Not Found', message: `Organization #${orgId} not found.`, action: { label: '← Orgs', intent: 'view_organizations' } }] };
      }

      // Members in CURRENT org (DatabaseQuery auto-scopes user_organizations)
      const members = await helpers.db.select(
        'user_organizations',
        ['user_id', 'role_id', 'joined_at', 'is_active'],
        {},
        { limit: 100, orderBy: 'joined_at ASC' },
      ).catch(() => []);

      // Bot scripts for CURRENT org
      const bots = await helpers.db.select(
        'bot_scripts',
        ['id', 'name', 'display_name', 'type', 'version', 'is_active', 'created_at'],
        {},
        { limit: 50, orderBy: 'created_at DESC' },
      ).catch(() => []);

      const activeBots   = bots.filter(b => b.is_active).length;
      const activeMembers = members.filter(m => m.is_active).length;

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `Organization: **${org.name}**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Orgs',
                  intent: 'view_organizations', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          // KPI
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Slug',
                  value: org.slug, icon: 'Link', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Members',
                  value: members.length, icon: 'Group', color: 'info',
                  subtitle: `${activeMembers} active`,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Bot Scripts',
                  value: bots.length, icon: 'SmartToy', color: 'secondary',
                  subtitle: `${activeBots} deployed`,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Created',
                  value: fmtDate(org.created_at), icon: 'CalendarToday', color: 'primary',
                }],
              },
            ],
          },

          // Tabs: Members | Bots
          {
            type      : 'tabs',
            defaultTab: 0,
            tabs: [
              {
                label     : `Members (${members.length})`,
                icon      : 'Group',
                components: members.length > 0 ? [{
                  type   : 'data_table',
                  title  : 'Members',
                  columns: [
                    { field: 'user_id',   label: 'User ID',   align: 'center' },
                    { field: 'role_id',   label: 'Role ID',   align: 'center' },
                    { field: 'joined_at', label: 'Joined',    align: 'center' },
                    {
                      field: 'is_active', label: 'Active', align: 'center',
                      chip : { colorMap: { '1': 'success', '0': 'warning', true: 'success', false: 'warning' } },
                    },
                    {
                      field  : '_actions', label: 'Profile', align: 'center',
                      actions: [
                        { label: 'View User', intent: 'view_user_detail', params: { userId: '{{row.user_id}}' } },
                      ],
                    },
                  ],
                  rows: members.map(m => ({
                    ...m,
                    is_active: m.is_active ? 'active' : 'inactive',
                    joined_at: fmtDate(m.joined_at),
                  })),
                  emptyMessage: 'No members.',
                }] : [{ type: 'alert', severity: 'info', message: 'No members found for this workspace.' }],
              },
              {
                label     : `Bots (${bots.length})`,
                icon      : 'SmartToy',
                components: bots.length > 0 ? [{
                  type   : 'data_table',
                  title  : 'Bot Scripts',
                  columns: [
                    { field: 'name',       label: 'Name',    align: 'left'   },
                    {
                      field: 'type', label: 'Type', align: 'center',
                      chip : { colorMap: BOT_TYPE_COLORS },
                    },
                    { field: 'version',    label: 'Version', align: 'center' },
                    {
                      field: 'is_active', label: 'Status', align: 'center',
                      chip : { colorMap: { active: 'success', inactive: 'warning' } },
                    },
                    { field: 'created_at', label: 'Created', align: 'center' },
                    {
                      field  : '_actions', label: 'Detail', align: 'center',
                      actions: [
                        { label: 'View', intent: 'view_bot_detail', params: { botId: '{{row.id}}', botName: '{{row.name}}' } },
                      ],
                    },
                  ],
                  rows: bots.map(b => ({
                    ...b,
                    is_active : b.is_active ? 'active' : 'inactive',
                    created_at: fmtDate(b.created_at),
                  })),
                  emptyMessage: 'No bots for this org.',
                }] : [{ type: 'alert', severity: 'info', message: 'No bot scripts found for this workspace.' }],
              },
            ],
          },
        ],
      };
    },

    // ── All bot scripts ─────────────────────────────────────────────────────
    view_bots: async (context, helpers) => {
      const bots = await helpers.db.select(
        'bot_scripts',
        ['id', 'name', 'display_name', 'type', 'version', 'is_active', 'created_at', 'updated_at'],
        {},
        { limit: 200, orderBy: 'created_at DESC' },
      );

      const chatBots  = bots.filter(b => b.type === 'chat').length;
      const appBots   = bots.filter(b => b.type === 'application').length;
      const active    = bots.filter(b => b.is_active).length;

      const rows = bots.map(b => ({
        ...b,
        display_name: b.display_name || b.name,
        is_active   : b.is_active ? 'active' : 'inactive',
        created_at  : fmtDate(b.created_at),
        updated_at  : fmtDate(b.updated_at),
      }));

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `Bot Scripts **(${bots.length})**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Dashboard',
                  intent: 'init', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Chat Bots',
                  value: chatBots, icon: 'Chat', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'App Bots',
                  value: appBots, icon: 'Apps', color: 'secondary',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Active / Deployed',
                  value: `${active} / ${bots.length}`,
                  icon : 'PlayCircle', color: active > 0 ? 'success' : 'warning',
                }],
              },
            ],
          },

          {
            type   : 'data_table',
            columns: [
              { field: 'id',           label: 'ID',          align: 'center' },
              { field: 'display_name', label: 'Name',        align: 'left'   },
              {
                field: 'type', label: 'Type', align: 'center',
                chip : { colorMap: BOT_TYPE_COLORS },
              },
              { field: 'version',      label: 'Version',     align: 'center' },
              {
                field: 'is_active', label: 'Status', align: 'center',
                chip : { colorMap: { active: 'success', inactive: 'warning' } },
              },
              { field: 'created_at',   label: 'Created',     align: 'center' },
              { field: 'updated_at',   label: 'Updated',     align: 'center' },
              {
                field  : '_actions', label: 'Actions', align: 'center',
                actions: [
                  { label: 'Detail', intent: 'view_bot_detail',     params: { botId: '{{row.id}}', botName: '{{row.name}}' } },
                  { label: 'Logs',   intent: 'view_execution_logs', params: { botId: '{{row.id}}' } },
                ],
              },
            ],
            rows        : rows,
            emptyMessage: 'No bot scripts found for this organization.',
          },
        ],
      };
    },

    // ── Bot detail + execution history ──────────────────────────────────────
    view_bot_detail: async (context, helpers) => {
      const botId   = context.metadata?.botId;
      const botName = context.metadata?.botName || `Bot #${botId}`;
      const page    = Math.max(1, Number(context.metadata?.page || 1));
      const offset  = (page - 1) * PAGE_SIZE;

      if (!botId) {
        return { layout: [{ type: 'alert', severity: 'error', message: 'No botId provided.', action: { label: '← Bots', intent: 'view_bots' } }] };
      }

      const [bots, logs, totalAgg, allLogs] = await Promise.all([
        helpers.db.select('bot_scripts', ['id', 'name', 'display_name', 'type', 'version', 'is_active', 'description', 'created_at', 'updated_at'], { id: botId }, { limit: 1 }),
        helpers.db.select('bot_execution_logs', ['id', 'intent', 'execution_time_ms', 'success', 'error_message', 'created_at'], { bot_id: botId }, { limit: PAGE_SIZE, offset, orderBy: 'created_at DESC' }).catch(() => []),
        helpers.db.aggregate('bot_execution_logs', { count: 'COUNT(*)' }, { bot_id: botId }).catch(() => ({ count: 0 })),
        // Fetch all logs (no limit) for summary stats & intent chart — only id/intent/success/execution_time_ms
        helpers.db.select('bot_execution_logs', ['intent', 'success', 'execution_time_ms'], { bot_id: botId }, { limit: 500, orderBy: 'created_at DESC' }).catch(() => []),
      ]);

      const bot = bots[0];
      if (!bot) {
        return { layout: [{ type: 'alert', severity: 'error', title: 'Not Found', message: `Bot #${botId} not found.`, action: { label: '← Bots', intent: 'view_bots' } }] };
      }

      const totalLogs    = Number(totalAgg.count || 0);
      const successCount = allLogs.filter(l => l.success).length;
      const failCount    = allLogs.filter(l => !l.success).length;
      const avgMs        = allLogs.length
        ? Math.round(allLogs.reduce((s, l) => s + (l.execution_time_ms || 0), 0) / allLogs.length)
        : 0;

      // Intent frequency breakdown
      const intentCounts = {};
      allLogs.forEach(l => { intentCounts[l.intent] = (intentCounts[l.intent] || 0) + 1; });
      const topIntents = Object.entries(intentCounts).sort(([,a],[,b]) => b-a).slice(0, 8);

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : `Bot: **${bot.display_name || bot.name}**`,
                  markdown: true,
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button', label: '← Bots',
                  intent: 'view_bots', variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type    : 'alert',
            severity: bot.is_active ? 'success' : 'warning',
            message : bot.is_active
              ? `This bot is **deployed and active** (v${bot.version}).`
              : `This bot is **not currently deployed**.`,
            markdown: true,
          },

          // KPI row
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Type',
                  value: bot.type, icon: bot.type === 'chat' ? 'Chat' : 'Apps', color: 'primary',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Total Executions',
                  value: logs.length, icon: 'PlayArrow', color: 'info',
                  subtitle: 'Last 50 logged',
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Success Rate',
                  value: logs.length ? `${Math.round(successCount / logs.length * 100)}%` : '—',
                  icon : 'CheckCircle', color: failCount === 0 ? 'success' : 'warning',
                  subtitle: `${failCount} failure(s)`,
                }],
              },
              {
                xs: 12, sm: 3,
                components: [{
                  type : 'stat_card', title: 'Avg Execution Time',
                  value: logs.length ? `${avgMs}ms` : '—',
                  icon : 'Timer', color: avgMs < 500 ? 'success' : 'warning',
                }],
              },
            ],
          },

          // Intent frequency chart
          ...(topIntents.length > 0 ? [{
            type     : 'chart',
            title    : 'Intent Frequency (last 50 executions)',
            chartType: 'bar',
            labels   : topIntents.map(([name]) => name),
            datasets : [{
              label: 'Executions',
              data : topIntents.map(([, count]) => count),
              color: '#696cff',
            }],
            legend: false,
            height: 220,
          }] : []),

          // Recent executions table (paginated)
          {
            type   : 'data_table',
            title  : `Recent Executions (page ${page} of ${Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))})`,
            columns: [
              { field: 'intent',           label: 'Intent',   align: 'left'   },
              { field: 'execution_time_ms',label: 'Time (ms)',align: 'center' },
              {
                field: 'success', label: 'Result', align: 'center',
                chip : { colorMap: { success: 'success', failed: 'error' } },
              },
              { field: 'error_message',    label: 'Error',    align: 'left'   },
              { field: 'created_at',       label: 'At',       align: 'center' },
            ],
            rows: logs.map(l => ({
              ...l,
              success      : l.success ? 'success' : 'failed',
              error_message: l.error_message || '—',
              created_at   : fmtTime(l.created_at),
            })),
            pagination  : {
              page,
              pageSize : PAGE_SIZE,
              total    : totalLogs,
              intent   : 'view_bot_detail',
              params   : { botId, botName },
            },
            emptyMessage: 'No execution logs found for this bot.',
          },
        ],
      };
    },

    // ── Cross-bot execution logs ────────────────────────────────────────────
    view_execution_logs: async (context, helpers) => {
      const filterBotId = context.metadata?.botId;
      const page        = Math.max(1, Number(context.metadata?.page || 1));
      const offset      = (page - 1) * PAGE_SIZE;

      // Fetch bots for label lookup
      const bots = await helpers.db.select(
        'bot_scripts', ['id', 'name', 'display_name', 'type'], {}, { limit: 200 },
      ).catch(() => []);
      const botMap = {};
      bots.forEach(b => { botMap[b.id] = b.display_name || b.name; });

      // Fetch paginated logs + total count in parallel
      const where = filterBotId ? { bot_id: filterBotId } : {};
      const [logs, totalAgg] = await Promise.all([
        helpers.db.select(
          'bot_execution_logs',
          ['id', 'bot_id', 'intent', 'execution_time_ms', 'success', 'error_message', 'created_at'],
          where,
          { limit: PAGE_SIZE, offset, orderBy: 'created_at DESC' },
        ).catch(() => []),
        helpers.db.aggregate('bot_execution_logs', { count: 'COUNT(*)' }, where).catch(() => ({ count: 0 })),
      ]);

      const totalLogs    = Number(totalAgg.count || 0);
      const successCount = logs.filter(l => l.success).length;
      const failCount    = logs.filter(l => !l.success).length;

      const rows = logs.map(l => ({
        ...l,
        bot_name     : botMap[l.bot_id] || `Bot #${l.bot_id}`,
        success      : l.success ? 'success' : 'failed',
        error_message: l.error_message || '—',
        created_at   : fmtTime(l.created_at),
      }));

      return {
        message: null,
        layout: [
          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 8,
                components: [{
                  type    : 'text',
                  content : filterBotId
                    ? `Execution Logs — Bot #${filterBotId}`
                    : 'Execution Logs (All Bots)',
                  variant : 'h6',
                }],
              },
              {
                xs: 4,
                components: [{
                  type: 'action_button',
                  label : filterBotId ? '← Bot Detail' : '← Dashboard',
                  intent: filterBotId ? 'view_bot_detail' : 'init',
                  params: filterBotId ? { botId: filterBotId } : undefined,
                  variant: 'text', icon: 'ArrowBack',
                }],
              },
            ],
          },

          {
            type   : 'grid',
            spacing: 2,
            columns: [
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Total Executions',
                  value: totalLogs, icon: 'PlayArrow', color: 'primary',
                  subtitle: `Page ${page} of ${Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))}`,
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Successful (this page)',
                  value: successCount, icon: 'CheckCircle', color: 'success',
                }],
              },
              {
                xs: 12, sm: 4,
                components: [{
                  type : 'stat_card', title: 'Failed (this page)',
                  value: failCount, icon: 'Error',
                  color: failCount > 0 ? 'error' : 'success',
                }],
              },
            ],
          },

          {
            type   : 'data_table',
            title  : `Executions (page ${page} of ${Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))})`,
            columns: [
              { field: 'bot_name',          label: 'Bot',      align: 'left'   },
              { field: 'intent',            label: 'Intent',   align: 'left'   },
              { field: 'execution_time_ms', label: 'ms',       align: 'center' },
              {
                field: 'success', label: 'Result', align: 'center',
                chip : { colorMap: { success: 'success', failed: 'error' } },
              },
              { field: 'error_message',     label: 'Error',    align: 'left'   },
              { field: 'created_at',        label: 'Time',     align: 'center' },
              {
                field  : '_actions', label: 'Bot', align: 'center',
                actions: [
                  { label: 'Bot Detail', intent: 'view_bot_detail', params: { botId: '{{row.bot_id}}' } },
                ],
              },
            ],
            rows        : rows,
            pagination  : {
              page,
              pageSize : PAGE_SIZE,
              total    : totalLogs,
              intent   : 'view_execution_logs',
              params   : filterBotId ? { botId: filterBotId } : {},
            },
            emptyMessage: 'No execution logs found.',
          },
        ],
      };
    },
  },
};
