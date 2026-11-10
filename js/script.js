/**
 * ==========================================================================
 * SCRIPT PRINCIPAL POUR BMS VENTOUSE v5.0 (ENTERPRISE EDITION)
 * ==========================================================================
 * Gère toutes les interactions du site avec une architecture modulaire,
 * performante et accessible (Focus Trap, Escape Key, etc.).
 */


/* Production logging gate: silence console in production unless window.DEBUG=true */
(function(){ try{ var DEBUG = !!(window.DEBUG); if(!DEBUG){ ['log','info','debug','warn'].forEach(function(k){ try{ console[k] = function(){}; }catch(e){} }); } window.__BMS_DEBUG__ = DEBUG; }catch(e){} })();

const BMS_TRUSTED_TYPES = (() => {
  const fallback = {
    html: (value) => value,
    scriptURL: (value) => value
  };

  try {
    if (
      typeof window === 'undefined' ||
      !window.trustedTypes ||
      typeof window.trustedTypes.createPolicy !== 'function'
    ) {
      return fallback;
    }

    const policy = window.BMSTrustedTypesPolicy || window.trustedTypes.createPolicy('default', {
      createHTML: (value) => value,
      createScriptURL: (value) => value
    });

    window.BMSTrustedTypesPolicy = policy;
    return {
      html: (value) => policy.createHTML(value),
      scriptURL: (value) => policy.createScriptURL(value)
    };
  } catch (_) {
    return fallback;
  }
})();

