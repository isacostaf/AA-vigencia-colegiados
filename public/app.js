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
            uploadBtn.textContent = 'Processando...';
            uploadBtn.disabled = true;
            uploadBtn.style.cursor = 'not-allowed';

            removeDownloadButton();

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

            // sucesso
            uploadBtn.textContent = 'Arquivo processado!';
            uploadBtn.style.backgroundColor = '#424242';
            uploadBtn.style.color = 'white';

            createDownloadButton(data.downloadUrl);

        } catch (error) {

            console.error('ERRO FRONTEND');
            console.error(error);

            alert('Erro ao processar arquivo:\n\n' + error.message);

            resetUploadButton();

        } finally {

            fileInput.value = '';
        }
    }

    // =========================
    // BOTÃO DOWNLOAD
    // =========================
    function createDownloadButton(downloadUrl) {

        removeDownloadButton();

        const downloadBtn = document.createElement('button');

        downloadBtn.id = 'downloadBtn';

        downloadBtn.className = 'download-btn';

        downloadBtn.textContent = 'Baixar Resultado';

        downloadBtn.style.marginTop = '20px';

        downloadBtn.onclick = function () {

            console.log('Baixando:', downloadUrl);

            window.location.href = downloadUrl;
        };

        uploadBtn.parentNode.insertBefore(
            downloadBtn,
            uploadBtn.nextSibling
        );

        // reset automático
        setTimeout(() => {

            resetUploadButton();

            removeDownloadButton();

        }, 30000);
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