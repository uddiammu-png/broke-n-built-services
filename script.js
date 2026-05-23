/* ====== NAVBAR SCROLL EFFECT ====== */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navAnchors = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Active link highlighting
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });
  navAnchors.forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + current) {
      a.classList.add('active');
    }
  });
});

/* ====== MOBILE NAV TOGGLE ====== */
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('open');
  document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
});

navAnchors.forEach(a => {
  a.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ====== SMOOTH SCROLL FOR NAV LINKS ====== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* ====== COUNTER ANIMATION ====== */
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

// Trigger counter animation when hero section is in view
const heroSection = document.getElementById('hero');
let countersAnimated = false;

const observerOptions = { threshold: 0.3 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !countersAnimated) {
      countersAnimated = true;
      setTimeout(animateCounters, 500);
    }
  });
}, observerOptions);

if (heroSection) observer.observe(heroSection);

/* ====== INTERSECTION OBSERVER FOR FADE-IN ====== */
const fadeElements = document.querySelectorAll('.section-header, .about-content, .services-grid, .contact-content');
fadeElements.forEach(el => el.classList.add('fade-in'));

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

fadeElements.forEach(el => fadeObserver.observe(el));

/* ====== CONTACT FORM ====== */
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
        submitBtn.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
        contactForm.reset();
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
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

/* ====== CHATBOT ====== */
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

let isChatOpen = false;

// Toggle chat
chatbotToggle.addEventListener('click', () => {
  isChatOpen = !isChatOpen;
  chatbotPanel.classList.toggle('open', isChatOpen);
  chatIcon.style.display = isChatOpen ? 'none' : 'block';
  closeIcon.style.display = isChatOpen ? 'block' : 'none';
  if (isChatOpen) {
    scrollToBottom();
    chatbotInput.focus();
  }
});

// Minimize
chatbotMinimize.addEventListener('click', () => {
  isChatOpen = false;
  chatbotPanel.classList.remove('open');
  chatIcon.style.display = 'block';
  closeIcon.style.display = 'none';
});

// Send message
async function sendMessage() {
  const message = chatbotInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  chatbotInput.value = '';
  showTyping();    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      hideTyping();

      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          addMessage(data.reply, 'bot');
        } else {
          addMessage(getFallbackResponse(message), 'bot');
        }
      } else {
        hideTyping();
        addMessage(getFallbackResponse(message), 'bot');
      }
    } catch (err) {
      hideTyping();
      const fallback = getFallbackResponse(message);
      addMessage(fallback, 'bot');
    }
}

// Add message to chat
function addMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message message-${sender}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = text;
  
  msgDiv.appendChild(contentDiv);
  chatbotMessages.appendChild(msgDiv);
  scrollToBottom();
}

// Scroll to bottom
function scrollToBottom() {
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Typing indicator
function showTyping() {
  chatbotTyping.style.display = 'flex';
  scrollToBottom();
}

function hideTyping() {
  chatbotTyping.style.display = 'none';
}

// Send on button click
chatbotSend.addEventListener('click', sendMessage);

// Send on Enter
chatbotInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Suggestion chips
suggestionChips.forEach(chip => {
  chip.addEventListener('click', () => {
    chatbotInput.value = chip.dataset.text;
    sendMessage();
  });
});

// Fallback responses when server is offline
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
  
  // Default response
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
