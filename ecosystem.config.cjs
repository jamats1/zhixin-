module.exports = {
  apps: [
    {
      name: "zhixin",
      script: "npm",
      args: "run start",
      cwd: "/root/var/www/nextjs/zhixin",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3003,
        ...process.env,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 5000,
      restart_delay: 4000,
    },
  ],
};
