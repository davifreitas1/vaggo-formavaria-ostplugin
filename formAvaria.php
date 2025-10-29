<?php

require_once INCLUDE_DIR . 'class.plugin.php';
require_once INCLUDE_DIR . 'class.signal.php';
require_once INCLUDE_DIR . 'class.http.php';
require_once INCLUDE_DIR . 'api.tickets.php';
require_once INCLUDE_DIR . 'class.format.php';

class FormAvariaConfig extends PluginConfig {
    function getOptions() {
        return array(
            'campo_exemplo' => new TextboxField(array(
                'label'   => 'Campo de Exemplo',
                'hint'    => 'Este é um campo de teste do seu plugin',
                'configuration' => array('size'=>40, 'length'=>60)
            ))
        );
    }
}

class FormAvaria extends Plugin {
    var $config_class = "FormAvariaConfig";

    const MAX_FILES = 5;
    const MAX_SIZE_MB = 25;
    const TOPIC_ID = 12; // ATENÇÃO: Substitua este ID pelo ID do seu Tópico de Ajuda

    function bootstrap() {
        Signal::connect('page.avaria', array($this, 'handlePage'));
        Signal::connect('client.nav', array($this, 'addAvariaNavButton'));
    }

    function addAvariaNavButton($nav) {
        global $ost;
        require_once INCLUDE_DIR . 'class.nav.php';

        $nav->navs['avaria'] = array(
            'href' => 'avaria.php',
            'desc' => 'Formulário de Avaria'
        );

        $css = "
            <style>
                a.avaria {
                    background: url(./assets/default/images/icons/new.png) 6px 50% no-repeat;
                }
            </style>
        ";

        $ost->addExtraHeader($css);
    }

    /**
     * FUNÇÃO ATUALIZADA: Agora com validação e sanitização robustas.
     */
    private function createTicketFromPost() {
        $errors = array();
        $data = $_POST;
        $files = $_FILES['occurrencePhotos'];

        // --- 1. VALIDAÇÃO DOS DADOS (Obrigatoriedade e Formato) ---
        
        // Campos obrigatórios
        $required_fields = array(
            'fullName' => 'Nome Completo é obrigatório.',
            'email' => 'Email é obrigatório.',
            'phone' => 'Contato é obrigatório.',
            'plate' => 'Placa é obrigatória.',
            'occurrenceDate' => 'Data do Ocorrido é obrigatória.',
            'clientType' => 'Tipo do Cliente é obrigatório.',
            'building' => 'Empresarial é obrigatório.'
        );

        foreach ($required_fields as $field => $message) {
            if (empty($data[$field])) {
                $errors[] = $message;
            }
        }

        // Formatos específicos
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Formato de Email inválido.';
        }
        
        if (!empty($data['plate']) && !preg_match('/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/', $data['plate'])) {
            $errors[] = 'Formato de Placa inválido (Ex: ABC1D23).';
        }
        
        // --- 2. VALIDAÇÃO DOS FICHEIROS (Contagem e Tamanho) ---
        $total_size = 0;
        $file_count = 0;
        
        if ($files && !empty($files['name'][0])) {
            $file_count = count($files['name']);
            
            if ($file_count > self::MAX_FILES) {
                $errors[] = 'Você só pode enviar no máximo ' . self::MAX_FILES . ' arquivos.';
            }

            for ($i = 0; $i < $file_count; $i++) {
                if ($files['error'][$i] == UPLOAD_ERR_OK) {
                    $total_size += $files['size'][$i];
                } else if ($files['error'][$i] != UPLOAD_ERR_NO_FILE) {
                    $errors[] = 'Erro no upload do ficheiro: ' . $files['name'][$i];
                }
            }

            if ($total_size > (self::MAX_SIZE_MB * 1024 * 1024)) {
                $errors[] = 'O tamanho total dos arquivos excede o limite de ' . self::MAX_SIZE_MB . ' MB.';
            }
        }

        // --- 3. SE HOUVER ERROS, INTERROMPE ---
        if (!empty($errors)) {
            // Lança uma exceção que será apanhada pelo 'handlePage'
            throw new Exception("<b>Por favor, corrija os seguintes erros:</b><br>" . implode('<br>', $errors));
        }

        // --- 4. SANITIZAÇÃO E PREPARAÇÃO DO PAYLOAD (Anti-XSS) ---
        // Se chegámos aqui, os dados são válidos. Agora vamos limpá-los.

        $messageBody = 'Formulário de Avaria enviado via Portal do Cliente.';

