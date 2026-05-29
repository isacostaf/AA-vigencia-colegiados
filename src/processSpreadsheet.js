const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { executar_busca } = require('./busca');
const { createBrowser } = require('./browserService');
const { updateJob } = require('./jobs');

async function lerPlanilha(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const aba = workbook.worksheets[0];
    const dados = [];

    aba.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const linha = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let valor = cell.value;

            if (valor && typeof valor === 'object') {
                if (typeof valor.text === 'string') {
                    valor = valor.text;
                } else if (Array.isArray(valor.richText)) {
                    valor = valor.richText.map((parte) => parte.text).join('');
                } else if (typeof valor.result !== 'undefined') {
                    valor = valor.result;
                } else if (typeof valor.formula !== 'undefined') {
                    valor = valor.formula;
                }
            }

            linha[colNumber - 1] = valor;
        });

        dados[rowNumber - 1] = linha;
    });

    return dados;
}

function contarLinhasComTexto(dados) {
    let total = 0;
    for (let i = 2; i < dados.length; i++) {
        if (dados[i] && dados[i][2]) {
            total++;
        }
    }
    return total;
}

async function processSpreadsheet(jobId, filePath, uploadDir) {
    updateJob(jobId, { status: 'processing' });

    const dados = await lerPlanilha(filePath);
    const total = contarLinhasComTexto(dados);

    updateJob(jobId, { total, progress: 0 });

    const browser = await createBrowser();
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    let progress = 0;

    try {
        for (let i = 2; i < dados.length; i++) {
            const linha = dados[i];
            const texto = linha[2];

            if (!texto) {
                continue;
            }

            progress++;
            updateJob(jobId, {
                progress,
                currentRow: i + 1,
            });

            console.log(`[job ${jobId}] Processando linha ${i + 1} (${progress}/${total})`);

            try {
                const resultado = await executar_busca(texto, { browser, page });
                linha[3] = resultado;
            } catch (error) {
                console.error(`[job ${jobId}] Erro na linha ${i + 1}:`, error.message);
                linha[3] = `Erro: ${error.message}`;
            }
        }
    } finally {
        await browser.close();
    }

    const novo_workbook = new ExcelJS.Workbook();
    const nova_aba = novo_workbook.addWorksheet('Resultado');

    dados.forEach((linha) => {
        nova_aba.addRow(linha);
    });

    const resultFileName = `resultado_${jobId}.xlsx`;
    const resultPath = path.join(uploadDir, resultFileName);
    await novo_workbook.xlsx.writeFile(resultPath);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return resultFileName;
}

async function runJob(jobId, filePath, uploadDir) {
    try {
        const resultFileName = await processSpreadsheet(jobId, filePath, uploadDir);
        updateJob(jobId, {
            status: 'completed',
            resultFileName,
        });
        console.log(`[job ${jobId}] Concluído: ${resultFileName}`);
    } catch (error) {
        console.error(`[job ${jobId}] Falhou:`, error);
        updateJob(jobId, {
            status: 'failed',
            error: error.message,
        });

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = {
    runJob,
};
