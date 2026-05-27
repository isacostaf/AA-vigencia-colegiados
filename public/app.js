document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const content = document.querySelector('.content');
    
    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        
        if (file) {
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            
            if (fileExtension === 'xlsx') {
                uploadFile(file);
            } else {
                alert('Por favor, selecione um arquivo .xlsx válido.');
                fileInput.value = '';
            }
        }
    });
    
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Mostrar estado de carregamento
        uploadBtn.textContent = 'Enviando arquivo...';
        uploadBtn.disabled = true;
        uploadBtn.style.cursor = 'not-allowed';

        // Remover botão de download anterior se existir
        const existingDownloadBtn = document.getElementById('downloadBtn');
        if (existingDownloadBtn) {
            existingDownloadBtn.remove();
        }

        // Remover indicador de progresso anterior se existir
        const existingProgress = document.getElementById('progressIndicator');
        if (existingProgress) {
            existingProgress.remove();
        }

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.jobId) {
                console.log('Job criado:', data.jobId);
                pollJobStatus(data.jobId);
            } else {
                throw new Error(data.error || 'Erro desconhecido');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao processar arquivo: ' + error.message);

            // Reset do botão
            uploadBtn.textContent = 'Inserir Arquivo';
            uploadBtn.style.backgroundColor = 'transparent';
            uploadBtn.style.color = '#424242';
            uploadBtn.disabled = false;
            uploadBtn.style.cursor = 'pointer';
        });

        fileInput.value = '';
    }

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
            fetch(`/job/${jobId}`)
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
                        if (progressIndicator) {
                            progressIndicator.remove();
                        }
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar status:', error);
                    clearInterval(pollInterval);
                    alert('Erro ao verificar status do processamento');
                    resetUploadButton();
                    if (progressIndicator) {
                        progressIndicator.remove();
                    }
                });
        }, 2000); // Poll a cada 2 segundos
    }

    function showDownloadButton(jobId, fileName) {
        const progressIndicator = document.getElementById('progressIndicator');
        if (progressIndicator) {
            progressIndicator.remove();
        }

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
            downloadBtn.remove();
        }, 10000);
    }

    function resetUploadButton() {
        uploadBtn.textContent = 'Inserir Arquivo';
        uploadBtn.style.backgroundColor = 'transparent';
        uploadBtn.style.color = '#424242';
        uploadBtn.disabled = false;
        uploadBtn.style.cursor = 'pointer';
    }
    
    // Prevenir comportamento padrão de arrastar e soltar
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            
            if (fileExtension === 'xlsx') {
                fileInput.files = files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            } else {
                alert('Por favor, selecione um arquivo .xlsx válido.');
            }
        }
    });
});
