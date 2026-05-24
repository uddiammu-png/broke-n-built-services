/* ====== LOADING OVERLAY ====== */
const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = `
  <div class="loading-content">
    <div class="loading-spinner">
      <div class="ring"></div>
      <div class="ring"></div>
      <div class="ring"></div>
    </div>
    <div class="loading-text">Transforming your view...</div>
    <div class="loading-bar"><div class="fill"></div></div>
  </div>
`;
document.body.appendChild(loadingOverlay);

function showLoading() {
  loadingOverlay.classList.add('active');
}

function hideLoading() {
  loadingOverlay.classList.remove('active');
}

/* ====== PERSISTENT SCROLL HANDLER (defined once to avoid listener leaks) ====== */
function handleNavScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}
window.addEventListener('scroll', handleNavScroll);

/* ====== SPA NAVIGATION ====== */
async function navigateTo(path) {
  const current = window.location.pathname;
  // Normalize paths
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '') || '/';
  if (cleanPath === current || cleanPath === current.replace(/\/+$/, '') || current === cleanPath) return;

  showLoading();

  try {
    const response = await fetch(cleanPath);
    if (!response.ok) throw new Error('Page load failed');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Update document title
    document.title = doc.title;

    // Update head meta (styles, canonical, OG)
    updateHeadMeta(doc);

    // Replace page content
    const oldContent = document.getElementById('page-content');
    const newContent = doc.getElementById('page-content');
    if (oldContent && newContent) {
      oldContent.innerHTML = newContent.innerHTML;
      oldContent.className = newContent.className || '';
    } else {
      // Fallback: normal navigation
      window.location.href = cleanPath;
      return;
    }

    // Update history
    history.pushState({ path: cleanPath }, '', cleanPath);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reinitialize all components
    initComponents();

    hideLoading();
  } catch (err) {
    console.error('Navigation error:', err);
    hideLoading();
    // Fallback to normal navigation
    window.location.href = cleanPath;
  }
}

// Intercept internal link clicks
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href) return;
  
  // Skip external links, anchors, tel, mailto
  if (href.startsWith('http') || href.startsWith('//') ||
      href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') ||
      href.startsWith('javascript:') || href.startsWith('data:')) return;

  // Skip links that open in new tab
  if (link.target === '_blank') return;

  e.preventDefault();
  navigateTo(href);
});

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  const path = e.state ? e.state.path : window.location.pathname;
  // Don't show loading on back/forward - it feels jarring
  loadPageSilent(path);
});

async function loadPageSilent(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Page load failed');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    document.title = doc.title;
    updateHeadMeta(doc);

    const oldContent = document.getElementById('page-content');
    const newContent = doc.getElementById('page-content');
    if (oldContent && newContent) {
      oldContent.innerHTML = newContent.innerHTML;
    }

    initComponents();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    window.location.reload();
  }
}

/* ====== SHARED HELPER: update head meta from parsed doc ====== */
function updateHeadMeta(doc) {
  // Update page-specific <style> tags
  document.querySelectorAll('head style').forEach(s => s.remove());
  doc.querySelectorAll('head style').forEach(s => {
    document.head.appendChild(s.cloneNode(true));
  });

  // Update canonical link
  const canonical = document.querySelector('link[rel="canonical"]');
  const newCanonical = doc.querySelector('link[rel="canonical"]');
  if (canonical && newCanonical) {
    canonical.href = newCanonical.href;
  }

  // Update Open Graph meta tags
  const ogTags = ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image'];
  ogTags.forEach(prop => {
    const oldMeta = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
    const newMeta = doc.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
    if (oldMeta && newMeta) {
      oldMeta.content = newMeta.content;
    }
  });
}