document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------------------------
  // CONFIGURATION CENTRALISÉE
  // --------------------------------------------------------------------------
  const CONFIG = {
    theme: {
      storageKey: 'bms-theme-preference'
    },
    animations: {
      threshold: 0.1,
      rootMargin: '0px'
    },
    scrollspy: {
      rootMargin: '-50% 0px -50% 0px'
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: THÈME (mode sombre + préférences)
  // --------------------------------------------------------------------------
  const setupThemeMode = () => {
    try {
      const storageKey = (CONFIG.theme && CONFIG.theme.storageKey) || 'bms-theme-preference';

      const getStoredTheme = () => {
        try {
          const value = localStorage.getItem(storageKey);
          return value === 'dark' || value === 'light' ? value : null;
        } catch (_) {
          return null;
        }
      };

      const applyTheme = (theme) => {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-theme', isDark);
        try {
          document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
        } catch (_) {
          // non-bloquant
        }
      };

      const updateToggleState = (theme) => {
        const isDark = theme === 'dark';
        document.querySelectorAll('.theme-toggle').forEach((btn) => {
          btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        });
      };

      const stored = getStoredTheme();
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = stored || (prefersDark ? 'dark' : 'light');

      applyTheme(initialTheme);
      updateToggleState(initialTheme);

      const toggleTheme = () => {
        const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
        applyTheme(nextTheme);
        updateToggleState(nextTheme);
        try {
          localStorage.setItem(storageKey, nextTheme);
        } catch (_) {
          // non-bloquant
        }
      };

      const toggles = document.querySelectorAll('.theme-toggle');
      toggles.forEach((btn) => {
        if (!btn.hasAttribute('type')) {
          btn.setAttribute('type', 'button');
        }
        btn.addEventListener('click', toggleTheme);
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
          }
        });
      });

      // Suivre les changements système seulement si aucune préférence explicite n'est stockée
      if (!stored && window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const syncWithSystem = (e) => {
          const theme = e.matches ? 'dark' : 'light';
          applyTheme(theme);
          updateToggleState(theme);
        };
        if (typeof mq.addEventListener === 'function') {
          mq.addEventListener('change', syncWithSystem);
        } else if (typeof mq.addListener === 'function') {
          mq.addListener(syncWithSystem);
        }
      }
    } catch (_) {
      // non-bloquant
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: SKIP LINK (Aller au contenu) pour accessibilité
  // --------------------------------------------------------------------------
  const setupSkipLink = () => {
    try {
      // Ne rien faire si un skip-link existe déjà
      if (document.querySelector('.skip-link')) return;

      const main =
        document.getElementById('main-content') ||
        document.querySelector('main');

      if (!main) return;

      // S'assurer que la cible a un id
      if (!main.id) {
        main.id = 'main-content';
      }

      const link = document.createElement('a');
      link.href = `#${main.id}`;
      link.className = 'skip-link';
      link.textContent = 'Aller au contenu principal';

      // On place le lien tout en haut du body, avant le header
      const body = document.body;
      if (body.firstChild) {
        body.insertBefore(link, body.firstChild);
      } else {
        body.appendChild(link);
      }
    } catch (_) {
      // non-bloquant
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: MENU HAMBURGER & ACCESSIBILITÉ
  // --------------------------------------------------------------------------
  const setupHamburgerMenu = () => {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const navOverlay = document.getElementById('navOverlay');

    // Assurer que le bouton hamburger n'est pas traité comme submit dans des pages avec formulaire
    try {
      if (hamburger && !hamburger.hasAttribute('type')) {
        hamburger.setAttribute('type', 'button');
      }
    } catch (_) {}

    if (!hamburger || !navLinks || !navOverlay) {
      console.warn("Éléments du menu mobile non trouvés. Le module ne sera pas initialisé.");
      return;
    }

    const focusableElements = navLinks.querySelectorAll('a[href], button');
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    const toggleMenu = (isActive) => {
      hamburger.classList.toggle('active', isActive);
      navLinks.classList.toggle('active', isActive);
      navOverlay.classList.toggle('active', isActive);
      hamburger.setAttribute('aria-expanded', isActive);
      document.body.style.overflow = isActive ? 'hidden' : '';
      if (isActive && firstFocusableElement) {
        firstFocusableElement.focus();
      }
    };

    const handleMenuClick = () => {
      const isActive = !hamburger.classList.contains('active');
      toggleMenu(isActive);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && hamburger.classList.contains('active')) {
        toggleMenu(false);
      }
      // Focus Trap
      if (e.key === 'Tab' && hamburger.classList.contains('active') && firstFocusableElement && lastFocusableElement) {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusableElement) {
            lastFocusableElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastFocusableElement) {
            firstFocusableElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    hamburger.addEventListener('click', handleMenuClick);
    navOverlay.addEventListener('click', () => toggleMenu(false));
    document.addEventListener('keydown', handleKeyDown);
    
    // Fermer le menu quand on clique sur un lien
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          toggleMenu(false);
        }
      });
    });
  };

  // --------------------------------------------------------------------------
  // MODULE: NAVIGATION PRINCIPALE UNIFIÉE (menu + sous-menu Services)
  // --------------------------------------------------------------------------
  const setupUnifiedHeaderNav = () => {
    try {
      const navLinks = document.getElementById('navLinks');
      if (!navLinks) return;

      const normalizePath = (p) => {
        if (!p) return '/';
        let out = p.split('#')[0].split('?')[0];
        if (out.length > 1 && out.endsWith('/')) {
          out = out.slice(0, -1);
        }
        return out || '/';
      };

      const current = normalizePath(window.location.pathname || '/');

      // Règle d'active state : basée sur le préfixe du path courant
      const isPathActive = (href) => {
        const target = normalizePath(href);
        if (target === '/') {
          return current === '/';
        }
        return current === target || current.startsWith(target + '/');
      };

      const inServicesSection = (() => {
        const prefixes = [
          '/services',
          '/ventousage',
          '/affichage-riverains',
          '/signalisation-barrierage',
          '/gardiennage',
          '/securite-plateaux',
          '/securite-gardiennage',
          '/convoyage-vehicules-decors',
          '/regie-materiel',
          '/loges-confort',
          '/cantine-catering',
          '/transport-materiel-audiovisuel-paris',
          '/autorisation-occupation-domaine-public-tournage-paris',
          '/ventousage-cinema',
          '/urban-regie',
          '/demenagement-aot',
          '/panneaux-demenagement'
        ];
        if (prefixes.some(prefix => current === prefix || current.startsWith(prefix + '/'))) return true;
        if (current.startsWith('/ventousage-')) return true;
        if (current.startsWith('/securite-tournage-')) return true;
        if (current.startsWith('/logistique-')) return true;
        return false;
      })();

      const isHome = isPathActive('/');
      const isRealisations = isPathActive('/realisations/');
      const isContact = isPathActive('/contact/');
      const isServicesActive = inServicesSection || isPathActive('/services/');

      const navItems = [];

      // Accueil
      navItems.push(
        `<li><a href="/" class="nav-link${isHome ? ' active' : ''}">Accueil</a></li>`
      );

      // Services + sous-menu
      navItems.push(
        `<li class="has-submenu">
          <a href="/services/" class="nav-link submenu-trigger${isServicesActive ? ' active' : ''}">
            Services
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16">
              <path d="M1.5 5.5 8 12l6.5-6.5-1.4-1.4L8 9.2 2.9 4.1z"/>
            </svg>
          </a>
          <div class="nav-submenu">
            <div class="nav-submenu-group">
              <span class="group-title">Sécurité &amp; gardiennage</span>
              <ul class="group-list">
                <li><a href="/securite-plateaux/">Sécurité de plateaux</a></li>
                <li><a href="/gardiennage/">Gardiennage</a></li>
              </ul>
            </div>
            <div class="nav-submenu-group">
              <span class="group-title">Logistique &amp; <span class="notranslate" translate="no">ventousage</span></span>
              <ul class="group-list">
                <li><a href="/ventousage/"><span class="notranslate" translate="no">Ventousage</span> &amp; autorisations</a></li>
                <li><a href="/ventousage-paris/"><span class="notranslate" translate="no">Ventousage</span> Paris</a></li>
                <li><a href="/affichage-riverains/">Affichage riverains</a></li>
                <li><a href="/signalisation-barrierage/">Signalisation &amp; barriérage</a></li>
                <li><a href="/demenagement-aot/">Déménagement + AOT</a></li>
                <li><a href="/panneaux-demenagement/">Panneaux de déménagement</a></li>
              </ul>
            </div>
            <div class="nav-submenu-group">
              <span class="group-title">Régie &amp; confort</span>
              <ul class="group-list">
                <li><a href="/regie-materiel/">Régie &amp; matériel</a></li>
                <li><a href="/loges-confort/">Loges &amp; confort</a></li>
                <li><a href="/cantine-catering/">Cantine &amp; catering</a></li>
              </ul>
            </div>
            <div class="nav-submenu-group">
              <span class="group-title">Transport</span>
              <ul class="group-list">
                <li><a href="/convoyage-vehicules-decors/">Convoyage véhicules &amp; décors</a></li>
                <li><a href="/transport-materiel-audiovisuel-paris/">Transport matériel audiovisuel</a></li>
              </ul>
            </div>
            <div class="nav-submenu-group">
              <span class="group-title">Territoires</span>
              <ul class="group-list">
                <li><a href="/ventousage-paris/">Paris</a></li>
                <li><a href="/ventousage-pantin/">Pantin</a></li>
                <li><a href="/ventousage-lyon/">Lyon</a></li>
                <li><a href="/ventousage-marseille/">Marseille</a></li>
                <li><a href="/ventousage-bordeaux/">Bordeaux</a></li>
                <li><a href="/ventousage-strasbourg/">Strasbourg</a></li>
                <li><a href="/ventousage-nice/">Nice</a></li>
                <li><a href="/ventousage-toulouse/">Toulouse</a></li>
                <li><a href="/ventousage-lille/">Lille</a></li>
                <li><a href="/ventousage-rennes/">Rennes</a></li>
                <li><a href="/ventousage-nantes/">Nantes</a></li>
                <li><a href="/ventousage-reims/">Reims</a></li>
                <li><a href="/ventousage-rouen/">Rouen</a></li>
                <li><a href="/ventousage-orleans/">Orléans</a></li>
              </ul>
            </div>
            <div class="nav-submenu-group">
              <span class="group-title">Tous les services</span>
              <ul class="group-list">
                <li><a href="/services/">Voir tous les services</a></li>
              </ul>
            </div>
          </div>
        </li>`
      );

      // Réalisations
      navItems.push(
        `<li><a href="/realisations/" class="nav-link${isRealisations ? ' active' : ''}">Réalisations</a></li>`
      );

      // Contact
      navItems.push(
        `<li><a href="/contact/" class="nav-link${isContact ? ' active' : ''}">Contact</a></li>`
      );

      // CTA principal
      navItems.push(
        `<li><a href="/contact/" class="nav-link btn nav-cta">Demander un devis</a></li>`
      );

      // Lien version anglaise (mini switch EN)
      navItems.push(
        `<li><a href="/en/" class="nav-link">EN</a></li>`
      );

      // Bouton mode gaucher / droitier
      navItems.push(
        `<li>
          <button class="hand-toggle" type="button" aria-label="Basculer en mode gaucher ou droitier">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16">
              <path d="M6.75 1a.75.75 0 0 1 .75.75V8a.5.5 0 0 0 1 0V5.467l.086-.004c.317-.012.637-.008.816.027.134.027.294.096.448.182.077.042.15.147.15.314V8a.5.5 0 0 0 1 0V6.435l.106-.01c.316-.024.584-.01.708.04.118.046.3.207.486.43.081.096.15.19.2.259V8.5a.5.5 0 1 0 1 0v-1h.342a1 1 0 0 1 .995 1.1l-.271 2.715a2.5 2.5 0 0 1-.317.991l-1.395 2.442a.5.5 0 0 1-.434.252H6.118a.5.5 0 0 1-.447-.276l-1.232-2.465-2.512-4.185a.517.517 0 0 1 .809-.631l2.41 2.41A.5.5 0 0 0 6 9.5V1.75A.75.75 0 0 1 6.75 1M8.5 4.466V1.75a1.75 1.75 0 1 0-3.5 0v6.543L3.443 6.736A1.517 1.517 0 0 0 1.07 8.588l2.491 4.153 1.215 2.43A1.5 1.5 0 0 0 6.118 16h6.302a1.5 1.5 0 0 0 1.302-.756l1.395-2.441a3.5 3.5 0 0 0 .444-1.389l.271-2.715a2 2 0 0 0-1.99-2.199h-.581a5 5 0 0 0-.195-.248c-.191-.229-.51-.568-.88-.716-.364-.146-.846-.132-1.158-.108l-.132.012a1.26 1.26 0 0 0-.56-.642 2.6 2.6 0 0 0-.738-.288c-.31-.062-.739-.058-1.05-.046zm2.094 2.025"/>
            </svg>
          </button>
        </li>`
      );

      // Bouton mode sombre / clair
      navItems.push(
        `<li>
          <button class="theme-toggle" type="button" aria-label="Activer ou désactiver le mode sombre">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16">
              <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278M4.858 1.311A7.27 7.27 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.32 7.32 0 0 0 5.205-2.162q-.506.063-1.029.063c-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286"/>
              <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.73 1.73 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.73 1.73 0 0 0 1.097-1.097zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/>
            </svg>
          </button>
        </li>`
      );

      // Injecte le menu construit dans le <ul id="navLinks">
      if (navItems.length) {
        navLinks.innerHTML = BMS_TRUSTED_TYPES.html(navItems.join(''));
      }

      // Interaction du sous-menu Services :
      // gérée en CSS (hover + focus-within) pour garder "Services" cliquable vers /services/.
      // Aucun blocage de clic n'est appliqué côté JS.
    } catch (_) {
      // non-bloquant
    }
  };

  // Alias pour compatibilité avec l'initialisation globale
  const setupUnifiedHeader = setupUnifiedHeaderNav;

  // --------------------------------------------------------------------------
  // MODULE: ANIMATIONS AU DÉFILEMENT (Intersection Observer)
  // --------------------------------------------------------------------------
  const setupScrollAnimations = () => {
    // Collecte des éléments à animer
    const animatedItemsSet = new Set(document.querySelectorAll('.animated-item'));
    // Ajoute les logos du carrousel pour des apparitions progressives
    document.querySelectorAll('.references-carousel .carousel-slide').forEach(el => {
      el.classList.add('animated-item');
      animatedItemsSet.add(el);
    });

    const animatedItems = Array.from(animatedItemsSet);
    if (animatedItems.length === 0) return;

    // Stagger: assigne un index par groupe (section/hero/footer)
    const groups = new Map();
    animatedItems.forEach(el => {
      const parent = el.closest('.section') || el.closest('.hero') || el.closest('.footer') || document.body;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach(items => {
      items.forEach((el, idx) => {
        el.dataset.staggerIndex = String(idx);
      });
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const idx = parseInt(el.dataset.staggerIndex || '0', 10);
          if (!prefersReducedMotion) {
            el.style.transitionDelay = (idx * 0.15) + 's'; // 150 ms entre éléments
          }
          el.classList.add('is-visible');
          obs.unobserve(el);
        }
      });
    }, {
      rootMargin: CONFIG.animations.rootMargin,
      threshold: CONFIG.animations.threshold
    });

    animatedItems.forEach(item => observer.observe(item));
  };

  // --------------------------------------------------------------------------
  // MODULE: FAQ INTERACTIVE
  // --------------------------------------------------------------------------
  const setupFaqAccordion = () => {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) {
      return;
    }

    faqItems.forEach((item, index) => {
      let question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;

      // Si la question n'est pas déjà un bouton, on la transforme en <button>
      if (question.tagName.toLowerCase() !== 'button') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = question.className || 'faq-question';
        btn.innerHTML = BMS_TRUSTED_TYPES.html(question.innerHTML);
        if (question.parentNode) {
          question.parentNode.replaceChild(btn, question);
        }
        question = btn;
      } else if (!question.hasAttribute('type')) {
        question.setAttribute('type', 'button');
      }

      const questionId = question.id || `faq-question-${index + 1}`;
      const answerId = answer.id || `faq-answer-${index + 1}`;

      question.id = questionId;
      question.setAttribute('aria-controls', answerId);
      answer.id = answerId;
      answer.setAttribute('role', 'region');
      answer.setAttribute('aria-labelledby', questionId);

      // Par défaut, on replie les réponses et on aligne aria-expanded
      if (!answer.hasAttribute('hidden')) {
        answer.setAttribute('hidden', '');
      }
      question.setAttribute('aria-expanded', answer.hasAttribute('hidden') ? 'false' : 'true');

      const toggleFAQ = () => {
        const isExpanded = question.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;

        // Ferme les autres éléments de la FAQ (accordéon exclusif)
        faqItems.forEach(otherItem => {
          if (otherItem === item) return;
          const otherQuestion = otherItem.querySelector('.faq-question');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          if (!otherQuestion || !otherAnswer) return;
          otherQuestion.setAttribute('aria-expanded', 'false');
          otherAnswer.setAttribute('hidden', '');
          otherItem.classList.remove('is-open');
        });

        // Bascule l'élément courant
        question.setAttribute('aria-expanded', nextState ? 'true' : 'false');
        if (nextState) {
          answer.removeAttribute('hidden');
          item.classList.add('is-open');
        } else {
          answer.setAttribute('hidden', '');
          item.classList.remove('is-open');
        }
      };

      // Événements
      question.addEventListener('click', toggleFAQ);
      question.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFAQ();
        }
      });
    });
  };

  // --------------------------------------------------------------------------
  // MODULE: CARROUSEL DES RÉFÉRENCES
  // --------------------------------------------------------------------------
  const setupReferencesCarousel = () => {
    const track = document.querySelector('.references-carousel .carousel-track');
    const slides = track ? Array.from(track.children) : [];
    const prevBtn = document.querySelector('.references-carousel .carousel-control.prev');
    const nextBtn = document.querySelector('.references-carousel .carousel-control.next');
    
    if (!track || slides.length === 0 || !prevBtn || !nextBtn) {
      return;
    }

    // Accessibilité des contrôles de carrousel
    [prevBtn, nextBtn].forEach((btn) => {
      if (!btn) return;
      if (!btn.hasAttribute('type')) {
        btn.setAttribute('type', 'button');
      }
    });
    if (!prevBtn.getAttribute('aria-label')) {
      prevBtn.setAttribute('aria-label', 'Slide précédent');
    }
    if (!nextBtn.getAttribute('aria-label')) {
      nextBtn.setAttribute('aria-label', 'Slide suivant');
    }

    let currentIndex = 0;
    
    const getSlideWidth = () => {
      const slide = slides[0];
      const slideStyle = window.getComputedStyle(slide);
      const marginRight = parseFloat(slideStyle.marginRight) || 0;
      return slide.getBoundingClientRect().width + marginRight;
    };
    
    const scrollToIndex = (index) => {
      const slideWidth = getSlideWidth();
      const position = slideWidth * index;
      track.scrollTo({ left: position, behavior: 'smooth' });
    };
    
    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % slides.length;
      scrollToIndex(currentIndex);
    });
    
    prevBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      scrollToIndex(currentIndex);
    });
  };

  // --------------------------------------------------------------------------
  // MODULE: BOUTON "RETOUR EN HAUT"
  // --------------------------------------------------------------------------
  const setupBackToTop = () => {
    const backToTopButton = document.querySelector('.back-to-top');
    if (!backToTopButton) return;

    const toggleBackToTop = () => {
      if (window.scrollY > 300) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    };

    const scrollToTop = (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };

    window.addEventListener('scroll', toggleBackToTop);
    backToTopButton.addEventListener('click', scrollToTop);
  };

  // --------------------------------------------------------------------------
  // MODULE: COOKIE BANNER (Consent Mode v2) - Analytics uniquement
  // --------------------------------------------------------------------------
  const setupCookieBanner = (force = false) => {
    if (!window.BMSAnalytics || (!force && window.BMSAnalytics.hasChoice())) return;
    let banner = document.getElementById('cookie-banner');
    if (!banner) {
      const returnFocus = force ? document.activeElement : null;
      banner = document.createElement('section');
      banner.id = 'cookie-banner';
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-labelledby', 'cookie-title');
      banner.setAttribute('aria-describedby', 'cookie-description');
      banner.innerHTML = BMS_TRUSTED_TYPES.html(`
        <div class="cookie-banner__content">
          <div><h2 id="cookie-title">Votre choix de mesure d’audience</h2>
          <p id="cookie-description">Avec votre accord, Google Analytics et Microsoft Clarity nous aident à améliorer le site.
          Vous pouvez refuser ou retirer votre accord à tout moment. Le téléphone, l’e-mail et WhatsApp restent disponibles.
          <a href="/politique-confidentialite/">En savoir plus</a>.</p></div>
          <div class="cookie-banner__actions">
            <button type="button" id="cookie-decline" class="btn btn-secondary">Refuser</button>
            <button type="button" id="cookie-accept" class="btn btn-primary">Accepter</button>
          </div>
        </div>`);
      document.body.appendChild(banner);
      const close = granted => {
        window.BMSAnalytics.setConsent(granted);
        banner.remove();
        returnFocus?.focus({ preventScroll: true });
      };
      banner.querySelector('#cookie-accept').addEventListener('click', () => close(true));
      banner.querySelector('#cookie-decline').addEventListener('click', () => close(false));
    }
    if (force) banner.querySelector('#cookie-decline').focus();
  };

  // --------------------------------------------------------------------------
  // MODULE: ÉVÉNEMENTS ANALYTICS (GA4)
  // --------------------------------------------------------------------------
  const setupAnalyticsEvents = () => {
    // Delegation also covers CTA/header/footer elements inserted by other modules.
    document.addEventListener('click', event => {
      const anchor = event.target.closest && event.target.closest('a[href]');
      if (!anchor || !window.BMSAnalytics) return;
      const method = getBMSContactMethod(anchor.href);
      const origin = location.pathname.startsWith('/contact-nfc') ? 'nfc' :
        location.pathname.startsWith('/contact-direct') ? 'contact_direct' : 'site';
      if (method) {
        window.BMSAnalytics.track(method + '_click', { contact_method: method, lead_origin: origin });
        trackLeadContact(method, origin);
      } else if (anchor.pathname === '/contact/' && anchor.origin === location.origin && location.pathname !== '/contact/') {
        window.BMSAnalytics.track('cta_contact_click');
      }
    });
  };

  // --------------------------------------------------------------------------
  // MODULE: TRACKING SPÉCIFIQUE PAGE NFC /contact-nfc/
  // --------------------------------------------------------------------------
  const setupNfcPageTracking = () => {
    if (!document.body.classList.contains('page-contact-nfc')) return;
    window.BMSAnalytics?.track('nfc_page_view');
    document.getElementById('nfc-add-contact')?.addEventListener('click', () => {
      window.BMSAnalytics?.track('contact_card_download', { contact_method: 'contact_card', lead_origin: 'nfc' });
    });
  };

  // --------------------------------------------------------------------------
  // MODULE: BREADCRUMB visible + JSON-LD (basique)
  // --------------------------------------------------------------------------
  const setupBreadcrumbs = () => {
    try {
      const path = window.location.pathname;
      if (path === '/' || path === '') return; // Pas de breadcrumb sur la home
      // Pas de breadcrumb sur la page funnel NFC
      if (document.body && document.body.classList.contains('page-contact-nfc')) return;

      const header = document.querySelector('header.header');
      if (!header) return;

      const h1 = document.querySelector('main h1');
      const pageName = h1 ? h1.textContent.trim() : (document.title || 'Page');

      // Construit le fil d'ariane (classes CSS, pas de styles inline)
      const nav = document.createElement('nav');
      nav.className = 'breadcrumb';
      nav.setAttribute('aria-label', "Fil d’Ariane");

      const container = document.createElement('div');
      container.className = 'container';

      const ol = document.createElement('ol');
      ol.className = 'breadcrumb-list';

      const homeLi = document.createElement('li');
      const homeA = document.createElement('a');
      homeA.href = '/';
      homeA.textContent = 'Accueil';
      homeA.className = 'breadcrumb-link';
      homeLi.appendChild(homeA);

      const sep = document.createElement('span');
      sep.textContent = '›';
      sep.className = 'breadcrumb-sep';

      const currentLi = document.createElement('li');
      currentLi.textContent = pageName;
      currentLi.className = 'breadcrumb-current';

      ol.appendChild(homeLi);
      ol.appendChild(sep);
      ol.appendChild(currentLi);
      container.appendChild(ol);
      nav.appendChild(container);

      header.insertAdjacentElement('afterend', nav);

      // JSON-LD BreadcrumbList
      const ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://bmsventouse.fr/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": pageName,
            "item": `https://bmsventouse.fr${path}`
          }
        ]
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(ld);
      document.head.appendChild(script);
    } catch (e) {
      // non-bloquant
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: CANONICAL FALLBACK (global, zéro maintenance)
  // --------------------------------------------------------------------------
  const setupCanonicalFallback = () => {
    try {
      // Ne rien faire si une canonical est déjà définie dans le <head>
      if (document.querySelector('link[rel="canonical"]')) return;
      const { protocol, hostname, pathname } = location;
      const proto = protocol === 'http:' ? 'https:' : protocol;
      let path = pathname || '/';
      // Ajoute un slash final pour les pages dossier (pas pour les fichiers .html, .txt, etc.)
      if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) {
        path += '/';
      }
      const url = proto + '//' + hostname.replace(/\/+$/, '') + path;
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = url;
      document.head.appendChild(link);
    } catch (_) {
      // non-bloquant
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: PASSE ORTHOGRAPHIQUE (typographie FR) — global, non destructif
  // --------------------------------------------------------------------------
  const setupFrenchTypoCleaning = () => {
    try {
      const skipTags = new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','KBD','SAMP','VAR']);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentNode;
        if (!parent || skipTags.has(parent.nodeName)) continue;
        let t = node.nodeValue;
        if (!t || !t.trim()) continue;
        // Espaces insécables avant ; : ? !
        t = t.replace(/(\S)\s([;:?!])/g, '$1\u00A0$2');
        // Nombre + heure -> NBSP
        t = t.replace(/(\d+)\s?h(?![a-zA-Z])/g, '$1\u00A0h');
        // Nombre + €
        t = t.replace(/(\d+)\s?€\b/g, '$1\u00A0€');
        // Ellipses
        t = t.replace(/\.{3}/g, '…');
        // Nettoyage espaces multiples
        t = t.replace(/\s{2,}/g, ' ');
        if (t !== node.nodeValue) node.nodeValue = t;
      }
    } catch (_) {
      // non-bloquant
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: PRÉFÉRENCE GAUCHER / DROITIER (placement des actions à une main)
  // --------------------------------------------------------------------------
  const setupHandPreference = () => {
    try {
      const STORAGE_KEY = 'bms_hand_pref';
      const btn = document.querySelector('.hand-toggle');
      const body = document.body;
      if (!btn || !body) return;

      const applyPref = (value) => {
        if (value === 'left') {
          body.classList.add('left-handed');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', 'Mode gaucher activé (actions principales accessibles à la main gauche)');
        } else {
          body.classList.remove('left-handed');
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-label', 'Mode droitier activé (actions principales accessibles à la main droite)');
        }
      };

      let pref = 'right';
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'left' || stored === 'right') {
          pref = stored;
        }
      } catch (_) {}

      applyPref(pref);

      btn.addEventListener('click', () => {
        pref = (pref === 'right') ? 'left' : 'right';
        applyPref(pref);
        try {
          localStorage.setItem(STORAGE_KEY, pref);
        } catch (_) {}
      });
    } catch (_) {
      // non-bloquant
    }
  };

  // --------------------------------------------------------------------------
  // MODULE: BARRE DE PROGRESSION DE SCROLL
  // --------------------------------------------------------------------------
  const setupScrollProgress = () => {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = h > 0 ? (window.scrollY / h) : 0;
      bar.style.transform = 'scaleX(' + ratio + ')';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  };

  // ==========================================================================
  // INITIALISATION DE TOUS LES MODULES
  // ==========================================================================
  try {
    // Construire d'abord le header/nav unifiés, puis activer le mode sombre
    setupUnifiedHeader();
    setupHamburgerMenu();
    setupThemeMode();
    setupCookieBanner();
    setupSkipLink();
    setupUnifiedFooter();
    setupHeroLayout();
    setupScrollAnimations();
    setupHeroParallax();
    setupFaqAccordion();
    setupReferencesCarousel();
    setupBackToTop();
    setupAnalyticsEvents();
    setupNfcPageTracking();
    setupHandPreference();
    setupBreadcrumbs();
    // Barre de progression de scroll uniquement sur desktop pour limiter le travail JS sur mobile
    try {
      if (window.innerWidth >= 1024) {
        setupScrollProgress();
      }
    } catch (_) {
      // non-bloquant
    }
    // Global canonical (fallback si manquante)
    setupCanonicalFallback();
    // Passe orthographique typographique FR reportée après le chargement initial
    try {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(setupFrenchTypoCleaning);
      } else {
        setTimeout(setupFrenchTypoCleaning, 1500);
      }
    } catch (_) {
      // non-bloquant
    }
    // Harmonisation des emails: mécanisme legacy désormais désactivé (migration terminée)

    // PWA: enregistrement du Service Worker (pour PWA=100)
    setupServiceWorker();
    // Galerie Ventousage Paris (si la section est présente sur la page)
    setupVentousageParisGallery();
    // Perf: améliorer le lazy/decoding des images (hors héros)
    enhanceImages();
    // Pop-up Fashion Week 2026 (offre temporaire, affichée une seule fois par session)
    // setupFashionWeekPopup();
    // Protéger les termes métier (ventousage...) des traductions automatiques approximatives
    protectVentousageTerms();

    document.querySelectorAll('.manage-cookies,[data-cookie="manage"]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        setupCookieBanner(true);
      });
    });

    console.log('🚀 BMS Ventouse - Tous les modules initialisés avec succès');
  } catch (error) {
    console.error("Erreur lors de l'initialisation des scripts du site :", error);
  }
});

