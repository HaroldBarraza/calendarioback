import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ─── helmet: import dinámico (evita TS2349 en Vercel) ───
  const helmetModule = await import('helmet');
  const helmetFn = helmetModule.default;
  // ────────────────────────────────────────────────────────

  app.use(helmetFn());
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: configService.get<string[]>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Planificación 2027')
    .setDescription('API para la gestión de actividades del año 2027')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y sesiones')
    .addTag('users', 'Gestión de usuarios')
    .addTag('health', 'Estado del servicio')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  const port = configService.get<number>('port') ?? 3001;
  await app.listen(port);
  Logger.log(`API escuchando en http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger UI en http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();