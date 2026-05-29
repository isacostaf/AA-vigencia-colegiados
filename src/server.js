const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { executar_busca } = require('./busca');
const { createBrowser } = require('./browserService');
const { getTmpPath } = require('./paths');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;





const uploadRoot = getTmpPath();
const uploadDir = getTmpPath('uploads');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'uploaded_' + Date.now() + path.extname(file.originalname));
    }
});

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
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Rota para upload e processamento do arquivo
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        console.log(`Processando arquivo: ${req.file.filename}`);

        // abre arquivo excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);

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

        // percorre linhas usando um unico browser/page




        const browser = await createBrowser();
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);

        try {
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
                    const resultado = await executar_busca(texto, { browser, page });

                    // escreve resultado na coluna 4
                    linha[3] = resultado;
                } catch (error) {
                    console.error(`Erro na linha ${i + 1}:`, error.message);
                    // escreve erro na coluna 4
                    linha[3] = `Erro: ${error.message}`;
                }







            }
        } finally {
            await browser.close();
        }

        // cria nova planilha
        const novo_workbook = new ExcelJS.Workbook();
        const nova_aba = novo_workbook.addWorksheet('Resultado');

        dados.forEach((linha) => {
            nova_aba.addRow(linha);
        });

        // nome do arquivo de resultado
        const resultFileName = `resultado_${Date.now()}.xlsx`;
        const resultPath = path.join(uploadDir, resultFileName);

        // salva arquivo novo
        await novo_workbook.xlsx.writeFile(resultPath);

        // Remove arquivo original após processamento
        fs.unlinkSync(req.file.path);

























        console.log('Arquivo gerado com sucesso!');


















        res.json({
            success: true,
            message: 'Arquivo processado com sucesso',
            downloadUrl: `/uploads/${resultFileName}`,
            fileName: resultFileName
        });

    } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        
        // Remove arquivo em caso de erro
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            error: 'Erro ao processar arquivo',
            details: error.message 
        });
    }
});

// Rota para download do arquivo processado
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Erro no download:', err);
                res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
            } else {
                // Remove arquivo após download
                fs.unlinkSync(filePath);
            }
        });
    } else {
        res.status(404).json({ error: 'Arquivo não encontrado' });
    }








































});

// Limpeza periódica de arquivos antigos
setInterval(() => {
    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        const now = Date.now();

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);

            // Remove arquivos com mais de 1 hora
            if (now - stats.mtime.getTime() > 3600000) {
                fs.unlinkSync(filePath);
                console.log(`Arquivo antigo removido: ${file}`);
            }
        });
    }
}, 600000); // Executa a cada 10 minutos

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT}`);
});