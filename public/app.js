document.addEventListener('DOMContentLoaded', function () {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    uploadBtn.addEventListener('click', function () {
        fileInput.click();
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

    function setProgress(message) {
        let el = document.getElementById('progressIndicator');

        if (!el) {
            el = document.createElement('p');
            el.id = 'progressIndicator';
            el.className = 'progress-indicator';
            uploadBtn.parentNode.insertBefore(el, uploadBtn.nextSibling);
        }

        el.textContent = message;
    }

    function clearProgress() {
        const el = document.getElementById('progressIndicator');
        if (el) {
            el.remove();
        }
    }

    function resetUploadButton() {
        uploadBtn.textContent = 'Inserir Arquivo';
        uploadBtn.style.backgroundColor = 'transparent';
        uploadBtn.style.color = '#424242';
        uploadBtn.disabled = false;
        uploadBtn.style.cursor = 'pointer';
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
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

            if (data.total > 0) {
                setProgress(`Processando linha ${data.progress} de ${data.total}...`);
                uploadBtn.textContent = `${data.progress}/${data.total} linhas`;
            } else {
                setProgress('Iniciando processamento...');
                uploadBtn.textContent = 'Preparando...';
            }

            await sleep(2000);
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        uploadBtn.textContent = 'Enviando arquivo...';
        uploadBtn.disabled = true;
        uploadBtn.style.cursor = 'not-allowed';

        const existingDownloadBtn = document.getElementById('downloadBtn');
        if (existingDownloadBtn) {
            existingDownloadBtn.remove();
        }
        clearProgress();

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

            setProgress('Arquivo recebido. Processando em segundo plano...');
            uploadBtn.textContent = 'Processando...';

            const result = await pollJob(uploadData.jobId);

            uploadBtn.textContent = 'Arquivo processado!';
            uploadBtn.style.backgroundColor = '#424242';
            uploadBtn.style.color = 'white';
            clearProgress();

            const downloadBtn = document.createElement('button');
            downloadBtn.id = 'downloadBtn';
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = 'Baixar Resultados';
            downloadBtn.onclick = function () {
                window.location.href = result.downloadUrl;
            };

            uploadBtn.parentNode.insertBefore(downloadBtn, uploadBtn.nextSibling);

            resetUploadButton();
            uploadBtn.textContent = 'Arquivo processado!';
            uploadBtn.style.backgroundColor = '#424242';
            uploadBtn.style.color = 'white';

            setTimeout(() => {
                resetUploadButton();
                if (downloadBtn.parentNode) {
                    downloadBtn.remove();
                }
            }, 30000);
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao processar arquivo: ' + error.message);
            clearProgress();
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
