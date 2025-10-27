<?php
/**
 * Page Stub para o Formulário de Avaria.
 *
 * 1. Carrega o 'main.inc.php' - o bootstrap MÍNIMO do osTicket.
 * (Não usamos client.inc.php pois não queremos o layout do cliente)
 * 2. main.inc.php irá carregar e inicializar (bootstrap) todos os plugins.
 * 3. Dispara o sinal 'page.avaria' que nosso plugin está ouvindo.
 */

// 1. Carrega o ambiente mínimo (isso executa o bootstrap() dos plugins)
require('main.inc.php');

// 2. Dispara o sinal personalizado
Signal::send('page.avaria', null);

// 3. Fallback: Se o plugin estiver desativado ou falhar antes do 'exit',
//    isso será exibido.
echo "Erro: O plugin do formulário de avaria não está instalado ou ativado.";
exit;

?>