// Exact BMS destinations only; no URL/subject/body or third-party coordinates are measured.
function getBMSContactMethod(href) {
  try {
    const url = new URL(href, location.origin);
    if (url.protocol === 'tel:' && url.pathname.replace(/[^+0-9]/g, '') === '+33646005642') return 'phone';
    if (url.protocol === 'mailto:' && decodeURIComponent(url.pathname).toLowerCase() === 'contact@bmsventouse.fr') return 'email';
    if (url.protocol === 'https:' && url.hostname === 'wa.me' && /^\/33646005642\/?$/.test(url.pathname)) return 'whatsapp';
  } catch (_) { /* Unsupported or malformed links are not commercial events. */ }
  return null;
}

function trackLeadContact(contactMethod, leadOrigin) {
  // This is a contact intention, never proof of a received or qualified request.
  if (!['phone', 'email', 'whatsapp'].includes(contactMethod)) return;
  window.BMSAnalytics?.track('lead_contact', { contact_method: contactMethod, lead_origin: leadOrigin });
}

// --------------------------------------------------------------------------
// MODULE: FOOTER UNIFIÉ BMS VENTOUSE
// --------------------------------------------------------------------------
function setupUnifiedFooter() {
  try {
    const footerContent = document.querySelector('.footer .footer-content');
    const footerBottom = document.querySelector('.footer-bottom-content p');

    if (!footerContent) return;

    const html = `
        <div class="footer-brand">
          <div class="footer-logo">
            <img src="/android-chrome-192x192.webp" alt="BMS Ventouse" width="40" height="40" class="footer-logo-img">
            <div class="footer-brand-text notranslate" translate="no">
              <span class="footer-bms">BMS</span><span class="footer-ventouse">Ventouse</span>
            </div>
          </div>
          <p class="footer-description">
            Votre partenaire logistique et sécurité pour des productions sereines et efficaces, partout en France.
          </p>
          <div class="footer-social">
            <span>Suivez-nous&nbsp;:&nbsp;</span>
            <a href="https://www.instagram.com/bmsventouse" target="_blank" rel="noopener noreferrer">Instagram</a>
            &nbsp;·&nbsp;
            <a href="https://x.com/bmsventouse" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
          </div>
        </div>
        <div class="footer-links">
          <div class="footer-column">
            <h3>Navigation</h3>
            <ul>
              <li><a href="/">Accueil</a></li>
              <li><a href="/services/">Services</a></li>
              <li><a href="/ventousage-paris/"><span class="notranslate" translate="no">Ventousage Paris</span></a></li>
              <li><a href="/affichage-riverains/">Affichage riverains</a></li>
              <li><a href="/signalisation-barrierage/">Signalisation &amp; barriérage</a></li>
              <li><a href="/realisations/">Réalisations</a></li>
              <li><a href="/contact/">Contact</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h3>Territoires</h3>
            <ul>
              <li><a href="/ventousage-paris/">Paris</a></li>
              <li><a href="/ventousage-pantin/">Pantin</a></li>
              <li><a href="/ventousage-lyon/">Lyon</a></li>
              <li><a href="/ventousage-marseille/">Marseille</a></li>
              <li><a href="/ventousage-bordeaux/">Bordeaux</a></li>
              <li><a href="/ventousage-strasbourg/">Strasbourg</a></li>
              <li><a href="/ventousage-nice/">Nice</a></li>
              <li><a href="/ventousage-toulouse/">Toulouse</a></li>
              <li><a href="/ventousage-lille/">Lille</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h3>Contact Direct</h3>
            <ul>
              <li>
                <a href="tel:+33646005642">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16" style="margin-right:8px">
                    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877zM11 .5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.707l-4.146 4.147a.5.5 0 1 1-.708-.708L14.293 1H11.5a.5.5 0 0 1-.5-.5"/>
                  </svg>
                  +33&nbsp;6&nbsp;46&nbsp;00&nbsp;56&nbsp;42&nbsp;(Béna)
                </a>
              </li>
              <li>
                <a href="https://wa.me/33646005642" target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251A6.56 6.56 0 0 1 1.12 7.926c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                  </svg>
                  WhatsApp Direct
                </a>
              </li>
              <li>
                <a href="mailto:contact@bmsventouse.fr">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16" style="margin-right:8px">
                    <path d="M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2zm3.708 6.208L1 11.105V5.383zM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2z"/>
                    <path d="M14.247 14.269c1.01 0 1.587-.857 1.587-2.025v-.21C15.834 10.43 14.64 9 12.52 9h-.035C10.42 9 9 10.36 9 12.432v.214C9 14.82 10.438 16 12.358 16h.044c.594 0 1.018-.074 1.237-.175v-.73c-.245.11-.673.18-1.18.18h-.044c-1.334 0-2.571-.788-2.571-2.655v-.157c0-1.657 1.058-2.724 2.64-2.724h.04c1.535 0 2.484 1.05 2.484 2.326v.118c0 .975-.324 1.39-.639 1.39-.232 0-.41-.148-.41-.42v-2.19h-.906v.569h-.03c-.084-.298-.368-.63-.954-.63-.778 0-1.259.555-1.259 1.4v.528c0 .892.49 1.434 1.26 1.434.471 0 .896-.227 1.014-.643h.043c.118.42.617.648 1.12.648m-2.453-1.588v-.227c0-.546.227-.791.573-.791.297 0 .572.192.572.708v.367c0 .573-.253.744-.564.744-.354 0-.581-.215-.581-.8Z"/>
                  </svg>
                  contact@bmsventouse.fr
                </a>
              </li>
              <li>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16" style="margin-right:8px">
                  <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5C2.5 9.028 8 16 8 16s5.5-6.972 5.5-10.5A5.53 5.53 0 0 0 8 0m0 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5"/>
                </svg>
                10&nbsp;Rue de la République, 93700&nbsp;Drancy, France
              </li>
              <li>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16" style="margin-right:8px">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
                </svg>
                Disponible&nbsp;24/7&nbsp;— France entière
              </li>
              
            </ul>
          </div>
          <div class="footer-column">
            <h3>Légal</h3>
            <ul>
              <li><a href="/mentions/">Mentions Légales</a></li>
              <li><a href="/politique-confidentialite/">Politique de confidentialité</a></li>
              <li><a href="/conditions-generales-prestation/">Conditions générales de prestation</a></li>
              <li><a href="/llms.txt">Infos IA (llms.txt)</a></li>
              <li><a href="/ai.txt">Infos IA (ai.txt)</a></li>
              <li><a href="/infos-ia/">Infos IA (page)</a></li>
              <li><a href="#" class="manage-cookies" data-cookie="manage">Gérer les cookies</a></li>
            </ul>
          </div>
        </div>
    `;

    footerContent.innerHTML = BMS_TRUSTED_TYPES.html(html);

    if (footerBottom) {
      footerBottom.innerHTML = BMS_TRUSTED_TYPES.html('&copy; 2025 BMS Ventouse. Tous droits réservés. Site réalisé par <a href="https://smarterlogicweb.com" target="_blank" rel="noopener noreferrer">SmarterLogicWeb</a>.');
    }
  } catch (_) {
    // non-bloquant
  }
}

