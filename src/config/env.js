const ENV = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigins: process.env.CORS_ORIGINS || '*'
};

module.exports = ENV;
