/* NEXO STORE - ربط المتجر بـ Supabase (مفتاح عام فقط) */
(async()=>{
const U='https://hmvjxesfgfjjhangyorq.supabase.co';
const K='sb_publishable_SZdbk--nDfsTzqlARh3IcA_ZnGm1QPL';
const H={apikey:K,Authorization:'Bearer '+K};
const get=async q=>{const r=await fetch(U+'/rest/v1/'+q,{headers:H});if(!r.ok)throw new Error(r.status);return r.json()};
const img=s=>s||'icon-192.png';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ===== Supabase Auth + RPC ===== */
const libReady=new Promise(res=>{
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
s.onload=()=>res(window.supabase?supabase.createClient(U,K):null);
s.onerror=()=>res(null);
document.head.appendChild(s);
});
const rpc=async(fn,args)=>{
const sb=await libReady;
if(sb){const{data,error}=await sb.rpc(fn,args);if(error)throw new Error(error.message);return data}
const r=await fetch(U+'/rest/v1/rpc/'+fn,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify(args)});
const j=await r.json();if(!r.ok)throw new Error(j.message||'تعذر الإرسال');return j;
};

/* ===== صفحة الحساب + زر الدخول ===== */
const st=document.createElement('style');
st.textContent='.accTabs{display:flex;gap:8px;margin-bottom:14px}.accTabs button{flex:1;height:46px;border:2px solid #e0e3e7;background:#fff;border-radius:14px;font-weight:800;color:#555}.accTabs button.on{border-color:var(--b);background:#edf6ff;color:var(--b)}.accMsg{margin-top:10px;font-weight:800;font-size:14px}';
document.head.appendChild(st);
const ICON_USER='<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
const ap=document.createElement('div');ap.className='fullPage';ap.id='accPage';
ap.innerHTML='<div class="pageHeader"><button class="pageBack" onclick="closePage(\'accPage\')">←</button>👤 حسابي</div><div class="pageContent" id="accBody"></div>';
document.body.appendChild(ap);
window.openAcc=()=>{renderAcc();openPage('accPage')};
const nb=document.createElement('button');nb.innerHTML=ICON_USER+'حسابي';nb.onclick=openAcc;
document.querySelector('.bottomNav').appendChild(nb);
const hb0=document.createElement('button');hb0.className='hBtn';hb0.setAttribute('aria-label','تسجيل الدخول');hb0.innerHTML=ICON_USER;hb0.onclick=openAcc;
document.querySelector('.hRow').appendChild(hb0);

let mode='in';
window.accMode=m=>{mode=m;renderAcc()};
async function renderAcc(){
const sb=await libReady,b=$('accBody');
if(!sb){b.innerHTML='<div class="card">تعذر تحميل خدمة الحساب، تأكد من الاتصال</div>';return}
const{data:{session}}=await sb.auth.getSession();
if(!session){
b.innerHTML=`<div class="card"><div class="accTabs"><button class="${mode==='in'?'on':''}" onclick="accMode('in')">تسجيل الدخول</button><button class="${mode==='up'?'on':''}" onclick="accMode('up')">حساب جديد</button></div><div class="formGroup"><label>البريد الإلكتروني</label><input id="accEm" type="email" autocomplete="username" style="direction:ltr;text-align:right"></div><div class="formGroup"><label>كلمة المرور</label><input id="accPw" type="password" autocomplete="${mode==='in'?'current-password':'new-password'}" placeholder="6 أحرف على الأقل"></div><button class="checkout" style="margin-top:0" onclick="accGo()">${mode==='in'?'دخول':'إنشاء الحساب'}</button><div id="accMsg" class="accMsg"></div></div>`;
return}
const u=session.user;
const[{data:p},{data:os}]=await Promise.all([sb.from('profiles').select('*').eq('id',u.id).maybeSingle(),sb.from('orders').select('id,total,status,created_at').order('created_at',{ascending:false}).limit(20)]);
b.innerHTML=`<div class="card"><h3 style="direction:ltr;text-align:right">${esc(u.email)}</h3><div class="formGroup"><label>الاسم</label><input id="accName" value="${esc(p&&p.name)}"></div><div class="formGroup"><label>الجوال</label><input id="accPhone" type="tel" value="${esc(p&&p.phone)}"></div><div class="formGroup"><label>العنوان</label><textarea id="accAddr">${esc(p&&p.address)}</textarea></div><button class="checkout" style="margin-top:0" onclick="accSave()">حفظ بياناتي</button><div id="accMsg" class="accMsg"></div></div><div class="card"><h3>📦 طلباتي</h3>${(os||[]).map(o=>`<div class="ordItem"><b>${esc(o.id)}</b> — ${o.total} ريال<br>${esc(o.status)} • ${new Date(o.created_at).toLocaleDateString('ar-SA')}</div>`).join('')||'<div class="empty" style="padding:14px">لا توجد طلبات بعد</div>'}</div><button class="checkout" style="background:#c62828" onclick="accOut()">تسجيل خروج</button>`;
}
window.accGo=async()=>{
const sb=await libReady,email=$('accEm').value.trim(),password=$('accPw').value,m=$('accMsg');
m.className='accMsg error';
if(!email||password.length<6){m.textContent='اكتب البريد وكلمة مرور 6 أحرف على الأقل';return}
const r=mode==='in'?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password});
if(r.error){m.textContent=mode==='in'?'بيانات الدخول غير صحيحة':'تعذر إنشاء الحساب: '+r.error.message;return}
if(mode==='up'&&!r.data.session){m.className='accMsg success';m.textContent='تم إنشاء الحساب. افتح بريدك واضغط رابط التأكيد ثم سجّل دخول';return}
renderAcc();
};
window.accSave=async()=>{
const sb=await libReady,{data:{session}}=await sb.auth.getSession(),m=$('accMsg');
const{error}=await sb.from('profiles').upsert({id:session.user.id,name:$('accName').value.trim(),phone:$('accPhone').value.trim(),address:$('accAddr').value.trim(),updated_at:new Date().toISOString()});
m.className='accMsg '+(error?'error':'success');m.textContent=error?'تعذر الحفظ':'تم الحفظ ✓';
};
window.accOut=async()=>{const sb=await libReady;await sb.auth.signOut();renderAcc()};