// --------------------------------------------------------------------------
// MODULE: HERO — STRUCTURE H1 + CTA + SECTION INTRO
// --------------------------------------------------------------------------
function setupHeroLayout() {
  try {
    // La home a déjà une structure de héros optimisée et stable ; on évite toute
    // restructuration DOM ici pour supprimer les layout shifts (CLS).
    if (document.body && document.body.classList.contains('page-accueil')) {
      return;
    }

    const heroSections = document.querySelectorAll('section.hero');
    if (!heroSections.length) return;

    const docEl = document.documentElement || document.body;
    const lang = (docEl && docEl.lang) ? docEl.lang.toLowerCase() : '';
    const isEnglish = lang.indexOf('en') === 0;

    // Applique le design de CTA héro (mêmes classes que la home)
    const applyHeroCTADesign = (heroButtonsEl) => {
      try {
        if (!heroButtonsEl) return;
        // Le conteneur reste strictement .hero-buttons (pas de variantes locales)
        heroButtonsEl.className = 'hero-buttons';

        const ctas = Array.from(heroButtonsEl.querySelectorAll('a, button'));
        if (!ctas.length) return;

        ctas.forEach((cta, idx) => {
          if (!cta) return;
          // CTA principal : même style que le bouton principal de la home
          // CTA secondaires : même style que le bouton secondaire de la home
          if (idx === 0) {
            cta.className = 'btn btn-primary';
          } else {
            cta.className = 'btn btn-secondary';
          }
        });
      } catch (_) {
        // non-bloquant
      }
    };

    heroSections.forEach((hero) => {
      if (!hero) return;

      const overlay = hero.querySelector('.hero-overlay');
      const container = overlay ? overlay.querySelector('.container') : null;
      if (!container) return;

      let heroButtons = container.querySelector('.hero-buttons');

      // Uniformise systématiquement le style des CTA présents dans le HERO
      if (heroButtons) {
        applyHeroCTADesign(heroButtons);
      }

      // Évite une double normalisation structurelle
      if (hero.dataset.heroNormalized === '1') return;

      const h1 = container.querySelector('h1');
      // Si aucun H1 n'est présent (cas de certaines pages spéciales), on ne
      // touche pas à la structure mais on a déjà harmonisé les CTA ci‑dessus.
      if (!h1) return;

      hero.dataset.heroNormalized = '1';

      const nodesToMove = [];
      Array.from(container.children).forEach((child) => {
        if (child === h1 || child === heroButtons) return;
        if (child.nodeType !== 1) return;
        nodesToMove.push(child);
      });

      const parent = hero.parentNode;
      if (!parent) return;

      const introSection = document.createElement('section');
      introSection.className = 'section section-hero-intro';

      const introContainer = document.createElement('div');
      introContainer.className = 'container';

      const h2 = document.createElement('h2');
      h2.className = 'section-title animated-item';
      h2.innerHTML = BMS_TRUSTED_TYPES.html(h1.innerHTML);
      introContainer.appendChild(h2);

      nodesToMove.forEach((node) => {
        introContainer.appendChild(node);
      });

      introSection.appendChild(introContainer);

      if (hero.nextSibling) {
        parent.insertBefore(introSection, hero.nextSibling);
      } else {
        parent.appendChild(introSection);
      }

      if (!heroButtons) {
        heroButtons = document.createElement('div');
        heroButtons.className = 'hero-buttons';

        if (isEnglish) {
          const primary = document.createElement('a');
          primary.href = 'tel:+33646005642';
          primary.className = 'btn btn-primary';
          primary.textContent = 'Contact us';
          heroButtons.appendChild(primary);

          const secondary = document.createElement('a');
          secondary.href = 'https://wa.me/33646005642?text=Hi,%20I%27m%20preparing%20a%20shoot%20or%20event%20in%20France%20and%20would%20like%20to%20discuss%20logistics%20with%20BMS%20Ventouse.';
          secondary.className = 'btn btn-secondary';
          secondary.target = '_blank';
          secondary.rel = 'noopener noreferrer';
          secondary.textContent = 'WhatsApp (English / French)';
          heroButtons.appendChild(secondary);
        } else {
          const primary = document.createElement('a');
          primary.href = 'tel:+33646005642';
          primary.className = 'btn btn-primary';
          primary.textContent = 'Appeler BMS';
          heroButtons.appendChild(primary);

          const secondary = document.createElement('a');
          secondary.href = 'https://wa.me/33646005642?text=Bonjour,%20je%20souhaite%20parler%20de%20mon%20projet.';
          secondary.className = 'btn btn-secondary';
          secondary.target = '_blank';
          secondary.rel = 'noopener noreferrer';
          secondary.textContent = 'WhatsApp Direct';
          heroButtons.appendChild(secondary);
        }

        container.appendChild(heroButtons);
      }

      if (heroButtons) {
        const referenceNode = h1.nextSibling;
        if (referenceNode) {
          container.insertBefore(heroButtons, referenceNode);
        } else {
          container.appendChild(heroButtons);
        }
        // Après création / repositionnement, on réapplique le design unifié
        applyHeroCTADesign(heroButtons);
      }
    });
  } catch (_) {
    // non-bloquant
  }
}

