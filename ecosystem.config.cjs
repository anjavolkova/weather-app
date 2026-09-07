// pm2 process config — keeps the server running in the background, restarts
// it if it crashes, and (with `pm2 startup` + `pm2 save`) brings it back up
// automatically after a reboot. See README.md "Run it continuously".
module.exports = {
  apps: [
    {
      name: "symptom-weather-tracker",
      script: "server.js",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env: {
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};
