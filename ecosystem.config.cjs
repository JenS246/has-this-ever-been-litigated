module.exports = {
  apps: [{
    name: 'has-this-ever-been-litigated-api',
    cwd: '/config/projects/has-this-ever-been-litigated',
    script: 'node',
    args: '--env-file=.env backend/server.mjs',
    interpreter: 'none',
    max_memory_restart: '150M',
    time: true,
  }],
};
