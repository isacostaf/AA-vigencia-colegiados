const puppeteer = require('puppeteer');

async function busca_colegiado(page) {
    // entra no site
    await page.goto('https://mdlegis.defesa.gov.br/pesquisar_normas/', {
        waitUntil: 'networkidle2'
    });

    // espera o campo aparecer
    // #sc significa que etsamos seleiconando pelo id
    await page.waitForSelector('#SC_numero');

    // digita 4096
    await page.type('#SC_numero', '4096');

    // clica no botão buscar
    await page.click('#sc_b_pesq_bot');

    // espera resultado carregar
    await page.waitForNavigation({
        waitUntil: 'networkidle2'
    });

    console.log('Busca realizada!');
}

async function checar_vigencia(page) {

    // espera a tabela carregar
    await page.waitForSelector('#sc_grid_body');

    // pega os dados da tabela
    const resultado = await page.evaluate(() => {

        // pega todas as linhas da tabela
        const linhas = document.querySelectorAll('#sc_grid_body table tbody tr');

        for (const linha of linhas) {

            // pega a coluna do número
            const numero = linha.querySelector('.css_numero_grid_line span');

            // verifica se existe e se é 4096
            if (numero && numero.innerText.trim() === '4.096') {

                // pega o status
                const status = linha.querySelector('.css_codstatus_grid_line span');

                return status ? status.innerText.trim() : null;
            }
        }

        return null;
    });

    console.log('Status da norma:', resultado);
}

(async () => {
    // abre o navegador
    const browser = await puppeteer.launch({
        headless: false // true = invisível
    });

    const page = await browser.newPage();

    await busca_colegiado(page);

    await checar_vigencia(page);

    // await browser.close();
})();