/* ====== INIT COMPONENTS ====== */
function initComponents() {
  // ====== NAVBAR SCROLL EFFECT ======
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navAnchors = document.querySelectorAll('.nav-links a');

  // Set active link based on current page
  const currentPath = window.location.pathname;
  navAnchors.forEach(a => {
    a.classList.remove('active');
    const href = a.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === '/')) {
      a.classList.add('active');
    } else if (currentPath.startsWith(href) && href !== '/') {
      a.classList.add('active');
    }
  });

  // Check initial scroll position
  handleNavScroll();

  // ====== MOBILE NAV TOGGLE ======
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
  }

  if (navAnchors) {
    navAnchors.forEach(a => {
      a.addEventListener('click', () => {
        if (navToggle) navToggle.classList.remove('active');
        if (navLinks) navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ====== COUNTER ANIMATION ======
  let countersAnimated = false;

  function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const increment = target / 60;

      const updateCount = () => {
        const current = parseInt(counter.innerText) || 0;
        if (current < target) {
          counter.innerText = Math.ceil(current + increment);
          requestAnimationFrame(updateCount);
        } else {
          counter.innerText = target;
        }
      };
      updateCount();
    });
  }

  const heroSection = document.getElementById('hero');

  // Disconnect old observer if any
  if (window._counterObserver) window._counterObserver.disconnect();

  if (heroSection) {
    const observerOptions = { threshold: 0.3 };
    window._counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          setTimeout(animateCounters, 500);
        }
      });
    }, observerOptions);
    window._counterObserver.observe(heroSection);
  }

  // ====== INTERSECTION OBSERVER FOR FADE-IN ======
  const fadeElements = document.querySelectorAll('.section-header, .about-content, .services-grid, .contact-content');
  if (window._fadeObserver) window._fadeObserver.disconnect();

  if (fadeElements.length > 0) {
    fadeElements.forEach(el => el.classList.add('fade-in'));

    window._fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    fadeElements.forEach(el => window._fadeObserver.observe(el));
  }

  // ====== CONTACT FORM ======
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      submitBtn.disabled = true;

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        service: document.getElementById('service').value,
        message: document.getElementById('message').value
      };

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Message Sent!';
          contactForm.reset();
          setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
          }, 3000);
        } else {
          throw new Error('Failed to send');
        }
      } catch (err) {
        submitBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed - Check Server';
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }, 3000);
      }
    });
  }

  // ====== CHATBOT ======
  const chatbotToggle = document.getElementById('chatbotToggle');
  const chatbotPanel = document.getElementById('chatbotPanel');
  const chatbotMinimize = document.getElementById('chatbotMinimize');
  const chatIcon = document.getElementById('chatIcon');
  const closeIcon = document.getElementById('closeIcon');
  const chatbotMessages = document.getElementById('chatbotMessages');
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotSend = document.getElementById('chatbotSend');
  const chatbotTyping = document.getElementById('chatbotTyping');
  const suggestionChips = document.querySelectorAll('.suggestion-chip');

  if (chatbotToggle && chatbotPanel) {
    let isChatOpen = false;

    chatbotToggle.addEventListener('click', () => {
      isChatOpen = !isChatOpen;
      chatbotPanel.classList.toggle('open', isChatOpen);
      if (chatIcon) chatIcon.style.display = isChatOpen ? 'none' : 'block';
      if (closeIcon) closeIcon.style.display = isChatOpen ? 'block' : 'none';
      if (isChatOpen) {
        scrollToBottom(chatbotMessages);
        if (chatbotInput) chatbotInput.focus();
      }
    });

    if (chatbotMinimize) {
      chatbotMinimize.addEventListener('click', () => {
        isChatOpen = false;
        chatbotPanel.classList.remove('open');
        if (chatIcon) chatIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
      });
    }
  }

  async function sendMessage() {
    if (!chatbotInput) return;
    const message = chatbotInput.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    chatbotInput.value = '';
    showChatTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      hideChatTyping();

      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          addChatMessage(data.reply, 'bot');
          return;
        }
      }
      addChatMessage(getFallbackResponse(message), 'bot');
    } catch (err) {
      hideChatTyping();
      addChatMessage(getFallbackResponse(message), 'bot');
    }
  }

  function addChatMessage(text, sender) {
    if (!chatbotMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message message-${sender}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = text;

    msgDiv.appendChild(contentDiv);
    chatbotMessages.appendChild(msgDiv);
    scrollToBottom(chatbotMessages);
  }

  function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  function showChatTyping() {
    if (chatbotTyping) {
      chatbotTyping.style.display = 'flex';
      scrollToBottom(chatbotMessages);
    }
  }

  function hideChatTyping() {
    if (chatbotTyping) chatbotTyping.style.display = 'none';
  }

  if (chatbotSend) chatbotSend.addEventListener('click', sendMessage);

  if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (suggestionChips) {
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (chatbotInput) {
          chatbotInput.value = chip.dataset.text;
          sendMessage();
        }
      });
    });
  }
}

