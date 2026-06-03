import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import nodemailer from 'nodemailer';

// Configuração do ambiente isolado de sanitização
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const app = express();

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Isto diz ao servidor: "Tudo o que estiver nesta pasta, pode mostrar para quem entrar"
app.use(express.static(__dirname));

// Isto diz ao servidor: "Quando entrarem na página principal, mostre o index.html"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ==========================================================================
   1. CAMADAS DE SEGURANÇA GLOBAL (BLINDAGEM CONTRA ATAQUES)
   ========================================================================== */
app.use(helmet()); // Implementa cabeçalhos HTTP estritos de segurança (XSS, Clickjacking, MIME-Sniffing)
app.use(express.json({ limit: '10kb' })); // Limita drasticamente o JSON de entrada para mitigar ataques de DOS
app.use(cors()); // Configuração permissiva para desenvolvimento local. Em produção, restrinja ao seu domínio oficial.

// Limitador de requisições: Máximo de 5 tentativas por IP em um intervalo de 15 minutos
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: 'Muitas solicitações vindas deste IP. Tente novamente em 15 minutos.' }
});

/* ==========================================================================
   2. CONFIGURAÇÃO DO MULTER (MIDDLEWARE DE UPLOAD SEGURO)
   ========================================================================== */
const imageFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp/;
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedMimeTypes.includes(file.mimetype);

    if (extName && mimeType) {
        return cb(null, true);
    }
    cb(new Error('Apenas imagens nos formatos JPEG, PNG e WEBP são permitidas.'));
};

const upload = multer({
    storage: multer.memoryStorage(), // Aloca buffers na memória RAM para inspeção sem persistir arquivos temporários no disco
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Teto rígido de 5MB por arquivo
        files: 3 // Restrição absoluta para no máximo 3 uploads simultâneos
    }
});

/* ==========================================================================
   3. PROVEDOR DE SERVIÇO DE DISPARO (SMTP / NODEMAILER)
   ========================================================================== */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/* ==========================================================================
   4. ROTA DO FORMULÁRIO (END-POINT DE SEGURANÇA LABORATORIAL)
   ========================================================================== */
app.post('/api/contato', contactLimiter, upload.array('imagens', 3), async (req, res) => {
    try {
        const { nome, email, whatsapp, mensagem } = req.body;

        // VALIDAÇÃO 1: Consistência dos dados de entrada mandatórios
        if (!nome || !email || !whatsapp || !mensagem) {
            return res.status(400).json({ error: 'Todos os campos de texto são obrigatórios.' });
        }

        // VALIDAÇÃO 2: Sanitização profunda contra Contextos de Injeção (XSS e HTML Injection)
        const cleanNome = DOMPurify.sanitize(nome.trim());
        const cleanEmail = DOMPurify.sanitize(email.trim());
        const cleanWhatsapp = DOMPurify.sanitize(whatsapp.trim());
        const cleanMensagem = DOMPurify.sanitize(mensagem.trim());

        // VALIDAÇÃO 3: Verificação via Expressão Regular para integridade estrutural do e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ error: 'Formato de e-mail inválido.' });
        }

        // Validação estrutural do número de telefone brasileiro (DDD + 8 ou 9 dígitos numéricos)
        const apenasNumerosWhats = cleanWhatsapp.replace(/\D/g, '');
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(apenasNumerosWhats)) {
            return res.status(400).json({ error: 'Formato de WhatsApp inválido. Forneça o número completo com DDD.' });
        }

        const emailAttachments = [];

        // VALIDAÇÃO 4: Inspeção por Assinatura de Bytes (MIME-Type Mágico)
        if (req.files && req.files.length > 0) {
            const { fileTypeFromBuffer } = await import('file-type');
            
            for (const [index, file] of req.files.entries()) {
                const realType = await fileTypeFromBuffer(file.buffer);
                
                // Validação e tratamento de arquivos corrompidos ou ilegíveis
                if (!realType || !realType.ext || !['jpg', 'png', 'webp', 'jpeg'].includes(realType.ext.toLowerCase())) {
                    return res.status(400).json({ error: 'Anexo inválido detectado. Apenas imagens reais são aceitas.' });
                }

                emailAttachments.push({
                    filename: `foto-orcamento-${index + 1}.${realType.ext}`,
                    content: file.buffer
                });
            }
        }

        /* ==========================================================================
           5. ENVELOPAMENTO E PARSER HTML DO CORREIO ELETRÔNICO
           ========================================================================== */
        const mailOptions = {
            from: '"Sistema Consertóculos Lab" <sistema@consertoculos.com.br>',
            to: 'contato@consertoculos.com.br',
            replyTo: cleanEmail,
            subject: `🔬 Nova Solicitação de Reparo - ${cleanNome}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
                    <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px; font-family: 'Orbitron', sans-serif;">Orçamento Técnico Laboratorial</h2>
                    <p style="margin: 10px 0;"><strong>Cliente:</strong> ${cleanNome}</p>
                    <p style="margin: 10px 0;"><strong>E-mail:</strong> ${cleanEmail}</p>
                    <p style="margin: 10px 0;"><strong>WhatsApp:</strong> <a href="https://wa.me/55${apenasNumerosWhats}" target="_blank" style="color: #10b981; text-decoration: none; font-weight: bold;">Iniciar Conversa Direta</a> (${cleanWhatsapp})</p>
                    <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #10b981;">
                        <strong>Descrição do Problema / Serviço Solicitado:</strong><br>
                        <p style="white-space: pre-wrap; margin: 8px 0 0 0; line-height: 1.5;">${cleanMensagem}</p>
                    </div>
                    <p style="font-size: 11px; color: #999; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">
                        Mensagem auditada e criptografada via Protocolo de Segurança Estrita • Consertóculos Lab.
                    </p>
                </div>
            `,
            attachments: emailAttachments
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: 'Solicitação enviada com sucesso!' });

    } catch (error) {
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: `Falha no upload dos anexos: ${error.message}` });
        }
        
        console.log("\n=== DIAGNÓSTICO DO ERRO INTERNO ===");
        console.error(error); 
        console.log("====================================\n");

        return res.status(500).json({ error: 'Erro interno ao processar ou enviar sua mensagem.' });
    }
});

// Inicialização e Escuta do Processo
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { // Adicione o '0.0.0.0' para o Render acessar
    console.log(`Servidor rodando na porta ${PORT}`);
});