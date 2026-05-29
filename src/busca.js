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

/**
 * Normaliza texto
 */
function normalizar_texto(texto) {

    return texto
        .toLowerCase()

        // remove acentos
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

        // remove .pdf
        .replace(/\.pdf/g, '')

        // remove "unificado"
        .replace(/unificado/g, '')

        // remove CISET/MD e similares
        .replace(/[a-z]+\/[a-z]+/gi, '')

        // remove n°, nº etc
        .replace(/n[º°o]/g, '')

        // remove caracteres especiais
        .replace(/[^\w\s]/g, ' ')

        // remove espaços extras
        .replace(/\s+/g, ' ')

        .trim();
}

/**
 * Extrai data completa
 * Ex:
 * 28 de janeiro de 2020
 */
function extrair_data_completa(texto) {

    const regex =
        /(\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4})/i;

    const resultado = texto.match(regex);

    if (resultado) {
        return resultado[1];
    }

    return null;
}

async function busca_colegiado(
    page,
    numero_portaria,
    ano_portaria
) {

    // entra no site
    await page.goto(
        'https://mdlegis.defesa.gov.br/pesquisar_normas/',
        {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
        }
    );

    // espera o campo aparecer
    await page.waitForSelector('#SC_numero');

    // digita o número da portaria
    await page.type(
        '#SC_numero',
        numero_portaria
    );

    // digita o ano da portaria
    await page.type(
        '#SC_ano',
        ano_portaria
    );

    // clica no botão buscar
    await page.click('#sc_b_pesq_bot');

    // espera resultado carregar
    try {

        await page.waitForSelector(
            '#sc_grid_body',
            { timeout: 30000 }
        );

    } catch (error) {

        console.log(
            'Timeout na busca, tentando continuar...'
        );
    }

    console.log('Busca realizada!');
}

