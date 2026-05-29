const fs = require('fs');
const puppeteer = require('puppeteer');

async function createBrowser() {
    const executablePath = puppeteer.executablePath();

    if (!fs.existsSync(executablePath)) {
        throw new Error(
            `Chrome não encontrado em ${executablePath}. ` +
                'No Render, use build "npm install" e faça deploy com "Clear build cache".'
        );
    }

    console.log('PUPPETEER EXECUTABLE:', executablePath);

    return puppeteer.launch({
        headless: true,
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });
}

module.exports = {
    createBrowser
};