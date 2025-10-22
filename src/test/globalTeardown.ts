export default async () => {
  console.log('🧹 Global teardown: cleaning up resources...');
  
  const server = (globalThis as any).__SERVER__;
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('✅ Test server closed');
        resolve();
      });
    });
  }
  
  console.log('✅ Global teardown completed');
};
