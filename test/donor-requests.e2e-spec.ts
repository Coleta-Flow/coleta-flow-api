import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

describe('DonorRequests E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /public/donor-requests', () => {
    it('should create a donor request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/public/donor-requests')
        .set('x-tenant-id', 'test-tenant-id')
        .send({
          name: 'João Teste',
          whatsapp: '(85) 99999-0000',
          address: 'Rua das Flores, 123',
          city: 'Fortaleza',
          materialTypeId: '00000000-0000-0000-0000-000000000001',
          description: 'Caixas de papelão e garrafas PET para reciclagem',
          bestTimeForPickup: 'Tarde',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('trackingCode');
      expect(response.body.trackingCode).toMatch(/^CF-/);
    });

    it('should return 400 for invalid WhatsApp format', async () => {
      const response = await request(app.getHttpServer())
        .post('/public/donor-requests')
        .set('x-tenant-id', 'test-tenant-id')
        .send({
          name: 'João',
          whatsapp: '85999990000',
          address: 'Rua X',
          city: 'Fortaleza',
          materialTypeId: '00000000-0000-0000-0000-000000000001',
          description: 'Materiais para coleta',
          bestTimeForPickup: 'Manhã',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /donor-requests', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/donor-requests');
      expect(response.status).toBe(401);
    });
  });
});
