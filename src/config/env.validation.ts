import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  APP_URL: Joi.string().uri().required(),
  API_URL: Joi.string().uri().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3333),
  MAPBOX_TOKEN: Joi.string().allow('').optional(),
  TRACKING_TOKEN_EXPIRES_IN_MINUTES: Joi.number().default(180),
  GEOFENCE_RADIUS_METERS: Joi.number().default(100),
  STORAGE_TYPE: Joi.string().valid('local', 's3').default('local'),
  STORAGE_LOCAL_PATH: Joi.string().default('./uploads'),
});