/* تعبئة بيانات الطلب من الحساب */
const _oo=openOrder;
window.openOrder=async function(){
_oo();
try{
const sb=await libReady;if(!sb)return;
const{data:{session}}=await sb.auth.getSession();if(!session)return;
const{data:p}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
if(p){if(!$('name').value)$('name').value=p.name||'';if(!$('phone').value)$('phone').value=p.phone||'';if(!$('address').value)$('address').value=p.address||''}
}catch(e){}
};

/* ===== تتبع الطلب + الشكاوي (صفحة الرسائل) ===== */
$('msgPage').querySelector('.pageContent .card').insertAdjacentHTML('beforebegin','<div class="card"><h3>📦 تتبع طلبك</h3><div class="formGroup"><label>رقم الطلب</label><input id="trId" type="text" placeholder="NEXO-12345678" style="direction:ltr;text-align:right"></div><div class="formGroup"><label>رقم الجوال</label><input id="trPhone" type="tel" placeholder="05xxxxxxxx"></div><button class="checkout" style="margin-top:0" onclick="trackOrder()">تتبع</button><div id="trRes" style="margin-top:12px;line-height:1.9"></div></div>');
$('msgText').closest('.formGroup').insertAdjacentHTML('beforebegin','<div class="formGroup"><label>رقم الجوال (عشان نرد عليك)</label><input id="msgPhone" type="tel" placeholder="05xxxxxxxx"></div><div class="formGroup"><label>رقم الطلب (اختياري)</label><input id="msgOrder" type="text" placeholder="NEXO-12345678" style="direction:ltr;text-align:right"></div>');
window.trackOrder=async()=>{
const r=$('trRes');r.textContent='جاري البحث...';
try{
const o=await rpc('track_order',{p_id:$('trId').value,p_phone:$('trPhone').value});
if(!o){r.innerHTML='<span class="error">ما لقينا طلب بهذي البيانات، تأكد من رقم الطلب والجوال</span>';return}
const E={'جديد':'🆕','قيد التجهيز':'🛠','تم التسليم':'✅','ملغي':'❌'};
r.innerHTML=`<b>${esc(o.id)}</b><br>الحالة: <b>${E[o.status]||''} ${esc(o.status)}</b><br>${esc(o.delivery_method==='delivery'?'توصيل':'استلام من الفرع')} • ${o.total} ريال<br>${new Date(o.created_at).toLocaleString('ar-SA')}<br>${(o.items||[]).map(i=>'• '+esc(i.name)+' × '+i.qty).join('<br>')}`;
}catch(e){r.innerHTML='<span class="error">تعذر التتبع، حاول مرة ثانية</span>'}
};
window.sendMsg=async function(){
const name=$('msgName').value.trim(),text=$('msgText').value.trim(),phone=$('msgPhone').value.trim();
if(!name){alert('اكتب اسمك');return}
if(!phone){alert('اكتب رقم جوالك عشان نرد عليك');return}
if(!text){alert('اكتب رسالتك');return}
try{await rpc('send_message',{p_topic:msgTopic,p_name:name,p_phone:phone,p_order:$('msgOrder').value.trim()||null,p_body:text})}catch(e){alert(e.message);return}
const m=load('nexo_msgs','[]');m.push({topic:msgTopic,text,time:new Date().toLocaleString('ar-SA')});save('nexo_msgs',m);
$('msgText').value='';renderMsgs();alert('وصلت رسالتك ✓ بنرد عليك قريبًا');
};

