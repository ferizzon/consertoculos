<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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

    $para = "rizzon.fil@gmail.com";
    $assunto = "Nova Solicitacao de Reparo - Consertoculos";
    
    // Configuração do delimitador do e-mail com anexos
    $boundary = md5(time());
    
    // Cabeçalhos do e-mail padronizados para o Gmail aceitar
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "From: Consertoculos Lab <alante87@alanteixeiralopes1780672994593.2101853.meusitehostgator.com.br>\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
    
    // Corpo da mensagem em HTML com quebras corrigidas para o Gmail
    $corpo = "--$boundary\r\n";
    $corpo .= "Content-Type: text/html; charset=UTF-8\r\n";
    $corpo .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $corpo .= "<h2>Nova mensagem recebida pelo site:</h2>";
    $corpo .= "<p><strong>Nome:</strong> $nome</p>";
    $corpo .= "<p><strong>E-mail:</strong> $email</p>";
    $corpo .= "<p><strong>WhatsApp:</strong> $whatsapp</p>";
    $corpo .= "<p><strong>Descrição do problema:</strong><br>" . nl2br($mensagem) . "</p>\r\n";
    
    // Processamento das fotos anexadas
    if (!empty($_FILES['imagens']['name'][0])) {
        foreach ($_FILES['imagens']['tmp_name'] as $index => $tmpName) {
            if ($_FILES['imagens']['error'][$index] == UPLOAD_ERR_OK) {
                $fileName = $_FILES['imagens']['name'][$index];
                $fileSize = $_FILES['imagens']['size'][$index];
                $fileType = $_FILES['imagens']['type'][$index];
                
                $file = fopen($tmpName, "rb");
                $data = fread($file, $fileSize);
                fclose($file);
                $data = chunk_split(base64_encode($data));
                
                $corpo .= "--$boundary\r\n";
                $corpo .= "Content-Type: $fileType; name=\"$fileName\"\r\n";
                $corpo .= "Content-Disposition: attachment; filename=\"$fileName\"\r\n";
                $corpo .= "Content-Transfer-Encoding: base64\r\n\r\n";
                $corpo .= $data . "\r\n";
            }
        }
    }
    
    $corpo .= "--$boundary--";
    
    // Envia o e-mail usando o servidor nativo da HostGator
    if (mail($para, $assunto, $corpo, $headers)) {
        http_response_code(200);
        // AJUSTADO: Chave alterada de "mensagem" para "message" para bater com seu JS line 194
        echo json_encode(["message" => "Solicitação enviada com sucesso! Nossa equipe analisará as imagens."]);
    } else {
        http_response_code(500);
        // AJUSTADO: Chave alterada de "erro" para "error" para bater com seu JS line 197
        echo json_encode(["error" => "Ocorreu um erro interno ao enviar o e-mail. Tente novamente."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Método não permitido."]);
}
?>