// --------------------------------------------------------------------------
// MODULE: PARALLAX HERO
// --------------------------------------------------------------------------
function setupHeroParallax() {
  const hero = document.querySelector('.hero');
  const img = hero ? hero.querySelector('.hero-bg img') : null;
  if (!hero || !img) return;

  // Désactive le parallax sur mobile pour limiter le travail JS au scroll
  const isMobile = window.innerWidth < 768;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || isMobile) return;

  img.style.willChange = 'transform';
  let ticking = false;

  const update = () => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      const offset = -rect.top * 0.5; // vitesse 0.5x pour effet parallax léger
      img.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

// --------------------------------------------------------------------------
// PWA: Service Worker registration
// --------------------------------------------------------------------------
function setupServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      // N'enregistre pas le SW en local/CI (http://localhost) pour éviter d'interférer avec les tests (Pa11y/Lighthouse)
      const isLocal = (location.protocol !== 'https:') || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      if (isLocal) return;
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  } catch (_) { /* non-bloquant */ }
}

// --------------------------------------------------------------------------
// Perf: améliorer les attributs des images (lazy/decoding) hors héros
// + normaliser les anciens SVG WhatsApp (Font Awesome) vers l’icône Bootstrap
// --------------------------------------------------------------------------
function enhanceImages() {
  try {
    // Optimisation des images
    document.querySelectorAll('img').forEach(img => {
      const inHero = img.closest('.hero-bg');
      if (!img.hasAttribute('loading') && !inHero) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });

    // Normalisation des anciens SVG WhatsApp (Font Awesome) vers l’icône Bootstrap 16x16
    const ns = 'http://www.w3.org/2000/svg';
    const WHATSAPP_PATH = 'M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232';

    document.querySelectorAll('svg[viewBox="0 0 448 512"] path').forEach(path => {
      const d = path.getAttribute('d') || '';
      // On cible uniquement le tracé WhatsApp Font Awesome (commence par M380.9 97.1C339-14.7)
      if (!d.startsWith('M380.9 97.1C339-14.7')) return;

      const svg = path.closest('svg');
      if (!svg) return;
      // Évite une double-normalisation éventuelle
      if (svg.dataset && svg.dataset.bmsWhatsappNormalized === '1') return;

      const width = svg.getAttribute('width') || '1em';
      const height = svg.getAttribute('height') || '1em';
      const style = svg.getAttribute('style') || '';
      const classes = svg.getAttribute('class') || '';
      const ariaHidden = svg.getAttribute('aria-hidden') || 'true';
      const focusable = svg.getAttribute('focusable') || 'false';

      const newSvg = document.createElementNS(ns, 'svg');
      newSvg.setAttribute('viewBox', '0 0 16 16');
      newSvg.setAttribute('fill', 'currentColor');
      newSvg.setAttribute('width', width);
      newSvg.setAttribute('height', height);
      newSvg.setAttribute('aria-hidden', ariaHidden);
      newSvg.setAttribute('focusable', focusable);
      if (style) newSvg.setAttribute('style', style);
      newSvg.setAttribute('class', (classes ? classes + ' ' : '') + 'bi bi-whatsapp');
      newSvg.dataset.bmsWhatsappNormalized = '1';

      const newPath = document.createElementNS(ns, 'path');
      newPath.setAttribute('d', WHATSAPP_PATH);
      newSvg.appendChild(newPath);

      if (svg.parentNode) {
        svg.parentNode.replaceChild(newSvg, svg);
      }
    });
  } catch (_) { /* non-bloquant */ }
}

