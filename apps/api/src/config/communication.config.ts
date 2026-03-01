/**
 * Communication Configuration
 * 
 * Centralized configuration for Lido Connect - NLP, WebRTC, and agent routing
 */

import { z } from 'zod';

const CommunicationConfigSchema = z.object({
  nlp: z.object({
    adapter: z.enum(['rasa']).default('rasa'),
    rasaUrl: z.string().url(),
    rasaToken: z.string().optional(),
    timeout: z.number().default(10000), // 10 seconds
    retryAttempts: z.number().default(2),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
  }),
  webrtc: z.object({
    stunServers: z.array(z.string()).default(['stun:stun.l.google.com:19302']),
    turnServers: z.array(z.object({
      urls: z.string(),
      username: z.string().optional(),
      credential: z.string().optional(),
    })).default([]),
    recordingEnabled: z.boolean().default(true),
  }),
  agent: z.object({
    routingStrategy: z.enum(['round-robin', 'skill-based', 'load-balanced']).default('load-balanced'),
    queueTimeout: z.number().default(300), // 5 minutes
    maxQueueSize: z.number().default(100),
  }),
  limits: z.object({
    maxMessageLength: z.number().default(10000),
    maxAttachmentSize: z.number().default(50 * 1024 * 1024), // 50 MB
    maxCallDuration: z.number().default(3600), // 1 hour
    maxSuggestions: z.number().default(3),
  }),
});

export type CommunicationConfig = z.infer<typeof CommunicationConfigSchema>;

export const communicationConfig: CommunicationConfig = CommunicationConfigSchema.parse({
  nlp: {
    adapter: process.env.NLP_ADAPTER || 'rasa',
    rasaUrl: process.env.RASA_URL || 'http://localhost:5005',
    rasaToken: process.env.RASA_TOKEN,
    timeout: process.env.NLP_TIMEOUT ? parseInt(process.env.NLP_TIMEOUT) : 10000,
    retryAttempts: process.env.NLP_RETRY_ATTEMPTS ? parseInt(process.env.NLP_RETRY_ATTEMPTS) : 2,
    confidenceThreshold: process.env.NLP_CONFIDENCE_THRESHOLD ? parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD) : 0.7,
  },
  webrtc: {
    stunServers: process.env.STUN_SERVERS?.split(',') || ['stun:stun.l.google.com:19302'],
    turnServers: process.env.TURN_SERVERS ? JSON.parse(process.env.TURN_SERVERS) : [],
    recordingEnabled: process.env.RECORDING_ENABLED === 'true',
  },
  agent: {
    routingStrategy: (process.env.AGENT_ROUTING_STRATEGY as any) || 'load-balanced',
    queueTimeout: process.env.AGENT_QUEUE_TIMEOUT ? parseInt(process.env.AGENT_QUEUE_TIMEOUT) : 300,
    maxQueueSize: process.env.AGENT_MAX_QUEUE_SIZE ? parseInt(process.env.AGENT_MAX_QUEUE_SIZE) : 100,
  },
  limits: {
    maxMessageLength: process.env.MAX_MESSAGE_LENGTH ? parseInt(process.env.MAX_MESSAGE_LENGTH) : 10000,
    maxAttachmentSize: process.env.MAX_ATTACHMENT_SIZE ? parseInt(process.env.MAX_ATTACHMENT_SIZE) : 50 * 1024 * 1024,
    maxCallDuration: process.env.MAX_CALL_DURATION ? parseInt(process.env.MAX_CALL_DURATION) : 3600,
    maxSuggestions: process.env.MAX_SUGGESTIONS ? parseInt(process.env.MAX_SUGGESTIONS) : 3,
  },
});
