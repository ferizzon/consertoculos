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

    const frameCount = 311; 
    
    const currentFrame = index => (
        `assets/video-frames/frame_${index.toString().padStart(3, '0')}.webp`
    );

    const canvas = document.getElementById("animation-canvas");
    if (!canvas) return; // Guard clause de segurança
    
    const context = canvas.getContext("2d");
    const airframes = { frame: 0 };
    const images = [];
    
    let videoScrollMax = 1000; 
    let isInitialRendered = false;
    let lastValidFrameIndex = 0; 
    let lastWidth = window.innerWidth; 
    let resizeTimeout;

    // Variáveis de cache para eliminar Layout Thrashing (Reflow) no loop do render
    let cachedWidth = window.innerWidth;
    let cachedHeight = window.innerHeight;

    // Array estruturada para armazenar os arquivos e seus IDs únicos de controle
    let arquivosSelecionados = [];

    // OTIMIZAÇÃO: Define dimensões estruturais estendidas no mobile para absorver trancos de barras nativas
    function resizeCanvas() {
        cachedWidth = window.innerWidth;
        const isMobile = cachedWidth <= 768;
        cachedHeight = isMobile ? window.innerHeight * 1.15 : window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // Capado em 2x para evitar sobrecarga de GPU em telas Retina extremas

        canvas.style.width = cachedWidth + "px";
        canvas.style.height = (isMobile ? window.innerHeight * 1.15 : window.innerHeight) + "px";
        canvas.width = cachedWidth * dpr;
        canvas.height = cachedHeight * dpr;

        context.setTransform(1, 0, 0, 1, 0, 0); // Reseta a matriz de transformação antes de escalar
        context.scale(dpr, dpr);
    }

    // SISTEMA DE PRELOAD COM DECODE ANTECIPADO EM SEGUNDO PLANO
    function preloadImages() {
        const initialBatch = 30; // Bloco crítico para renderização imediata (LCP rápido)
        let loadedInitial = 0;

        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            
            img.onload = () => {
                if (i < initialBatch) {
                    img.decode()
                        .then(() => {
                            loadedInitial++;
                            if (loadedInitial === initialBatch && !isInitialRendered) {
                                isInitialRendered = true;
                                initScrollAnimation();
                            }
                        })
                        .catch(() => {
                            loadedInitial++;
                            if (loadedInitial === initialBatch && !isInitialRendered) {
                                isInitialRendered = true;
                                initScrollAnimation();
                            }
                        });
                } else {
                    // Decodifica o restante de forma assíncrona sem travar a thread principal
                    img.decode().catch(() => {});
                }
            };
            images.push(img);
        }
    }

    // RENDER: Processa e desenha com persistência e supressão de flashes pretos
    function render() {
        let currentFrameIndex = Math.floor(airframes.frame);
        
        if (!images[currentFrameIndex] || !images[currentFrameIndex].complete) {
            currentFrameIndex = lastValidFrameIndex;
        }

        const img = images[currentFrameIndex];
        if (!img || !img.complete) return; 

        lastValidFrameIndex = currentFrameIndex;
        const isMobile = cachedWidth <= 768;

        context.clearRect(0, 0, cachedWidth, cachedHeight); // Limpa o buffer anterior prevenindo ghosting aritmético
        context.save();

        if (isMobile) {
            context.translate(cachedWidth / 2, cachedHeight / 2);
            context.rotate(Math.PI / 2);

            const ratio = Math.max(cachedHeight / img.width, cachedWidth / img.height);
            const newWidth = img.width * ratio;
            const newHeight = img.height * ratio;

            context.drawImage(img, -newWidth / 2, -newHeight / 2, newWidth, newHeight);
        } else {
            const imageWidth = img.width;
            const imageHeight = img.height;
            
            const ratio = Math.max(cachedWidth / imageWidth, cachedHeight / imageHeight);
            const newWidth = imageWidth * ratio;
            const newHeight = imageHeight * ratio;
            
            const x = (cachedWidth - newWidth) / 2;
            const y = (cachedHeight - newHeight) / 2;

            context.drawImage(img, x, y, newWidth, newHeight);
        }

        context.restore();
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

    // Ouvinte de Redimensionamento Inteligente (Debounced)
    window.addEventListener("resize", () => {
        const currentWidth = window.innerWidth;
        if (currentWidth === lastWidth && currentWidth <= 768) return;
        
        lastWidth = currentWidth;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas(); 
            setVideoHeight();
            render();
            ScrollTrigger.refresh();
        }, 150);
    });

    function initScrollAnimation() {
        gsap.registerPlugin(ScrollTrigger);
        
        resizeCanvas(); 
        setVideoHeight();
        setTimeout(setVideoHeight, 500); 
        render();

        // CONTROLE DO CANVAS POR SCROLLTRIGGER
        gsap.to(airframes, {
            frame: frameCount - 1,
            ease: "none",
            scrollTrigger: {
                trigger: "#video-track",
                start: "top top",
                end: "bottom bottom",
                scrub: cachedWidth <= 768 ? 0.1 : 0.3, // Scrub ligeiramente mais reativo para otimizar o INP
                onUpdate: render 
            }
        });

        initTextAnimations(); 
        initAccordion(); 
        initMasks();
        initPhotoUploader();
        initFormSubmit();
        initMobileMenu(); 
        initAnchorLinks(); 
        initContactModal(); 
    }

    function initTextAnimations() {
        const sections = document.querySelectorAll('.scroll-section');
        sections.forEach((section) => {
            const targets = section.querySelectorAll('.content-box-premium, .side-by-side-wrapper');
            if (targets.length === 0) return;

            targets.forEach((target) => {
                gsap.fromTo(target,
                    { opacity: 0, y: 30 }, // Reduzido de 50 para 30 para suavizar o CLS visual
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: section,
                            start: "top 80%",
                            end: "bottom 20%",
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
                
                // Fecha outros accordions abertos (Melhor UX e previne saltos de scroll gigantescos)
                accordions.forEach(other => {
                    if (other !== this && other.getAttribute('aria-expanded') === 'true') {
                        other.setAttribute('aria-expanded', 'false');
                        other.classList.remove('active');
                        other.nextElementSibling.style.maxHeight = null;
                    }
                });

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
                }, 300);
            });
        });
    }

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
                        <img src="${event.target.result}" alt="Preview do óculos anexado">
                        <button type="button" class="remove-btn" data-id="${uniqueId}" aria-label="Remover imagem">×</button>
                    `;
                    previewContainer.appendChild(item);
                };
                reader.readAsDataURL(file);
            });

            inputFoto.value = ''; 
        });

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

            arquivosSelecionados.forEach(item => {
                formData.append('imagens[]', item.fileData);
            });

            try {
                submitBtn.textContent = 'Enviando com segurança...';
                submitBtn.disabled = true;

                const response = await fetch('enviar.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert('🔬 ' + result.message);
                    form.reset();
                    arquivosSelecionados = [];
                    
                    // CORREÇÃO AQUI: Buscando o elemento diretamente para evitar o erro de escopo
                    const previewCont = document.getElementById('file-preview-container');
                    if (previewCont) previewCont.innerHTML = '';
                    
                    const modal = document.getElementById('contact-modal');
                    if (modal) {
                        modal.classList.remove('active');
                        modal.setAttribute('aria-hidden', 'true');
                    }
                } else {
                    alert('⚠️ Erro: ' + (result.error || 'Erro inesperado do sistema.'));
                }

            } catch (error) {
                console.error('Erro na conexão:', error);
                alert('⚠️ Ocorreu uma falha ao conectar com o servidor. Verifique sua conexão.');
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

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

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function initAnchorLinks() {
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', () => {
                let checkCount = 0;
                const maxChecks = 30; 
                
                const forceScrollRender = setInterval(() => {
                    ScrollTrigger.update();
                    render();
                    checkCount++;
                    
                    if (checkCount >= maxChecks) {
                        clearInterval(forceScrollRender);
                    }
                }, 16); 
            });
        });
    }

    function initContactModal() {
        const fab = document.getElementById('fab-contact');
        const modal = document.getElementById('contact-modal');
        const closeBtn = document.querySelector('.modal-close');

        if (!fab || !modal || !closeBtn) return;

        fab.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        });

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    preloadImages();
});