// --------------------------------------------------------------------------
// MODULE: Galerie Ventousage (carrousel, affiché uniquement si des images sont déclarées)
// --------------------------------------------------------------------------
function setupVentousageParisGallery() {
  try {
    const track = document.getElementById('ventousageGallery');
    if (!track) return;

    const section = track.closest('.section');
    const wrapper = track.closest('.gallery-carousel');

    // Photos de ventousage (logo déjà intégré, plaques floutées, clients non identifiables)
// Pour en ajouter ou en retirer :
//  - déposer / supprimer les fichiers dans /images/ventousage-galerie/
    const IMAGES = [
      { src: '/images/ventousage-galerie/ventousage-paris-stationnement-neutralise-panneaux-b6-1.jpg', alt: 'Exemple de ventousage avec stationnement neutralisé et panneaux B6' },
      { src: '/images/ventousage-galerie/ventousage-paris-perimetre-jalonne-tournage-2.jpg', alt: 'Exemple de ventousage avec périmètre jalonné pour tournage' },
      { src: '/images/ventousage-galerie/ventousage-paris-signalisation-reglementaire-3.jpg', alt: 'Exemple de ventousage avec signalisation réglementaire en place' },
      { src: '/images/ventousage-galerie/ventousage-paris-emplacements-vehicules-techniques-4.jpg', alt: 'Exemple de ventousage pour emplacement de véhicules techniques' },
      { src: '/images/ventousage-galerie/ventousage-paris-cones-rubalise-voirie-5.jpg', alt: 'Exemple de ventousage avec cônes et rubalise en voirie' },
      { src: '/images/ventousage-galerie/ventousage-paris-preparation-tournage-6.jpg', alt: 'Exemple de ventousage en amont d’un tournage' },
      { src: '/images/ventousage-galerie/ventousage-paris-zone-urbaine-panneaux-temporaires-7.jpg', alt: 'Exemple de ventousage en zone urbaine avec panneaux temporaires' },
      { src: '/images/ventousage-galerie/ventousage-paris-signalisation-production-audiovisuelle-8.jpg', alt: 'Exemple de ventousage avec signalisation pour production audiovisuelle' },
      { src: '/images/ventousage-galerie/ventousage-paris-emplacement-reserve-equipe-tournage-9.jpg', alt: 'Exemple de ventousage avec emplacement réservé pour l’équipe de tournage' },
      { src: '/images/ventousage-galerie/ventousage-paris-neutralisation-multiple-places-stationnement-10.jpg', alt: 'Exemple de ventousage avec neutralisation de plusieurs places de stationnement' },
      { src: '/images/ventousage-galerie/ventousage-paris-dispositif-complet-stationnement-reserve-11.jpg', alt: 'Exemple de ventousage montrant un dispositif complet de stationnement réservé' },
      { src: '/images/ventousage-galerie/ventousage-paris-panneaux-jalonnage-trottoir-chaussee-12.jpg', alt: 'Exemple de ventousage avec panneaux et jalonnage sur trottoir et chaussée' },
      { src: '/images/ventousage-galerie/ventousage-paris-perimetre-materialise-tournage-13.jpg', alt: 'Exemple de ventousage pour un tournage, avec périmètre matérialisé' }
    ];

    // Si aucune image n'est déclarée, on masque complètement la section
    if (!IMAGES.length) {
      if (section) {
        section.style.display = 'none';
      }
      return;
    }

    // Construire les slides du carrousel
    IMAGES.forEach((item) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide gallery-slide';

      const figure = document.createElement('figure');
      figure.className = 'service-card';

      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 800;
      img.height = 450;

      figure.appendChild(img);
      slide.appendChild(figure);
      track.appendChild(slide);
    });

    // Mise en place de la navigation carrousel (précédent / suivant)
    if (!wrapper) return;
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    if (!slides.length) return;

    const prevBtn = wrapper.querySelector('.carousel-control.prev');
    const nextBtn = wrapper.querySelector('.carousel-control.next');
    const counter = wrapper.querySelector('.gallery-counter');
    if (!prevBtn || !nextBtn) return;

    // Accessibilité des contrôles de carrousel (galerie ventousage)
    [prevBtn, nextBtn].forEach((btn) => {
      if (!btn) return;
      if (!btn.hasAttribute('type')) {
        btn.setAttribute('type', 'button');
      }
    });
    if (!prevBtn.getAttribute('aria-label')) {
      prevBtn.setAttribute('aria-label', 'Photo précédente');
    }
    if (!nextBtn.getAttribute('aria-label')) {
      nextBtn.setAttribute('aria-label', 'Photo suivante');
    }

    const total = slides.length;
    let currentIndex = 0;

    const getSlideWidth = () => {
      const slide = slides[0];
      if (!slide) return 0;
      const style = window.getComputedStyle(slide);
      const marginRight = parseFloat(style.marginRight) || 0;
      return slide.getBoundingClientRect().width + marginRight;
    };

    const endMsg = document.getElementById('galleryEndMessage');

    const updateCounter = () => {
      if (counter) {
        counter.textContent = 'Photo ' + (currentIndex + 1) + ' / ' + total;
      }
      if (endMsg) {
        const atEnd = currentIndex === total - 1;
        endMsg.hidden = !atEnd;
        if (atEnd) {
          endMsg.classList.add('is-visible');
        } else {
          endMsg.classList.remove('is-visible');
        }
      }
    };

    const updateControls = () => {
      if (!prevBtn || !nextBtn) return;
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === total - 1;
    };

    const scrollToIndex = (index) => {
      const width = getSlideWidth();
      if (!width) return;
      const maxIndex = slides.length - 1;
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      track.scrollTo({
        left: width * currentIndex,
        behavior: 'smooth'
      });
      updateCounter();
      updateControls();
    };

    // Clic sur une photo : scroll vers le CTA avec message
    // Initialiser compteur et états des boutons
    updateCounter();
    updateControls();

    nextBtn.addEventListener('click', () => {
      scrollToIndex(currentIndex + 1);
    });

    prevBtn.addEventListener('click', () => {
      scrollToIndex(currentIndex - 1);
    });
  } catch (_) {
    // non-bloquant
  }
}

