document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const postItems = document.querySelectorAll('.post-item');
  
  if (!searchInput || postItems.length === 0) return;
  
  function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  
  searchInput.addEventListener('input', function(e) {
    const searchTerm = removeAccents(e.target.value.toLowerCase().trim());
    
    postItems.forEach(function(post) {
      const title = removeAccents(post.querySelector('.post-title a').textContent.toLowerCase());
      const excerpt = post.querySelector('.post-excerpt') 
        ? removeAccents(post.querySelector('.post-excerpt').textContent.toLowerCase())
        : '';
      
      const matchTitle = title.includes(searchTerm);
      const matchExcerpt = excerpt.includes(searchTerm);
      
      if (searchTerm === '' || matchTitle || matchExcerpt) {
        post.style.display = '';
        
        if (matchTitle && searchTerm !== '') {
          post.style.order = '-1'; 
        } else {
          post.style.order = '0';
        }
      } else {
        post.style.display = 'none';
      }
    });
    
    const visiblePosts = Array.from(postItems).filter(post => post.style.display !== 'none');
    
    let noResultsMsg = document.querySelector('.no-results-message');
    
    if (visiblePosts.length === 0 && searchTerm !== '') {
      if (!noResultsMsg) {
        noResultsMsg = document.createElement('p');
        noResultsMsg.className = 'no-results-message';
        noResultsMsg.textContent = 'Nenhum post encontrado para "' + e.target.value + '"';
        document.querySelector('.posts-list').appendChild(noResultsMsg);
      }
    } else {
      if (noResultsMsg) {
        noResultsMsg.remove();
      }
    }
  });
});