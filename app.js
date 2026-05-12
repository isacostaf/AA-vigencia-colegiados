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
        uploadBtn.textContent = 'Processando...';
        uploadBtn.disabled = true;
        uploadBtn.style.cursor = 'not-allowed';
        
        // Remover botão de download anterior se existir
        const existingDownloadBtn = document.getElementById('downloadBtn');
        if (existingDownloadBtn) {
            existingDownloadBtn.remove();
        }
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Arquivo processado com sucesso!');
                
                // Exibir feedback visual
                uploadBtn.textContent = 'Arquivo processado!';
                uploadBtn.style.backgroundColor = '#424242';
                uploadBtn.style.color = 'white';
                
                // Criar botão de download
                const downloadBtn = document.createElement('button');
                downloadBtn.id = 'downloadBtn';
                downloadBtn.className = 'download-btn';
                downloadBtn.textContent = 'Baixar Resultados';
                downloadBtn.onclick = function() {
                    downloadFile(data.fileData, data.fileName);
                };
                
                // Inserir botão de download após o botão de upload
                uploadBtn.parentNode.insertBefore(downloadBtn, uploadBtn.nextSibling);
                
                // Reset após 3 segundos
                setTimeout(function() {
                    uploadBtn.textContent = 'Inserir Arquivo';
                    uploadBtn.style.backgroundColor = 'transparent';
                    uploadBtn.style.color = '#424242';
                    uploadBtn.disabled = false;
                    uploadBtn.style.cursor = 'pointer';
                }, 3000);
                
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
    
    function downloadFile(base64Data, fileName) {
        // Converte base64 para blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Cria link de download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Limpa
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
