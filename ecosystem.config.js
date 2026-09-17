module.exports = {
  apps: [
    {
      name: 'kyvex-bot',
      script: 'src/index.js',
      cwd: __dirname,
      node_args: '--max-old-space-size=2048',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
