import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();
  const server = app.getHttpServer();
  const router = server._events.request._router;
  const availableRoutes = router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      route: {
        path: layer.route?.path,
        method: layer.route?.stack[0].method,
      },
    }));
  console.log(JSON.stringify(availableRoutes, null, 2));
  process.exit(0);
}
bootstrap();
