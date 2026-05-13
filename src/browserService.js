const chromium = require('@sparticuz/chromium');
const puppeteerCore = require('puppeteer-core');
const { isVercel } = require('./config');

async function createBrowser() {
    if (isVercel()) {
        // Use serverless-friendly Chromium on Vercel.
        const executablePath = await chromium.executablePath();
        return puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath,
            headless: chromium.headless
        });
    }

    // Use full Puppeteer locally.
    const puppeteer = require('puppeteer');
    return puppeteer.launch({ headless: true });
}

module.exports = {
    createBrowser
};
