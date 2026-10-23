/* NEXO STORE - nexo-live.js : Supabase connector + order tracking chat (single file) */
/* NEXO STORE <-> Supabase connector. Load after the main store script. */
let sb,appliedCode="";
(function(){
const U="https://hmvjxesfgfjjhangyorq.supabase.co",K="sb_publishable_SZdbk--nDfsTzqlARh3IcA_ZnGm1QPL";
const s=document.createElement("script");
s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
s.onload=()=>init(U,K);
document.head.appendChild(s);
})();

async function init(U,K){
sb=supabase.createClient(U,K);
const base=products.map((p,i)=>({id:p.id,name:p.name,description:p.desc,category:p.category,price:p.price,old_price:p.oldPrice,image_url:p.image,sort:i}));
if(location.hash==="#import-products"){
const{error}=await sb.from("nexo_products").upsert(base);
alert(error?"فشل الاستيراد: "+error.message:"تم استيراد "+base.length+" منتج ✅ أعد تحميل الصفحة");
}
try{
const{data:pr}=await sb.from("nexo_products").select("*").eq("active",true).order("sort");
if(pr&&pr.length){
products.length=0;
pr.forEach(p=>products.push({id:p.id,name:p.name,oldPrice:Number(p.old_price)||Number(p.price),price:Number(p.price),category:p.category,image:p.image_url,desc:p.description||""}));
cart=cart.filter(i=>byId(i.id));favs=favs.filter(id=>byId(id));
saveCart();refreshFav();buildCats();renderCart();
}
}catch(e){console.error(e)}
try{
const{data:ad}=await sb.from("nexo_ads").select("*").eq("active",true).order("sort");
if(ad&&ad.length){
ADS.length=0;
ad.forEach(a=>ADS.push({title:a.title,sub:a.subtitle,bg:a.image_url?`url('${a.image_url}') center/cover`:a.bg}));
initAds();
}
}catch(e){console.error(e)}
try{
const{data:st}=await sb.from("nexo_settings").select("*");
const S={};(st||[]).forEach(r=>S[r.key]=r.value);
try{if(S.whatsapp)WHATSAPP=String(S.whatsapp)}catch(e){}
try{if(S.delivery_fee!=null)DELIVERY_FEE=Number(S.delivery_fee)}catch(e){}
try{if(S.free_shipping_limit!=null)FREE_SHIPPING_LIMIT=Number(S.free_shipping_limit)}catch(e){}
if(S.delivery_banner)document.querySelector(".deliveryBanner").textContent=S.delivery_banner;
}catch(e){console.error("settings:",e)}
const b=document.querySelector(".deliveryBanner");
if(b&&!document.getElementById("trackBtn")){
b.insertAdjacentHTML("afterend",'<button id="trackBtn" class="checkout" style="height:46px;margin:0 0 14px" onclick="trackOrder()">📦 تتبّع طلبي أو إلغاؤه</button>');
}
}

window.applyCoupon=async function(){
const code=$("couponInput").value.trim();
let rate=null;
if(code&&sb){try{const{data}=await sb.rpc("nexo_check_coupon",{p_code:code});rate=data}catch(e){}}
couponApplied=Number(rate)>0;
if(couponApplied){try{COUPON_RATE=Number(rate)}catch(e){}appliedCode=code}
renderCart();renderProducts();renderFavs();
if(currentProduct){const p=currentProduct,old=couponApplied?p.price:(p.oldPrice>p.price?p.oldPrice:0);
$("detailOldPrice").textContent=old?money(old)+" ريال":"";$("detailOldPrice").style.display=old?"block":"none";
$("detailPrice").textContent=money(unitPrice(p))+" ريال"}
if(!couponApplied){const m=$("couponMessage");m.className="couponMessage error";m.textContent="✕ رمز الخصم غير صحيح"}
};

/* product card: with a coupon, show the price before the coupon struck through + the new price */
window.card=function(p,fav=false){
const old=couponApplied?p.price:(p.oldPrice>p.price?p.oldPrice:0);
return `<div class="product" ${fav?"":`onclick="openProduct('${p.id}')"`}>
<button class="heart ${favs.includes(p.id)?"on":""}" onclick="event.stopPropagation();toggleFav('${p.id}')">${HEART}</button>
<img class="productImg" src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.style.opacity='.25'">
<div class="productBody">
<div class="productName">${escapeHTML(p.name)}</div>
<div class="productDescription">${escapeHTML(p.desc)}</div>
${old?`<div class="oldPrice">${money(old)} ريال</div>`:""}
<div class="price">${money(unitPrice(p))} ريال</div>
<button class="addButton" onclick="event.stopPropagation();addToCart('${p.id}')">أضف للسلة</button>
</div></div>`};

const _sendMsg=window.sendMsg;
window.sendMsg=function(){
const name=$("msgName").value.trim(),text=$("msgText").value.trim();
if(name&&text&&sb)sb.from("nexo_messages").insert({name,topic:msgTopic,body:text}).then(()=>{});
_sendMsg();
};

