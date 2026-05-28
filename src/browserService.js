const puppeteer = require('puppeteer');

async function createBrowser() {

    const browser = await puppeteer.launch({

        headless: true,

        executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH ||
            '/opt/render/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',

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