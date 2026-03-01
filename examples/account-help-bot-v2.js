/**
 * Lido Connect - Account Help Bot
 * Version: 2.0.0
 * 
 * This bot handles common account-related queries including:
 * - Account information
 * - Password resets
 * - Email updates
 * - Profile management
 * - Security settings
 * - Account deletion
 */

module.exports = {
  name: 'Account Help Bot',
  version: '2.0.0',

  /**
   * Initialize bot (optional)
   */
  async initialize(context) {
    console.log(`Initializing Account Help Bot for user ${context.userId}`);
  },

  /**
   * Keyword map — used by the Lido Connect runtime for intent detection.
   * Longest phrases are tested before shorter ones to prevent partial shadowing.
   */
  keywords: {
    reset_password:    ['password', 'reset', 'forgot', 'change password', 'lost password', 'reset password', 'new password'],
    update_email:      ['email', 'update email', 'change email', 'new email', 'my email', 'email address'],
    view_account:      ['view account', 'account details', 'my account', 'account info', 'account information', 'check account', 'show account'],
    update_profile:    ['profile', 'update profile', 'my name', 'phone number', 'change name', 'edit profile', 'full name', 'timezone'],
    security_settings: ['security', '2fa', 'two factor', 'two-factor', 'login history', 'sessions', 'manage sessions', 'authentication', 'mfa'],
    delete_account:    ['delete account', 'close account', 'remove account', 'deactivate', 'delete my account', 'cancel account'],
    account_help:      ['help', 'hi', 'hello', 'hey', 'start', 'what can you do', 'account', 'assist', 'support', 'menu'],
  },

  /**
   * Intent handlers
   */
  intents: {

    /**
     * 
     * initial greeting and menu
     */
    init : async (context, helpers) => {
      // Get quick account stats
    //   const user = await helpers.db.getCurrentUser();
    //   const displayName = user
    //     ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'there'
    //     : 'there';
        return {
            message: ` dfrg I can help you with your account. What would you like to do?`,
            suggestions: helpers.suggestions.generate('account_help', 4),
            metadata: {
              userId: context.userId,
              timestamp: new Date().toISOString(),
            },
          };
    },

    /**
     * General account help
     */
    account_help: async (context, helpers) => {
      // Get quick account stats
      const user = await helpers.db.getCurrentUser();
      const displayName = user
        ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'there'
        : 'there';

      return {
        message: `Hi ${displayName}! I can help you with your account. What would you like to do?`,
        suggestions: helpers.suggestions.generate('account_help', 4),
        metadata: {
          userId: context.userId,
          timestamp: new Date().toISOString(),
        },
      };
    },

    /**
     * Password reset
     */
    reset_password: async (context, helpers) => {
      const resetForm = helpers.form
        .setTitle('Reset Your Password')
        .addEmailField('email', 'Email Address', {
          required: true,
          placeholder: 'your@email.com',
        })
        .setSubmitLabel('Send Reset Link')
        .build();

      return {
        message: 'I can help you reset your password. Please provide your email address.',
        form: resetForm,
        suggestions: ['Cancel', 'Contact support'],
        metadata: {
          action: 'password_reset_initiated',
        },
      };
    },

    /**
     * Update email
     */
    update_email: async (context, helpers) => {
      const user = await helpers.db.getCurrentUser();

      const emailForm = helpers.form
        .setTitle('Update Email Address')
        .addTextField('current_email', 'Current Email', {
          defaultValue: user?.email || '',
          disabled: true,
        })
        .addEmailField('new_email', 'New Email Address', {
          required: true,
          placeholder: 'newemail@example.com',
        })
        .addEmailField('confirm_email', 'Confirm New Email', {
          required: true,
        })
        .addTextField('password', 'Password', {
          type: 'password',
          required: true,
          placeholder: 'Confirm with password',
        })
        .setSubmitLabel('Update Email')
        .build();

      return {
        message: 'To update your email address, please fill out the form below.',
        form: emailForm,
        suggestions: ['Cancel'],
      };
    },

    /**
     * View account details
     */
    view_account: async (context, helpers) => {
      const user = await helpers.db.getCurrentUser();
      if (!user) {
        return {
          message: 'Sorry, I could not retrieve your account details right now.',
          suggestions: ['Try again', 'Contact support'],
        };
      }

      // Get organization membership
      const orgs = await helpers.db.select('user_organizations', ['*'], {
        user_id: context.userId,
      });

      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Not set';

      const accountTable = helpers.table
        .setTitle('Your Account Information')
        .addColumn('field', 'Field', 'text')
        .addColumn('value', 'Value', 'text')
        .setRows([
          { field: 'Name',          value: fullName },
          { field: 'Email',         value: user.email || '' },
          { field: 'Status',        value: user.status || 'Active' },
          { field: 'Organizations', value: orgs.length.toString() },
          { field: 'Member Since',  value: helpers.utils.formatDate(user.created_at, 'long') },
        ])
        .build();

      return {
        message: 'Here are your account details:',
        table: accountTable,
        suggestions: ['Update email', 'Change password', 'Security settings'],
      };
    },

    /**
     * Update profile
     */
    update_profile: async (context, helpers) => {
      const user = await helpers.db.getCurrentUser();

      const profileForm = helpers.form
        .setTitle('Update Your Profile')
        .addTextField('name', 'Full Name', {
          defaultValue: user
            ? [user.first_name, user.last_name].filter(Boolean).join(' ')
            : '',
          required: true,
        })
        .addTextField('phone', 'Phone Number', {
          defaultValue: '',
          placeholder: '+1 (555) 123-4567',
        })
        .addSelectField('timezone', 'Timezone', [
          { label: 'Eastern Time (ET)', value: 'America/New_York' },
          { label: 'Central Time (CT)', value: 'America/Chicago' },
          { label: 'Mountain Time (MT)', value: 'America/Denver' },
          { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
        ])
        .setSubmitLabel('Save Changes')
        .build();

      return {
        message: 'Update your profile information below.',
        form: profileForm,
        suggestions: ['Cancel'],
      };
    },

    /**
     * Security settings
     */
    security_settings: async (context, helpers) => {
      return {
        message: 'Manage your account security:',
        actions: [
          { type: 'button', label: 'Change Password', value: 'change_password' },
          { type: 'button', label: 'Enable 2FA', value: 'enable_2fa' },
          { type: 'button', label: 'View Login History', value: 'login_history' },
          { type: 'button', label: 'Manage Sessions', value: 'manage_sessions' },
        ],
        suggestions: helpers.suggestions.generate('account_help', 3),
      };
    },

    /**
     * Delete account
     */
    delete_account: async (context, helpers) => {
      const deleteForm = helpers.form
        .setTitle('⚠️ Delete Account')
        .addTextArea('reason', 'Why are you leaving?', {
          required: false,
          placeholder: 'Optional feedback...',
        })
        .addTextField('password', 'Password', {
          type: 'password',
          required: true,
          placeholder: 'Confirm with password',
        })
        .addCheckbox('confirm', 'I understand this action cannot be undone', {
          required: true,
        })
        .setSubmitLabel('Delete My Account')
        .setCancelLabel('Cancel')
        .build();

      return {
        message: '⚠️ **Warning:** Deleting your account is permanent and cannot be undone. All your data will be removed.',
        form: deleteForm,
        suggestions: ['Cancel', 'Talk to support'],
      };
    },

    /**
     * Fallback handler for unknown intents
     */
    '*': async (context, helpers) => {
      return {
        message: "test new I'm not sure how to help with that. I can assist with account-related questions like password resets, email updates, and profile management.",
        suggestions: helpers.suggestions.generate('account_help', 4),
      };
    },
  },
};
