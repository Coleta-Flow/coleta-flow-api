import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ColetaFlow API')
    .setDescription(
      `Single-tenant platform for managing donation requests, collections, reverse logistics,
      route tracking, material weighing and declaration generation.

      ## Authentication
      Most endpoints require a Bearer JWT token.
      Use \`POST /auth/login\` to obtain a token.

      ## Public endpoints
      - \`POST /public/donor-requests\` — create a request without login
      - \`GET /public/tracking/:token\` — real-time tracking for donors`,
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and session management')
    .addTag('Users', 'User management')
    .addTag('Drivers', 'Driver/collector management')
    .addTag('Donor Requests', 'Collection request lifecycle management')
    .addTag('Collection Points', 'Registered collection point management')
    .addTag('Routes', 'Route assignment and driver flow')
    .addTag('Tracking', 'Real-time driver location and tracking sessions')
    .addTag('Weights', 'Material weighing after collection')
    .addTag('Declarations', 'PDF declaration generation and download')
    .addTag('Reports', 'Dashboard metrics and operational reports')
    .addTag('Files', 'File upload and storage management')
    .addTag('Public', 'Public endpoints — no authentication required')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });
}
