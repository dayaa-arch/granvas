const codeBlocks = document.querySelectorAll('[data-code-block]')

for (const block of codeBlocks) {
  const button = document.createElement('button')
  button.className = 'copy-button'
  button.type = 'button'
  button.textContent = 'コピー'
  button.setAttribute('aria-label', 'コードをコピー')

  button.addEventListener('click', async () => {
    const code = block.querySelector('code')?.textContent ?? ''

    try {
      await navigator.clipboard.writeText(code)
      button.textContent = 'コピーしました'
      button.setAttribute('aria-label', 'コードをコピーしました')
    } catch {
      button.textContent = '選択してコピー'
      block.querySelector('code')?.setAttribute('tabindex', '0')
      block.querySelector('code')?.focus()
    }

    window.setTimeout(() => {
      button.textContent = 'コピー'
      button.setAttribute('aria-label', 'コードをコピー')
    }, 1800)
  })

  block.append(button)
}

const navigationLinks = [
  ...document.querySelectorAll('.side-nav nav a[href^="#"]'),
]
const linkBySectionId = new Map(
  navigationLinks.map((link) => [link.getAttribute('href')?.slice(1), link]),
)

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)
        .at(0)

      if (!visible) return

      for (const link of navigationLinks) link.removeAttribute('aria-current')
      linkBySectionId.get(visible.target.id)?.setAttribute('aria-current', 'location')
    },
    { rootMargin: '-18% 0px -68% 0px' },
  )

  for (const section of document.querySelectorAll('main section[id]')) {
    observer.observe(section)
  }
}

const mobileTableOfContents = document.querySelector('.mobile-toc')
mobileTableOfContents?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => mobileTableOfContents.removeAttribute('open'))
})
