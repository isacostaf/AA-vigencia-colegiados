const puppeteer = require('puppeteer');

async function createBrowser() {

    return await puppeteer.launch({

        headless: true,

        executablePath: puppeteer.executablePath(),

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
}

module.exports = {
    createBrowser
};