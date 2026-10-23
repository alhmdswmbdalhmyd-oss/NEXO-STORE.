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
if(S.whatsapp)WHATSAPP=String(S.whatsapp);
if(S.delivery_fee!=null)DELIVERY_FEE=Number(S.delivery_fee);
if(S.free_shipping_limit!=null)FREE_SHIPPING_LIMIT=Number(S.free_shipping_limit);
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
if(code&&sb){const{data}=await sb.rpc("nexo_check_coupon",{p_code:code});rate=data}
couponApplied=Number(rate)>0;
if(couponApplied){COUPON_RATE=Number(rate);appliedCode=code}
renderCart();renderProducts();
if(!couponApplied){const m=$("couponMessage");m.className="couponMessage error";m.textContent="✕ رمز الخصم غير صحيح"}
};

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
alert("تم تسجيل طلبك ✅\nرقم الطلب: "+r.order_no+"\nاحتفظ به لتتبع الطلب أو إلغائه.\nأرسل الرسالة في واتساب لإكمال الطلب.");
};

async function trackOrder(){
const no=prompt("رقم الطلب (مثال: NEXO-1001)");if(!no)return;
const ph=prompt("رقم الجوال المسجّل بالطلب");if(!ph)return;
const{data}=await sb.rpc("nexo_track_order",{p_no:no,p_phone:ph});
if(!data){alert("ما لقينا الطلب، تأكد من الرقم والجوال");return}
const m=`📦 ${data.order_no}\nالحالة: ${data.status}\nالإجمالي: ${data.total} ريال`;
if(data.status==="جديد"&&confirm(m+"\n\nتبغى تلغي الطلب؟")){
const{data:ok}=await sb.rpc("nexo_cancel_order",{p_no:no,p_phone:ph});
alert(ok?"تم إلغاء الطلب ✅":"تعذر الإلغاء");
}else alert(m);
}