        $payload = array(
            'source'    => 'Web',
            'topicId'   => self::TOPIC_ID, 
            
            // Sanitizamos todos os campos de texto com Format::htmlchars
            'name'      => Format::htmlchars($data['fullName']),
            'email'     => $data['email'], // O email é seguro após FILTER_VALIDATE_EMAIL
            'phone'     => Format::htmlchars($data['phone']),
            'subject'   => sprintf('Formulário de Avaria: %s (%s)', Format::htmlchars($data['plate']), Format::htmlchars($data['fullName'])),
            'message' => $messageBody,
            'type'    => 'text/html', 
            
            // --- CAMPOS CUSTOMIZADOS (Também sanitizados) ---
            'placa'               => Format::htmlchars($data['plate']),
            'modelo'              => Format::htmlchars($data['vehicleModel']),
            'cor'                 => Format::htmlchars($data['color']),
            'data_ocorrencia'     => $data['occurrenceDate'],
            'data_solicitacao'    => $data['requestDate'],
            'tipo_usuario'        => $data['clientType'],
            'forma_entrada'       => $data['entryMethod'],
            'numeracao_entrada'   => Format::htmlchars($data['entryNumber']),
            'hora_entrada'        => $data['entryTime'],
            'hora_saida'          => $data['exitTime'],
            'edificio'            => $data['building'],
            'empresa'             => Format::htmlchars($data['company']),
            'numero_sala'         => Format::htmlchars($data['roomNumber']),
            'funcionario'         => Format::htmlchars($data['attendingEmployee']),
            'descricao'           => Format::htmlchars($data['damageDescription'])
        );

        // 5. Processar anexos (apenas se válidos)
        $attachments = array();
        if ($file_count > 0) {
            for ($i = 0; $i < $file_count; $i++) {
                if ($files['error'][$i] == UPLOAD_ERR_OK) {
                    $attachments[] = array(
                        'name' => $files['name'][$i],
                        'type' => $files['type'][$i],
                        'data' => base64_encode(file_get_contents($files['tmp_name'][$i])),
                        'encoding' => 'base64'
                    );
                }
            }
        }
        $payload['attachments'] = $attachments;

        // 6. Criar o ticket
        $ticket = null;
        $api = new TicketApiController();
        
        if (!($ticket = $api->createTicket($payload, false, true))) {
            throw new Exception("Erro interno ao criar o ticket: " . $api->getlog());
        }

        return $ticket;
    }

    /**
     * ATUALIZADO: Agora apanha erros de validação e exibe-os.
     */
    function handlePage() {
        
        $html_content = ''; // Inicializa a variável
        $form_error = null; // Para guardar a mensagem de erro

        // --- Bloco POST: Tenta criar o ticket e responde com JSON ---
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            try {
                // 1. Cria o ticket
                $ticket = $this->createTicketFromPost();
                
                // 2. Responde com SUCESSO (JSON)
                header('Content-Type: application/json');
                echo json_encode(['success' => true, 'ticketId' => $ticket->getNumber()]);
                exit;

            } catch (Exception $e) {
                // 3. Responde com ERRO (JSON)
                header('Content-Type: application/json');
                // Envia um código de erro HTTP para o 'fetch' apanhar
                http_response_code(400); 
                $form_error = $e->getMessage();
                echo json_encode(['success' => false, 'message' => $form_error]);
                error_log("Erro no Plugin Avaria: " . $e->getMessage());
                exit;
            }
        }
        
        // --- Bloco GET (ou POST com falha): Exibe o formulário ---
        try {
            $base_path = dirname(__FILE__);
            $html_content = file_get_contents($base_path . '/form/index.html');
            
            // --- NOVO: Se houve um erro, injeta a mensagem no HTML ---
            if ($form_error) {
                $error_html = '
                    <div style="
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                        background-color: #fee2e2;
                        color: #b91c1c;
                        border: 1px solid #fca5a5;
                        border-radius: 6px;
                        font-family: \'Rubik\', sans-serif;
                    ">
                        ' . $form_error . '
                    </div>
                ';
                // Injeta a mensagem de erro logo após o <header>
                $html_content = str_replace(
                    '</header>',
                    '</header>' . $error_html,
                    $html_content
                );
            }

            // O resto da sua lógica para carregar CSS/JS/Imagens...
            $css_content = file_get_contents($base_path . '/form/css/style.css');
            $js_content = file_get_contents($base_path . '/form/js/script.js');

            $img_path = $base_path . '/form/img/marca-vaggo.svg';
            $img_uri = '';
            if (file_exists($img_path) && filesize($img_path) > 0) {
                $img_data = base64_encode(file_get_contents($img_path));
                $img_uri = 'data:image/svg+xml;base64,' . $img_data;
            }
            $css_content = str_replace(
                'url("../img/marca-vaggo.svg")',
                'url("' . $img_uri . '")',
                $css_content
            );

            $html_content = str_replace('<link rel="stylesheet" href="./css/style.css">', "<style>\n" . $css_content . "\n</style>", $html_content);
            $html_content = str_replace('<script src="./js/script.js"></script>', "<script>\n" . $js_content . "\n</script>", $html_content);

            echo $html_content;

        } catch (Exception $e) {
            echo "Erro crítico ao carregar o plugin do formulário de avaria.";
            error_log("Erro no Plugin Avaria: " . $e->getMessage());
        }
        
        exit;
    }
}
?>