import { createApp } from './app.js';
import { connectMongo, closeMongo } from './src/config/mongodb.config.js';

const port = process.env.PORT;

try {
  console.log('Connecting to MongoDB...');
  await connectMongo();
  console.log('MongoDB connected successfully');

  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');

    server.close(async () => {
      try {
        await closeMongo();
        console.log('Mongo connection closed');
      } catch (error) {
        console.error('Error closing MongoDB:', error);
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
}
