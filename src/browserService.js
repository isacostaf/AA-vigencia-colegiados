const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function createBrowser() {

    const cacheDir = '/opt/render/.cache/puppeteer/chrome';

    let executablePath = null;

    if (fs.existsSync(cacheDir)) {

        const versions = fs.readdirSync(cacheDir);

        if (versions.length > 0) {

            const chromeFolder = versions[0];

            executablePath = path.join(
                cacheDir,
                chromeFolder,
                'chrome-linux64',
                'chrome'
            );
        }
    }

    console.log('Chrome path:', executablePath);

    return await puppeteer.launch({

        headless: true,

        executablePath,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
}

module.exports = {
    createBrowser
};