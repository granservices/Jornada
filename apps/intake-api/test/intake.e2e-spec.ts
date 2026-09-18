import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { raw } from 'express';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Intake API (e2e)', () => {
  let app: INestApplication<App> | null;
  const token = '12345678901234567890123456789012';
  const tempDir = path.dirname(process.env.INTAKE_SQLITE_PATH!);

  beforeEach(async () => {
    await rm(tempDir, { recursive: true, force: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(raw({ type: '*/*', limit: '5mb' }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    app = null;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('receives, classifies and previews qualification events', async () => {
    const dueDate = futureDate(10);

    await request(app!.getHttpServer())
      .post('/api/intake/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({
        source: 'blip-preview',
        eventType: 'qualification_pending',
        messageParams: {
          '1': 'Pessoa Teste',
          pendencias: 'treinamento',
          dataVencAso: dueDate,
          listaTreinamentos: 'Treinamento de Compliance',
        },
      })
      .expect(202)
      .expect(({ body }) => {
        expect(body.ok).toBe(true);
        expect(body.eventType).toBe('qualification_pending');
        expect(body.status).toBe('stored');
      });

    await request(app!.getHttpServer())
      .get('/api/intake/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.summary.qualification_pending.stored).toBe(1);
      });

    await request(app!.getHttpServer())
      .get('/api/intake/qualification-preview?days=15')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.events).toHaveLength(1);
        expect(body.events[0].eligibleWithin15Days).toBe(true);
      });
  });

  it('rejects requests without bearer token', async () => {
    await request(app!.getHttpServer())
      .post('/api/intake/events')
      .set('Content-Type', 'application/json')
      .send({ eventType: 'logistics_schedule' })
      .expect(401);
  });

  it('accepts legacy Drake routes into the diagnostic intake store', async () => {
    await request(app!.getHttpServer())
      .post('/api/integrations/drake/boarding-schedule')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({
        dataProgramacao: futureDate(3),
        tipo: 'embarque',
      })
      .expect(202)
      .expect(({ body }) => {
        expect(body.ok).toBe(true);
        expect(body.eventType).toBe('logistics_schedule');
        expect(body.status).toBe('stored');
      });
  });

  it('stores repeated payloads as duplicate attempts instead of failing', async () => {
    const payload = {
      source: 'repeat-probe',
      eventType: 'qualification_pending',
      messageParams: {
        pendencias: 'treinamento',
      },
    };

    const first = await request(app!.getHttpServer())
      .post('/api/intake/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(202);

    await request(app!.getHttpServer())
      .post('/api/intake/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(202)
      .expect(({ body }) => {
        expect(body.status).toBe('duplicate');
        expect(body.duplicateOf).toBe(first.body.id);
      });
  });
});

function futureDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
