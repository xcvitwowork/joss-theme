/* ============================================================
   JOSS COSMETICS — THEME JS v1.0
   ============================================================ */

const joss = (() => {
  'use strict';

  /* ── STATE ── */
  let cartCount = 0;

  /* ── INIT ── */
  function init() {
    initHeader();
    initHamburger();
    initSearch();
    initCartDrawer();
    bindCartItemEvents();
    initAccordions();
    initLangSwitcher();
    initCurrency();
    initVariants();
    initQty();
    initGallery();
    initFilters();
    initScrollReveal();
    initAnnouncement();
    initStickyAtc();
    updateCartCount();
  }

  /* ── HEADER SCROLL ── */
  function initHeader() {
    const hdr = document.querySelector('.site-header');
    if (!hdr) return;
    const check = () => hdr.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ── HAMBURGER / MOBILE DRAWER ── */
  function initHamburger() {
    const btn    = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('joss-overlay');
    if (!btn || !drawer) return;

    btn.addEventListener('click', () => {
      const open = drawer.classList.contains('open');
      open ? closeMobileDrawer() : openMobileDrawer();
    });

    drawer.querySelector('.mobile-drawer__close')?.addEventListener('click', closeMobileDrawer);
    drawer.querySelectorAll('.mobile-drawer__nav a').forEach(a => a.addEventListener('click', closeMobileDrawer));
  }

  function openMobileDrawer() {
    document.getElementById('mobile-drawer')?.classList.add('open');
    document.getElementById('joss-overlay')?.classList.add('active');
    document.getElementById('hamburger-btn')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileDrawer() {
    document.getElementById('mobile-drawer')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.classList.remove('open');
    if (!document.getElementById('joss-cart-drawer')?.querySelector('.cart-drawer.open')) {
      document.getElementById('joss-overlay')?.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /* ── SEARCH ── */
  function initSearch() {
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;

    document.getElementById('search-open-btn')?.addEventListener('click', () => {
      overlay.classList.add('open');
      overlay.querySelector('input')?.focus();
    });

    overlay.querySelector('.search-overlay__close')?.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  }

  /* ── CART DRAWER ── */
  function initCartDrawer() {
    const drawer = document.querySelector('.cart-drawer');
    const overlay = document.getElementById('joss-overlay');
    if (!drawer) return;

    document.querySelectorAll('[data-cart-open]').forEach(btn => {
      btn.addEventListener('click', openCartDrawer);
    });

    drawer.querySelector('.cart-drawer__close')?.addEventListener('click', closeCartDrawer);
  }

  function openCartDrawer() {
    document.querySelector('.cart-drawer')?.classList.add('open');
    document.getElementById('joss-overlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    document.querySelector('.cart-drawer')?.classList.remove('open');
    if (!document.getElementById('mobile-drawer')?.classList.contains('open')) {
      document.getElementById('joss-overlay')?.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function closeAll() {
    closeMobileDrawer();
    closeCartDrawer();
    document.getElementById('search-overlay')?.classList.remove('open');
  }

  /* ── AJAX ADD TO CART ── */
  async function addToCart(variantId, quantity = 1) {
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity }),
      });
      if (!res.ok) throw new Error('Cart error');
      const item = await res.json();
      await refreshCartDrawer();
      openCartDrawer();
      showToast(`${item.product_title} — added to cart ✓`);
    } catch (e) {
      showToast('Error adding to cart');
    }
  }

  async function refreshCartDrawer() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      cartCount = cart.item_count;
      updateCartCount();
      const drawerRes = await fetch('/?section_id=cart-drawer');
      if (drawerRes.ok) {
        const html = await drawerRes.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newInner = doc.querySelector('.cart-drawer__inner');
        const existingInner = document.querySelector('#joss-cart-drawer .cart-drawer__inner');
        if (newInner && existingInner) {
          existingInner.innerHTML = newInner.innerHTML;
          bindCartItemEvents();
        }
      }
    } catch (e) { /* silent */ }
  }

  /* ── CART ITEM CONTROLS (qty / remove inside drawer) ── */
  function bindCartItemEvents() {
    const drawer = document.querySelector('#joss-cart-drawer');
    if (!drawer) return;
    drawer.querySelectorAll('.cart-item__qty-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        const action = btn.dataset.action;
        const valEl = btn.parentElement.querySelector('.cart-item__qty-val');
        let qty = parseInt(valEl?.textContent) || 1;
        qty = action === 'increase' ? qty + 1 : Math.max(0, qty - 1);
        await changeCartItem(key, qty);
      });
    });
    drawer.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        await changeCartItem(btn.dataset.key, 0);
      });
    });
  }

  async function changeCartItem(key, quantity) {
    try {
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity }),
      });
      if (!res.ok) throw new Error('Cart change error');
      await refreshCartDrawer();
    } catch (e) {
      showToast('Could not update cart');
    }
  }

  async function updateCartCount() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      cartCount = cart.item_count;
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = cartCount;
        el.style.display = cartCount > 0 ? 'flex' : 'none';
      });
    } catch (e) { /* silent */ }
  }

  /* ── PRODUCT FORM ── */
  function initVariants() {
    // Product form submit (AJAX add to cart)
    document.querySelectorAll('.product-form, form[action$="/cart/add"], #product-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const variantInput = form.querySelector('[name="id"]');
        if (!variantInput) return;
        const qty = form.querySelector('.qty-control__val');
        const addBtn = form.querySelector('.product-info__add-btn');
        if (addBtn && addBtn.disabled) return;
        await addToCart(variantInput.value, qty ? parseInt(qty.textContent) : 1);
      });
    });
  }

  /* Global variant selector (called from product page onclick) */
  function selectVariant(btn, optionHandle, value) {
    const group = btn.closest('.product-info__variants');
    group?.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const labelEl = document.getElementById('selected-' + optionHandle);
    if (labelEl) labelEl.textContent = value;
    updateVariantFromSelections();
  }

  function updateVariantFromSelections() {
    // Find all active variant buttons and match to variant
    const variantsJSON = document.getElementById('product-variants-json');
    if (!variantsJSON) return;
    try {
      const variants = JSON.parse(variantsJSON.textContent);
      const selectedOptions = Array.from(document.querySelectorAll('.product-info__variants'))
        .map(group => group.querySelector('.variant-btn.active')?.dataset.value)
        .filter(Boolean);

      const match = variants.find(v =>
        selectedOptions.every((val, i) => v.options[i] === val)
      );
      if (match) {
        const input = document.querySelector('.product-form [name="id"]');
        if (input) input.value = match.id;
        // Update price
        const priceEl = document.querySelector('.product-info__price');
        if (priceEl) priceEl.textContent = formatMoney(match.price);
        // Update compare-at price
        const compareEl = document.querySelector('.product-info__compare');
        if (compareEl) {
          if (match.compare_at && match.compare_at > match.price) {
            compareEl.textContent = formatMoney(match.compare_at);
            compareEl.style.display = '';
          } else {
            compareEl.style.display = 'none';
          }
        }
        // Swap main gallery image to the variant image
        if (match.image) {
          const mainImg = document.getElementById('gallery-main-img');
          if (mainImg) mainImg.src = match.image;
        }
        // Update availability
        const addBtn = document.querySelector('.product-info__add-btn');
        if (addBtn) {
          addBtn.disabled = !match.available;
          addBtn.textContent = match.available ? 'Add to Cart' : 'Sold Out';
        }
        // Update URL (deep-link to variant) without reload
        if (history.replaceState) {
          const url = new URL(window.location);
          url.searchParams.set('variant', match.id);
          history.replaceState({}, '', url);
        }
      }
    } catch (e) { /* silent */ }
  }

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  /* ── QTY ── */
  function initQty() {
    document.querySelectorAll('.qty-control').forEach(control => {
      control.querySelector('[data-qty-dec]')?.addEventListener('click', () => changeQty(control, -1));
      control.querySelector('[data-qty-inc]')?.addEventListener('click', () => changeQty(control, 1));
    });
  }

  function changeQty(control, delta) {
    const val = control.querySelector('.qty-control__val');
    if (!val) return;
    let n = parseInt(val.textContent) || 1;
    n = Math.max(1, n + delta);
    val.textContent = n;
  }

  /* ── GALLERY ── */
  function initGallery() {
    document.querySelectorAll('.product-gallery__thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const gallery = thumb.closest('.product-gallery');
        const mainImg = gallery?.querySelector('.product-gallery__main img');
        const thumbImg = thumb.querySelector('img');
        if (mainImg && thumbImg) {
          const src = thumbImg.dataset.full || thumbImg.src;
          mainImg.src = src;
        }
        gallery?.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  /* ── ACCORDION ── */
  function initAccordions() {
    document.querySelectorAll('.accordion__trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item    = trigger.closest('.accordion__item');
        const body    = item.querySelector('.accordion__body');
        const isOpen  = trigger.getAttribute('aria-expanded') === 'true';

        // Close siblings in same accordion
        trigger.closest('.accordion')?.querySelectorAll('.accordion__trigger').forEach(t => {
          t.setAttribute('aria-expanded', 'false');
          t.closest('.accordion__item')?.querySelector('.accordion__body')?.setAttribute('hidden', '');
        });

        if (!isOpen) {
          trigger.setAttribute('aria-expanded', 'true');
          body?.removeAttribute('hidden');
        }
      });
    });
  }

  /* ── LANG SWITCHER ── */
  function initLangSwitcher() {
    const btn  = document.getElementById('lang-btn');
    const drop = document.getElementById('lang-drop');
    if (!btn || !drop) return;
    let open = false;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      open = !open;
      drop.classList.toggle('open', open);
    });
    drop.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        drop.querySelectorAll('a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        btn.querySelector('span').textContent = a.dataset.lang;
        drop.classList.remove('open');
        open = false;
        const inp  = document.getElementById('lang-input');
        const form = document.getElementById('lang-form');
        if (inp && form) { inp.value = a.dataset.value; form.submit(); }
      });
    });
    document.addEventListener('click', () => { if (open) { drop.classList.remove('open'); open = false; } });
  }

  /* ── CURRENCY ── */
  function initCurrency() {
    document.querySelectorAll('.currency-bar__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.currency-bar__btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const inp  = document.getElementById('currency-input');
        const form = document.getElementById('currency-form');
        if (inp && form) { inp.value = btn.dataset.country; form.submit(); }
      });
    });
  }

  /* ── FILTER BUTTONS ── */
  function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /* ── SCROLL REVEAL ── */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  /* ── ANNOUNCEMENT CLOSE ── */
  function initAnnouncement() {
    document.querySelector('.announcement-bar__close')?.addEventListener('click', function() {
      this.closest('.announcement-bar')?.remove();
      document.body.classList.remove('has-announcement');
    });
  }

  /* ── STICKY MOBILE ADD-TO-CART ── */
  function initStickyAtc() {
    const sticky = document.getElementById('product-sticky');
    const mainBtn = document.querySelector('.product-info__add-btn');
    if (!sticky || !mainBtn || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => sticky.classList.toggle('visible', !e.isIntersecting));
    }, { rootMargin: '0px 0px -120px 0px' });
    io.observe(mainBtn);
  }

  /* ── TOAST ── */
  function showToast(msg, duration = 2800) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* ── ESC KEY ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });

  /* ── OVERLAY CLICK ── */
  document.getElementById('joss-overlay')?.addEventListener('click', closeAll);

  /* ── RUN ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { addToCart, openCartDrawer, closeCartDrawer, closeAll, showToast, selectVariant };
})();

/* Global alias for inline onclick on product page */
function jossSelectVariant(btn, optionHandle, value) {
  joss.selectVariant(btn, optionHandle, value);
}