window.sendOrder=async function(){
const name=$("name").value.trim(),phone=$("phone").value.trim(),address=$("address").value.trim(),payment=$("payment").value;
if(!name){alert("اكتب اسمك");return}
if(!phone){alert("اكتب رقم الجوال");return}
if(!/^[+\d\s()-]{8,20}$/.test(phone)){alert("تحقق من رقم الجوال");return}
if(deliveryMethod==="delivery"&&!address){alert("اكتب عنوان التوصيل");return}
if(!cart.length){alert("السلة فارغة");closeModal("orderModal");return}
let r;
try{
const{data,error}=await sb.rpc("nexo_create_order",{p_name:name,p_phone:phone,p_address:address,p_delivery:deliveryMethod,p_payment:payment,p_items:cart.map(i=>({id:i.id,qty:i.qty})),p_coupon:couponApplied?appliedCode:null});
if(error)throw error;
r=data;
}catch(e){alert("تعذر إرسال الطلب، حاول مرة أخرى");console.error(e);return}
const d=calculate();
let items="";
cart.forEach(i=>{const p=byId(i.id);if(p)items+=`• ${p.name} × ${i.qty}\n`});
const dm=deliveryMethod==="delivery"?"توصيل داخل مكة":"استلام من الفرع";
const orders=load("nexo_orders","[]");
orders.push({orderId:r.order_no,total:r.total,deliveryMethod:dm,paymentMethod:payment,createdAt:new Date().toISOString()});
save("nexo_orders",orders);
let msg=`🛒 *طلب جديد - NEXO STORE*\n\nرقم الطلب: ${r.order_no}\n\n👤 الاسم: ${name}\n📱 الجوال: ${phone}\n\n📦 المنتجات:\n${items}`;
msg+=`🚚 رسوم التوصيل: ${money(d.delivery)} ريال\n💳 طريقة الدفع: ${payment}\n📦 طريقة الاستلام: ${dm}\n\n💵 *الإجمالي النهائي: ${money(Number(r.total))} ريال*\n`;
if(deliveryMethod==="delivery")msg+=`\n📍 العنوان:\n${address}`;
const url="https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(msg);
cart=[];couponApplied=false;appliedCode="";
$("couponInput").value="";
saveCart();renderProducts();closeModal("orderModal");
window.open(url,"_blank");
save("nexo_last",{no:r.order_no,phone});
alert("تم تسجيل طلبك ✅\nرقم الطلب: "+r.order_no+"\nاحتفظ به لتتبع الطلب أو إلغائه.\nأرسل الرسالة في واتساب لإكمال الطلب.");
};