/* ===== تقييم المنتجات ===== */
async function loadRev(id){
window.revStar=0;
let box=$('revBox');
if(!box){document.querySelector('#productPage .detailInfo').insertAdjacentHTML('beforeend','<div id="revBox" style="margin-top:26px;border-top:1px solid #eee;padding-top:16px"></div>');box=$('revBox')}
box.innerHTML='<div style="color:#888">جاري تحميل التقييمات...</div>';
try{
const rs=await get('reviews?select=author,rating,comment&product_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=30');
const sb=await libReady;
const ses=sb?(await sb.auth.getSession()).data.session:null;
const avg=rs.length?(rs.reduce((s,r)=>s+r.rating,0)/rs.length).toFixed(1):'';
box.innerHTML=`<div style="font-size:18px;font-weight:800">⭐ التقييمات ${avg?`<span style="color:#f5a623">${avg}</span> <small style="color:#888">(${rs.length})</small>`:''}</div>`+
(rs.map(r=>`<div style="padding:10px 0;border-bottom:1px solid #f0f0f0"><b>${esc(r.author)}</b> <span style="color:#f5a623">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span><div style="color:#555;line-height:1.8">${esc(r.comment)}</div></div>`).join('')||'<div style="color:#888;padding:10px 0">ما فيه تقييمات بعد، كن أول من يقيّم</div>')+
(ses?`<div style="margin-top:14px"><div id="stars" style="font-size:32px;color:#ccc;direction:ltr;text-align:right">${[1,2,3,4,5].map(n=>`<span onclick="pickStar(${n})">★</span>`).join('')}</div><textarea id="revText" placeholder="اكتب تقييمك..." maxlength="500" style="width:100%;height:80px;border:1px solid #d7dce2;border-radius:14px;padding:10px;margin-top:6px"></textarea><button class="checkout" style="margin-top:8px" onclick="sendRev('${esc(id)}')">إرسال التقييم</button></div>`:'<button class="checkout" style="margin-top:14px" onclick="openAcc()">سجّل دخول لكتابة تقييم</button>');
}catch(e){box.innerHTML=''}
}
window.pickStar=n=>{window.revStar=n;[...$('stars').children].forEach((s,i)=>s.style.color=i<n?'#f5a623':'#ccc')};
window.sendRev=async id=>{
if(!window.revStar){alert('اختر عدد النجوم');return}
const sb=await libReady,{data:{session}}=await sb.auth.getSession();
if(!session){openAcc();return}
const{data:p}=await sb.from('profiles').select('name').eq('id',session.user.id).maybeSingle();
const{error}=await sb.from('reviews').insert({product_id:id,author:(p&&p.name)||'عميل',rating:window.revStar,comment:$('revText').value.trim()});
if(error){alert(error.code==='23505'?'قيّمت هذا المنتج من قبل':'تعذر إرسال التقييم');return}
loadRev(id);
};
const _op=openProduct;
window.openProduct=function(id){_op(id);loadRev(id)};

