const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Use date in log filename (e.g., error-2025-06-13.log)
const getLogFile = () => {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(logDir, `error-${date}.log`);
};

const logger = createLogger({
  level: 'error',
  format: format.combine(
    format.timestamp(),
    format.simple()
  ),
  transports: [
    new transports.File({ filename: getLogFile(), level: 'error' })
  ]
});

function logError(error) {
  // Update transport to use today's file
  logger.clear();
  logger.add(new transports.File({ filename: getLogFile(), level: 'error' }));
  logger.error(error instanceof Error ? error.stack || error.message : error);
}

module.exports = { logError };