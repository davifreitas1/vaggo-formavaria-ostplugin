<?php

require_once INCLUDE_DIR . 'class.plugin.php';
require_once INCLUDE_DIR . 'class.signal.php';
// require_once CLIENTINC_DIR . 'class.nav.php'; // Removido do topo

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

    function bootstrap() {
        Signal::connect('page.avaria', array($this, 'handlePage'));
        Signal::connect('client.nav', array($this, 'addAvariaNavButton'));
    }

    /**
     * Adiciona o link "Formulário de Avaria" no cabeçalho do cliente.
     */
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
     * Renderiza a página standalone do formulário.
     */
    function handlePage() {
        try {
            $base_path = dirname(__FILE__);

            // 1. Carregar os conteúdos
            $html_content = file_get_contents($base_path . '/form/index.html');
            $css_content = file_get_contents($base_path . '/form/css/style.css');
            $js_content = file_get_contents($base_path . '/form/js/script.js');

            // 2. Processar a imagem
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

            // 3. Criar o HTML do "Botão Voltar"
            $voltarButtonHtml = '
                <a href="index.php" style="
                    display: inline-block; 
                    margin-bottom: 1.5rem; 
                    padding: 8px 12px; 
                    background-color: #f3f4f6; 
                    color: #0c3b65; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-family: \'Rubik\', sans-serif; 
                    font-weight: 500;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                " onmouseover="this.style.backgroundColor=\'#e5e7eb\'"
                   onmouseout="this.style.backgroundColor=\'#f3f4f6\'">
                   &larr; Voltar ao osTicket
                </a>
            ';
            
            // 4. Injetar o botão antes do <header> do formulário
            $html_content = str_replace(
                '<header', // Alvo é a tag <header>
                $voltarButtonHtml . '<header', // Injeta o botão antes dela
                $html_content
            );

            // 5. Embutir CSS
            $html_content = str_replace(
                '<link rel="stylesheet" href="./css/style.css">',
                "<style>\n" . $css_content . "\n</style>",
                $html_content
            );

            // 6. Embutir JS
            $html_content = str_replace(
                '<script src="./js/script.js"></script>',
                "<script>\n" . $js_content . "\n</Uscript>",
                $html_content
            );

            // 7. Exibir HTML final
            echo $html_content;

        } catch (Exception $e) {
            echo "Erro ao carregar o plugin do formulário de avaria.";
            // --- ESTA É A LINHA CORRIGIDA ---
            error_log("Erro no Plugin Avaria: " . $e->getMessage());
        }
        
        // 8. Sair
        exit;
    }
}
?>