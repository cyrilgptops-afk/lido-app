import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  
  // MinIO Storage
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.string().default('false'),
  MINIO_ROOT_USER: z.string().default('lido-admin'),
  MINIO_ROOT_PASSWORD: z.string().default('lido-secure-password-123'),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_BUCKET_BOTS: z.string().default('lido-bots'),
  MINIO_BUCKET_UPLOADS: z.string().default('lido-uploads'),
  MINIO_BUCKET_ASSETS: z.string().default('lido-assets'),
  MINIO_BUCKET_CACHE: z.string().default('lido-cache'),
  
  // Lido Connect - NLP Configuration
  NLP_ADAPTER: z.string().default('rasa'),
  RASA_URL: z.string().url().default('http://localhost:5005'),
  RASA_TOKEN: z.string().optional(),
  NLP_TIMEOUT: z.coerce.number().default(10000),
  NLP_RETRY_ATTEMPTS: z.coerce.number().default(2),
  NLP_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.7),
  
  // Lido Connect - WebRTC Configuration
  STUN_SERVERS: z.string().default('stun:stun.l.google.com:19302'),
  TURN_SERVERS: z.string().default('[]'),
  RECORDING_ENABLED: z.string().default('true'),
  
  // Lido Connect - Agent Configuration
  AGENT_ROUTING_STRATEGY: z.string().default('load-balanced'),
  AGENT_QUEUE_TIMEOUT: z.coerce.number().default(300),
  AGENT_MAX_QUEUE_SIZE: z.coerce.number().default(100),
  
  // Lido Connect - Limits
  MAX_MESSAGE_LENGTH: z.coerce.number().default(10000),
  MAX_ATTACHMENT_SIZE: z.coerce.number().default(52428800),
  MAX_CALL_DURATION: z.coerce.number().default(3600),
  MAX_SUGGESTIONS: z.coerce.number().default(3),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
