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
            if (data.success) {

                uploadBtn.textContent = 'Arquivo processado!';
                uploadBtn.style.backgroundColor = '#424242';
                uploadBtn.style.color = 'white';

                const downloadBtn = document.createElement('button');

                downloadBtn.id = 'downloadBtn';
                downloadBtn.className = 'download-btn';

                downloadBtn.textContent = 'Baixar Resultados';

                downloadBtn.onclick = function() {
                    window.location.href = data.downloadUrl;
                };

                uploadBtn.parentNode.insertBefore(
                    downloadBtn,
                    uploadBtn.nextSibling
                );

                // reativa botão
                uploadBtn.disabled = false;
                uploadBtn.style.cursor = 'pointer';

                // reset automático
                setTimeout(() => {

                    uploadBtn.textContent = 'Inserir Arquivo';
                    uploadBtn.style.backgroundColor = 'transparent';
                    uploadBtn.style.color = '#424242';

                    if (downloadBtn) {
                        downloadBtn.remove();
                    }

                }, 10000);

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
