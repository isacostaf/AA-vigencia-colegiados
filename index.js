const xlsx = require('xlsx');
const { executar_busca } = require('./busca');

(async () => {

    // abre arquivo excel
    const workbook = xlsx.readFile('teste.xlsx');

    // pega primeira aba
    const nome_aba = workbook.SheetNames[0];

    const aba = workbook.Sheets[nome_aba];

    // transforma em array
    const dados = xlsx.utils.sheet_to_json(aba, {
        header: 1
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
    const nova_aba = xlsx.utils.aoa_to_sheet(dados);

    const novo_workbook = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(
        novo_workbook,
        nova_aba,
        'Resultado'
    );

    // salva arquivo novo
    xlsx.writeFile(
        novo_workbook,
        'teste_resultado.xlsx'
    );

    console.log('Arquivo gerado com sucesso!');

})();