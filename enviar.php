<?php
// 1. Configura o cabeçalho para responder estritamente em JSON (Exigência do seu main.js)
header('Content-Type: application/json; charset=utf-8');

// Importa as classes do PHPMailer para o escopo global
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// 2. Caminhos absolutos mapeados perfeitamente a partir do seu cPanel (/home1/alante87)
require '/home1/alante87/public_html/PHPMailer/src/Exception.php';
require '/home1/alante87/public_html/PHPMailer/src/PHPMailer.php';
require '/home1/alante87/public_html/PHPMailer/src/SMTP.php';

// Instancia o PHPMailer com tratamento de exceções ativado
$mail = new PHPMailer(true);

try {
    // 3. Captura e higieniza os campos mapeados pelo FormData do seu main.js
    $nome     = isset($_POST['nome']) ? strip_tags(trim($_POST['nome'])) : '';
    $email    = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
    $whatsapp = isset($_POST['whatsapp']) ? strip_tags(trim($_POST['whatsapp'])) : '';
    $mensagem = isset($_POST['mensagem']) ? nl2br(strip_tags(trim($_POST['mensagem']))) : '';

    // Validação básica de segurança interna do servidor
    if (empty($nome) || empty($email) || empty($mensagem)) {
        http_response_code(400);
        echo json_encode(['error' => 'Por favor, preencha todos os campos obrigatórios.']);
        exit;
    }

    // 4. Configurações estruturais de conexão SMTP para e-mail Titan
    $mail->isSMTP();
    $mail->Host       = 'smtp.titan.email';                  // Servidor SMTP dedicado do Titan
    $mail->SMTPAuth   = true;                                 // Habilita autenticação obrigatoriamente
    $mail->Username   = 'atendimento@consertoculos.com.br';       // Seu e-mail completo
    $mail->Password   = 'Al@n2523';                     // Sua senha de e-mail
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // Abreviação para 'ssl'
    $mail->Port       = 465;                                // Porta de comunicação correta para TLS

    // 5. Bypass de SSL necessário para o ecossistema compartilhado da HostGator (Plano Start)
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    // 6. Configuração rígida de Remetente e Destinatário
    // O remetente "setFrom" DEVE ser idêntico ao Username para o servidor não barrar por proteção anti-spam
    $mail->setFrom('atendimento@consertoculos.com.br', 'Consertóculos Lab');
    $mail->addAddress('atendimento@consertoculos.com.br', 'Atendimento Consertóculos');
    
    // Configuração inteligente: Quando você clicar em "Responder" no e-mail recebido, responderá direto ao cliente!
    if (!empty($email)) {
        $mail->addReplyTo($email, $nome);
    }

    // 7. Processamento dinâmico do array de fotos anexadas vindo do seu JS (imagens[])
    if (isset($_FILES['imagens']) && is_array($_FILES['imagens']['name'])) {
        foreach ($_FILES['imagens']['name'] as $index => $name) {
            if ($_FILES['imagens']['error'][$index] === UPLOAD_ERR_OK) {
                $tmpName = $_FILES['imagens']['tmp_name'][$index];
                $mail->addAttachment($tmpName, $name);
            }
        }
    }

    // 8. Design e formatação do e-mail combinando com a identidade visual do seu site (Preto e Verde Neon)
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

    // Realiza o envio do e-mail
    $mail->send();

    // 9. Retorno de sucesso em JSON lido perfeitamente pelo bloco 'if(response.ok)' do seu main.js
    echo json_encode(['message' => 'Solicitação enviada com sucesso! Nossa equipe entrará em contato.']);

} catch (Exception $e) {
    // 10. Retorno de erro capturado e enviado estruturado para o seu JavaScript tratar na tela do usuário
    http_response_code(500);
    echo json_encode(['error' => "A mensagem não pôde ser enviada. Erro interno: {$mail->ErrorInfo}"]);
}