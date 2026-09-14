import { app } from './app.js';

const server = app.listen(5038, '127.0.0.1', (error?: Error) => {
  if (error) {
    console.error('No se pudo iniciar la API en el puerto 5038:', error.message);
    process.exit(1);
  }
  console.log('JAUC API: http://127.0.0.1:5038/api/health');
  console.log('Demo en memoria. Ctrl+C para detener.');
});

function shutdown(): void {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
