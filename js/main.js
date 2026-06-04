// 1. Desativa estritamente a memorização de rolagem do navegador para esta página
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// 2. Força o reset para o topo físico da página ao atualizar
window.scrollTo(0, 0);

// 3. Limpa e reinicia a memória de scroll do plugin GSAP
if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.clearScrollMemory("manual");
}

window.addEventListener('DOMContentLoaded', () => {

    // Total alterado para 311 frames após a exclusão dos 3 itens desejados
    const frameCount = 311; 
    
    const currentFrame = index => (
        `assets/video-frames/frame_${index.toString().padStart(3, '0')}.webp`
    );

    const canvas = document.getElementById("animation-canvas");
    const context = canvas.getContext("2d");
    const airframes = { frame: 0 };
    const images = [];
    
    let videoScrollMax = 1000; 
    let isInitialRendered = false;

    // Array estruturada para armazenar os arquivos e seus IDs únicos de controle
    let arquivosSelecionados = [];

    // OTIMIZAÇÃO: Função isolada para redimensionar o Canvas APENAS quando a tela mudar de tamanho
    function resizeCanvas() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        canvas.style.width = viewportWidth + "px";
        canvas.style.height = viewportHeight + "px";
        canvas.width = viewportWidth * dpr;
        canvas.height = viewportHeight * dpr;

        context.scale(dpr, dpr);
    }

    // SISTEMA DE PRELOAD PROGRESSIVO: Carrega a primeira dobra rápido e libera a página
    function preloadImages() {
        const initialBatch = 30; // Quantidade de frames essenciais para carregar o visual de imediato
        let loadedInitial = 0;

        // Passagem 1: Carrega os primeiros frames de forma prioritária
        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                if (i < initialBatch) {
                    loadedInitial++;
                    if (loadedInitial === initialBatch && !isInitialRendered) {
                        isInitialRendered = true;
                        initScrollAnimation(); // Inicia a página de forma ultra rápida
                    }
                }
            };
            images.push(img);
        }
    }

    // OTIMIZAÇÃO: O render agora APENAS desenha na tela, sem recalcular o tamanho do canvas a cada frame
    function render() {
        const currentFrameIndex = Math.floor(airframes.frame);
        if (!images[currentFrameIndex]) return;

        const img = images[currentFrameIndex];
        if (!img.complete) return; 

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768; // Detecta orientação/dispositivo mobile baseado no seu CSS

        context.clearRect(0, 0, viewportWidth, viewportHeight);
        context.save(); // Salva o estado limpo do canvas

        if (isMobile) {
            // 1. Move o ponto de origem para o centro do canvas para rotacionar perfeitamente
            context.translate(viewportWidth / 2, viewportHeight / 2);
            
            // 2. Rotaciona 90 graus em radianos (90 * Math.PI / 180)
            context.rotate(Math.PI / 2);

            // 3. Como rotacionamos o contexto, a largura da imagem deve preencher a ALTURA da tela e vice-versa
            const ratio = Math.max(viewportHeight / img.width, viewportWidth / img.height);
            const newWidth = img.width * ratio;
            const newHeight = img.height * ratio;

            // 4. Desenha a imagem centralizada a partir do novo ponto de origem central
            context.drawImage(img, -newWidth / 2, -newHeight / 2, newWidth, newHeight);
        } else {
            // Lógica original intocada para Desktop
            const imageWidth = img.width;
            const imageHeight = img.height;
            
            const ratio = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
            const newWidth = imageWidth * ratio;
            const newHeight = imageHeight * ratio;
            
            const x = (viewportWidth - newWidth) / 2;
            const y = (viewportHeight - newHeight) / 2;

            context.drawImage(img, x, y, newWidth, newHeight);
        }

        context.restore(); // Restaura o estado do canvas para evitar que as transformações se acumulem
    }

    function setVideoHeight() {
        const track = document.getElementById("video-track");
        if (track) {
            videoScrollMax = track.offsetHeight - window.innerHeight;
            if (videoScrollMax < window.innerHeight) {
                videoScrollMax = window.innerHeight * 4;
            }
        }
    }

    // Ouvinte de Redimensionamento otimizado
    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas(); // Ajusta o canvas de forma controlada
            render();
            setVideoHeight();
            ScrollTrigger.refresh();
        }, 100);
    });

    function initScrollAnimation() {
        gsap.registerPlugin(ScrollTrigger);
        
        resizeCanvas(); // Define o tamanho estrutural do canvas antes do primeiro desenho
        setVideoHeight();
        setTimeout(setVideoHeight, 500); 
        render();

        // CONTROLE DO CANVAS POR SCROLLTRIGGER (Suavização e interpolação linear profissional)
        gsap.to(airframes, {
            frame: frameCount - 1,
            ease: "none",
            scrollTrigger: {
                trigger: "#video-track", // Elemento pai que define a área de scroll do vídeo
                start: "top top",
                end: "bottom bottom",
                scrub: 0.5, // 0.5 segundos de atraso suave para corrigir o efeito "travado"
                onUpdate: render // Renderiza o canvas a cada micro-movimentação calculada pelo GSAP
            }
        });

        initTextAnimations(); 
        initAccordion(); 
        initMasks();
        initPhotoUploader();
        initFormSubmit();
        initMobileMenu(); // Inicializa o controle do menu responsivo lateral
    }

    function initTextAnimations() {
        const sections = document.querySelectorAll('.scroll-section');
        sections.forEach((section) => {
            const targets = section.querySelectorAll('.content-box-premium, .side-by-side-wrapper');
            if (targets.length === 0) return;

            targets.forEach((target) => {
                gsap.fromTo(target,
                    { opacity: 0, y: 50 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: section,
                            start: "top 75%",
                            end: "bottom 25%",
                            toggleActions: "play none none reverse", 
                        }
                    }
                );
            });
        });
    }

    function initAccordion() {
        const accordions = document.querySelectorAll('.accordion-btn');
        accordions.forEach(acc => {
            acc.addEventListener('click', function(e) {
                e.preventDefault();
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !isExpanded);
                this.classList.toggle('active');
                const panel = this.nextElementSibling;
                
                if (panel.style.maxHeight) {
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }
                
                
                setTimeout(() => {
                    setVideoHeight();
                    ScrollTrigger.refresh();
                }, 400); 
            });
        });
    }

    // MÁSCARA AUTOMÁTICA DE WHATSAPP (Ajusta dinamicamente fixo ou celular)
    function initMasks() {
        const telInput = document.getElementById('form-tel');
        if (!telInput) return;

        telInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, "");
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
            } else if (value.length > 5) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)$/, "($1");
            }
            e.target.value = value;
        });
    }

    // GERENCIADOR VISUAL DE ADICIONAR E REMOVER FOTOS INDIVIDUAMENTE
    function initPhotoUploader() {
        const inputFoto = document.getElementById('form-fotos');
        const previewContainer = document.getElementById('file-preview-container');
        if (!inputFoto || !previewContainer) return;

        inputFoto.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            if (arquivosSelecionados.length + files.length > 3) {
                alert('Limite máximo de 3 imagens atingido.');
                inputFoto.value = '';
                return;
            }

            files.forEach(file => {
                // Criação de um ID único baseado em timestamp + string aleatória para blindar a deleção individual
                const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                
                arquivosSelecionados.push({
                    id: uniqueId,
                    fileData: file
                });
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const item = document.createElement('div');
                    item.className = 'preview-item';
                    item.innerHTML = `
                        <img src="${event.target.result}" alt="Preview">
                        <button type="button" class="remove-btn" data-id="${uniqueId}">×</button>
                    `;
                    previewContainer.appendChild(item);
                };
                reader.readAsDataURL(file);
            });

            inputFoto.value = ''; // Reseta o campo do DOM
        });

        // Evento delegativo corrigido com busca baseada no ID único criptográfico
        previewContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const targetId = e.target.getAttribute('data-id');
                arquivosSelecionados = arquivosSelecionados.filter(item => item.id !== targetId);
                e.target.parentElement.remove();
            }
        });
    }

    function initFormSubmit() {
        const form = document.querySelector('.stealth-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('.form-submit');
            const originalBtnText = submitBtn.textContent;
            
            const formData = new FormData();
            formData.append('nome', document.getElementById('form-nome').value);
            formData.append('email', document.getElementById('form-email').value);
            formData.append('whatsapp', document.getElementById('form-tel').value);
            formData.append('mensagem', document.getElementById('form-mensagem').value);

            // Coleta os arquivos reais de dentro da nossa array de objetos limpa
            arquivosSelecionados.forEach(item => {
                formData.append('imagens', item.fileData);
            });

            try {
                submitBtn.textContent = 'Enviando com segurança...';
                submitBtn.disabled = true;

                const response = await fetch('http://localhost:3000/api/contato', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert('🔬 ' + result.message);
                    form.reset();
                    arquivosSelecionados = [];
                    document.getElementById('file-preview-container').innerHTML = '';
                } else {
                    alert('⚠️ Erro: ' + (result.error || 'Erro inesperado do sistema.'));
                }

            } catch (error) {
                console.error('Erro na conexão:', error);
                alert('⚠️ O servidor de segurança laboratorial está offline. Inicialize o seu server.js no terminal.');
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Gerenciador de abertura/fechamento do menu lateral móvel
    function initMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const mainNav = document.querySelector('.main-nav');
        const navLinks = document.querySelectorAll('.main-nav a');

        if (!menuToggle || !mainNav) return;

        menuToggle.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('open');
            menuToggle.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isOpen);
        });

        // Fecha a barra lateral automaticamente ao clicar em qualquer link do menu
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    preloadImages();
});