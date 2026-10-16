import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { raw } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
  });
  app.use(
    '/api/integrations/sispat/employees-csv',
    raw({
      type: (request) => {
        const contentTypeHeader = request.headers['content-type'];
        const contentType = Array.isArray(contentTypeHeader)
          ? contentTypeHeader[0] ?? ''
          : contentTypeHeader ?? '';

        return !contentType.toLowerCase().startsWith('multipart/form-data');
      },
      limit: '15mb',
    }),
  );
  app.useLogger(app.get(Logger));
  const redisIoAdapter = new RedisIoAdapter(app);
  try {
    await redisIoAdapter.connectToRedis();
  } catch (error) {
    app
      .get(Logger)
      .warn(
        { err: error },
        'Redis indisponivel; realtime local iniciado sem adapter distribuido.',
      );
  }
  app.useWebSocketAdapter(redisIoAdapter);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Jornada API')
    .setDescription(
      'Backend do Jornada para auth, integracoes e fluxos operacionais.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3004);
}
void bootstrap();