async function checar_vigencia(
    page,
    numero_portaria,
    texto_original
) {

    // espera a tabela carregar
    await page.waitForSelector(
        '#sc_grid_body',
        { timeout: 30000 }
    );

    const dados = await page.evaluate(

        (
            numero_portaria,
            texto_original
        ) => {

            function normalizar(texto) {

                return texto
                    .toLowerCase()

                    .normalize('NFD')
                    .replace(
                        /[\u0300-\u036f]/g,
                        ''
                    )

                    .replace(/\.pdf/g, '')

                    .replace(
                        /unificado/g,
                        ''
                    )

                    .replace(
                        /[a-z]+\/[a-z]+/gi,
                        ''
                    )

                    .replace(
                        /n[º°o]/g,
                        ''
                    )

                    .replace(
                        /[^\w\s]/g,
                        ' '
                    )

                    .replace(
                        /\s+/g,
                        ' '
                    )

                    .trim();
            }

            function extrairData(texto) {

                const regex =
                    /(\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4})/i;

                const resultado =
                    texto.match(regex);

                if (resultado) {
                    return resultado[1];
                }

                return null;
            }

            const linhas =
                document.querySelectorAll(
                    '#sc_grid_body table tbody tr'
                );

            const resultados_encontrados = [];

            for (const linha of linhas) {

                const numero =
                    linha.querySelector(
                        '.css_numero_grid_line span'
                    );

                if (
                    numero &&
                    numero.innerText
                        .replace('.', '')
                        .trim() ===
                    numero_portaria
                        .replace('.', '')
                        .trim()
                ) {

                    // status
                    const status =
                        linha.querySelector(
                            '.css_codstatus_grid_line span'
                        );

                    // pega nome pdf
                    let nomePdf = '';

                    const brs =
                        linha.querySelectorAll('br');

                    if (brs.length > 0) {

                        const ultimoBr =
                            brs[
                                brs.length - 1
                            ];

                        if (
                            ultimoBr.nextSibling
                        ) {

                            nomePdf =
                                ultimoBr
                                    .nextSibling
                                    .textContent
                                    .trim();
                        }
                    }

                    // pega link pdf
                    let linkPdf = '';

                    const linkElemento =
                        linha.querySelector(
                            'a[target="_blank"]'
                        );

                    if (linkElemento) {

                        linkPdf =
                            linkElemento.href || '';
                    }

                    resultados_encontrados.push({

                        status:
                            status
                                ? status.innerText.trim()
                                : null,

                        nomePdf,

                        linkPdf
                    });
                }
            }

            // nenhum resultado
            if (
                resultados_encontrados.length === 0
            ) {

                return {
                    resultado:
                        'Nenhum resultado encontrado'
                };
            }

            // apenas um resultado
            if (
                resultados_encontrados.length === 1
            ) {

                return {
                    resultado:
                        resultados_encontrados[0]
                            .status
                };
            }

            // ==========================
            // CASO INCONCLUSIVO
            // ==========================

            const textoNormalizado =
                normalizar(texto_original);

            const dataOriginal =
                extrairData(
                    texto_original
                );

            for (const resultado of resultados_encontrados) {

                const pdfNormalizado =
                    normalizar(
                        resultado.nomePdf
                    );

                const dataPdf =
                    extrairData(
                        resultado.nomePdf
                    );

                let ehCompativel =
                    false;

                // compara pela data
                if (
                    dataOriginal &&
                    dataPdf &&
                    normalizar(dataOriginal) ===
                    normalizar(dataPdf)
                ) {

                    ehCompativel = true;
                }

                // fallback por texto
                else if (

                    pdfNormalizado.includes(
                        textoNormalizado
                    ) ||

                    textoNormalizado.includes(
                        pdfNormalizado
                    )
                ) {

                    ehCompativel = true;
                }

                resultado.compativel =
                    ehCompativel;

                resultado.dataPdf =
                    dataPdf;
            }

            return {

                resultado:
                    'Inconclusivo - há mais de um resultado',

                textoOriginal:
                    texto_original,

                resultados:
                    resultados_encontrados
            };

        },

        numero_portaria,
        texto_original
    );

    // ==========================
    // LOGS APENAS INCONCLUSIVO
    // ==========================

    if (
        dados.resultado ===
        'Inconclusivo - há mais de um resultado'
    ) {

        console.log(
            'Tentando comparar nomes dos PDFs...'
        );

        console.log(
            'Título original:'
        );

        console.log(
            dados.textoOriginal
        );

        const dataOriginal =
            extrair_data_completa(
                dados.textoOriginal
            );

        console.log(
            'Data original:',
            dataOriginal
        );

        for (const resultado of dados.resultados) {

            console.log(
                '----------------'
            );

            console.log(
                'PDF encontrado:'
            );

            console.log(
                resultado.nomePdf
            );

            console.log(
                'Link PDF:'
            );

            console.log(
                resultado.linkPdf
            );

            console.log(
                'Data PDF:',
                resultado.dataPdf
            );

            if (resultado.compativel) {

                console.log(
                    'PDF COMPATÍVEL!'
                );

                console.log(
                    'Link PDF compatível:'
                );

                console.log(
                    resultado.linkPdf
                );

                console.log(
                    'Status correspondente:'
                );

                console.log(
                    resultado.status
                );

                console.log(
                    'Status da norma:',
                    resultado.status
                );

                return resultado.status;
            }

            console.log(
                'PDF não corresponde.'
            );
        }

        console.log(
            'Nenhum PDF correspondeu.'
        );
    }

    console.log(
        'Status da norma:',
        dados.resultado
    );

    return dados.resultado;
}

async function executar_busca(
    texto,
    context = {}
) {

    // verifica se começa com Decreto
    if (
        texto
            .trim()
            .toLowerCase()
            .startsWith('decreto')
    ) {

        return 'Decreto: ainda não processamos decretos.';
    }

    // extrai dados
    const numero_portaria =
        extrair_numero_portaria(texto);

    const data_portaria =
        extrair_data_portaria(texto);

    if (
        !numero_portaria ||
        !data_portaria
    ) {

        return 'Nao foi possivel extrair numero/ano da portaria.';
    }

    console.log(
        'Número extraído:',
        numero_portaria
    );

    // abre navegador
    const browser =
        context.browser ||
        await createBrowser();

    const page =
        context.page ||
        await browser.newPage();

    if (!context.page) {

        page.setDefaultTimeout(30000);
    }

    try {

        // realiza busca
        await busca_colegiado(
            page,
            numero_portaria,
            data_portaria
        );

        // checa vigência
        const resultado =
            await checar_vigencia(
                page,
                numero_portaria,
                texto
            );

        // fecha navegador
        if (!context.browser) {

            await browser.close();
        }

        return resultado;

    } catch (error) {

        // fecha navegador em erro
        if (!context.browser) {

            await browser.close();
        }

        throw error;
    }
}

// Função para fechar navegador
executar_busca.fechar_navegador =
    async function() {

        console.log(
            'Tentativa de limpeza de navegador...'
        );
    };

module.exports = {
    executar_busca
};