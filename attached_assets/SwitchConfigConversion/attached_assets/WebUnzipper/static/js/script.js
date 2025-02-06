document.addEventListener('DOMContentLoaded', function() {
    const inputConfig = document.getElementById('input-config');
    const outputConfig = document.getElementById('output-config');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const alertContainer = document.getElementById('alert-container');

    function showAlert(message, type = 'danger') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
    }

    function setLoading(loading) {
        if (loading) {
            convertBtn.classList.add('loading');
            convertBtn.disabled = true;
        } else {
            convertBtn.classList.remove('loading');
            convertBtn.disabled = false;
        }
    }

    convertBtn.addEventListener('click', async function() {
        const config = inputConfig.value.trim();
        if (!config) {
            showAlert('Please enter a configuration to convert');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    config: config
                })
            });

            const data = await response.json();
            if (response.ok) {
                outputConfig.value = data.result;
                copyBtn.disabled = false;
                showAlert('Configuration converted successfully!', 'success');
            } else {
                showAlert(data.error || 'Conversion failed');
            }
        } catch (error) {
            showAlert('An error occurred during conversion');
            console.error('Conversion error:', error);
        } finally {
            setLoading(false);
        }
    });

    copyBtn.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(outputConfig.value);
            showAlert('Configuration copied to clipboard!', 'success');
        } catch (err) {
            showAlert('Failed to copy to clipboard');
        }
    });

    clearBtn.addEventListener('click', function() {
        inputConfig.value = '';
        outputConfig.value = '';
        copyBtn.disabled = true;
        alertContainer.innerHTML = '';
    });
});
