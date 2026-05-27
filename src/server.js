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

// =========================
// GARANTE PASTA TEMP
// =========================
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// =========================
// MULTER
// =========================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        cb(null, 'uploaded_' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,

    fileFilter: function (req, file, cb) {

        const ext = path.extname(file.originalname).toLowerCase();

        if (ext === '.xlsx') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .xlsx são permitidos'));
        }
    }
});

// =========================
// STATIC
// =========================
const publicDir = path.join(__dirname, '..', 'public');

app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

// =========================
// HOME
// =========================
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// =========================
// UPLOAD
// =========================
app.post('/upload', upload.single('file'), async (req, res) => {

    console.log('====================================');
    console.log('1 - ROTA /UPLOAD INICIADA');
    console.log('====================================');

    try {

        // =========================
        // VALIDA ARQUIVO
        // =========================
        if (!req.file) {

            console.error('Nenhum arquivo enviado');

            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo enviado'
            });
        }

        console.log('2 - ARQUIVO RECEBIDO');
        console.log(req.file);

        // =========================
        // ABRE EXCEL
        // =========================
        console.log('3 - ABRINDO EXCEL');

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.readFile(req.file.path);

        console.log('4 - EXCEL ABERTO');

        // =========================
        // PRIMEIRA ABA
        // =========================
        const aba = workbook.worksheets[0];

        if (!aba) {
            throw new Error('Nenhuma aba encontrada no Excel');
        }

        // =========================
        // TRANSFORMA EM ARRAY
        // =========================
        const dados = [];

        aba.eachRow({ includeEmpty: true }, (row, rowNumber) => {

            const linha = [];

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {

                let valor = cell.value;

                if (valor && typeof valor === 'object') {

                    if (typeof valor.text === 'string') {
                        valor = valor.text;

                    } else if (Array.isArray(valor.richText)) {

                        valor = valor.richText
                            .map((parte) => parte.text)
                            .join('');

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

        console.log(`5 - TOTAL DE LINHAS: ${dados.length}`);

        // =========================
        // BROWSER
        // =========================
        console.log('6 - INICIANDO BROWSER');

        const browser = await createBrowser();

        console.log('7 - BROWSER INICIADO');

        const page = await browser.newPage();

        page.setDefaultTimeout(30000);

        try {

            // =========================
            // PROCESSA LINHAS
            // =========================
            for (let i = 2; i < dados.length; i++) {

                const linha = dados[i];

                const texto = linha[2];

                if (!texto) {

                    console.log(`Linha ${i + 1} vazia`);

                    continue;
                }

                console.log(`8 - PROCESSANDO LINHA ${i + 1}`);
                console.log(`Texto: ${texto}`);

                try {

                    const resultado = await executar_busca(
                        texto,
                        { browser, page }
                    );

                    linha[3] = resultado;

                    console.log(`Linha ${i + 1} processada`);

                } catch (linhaError) {

                    console.error(`ERRO NA LINHA ${i + 1}`);
                    console.error(linhaError);
                    console.error(linhaError.stack);

                    linha[3] = `Erro: ${linhaError.message}`;
                }
            }

        } finally {

            console.log('9 - FECHANDO BROWSER');

            await browser.close();
        }

        // =========================
        // NOVA PLANILHA
        // =========================
        console.log('10 - GERANDO NOVA PLANILHA');

        const novo_workbook = new ExcelJS.Workbook();

        const nova_aba = novo_workbook.addWorksheet('Resultado');

        dados.forEach((linha) => {
            nova_aba.addRow(linha);
        });

        // =========================
        // SALVA RESULTADO
        // =========================
        const resultFileName = `resultado_${Date.now()}.xlsx`;

        const resultPath = path.join(uploadDir, resultFileName);

        console.log('11 - SALVANDO RESULTADO');
        console.log(resultPath);

        await novo_workbook.xlsx.writeFile(resultPath);

        console.log('12 - RESULTADO SALVO');

        // =========================
        // REMOVE ORIGINAL
        // =========================
        try {

            if (fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

                console.log('13 - ARQUIVO ORIGINAL REMOVIDO');
            }

        } catch (removeError) {

            console.error('Erro removendo original');
            console.error(removeError);
        }

        // =========================
        // SUCESSO
        // =========================
        console.log('14 - PROCESSAMENTO FINALIZADO');

        res.json({
            success: true,
            message: 'Arquivo processado com sucesso',
            downloadUrl: `/uploads/${resultFileName}`,
            fileName: resultFileName
        });

    } catch (error) {

        console.error('====================================');
        console.error('ERRO REAL DO SERVIDOR');
        console.error('====================================');

        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        console.error('Erro completo:', error);

        if (req.file) {
            console.error('Arquivo enviado:', req.file);
        }

        // remove arquivo em caso de erro
        try {

            if (req.file && fs.existsSync(req.file.path)) {

                fs.unlinkSync(req.file.path);

                console.log('Arquivo removido após erro');
            }

        } catch (deleteError) {

            console.error('Erro removendo arquivo');
            console.error(deleteError);
        }

        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// =========================
// DOWNLOAD
// =========================
app.get('/download/:filename', (req, res) => {

    const filename = req.params.filename;

    const filePath = path.join(uploadDir, filename);

    console.log('DOWNLOAD:', filePath);

    if (fs.existsSync(filePath)) {

        res.download(filePath, (err) => {

            if (err) {

                console.error('ERRO DOWNLOAD');
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: 'Erro ao baixar arquivo'
                });
            }

            try {

                fs.unlinkSync(filePath);

                console.log('Arquivo removido após download');

            } catch (removeError) {

                console.error(removeError);
            }
        });

    } else {

        console.error('Arquivo não encontrado');

        res.status(404).json({
            success: false,
            error: 'Arquivo não encontrado'
        });
    }
});

// =========================
// LIMPEZA
// =========================
setInterval(() => {

    try {

        if (!fs.existsSync(uploadDir)) {
            return;
        }

        const files = fs.readdirSync(uploadDir);

        const now = Date.now();

        files.forEach(file => {

            const filePath = path.join(uploadDir, file);

            const stats = fs.statSync(filePath);

            // 1 hora
            if (now - stats.mtime.getTime() > 3600000) {

                fs.unlinkSync(filePath);

                console.log(`Arquivo removido: ${file}`);
            }
        });

    } catch (cleanupError) {

        console.error('ERRO LIMPEZA');
        console.error(cleanupError);
    }

}, 600000);

// =========================
// START
// =========================
app.listen(PORT, () => {

    console.log('====================================');
    console.log(`SERVIDOR RODANDO NA PORTA ${PORT}`);
    console.log(`UPLOAD DIR: ${uploadDir}`);
    console.log('====================================');
});