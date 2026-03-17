/**
 * PhishX Lighthouse Configuration
 * QA Agent: AI Co-worker
 *
 * Usage:
 *   npx lhci autorun
 *   npx lighthouse http://localhost:3000 --config-path=lighthouse.config.js
 *
 * Targets (CI fails if not met):
 *   Performance    ≥ 80   (SOC dashboards are data-heavy — 80 is realistic)
 *   Accessibility  ≥ 90   (analyst tool — must be accessible)
 *   Best Practices ≥ 90
 *   SEO            ≥ 70   (internal tool — SEO less critical)
 */

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
      ],
      numberOfRuns: 3,
      settings: {
        // Simulate typical analyst workstation (not mobile)
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: {
          // Simulate fast office network — not throttled 3G
          rttMs: 10,
          throughputKbps: 100000,
          cpuSlowdownMultiplier: 1,
        },
        // Skip PWA audit — not a PWA requirement for this tool
        skipAudits: ['installable-manifest', 'splash-screen', 'themed-address-bar'],
      },
    },

    assert: {
      // Fail CI if any of these are not met
      assertions: {
        'categories:performance':     ['error', { minScore: 0.8  }],
        'categories:accessibility':   ['error', { minScore: 0.9  }],
        'categories:best-practices':  ['error', { minScore: 0.9  }],
        'categories:seo':             ['warn',  { minScore: 0.7  }],

        // Specific audits we care about for a security tool
        'uses-https':                 ['error', { logLevel: 'error' }],
        'no-vulnerable-libraries':    ['error', { logLevel: 'error' }],
        'csp-xss':                    ['warn',  { logLevel: 'warn'  }],

        // Performance budgets
        'first-contentful-paint':     ['warn',  { maxNumericValue: 2000 }],
        'largest-contentful-paint':   ['error', { maxNumericValue: 4000 }],
        'total-blocking-time':        ['error', { maxNumericValue: 600  }],
        'cumulative-layout-shift':    ['error', { maxNumericValue: 0.1  }],
        'interactive':                ['warn',  { maxNumericValue: 5000 }],
      },
    },

    upload: {
      target: 'temporary-public-storage',
    },
  },
}
