import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

const server = app.listen(port, () => {
  console.info(`API listening at http://localhost:${port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.info(`${signal} received; closing the HTTP server`);

  server.close((error) => {
    if (error) {
      console.error('HTTP server could not close cleanly', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
