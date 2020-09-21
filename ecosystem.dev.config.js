module.exports = {
  apps: [
    {
      name: "template-name",
      script: "npm",
      args: "run dev",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "development",
      },
      kill_timeout: 10000,
    },
  ],
};
