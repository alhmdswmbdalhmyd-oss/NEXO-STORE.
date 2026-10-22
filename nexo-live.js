/* NEXO STORE - ربط المتجر بـ Supabase */
(async () => {
'use strict';

const U = 'https://hmvjxesfgfjjhangyorq.supabase.co';
const K = 'sb_publishable_SZdbk--nDfsTzqlARh3IcA_ZnGm1QPL';
const H = { apikey: K, Authorization: 'Bearer ' + K };

const get = async q => {
    const r = await fetch(U + '/rest/v1/' + q, { headers: H });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
};

const img = s => s || 'icon-192.png';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

/* ===== Supabase ===== */
const libReady = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    script.onload = () => {
        resolve(window.supabase ? window.supabase.createClient(U, K) : null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
});

const rpc = async (fn, args) => {
    const sb = await libReady;

    if (sb) {
        const { data, error } = await sb.rpc(fn, args);
        if (error) throw new Error(error.message);
        return data;
    }

    const r = await fetch(U + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: {
            ...H,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
    });

    const j = await r.json();
    if (!r.ok) throw new Error(j.message || 'تعذر الإرسال');
    return j;
};

/* ===== صفحة الحساب ===== */
const style = document.createElement('style');

style.textContent = `
.accTabs {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
}
.accTabs button {
    flex: 1;
    height: 46px;
    border: 2px solid #e0e3e7;
    background: #fff;
    border-radius: 14px;
    font-weight: 800;
    color: #555;
}
.accTabs button.on {
    border-color: var(--b, #1677ff);
    background: #edf6ff;
    color: var(--b, #1677ff);
}
.accMsg {
    margin-top: 10px;
    font-weight: 800;
    font-size: 14px;
    line-height: 1.8;
    overflow-wrap: anywhere;
}
#accPage {
    z-index: 10000;
}
#accPage button,
.bottomNav button,
.hRow button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
`;

document.head.appendChild(style);

const ICON_USER = `
<svg viewBox="0 0 24 24" aria-hidden="true"
     style="width:22px;height:22px;fill:none;stroke:currentColor;
     stroke-width:2;stroke-linecap:round;stroke-linejoin:round">
    <circle cx="12" cy="8" r="4"></circle>
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"></path>
</svg>`;

/* مهم: اسم مختلف لتجنب تكرار const ap في الملف */
const accountPage = document.createElement('div');
accountPage.className = 'fullPage';
accountPage.id = 'accPage';

accountPage.innerHTML = `
<div class="pageHeader">
    <button type="button" class="pageBack"
        onclick="closePage('accPage')">←</button>
    👤 حسابي
</div>
<div class="pageContent" id="accBody"></div>
`;

document.body.appendChild(accountPage);

let mode = 'in';

function updateAccountButtons(signedIn) {
    const headerButton = document.getElementById('nexoAccountHeader');
    const bottomButton = document.getElementById('nexoAccountBottom');

    if (headerButton) {
        headerButton.style.display = signedIn ? 'none' : '';
    }

    if (bottomButton) {
        bottomButton.style.display = '';
    }
}

/* فتح الحساب */
window.openAcc = async function () {
    try {
        if (typeof window.openPage === 'function') {
            window.openPage('accPage');
        } else if (typeof openPage === 'function') {
            openPage('accPage');
        } else {
            accountPage.style.display = 'flex';
            accountPage.classList.add('active');
        }

        await renderAcc();
    } catch (e) {
        console.error('openAcc:', e);

        const body = document.getElementById('accBody');
        if (body) {
            body.innerHTML = `
                <div class="card">
                    تعذر فتح صفحة الحساب.
                    <button class="checkout" onclick="renderAcc()">
                        إعادة المحاولة
                    </button>
                </div>`;
        }
    }
};

/* زر حسابي في الشريط السفلي */
function createAccountButtons() {
    const bottomNav = document.querySelector('.bottomNav');

    if (bottomNav && !document.getElementById('nexoAccountBottom')) {
        const button = document.createElement('button');

        button.id = 'nexoAccountBottom';
        button.type = 'button';
        button.innerHTML = ICON_USER + '<span>حسابي</span>';

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            window.openAcc();
        });

        bottomNav.appendChild(button);
    }

    const headerRow = document.querySelector('.hRow');

    if (headerRow && !document.getElementById('nexoAccountHeader')) {
        const button = document.createElement('button');

        button.id = 'nexoAccountHeader';
        button.type = 'button';
        button.className = 'hBtn';
        button.setAttribute('aria-label', 'تسجيل الدخول');
        button.innerHTML = ICON_USER;

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            window.openAcc();
        });

        headerRow.appendChild(button);
    }
}

