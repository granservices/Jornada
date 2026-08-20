import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3004';
    process.env.DATABASE_URL =
      'postgresql://jornada:jornada@localhost:5432/jornada?schema=public';
    process.env.DRAKE_WEBHOOK_BEARER_TOKEN = '12345678901234567890123456789012';
    process.env.JWT_ACCESS_SECRET = '1234567890123456789012345678901234567890';
    process.env.JWT_REFRESH_SECRET = '0987654321098765432109876543210987654321';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        user: {},
        authSession: {},
        passwordResetToken: {},
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
