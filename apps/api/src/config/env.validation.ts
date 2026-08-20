import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3004),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  DRAKE_WEBHOOK_BEARER_TOKEN: Joi.string().min(32).required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  JWT_ISSUER: Joi.string().default('jornada-api'),
  JWT_AUDIENCE: Joi.string().default('jornada-app'),
  PASSWORD_RESET_EXPIRES_IN_MINUTES: Joi.number()
    .integer()
    .positive()
    .default(30),
  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(120),
  AUTH_THROTTLE_TTL_MS: Joi.number().integer().positive().default(900000),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().positive().default(5),
  WEBHOOK_STORAGE_DIR: Joi.string().default('./data/webhooks'),
  DRAKE_WEBHOOK_QUEUE_ENABLED: Joi.boolean().default(true),
  DRAKE_WEBHOOK_QUEUE_ATTEMPTS: Joi.number().integer().positive().default(5),
  DRAKE_WEBHOOK_QUEUE_BACKOFF_MS: Joi.number()
    .integer()
    .positive()
    .default(5000),
});
