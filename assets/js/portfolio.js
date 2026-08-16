// FORMULÁRIO
function initContactForm() {
  const form = document.querySelector('.contact-form form')
  const feedback = document.getElementById('form-feedback')

  if (!form) return

  const data = window.formI18n || {}

  form.addEventListener('submit', async function(e) {
    e.preventDefault()

    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.textContent

    submitBtn.disabled = true
    submitBtn.textContent = data.form_sending
    feedback.style.display = 'none'

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })

      if (response.ok) {
        form.reset()
        showFeedback(feedback, data.form_success, 'success')
      } else {
        showFeedback(feedback, data.form_error, 'error')
      }
    } catch (error) {
      showFeedback(feedback, data.form_error, 'error')
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

document.addEventListener('DOMContentLoaded', function() {
  initContactForm()
})
