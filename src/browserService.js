const puppeteer = require('puppeteer');

async function createBrowser() {

    const executablePath =
        puppeteer.executablePath();

    console.log(
        'PUPPETEER EXECUTABLE:',
        executablePath
    );

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