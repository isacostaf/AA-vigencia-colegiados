const ExcelJS = require('exceljs');
const { executar_busca } = require('../src/busca');
const { getTmpPath } = require('../src/paths');

(async () => {

    // abre arquivo excel
    const workbook = new ExcelJS.Workbook();
    const inputPath = getTmpPath('teste.xlsx');
    await workbook.xlsx.readFile(inputPath);

    // pega primeira aba
    const aba = workbook.worksheets[0];

    // transforma em array
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

    // percorre linhas
    for (let i = 2; i < dados.length; i++) {

        const linha = dados[i];

        // pega coluna 3
        const texto = linha[2];

        // ignora linha vazia
        if (!texto) {
            continue;
        }

        console.log(`Processando linha ${i + 1}`);

        // executa busca usando o texto da planilha
        const resultado = await executar_busca(texto);

        // escreve resultado na coluna 4
        linha[3] = resultado;
    }

    // cria nova planilha
    const novo_workbook = new ExcelJS.Workbook();
    const nova_aba = novo_workbook.addWorksheet('Resultado');

    dados.forEach((linha) => {
        nova_aba.addRow(linha);
    });

    // salva arquivo novo
    const outputPath = getTmpPath('teste_resultado.xlsx');
    await novo_workbook.xlsx.writeFile(outputPath);

    console.log('Arquivo gerado com sucesso!');

})();