/* منع الإضافة عند نفاد الكمية */
const _add=addToCart;
window.addToCart=function(id){
const p=byId(id);
if(p&&p.stock!==undefined){
if(p.stock<=0){alert('نفدت الكمية');return}
const i=cart.find(x=>x.id===id);
if(i&&i.qty>=p.stock){alert('وصلت للحد الأقصى المتوفر');return}
}
_add(id);
};
const _card=card;
window.card=(p,f)=>{const h=_card(p,f);return p.stock<=0?h.replace('أضف للسلة','نفدت الكمية'):h};

/* إرسال الطلب: الأسعار والكمية تتحقق منها قاعدة البيانات */
window.sendOrder=async function(){
const name=$('name').value.trim(),phone=$('phone').value.trim(),address=$('address').value.trim(),payment=$('payment').value;
if(!name){alert('اكتب اسمك');return}
if(!phone){alert('اكتب رقم الجوال');return}
if(deliveryMethod==='delivery'&&!address){alert('اكتب عنوان التوصيل');return}
const btn=document.querySelector('#orderModal .checkout');
btn.disabled=true;btn.textContent='جاري إرسال الطلب...';
try{
const body={p_name:name,p_phone:phone,p_address:address,p_delivery:deliveryMethod,p_payment:payment,p_coupon:couponApplied?COUPON_CODE:null,p_items:cart.map(i=>({id:i.id,qty:i.qty}))};
const j=await rpc('create_order',body);
let items='';
cart.forEach(i=>{const p=byId(i.id);if(p){items+=`• ${p.name} × ${i.qty} = ${unitPrice(p)*i.qty} ريال\n`;if(p.stock!==undefined)p.stock=Math.max(0,p.stock-i.qty)}});
const dm=deliveryMethod==='delivery'?'توصيل':'استلام من الفرع';
const orders=load('nexo_orders','[]');
orders.push({orderId:j.order_id,customerName:name,phone,address,deliveryMethod:dm,paymentMethod:payment,items:cart,total:j.total,status:'جديد',createdAt:new Date().toISOString()});
save('nexo_orders',orders);
let m=`🛒 *طلب جديد - NEXO STORE*\n\nرقم الطلب: ${j.order_id}\n\n👤 الاسم: ${name}\n📱 الجوال: ${phone}\n\n📦 المنتجات:\n${items}\n`;
m+=j.discount>0?`💰 المجموع الأصلي: ${j.subtotal} ريال\n🏷 الخصم (${COUPON_CODE}): ${j.discount} ريال\n💵 بعد الخصم: ${j.products_total} ريال\n`:`💰 مجموع المنتجات: ${j.products_total} ريال\n`;
m+=`🚚 رسوم التوصيل: ${j.delivery_fee} ريال\n💳 طريقة الدفع: ${payment}\n📦 طريقة الاستلام: ${dm}\n\n💵 *الإجمالي النهائي: ${j.total} ريال*\n`;
if(deliveryMethod==='delivery')m+=`\n📍 العنوان:\n${address}`;
const url='https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(m);
cart=[];couponApplied=false;$('couponInput').value='';
saveCart();renderProducts();closeModal('orderModal');
if(!window.open(url,'_blank'))location.href=url;
}catch(e){alert(e.message||'تعذر إرسال الطلب')}
finally{btn.disabled=false;btn.textContent='تأكيد الطلب عبر واتساب'}
};

/* كودات الخصم من قاعدة البيانات */
window.applyCoupon=async function(){
const code=$('couponInput').value.trim();
let rate=null;
if(code){try{const r=await fetch(U+'/rest/v1/rpc/validate_coupon',{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({p_code:code})});rate=await r.json()}catch(e){}}
if(rate>0){COUPON_RATE=+rate;COUPON_CODE=code.toUpperCase();couponApplied=true}else couponApplied=false;
renderCart();renderProducts();
if(currentProduct){
$('detailOldPrice').textContent=couponApplied?currentProduct.oldPrice+' ريال':'';
$('detailOldPrice').style.display=couponApplied?'block':'none';
$('detailPrice').textContent=unitPrice(currentProduct)+' ريال';
}
if(!couponApplied){const m=$('couponMessage');m.className='couponMessage error';m.textContent='✕ رمز الخصم غير صحيح'}
};
const _rc=renderCart;
window.renderCart=function(){_rc();if(couponApplied){$('couponMessage').textContent='✓ تم تطبيق خصم '+Math.round(COUPON_RATE*100)+'% من السعر الأصلي'}};
const _sum=summaryHTML;
window.summaryHTML=(d,f)=>_sum(d,f).replace('الخصم 50%','الخصم '+Math.round(COUPON_RATE*100)+'%');

