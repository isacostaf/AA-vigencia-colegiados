document.addEventListener('DOMContentLoaded', function () {

    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');

    // =========================
    // CLICK BOTÃO
    // =========================
    uploadBtn.addEventListener('click', function () {
        fileInput.click();
    });

    // =========================
    // SELECIONA ARQUIVO
    // =========================
    fileInput.addEventListener('change', function (event) {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        if (fileExtension !== 'xlsx') {

            alert('Por favor selecione um arquivo .xlsx válido');

            fileInput.value = '';

            return;
        }

        uploadFile(file);
    });

    // =========================
    // UPLOAD
    // =========================
    async function uploadFile(file) {

        try {

            const formData = new FormData();

            formData.append('file', file);

            // loading
            uploadBtn.textContent = 'Enviando arquivo...';
            uploadBtn.disabled = true;
            uploadBtn.style.cursor = 'not-allowed';

            removeDownloadButton();
            removeProgressIndicator();

            console.log('Enviando arquivo...');

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            console.log('RESPOSTA BACKEND:', data);

            // erro backend
            if (!response.ok || !data.success) {

                throw new Error(
                    data.error ||
                    data.details ||
                    'Erro ao processar arquivo'
                );
            }

            // sucesso - iniciar polling
            if (data.jobId) {
                pollJobStatus(data.jobId);
            } else {
                throw new Error('JobId não recebido do servidor');
            }

        } catch (error) {

            console.error('ERRO FRONTEND');
            console.error(error);

            alert('Erro ao processar arquivo:\n\n' + error.message);

            resetUploadButton();
            removeProgressIndicator();

        } finally {

            fileInput.value = '';
        }
    }

    // =========================
    // POLLING JOB STATUS
    // =========================
    function pollJobStatus(jobId) {

        // Criar indicador de progresso
        const progressIndicator = document.createElement('div');
        progressIndicator.id = 'progressIndicator';
        progressIndicator.style.marginTop = '20px';
        progressIndicator.style.textAlign = 'center';
        progressIndicator.innerHTML = `
            <div style="font-size: 0.9rem; color: #424242; margin-bottom: 10px;">
                Processando... <span id="progressText">0%</span>
            </div>
            <div style="width: 100%; max-width: 300px; height: 8px; background-color: #e0e0e0; border-radius: 4px; margin: 0 auto; overflow: hidden;">
                <div id="progressBar" style="width: 0%; height: 100%; background-color: #424242; transition: width 0.3s ease;"></div>
            </div>
        `;
        uploadBtn.parentNode.insertBefore(progressIndicator, uploadBtn.nextSibling);

        uploadBtn.textContent = 'Processando...';

        const pollInterval = setInterval(() => {
            fetch(`/job/${jobId}?t=${Date.now()}`)
                .then(response => response.json())
                .then(data => {
                    const progressBar = document.getElementById('progressBar');
                    const progressText = document.getElementById('progressText');

                    if (progressBar && progressText) {
                        progressBar.style.width = `${data.percentage}%`;
                        progressText.textContent = `${data.percentage}% (${data.progress}/${data.total} linhas)`;
                    }

                    if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        showDownloadButton(jobId, data.resultFileName);
                    } else if (data.status === 'error') {
                        clearInterval(pollInterval);
                        alert('Erro ao processar arquivo: ' + data.error);
                        resetUploadButton();
                        removeProgressIndicator();
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar status:', error);
                    clearInterval(pollInterval);
                    alert('Erro ao verificar status do processamento');
                    resetUploadButton();
                    removeProgressIndicator();
                });
        }, 2000); // Poll a cada 2 segundos
    }

    // =========================
    // SHOW DOWNLOAD BUTTON
    // =========================
    function showDownloadButton(jobId, fileName) {
        removeProgressIndicator();

        uploadBtn.textContent = 'Arquivo processado!';
        uploadBtn.style.backgroundColor = '#424242';
        uploadBtn.style.color = 'white';

        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'downloadBtn';
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Baixar Resultados';
        downloadBtn.onclick = function() {
            window.location.href = `/download/${jobId}`;
        };

        uploadBtn.parentNode.insertBefore(downloadBtn, uploadBtn.nextSibling);

        // Reset após 10 segundos
        setTimeout(function() {
            resetUploadButton();
            removeDownloadButton();
        }, 10000);
    }

    // =========================
    // REMOVE PROGRESS INDICATOR
    // =========================
    function removeProgressIndicator() {
        const existingProgress = document.getElementById('progressIndicator');
        if (existingProgress) {
            existingProgress.remove();
        }
    }


    // =========================
    // REMOVE DOWNLOAD
    // =========================
    function removeDownloadButton() {

        const existingDownloadBtn =
            document.getElementById('downloadBtn');

        if (existingDownloadBtn) {
            existingDownloadBtn.remove();
        }
    }

    // =========================
    // RESET BOTÃO
    // =========================
    function resetUploadButton() {

        uploadBtn.textContent = 'Inserir Arquivo';

        uploadBtn.style.backgroundColor = 'transparent';

        uploadBtn.style.color = '#424242';

        uploadBtn.disabled = false;

        uploadBtn.style.cursor = 'pointer';
    }

    // =========================
    // DRAG OVER
    // =========================
    document.addEventListener('dragover', function (e) {

        e.preventDefault();

        e.stopPropagation();
    });

    // =========================
    // DROP
    // =========================
    document.addEventListener('drop', function (e) {

        e.preventDefault();

        e.stopPropagation();

        const files = e.dataTransfer.files;

        if (files.length === 0) {
            return;
        }

        const file = files[0];

        const fileName = file.name;

        const fileExtension =
            fileName.split('.').pop().toLowerCase();

        if (fileExtension !== 'xlsx') {

            alert('Por favor selecione um arquivo .xlsx válido');

            return;
        }

        uploadFile(file);
    });

});