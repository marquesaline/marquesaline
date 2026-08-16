(function () {
  if (localStorage.getItem('langChoice')) return
  if (sessionStorage.getItem('langAutoRedirected')) return
  if (!window.langSiblingUrl) return

  var pageLang = document.documentElement.lang.indexOf('pt') === 0 ? 'pt' : 'en'
  var browserLang = (navigator.language || 'en').indexOf('pt') === 0 ? 'pt' : 'en'

  if (browserLang !== pageLang) {
    sessionStorage.setItem('langAutoRedirected', '1')
    window.location.replace(window.langSiblingUrl)
  }
})()