/* تحميل البيانات */
try{
const[ps,cs,ads]=await Promise.all([get('products?select=*&order=sort'),get('categories?select=*&order=sort'),get('ads?select=*&order=sort')]);

products.splice(0,products.length,...ps.map(p=>({id:p.id,name:p.name,oldPrice:+p.old_price,price:+p.price,category:p.category,image:img(p.image),desc:p.description||'',stock:p.stock})));

CAT_LIST.splice(0,CAT_LIST.length,['الكل','icon-192.png'],...cs.map(c=>[c.name,img(c.image)]));
document.querySelector('.categories').innerHTML=CAT_LIST.map(([n,im],i)=>`<button class="category${i?'':' active'}" onclick="selectCategory('${esc(n)}',this)"><img class="catImg" src="${esc(im)}" alt=""><span>${esc(n)}</span></button>`).join('');
category='الكل';
buildCats();renderProducts();refreshFav();

/* الإعلانات */
const hb=ads.filter(a=>a.placement==='home_banner');
if(hb.length){
const old=$('adSlides'),box=old.cloneNode(false);old.replaceWith(box);
const dots=$('adDots');
box.innerHTML=hb.map(a=>{
const link=a.button_link&&/^https?:\/\//.test(a.button_link)?a.button_link:'';
if(a.image_url)return `<div class="adSlide" style="padding:0">${link?`<a href="${esc(link)}" style="display:block;width:100%;height:100%"><img src="${esc(a.image_url)}" alt=""></a>`:`<img src="${esc(a.image_url)}" alt="">`}</div>`;
return `<div class="adSlide" style="background:${esc(a.bg||'linear-gradient(135deg,#0876d9,#00c6ff)')}"><b>${esc(a.title)}</b><span>${esc(a.subtitle)}</span>${link&&a.button_text?`<a href="${esc(link)}" style="margin-top:10px;background:#fff;color:#0876d9;border-radius:12px;padding:8px 18px;font-weight:800;text-decoration:none">${esc(a.button_text)}</a>`:''}</div>`}).join('');
dots.innerHTML=hb.map(()=>'<i></i>').join('');
const slides=[...box.children],dd=[...dots.children];
let cur=0;
const mark=i=>{cur=i;dd.forEach((d,k)=>d.classList.toggle('on',k===i))};
mark(0);
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>.6)mark(slides.indexOf(e.target))}),{root:box,threshold:[.6]});
slides.forEach(x=>io.observe(x));
if(slides.length>1)setInterval(()=>{
const r=box.getBoundingClientRect();
if(r.bottom<0||r.top>innerHeight)return;
slides[(cur+1)%slides.length].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
},4000);
}

const ap=ads.filter(a=>a.placement==='above_products');
if(ap.length){
const s=document.createElement('div');
s.style.cssText='display:flex;gap:10px;overflow-x:auto;margin-bottom:14px;scrollbar-width:none';
s.innerHTML=ap.map(a=>{
const link=a.button_link&&/^https?:\/\//.test(a.button_link)?a.button_link:'';
const inner=a.image_url?`<img src="${esc(a.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`:`<div style="background:${esc(a.bg||'#0876d9')};color:#fff;border-radius:16px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;text-align:center"><b>${esc(a.title)}</b><span style="font-size:13px">${esc(a.subtitle)}</span></div>`;
return `<${link?`a href="${esc(link)}"`:'div'} style="flex:0 0 85%;height:120px;display:block;text-decoration:none">${inner}</${link?'a':'div'}>`}).join('');
$('products').before(s);
}
}catch(e){console.error('Supabase:',e)}

/* رسوم التوصيل وحد التوصيل المجاني من الإعدادات */
try{
const[s]=await get('settings?select=*&id=eq.1');
if(s){DELIVERY_FEE=+s.delivery_fee;FREE_SHIPPING_LIMIT=+s.free_shipping_limit;updateCartNumber()}
}catch(e){console.error('settings:',e)}
})();

