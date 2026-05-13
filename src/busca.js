const { createBrowser } = require('./browserService');

function extrair_numero_portaria(texto) {

    // procura "nº" seguido do número
    const regex = /n[ºo]\s*([\d.]+)/i;

    const resultado = texto.match(regex);

    if (resultado) {
        return resultado[1];
    }

    return null;
}

function extrair_data_portaria(texto) {

    // procura anos entre 1900-2099
    const regex = /\b(19|20)\d{2}\b/;

    const resultado = texto.match(regex);

    if (resultado) {
        return resultado[0];
    }

    return null;
}

async function busca_colegiado(page, numero_portaria, ano_portaria) {

    // entra no site
    await page.goto('https://mdlegis.defesa.gov.br/pesquisar_normas/', {
        waitUntil: 'networkidle2'
    });

    // espera o campo aparecer
    await page.waitForSelector('#SC_numero');

    // digita o número da portaria
    await page.type('#SC_numero', numero_portaria);

    // digita o ano da portaria
    await page.type('#SC_ano', ano_portaria);

    // clica no botão buscar
    await page.click('#sc_b_pesq_bot');

    // espera resultado carregar
    try {
        await page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 60000 // 60 segundos
        });
    } catch (error) {
        console.log('Timeout na navegação, tentando continuar...');
        // Tenta esperar um pouco mais para ver se a página carrega
        await page.waitForTimeout(3000);
    }

    console.log('Busca realizada!');
}

async function checar_vigencia(page, numero_portaria) {

    // espera a tabela carregar
    await page.waitForSelector('#sc_grid_body');

    // pega os dados da tabela
    const resultado = await page.evaluate((numero_portaria) => {

        const linhas = document.querySelectorAll('#sc_grid_body table tbody tr');

        const resultados_encontrados = [];

        for (const linha of linhas) {

            const numero = linha.querySelector('.css_numero_grid_line span');

            if (
                numero &&
                numero.innerText.replace('.', '').trim() ===
                numero_portaria.replace('.', '').trim()
            ) {
                    const status = linha.querySelector('.css_codstatus_grid_line span');

                    resultados_encontrados.push(
                        status ? status.innerText.trim() : null
                    );
                }
        }

        if (resultados_encontrados.length === 0) {
            return 'Nenhum resultado encontrado';
        }

        if (resultados_encontrados.length > 1) {
            return 'Inconclusivo - há mais de um resultado';
        }

        return resultados_encontrados[0];

    }, numero_portaria);

    console.log('Status da norma:', resultado);

    return resultado;
}

async function executar_busca(texto) {

    // verifica se começa com Decreto
    if (texto.trim().toLowerCase().startsWith('decreto')) {
        return 'Decreto: ainda não processamos decretos.';
    }

    // extrai dados
    const numero_portaria = extrair_numero_portaria(texto);
    const data_portaria = extrair_data_portaria(texto);

    console.log('Número extraído:', numero_portaria);

    // abre navegador
    const browser = await createBrowser();

    const page = await browser.newPage();

    try {
        await busca_colegiado(page, numero_portaria, data_portaria);
        const resultado = await checar_vigencia(page, numero_portaria);
        await browser.close();
        return resultado;
    } catch (error) {
        await browser.close();
        throw error;
    }

}

// Função para fechar navegador em caso de erro
executar_busca.fechar_navegador = async function() {
    // Esta função será implementada se necessário
    console.log('Tentativa de limpeza de navegador...');
};

module.exports = {
    executar_busca
};