createAccountButtons();

/* اختيار تسجيل الدخول أو إنشاء حساب */
window.accMode = function (newMode) {
    mode = newMode === 'up' ? 'up' : 'in';
    renderAcc();
};

/* عرض صفحة الحساب */
window.renderAcc = async function () {
    const body = document.getElementById('accBody');

    if (!body) return;

    body.innerHTML = `
        <div class="card" style="text-align:center">
            جارٍ تحميل الحساب...
        </div>`;

    try {
        const sb = await libReady;

        if (!sb) {
            updateAccountButtons(false);

            body.innerHTML = `
                <div class="card">
                    <div class="accMsg error">
                        تعذر تحميل خدمة الحساب. تحقق من الإنترنت ثم حدّث الصفحة.
                    </div>
                    <button class="checkout" onclick="renderAcc()">
                        إعادة المحاولة
                    </button>
                </div>`;
            return;
        }

        const { data, error } = await sb.auth.getSession();

        if (error) throw error;

        const session = data.session;

        updateAccountButtons(!!session);

        /* المستخدم غير مسجل الدخول */
        if (!session) {
            body.innerHTML = `
            <div class="card">
                <div class="accTabs">
                    <button type="button"
                        class="${mode === 'in' ? 'on' : ''}"
                        onclick="accMode('in')">
                        تسجيل الدخول
                    </button>

                    <button type="button"
                        class="${mode === 'up' ? 'on' : ''}"
                        onclick="accMode('up')">
                        حساب جديد
                    </button>
                </div>

                <div class="formGroup">
                    <label for="accEm">البريد الإلكتروني</label>
                    <input id="accEm" type="email"
                        autocomplete="email"
                        placeholder="example@email.com"
                        style="direction:ltr;text-align:left">
                </div>

                <div class="formGroup">
                    <label for="accPw">كلمة المرور</label>
                    <input id="accPw" type="password"
                        autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}"
                        placeholder="6 أحرف على الأقل">
                </div>

                ${mode === 'up' ? `
                <div class="formGroup">
                    <label for="accPw2">تأكيد كلمة المرور</label>
                    <input id="accPw2" type="password"
                        autocomplete="new-password"
                        placeholder="أعد كتابة كلمة المرور">
                </div>` : ''}

                <button class="checkout" id="accSubmit"
                    type="button" style="margin-top:0"
                    onclick="accGo()">
                    ${mode === 'in' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
                </button>

                <div id="accMsg" class="accMsg" role="status"></div>
            </div>`;

            return;
        }

        /* المستخدم مسجل الدخول */
        const user = session.user;

        const [profileResult, ordersResult] = await Promise.all([
            sb.from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle(),

            sb.from('orders')
                .select('id,total,status,created_at')
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        const profile = profileResult.error ? null : profileResult.data;
        const orders = ordersResult.data || [];

        body.innerHTML = `
        <div class="card">
            <h3>👤 بيانات حسابي</h3>

            <div style="direction:ltr;text-align:left;
                overflow-wrap:anywhere;margin:10px 0">
                ${esc(user.email)}
            </div>

            ${profileResult.error ? `
                <div class="accMsg error">
                    تعذر تحميل الملف الشخصي:
                    ${esc(profileResult.error.message)}
                </div>` : ''}

            <div class="formGroup">
                <label for="accName">الاسم</label>
                <input id="accName"
                    value="${esc(profile?.name || '')}">
            </div>

            <div class="formGroup">
                <label for="accPhone">رقم الجوال</label>
                <input id="accPhone" type="tel"
                    value="${esc(profile?.phone || '')}">
            </div>

            <div class="formGroup">
                <label for="accAddr">العنوان</label>
                <textarea id="accAddr">${esc(profile?.address || '')}</textarea>
            </div>

            <button class="checkout" type="button"
                style="margin-top:0" onclick="accSave()">
                حفظ بياناتي
            </button>

            <div id="accMsg" class="accMsg" role="status"></div>
        </div>

        <div class="card">
            <h3>📦 طلباتي</h3>

            ${ordersResult.error ? `
                <div class="accMsg error">
                    تعذر تحميل الطلبات:
                    ${esc(ordersResult.error.message)}
                </div>` : ''}

            ${orders.map(order => `
                <div class="ordItem">
                    <b>${esc(order.id)}</b>
                    — ${esc(order.total)} ريال
                    <br>
                    ${esc(order.status || 'جديد')}
                    •
                    ${order.created_at
                        ? new Date(order.created_at).toLocaleDateString('ar-SA')
                        : ''}
                </div>
            `).join('') || (
                ordersResult.error
                    ? ''
                    : '<div class="empty" style="padding:14px">لا توجد طلبات بعد</div>'
            )}
        </div>

        <button class="checkout" type="button"
            style="background:#c62828"
            onclick="accOut()">
            تسجيل الخروج
        </button>`;

    } catch (e) {
        console.error('renderAcc:', e);

        body.innerHTML = `
        <div class="card">
            <div class="accMsg error">
                تعذر فتح الحساب:
                ${esc(e.message || 'خطأ غير معروف')}
            </div>
            <button class="checkout" type="button"
                onclick="renderAcc()">
                إعادة المحاولة
            </button>
        </div>`;
    }
};

/* تسجيل الدخول وإنشاء الحساب */
window.accGo = async function () {
    const sb = await libReady;

    const email = document.getElementById('accEm')?.value.trim();
    const password = document.getElementById('accPw')?.value;
    const password2 = document.getElementById('accPw2')?.value;
    const message = document.getElementById('accMsg');
    const button = document.getElementById('accSubmit');

    if (!message) return;

    if (!sb) {
        message.className = 'accMsg error';
        message.textContent = 'تعذر الاتصال بخدمة الحساب.';
        return;
    }

    if (!email || !password) {
        message.className = 'accMsg error';
        message.textContent = 'أدخل البريد الإلكتروني وكلمة المرور.';
        return;
    }

    if (password.length < 6) {
        message.className = 'accMsg error';
        message.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
        return;
    }

    if (mode === 'up' && password !== password2) {
        message.className = 'accMsg error';
        message.textContent = 'كلمتا المرور غير متطابقتين.';
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'جارٍ التنفيذ...';
    }

    message.textContent = '';

    try {
        let result;

        if (mode === 'in') {
            result = await sb.auth.signInWithPassword({
                email,
                password
            });
        } else {
            result = await sb.auth.signUp({
                email,
                password
            });
        }

        if (result.error) throw result.error;

        if (mode === 'up' && !result.data.session) {
            message.className = 'accMsg success';
            message.textContent =
                'تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم ارجع وسجّل الدخول.';
            return;
        }

        mode = 'in';
        updateAccountButtons(true);
        await renderAcc();

    } catch (e) {
        console.error('Supabase Auth:', e);

        message.className = 'accMsg error';
        message.textContent =
            'تعذر إكمال العملية: ' + (e.message || 'خطأ غير معروف');

    } finally {
        const currentButton = document.getElementById('accSubmit');

        if (currentButton) {
            currentButton.disabled = false;
            currentButton.textContent =
                mode === 'in' ? 'تسجيل الدخول' : 'إنشاء الحساب';
        }
    }
};

/* حفظ بيانات الحساب */
window.accSave = async function () {
    const sb = await libReady;
    const message = document.getElementById('accMsg');

    if (!message) return;

    try {
        if (!sb) throw new Error('تعذر الاتصال بخدمة الحساب.');

        const { data, error: authError } = await sb.auth.getSession();

        if (authError) throw authError;

        const session = data.session;

        if (!session) {
            throw new Error('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');
        }

        const name = document.getElementById('accName')?.value.trim() || '';
        const phone = document.getElementById('accPhone')?.value.trim() || '';
        const address = document.getElementById('accAddr')?.value.trim() || '';

        const { error } = await sb.from('profiles').upsert({
            id: session.user.id,
            name,
            phone,
            address,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;

        message.className = 'accMsg success';
        message.textContent = 'تم حفظ بياناتك بنجاح ✓';

    } catch (e) {
        console.error('accSave:', e);

        message.className = 'accMsg error';
        message.textContent = 'تعذر الحفظ: ' + (e.message || 'خطأ غير معروف');
    }
};

/* تسجيل الخروج */
window.accOut = async function () {
    const sb = await libReady;

    try {
        if (!sb) throw new Error('تعذر الاتصال بخدمة الحساب.');

        const { error } = await sb.auth.signOut();

        if (error) throw error;

        mode = 'in';
        updateAccountButtons(false);
        await renderAcc();

    } catch (e) {
        alert('تعذر تسجيل الخروج: ' + (e.message || 'خطأ غير معروف'));
    }
};

/* متابعة حالة تسجيل الدخول */
(async () => {
    const sb = await libReady;
    if (!sb) return;

    try {
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;

        updateAccountButtons(!!data.session);

        sb.auth.onAuthStateChange((event, session) => {
            updateAccountButtons(!!session);
        });

    } catch (e) {
        console.error('Auth state:', e);
    }
})();

/* تعبئة بيانات الطلب من الحساب */
const originalOpenOrder = window.openOrder;

if (typeof originalOpenOrder === 'function') {
    window.openOrder = async function () {
        originalOpenOrder();

        try {
            const sb = await libReady;
            if (!sb) return;

            const { data } = await sb.auth.getSession();
            const session = data.session;
            if (!session) return;

            const { data: profile } = await sb.from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile) {
                const name = document.getElementById('name');
                const phone = document.getElementById('phone');
                const address = document.getElementById('address');

                if (name && !name.value) name.value = profile.name || '';
                if (phone && !phone.value) phone.value = profile.phone || '';
                if (address && !address.value) address.value = profile.address || '';
            }
        } catch (e) {
            console.error('Fill order profile:', e);
        }
    };
}

/* ===== تتبع الطلب والرسائل ===== */
try {
    const msgPage = document.getElementById('msgPage');

    if (msgPage) {
        const content = msgPage.querySelector('.pageContent .card');

        if (content && !document.getElementById('trId')) {
            content.insertAdjacentHTML('beforebegin', `
            <div class="card">
                <h3>📦 تتبع طلبك</h3>

                <div class="formGroup">
                    <label for="trId">رقم الطلب</label>
                    <input id="trId" type="text"
                        placeholder="NEXO-12345678"
                        style="direction:ltr;text-align:right">
                </div>

                <div class="formGroup">
                    <label for="trPhone">رقم الجوال</label>
                    <input id="trPhone" type="tel"
                        placeholder="05xxxxxxxx">
                </div>

                <button class="checkout" type="button"
                    style="margin-top:0" onclick="trackOrder()">
                    تتبع
                </button>

                <div id="trRes" style="margin-top:12px;line-height:1.9"></div>
            </div>`);
        }

        const msgText = document.getElementById('msgText');

        if (msgText && !document.getElementById('msgPhone')) {
            msgText.closest('.formGroup')?.insertAdjacentHTML('beforebegin', `
            <div class="formGroup">
                <label for="msgPhone">رقم الجوال (عشان نرد عليك)</label>
                <input id="msgPhone" type="tel"
                    placeholder="05xxxxxxxx">
            </div>

            <div class="formGroup">
                <label for="msgOrder">رقم الطلب (اختياري)</label>
                <input id="msgOrder" type="text"
                    placeholder="NEXO-12345678"
                    style="direction:ltr;text-align:right">
            </div>`);
        }
    }
} catch (e) {
    console.error('Message page:', e);
}

window.trackOrder = async function () {
    const result = document.getElementById('trRes');
    if (!result) return;

    result.textContent = 'جاري البحث...';

    try {
        const order = await rpc('track_order', {
            p_id: document.getElementById('trId')?.value.trim(),
            p_phone: document.getElementById('trPhone')?.value.trim()
        });

        if (!order) {
            result.innerHTML =
                '<span class="error">لم نجد طلبًا بهذه البيانات. تأكد من رقم الطلب والجوال.</span>';
            return;
        }

        const statusIcons = {
            'جديد': '🆕',
            'قيد التجهيز': '🛠',
            'تم التسليم': '✅',
            'ملغي': '❌'
        };

        result.innerHTML = `
            <b>${esc(order.id)}</b><br>
            الحالة:
            <b>${statusIcons[order.status] || ''} ${esc(order.status)}</b><br>
            ${esc(order.delivery_method === 'delivery' ? 'توصيل' : 'استلام من الفرع')}
            • ${esc(order.total)} ريال<br>
            ${new Date(order.created_at).toLocaleString('ar-SA')}<br>
            ${(order.items || []).map(item =>
                '• ' + esc(item.name) + ' × ' + esc(item.qty)
            ).join('<br>')}`;

    } catch (e) {
        console.error('trackOrder:', e);
        result.innerHTML =
            '<span class="error">تعذر التتبع، حاول مرة ثانية.</span>';
    }
};

window.sendMsg = async function () {
    const name = document.getElementById('msgName')?.value.trim();
    const messageText = document.getElementById('msgText')?.value.trim();
    const phone = document.getElementById('msgPhone')?.value.trim();
    const orderId = document.getElementById('msgOrder')?.value.trim();

    if (!name) {
        alert('اكتب اسمك');
        return;
    }

    if (!phone) {
        alert('اكتب رقم جوالك عشان نرد عليك');
        return;
    }

    if (!messageText) {
        alert('اكتب رسالتك');
        return;
    }

    try {
        await rpc('send_message', {
            p_topic: window.msgTopic,
            p_name: name,
            p_phone: phone,
            p_order: orderId || null,
            p_body: messageText
        });

    } catch (e) {
        alert(e.message || 'تعذر إرسال الرسالة');
        return;
    }

    try {
        const messages = load('nexo_msgs', '[]');
        messages.push({
            topic: window.msgTopic,
            text: messageText,
            time: new Date().toLocaleString('ar-SA')
        });

        save('nexo_msgs', messages);
        document.getElementById('msgText').value = '';

        if (typeof window.renderMsgs === 'function') {
            window.renderMsgs();
        }

        alert('وصلت رسالتك ✓ بنرد عليك قريبًا');

    } catch (e) {
        console.error('Save message:', e);
        alert('تم إرسال الرسالة.');
    }
};

/* ===== تقييم المنتجات ===== */
async function loadRev(id) {
    window.revStar = 0;

    let box = document.getElementById('revBox');

    if (!box) {
        const detail = document.querySelector('#productPage .detailInfo');
        if (!detail) return;

        detail.insertAdjacentHTML('beforeend', `
            <div id="revBox"
                style="margin-top:26px;border-top:1px solid #eee;padding-top:16px">
            </div>`);

        box = document.getElementById('revBox');
    }

    box.innerHTML = '<div style="color:#888">جاري تحميل التقييمات...</div>';

    try {
        const reviews = await get(
            'reviews?select=author,rating,comment&product_id=eq.' +
            encodeURIComponent(id) +
            '&order=created_at.desc&limit=30'
        );

        const sb = await libReady;
        const session = sb ? (await sb.auth.getSession()).data.session : null;

        const average = reviews.length
            ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
            : '';

        box.innerHTML = `
        <div style="font-size:18px;font-weight:800">
            ⭐ التقييمات
            ${average
                ? `<span style="color:#f5a623">${average}</span>
                   <small style="color:#888">(${reviews.length})</small>`
                : ''}
        </div>

        ${reviews.map(review => `
            <div style="padding:10px 0;border-bottom:1px solid #f0f0f0">
                <b>${esc(review.author)}</b>
                <span style="color:#f5a623">
                    ${'★'.repeat(Math.max(0, Math.min(5, review.rating)))}
                    ${'☆'.repeat(5 - Math.max(0, Math.min(5, review.rating)))}
                </span>
                <div style="color:#555;line-height:1.8">
                    ${esc(review.comment)}
                </div>
            </div>
        `).join('') || `
            <div style="color:#888;padding:10px 0">
                لا توجد تقييمات بعد، كن أول من يقيّم.
            </div>`}

        ${session ? `
            <div style="margin-top:14px">
                <div id="stars"
                    style="font-size:32px;color:#ccc;direction:ltr;text-align:right">
                    ${[1, 2, 3, 4, 5].map(n =>
                        `<span onclick="pickStar(${n})">★</span>`
                    ).join('')}
                </div>

                <textarea id="revText"
                    placeholder="اكتب تقييمك..."
                    maxlength="500"
                    style="width:100%;height:80px;border:1px solid #d7dce2;
                    border-radius:14px;padding:10px;margin-top:6px"></textarea>

                <button class="checkout" type="button"
                    style="margin-top:8px"
                    onclick="sendRev('${esc(id)}')">
                    إرسال التقييم
                </button>
            </div>
        ` : `
            <button class="checkout" type="button"
                style="margin-top:14px" onclick="openAcc()">
                سجّل دخول لكتابة تقييم
            </button>`}`;

    } catch (e) {
        console.error('loadRev:', e);
        box.innerHTML = '<div style="color:#888">تعذر تحميل التقييمات.</div>';
    }
}

window.pickStar = function (number) {
    window.revStar = number;

    const stars = document.getElementById('stars');
    if (!stars) return;

    [...stars.children].forEach((star, index) => {
        star.style.color = index < number ? '#f5a623' : '#ccc';
    });
};

window.sendRev = async function (id) {
    if (!window.revStar) {
        alert('اختر عدد النجوم');
        return;
    }

    const sb = await libReady;

    if (!sb) {
        alert('تعذر الاتصال بخدمة الحساب');
        return;
    }

    const { data, error: authError } = await sb.auth.getSession();

    if (authError || !data.session) {
        window.openAcc();
        return;
    }

    const session = data.session;

    const { data: profile } = await sb.from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle();

    const comment = document.getElementById('revText')?.value.trim() || '';

    const { error } = await sb.from('reviews').insert({
        product_id: id,
        author: profile?.name || 'عميل',
        rating: window.revStar,
        comment
    });

    if (error) {
        alert(error.code === '23505'
            ? 'قيّمت هذا المنتج من قبل'
            : 'تعذر إرسال التقييم: ' + error.message);
        return;
    }

    await loadRev(id);
};

/* ربط التقييمات بصفحة المنتج */
if (typeof window.openProduct === 'function') {
    const originalOpenProduct = window.openProduct;

    window.openProduct = function (id) {
        originalOpenProduct(id);
        loadRev(id);
    };
}

/* منع الإضافة عند نفاد الكمية */
if (typeof window.addToCart === 'function') {
    const originalAddToCart = window.addToCart;

    window.addToCart = function (id) {
        const product = typeof byId === 'function' ? byId(id) : null;

        if (product && product.stock !== undefined) {
            if (product.stock <= 0) {
                alert('نفدت الكمية');
                return;
            }

            const item = cart.find(x => x.id === id);

            if (item && item.qty >= product.stock) {
                alert('وصلت للحد الأقصى المتوفر');
                return;
            }
        }

        originalAddToCart(id);
    };
}

if (typeof window.card === 'function') {
    const originalCard = window.card;

    window.card = function (product, flag) {
        const html = originalCard(product, flag);

        return product.stock <= 0
            ? html.replace('أضف للسلة', 'نفدت الكمية')
            : html;
    };
}

/* ===== إرسال الطلب ===== */
window.sendOrder = async function () {
    const name = document.getElementById('name')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const address = document.getElementById('address')?.value.trim();
    const payment = document.getElementById('payment')?.value;

    if (!name) {
        alert('اكتب اسمك');
        return;
    }

    if (!phone) {
        alert('اكتب رقم الجوال');
        return;
    }

    if (window.deliveryMethod === 'delivery' && !address) {
        alert('اكتب عنوان التوصيل');
        return;
    }

    const button = document.querySelector('#orderModal .checkout');

    if (button) {
        button.disabled = true;
        button.textContent = 'جاري إرسال الطلب...';
    }

    try {
        const body = {
            p_name: name,
            p_phone: phone,
            p_address: address,
            p_delivery: window.deliveryMethod ?? deliveryMethod,
            p_payment: payment,
            p_coupon: window.couponApplied ? window.COUPON_CODE : null,
            p_items: cart.map(item => ({
                id: item.id,
                qty: item.qty
            }))
        };

        const result = await rpc('create_order', body);

        let itemsText = '';

        cart.forEach(item => {
            const product = byId(item.id);

            if (product) {
                itemsText +=
                    `• ${product.name} × ${item.qty} = ${unitPrice(product) * item.qty} ريال\n`;

                if (product.stock !== undefined) {
                    product.stock = Math.max(0, product.stock - item.qty);
                }
            }
        });

        const deliveryText =
            (window.deliveryMethod ?? deliveryMethod) === 'delivery'
                ? 'توصيل'
                : 'استلام من الفرع';

        const orders = load('nexo_orders', '[]');

        orders.push({
            orderId: result.order_id,
            customerName: name,
            phone,
            address,
            deliveryMethod: deliveryText,
            paymentMethod: payment,
            items: itemsText,
            total: result.total,
            status: 'جديد',
            createdAt: new Date().toISOString()
        });

        save('nexo_orders', orders);

        let message =
            `🛒 *طلب جديد - NEXO STORE*\n\n` +
            `رقم الطلب: ${result.order_id}\n\n` +
            `👤 الاسم: ${name}\n` +
            `📱 الجوال: ${phone}\n\n` +
            `📦 المنتجات:\n${itemsText}`;

        if (result.discount > 0) {
            message +=
                `💰 المجموع الأصلي: ${result.subtotal} ريال\n` +
                `🏷 الخصم: ${result.discount} ريال\n` +
                `💵 بعد الخصم: ${result.products_total} ريال\n`;
        } else {
            message += `💰 مجموع المنتجات: ${result.products_total} ريال\n`;
        }

        message +=
            `🚚 رسوم التوصيل: ${result.delivery_fee} ريال\n` +
            `💳 طريقة الدفع: ${payment}\n` +
            `📦 طريقة الاستلام: ${deliveryText}\n\n` +
            `💵 *الإجمالي النهائي: ${result.total} ريال*\n`;

        if ((window.deliveryMethod ?? deliveryMethod) === 'delivery') {
            message += `\n📍 العنوان:\n${address}`;
        }

        const whatsapp = window.WHATSAPP ?? WHATSAPP;
        const url = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message);

        cart = [];
        window.couponApplied = false;

        const couponInput = document.getElementById('couponInput');
        if (couponInput) couponInput.value = '';

        saveCart();
        renderProducts();

        if (typeof closeModal === 'function') {
            closeModal('orderModal');
        }

        const newWindow = window.open(url, '_blank');

        if (!newWindow) {
            window.location.href = url;
        }

    } catch (e) {
        console.error('sendOrder:', e);
        alert(e.message || 'تعذر إرسال الطلب');

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'تأكيد الطلب عبر واتساب';
        }
    }
};

/* ===== كودات الخصم ===== */
window.applyCoupon = async function () {
    const input = document.getElementById('couponInput');
    const code = input?.value.trim() || '';

    let rate = null;

    if (code) {
        try {
            const response = await fetch(
                U + '/rest/v1/rpc/validate_coupon',
                {
                    method: 'POST',
                    headers: {
                        ...H,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ p_code: code })
                }
            );

            rate = await response.json();

            if (!response.ok) {
                throw new Error('تعذر التحقق من رمز الخصم');
            }

        } catch (e) {
            console.error('Coupon:', e);
        }
    }

    if (rate > 0) {
        window.COUPON_RATE = Number(rate);
        window.COUPON_CODE = code.toUpperCase();
        window.couponApplied = true;
    } else {
        window.couponApplied = false;
    }

    renderCart();
    renderProducts();

    if (window.currentProduct) {
        const oldPrice = document.getElementById('detailOldPrice');
        const price = document.getElementById('detailPrice');

        if (oldPrice) {
            oldPrice.textContent = window.couponApplied
                ? window.currentProduct.oldPrice + ' ريال'
                : '';

            oldPrice.style.display = window.couponApplied ? 'block' : 'none';
        }

        if (price) {
            price.textContent = unitPrice(window.currentProduct) + ' ريال';
        }
    }

    if (!window.couponApplied) {
        const message = document.getElementById('couponMessage');

        if (message) {
            message.className = 'couponMessage error';
            message.textContent = '✕ رمز الخصم غير صحيح';
        }
    }
};

