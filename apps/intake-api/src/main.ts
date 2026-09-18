import { NestFactory } from '@nestjs/core';
import { raw } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'x-event-type', 'x-source'],
  });

  app.use(
    raw({
      type: '*/*',
      limit: '50mb',
    }),
  );

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3014);
}

void bootstrap();
