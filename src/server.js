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

// Sistema de jobs em memória (para Vercel serverless)
const jobs = new Map();
const CHUNK_SIZE = 10; // Processar 10 linhas por chunk

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

// Função para processar job em chunks
async function processJob(jobId, filePath) {
    try {
        const job = jobs.get(jobId);
        job.status = 'processing';
        job.progress = 0;
        job.total = 0;

        // abre arquivo excel
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

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

        // Calcular total de linhas a processar
        const totalLinhas = dados.length - 2; // Desconsiderar as 2 primeiras linhas
        job.total = totalLinhas;

        // percorre linhas em chunks
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
                    job.progress++;
                    continue;
                }

                console.log(`[Job ${jobId}] Processando linha ${i + 1}/${dados.length}`);

                try {
                    // executa busca usando o texto da planilha
                    const resultado = await executar_busca(texto, { browser, page });

                    // escreve resultado na coluna 4
                    linha[3] = resultado;
                } catch (error) {
                    console.error(`[Job ${jobId}] Erro na linha ${i + 1}:`, error.message);
                    // escreve erro na coluna 4
                    linha[3] = `Erro: ${error.message}`;
                }

                job.progress++;

                // Pausa breve entre chunks para evitar timeout
                if (job.progress % CHUNK_SIZE === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
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
        const resultFileName = `resultado_${jobId}.xlsx`;
        const resultPath = path.join(uploadDir, resultFileName);

        // salva arquivo novo
        await novo_workbook.xlsx.writeFile(resultPath);

        // Remove arquivo original após processamento
        fs.unlinkSync(filePath);

        console.log(`[Job ${jobId}] Arquivo gerado com sucesso!`);

        job.status = 'completed';
        job.resultPath = resultPath;
        job.resultFileName = resultFileName;
    } catch (error) {
        console.error(`[Job ${jobId}] Erro ao processar:`, error);
        job.status = 'error';
        job.error = error.message;

        // Remove arquivo em caso de erro
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

// Rota para upload e processamento do arquivo
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        console.log(`Recebendo arquivo: ${req.file.filename}`);

        // Criar job ID
        const jobId = Date.now().toString();

        // Criar objeto do job
        jobs.set(jobId, {
            id: jobId,
            status: 'pending',
            progress: 0,
            total: 0,
            createdAt: new Date()
        });

        // Iniciar processamento em background
        processJob(jobId, req.file.path).catch(error => {
            console.error(`Erro no job ${jobId}:`, error);
        });

        res.json({
            success: true,
            jobId: jobId,
            message: 'Job criado com sucesso. Use o jobId para acompanhar o progresso.'
        });

    } catch (error) {
        console.error('Erro ao criar job:', error);
        res.status(500).json({
            error: 'Erro ao criar job',
            details: error.message
        });
    }
});

// Rota para verificar status do job
app.get('/job/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job não encontrado' });
    }

    // Prevenir caching para garantir progresso em tempo real
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        total: job.total,
        percentage: job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0,
        error: job.error || null,
        resultFileName: job.resultFileName || null
    });
});

// Rota para download do arquivo processado por jobId
app.get('/download/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job não encontrado' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Job ainda não foi concluído', status: job.status });
    }

    if (!job.resultPath || !fs.existsSync(job.resultPath)) {
        return res.status(404).json({ error: 'Arquivo de resultado não encontrado' });
    }

    res.download(job.resultPath, job.resultFileName, (err) => {
        if (err) {
            console.error('Erro no download:', err);
            res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
        } else {
            // Remove arquivo após download
            fs.unlinkSync(job.resultPath);
            // Remove job após download
            jobs.delete(jobId);
        }
    });
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
