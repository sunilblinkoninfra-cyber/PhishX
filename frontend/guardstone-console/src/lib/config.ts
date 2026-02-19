/**
 * Guardstone Console Environment Configuration
 * Centralized configuration management for the SOC application
 */

interface Config {
  // Application
  app: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
  };

  // API
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };

  // WebSocket
  websocket: {
    enabled: boolean;
    url: string;
    reconnect: boolean;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };

  // Authentication
  auth: {
    tokenRefreshInterval: number;
    sessionTimeoutMinutes: number;
    jwtSecret: string;
    jwtExpiration: string;
  };

  // Security
  security: {
    enableAuditLogging: boolean;
    enableEncryption: boolean;
    corsOrigins: string[];
    rateLimitRequests: number;
    rateLimitWindow: number;
  };

  // Features
  features: {
    workflows: boolean;
    automations: boolean;
    reporting: boolean;
    advancedAnalytics: boolean;
    customDashboards: boolean;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'both';
  };

  // Performance
  performance: {
    cacheEnabled: boolean;
    cacheTTL: number;
    metricsInterval: number;
    batchSize: number;
  };
}

// ===========================
// CONFIGURATION FACTORY
// ===========================

function getEnvironmentConfig(): Config {
  const env = process.env.NODE_ENV || 'development';
  const isDev = env === 'development';
  const isProd = env === 'production';

  const baseConfig: Config = {
    app: {
      name: 'Guardstone Console - PhishX SOC',
      version: '1.0.0',
      environment: env,
      debug: isDev,
    },

    api: {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || process.env.API_TIMEOUT || '30000'),
      retries: parseInt(process.env.API_RETRIES || '3'),
    },

    websocket: {
      enabled: process.env.WEBSOCKET_ENABLED !== 'false',
      url:
        process.env.NEXT_PUBLIC_WS_URL ||
        process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
        'ws://localhost:8000/ws',
      reconnect: true,
      reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '3000'),
      maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS || '5'),
    },

    auth: {
      tokenRefreshInterval: parseInt(process.env.TOKEN_REFRESH_INTERVAL || '900000'), // 15 minutes
      sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '1440'), // 24 hours
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    },

    security: {
      enableAuditLogging: process.env.AUDIT_LOGGING !== 'false',
      enableEncryption: process.env.ENABLE_ENCRYPTION !== 'false',
      corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
      rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    },

    features: {
      workflows: process.env.FEATURE_WORKFLOWS !== 'false',
      automations: process.env.FEATURE_AUTOMATIONS !== 'false',
      reporting: process.env.FEATURE_REPORTING !== 'false',
      advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS !== 'false',
      customDashboards: process.env.FEATURE_CUSTOM_DASHBOARDS !== 'false',
    },

    logging: {
      level: (process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')) as any,
      format: (process.env.LOG_FORMAT || 'json') as any,
      destination: (process.env.LOG_DESTINATION || 'console') as any,
    },

    performance: {
      cacheEnabled: process.env.CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.CACHE_TTL || '3600000'), // 1 hour
      metricsInterval: parseInt(process.env.METRICS_INTERVAL || '5000'), // 5 seconds
      batchSize: parseInt(process.env.BATCH_SIZE || '100'),
    },
  };

  // Production overrides
  if (isProd) {
    baseConfig.app.debug = false;
    baseConfig.logging.level = 'warn';
    baseConfig.security.enableAuditLogging = true;
    baseConfig.security.enableEncryption = true;
  }

  return baseConfig;
}

// ===========================
// SINGLETON CONFIG INSTANCE
// ===========================

let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = getEnvironmentConfig();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}

// ===========================
// HELPER FUNCTIONS
// ===========================

export function isDevelopment(): boolean {
  return getConfig().app.environment === 'development';
}

export function isProduction(): boolean {
  return getConfig().app.environment === 'production';
}

export function getFeatureFlag(feature: keyof Config['features']): boolean {
  return getConfig().features[feature];
}

export function getLogLevel(): string {
  return getConfig().logging.level;
}

export function getCacheConfig(): { enabled: boolean; ttl: number } {
  const config = getConfig();
  return {
    enabled: config.performance.cacheEnabled,
    ttl: config.performance.cacheTTL,
  };
}

export function getSecurityConfig() {
  return getConfig().security;
}

export function getAuthConfig() {
  return getConfig().auth;
}

export function getWebSocketConfig() {
  return getConfig().websocket;
}

export default getConfig();
