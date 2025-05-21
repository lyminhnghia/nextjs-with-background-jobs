/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';

const levelLabels: { [id: number]: string } = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL'
};

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: null,
  timestamp: () => `,"ts":${Date.now() / 1000.0}`,
  formatters: {
    level(label: string, number: number) {
      return { level: levelLabels[number] || label };
    },
    log: (obj: any) => {
      const serializedObj: any = {};
      for (const key in obj) {
        if (obj[key] instanceof Error) {
          serializedObj[key] = pino.stdSerializers.err(obj[key]);
        } else {
          serializedObj[key] = obj[key];
        }
      }
      return serializedObj;
    }
  }
});

export const getLogger = (context: string, contextData: object = {}) =>
  logger.child({ context, ...contextData });
