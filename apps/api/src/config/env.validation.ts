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
  DRAKE_WEBHOOK_AUTH_DISABLED: Joi.boolean().default(false),
  DRAKE_API_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://drake.bz/api'),
  DRAKE_TENANT_ID: Joi.string().guid().optional(),
  DRAKE_AUTH_TOKEN: Joi.string().min(16).optional(),
  DRAKE_SCHEDULE_HTTP_TIMEOUT_MS: Joi.number()
    .integer()
    .positive()
    .max(30000)
    .default(8000),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('30m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  JWT_ISSUER: Joi.string().default('jornada-api'),
  JWT_AUDIENCE: Joi.string().default('jornada-app'),
  PASSWORD_RESET_EXPIRES_IN_MINUTES: Joi.number()
    .integer()
    .positive()
    .default(30),
  AUTH_PUBLIC_REGISTRATION_ENABLED: Joi.boolean().default(false),
  AUTH_SSO_TICKET_EXPIRES_IN_SECONDS: Joi.number()
    .integer()
    .min(30)
    .max(300)
    .default(60),
  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(120),
  AUTH_THROTTLE_TTL_MS: Joi.number().integer().positive().default(900000),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().positive().default(5),
  WEBHOOK_STORAGE_DIR: Joi.string().default('./data/webhooks'),
  SISPAT_IMPORT_STORAGE_DIR: Joi.string().default('./data/sispat-imports'),
  FORM_OPTION_SOURCE_ALLOWED_HOSTS: Joi.string().default(''),
  FORM_OPTION_SOURCE_HTTP_TIMEOUT_MS: Joi.number().integer().positive().default(5000),
  DRAKE_WEBHOOK_QUEUE_ENABLED: Joi.boolean().default(true),
  DRAKE_WEBHOOK_QUEUE_ATTEMPTS: Joi.number().integer().positive().default(5),
  DRAKE_WEBHOOK_QUEUE_BACKOFF_MS: Joi.number()
    .integer()
    .positive()
    .default(5000),
  DOMAIN_EVENT_QUEUE_ENABLED: Joi.boolean().default(true),
  DOMAIN_EVENT_QUEUE_ATTEMPTS: Joi.number().integer().positive().default(5),
  DOMAIN_EVENT_QUEUE_BACKOFF_MS: Joi.number().integer().positive().default(5000),
  DOMAIN_EVENT_RELAY_INTERVAL_MS: Joi.number().integer().positive().default(10000),
  DOMAIN_EVENT_PROCESSING_TIMEOUT_MS: Joi.number().integer().positive().default(300000),
  ADMIN_BOOTSTRAP_ENABLED: Joi.boolean().default(false),
  ADMIN_BOOTSTRAP_EMAIL: Joi.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: Joi.string().min(12).optional(),
  ADMIN_BOOTSTRAP_FULL_NAME: Joi.string().default('Administrador Jornada'),
});
