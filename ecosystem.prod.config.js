module.exports = {
  apps: [
    {
      name: "template-name",
      script: "./bin/www.js",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
      kill_timeout: 10000,
    },
  ],
};
