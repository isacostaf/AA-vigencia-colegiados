const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { executar_busca } = require('./busca');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do multer para upload de arquivos usando memória
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (path.extname(file.originalname).toLowerCase() === '.xlsx') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .xlsx são permitidos'), false);
        }
    }
});

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para upload e processamento do arquivo
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        console.log(`Processando arquivo: ${req.file.originalname}`);

        // abre arquivo excel da memória
        const workbook = xlsx.read(req.file.buffer);

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

            try {
                // executa busca usando o texto da planilha
                const resultado = await executar_busca(texto);

                // escreve resultado na coluna 4
                linha[3] = resultado;
            } catch (error) {
                console.error(`Erro na linha ${i + 1}:`, error.message);
                // escreve erro na coluna 4
                linha[3] = `Erro: ${error.message}`;
            }
        }

        // cria nova planilha
        const nova_aba = xlsx.utils.aoa_to_sheet(dados);
        const novo_workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(novo_workbook, nova_aba, 'Resultado');

        // gera arquivo em memória
        const resultBuffer = xlsx.write(novo_workbook, { type: 'buffer', bookType: 'xlsx' });

        console.log('Arquivo gerado com sucesso!');

        // Converte buffer para base64 para envio
        const resultBase64 = resultBuffer.toString('base64');

        res.json({
            success: true,
            message: 'Arquivo processado com sucesso',
            fileData: resultBase64,
            fileName: `resultado_${Date.now()}.xlsx`
        });

    } catch (error) {
        console.error('Erro ao processar arquivo:', error);

        res.status(500).json({ 
            error: 'Erro ao processar arquivo',
            details: error.message 
        });
    }
});


// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse http://localhost:${PORT}`);
    });
}

// Export para Vercel
module.exports = app;
