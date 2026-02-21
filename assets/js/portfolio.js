
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

  // Renderiza conteúdo dinâmico
  renderSkills(data)
  renderTimeline(data)
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