function protectVentousageTerms() {
  try {
    if (!document.body) return;

    const TERM_REGEX = /(Ventousage|ventousage|Ventouseurs?|ventouseurs?|Ventousé(?:e|es|s)?|ventousé(?:e|es|s)?|Ventouser|ventouser)/g;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !TERM_REGEX.test(node.nodeValue)) {
            TERM_REGEX.lastIndex = 0;
            return NodeFilter.FILTER_SKIP;
          }
          TERM_REGEX.lastIndex = 0;

          let el = node.parentElement;
          while (el) {
            if (el.classList && el.classList.contains('notranslate')) {
              return NodeFilter.FILTER_REJECT;
            }
            const tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
              return NodeFilter.FILTER_REJECT;
            }
            el = el.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let current;
    while ((current = walker.nextNode())) {
      nodes.push(current);
    }

    nodes.forEach(node => {
      const text = node.nodeValue;
      TERM_REGEX.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      while ((match = TERM_REGEX.exec(text))) {
        const index = match.index;

        if (index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, index)));
        }

        const span = document.createElement('span');
        span.className = 'notranslate';
        span.setAttribute('translate', 'no');
        span.textContent = match[0];
        frag.appendChild(span);

        lastIndex = index + match[0].length;
      }

      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      if (node.parentNode) {
        node.parentNode.replaceChild(frag, node);
      }
    });
  } catch (_) {
    // non-bloquant
  }
}

