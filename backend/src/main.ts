import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. HTTP Security Headers (Anti XSS, Clickjacking)
  app.use(helmet());

  // 2. Rate Limiting (Anti Brute-Force & DDoS)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: 'Terlalu banyak request dari IP ini, silakan coba lagi setelah 15 menit',
    }),
  );

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
