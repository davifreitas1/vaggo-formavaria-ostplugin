<?php

// 1. Carrega o ambiente mínimo (isso executa o bootstrap() dos plugins)
require('main.inc.php');

// 2. Dispara o sinal personalizado
Signal::send('page.avaria', null);

// 3. Fallback: Se o plugin estiver desativado ou falhar antes do 'exit',
//    isso será exibido.
echo "Erro: O plugin do formulário de avaria não está instalado ou ativado.";
exit;

?>