/* ====== FALLBACK RESPONSES ====== */
function getFallbackResponse(message) {
  const msg = message.toLowerCase();

  if (msg.includes('kitchen') || msg.includes('renovation') || msg.includes('remodel')) {
    return `<p>🏠 <strong>Kitchen Renovation</strong></p>
    <p>Great choice! Our kitchen renovation service includes:</p>
    <ul>
      <li>🔨 Demolition of existing structure</li>
      <li>🪵 Custom cabinetry & countertops</li>
      <li>🔌 Plumbing & electrical updates</li>
      <li>🎨 Modern finishing & painting</li>
    </ul>
    <p>📞 Call us at <strong>+91 7019300855</strong> for a free quote or email <strong>brokenbuiltservices@gmail.com</strong></p>`;
  }

  if (msg.includes('price') || msg.includes('cost') || msg.includes('charge') || msg.includes('rate') || msg.includes('pricing') || msg.includes('budget')) {
    return `<p>💰 <strong>Pricing Information</strong></p>
    <p>Our pricing depends on the scope of work, materials, and space size. We offer <strong>free on-site consultations and quotes</strong>!</p>
    <p>📞 Call <strong>+91 7019300855</strong> or email <strong>brokenbuiltservices@gmail.com</strong> to schedule a visit.</p>
    <p>We provide transparent pricing with no hidden costs. ✅</p>`;
  }

  if (msg.includes('visit') || msg.includes('site') || msg.includes('appointment') || msg.includes('schedule') || msg.includes('book') || msg.includes('inspection')) {
    return `<p>📅 <strong>Schedule a Site Visit</strong></p>
    <p>We'd love to visit your space! Here's how to book:</p>
    <p>📞 Call: <strong>+91 7019300855</strong></p>
    <p>📧 Email: <strong>brokenbuiltservices@gmail.com</strong></p>
    <p>📍 Location: Bangalore (and surrounding areas)</p>
    <p>Our team will visit, assess your needs, and provide a detailed quote — free of charge! 🎉</p>`;
  }

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good evening')) {
    return `<p>👋 Hello! Welcome to <strong>BROKE N BUILT SERVICES</strong>!</p>
    <p>I'm your AI assistant. Here's how I can help:</p>
    <ul>
      <li>📋 <strong>Service inquiries</strong> — learn about our offerings</li>
      <li>💰 <strong>Pricing info</strong> — get cost estimates</li>
      <li>📅 <strong>Book a visit</strong> — schedule a free consultation</li>
      <li>🏠 <strong>Design advice</strong> — discuss your project ideas</li>
    </ul>
    <p>What would you like to know? 😊</p>`;
  }

  if (msg.includes('false ceiling') || msg.includes('ceiling')) {
    return `<p>🔨 <strong>False Ceiling Installation</strong></p>
    <p>We install modern false ceilings for aesthetic appeal and improved acoustics. Options include:</p>
    <ul>
      <li>Gypsum board ceilings</li>
      <li>POP (Plaster of Paris) designs</li>
      <li>Metal grid ceilings</li>
      <li>Wooden panel ceilings</li>
    </ul>
    <p>📞 Call us at <strong>+91 7019300855</strong> for a quote!</p>`;
  }

  if (msg.includes('paint') || msg.includes('painting')) {
    return `<p>🎨 <strong>Painting & Finishing</strong></p>
    <p>We offer premium painting services including:</p>
    <ul>
      <li>Interior & exterior painting</li>
      <li>Texture finishes</li>
      <li>Waterproofing coatings</li>
      <li>Wallpaper installation</li>
    </ul>
    <p>Transform your walls with our expert team!</p>`;
  }

  if (msg.includes('floor') || msg.includes('flooring') || msg.includes('tile')) {
    return `<p>🏗️ <strong>Flooring Solutions</strong></p>
    <p>Expert flooring installation services:</p>
    <ul>
      <li>Ceramic & vitrified tiles</li>
      <li>Wooden & laminate flooring</li>
      <li>Polished concrete</li>
      <li>Vinyl flooring</li>
    </ul>`;
  }

  if (msg.includes('electrical') || msg.includes('plumbing') || msg.includes('pipe') || msg.includes('wire')) {
    return `<p>⚡ <strong>Electrical & Plumbing Solutions</strong></p>
    <p>Complete electrical and plumbing services for renovation and new builds. Our certified team handles everything from wiring to pipe fittings with safety and quality.</p>`;
  }

  if (msg.includes('interior') || msg.includes('furniture') || msg.includes('cabinet') || msg.includes('wardrobe')) {
    return `<p>🛋️ <strong>Custom Interiors</strong></p>
    <p>Bespoke interior solutions including:</p>
    <ul>
      <li>Modular kitchens</li>
      <li>Wardrobes & cabinets</li>
      <li>Custom furniture</li>
      <li>Office workstations</li>
    </ul>`;
  }

  if (msg.includes('commercial') || msg.includes('office') || msg.includes('workspace')) {
    return `<p>🏢 <strong>Commercial & Workspace Solutions</strong></p>
    <p>We specialize in transforming commercial spaces with:</p>
    <ul>
      <li>Office interior fit-outs</li>
      <li>Partition walls</li>
      <li>Workstation installation</li>
      <li>False ceiling & lighting</li>
      <li>Reception area design</li>
    </ul>`;
  }

  if (msg.includes('location') || msg.includes('address') || msg.includes('where') || msg.includes('bangalore') || msg.includes('find')) {
    return `<p>📍 <strong>Our Location</strong></p>
    <p>#8, Adibyraveshwara Nilaya, 3rd Floor,<br>
    Green Wood Street, Cheemasandra,<br>
    Virgonagar Post, Bangalore-560049</p>
    <p>📞 Phone: <strong>+91 7019300855</strong></p>
    <p>📧 Email: <strong>brokenbuiltservices@gmail.com</strong></p>`;
  }

  if (msg.includes('thank') || msg.includes('thanks')) {
    return `<p>🙏 You're welcome! We're glad to help.</p>
    <p>If you have any more questions, feel free to ask. Or if you're ready to get started, give us a call at <strong>+91 7019300855</strong>!</p>
    <p>Have a great day! 😊</p>`;
  }

  return `<p>Thank you for reaching out to <strong>BROKE N BUILT SERVICES</strong>! 😊</p>
  <p>Here's how we can help:</p>
  <ul>
    <li>🏠 <strong>Services:</strong> Renovation, false ceiling, painting, flooring, partitions, electrical/plumbing, custom interiors, and complete transformations</li>
    <li>📍 <strong>Location:</strong> Bangalore, India</li>
    <li>📞 <strong>Call:</strong> +91 7019300855</li>
    <li>📧 <strong>Email:</strong> brokenbuiltservices@gmail.com</li>
  </ul>
  <p>Could you tell me more about your project? I'd be happy to provide specific information! 🛠️</p>`;
}

/* ====== INITIALIZE ON PAGE LOAD ====== */
initComponents();
