import React, { useState } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  FormControlLabel, Switch, Button, Paper,
} from '@mui/material';
import type { FormComponent, AppActionContext } from './types';

export default function FormPanel({
  component,
  onAction,
}: { component: FormComponent } & AppActionContext) {
  const { title, intent, fields = [], submitLabel = 'Submit', cancelIntent } = component;

  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    fields?.forEach((f) => { init[f.name] = f.value ?? (f.type === 'switch' ? false : ''); });
    return init;
  });

  const set = (name: string, value: any) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAction(intent, values);
  };

  return (
    <Paper
      elevation={0}
      component="form"
      onSubmit={handleSubmit}
      sx={{ border: '1px solid #e7e7ff', borderRadius: 2, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {title && (
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#566a7f', mb: 0.5 }}>
          {title}
        </Typography>
      )}

      {(fields ?? []).map((field) => {
        if (field.type === 'switch') {
          return (
            <FormControlLabel
              key={field.name}
              control={
                <Switch
                  checked={!!values[field.name]}
                  onChange={(e) => set(field.name, e.target.checked)}
                  disabled={field.disabled}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#696cff' } }}
                />
              }
              label={<Typography variant="body2">{field.label}</Typography>}
            />
          );
        }

        if (field.type === 'select' || field.type === 'multiselect') {
          return (
            <FormControl key={field.name} size="small" required={field.required} disabled={field.disabled}>
              <InputLabel>{field.label}</InputLabel>
              <Select
                label={field.label}
                multiple={field.type === 'multiselect'}
                value={values[field.name] ?? (field.type === 'multiselect' ? [] : '')}
                onChange={(e) => set(field.name, e.target.value)}
              >
                {(field.options ?? []).map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        if (field.type === 'textarea') {
          return (
            <TextField
              key={field.name}
              label={field.label}
              multiline
              rows={3}
              size="small"
              required={field.required}
              disabled={field.disabled}
              placeholder={field.placeholder}
              value={values[field.name] ?? ''}
              onChange={(e) => set(field.name, e.target.value)}
              sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#696cff' } }}
            />
          );
        }

        return (
          <TextField
            key={field.name}
            label={field.label}
            type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            size="small"
            required={field.required}
            disabled={field.disabled}
            placeholder={field.placeholder}
            value={values[field.name] ?? ''}
            onChange={(e) => set(field.name, e.target.value)}
            inputProps={field.validation ? {
              min     : field.validation.min,
              max     : field.validation.max,
              minLength: field.validation.minLength,
              maxLength: field.validation.maxLength,
            } : undefined}
            sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#696cff' } }}
          />
        );
      })}

      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
        <Button
          type="submit"
          variant="contained"
          sx={{ bgcolor: '#696cff', '&:hover': { bgcolor: '#5a5fd4' }, textTransform: 'none', fontWeight: 600 }}
        >
          {submitLabel}
        </Button>
        {cancelIntent && (
          <Button
            variant="outlined"
            onClick={() => onAction(cancelIntent)}
            sx={{ borderColor: '#e7e7ff', color: '#566a7f', textTransform: 'none',
                  '&:hover': { borderColor: '#696cff', color: '#696cff' } }}
          >
            Cancel
          </Button>
        )}
      </Box>
    </Paper>
  );
}

