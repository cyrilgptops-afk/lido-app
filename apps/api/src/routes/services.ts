import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { successResponse } from '../lib/response';

export const servicesRouter = Router();

/**
 * GET /services/list
 * List all available service integrations.
 */
servicesRouter.get('/list', authenticate, async (_req: Request, res: Response) => {
  // TODO: fetch from DB or static registry
  const services = [
    { id: 'dropbox',        name: 'Dropbox',        connected: false },
    { id: 'google-drive',   name: 'Google Drive',   connected: false },
    { id: 'google-calendar',name: 'Google Calendar',connected: false },
    { id: 'zoho',           name: 'Zoho CRM',       connected: false },
  ];

  res.json(successResponse(services));
});

/**
 * DELETE /services/:id/disconnect
 * Disconnect a service integration for the authenticated user.
 */
servicesRouter.delete('/:id/disconnect', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: revoke token via integration adapter, soft-delete record
  res.json(successResponse({ serviceId: id, disconnectedAt: new Date().toISOString() }));
});
