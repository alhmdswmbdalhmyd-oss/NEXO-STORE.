
/* NEXO STORE — إرسال الطلب */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  window.NEXOCreateOrder = async function ({
    name,
    phone,
    address,
    deliveryMethod,
    payment,
    coupon,
    items
  }) {
    if (!name?.trim()) throw new Error('اكتب اسمك');
    if (!phone?.trim()) throw new Error('اكتب رقم الجوال');
    if (deliveryMethod === 'delivery' && !address?.trim()) {
      throw new Error('اكتب عنوان التوصيل');
    }

    if (!Array.isArray(items) || !items.length) {
      throw new Error('السلة فارغة');
    }

    const payload = {
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_address: address.trim(),
      p_delivery: deliveryMethod,
      p_payment: payment,
      p_coupon: coupon || null,
      p_items: items.map(item => ({
        id: item.id,
        qty: Number(item.qty)
      }))
    };

    for (const item of payload.p_items) {
      if (!Number.isInteger(item.qty) || item.qty < 1) {
        throw new Error('الكمية غير صحيحة');
      }
    }

    const result = await window.NEXOSupabase.createOrder(payload);

    if (!result || !result.order_id) {
      throw new Error('لم يتم استلام رقم الطلب من قاعدة البيانات');
    }

    return result;
  };
})();
