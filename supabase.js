
/* NEXO STORE — Supabase */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://tycwaaqhpcvbgdqwzkgr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_BNl9LfB9ZhUAPWlH1IHsig_wT2Y7cop';

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  const api = async (path, options = {}) => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
      }
    );

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(
        data?.message || data?.hint || `Supabase error ${response.status}`
      );
    }

    return data;
  };

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const image = value => value || 'icon-192.png';

  async function loadProducts() {
    return api('products?select=*&order=sort.asc');
  }

  async function loadCategories() {
    return api('categories?select=*&order=sort.asc');
  }

  async function loadAds() {
    return api('ads?select=*&order=sort.asc');
  }

  async function loadSettings() {
    const rows = await api('settings?select=*&id=eq.1');
    return rows?.[0] || null;
  }

  async function validateCoupon(code) {
    return api('rpc/validate_coupon', {
      method: 'POST',
      body: JSON.stringify({ p_code: code })
    });
  }

  async function createOrder(order) {
    return api('rpc/create_order', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  }

  window.NEXOSupabase = {
    api,
    escapeHTML,
    image,
    loadProducts,
    loadCategories,
    loadAds,
    loadSettings,
    validateCoupon,
    createOrder
  };
})();
