
// CONFIGURAÇÃO
let i18n = {}
let currentLang = 'pt'

// INTERNACIONALIZAÇÃO
function toggleLang() {
  currentLang = currentLang === 'pt' ? 'en' : 'pt'
  localStorage.setItem('preferredLang', currentLang)
  updateContent()
  updateFlag()
}

function updateFlag() {
  const flag = document.getElementById('flag')
  if (flag) {
    flag.textContent = currentLang === 'pt' ? '🇺🇸' : '🇧🇷'
  }
}

function resolve(data, keyPath) {
  return keyPath.split('.').reduce((obj, k) => obj && obj[k], data)
}

function updateContent() {
  const data = i18n[currentLang]

  // Textos simples
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const value = resolve(data, el.getAttribute('data-i18n'))
    if (value != null) el.textContent = value
  })

  // Textos com HTML
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const value = resolve(data, el.getAttribute('data-i18n-html'))
    if (value != null) el.innerHTML = value
  })

  // Atributos
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const [attrName, key] = el.getAttribute('data-i18n-attr').split(':')
    const value = resolve(data, key)
    if (value != null) el.setAttribute(attrName, value)
  })

  // Link do CV
  const cvLink = document.querySelector('[data-cv-link]')
  if (cvLink) cvLink.href = data.hero.cv_link

  // Lang do documento
  document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : 'en'

  // Seção de últimos posts só faz sentido em PT (posts são sempre em PT)
  const latestPostsSection = document.querySelector('.latest-posts')
  if (latestPostsSection) {
    latestPostsSection.style.display = currentLang === 'pt' ? '' : 'none'
  }

  // Renderiza conteúdo dinâmico
  renderSkills(data)
  renderTimeline(data)
  renderProjects(data)
}

// RENDERIZAÇÃO
function renderSkills(data) {
  const container = document.getElementById('skills-container')
  if (!container) return

  container.innerHTML = data.about.skills.map(skill => `
    <div class="skill-category">
      <p class="skill-title">${skill.category}</p>
      <ul class="skill-items">
        ${skill.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `).join('')
}

function renderTimeline(data) {
  const container = document.getElementById('timeline-container')
  if (!container) return

  const techTitle = currentLang === 'pt' ? 'Principais Tecnologias' : 'Main Technologies'

  container.innerHTML = data.history.experiences.map(exp => `
    <div class="timeline-item">
      <div class="main-info">
        <div class="company">
          <h3>${exp.role}</h3>
          <p>${exp.company} ${exp.status ? `<span class="badge-current">${exp.status}</span>` : ''}</p>
        </div>
        <div class="timeline-date">
          <p>${exp.period}</p>
          <p>${exp.location}</p>
        </div>
      </div>
      <div class="description">
        <p>${exp.description}</p>
      </div>
      <div class="technologies">
        <h4>${techTitle}</h4>
        <ul class="skill-items">
          ${exp.technologies.map(tech => `<li>${tech}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('')
}

function renderProjects(data) {
  const container = document.getElementById('projects-container')
  if (!container || !data.projects) return

  const codeLabel = currentLang === 'pt' ? 'Código' : 'Code'
  const visitLabel = currentLang === 'pt' ? 'Acessar' : 'Visit'

  container.innerHTML = data.projects.items.map(project => `
    <div class="project-card">
      <div class="project-card__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </div>
      <h3 class="project-card__name">${project.name}</h3>
      <p class="project-card__description">${project.description}</p>
      <ul class="project-card__tags">
        ${project.technologies.map(tech => `<li>${tech}</li>`).join('')}
      </ul>
      ${(project.github || project.url) ? `
        <div class="project-card__links">
          ${project.github ? `
            <a href="${project.github}" target="_blank" rel="noopener noreferrer" class="project-card__link project-card__link--primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              ${codeLabel}
            </a>
          ` : ''}
          ${project.url ? `
            <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="project-card__link project-card__link--secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              ${visitLabel}
            </a>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `).join('')
}

// FORMULÁRIO
function initContactForm() {
  const form = document.querySelector('.contact-form form')
  const feedback = document.getElementById('form-feedback')

  if (!form) return

  form.addEventListener('submit', async function(e) {
    e.preventDefault()

    const data = i18n[currentLang]
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.textContent

    submitBtn.disabled = true
    submitBtn.textContent = data.contact.form_sending
    feedback.style.display = 'none'

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })

      if (response.ok) {
        form.reset()
        showFeedback(feedback, data.contact.form_success, 'success')
      } else {
        showFeedback(feedback, data.contact.form_error, 'error')
      }
    } catch (error) {
      showFeedback(feedback, data.contact.form_error, 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  })
}

function showFeedback(element, message, type) {
  element.textContent = message
  element.className = `form-feedback ${type}`
  element.style.display = 'block'

  setTimeout(() => {
    element.style.display = 'none'
  }, 6000)
}


// INICIALIZAÇÃO
function detectLang() {
  const saved = localStorage.getItem('preferredLang')
  if (saved) return saved
  const lang = navigator.language || 'en'
  return lang.startsWith('pt') ? 'pt' : 'en'
}

function init(data) {
  i18n = data
  currentLang = detectLang()

  updateContent()
  updateFlag()
  initContactForm()
}

document.addEventListener('DOMContentLoaded', function() {
  if (window.i18nData) {
    init(window.i18nData)
  }
})