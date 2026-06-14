module.exports = {
  apps: [{
    name: "mail-platform",
    script: "pnpm",
    args: "dev",
    cwd: __dirname,
    env: {
      NODE_ENV: "development",
    },
  }],
};