/* NEXO STORE: order tracking + chat with the store (loaded by nexo-cloud.js) */
(function(){
const css=`#nx{position:fixed;inset:0;z-index:400;background:#f5f7fa;display:none;flex-direction:column;font-family:Cairo,sans-serif}
#nx.on{display:flex}.nh{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);font-size:18px}
.nh button{width:44px;height:44px;border:0;border-radius:14px;background:#f1f3f5;font-size:24px}
#nb{flex:1;display:flex;flex-direction:column;min-height:0;padding:12px}
.nc{background:#fff;border-radius:18px;padding:14px;box-shadow:0 3px 14px rgba(0,0,0,.05);line-height:1.9}
.nc input{width:100%;height:48px;border:1px solid #d7dce2;border-radius:13px;padding:0 12px;font-size:16px;margin:4px 0 10px}
.nc button,.ni button{border:0;border-radius:13px;background:#0876d9;color:#fff;font-weight:800;font-size:16px;padding:0 18px;height:48px}
.nc button.nd{background:#fdecee;color:#e53950;height:42px;margin-top:8px}
.ns{border-radius:10px;padding:2px 12px;font-weight:800;font-size:14px;color:#fff}
.nm{flex:1;overflow-y:auto;display:flex;flex-direction:column;padding:10px 2px}
.nm p{text-align:center;color:#778}.nbb{max-width:80%;padding:8px 12px;border-radius:16px;margin:4px 0;line-height:1.7;overflow-wrap:anywhere}
.nbb small{display:block;color:#889;font-size:11px}.nbb.me{background:#0876d9;color:#fff;align-self:flex-start}.nbb.me small{color:#d6e9ff}
.nbb.ad{background:#fff;align-self:flex-end;box-shadow:0 1px 6px rgba(0,0,0,.08)}
.ni{display:flex;gap:8px;padding-top:8px;padding-bottom:env(safe-area-inset-bottom,0px)}.ni input{flex:1;height:48px;border:1px solid #d7dce2;border-radius:13px;padding:0 12px;font-size:16px}`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
const el=document.createElement("div");el.id="nx";
el.innerHTML='<div class="nh"><button onclick="nxClose()">←</button><b>📦 تتبّع طلبي</b></div><div id="nb"></div>';
document.body.appendChild(el);
const COL={"جديد":"#0876d9","قيد التجهيز":"#f5a623","تم التوصيل":"#1f9d55","ملغي":"#e53950"};
let cur=null,tm=null,cnt=-1;
function form(no,ph){
$("nb").innerHTML='<div class="nc"><label><b>رقم الطلب</b></label><input id="nxn" dir="ltr" placeholder="NEXO-1001" value="'+escapeHTML(no)+'"><label><b>رقم الجوال</b></label><input id="nxp" type="tel" value="'+escapeHTML(ph)+'"><button style="width:100%" onclick="nxGo()">عرض طلبي</button></div>';
}
window.nxClose=()=>{el.classList.remove("on");clearInterval(tm);document.body.style.overflow=""};
window.trackOrder=()=>{
const l=load("nexo_last","{}");cur=null;form(l.no||"",l.phone||"");
el.classList.add("on");document.body.style.overflow="hidden";
if(l.no&&l.phone)nxLoad(l.no,l.phone);
};
window.nxGo=()=>nxLoad($("nxn").value.trim(),$("nxp").value.trim());
async function fetchChat(){
const{data}=await sb.rpc("nexo_order_chat",{p_no:cur.no,p_phone:cur.ph});
return data;
}
async function nxLoad(no,ph){
if(!no||!ph){alert("اكتب رقم الطلب ورقم الجوال");return}
cur={no,ph};
const d=await fetchChat();
if(!d){alert("ما لقينا الطلب، تأكد من رقم الطلب والجوال");cur=null;form(no,ph);return}
save("nexo_last",{no:d.order_no,phone:ph});
cur.no=d.order_no;cnt=-1;
$("nb").innerHTML='<div class="nc" id="nxo"></div><div class="nm" id="nxm"></div><div class="ni"><input id="nxt" placeholder="اسأل عن توصيل طلبك..." onkeydown="if(event.key===\'Enter\')nxSend()"><button onclick="nxSend()">إرسال</button></div>';
draw(d);
clearInterval(tm);tm=setInterval(async()=>{if(!cur)return;const x=await fetchChat();if(x)draw(x)},8000);
}
function draw(d){
$("nxo").innerHTML='<b>'+escapeHTML(d.order_no)+'</b> <span class="ns" style="background:'+(COL[d.status]||"#889")+'">'+escapeHTML(d.status)+'</span><br>'
+(d.items||[]).map(i=>"• "+escapeHTML(i.name)+" × "+i.qty).join("<br>")+'<br><b>الإجمالي: '+money(Number(d.total))+' ريال</b>'
+(d.status==="جديد"?'<br><button class="nd" onclick="nxCancel()">إلغاء الطلب</button>':'');
const m=d.messages||[];
if(m.length===cnt)return;cnt=m.length;
$("nxm").innerHTML=m.length?m.map(x=>'<div class="nbb '+(x.sender==="admin"?"ad":"me")+'">'+escapeHTML(x.body)+'<small>'+new Date(x.at).toLocaleString("ar-SA",{dateStyle:"short",timeStyle:"short"})+'</small></div>').join(""):'<p>اكتب استفسارك عن التوصيل وراح نرد عليك هنا 👇</p>';
const b=$("nxm");b.scrollTop=b.scrollHeight;
}
window.nxSend=async()=>{
const t=$("nxt").value.trim();if(!t||!cur)return;
const{data:ok}=await sb.rpc("nexo_order_say",{p_no:cur.no,p_phone:cur.ph,p_body:t});
if(!ok){alert("تعذر إرسال الرسالة");return}
$("nxt").value="";const d=await fetchChat();if(d)draw(d);
};
window.nxCancel=async()=>{
if(!confirm("متأكد تبغى تلغي الطلب؟"))return;
const{data:ok}=await sb.rpc("nexo_cancel_order",{p_no:cur.no,p_phone:cur.ph});
alert(ok?"تم إلغاء الطلب ✅":"تعذر الإلغاء، ممكن الطلب بدأ تجهيزه");
const d=await fetchChat();if(d)draw(d);
};
})();

/* back gesture closes the open panel (cart, favourites, order form...) instead of leaving the site */
(function(){
const O={closePage:window.closePage,closeModal:window.closeModal,nxClose:window.nxClose};
let busy=0,popping=0;
const top=()=>{
const nx=document.getElementById("nx");
if(nx&&nx.classList.contains("on"))return()=>O.nxClose();
if($("orderModal").classList.contains("show"))return()=>O.closeModal("orderModal");
for(const id of["cartPage","favPage","msgPage","calPage"])if($(id).classList.contains("show"))return()=>O.closePage(id);
return null};
["openPage","openCart","openOrder","trackOrder"].forEach(n=>{const f=window[n];
window[n]=function(){busy++;try{history.pushState({nxo:1},"");return f.apply(this,arguments)}finally{busy--}}});
["closePage","closeModal","nxClose"].forEach(n=>{const f=O[n];
window[n]=function(){f.apply(this,arguments);if(!busy&&!popping&&history.state&&history.state.nxo)history.back()}});
addEventListener("popstate",()=>{const c=top();if(c){popping=1;try{c()}finally{popping=0}}});
})();

