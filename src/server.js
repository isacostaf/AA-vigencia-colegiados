const express = require('express');
const multer = require('multer');
const { getTmpPath } = require('./paths');
const { createJob, getJob } = require('./jobs');
const { runJob } = require('./processSpreadsheet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = getTmpPath('uploads');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'uploaded_' + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (path.extname(file.originalname).toLowerCase() === '.xlsx') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .xlsx são permitidos'), false);
        }
    },
});

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const job = createJob(req.file.path);
    console.log(`Upload recebido, job ${job.id}: ${req.file.filename}`);

    res.json({
        success: true,
        jobId: job.id,
        status: 'processing',
        message: 'Arquivo recebido. O processamento continua em segundo plano.',
    });

    runJob(job.id, req.file.path, uploadDir);
});

app.get('/api/jobs/:jobId', (req, res) => {
    const job = getJob(req.params.jobId);

    if (!job) {
        return res.status(404).json({ error: 'Processamento não encontrado' });
    }

    res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        total: job.total,
        currentRow: job.currentRow,
        downloadUrl: job.resultFileName ? `/uploads/${job.resultFileName}` : null,
        fileName: job.resultFileName,
        error: job.error,
    });
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Erro no download:', err);
                res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
            } else if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    } else {
        res.status(404).json({ error: 'Arquivo não encontrado' });
    }
});

setInterval(() => {
    if (!fs.existsSync(uploadDir)) {
        return;
    }

    const files = fs.readdirSync(uploadDir);
    const now = Date.now();

    files.forEach((file) => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > 3600000) {
            fs.unlinkSync(filePath);
            console.log(`Arquivo antigo removido: ${file}`);
        }
    });
}, 600000);

const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT}`);
});

server.timeout = 0;
server.keepAliveTimeout = 120_000;
server.headersTimeout = 125_000;
