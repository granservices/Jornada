import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.getOrThrow<string>('LOG_LEVEL'),
          transport:
            configService.get<string>('NODE_ENV') === 'development'
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
          genReqId: (req, res) => {
            const headerValue = req.headers['x-request-id'];
            const requestId =
              typeof headerValue === 'string' && headerValue.trim().length > 0
                ? headerValue
                : randomUUID();

            res.setHeader('X-Request-Id', requestId);
            return requestId;
          },
          customProps: (req) => ({
            requestId:
              typeof req.id === 'string' ? req.id : req.headers['x-request-id'],
          }),
          customSuccessMessage: (req, res) =>
            `${req.method} ${req.url} completed with ${res.statusCode}`,
          customErrorMessage: (req, res) =>
            `${req.method} ${req.url} failed with ${res.statusCode}`,
          customLogLevel: (_req, res, err) => {
            if (err || res.statusCode >= 500) {
              return 'error';
            }

            if (res.statusCode >= 400) {
              return 'warn';
            }

            return 'info';
          },
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.token',
            'req.body.accessToken',
          ],
        },
      }),
    }),
  ],
})
export class AppLoggingModule {}
