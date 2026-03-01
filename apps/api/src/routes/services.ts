import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { successResponse } from '../lib/response';

export const servicesRouter = Router();

/**
 * @openapi
 * /services/list:
 *   get:
 *     tags:
 *       - Services
 *     summary: List available services
 *     description: Get all available service integrations and their connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available services
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
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
 * @openapi
 * /services/{id}/disconnect:
 *   delete:
 *     tags:
 *       - Services
 *     summary: Disconnect a service
 *     description: Disconnect and revoke access for a service integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *         example: "dropbox"
 *     responses:
 *       200:
 *         description: Service disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceId:
 *                           type: string
 *                           example: "dropbox"
 *                         disconnectedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
servicesRouter.delete('/:id/disconnect', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: revoke token via integration adapter, soft-delete record
  res.json(successResponse({ serviceId: id, disconnectedAt: new Date().toISOString() }));
});
