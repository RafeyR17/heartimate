/** @type {import('lighthouse').Flags} */
const mobileSettings = {
  formFactor: 'mobile',
  screenEmulation: {
    mobile: true,
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    disabled: false,
  },
  throttlingMethod: 'simulate',
  throttling: {
    rttMs: 150,
    throughputKbps: 1638.4,
    cpuSlowdownMultiplier: 4,
  },
}

const urls = (process.env.LIGHTHOUSE_URLS || 'http://127.0.0.1:3000/,http://127.0.0.1:3000/explore')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)

/** @type {import('@lhci/utils').LHCI.ServerCommand.Options} */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'localhost:3000',
      startServerReadyTimeout: 120_000,
      url: urls,
      numberOfRuns: 1,
      settings: mobileSettings,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.55 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
}
