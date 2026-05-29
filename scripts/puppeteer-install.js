#!/usr/bin/env node
const { execSync } = require('child_process');

if (
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true' ||
    process.env.PUPPETEER_EXECUTABLE_PATH
) {
    console.log('Puppeteer: usando Chrome do sistema, download ignorado.');
    process.exit(0);
}

console.log('Puppeteer: instalando chrome-headless-shell...');
execSync('npx puppeteer browsers install chrome-headless-shell', {
    stdio: 'inherit',
});
