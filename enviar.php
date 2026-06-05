<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Carrega os 3 arquivos locais que criamos nos passos anteriores
require 'Exception.php';
require 'PHPMailer.php';
require 'SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nome = strip_tags(trim($_POST["nome"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $whatsapp = strip_tags(trim($_POST["whatsapp"]));
    $mensagem = strip_tags(trim($_POST["mensagem"]));
    
    if (empty($nome) || empty($email) || empty($whatsapp) || empty($mensagem)) {
        http_response_code(400);
        echo json_encode(["error" => "Por favor, preencha todos os campos obrigatórios."]);
        exit;
    }

    $mail = new PHPMailer(true);

    try {
        // Configuração Nativa Localizada (Pula o bloqueio de firewall e SMTP da HostGator)
        $mail->isMail();                                         // Usa o motor de envio local do próprio servidor Linux

        // Configuração de Remetente e Destinatário
        $mail->setFrom('contato@consertoculos.com.br', 'Consertóculos Lab');
        $mail->addAddress('contato@consertoculos.com.br');        // Envia para a sua caixa profissional Titan
        $mail->addAddress('rizzon.fil@gmail.com');                // Envia a cópia de segurança para o seu Gmail
        $mail->addReplyTo($email, $nome);                         // Se você responder, vai direto para o cliente

        // Processa e anexa as fotos dinamicamente
        if (!empty($_FILES['imagens']['name'][0])) {
            foreach ($_FILES['imagens']['tmp_name'] as $index => $tmpName) {
                if ($_FILES['imagens']['error'][$index] == UPLOAD_ERR_OK) {
                    $mail->addAttachment($tmpName, $_FILES['imagens']['name'][$index]);
                }
            }
        }

        // Construção do layout do e-mail em HTML
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = '🔬 Nova Solicitação de Reparo - Consertóculos';
        
        $mail->Body    = "<h2>Nova mensagem recebida pelo site:</h2>" .
                         "<p><strong>Nome:</strong> $nome</p>" .
                         "<p><strong>E-mail:</strong> $email</p>" .
                         "<p><strong>WhatsApp:</strong> $whatsapp</p>" .
                         "<p><strong>Descrição do problema:</strong><br>" . nl2br($mensagem) . "</p>";

        $mail->send();
        
        http_response_code(200);
        echo json_encode(["message" => "Solicitação enviada com sucesso! Nossa equipe analisará as imagens."]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Falha no envio do formulário: {$mail->ErrorInfo}"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Método não permitido."]);
}
?>