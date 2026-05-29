document.addEventListener('DOMContentLoaded', function () {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const loadingPanel = document.getElementById('loadingPanel');
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingStats = document.getElementById('loadingStats');
    const loadingTip = document.getElementById('loadingTip');
    const progressTrack = document.getElementById('progressTrack');
    const progressFill = document.getElementById('progressFill');

    const LOADING_TIPS = [
        'Cada linha é uma portaria sendo conferida no MD Legis...',
        'O robô está lendo normas para você — quase lá!',
        'Planilhas grandes merecem paciência (e um café).',
        'Enquanto isso, respire: o sistema não vai desistir.',
        'Verificando vigência, uma portaria de cada vez.',
        'Se piscar, a barra continua andando sem você.',
        'Dados oficiais levam tempo — estamos no caminho certo.',
        'Quanto mais linhas, mais herói você é por esperar.',
        'O Ministério da Defesa agradece sua calma.',
        'Quase como fila de banco, só que digital.',
    ];

    let tipInterval = null;
    let tipIndex = 0;

    uploadBtn.addEventListener('click', function () {
        if (!uploadBtn.disabled) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', function () {
        const file = fileInput.files[0];

        if (file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'xlsx') {
                uploadFile(file);
            } else {
                alert('Por favor, selecione um arquivo .xlsx válido.');
                fileInput.value = '';
            }
        }
    });

    async function parseJsonResponse(response) {
        const text = await response.text();

        if (!text) {
            throw new Error(
                response.status === 502 || response.status === 504
                    ? 'O servidor demorou demais para responder. Tente novamente em instantes.'
                    : 'Resposta vazia do servidor.'
            );
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Resposta inválida do servidor.');
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function resetUploadButton() {
        uploadBtn.textContent = 'Inserir Arquivo';
        uploadBtn.style.backgroundColor = 'transparent';
        uploadBtn.style.color = '#424242';
        uploadBtn.disabled = false;
        uploadBtn.style.cursor = 'pointer';
    }

    function setUploadBusy(label) {
        uploadBtn.textContent = label;
        uploadBtn.disabled = true;
        uploadBtn.style.cursor = 'not-allowed';
        uploadBtn.style.backgroundColor = 'transparent';
        uploadBtn.style.color = '#424242';
    }

    function rotateTip() {
        loadingTip.classList.remove('loading-tip--visible');
        setTimeout(() => {
            loadingTip.textContent = LOADING_TIPS[tipIndex % LOADING_TIPS.length];
            tipIndex++;
            loadingTip.classList.add('loading-tip--visible');
        }, 280);
    }

    function startTipRotation() {
        tipIndex = Math.floor(Math.random() * LOADING_TIPS.length);
        loadingTip.textContent = LOADING_TIPS[tipIndex];
        tipIndex++;
        loadingTip.classList.add('loading-tip--visible');
        tipInterval = setInterval(rotateTip, 4500);
    }

    function stopTipRotation() {
        if (tipInterval) {
            clearInterval(tipInterval);
            tipInterval = null;
        }
    }

    function showLoadingPanel() {
        uploadBtn.style.display = 'none';

        loadingPanel.hidden = false;
        progressTrack.classList.add('progress-track--indeterminate');
        progressFill.style.width = '0%';

        loadingTitle.textContent = 'Enviando arquivo...';
        loadingStats.textContent = 'Preparando tudo';

        startTipRotation();
    }

    function hideLoadingPanel() {
        uploadBtn.style.display = 'inline-block';

        loadingPanel.hidden = true;

        stopTipRotation();

        progressTrack.classList.remove('progress-track--indeterminate');
    }

    function updateLoadingProgress(progress, total) {
        if (total > 0) {
            progressTrack.classList.remove('progress-track--indeterminate');
            const percent = Math.min(100, Math.round((progress / total) * 100));
            progressFill.style.width = `${percent}%`;
            loadingTitle.textContent = 'Consultando portarias no MD Legis';
            loadingStats.textContent = `Linha ${progress} de ${total} · ${percent}% concluído`;
        } else {
            progressTrack.classList.add('progress-track--indeterminate');
            progressFill.style.width = '35%';
            loadingTitle.textContent = 'Iniciando o processamento';
            loadingStats.textContent = 'Lendo planilha e abrindo o navegador...';
        }
    }

    function showDownloadButton(downloadUrl, fileName) {
        let downloadBtn = document.getElementById('downloadBtn');

        if (!downloadBtn) {
            downloadBtn = document.createElement('a');
            downloadBtn.id = 'downloadBtn';
            downloadBtn.className = 'download-btn';
            uploadBtn.parentNode.appendChild(downloadBtn);
        }

        downloadBtn.href = downloadUrl;
        downloadBtn.download = fileName || 'resultado.xlsx';
        downloadBtn.textContent = 'Baixar Resultados';
        downloadBtn.hidden = false;
    }

    function hideDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.hidden = true;
        }
    }

    async function pollJob(jobId) {
        while (true) {
            const response = await fetch(`/api/jobs/${jobId}`);
            const data = await parseJsonResponse(response);

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao consultar status');
            }

            if (data.status === 'completed') {
                return data;
            }

            if (data.status === 'failed') {
                throw new Error(data.error || 'Falha no processamento');
            }

            updateLoadingProgress(data.progress, data.total);
            await sleep(2000);
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        hideDownloadButton();
        setUploadBusy('Enviando...');
        showLoadingPanel();

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadData = await parseJsonResponse(response);

            if (!response.ok || !uploadData.jobId) {
                throw new Error(
                    uploadData.details || uploadData.error || 'Erro ao enviar arquivo'
                );
            }

            loadingTitle.textContent = 'Arquivo recebido!';
            loadingStats.textContent = 'Processamento em andamento no servidor';

            const result = await pollJob(uploadData.jobId);

            hideLoadingPanel();
            resetUploadButton();
            showDownloadButton(result.downloadUrl, result.fileName);
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao processar arquivo: ' + error.message);
            hideLoadingPanel();
            resetUploadButton();
        }

        fileInput.value = '';
    }

    document.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'xlsx') {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                alert('Por favor, selecione um arquivo .xlsx válido.');
            }
        }
    });
});
