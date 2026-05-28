const puppeteer = require('puppeteer');

async function createBrowser() {

    return await puppeteer.launch({

        headless: true,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
}

module.exports = {
    createBrowser
};