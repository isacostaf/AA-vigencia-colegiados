const puppeteer = require('puppeteer');

async function createBrowser() {

    return await puppeteer.launch({

        headless: true,

        channel: 'chrome',

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
}

module.exports = {
    createBrowser
};