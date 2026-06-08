<?php
// 1. Configura o cabeçalho para responder estritamente em JSON (Exigência do main.js)
header('Content-Type: application/json; charset=utf-8');

/**
 * SISTEMA NATIVO DE CARREGAMENTO DE VARIÁVEIS DE AMBIENTE (.env)
 * Lê o arquivo isolado fora da public_html e injeta as credenciais na memória do servidor
 */
function carregarEnv($caminho) {
    if (!file_exists($caminho)) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro crítico: Arquivo de configuração de ambiente não encontrado.']);
        exit;
    }
    
    $linhas = file($caminho, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($linhas as $linha) {
        // Ignora linhas que sejam comentários
        if (strpos(trim($linha), '#') === 0) continue;
        
        // Divide a linha entre o nome da variável e o valor secreto
        if (strpos($linha, '=') !== false) {
            list($nome, $valor) = explode('=', $linha, 2);
            putenv(trim($nome) . '=' . trim($valor));
        }
    }
}

// Executa a leitura segura no caminho absoluto do seu cPanel (ZONA MORTA PARA A INTERNET)
carregarEnv('/home1/alante87/.env');

// Importa as classes do PHPMailer para o escopo global
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// 2. Caminhos absolutos do PHPMailer no seu cPanel
require '/home1/alante87/public_html/PHPMailer/src/Exception.php';
require '/home1/alante87/public_html/PHPMailer/src/PHPMailer.php';
require '/home1/alante87/public_html/PHPMailer/src/SMTP.php';

$mail = new PHPMailer(true);

try {
    // 3. Captura e higieniza os campos mapeados pelo FormData do JavaScript
    $nome     = isset($_POST['nome']) ? strip_tags(trim($_POST['nome'])) : '';
    $email    = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
    $whatsapp = isset($_POST['whatsapp']) ? strip_tags(trim($_POST['whatsapp'])) : '';
    $mensagem = isset($_POST['mensagem']) ? nl2br(strip_tags(trim($_POST['mensagem']))) : '';

    // Validação básica de segurança interna dos campos obrigatórios
    if (empty($nome) || empty($email) || empty($mensagem)) {
        http_response_code(400);
        echo json_encode(['error' => 'Por favor, preencha todos os campos obrigatórios.']);
        exit;
    }

    // 4. Configurações estruturais de conexão SMTP usando as variáveis protegidas do .env
    $mail->isSMTP();
    $mail->Host       = 'smtp.titan.email';                  
    $mail->SMTPAuth   = true;                                 
    $mail->Username   = getenv('SMTP_USER'); // Puxa o e-mail cadastrado no .env
    $mail->Password   = getenv('SMTP_PASS'); // Puxa a senha cadastrada no .env
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; 
    $mail->Port       = 465;                                 

    // 5. Bypass de SSL necessário para o ecossistema compartilhado da HostGator
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    // 6. Configuração de Remetente e Destinatário
    $mail->setFrom(getenv('SMTP_USER'), 'Consertóculos Lab');
    $mail->addAddress(getenv('SMTP_USER'), 'Atendimento Consertóculos');
    
    // Configuração inteligente de resposta direta ao e-mail do cliente
    if (!empty($email)) {
        $mail->addReplyTo($email, $nome);
    }

    // 7. BLINDAGEM DE SEGURANÇA BACKEND: Validação profunda do array de imagens[]
    if (isset($_FILES['imagens']) && is_array($_FILES['imagens']['name'])) {
        
        $formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        $tamanhoMaximo = 5 * 1024 * 1024; // Limite de 5 Megabytes por foto

        foreach ($_FILES['imagens']['name'] as $index => $name) {
            if ($_FILES['imagens']['error'][$index] === UPLOAD_ERR_OK) {
                
                $tmpName = $_FILES['imagens']['tmp_name'][$index];
                $fileSize = $_FILES['imagens']['size'][$index];
                
                // Abre o cabeçalho binário do arquivo para descobrir o formato real (bloqueia scripts disfarçados)
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mimeType = $finfo->file($tmpName);

                // Checagem de Tamanho
                if ($fileSize > $tamanhoMaximo) {
                    http_response_code(400);
                    echo json_encode(['error' => "A imagem '{$name}' ultrapassa o limite de tamanho permitido de 5MB."]);
                    exit;
                }

                // Checagem de Formato Real
                if (!in_array($mimeType, $formatosPermitidos)) {
                    http_response_code(400);
                    echo json_encode(['error' => "O arquivo '{$name}' possui uma extensão ou estrutura inválida. Envie apenas JPG, PNG ou WEBP."]);
                    exit;
                }

                // Passou na triagem? Anexa com segurança na memória temporária do e-mail
                $mail->addAttachment($tmpName, $name);
            }
        }
    }

    // 8. Formatação e template visual do e-mail (Preto e Verde Premium)
    $mail->isHTML(true);
    $mail->Subject = '=?UTF-8?B?' . base64_encode('🔬 Nova Solicitação de Orçamento - Consertóculos Lab') . '?=';
    
    $bodyContent = "
    <div style='background-color: #000000; color: #e2e8f0; font-family: Arial, sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #10b981; box-shadow: 0 4px 20px rgba(0,0,0,0.8);'>
        <h2 style='color: #34d399; font-weight: bold; border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-top: 0;'>Novo Contato pelo Site</h2>
        
        <p style='font-size: 15px; margin: 16px 0;'><strong style='color: #ffffff;'>Nome do Cliente:</strong> {$nome}</p>
        <p style='font-size: 15px; margin: 16px 0;'><strong style='color: #ffffff;'>E-mail:</strong> {$email}</p>
        <p style='font-size: 15px; margin: 16px 0;'><strong style='color: #ffffff;'>WhatsApp/Telefone:</strong> {$whatsapp}</p>
        
        <div style='background-color: #0f172a; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 25px;'>
            <strong style='color: #ffffff; display: block; margin-bottom: 8px; font-size: 14px; text-transform: uppercase;'>Problema ou Serviço Solicitado:</strong>
            <p style='margin: 0; line-height: 1.6; font-size: 15px; color: #f1f5f9;'>{$mensagem}</p>
        </div>
        
        <p style='font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;'>
            Consertóculos Lab — Engenharia Óptica e Fusão a Laser em Titânio<br>Mensagem gerada de forma automática pelo servidor.
        </p>
    </div>
    ";

    $mail->Body    = $bodyContent;
    $mail->AltBody = "Novo Orçamento\n\nNome: {$nome}\nE-mail: {$email}\nWhatsApp: {$whatsapp}\nMensagem: " . strip_tags($_POST['mensagem']);

    // Realiza o disparo do e-mail
    $mail->send();

    // 9. Retorno de sucesso em JSON lido perfeitamente pelo main.js
    echo json_encode(['message' => 'Solicitação enviada com sucesso! Nossa equipe entrará em contato.']);

} catch (Exception $e) {
    // 10. Retorno de erro capturado e enviado estruturado para o tratamento na tela do usuário
    http_response_code(500);
    echo json_encode(['error' => "A mensagem não pôde ser enviada. Erro interno do servidor: {$mail->ErrorInfo}"]);
}