if (typeof window.renderCart === 'function') {
    const originalRenderCart = window.renderCart;

    window.renderCart = function () {
        originalRenderCart();

        if (window.couponApplied) {
            const message = document.getElementById('couponMessage');

            if (message) {
                message.textContent =
                    '✓ تم تطبيق خصم ' +
                    Math.round((window.COUPON_RATE || 0) * 100) +
                    '% من السعر الأصلي';
            }
        }
    };
}

if (typeof window.summaryHTML === 'function') {
    const originalSummaryHTML = window.summaryHTML;

    window.summaryHTML = function (discount, flag) {
        return originalSummaryHTML(discount, flag)
            .replace(
                'الخصم 50%',
                'الخصم ' + Math.round((window.COUPON_RATE || 0) * 100) + '%'
            );
    };
}

/* ===== تحميل المنتجات والتصنيفات والإعلانات ===== */
try {
    const [productsData, categoriesData, ads] = await Promise.all([
        get('products?select=*&order=sort'),
        get('categories?select=*&order=sort'),
        get('ads?select=*&order=sort')
    ]);

    products.splice(
        0,
        products.length,
        ...productsData.map(product => ({
            id: product.id,
            name: product.name,
            oldPrice: +product.old_price,
            price: +product.price,
            category: product.category,
            image: img(product.image),
            desc: product.description || '',
            stock: product.stock
        }))
    );

    CAT_LIST.splice(
        0,
        CAT_LIST.length,
        ['الكل', 'icon-192.png'],
        ...categoriesData.map(category => [
            category.name,
            img(category.image)
        ])
    );

    const categoriesBox = document.querySelector('.categories');

    if (categoriesBox) {
        categoriesBox.innerHTML = CAT_LIST.map(([name, image], index) => `
            <button class="category${index ? '' : ' active'}"
                onclick="selectCategory('${esc(name)}',this)">
                <img class="catImg" src="${esc(image)}" alt="">
                <span>${esc(name)}</span>
            </button>
        `).join('');
    }

    category = 'الكل';

    buildCats();
    renderProducts();
    refreshFav();

    /* إعلانات الصفحة الرئيسية */
    const homeBanners = ads.filter(ad => ad.placement === 'home_banner');

    if (homeBanners.length) {
        const oldSlides = document.getElementById('adSlides');

        if (oldSlides) {
            const slideBox = oldSlides.cloneNode(false);
            oldSlides.replaceWith(slideBox);

            const dots = document.getElementById('adDots');

            slideBox.innerHTML = homeBanners.map(ad => {
                const link = ad.button_link &&
                    /^https?:\/\//.test(ad.button_link)
                    ? ad.button_link
                    : '';

                if (ad.image_url) {
                    return `
                    <div class="adSlide" style="padding:0">
                        ${link
                            ? `<a href="${esc(link)}" style="display:block;width:100%;height:100%">
                                <img src="${esc(ad.image_url)}" alt="">
                               </a>`
                            : `<img src="${esc(ad.image_url)}" alt="">`}
                    </div>`;
                }

                return `
                <div class="adSlide"
                    style="background:${esc(ad.bg || 'linear-gradient(135deg,#0876d9,#00c6ff)')}">
                    <b>${esc(ad.title)}</b>
                    <span>${esc(ad.subtitle)}</span>
                    ${link && ad.button_text ? `
                        <a href="${esc(link)}"
                            style="margin-top:10px;background:#fff;color:#0876d9;
                            border-radius:12px;padding:8px 18px;font-weight:800;
                            text-decoration:none">
                            ${esc(ad.button_text)}
                        </a>` : ''}
                </div>`;
            }).join('');

            if (dots) {
                dots.innerHTML = homeBanners.map(() => '<i></i>').join('');

                const slides = [...slideBox.children];
                const dotItems = [...dots.children];
                let current = 0;

                const mark = index => {
                    current = index;
                    dotItems.forEach((dot, i) => {
                        dot.classList.toggle('on', i === index);
                    });
                };

                mark(0);

                if ('IntersectionObserver' in window) {
                    const observer = new IntersectionObserver(entries => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                                mark(slides.indexOf(entry.target));
                            }
                        });
                    }, {
                        root: slideBox,
                        threshold: [0.6]
                    });

                    slides.forEach(slide => observer.observe(slide));
                }

                if (slides.length > 1) {
                    setInterval(() => {
                        const rect = slideBox.getBoundingClientRect();

                        if (rect.bottom < 0 || rect.top > innerHeight) return;

                        slides[(current + 1) % slides.length]
                            .scrollIntoView({
                                behavior: 'smooth',
                                inline: 'center',
                                block: 'nearest'
                            });
                    }, 4000);
                }
            }
        }
    }

    /* إعلانات فوق المنتجات */
    const aboveProductsAds = ads.filter(
        ad => ad.placement === 'above_products'
    );

    if (aboveProductsAds.length) {
        const adsBox = document.createElement('div');

        adsBox.style.cssText =
            'display:flex;gap:10px;overflow-x:auto;margin-bottom:14px;scrollbar-width:none';

        adsBox.innerHTML = aboveProductsAds.map(ad => {
            const link = ad.button_link &&
                /^https?:\/\//.test(ad.button_link)
                ? ad.button_link
                : '';

            const inner = ad.image_url
                ? `<img src="${esc(ad.image_url)}" alt=""
                    style="width:100%;height:100%;object-fit:cover;border-radius:16px">`
                : `<div style="background:${esc(ad.bg || '#0876d9')};color:#fff;
                    border-radius:16px;height:100%;display:flex;flex-direction:column;
                    align-items:center;justify-content:center;padding:10px;text-align:center">
                    <b>${esc(ad.title)}</b>
                    <span style="font-size:13px">${esc(ad.subtitle)}</span>
                  </div>`;

            if (link) {
                return `
                <a href="${esc(link)}"
                    style="flex:0 0 85%;height:120px;display:block;text-decoration:none">
                    ${inner}
                </a>`;
            }

            return `
            <div style="flex:0 0 85%;height:120px;display:block">
                ${inner}
            </div>`;
        }).join('');

        const productsBox = document.getElementById('products');

        if (productsBox) {
            productsBox.before(adsBox);
        }
    }

} catch (e) {
    console.error('Supabase products:', e);
}

/* ===== رسوم التوصيل وحد التوصيل المجاني ===== */
try {
    const settings = await get('settings?select=*&id=eq.1');
    const setting = settings[0];

    if (setting) {
        DELIVERY_FEE = +setting.delivery_fee;
        FREE_SHIPPING_LIMIT = +setting.free_shipping_limit;
        updateCartNumber();
    }

} catch (e) {
    console.error('Supabase settings:', e);
}

})();




