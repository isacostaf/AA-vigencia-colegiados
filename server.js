const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { executar_busca } = require('./busca');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
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
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

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

        console.log(`Processando arquivo: ${req.file.filename}`);

        // abre arquivo excel
        const workbook = xlsx.readFile(req.file.path);

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
        xlsx.utils.book_append_sheet(novo_workbook, nova_aba, 'Resultado');

        // nome do arquivo de resultado
        const resultFileName = `resultado_${Date.now()}.xlsx`;
        const resultPath = path.join('uploads', resultFileName);

        // salva arquivo novo
        xlsx.writeFile(novo_workbook, resultPath);

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
    const filePath = path.join(__dirname, 'uploads', filename);

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
    const uploadDir = 'uploads';
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
