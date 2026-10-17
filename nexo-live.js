/* NEXO STORE - ربط المتجر بـ Supabase (مفتاح عام فقط) */
(async()=>{
const U='https://tycwaaqhpcvbgdqwzkgr.supabase.co',K='sb_publishable_BNl9LfB9ZhUAPWlH1IHsig_wT2Y7cop';
const H={apikey:K,Authorization:'Bearer '+K};
const get=async q=>{const r=await fetch(U+'/rest/v1/'+q,{headers:H});if(!r.ok)throw new Error(r.status);return r.json()};
const img=s=>s||'icon-192.png';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
const r=await fetch(U+'/rest/v1/rpc/create_order',{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify(body)});
const j=await r.json();
if(!r.ok)throw new Error(j.message||'تعذر إرسال الطلب');
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
})();
