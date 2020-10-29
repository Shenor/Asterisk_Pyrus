module.exports = {
  apps : [{
    name: 'Pyrus API',
    script: 'index.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    instances: 1,
    autorestart: true,
    watch: false,
    log_file: 'logs/general.log',
    log_date_format: 'YYYY-MM-DD HH:mm',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
