
/* =========================================================
   NEXO STORE — SUPABASE LIVE CONNECTION
   يعتمد على وجود دوال المتجر الأصلية داخل index.html
   ========================================================= */

(() => {
  "use strict";

  const SUPABASE_URL = "https://tycwaaqhpcvbgdqwzkgr.supabase.co";
  const SUPABASE_KEY = "sb_publishable_BNl9LfB9ZhUAPWlH1IHsig_wT2Y7cop";

  const API = SUPABASE_URL + "/rest/v1/";
  const RPC = SUPABASE_URL + "/rest/v1/rpc/";

  let remoteProducts = [];
  let remoteCategories = [];
  let remoteAds = [];
  let remoteSettings = {};
  let couponRate = 0;
  let couponValid = false;
  let loadingRemote = false;

  const originalAddToCart = window.addToCart;
  const originalApplyCoupon = window.applyCoupon;
  const originalSendOrder = window.sendOrder;
  const originalRenderProducts = window.renderProducts;
  const originalRenderCart = window.renderCart;

  function requestHeaders(extra = {}) {
    return {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      ...extra
    };
  }

  async function apiGet(table, query = "") {
    const response = await fetch(
      API + table + "?select=*" + query,
      { headers: requestHeaders() }
    );

    if (!response.ok) {
      throw new Error("تعذّر تحميل " + table + ": " + response.status);
    }

    return response.json();
  }

  async function apiRpc(name, body) {
    const response = await fetch(RPC + name, {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? data.message || data.error || JSON.stringify(data)
          : String(data || response.status);

      throw new Error(message);
    }

    return data;
  }

  function getValue(row, names, fallback = "") {
    for (const name of names) {
      if (row && row[name] !== undefined && row[name] !== null) {
        return row[name];
      }
    }
    return fallback;
  }

  function mapProduct(row, index) {
    const id = String(getValue(row, ["id", "product_id"], "remote-" + index));

    return {
      id,
      name: String(getValue(row, ["name", "title"], "منتج")),
      price: Number(getValue(row, ["price", "selling_price"], 0)),
      oldPrice: Number(
        getValue(row, ["old_price", "oldPrice", "price"], 0)
      ),
      category: String(
        getValue(row, ["category", "category_name"], "متنوع")
      ),
      image: String(
        getValue(row, ["image", "image_url", "imageUrl"], "icon-192.png")
      ),
      desc: String(
        getValue(row, ["description", "desc"], "")
      ),
      stock: Number(
        getValue(row, ["stock", "stock_quantity", "quantity"], -1)
      ),
      _remote: true
    };
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function getRemoteProduct(id) {
    return remoteProducts.find(p => String(p.id) === String(id));
  }

  function productStock(id) {
    const p = getRemoteProduct(id);
    return p ? p.stock : -1;
  }

  function cartQuantity(id) {
    if (!Array.isArray(window.cart)) return 0;

    return window.cart.reduce((sum, item) => {
      return String(item.id) === String(id)
        ? sum + Number(item.qty || 0)
        : sum;
    }, 0);
  }

  function availableToAdd(id) {
    const stock = productStock(id);

    if (stock < 0) return true;

    return cartQuantity(id) < stock;
  }

  function showStockMessage(message) {
    alert(message);
  }

  function patchProductList() {
    if (!Array.isArray(window.products) || !remoteProducts.length) return;

    /*
      نستبدل المنتجات المحلية فقط إذا كانت قاعدة البيانات
      أعادت منتجات صالحة. يجب أن تتضمن قاعدة البيانات
      جميع المنتجات التي تريد عرضها في المتجر.
    */
    window.products.splice(0, window.products.length, ...remoteProducts);
  }

  function updateSettings(settings) {
    const row = Array.isArray(settings) ? settings[0] : settings;
    if (!row || typeof row !== "object") return;

    remoteSettings = row;

    const fee = Number(
      getValue(row, ["delivery_fee", "deliveryFee"], NaN)
    );

    const limit = Number(
      getValue(row, ["free_shipping_limit", "freeShippingLimit"], NaN)
    );

    if (Number.isFinite(fee) && fee >= 0) {
      window.DELIVERY_FEE = fee;
    }

    if (Number.isFinite(limit) && limit >= 0) {
      window.FREE_SHIPPING_LIMIT = limit;
    }

    /*
      متغيرات الملف الأصلي قد تكون lexical const/let،
      لذلك لا نعتمد على تعديلها من هذه الدالة.
      نحدّث دالة الحساب مباشرة في حالة وصول الإعدادات.
    */
    if (Number.isFinite(fee) && fee >= 0) {
      window.NEXO_DELIVERY_FEE = fee;
    }

    if (Number.isFinite(limit) && limit >= 0) {
      window.NEXO_FREE_SHIPPING_LIMIT = limit;
    }
  }

  function renderRemoteAds() {
    if (!remoteAds.length || !document.getElementById("adSlides")) return;

    const slides = document.getElementById("adSlides");
    const dots = document.getElementById("adDots");

    const validAds = remoteAds.filter(ad => {
      const title = getValue(ad, ["title", "name"], "");
      const image = getValue(ad, ["image_url", "image", "imageUrl"], "");
      const subtitle = getValue(ad, ["subtitle", "description", "sub"], "");
      return title || image || subtitle;
    });

    if (!validAds.length) return;

    slides.innerHTML = validAds.map(ad => {
      const title = escapeHTML(getValue(ad, ["title", "name"], ""));
      const subtitle = escapeHTML(
        getValue(ad, ["subtitle", "description", "sub"], "")
      );
      const image = String(
        getValue(ad, ["image_url", "image", "imageUrl"], "")
      );
      const background = escapeHTML(
        getValue(ad, ["background", "bg"], "linear-gradient(135deg,#0876d9,#00c6ff)")
      );

      if (image) {
        return `
          <div class="adSlide" style="position:relative;padding:0;background:${background}">
            <img src="${escapeHTML(image)}" alt="${title}"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
            ${title ? `<b style="position:relative;text-shadow:0 2px 8px #000">${title}</b>` : ""}
            ${subtitle ? `<span style="position:relative;text-shadow:0 2px 8px #000">${subtitle}</span>` : ""}
          </div>`;
      }

      return `
        <div class="adSlide" style="background:${background}">
          <b>${title}</b>
          <span>${subtitle}</span>
        </div>`;
    }).join("");

    dots.innerHTML = validAds.map(() => "<i></i>").join("");

    const slideItems = [...slides.children];
    const dotItems = [...dots.children];

    function mark(index) {
      dotItems.forEach((dot, i) => {
        dot.classList.toggle("on", i === index);
      });
    }

    mark(0);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          mark(slideItems.indexOf(entry.target));
        }
      });
    }, { root: slides, threshold: [0.6] });

    slideItems.forEach(slide => observer.observe(slide));
  }

  async function loadRemoteData() {
    if (loadingRemote) return;
    loadingRemote = true;

    try {
      const results = await Promise.allSettled([
        apiGet("products"),
        apiGet("categories"),
        apiGet("ads"),
        apiGet("settings", "&id=eq.1")
      ]);

      if (results[0].status === "fulfilled") {
        const rows = results[0].value;

        if (Array.isArray(rows) && rows.length) {
          remoteProducts = rows.map(mapProduct).filter(p => {
            return p.name && Number.isFinite(p.price) && p.price >= 0;
          });

          patchProductList();

          if (typeof window.renderProducts === "function") {
            window.renderProducts();
          }

          if (typeof window.refreshFav === "function") {
            window.refreshFav();
          }

          if (typeof window.buildCats === "function") {
            window.buildCats();
          }
        }
      } else {
        console.warn("NEXO: تعذّر تحميل المنتجات من Supabase.");
      }

      if (results[1].status === "fulfilled") {
        remoteCategories = results[1].value || [];
        window.NEXO_REMOTE_CATEGORIES = remoteCategories;
      }

      if (results[2].status === "fulfilled") {
        remoteAds = results[2].value || [];
        renderRemoteAds();
      }

      if (results[3].status === "fulfilled") {
        updateSettings(results[3].value);
      }

      console.info("NEXO STORE: انتهت محاولة المزامنة.");
    } catch (error) {
      console.error("NEXO Supabase:", error);
    } finally {
      loadingRemote = false;
    }
  }

  /* ===== التحقق من المخزون ===== */

  if (typeof originalAddToCart === "function") {
    window.addToCart = function(id) {
      if (!availableToAdd(id)) {
        showStockMessage("عذرًا، الكمية المتوفرة من هذا المنتج غير كافية.");
        return;
      }

      return originalAddToCart(id);
    };
  }

  /* ===== عرض حالة نفاد المخزون ===== */

  if (typeof originalRenderProducts === "function") {
    window.renderProducts = function() {
      const result = originalRenderProducts.apply(this, arguments);

      if (!Array.isArray(window.products)) return result;

      document.querySelectorAll("#products .product").forEach(card => {
        const button = card.querySelector(".addButton");
        if (!button) return;

        const onclick = button.getAttribute("onclick") || "";
        const match = onclick.match(/addToCart\(['"]([^'"]+)['"]\)/);
        if (!match) return;

        const p = getRemoteProduct(match[1]);
        if (!p || p.stock < 0) return;

        if (p.stock <= 0) {
          button.textContent = "نفد المخزون";
          button.disabled = true;
          button.style.background = "#9ca3af";
        } else {
          button.textContent = "أضف للسلة";
          button.disabled = false;
        }
      });

      return result;
    };
  }

  /* ===== التحقق من كود الخصم عبر قاعدة البيانات ===== */

  window.applyCoupon = async function() {
    const input = document.getElementById("couponInput");
    const message = document.getElementById("couponMessage");
    const code = input ? input.value.trim().toUpperCase() : "";

    if (!code) {
      couponValid = false;
      couponRate = 0;
      showCouponMessage("اكتب كود الخصم أولًا.", false);
      return;
    }

    if (message) {
      message.className = "couponMessage";
      message.textContent = "جارٍ التحقق من الكود...";
    }

    try {
      const result = await apiRpc("validate_coupon", {
        p_code: code
      });

      const row = Array.isArray(result) ? result[0] : result;
      const valid = Boolean(
        row && (
          row.valid === true ||
          row.is_valid === true ||
          row.success === true
        )
      );

      if (!valid) {
        couponValid = false;
        couponRate = 0;
        window.NEXO_COUPON_VALID = false;

        showCouponMessage(
          row && row.message ? String(row.message) : "كود الخصم غير صالح أو منتهي.",
          false
        );

        return;
      }

      const rate = Number(
        getValue(row, ["discount_rate", "rate", "discount_percent"], 50)
      );

      couponRate = rate > 1 ? rate / 100 : rate;
      couponRate = Math.max(0, Math.min(couponRate, 1));
      couponValid = true;
      window.NEXO_COUPON_VALID = true;
      window.NEXO_COUPON_RATE = couponRate;

      /*
        نحدّث المتغير المحلي الخاص بالمتجر عبر واجهة
        عامة، ثم نعيد رسم السلة والمنتجات.
      */
      if (typeof window.NEXOSetCoupon === "function") {
        window.NEXOSetCoupon(couponRate);
      } else {
        showCouponMessage(
          "الكود صحيح في قاعدة البيانات، لكن يلزم ربط نسبة الخصم بدالة حساب الأسعار.",
          false
        );
        return;
      }

      showCouponMessage(
        "✓ تم التحقق من كود الخصم بنجاح.",
        true
      );

    } catch (error) {
      console.error("NEXO coupon:", error);
      couponValid = false;
      couponRate = 0;

      showCouponMessage(
        "تعذّر التحقق من الكود. تأكد من إعداد دالة validate_coupon في Supabase.",
        false
      );
    }
  };

  function showCouponMessage(text, success) {
    const message = document.getElementById("couponMessage");
    if (!message) return;

    message.className = "couponMessage " + (success ? "success" : "error");
    message.textContent = text;
  }

  /* ===== إنشاء الطلب في قاعدة البيانات ===== */

  window.sendOrder = async function() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const payment = document.getElementById("payment").value;

    if (!name) return alert("اكتب اسمك.");
    if (!phone) return alert("اكتب رقم الجوال.");
    if (window.deliveryMethod === "delivery" && !address) {
      return alert("اكتب عنوان التوصيل.");
    }

    if (!Array.isArray(window.cart) || !window.cart.length) {
      return alert("السلة فارغة.");
    }

    /*
      لا نرسل الطلب إذا كان المخزون معروفًا والكمية
      المطلوبة أكبر من المتاح. يجب أن تتحقق قاعدة
      البيانات من المخزون أيضًا لمنع الطلبات المتزامنة.
    */
    for (const item of window.cart) {
      const stock = productStock(item.id);

      if (stock >= 0 && Number(item.qty) > stock) {
        return alert("الكمية المطلوبة غير متوفرة لأحد المنتجات.");
      }
    }

    const button = document.querySelector("#orderModal .checkout");
    const previousText = button ? button.textContent : "";

    if (button) {
      button.disabled = true;
      button.textContent = "جارٍ حفظ الطلب...";
    }

    try {
      const items = window.cart.map(item => ({
        product_id: item.id,
        quantity: Number(item.qty)
      }));

      const code = couponValid
        ? document.getElementById("couponInput").value.trim().toUpperCase()
        : "";

      const result = await apiRpc("create_order", {
        p_name: name,
        p_phone: phone,
        p_address: window.deliveryMethod === "pickup" ? "" : address,
        p_delivery: window.deliveryMethod,
        p_payment: payment,
        p_coupon: code,
        p_items: items
      });

      const row = Array.isArray(result) ? result[0] : result;
      const orderId = row && (
        row.order_id || row.id || row.order_number
      );

      if (!orderId) {
        throw new Error(
          "تم الاتصال بالدالة، لكن لم تُرجع رقم الطلب. راجع ناتج create_order."
        );
      }

      const message =
        "🛒 *طلب جديد - NEXO STORE*\n\n" +
        "رقم الطلب: " + orderId + "\n\n" +
        "👤 الاسم: " + name + "\n" +
        "📱 الجوال: " + phone + "\n" +
        "📦 طريقة الاستلام: " +
        (window.deliveryMethod === "pickup" ? "استلام من الفرع" : "توصيل") +
        "\n💳 طريقة الدفع: " + payment +
        (window.deliveryMethod === "pickup" ? "" : "\n📍 العنوان: " + address);

      /*
        لا نُفرغ السلة إلا بعد نجاح حفظ الطلب.
        الأسعار النهائية والمخزون يجب أن يتحقق منهما
        الخادم داخل دالة create_order.
      */
      window.open(
        "https://wa.me/966501203710?text=" + encodeURIComponent(message),
        "_blank"
      );

      window.cart = [];
      window.couponApplied = false;
      couponValid = false;
      couponRate = 0;

      if (typeof window.saveCart === "function") window.saveCart();
      if (typeof window.renderCart === "function") window.renderCart();
      if (typeof window.renderProducts === "function") window.renderProducts();

      const couponInput = document.getElementById("couponInput");
      if (couponInput) couponInput.value = "";

      const modal = document.getElementById("orderModal");
      if (modal) modal.classList.remove("show");

      alert("تم حفظ الطلب بنجاح. رقم الطلب: " + orderId);

    } catch (error) {
      console.error("NEXO order:", error);
      alert(
        "لم يتم تأكيد الطلب في قاعدة البيانات.\n" +
        "تحقق من دالة create_order والجداول والصلاحيات في Supabase.\n\n" +
        "التفاصيل: " + error.message
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = previousText || "تأكيد الطلب عبر واتساب";
      }
    }
  };

  /* ===== معلومات عامة للتشخيص ===== */

  window.NEXOSupabase = {
    url: SUPABASE_URL,
    load: loadRemoteData,
    get products() { return remoteProducts; },
    get categories() { return remoteCategories; },
    get ads() { return remoteAds; },
    get settings() { return remoteSettings; }
  };

  loadRemoteData();
})();
