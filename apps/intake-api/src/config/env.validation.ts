import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('production'),
  PORT: Joi.number().port().default(3014),
  INTAKE_BEARER_TOKEN: Joi.string().min(32).when('INTAKE_AUTH_DISABLED', {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  INTAKE_AUTH_DISABLED: Joi.boolean().default(false),
  INTAKE_STORAGE_DIR: Joi.string().default('./data/raw-events'),
  INTAKE_SQLITE_PATH: Joi.string().default('./data/intake.sqlite'),
});
