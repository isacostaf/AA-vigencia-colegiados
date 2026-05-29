const fs = require('fs');
const puppeteer = require('puppeteer');

const CHROME_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--no-first-run',
    '--no-zygote',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--mute-audio',
];

function resolveExecutablePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    return puppeteer.executablePath();
}

async function createBrowser() {
    const executablePath = resolveExecutablePath();

    if (!fs.existsSync(executablePath)) {
        throw new Error(
            `Chrome não encontrado em ${executablePath}. ` +
                'No Render com Docker, use runtime Docker e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium.'
        );
    }

    console.log('PUPPETEER EXECUTABLE:', executablePath);

    return puppeteer.launch({
        headless: true,
        executablePath,
        timeout: 120_000,
        protocolTimeout: 180_000,
        dumpio: process.env.PUPPETEER_DEBUG === '1',
        args: CHROME_ARGS,
    });
}

module.exports = {
    createBrowser,
};
