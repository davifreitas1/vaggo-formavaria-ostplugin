/**
 * Módulo para gerenciar o formulário de avaria.
 * Encapsula toda a lógica, seletores de DOM, manipulação de eventos e submissão.
 */
const DamageFormManager = (() => {
    // ---- CONFIGURAÇÕES E CONSTANTES ---- //
    /* const WEBHOOK_URL = 'https://n8n-n8n.e5zlch.easypanel.host/webhook-test/formulario'; */
/*     const OSTICKET_API_URL = 'https://recifepark.com/rpdemandas/api/tickets.json'; // MUDE AQUI
    const OSTICKET_API_KEY = 'D1D4B41885D25B5F43727BDCC2AC7993'; // MUDE AQUI */
    const PROXY_API_URL = 'http://localhost:3000/api/ticket'; // URL do seu proxy
    const OSTICKET_TOPIC_ID = 1; // MUDE AQUI (Ex: 1 = Consultas Gerais, veja no Painel Admin)

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
            const isCompanyRequired = value === 'Mensalista' || value === 'Credenciado';
            ui.toggleVisibility(dom.companyInputGroup, isCompanyRequired);
            dom.locationFieldsWrapper.classList.toggle('company-hidden', !isCompanyRequired);
            
            if (value === 'Avulso') {
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
            if (value === 'Leitura de Placa') {
                ui.toggleVisibility(dom.entryDetailsGroup, false);
                return;
            }

            ui.toggleVisibility(dom.entryDetailsGroup, true);
            dom.entryDetailsInput.value = '';
            dom.entryDetailsInput.removeEventListener('input', formatter.toUpperCase);

            const labelMap = { 'Ticket': 'Número do Ticket', 'Cartão': 'Número do Cartão', 'Tag': 'Número da Tag' };
            dom.entryDetailsLabel.textContent = labelMap[value] || 'Número / Nome';
            dom.entryDetailsInput.type = (value === 'Ticket' || value === 'Cartão' || value === 'Tag') ? 'number' : 'text';
        },
        handleAttendedChange: event => {
            ui.toggleVisibility(dom.employeeNameWrapper, event.target.value === 'Sim');
        },
        handleFormSubmit: async event => {
            event.preventDefault();
            
            // ---- Bloco de Validação (IDÊNTICO AO ORIGINAL) ---- //
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

            if (!isFormValid) {
                return;
            }
            // ---- Fim do Bloco de Validação ---- //


            // ---- NOVO BLOCO DE SUBMISSÃO (JSON para osTicket) ---- //
            const originalButtonText = dom.submitButton.textContent;
            ui.setSubmitButtonState('Enviando...', true);
            ui.showLoading();

            try {
                // 1. Coletar dados do formulário de forma fácil
                const formData = new FormData(dom.form);
                const formProps = Object.fromEntries(formData.entries());

                // 2. Formatar a mensagem principal (pode ser HTML)
                // Usando os 'name' attributes do seu index.html
                let messageBody = `
                    <strong>Relatório de Avaria de Veículo</strong><br><br>
                    <strong>Cliente:</strong> ${formProps.fullName}<br>
                    <strong>Contato:</strong> ${formProps.phone}<br>
                    <strong>Email:</strong> ${formProps.email} <br><br>
                    
                    <strong>Veículo:</strong><br>
                    <strong>Placa:</strong> ${formProps.plate}<br>
                    <strong>Modelo:</strong> ${formProps.vehicleModel || 'Não informado'}<br>
                    <strong>Cor:</strong> ${formProps.color || 'Não informado'}<br><br>
                    
                    <strong>Ocorrência:</strong><br>
                    <strong>Data do Ocorrido:</strong> ${formProps.occurrenceDate}<br>
                    <strong>Data da Solicitação:</strong> ${formProps.requestDate}<br>
                    <strong>Tipo de Cliente:</strong> ${formProps.clientType}<br>
                    <strong>Forma de Entrada:</strong> ${formProps.entryMethod}<br>
                    <strong>Detalhe (Ticket/Cartão/Tag):</strong> ${formProps.entryNumber || 'N/A'}<br>
                    <strong>Horário Entrada:</strong> ${formProps.entryTime || 'Não informado'}<br>
                    <strong>Horário Saída:</strong> ${formProps.exitTime || 'Não informado'}<br><br>

                    <strong>Localização:</strong><br>
                    <strong>Empresarial:</strong> ${formProps.building}<br>
                    <strong>Empresa:</strong> ${formProps.company || 'N/A'}<br>
                    <strong>Sala:</strong> ${formProps.roomNumber || 'Não informado'}<br><br>

                    <strong>Atendimento:</strong><br>
                    <strong>Atendido por funcionário:</strong> ${formProps.attendedByEmployee || 'Não'}<br>
                    <strong>Nome do Funcionário:</strong> ${formProps.attendingEmployee || 'N/A'}<br><br>

                    <strong>Observações:</strong><br>
                    <p>${formProps.damageDescription || 'Nenhuma'}</p>
                `;

                // 3. Processar anexos em paralelo
                const files = dom.occurrencePhotosInput.files;
                const attachmentPromises = Array.from(files).map(file => 
                    formatter.fileToBase64(file).then(base64Data => ({
                        name: file.name,
                        type: file.type,
                        encoding: 'base64',
                        data: base64Data
                    }))
                );
                
                const attachments = await Promise.all(attachmentPromises);

                // 4. Montar o payload final do osTicket
                const osTicketPayload = {
                    name: formProps.fullName,
                    email: formProps.email,
                    subject: `Formulário de Avaria: ${formProps.plate} (${formProps.fullName})`,
                    
                    // A documentação do osTicket especifica o formato RFC 2397 para a mensagem
                    message: `data:text/html;charset=utf-8,${encodeURIComponent(messageBody)}`,
                    type: 'text/html', 
                    
                    source: 'API',
                    topicId: OSTICKET_TOPIC_ID, 
                    
                    // Mapeando campos customizados do osTicket (se existirem)
                    // O 'name' aqui deve ser o 'name' configurado no painel do osTicket
                    phone: formProps.phone, 
                    // Você pode adicionar outros campos customizados aqui.
                    // Ex: 'plate': formProps.plate (se existir um campo 'plate' no osTicket)

                    attachments: attachments
                };

                // 5. Enviar a requisição para o osTicket
                const response = await fetch(PROXY_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(osTicketPayload),
                });

                if (response.ok || response.status === 201) { // 201 Created é o sucesso
                    ui.showSuccess();
                    setTimeout(() => {
                        dom.form.reset();
                        formatter.setCurrentDate();
                        ui.resetConditionalFields();
                        ui.hideFeedback();
                    }, 3000);
                } else {
                    const errorBody = await response.text();
                    console.error('Falha no envio para o osTicket:', response.status, errorBody);
                    throw new Error(`Falha no envio: ${response.status} ${response.statusText}. Detalhe: ${errorBody}`);
                }
            } catch (error) {
                console.error('Erro no handleFormSubmit:', error);
                ui.showError();
                setTimeout(() => {
                    ui.hideFeedback();
                }, 3000);
            } finally {
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