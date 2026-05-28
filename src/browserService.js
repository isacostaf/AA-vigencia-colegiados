const puppeteer = require('puppeteer');

async function createBrowser() {

    const browser = await puppeteer.launch({

        headless: true,

        executablePath: puppeteer.executablePath(),

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    return browser;
}

module.exports = {
    createBrowser
};