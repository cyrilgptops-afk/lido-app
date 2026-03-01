/**
 * Admin - Users Management Page
 */

import { useEffect, useState } from 'react';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';

interface User {
  id: number;
  uuid: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    status: 'active',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      
      if (data.success) {
        setUsers(data.data.users || []);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenDialog(user?: User) {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        status: 'active',
      });
    }
    setOpenDialog(true);
  }

  function handleCloseDialog() {
    setOpenDialog(false);
    setEditingUser(null);
  }

  async function handleSave() {
    try {
      const url = editingUser
        ? `/api/admin/users?id=${editingUser.id}`
        : '/api/admin/users';
      
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        handleCloseDialog();
        fetchUsers();
      } else {
        alert('Failed to save user: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save user');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Users">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Users">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize.xl, mb: 0.5 }}>Users Management</Typography>
          <Typography sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight }}>Manage system users and permissions</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: adminTheme.colors.primary,
            textTransform: 'none',
            fontSize: adminTheme.typography.fontSize.sm,
            fontWeight: adminTheme.typography.fontWeight.medium,
            px: 3,
            py: 1,
            boxShadow: '0 2px 6px 0 rgba(105, 108, 255, 0.4)',
            '&:hover': { bgcolor: adminTheme.colors.primaryHover, boxShadow: '0 4px 8px 0 rgba(105, 108, 255, 0.5)' },
          }}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${adminTheme.colors.borderLight}`, borderRadius: adminTheme.spacing.borderRadius, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: adminTheme.colors.bgHeader }}>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>ID</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Email</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Name</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Status</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Created</TableCell>
              <TableCell align="right" sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.semibold, color: adminTheme.colors.textMedium, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} sx={{ bgcolor: adminTheme.colors.bgRow, '&:hover': { bgcolor: adminTheme.colors.bgHover }, '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>{user.id}</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>{user.email}</TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                  {user.first_name || user.last_name
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : '—'}
                </TableCell>
                <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                  <Chip
                    label={user.status}
                    color={getStatusColor(user.status) as any}
                    size="small"
                    sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 22, fontWeight: adminTheme.typography.fontWeight.medium }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight, padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right" sx={{ padding: adminTheme.spacing.tableCellPadding, borderBottom: `1px solid ${adminTheme.colors.borderLight}` }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                    sx={{ color: adminTheme.colors.textMedium, padding: '6px', '&:hover': { color: adminTheme.colors.primary, bgcolor: adminTheme.colors.primaryLight } }}
                  >
                    <EditIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(user.id)}
                    sx={{ color: adminTheme.colors.textMedium, padding: '6px', ml: 0.5, '&:hover': { color: adminTheme.colors.error, bgcolor: 'rgba(255, 76, 81, 0.08)' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow sx={{ bgcolor: adminTheme.colors.bgRow }}>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: adminTheme.colors.textLight, fontSize: adminTheme.typography.fontSize.sm, padding: adminTheme.spacing.tableCellPadding, borderBottom: 0 }}>
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: adminTheme.spacing.borderRadius, bgcolor: adminTheme.colors.bgRow } }}>
        <DialogTitle sx={{ fontWeight: adminTheme.typography.fontWeight.medium, fontSize: adminTheme.typography.fontSize.lg, color: adminTheme.colors.textDark, bgcolor: adminTheme.colors.bgHeader, borderBottom: `1px solid ${adminTheme.colors.border}` }}>
          {editingUser ? 'Edit User' : 'Add User'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: adminTheme.colors.bgRow }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: adminTheme.spacing.contentGap, mt: adminTheme.spacing.contentGap }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              size="small"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
              InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }}
              InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
            />
            <TextField
              label="First Name"
              fullWidth
              size="small"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
              InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }}
              InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
            />
            <TextField
              label="Last Name"
              fullWidth
              size="small"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
              InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }}
              InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
            />
            <TextField
              label="Status"
              select
              fullWidth
              size="small"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
              InputProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark } }}
              InputLabelProps={{ sx: { fontSize: adminTheme.typography.fontSize.sm } }}
            >
              <MenuItem value="active" sx={{ fontSize: adminTheme.typography.fontSize.sm }}>Active</MenuItem>
              <MenuItem value="inactive" sx={{ fontSize: adminTheme.typography.fontSize.sm }}>Inactive</MenuItem>
              <MenuItem value="suspended" sx={{ fontSize: adminTheme.typography.fontSize.sm }}>Suspended</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: adminTheme.spacing.cardPadding, pb: adminTheme.spacing.contentGap, bgcolor: adminTheme.colors.bgRow, borderTop: `1px solid ${adminTheme.colors.border}` }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, bgcolor: adminTheme.colors.primary, '&:hover': { bgcolor: adminTheme.colors.primaryHover } }}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
