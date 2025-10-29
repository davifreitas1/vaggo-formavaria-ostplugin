/**
 * Módulo para gerenciar o formulário de avaria.
 * Encapsula toda a lógica, seletores de DOM, manipulação de eventos e submissão.
 */
const DamageFormManager = (() => {
    const MAX_FILES = 5;
    const MAX_SIZE_MB = 25;

    // ---- SELETORES DE DOM ---- //
    const dom = {
        form: document.getElementById('avaria-form'),
        mainElement: document.querySelector('main'),
        feedbackOverlay: document.getElementById('feedback-overlay'),
        loadingIndicator: document.getElementById('loading-indicator'),
        successMessage: document.getElementById('success-message'),
        errorMessage: document.getElementById('error-message'),
        submitButton: document.querySelector('button[type="submit"]'),
        phoneInput: document.getElementById('phone'),
        plateInput: document.getElementById('plate'),
        vehicleModelInput: document.getElementById('vehicleModel'),
        colorInput: document.getElementById('color'),
        clientTypeSelect: document.getElementById('clientType'),
        companyInputGroup: document.getElementById('company-input-group'),
        locationFieldsWrapper: document.getElementById('location-fields-wrapper'),
        entryMethodRadios: document.querySelectorAll('input[name="entryMethod"]'),
        entryDetailsGroup: document.getElementById('entry-details-group'),
        entryDetailsInput: document.getElementById('entryNumber'),
        entryDetailsLabel: document.getElementById('entryNumberLabel'),
        optionTicketRadio: document.getElementById('option-ticket'),
        attendedRadios: document.querySelectorAll('input[name="attendedByEmployee"]'),
        employeeNameWrapper: document.getElementById('employee-name-wrapper'),
        requestDateInput: document.getElementById('requestDate'),
        occurrencePhotosInput: document.getElementById('occurrencePhotos'),
    };

    // ---- MÓDULO DE UI ---- //
    const ui = {
        toggleVisibility: (element, show) => {
            element.classList.toggle('hide', !show);
        },
        toggleBlur: (element, blur) => {
            element.classList.toggle('blurred', blur);
        },
        setSubmitButtonState: (text, disabled) => {
            dom.submitButton.textContent = text;
            dom.submitButton.disabled = disabled;
        },
        showLoading: () => {
            ui.toggleBlur(dom.mainElement, true);
            ui.toggleVisibility(dom.feedbackOverlay, true);
            ui.toggleVisibility(dom.loadingIndicator, true);
            ui.toggleVisibility(dom.successMessage, false);
            ui.toggleVisibility(dom.errorMessage, false);
        },
        showSuccess: () => {
            ui.toggleVisibility(dom.loadingIndicator, false);
            ui.toggleVisibility(dom.successMessage, true);
        },
        showError: () => {
            ui.toggleVisibility(dom.loadingIndicator, false);
            ui.toggleVisibility(dom.errorMessage, true);
        },
        hideFeedback: () => {
            ui.toggleBlur(dom.mainElement, false);
            ui.toggleVisibility(dom.feedbackOverlay, false);
        },
        resetConditionalFields: () => {
            ui.toggleVisibility(dom.companyInputGroup, false);
            ui.toggleVisibility(dom.entryDetailsGroup, false);
            ui.toggleVisibility(dom.employeeNameWrapper, false);
            dom.locationFieldsWrapper.classList.add('company-hidden');
        }
    };

    // ---- MÓDULO DE FORMATAÇÃO E VALIDAÇÃO ---- //
    const formatter = {
        toUpperCase: event => {
            event.target.value = event.target.value.toUpperCase();
        },
        phone: event => {
            const input = event.target;
            let value = input.value.replace(/\D/g, '').substring(0, 11);

            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{2})(\d{4})(.*)/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(.*)/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
            
            input.value = value;
        },
        setCurrentDate: () => {
            const today = new Date().toISOString().split('T')[0];
            dom.requestDateInput.value = today;
        },
        validateFiles: () => {
            const files = dom.occurrencePhotosInput.files;
            if (files.length > MAX_FILES) {
                alert(`Você pode enviar no máximo ${MAX_FILES} arquivos.`);
                dom.occurrencePhotosInput.value = '';
                return false;
            }

            const totalSizeInMB = Array.from(files).reduce((total, file) => total + file.size, 0) / (1024 * 1024);
            if (totalSizeInMB > MAX_SIZE_MB) {
                alert(`O tamanho total dos arquivos (${totalSizeInMB.toFixed(2)} MB) excede o limite de ${MAX_SIZE_MB} MB.`);
                dom.occurrencePhotosInput.value = '';
                return false;
            }
            return true;
        },
        fileToBase64: (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            // 'reader.result' será 'data:image/png;base64,iVBORw0KGgo...'
            // Nós queremos apenas a parte depois da vírgula.
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        })
    };

    // ---- MANIPULADORES DE EVENTOS ---- //
    const eventHandlers = {
        handleClientTypeChange: event => {
            const { value } = event.target;
            const isCompanyRequired = value === 'mensalista' || value === 'credenciado';
            ui.toggleVisibility(dom.companyInputGroup, isCompanyRequired);
            dom.locationFieldsWrapper.classList.toggle('company-hidden', !isCompanyRequired);
            
            if (value === 'avulso') {
                dom.optionTicketRadio.checked = true;
                dom.optionTicketRadio.dispatchEvent(new Event('change'));
                const radioGroup = dom.optionTicketRadio.closest('fieldset');
                const errorMessage = radioGroup.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.classList.remove('show');
                }
                radioGroup.querySelectorAll('.radio-input').forEach(radio => radio.classList.remove('invalid-field'));
            }
        },
        handleEntryMethodChange: event => {
            const { value } = event.target;
            if (value === 'leitura_placa') {
                ui.toggleVisibility(dom.entryDetailsGroup, false);
                return;
            }

            ui.toggleVisibility(dom.entryDetailsGroup, true);
            dom.entryDetailsInput.value = '';
            dom.entryDetailsInput.removeEventListener('input', formatter.toUpperCase);

            const labelMap = { 'Ticket': 'Número do Ticket', 'Cartão': 'Número do Cartão', 'Tag': 'Número da Tag' };
            dom.entryDetailsLabel.textContent = labelMap[value] || 'Número / Nome';
            dom.entryDetailsInput.type = (value === 'ticket' || value === 'cartao' || value === 'tag') ? 'number' : 'text';
        },
        handleAttendedChange: event => {
            ui.toggleVisibility(dom.employeeNameWrapper, event.target.value === 'sim');
        },
        handleFormSubmit: async event => {
            // 1. IMPEDE O ENVIO PADRÃO (sempre)
            event.preventDefault(); 

            // ---- Bloco de Validação (O seu código existente) ---- //
            let isFormValid = true;
            dom.form.querySelectorAll('.error-message').forEach(msg => msg.classList.remove('show'));

            for (const input of dom.form.querySelectorAll('[required]')) {
                const parentGroup = input.closest('.input-group, fieldset');
                const errorMessage = parentGroup.querySelector('.error-message');

                if (!input.checkValidity()) {
                    isFormValid = false;
                    input.classList.add('invalid-field');
                    
                    if (errorMessage) {
                        let message = '';
                        if (input.validity.valueMissing) {
                            message = input.dataset.errorRequired || 'Este campo é obrigatório.';
                        } else if (input.validity.patternMismatch) {
                            message = input.dataset.errorPattern || 'O formato deste campo é inválido.';
                        } else {
                            message = input.validationMessage;
                        }
                        errorMessage.textContent = message;
                        errorMessage.classList.add('show');
                    }
                    
                    if (input.type === 'radio') {
                         parentGroup.querySelectorAll('.radio-input').forEach(radio => radio.classList.add('invalid-field'));
                    }
                } else {
                    input.classList.remove('invalid-field');
                     if (input.type === 'radio') {
                         parentGroup.querySelectorAll('.radio-input').forEach(radio => radio.classList.remove('invalid-field'));
                    }
                }
            }
            // ---- Fim do Bloco de Validação ---- //

            if (!isFormValid) {
                return; // Para se a validação falhar
            }
            
            // 2. SE FOR VÁLIDO, mostramos o loading e preparamos para o envio
            const originalButtonText = dom.submitButton.textContent;
            ui.setSubmitButtonState('Enviando...', true);
            ui.showLoading(); // Mostra o "Enviando..."

            try {
                // 3. Criamos o FormData (isto apanha os ficheiros automaticamente)
                const formData = new FormData(dom.form);

                // 4. Enviamos os dados para o mesmo 'avaria.php' com fetch()
                const response = await fetch('avaria.php', {
                    method: 'POST',
                    body: formData, 
                    // Não defina 'Content-Type', o navegador fá-lo-á
                    // corretamente para 'multipart/form-data'
                });

                // 5. Lemos a resposta do PHP (que será JSON)
                const result = await response.json();

                if (!response.ok || !result.success) {
                    // Se o PHP retornar um erro (ex: 400 ou success: false)
                    throw new Error(result.message || 'Erro desconhecido no servidor.');
                }

                // 6. SUCESSO!
                ui.showSuccess(); // Mostra o 'checkmark' de sucesso
                setTimeout(() => {
                    dom.form.reset();
                    formatter.setCurrentDate();
                    ui.resetConditionalFields();
                    ui.hideFeedback();
                }, 3000); // Reseta o formulário após 3 segundos

            } catch (error) {
                // 7. ERRO!
                console.error('Erro no handleFormSubmit:', error);
                ui.showError(); // Mostra o 'X' de erro
                setTimeout(() => {
                    ui.hideFeedback();
                }, 3000);
            } finally {
                // Restaura o botão em qualquer caso
                ui.setSubmitButtonState(originalButtonText, false);
            }
        }
    };

    // ---- FUNÇÃO DE INICIALIZAÇÃO ---- //
    const init = () => {
        formatter.setCurrentDate();
        eventHandlers.handleClientTypeChange({ target: dom.clientTypeSelect });

        dom.form.addEventListener('submit', eventHandlers.handleFormSubmit);
        dom.clientTypeSelect.addEventListener('change', eventHandlers.handleClientTypeChange);
        dom.attendedRadios.forEach(radio => radio.addEventListener('change', eventHandlers.handleAttendedChange));
        dom.entryMethodRadios.forEach(radio => radio.addEventListener('change', eventHandlers.handleEntryMethodChange));
        
        dom.phoneInput.addEventListener('input', formatter.phone);
        dom.plateInput.addEventListener('input', formatter.toUpperCase);
        dom.vehicleModelInput.addEventListener('input', formatter.toUpperCase);
        dom.colorInput.addEventListener('input', formatter.toUpperCase);

        dom.form.querySelectorAll('[required]').forEach(input => {
            input.addEventListener('input', () => {
                const parentGroup = input.closest('.input-group, fieldset');
                const errorMessage = parentGroup.querySelector('.error-message');

                if (input.checkValidity()) {
                    input.classList.remove('invalid-field');
                    if(errorMessage) errorMessage.classList.remove('show');

                    if (input.type === 'radio') {
                         parentGroup.querySelectorAll('.radio-input').forEach(radio => radio.classList.remove('invalid-field'));
                    }
                }
            });
        });

        dom.occurrencePhotosInput.addEventListener('change', formatter.validateFiles);
    };

    return {
        init: init
    };
})();

document.addEventListener('DOMContentLoaded', DamageFormManager.init);