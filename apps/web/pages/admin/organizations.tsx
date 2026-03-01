/**
 * Admin - Organizations Management Page
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
  CircularProgress,
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  member_count?: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Module-level presigned URL cache (survives re-renders and client navigation)
// TTL: 1 hour — aligned with backend cache
// ---------------------------------------------------------------------------
const _logoCache = new Map<string, { url: string; expiresAt: number }>();
const LOGO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function resolveLogoUrl(bucket: string, key: string): Promise<string | null> {
  const cacheKey = `${bucket}:${key}`;
  const cached = _logoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  try {
    const res = await fetch('/api/admin/storage/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, key }),
    });
    const data = await res.json();
    if (data.success && data.data?.url) {
      _logoCache.set(cacheKey, { url: data.data.url, expiresAt: Date.now() + LOGO_CACHE_TTL });
      return data.data.url;
    }
  } catch {}
  return null;
}

function bustLogoCache(bucket: string, key: string) {
  _logoCache.delete(`${bucket}:${key}`);
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [orgLogoUrls, setOrgLogoUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/organizations');
      const data = await res.json();
      
      if (data.success) {
        const orgList: Organization[] = data.data || [];
        setOrgs(orgList);
        fetchOrgLogoUrls(orgList);
      } else {
        setError('Failed to fetch organizations');
      }
    } catch (err) {
      setError('Failed to fetch organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrgLogoUrls(orgList: Organization[]) {
    const orgsWithLogo = orgList.filter((o) => o.logo_url);
    if (orgsWithLogo.length === 0) {
      setOrgLogoUrls({});
      return;
    }
    const results = await Promise.all(
      orgsWithLogo.map(async (org) => {
        const url = await resolveLogoUrl('lido-assets', org.logo_url!);
        return url ? { id: org.id, url } : null;
      })
    );
    const urlMap: Record<number, string> = {};
    results.forEach((r) => { if (r) urlMap[r.id] = r.url; });
    setOrgLogoUrls(urlMap);
  }

  async function handleOpenDialog(org?: Organization) {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        slug: org.slug,
      });
      // Load existing logo presigned URL if available (served from cache when fresh)
      if (org.logo_url) {
        resolveLogoUrl('lido-assets', org.logo_url)
          .then((url) => { if (url) setLogoUrl(url); })
          .catch((err) => console.error('Failed to load logo:', err));
      } else {
        setLogoUrl(null);
      }
    } else {
      setEditingOrg(null);
      setFormData({
        name: '',
        slug: '',
      });
      setLogoUrl(null);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setOpenDialog(true);
  }

  function handleCloseDialog() {
    setOpenDialog(false);
    setEditingOrg(null);
  }

  async function handleSave() {
    try {
      const url = editingOrg
        ? `/api/admin/organizations?id=${editingOrg.id}`
        : '/api/admin/organizations';
      
      const method = editingOrg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        const orgId = editingOrg ? editingOrg.id : data.data?.id;
        
        // Upload logo if a new file was selected
        if (logoFile && orgId) {
          await handleLogoUpload(orgId);
        }
        
        handleCloseDialog();
        fetchOrgs();
      } else {
        alert('Failed to save organization: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save organization');
    }
  }

  async function handleLogoUpload(orgId: number) {
    if (!logoFile) return;

    try {
      setUploadingLogo(true);

      // Step 1: upload via common storage endpoint
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('bucket', 'lido-assets');
      formData.append('path', `organizations/${orgId}`);
      formData.append('tags', JSON.stringify({ type: 'org-logo', orgId: String(orgId) }));

      const uploadRes = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        alert('Failed to upload logo: ' + (uploadData.error?.message || 'Unknown error'));
        return;
      }

      // Step 2: save the MinIO key to the organization record
      const updateRes = await fetch(`/api/admin/organizations?id=${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: uploadData.data.key }),
      });
      const updateData = await updateRes.json();

      if (updateData.success) {
        // Use presigned URL returned from upload for immediate preview
        setLogoUrl(uploadData.data.url);
        setLogoPreview(null);
      } else {
        alert('Logo uploaded but failed to save reference: ' + (updateData.error || ''));
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }

      setLogoFile(file);
      // Clear any existing remote logo URL so local preview is shown first
      setLogoUrl(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleDeleteLogo() {
    if (!editingOrg || !editingOrg.logo_url) return;
    if (!confirm('Are you sure you want to delete this logo?')) return;

    try {
      // Step 1: delete the file from MinIO via common delete endpoint
      const deleteRes = await fetch('/api/admin/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'lido-assets', key: editingOrg.logo_url }),
      });
      const deleteData = await deleteRes.json();
      if (!deleteData.success) {
        console.warn('MinIO delete failed (continuing):', deleteData.error);
      }

      // Step 2: clear logo_url on the organization record
      const updateRes = await fetch(`/api/admin/organizations?id=${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: null }),
      });
      const updateData = await updateRes.json();

      if (updateData.success) {
        if (editingOrg?.logo_url) bustLogoCache('lido-assets', editingOrg.logo_url);
        setLogoUrl(null);
        setLogoPreview(null);
        setLogoFile(null);
        setEditingOrg((prev) => prev ? { ...prev, logo_url: null } : null);
        setOrgLogoUrls((prev) => {
          const updated = { ...prev };
          if (editingOrg?.id) delete updated[editingOrg.id];
          return updated;
        });
      } else {
        alert('Failed to clear logo reference');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete logo');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
      const res = await fetch(`/api/admin/organizations?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchOrgs();
      } else {
        alert('Failed to delete organization');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete organization');
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Organizations">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Organizations">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textDark, fontSize: adminTheme.typography.fontSize.xl }}>Organizations Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: adminTheme.colors.primary,
            textTransform: 'none',
            fontSize: adminTheme.typography.fontSize.sm,
            fontWeight: adminTheme.typography.fontWeight.normal,
            '&:hover': { bgcolor: adminTheme.colors.primaryHover },
          }}
        >
          Add Organization
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${adminTheme.colors.border}`, borderRadius: adminTheme.spacing.borderRadius }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: adminTheme.colors.bgHeader }}>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>ID</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Logo</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Name</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Slug</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Members</TableCell>
              <TableCell sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Created</TableCell>
              <TableCell align="right" sx={{ fontSize: adminTheme.typography.fontSize.xs, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textLight, textTransform: 'uppercase', padding: adminTheme.spacing.tableCellPadding }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org.id} sx={{ bgcolor: adminTheme.colors.bgRow, '&:hover': { bgcolor: adminTheme.colors.bgHover } }}>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark, padding: adminTheme.spacing.tableCellPadding }}>{org.id}</TableCell>
                <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                  <Avatar
                    src={org.logo_url ? orgLogoUrls[org.id] : undefined}
                    sx={{ width: 32, height: 32, bgcolor: org.logo_url ? 'transparent' : adminTheme.colors.primary }}
                  >
                    {!org.logo_url && <ImageIcon sx={{ fontSize: 18 }} />}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                  <Typography variant="body2" sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textDark }}>
                    {org.name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                  <Chip label={org.slug} size="small" variant="outlined" sx={{ fontSize: adminTheme.typography.fontSize.xs, height: 20 }} />
                </TableCell>
                <TableCell sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PeopleIcon sx={{ fontSize: 16, color: adminTheme.colors.textLight }} />
                    <Typography sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textDark }}>{org.member_count || 0}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight, padding: adminTheme.spacing.tableCellPadding }}>
                  {new Date(org.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right" sx={{ padding: adminTheme.spacing.tableCellPadding }}>
                  <IconButton
                    size="small"
                    onClick={() => router.push(`/admin/members?orgId=${org.id}`)}
                    sx={{ color: adminTheme.colors.secondary, padding: '4px' }}
                    title="View Members"
                  >
                    <PeopleIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(org)}
                    sx={{ color: adminTheme.colors.primary, padding: '4px' }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(org.id)}
                    sx={{ color: adminTheme.colors.error, padding: '4px' }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {orgs.length === 0 && (
              <TableRow sx={{ bgcolor: adminTheme.colors.bgRow }}>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: adminTheme.colors.textLight, fontSize: adminTheme.typography.fontSize.sm, padding: adminTheme.spacing.tableCellPadding }}>
                  No organizations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: adminTheme.spacing.borderRadius, bgcolor: adminTheme.colors.bgRow } }}>
        <DialogTitle sx={{ fontWeight: adminTheme.typography.fontWeight.medium, fontSize: adminTheme.typography.fontSize.lg, color: adminTheme.colors.textDark, bgcolor: adminTheme.colors.bgHeader, borderBottom: `1px solid ${adminTheme.colors.border}` }}>
          {editingOrg ? 'Edit Organization' : 'Add Organization'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: adminTheme.colors.bgRow }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: adminTheme.spacing.contentGap, mt: adminTheme.spacing.contentGap }}>
            <TextField
              label="Organization Name"
              fullWidth
              required
              size="small"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
            />
            <TextField
              label="Slug"
              fullWidth
              required
              size="small"
              helperText="Lowercase, alphanumeric with hyphens (e.g., my-org)"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#ffffff', '& fieldset': { borderColor: adminTheme.colors.border } } }}
         
            />
            
            {/* Logo Upload */}
            <Box>
              <Typography sx={{ fontSize: adminTheme.typography.fontSize.sm, fontWeight: adminTheme.typography.fontWeight.medium, color: adminTheme.colors.textDark, mb: 1 }}>
                Organization Logo
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={logoPreview || logoUrl || undefined}
                  sx={{ width: 64, height: 64, bgcolor: adminTheme.colors.primary }}
                >
                  {!logoPreview && !logoUrl && <ImageIcon sx={{ fontSize: 32 }} />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="logo-upload-input"
                    type="file"
                    onChange={handleLogoFileChange}
                  />
                  <label htmlFor="logo-upload-input">
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      startIcon={<UploadIcon />}
                      disabled={uploadingLogo}
                      sx={{
                        textTransform: 'none',
                        fontSize: adminTheme.typography.fontSize.sm,
                        borderColor: adminTheme.colors.border,
                        color: adminTheme.colors.textDark,
                        '&:hover': { borderColor: adminTheme.colors.primary }
                      }}
                    >
                      {uploadingLogo ? 'Uploading...' : 'Choose Image'}
                    </Button>
                  </label>
                  {(logoUrl || logoPreview) && (
                    <Button
                      size="small"
                      onClick={handleDeleteLogo}
                      disabled={!editingOrg || uploadingLogo}
                      sx={{
                        ml: 1,
                        textTransform: 'none',
                        fontSize: adminTheme.typography.fontSize.sm,
                        color: adminTheme.colors.error
                      }}
                    >
                      Remove
                    </Button>
                  )}
                  <Typography sx={{ fontSize: adminTheme.typography.fontSize.xs, color: adminTheme.colors.textLight, mt: 0.5 }}>
                    Max 10MB. JPG, PNG, GIF, SVG
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: adminTheme.spacing.cardPadding, pb: adminTheme.spacing.contentGap, bgcolor: adminTheme.colors.bgRow, borderTop: `1px solid ${adminTheme.colors.border}` }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, color: adminTheme.colors.textLight }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none', fontSize: adminTheme.typography.fontSize.sm, bgcolor: adminTheme.colors.primary, '&:hover': { bgcolor: adminTheme.colors.primaryHover } }}>
            {editingOrg ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
