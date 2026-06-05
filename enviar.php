<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require 'Exception.php';
require 'PHPMailer.php';
require 'SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Inicializa a variável para evitar erros de aviso do PHP
$GLOBALS['smtp_debug'] = '';

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
        // Captura o log de resposta do servidor de e-mail
        $mail->SMTPDebug = 2; 
        $mail->Debugoutput = function($str, $level) {
            $GLOBALS['smtp_debug'] .= $str . "\n";
        };

        $mail->isSMTP();                                      
        $mail->Host       = 'smtp.titan.email';               
        $mail->SMTPAuth   = true;                             
        $mail->Username   = 'contato@consertoculos.com.br';   
        $mail->Password   = 'Al@n306090'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;      
        $mail->Port       = 465;                              

        $mail->Sender = 'contato@consertoculos.com.br';

        $mail->setFrom('contato@consertoculos.com.br', 'Consertóculos Lab');
        $mail->addAddress('contato@consertoculos.com.br');        
        $mail->addReplyTo($email, $nome);                         

        if (!empty($_FILES['imagens']['name'][0])) {
            foreach ($_FILES['imagens']['tmp_name'] as $index => $tmpName) {
                if ($_FILES['imagens']['error'][$index] == UPLOAD_ERR_OK) {
                    $mail->addAttachment($tmpName, $_FILES['imagens']['name'][$index]);
                }
            }
        }

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
        echo json_encode(["message" => "Enviado com sucesso!"]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "error" => "Falha no envio do formulário: {$mail->ErrorInfo}",
            "log_detalhado" => $GLOBALS['smtp_debug']
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Método não permitido."]);
}
?>