// --------------------------------------------------------------------------
// MODULE: Pop-up Paris Fashion Week 2026 (offre temporaire, affichée une fois par jour)
// --------------------------------------------------------------------------
function setupFashionWeekPopup() {
  try {
    if (!document.body) return;

    const now = new Date();

    // Fenêtres réelles de la Paris Fashion Week 2026 (FHCM) :
    // - Mode masculine A/H 2026-2027 : 20–25 janvier 2026
    // - Mode féminine A/H 2026-2027 : 2–10 mars 2026
    const fwMenStart  = new Date('2026-01-20T00:00:00');
    const fwMenEnd    = new Date('2026-01-25T23:59:59');
    const fwWomenStart = new Date('2026-03-02T00:00:00');
    const fwWomenEnd   = new Date('2026-03-10T23:59:59');

    const inJanuaryFW =
      now >= fwMenStart && now <= fwMenEnd;
    const inMarchFW =
      now >= fwWomenStart && now <= fwWomenEnd;

    // En dehors des vraies dates de Fashion Week 2026, on ne montre rien
    if (!inJanuaryFW && !inMarchFW) return;

    const STORAGE_KEY = 'bms_fw_popup_last_shown';
    const todayStr = now.toISOString().slice(0, 10); // format AAAA-MM-JJ

    try {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      // Si déjà affichée aujourd'hui, ne pas réafficher pour limiter l'agacement
      if (lastShown === todayStr) {
        return;
      }
    } catch (_) {
      // non-bloquant
    }

    let popup = document.getElementById('fwPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'fwPopup';
      popup.className = 'fw-popup';
      popup.setAttribute('aria-hidden', 'true');

      popup.innerHTML = BMS_TRUSTED_TYPES.html(`
        <div class="fw-popup-content" role="dialog" aria-modal="true" aria-labelledby="fwPopupTitle">
          <button class="fw-popup-close" type="button" aria-label="Fermer l'offre Paris Fashion Week 2026">×</button>
          <h2 id="fwPopupTitle">Paris Fashion Week 2026 – Offre ventousage</h2>
          <p>
            Pendant la <strong>Paris Fashion Week 2026</strong> à Paris
            (homme&nbsp;20–25&nbsp;janvier, femme&nbsp;2–10&nbsp;mars),
            profitez de <strong>-10&nbsp;% sur les frais de ventousage</strong>
            pour vos défilés, shows et shootings. Mentionnez
            <strong>FASHION WEEK</strong> dans votre message.
          </p>
          <div class="fw-popup-actions">
            <a href="/contact/" class="btn btn-primary">
              Parler de mon défilé
            </a>
            <a href="https://wa.me/33646005642?text=Bonjour,%20je%20pr%C3%A9pare%20un%20d%C3%A9fil%C3%A9%20ou%20shooting%20pendant%20la%20Paris%20Fashion%20Week%202026%20%C3%A0%20Paris%20et%20je%20souhaite%20profiter%20de%20l'offre%20FASHION%20WEEK."
               class="btn btn-secondary-alt"
               target="_blank"
               rel="noopener noreferrer">
              WhatsApp Fashion Week
            </a>
          </div>
        </div>
      `);
    }

    document.body.appendChild(popup);

    const showPopup = () => {
      popup.setAttribute('aria-hidden', 'false');
      try {
        localStorage.setItem(STORAGE_KEY, todayStr);
      } catch (_) {
        // non-bloquant
      }
    };

    // Afficher la pop-up rapidement (3 secondes) pour maximiser les contacts
    setTimeout(showPopup, 3000);

    const closeBtn = popup.querySelector('.fw-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.setAttribute('aria-hidden', 'true');
      });
    }
  } catch (_) {
    // non-bloquant
  }
}

// Expose la fonction sur window pour un déclenchement manuel éventuel,
// tout en évitant l'erreur de linter \"defined but never used\".
if (typeof window !== 'undefined') {
  window.setupFashionWeekPopup = window.setupFashionWeekPopup || setupFashionWeekPopup;
}
