<?php

require_once INCLUDE_DIR . 'class.plugin.php';
require_once INCLUDE_DIR . 'class.signal.php';

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
    }

    function handlePage() {
        try {
            $base_path = dirname(__FILE__);

            $html_content = file_get_contents($base_path . '/form/index.html');
            $css_content = file_get_contents($base_path . '/form/css/style.css');
            $js_content = file_get_contents($base_path . '/form/js/script.js');

            $img_path = $base_path . '/form/img/marca-vaggo.svg';
            $img_data = base64_encode(file_get_contents($img_path));
            $img_uri = 'data:image/svg+xml;base64,' . $img_data;

            $css_content = str_replace(
                'url("../img/marca-vaggo.svg")',
                'url("' . $img_uri . '")',
                $css_content
            );

            $html_content = str_replace(
                '<link rel="stylesheet" href="./css/style.css">',
                "<style>\n" . $css_content . "\n</style>",
                $html_content
            );

            $html_content = str_replace(
                '<script src="./js/script.js"></script>',
                "<script>\n" . $js_content . "\n</script>",
                $html_content
            );

            echo $html_content;

        } catch (Exception $e) {
            echo "Erro ao carregar o plugin do formulário de avaria.";
            error_log("Erro no Plugin Avaria: " . $e->getMessage());
        }
        exit;
    }
}