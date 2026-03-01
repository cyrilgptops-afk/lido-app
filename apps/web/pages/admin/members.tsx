/**
 * Admin - Members Management Page
 * Manage user-organization memberships and roles
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout, { adminTheme } from '../../components/layouts/AdminLayout';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface Member {
  user_id: number;
  user_uuid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  org_id: number;
  org_name: string;
  role_id: number;
  role_name: string;
  joined_at: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
}

interface User {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface Organization {
  id: number;
  name: string;
}

export default function MembersPage() {
  const router = useRouter();
  const { orgId: queryOrgId } = router.query;

  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    user_id: 0,
    org_id: 0,
    role_id: 0,
  });

  useEffect(() => {
    if (queryOrgId) {
      setSelectedOrgId(Number(queryOrgId));
    }
  }, [queryOrgId]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      fetchMembers();
    }
  }, [selectedOrgId]);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [rolesRes, usersRes, orgsRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/users'),
        fetch('/api/admin/organizations'),
      ]);

      const [rolesData, usersData, orgsData] = await Promise.all([
        rolesRes.json(),
        usersRes.json(),
        orgsRes.json(),
      ]);

      if (rolesData.success) setRoles(rolesData.data || []);
      if (usersData.success) setUsers(usersData.data.users || []);
      if (orgsData.success) setOrgs(orgsData.data || []);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers() {
    if (!selectedOrgId) return;

    try {
      const res = await fetch(`/api/admin/members?orgId=${selectedOrgId}`);
      const data = await res.json();
      
      if (data.success) {
        setMembers(data.data || []);
      } else {
        setError('Failed to fetch members');
      }
    } catch (err) {
      setError('Failed to fetch members');
      console.error(err);
    }
  }

  function handleOpenDialog(member?: Member) {
    if (member) {
      setEditingMember(member);
      setFormData({
        user_id: member.user_id,
        org_id: member.org_id,
        role_id: member.role_id,
      });
    } else {
      setEditingMember(null);
      setFormData({
        user_id: 0,
        org_id: selectedOrgId || 0,
        role_id: roles[0]?.id || 0,
      });
    }
    setOpenDialog(true);
  }

  function handleCloseDialog() {
    setOpenDialog(false);
    setEditingMember(null);
  }

  async function handleSave() {
    try {
      if (editingMember) {
        // Update role
        const res = await fetch(
          `/api/admin/members?userId=${editingMember.user_id}&orgId=${editingMember.org_id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role_id: formData.role_id }),
          }
        );

        const data = await res.json();
        if (!data.success) {
          alert('Failed to update member: ' + (data.error || 'Unknown error'));
          return;
        }
      } else {
        // Add member
        const res = await fetch('/api/admin/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!data.success) {
          alert('Failed to add member: ' + (data.error || 'Unknown error'));
          return;
        }
      }

      handleCloseDialog();
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Failed to save member');
    }
  }

  async function handleDelete(userId: number, orgId: number) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const res = await fetch(`/api/admin/members?userId=${userId}&orgId=${orgId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchMembers();
      } else {
        alert('Failed to remove member');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove member');
    }
  }

  function getRoleColor(roleName: string) {
    switch (roleName.toLowerCase()) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'warning';
      case 'member':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Members">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Members">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize.xl }}>Members Management</Typography>
        <Box display="flex" gap={2}>
          <TextField
            select
            label="Select Organization"
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(Number(e.target.value))}
            sx={{ minWidth: 250 }}
            size="small"
            InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
            InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: adminTheme.typography.fontSize.sm } } } } }}
          >
            {orgs.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                {org.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={!selectedOrgId}
            sx={{
              bgcolor: adminTheme.colors.primary,
              textTransform: 'none',
              fontSize: adminTheme.typography.fontSize.sm,
              fontWeight: adminTheme.typography.fontWeight.normal,
              '&:hover': { bgcolor: adminTheme.colors.primaryHover },
            }}
          >
            Add Member
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!selectedOrgId && (
        <Alert severity="info">
          Please select an organization to view its members
        </Alert>
      )}

      {selectedOrgId && (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: adminTheme.colors.bgHeader }}>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>User ID</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Email</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Name</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Organization</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Role</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Joined</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Status</TableCell>
                <TableCell align="right" sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={`${member.user_id}-${member.org_id}`} sx={{ bgcolor: adminTheme.colors.bgRow, '&:hover': { bgcolor: adminTheme.colors.bgHover } }}>
                  <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding }}>{member.user_id}</TableCell>
                  <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding }}>{member.email}</TableCell>
                  <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding }}>
                    {member.first_name || member.last_name
                      ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                      : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding }}>{member.org_name}</TableCell>
                  <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                    <Chip
                      label={member.role_name}
                      color={getRoleColor(member.role_name) as any}
                      size="small"
                      sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 20 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight, padding: adminTheme.spacing.tableCellPadding }}>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                    <Chip
                      label={member.is_active ? 'Active' : 'Inactive'}
                      color={member.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 20 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(member)}
                      sx={{ color: adminTheme.colors.primary, padding: '4px' }}
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(member.user_id, member.org_id)}
                      sx={{ color: adminTheme.colors.error, padding: '4px' }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow sx={{ bgcolor: adminTheme.colors.bgRow }}>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: adminTheme.colors.textLight, fontSize: adminTheme.typography.fontSize.sm, padding: adminTheme.spacing.tableCellPadding }}>
                    No members found in this organization
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: adminTheme.spacing.borderRadius, bgcolor: adminTheme.colors.bgRow } }}>
        <DialogTitle sx={{ fontWeight: adminTheme.typography.fontWeight.medium, fontSize: adminTheme.typography.fontSize.lg, color: adminTheme.colors.textDark, bgcolor: adminTheme.colors.bgHeader, borderBottom: `1px solid ${adminTheme.colors.border}` }}>
          {editingMember ? 'Edit Member Role' : 'Add Member'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: adminTheme.colors.bgRow }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: adminTheme.spacing.contentGap, mt: adminTheme.spacing.contentGap }}>
            {!editingMember && (
              <>
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => `${option.email} ${option.first_name ? `(${option.first_name} ${option.last_name || ''})` : ''}`}
                  onChange={(_, value) => setFormData({ ...formData, user_id: value?.id || 0 })}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Select User" required size="small" sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }} InputProps={{ ...params.InputProps, sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }} InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }} />
                  )}
                />
                <TextField
                  select
                  label="Organization"
                  fullWidth
                  required
                  size="small"
                  value={formData.org_id}
                  onChange={(e) => setFormData({ ...formData, org_id: Number(e.target.value) })}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
                  InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }}
                  InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
                  SelectProps={{ MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: adminTheme.typography.fontSize.sm } } } } }}
                >
                  {orgs.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
            <TextField
              select
              label="Role"
              fullWidth
              required
              size="small"
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
              InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }}
              InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
              SelectProps={{ MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: adminTheme.typography.fontSize.sm } } } } }}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name} {role.description && `- ${role.description}`}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: adminTheme.spacing.cardPadding, pb: adminTheme.spacing.contentGap, bgcolor: adminTheme.colors.bgRow, borderTop: `1px solid ${adminTheme.colors.border}` }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, bgcolor: adminTheme.colors.primary, '&:hover': { bgcolor: adminTheme.colors.primaryHover } }}>
            {editingMember ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
