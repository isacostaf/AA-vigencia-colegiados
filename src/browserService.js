const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function createBrowser() {

    const cacheDir = '/opt/render/.cache/puppeteer/chrome';

    let executablePath = null;

    if (fs.existsSync(cacheDir)) {

        const versions = fs.readdirSync(cacheDir);

        const chromeFolder =
            versions.find(v => v.startsWith('linux-'));

        if (chromeFolder) {

            executablePath = path.join(
                cacheDir,
                chromeFolder,
                'chrome-linux64',
                'chrome'
            );
        }
    }

    console.log('USANDO CHROME:', executablePath);

    if (!executablePath || !fs.existsSync(executablePath)) {
        throw new Error(
            `Chrome não encontrado em: ${executablePath}`
        );
    }

    return await puppeteer.launch({

        executablePath,

        headless: true,

        browser: 'chrome',

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
}

module.exports = {
    createBrowser
};