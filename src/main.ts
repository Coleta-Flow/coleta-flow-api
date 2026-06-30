import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());

  app.enableCors({
    origin: config.get('APP_URL'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  setupSwagger(app);

  const port = config.get<number>('PORT', 3333);
  await app.listen(port);

  console.log(`ColetaFlow API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
