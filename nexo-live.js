
/* صفحة الحساب */
const st=document.createElement('style');
st.textContent=`
.accTabs{display:flex;gap:8px;margin-bottom:14px}
.accTabs button{flex:1;height:46px;border:2px solid #e0e3e7;background:#fff;border-radius:14px;font-weight:800;color:#555}
.accTabs button.on{border-color:var(--b);background:#edf6ff;color:var(--b)}
.accMsg{margin-top:10px;font-weight:800;font-size:14px;line-height:1.8;overflow-wrap:anywhere}
`;
document.head.appendChild(st);

const ICON_USER='<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

const ap=document.createElement('div');
ap.className='fullPage';
ap.id='accPage';
ap.innerHTML='<div class="pageHeader"><button class="pageBack" onclick="closePage(\'accPage\')">←</button>👤 حسابي</div><div class="pageContent" id="accBody"></div>';
document.body.appendChild(ap);

let mode='in';

const nb=document.createElement('button');
nb.innerHTML=ICON_USER+'حسابي';
nb.onclick=window.openAcc;
document.querySelector('.bottomNav').appendChild(nb);

const hb0=document.createElement('button');
hb0.className='hBtn';
hb0.setAttribute('aria-label','تسجيل الدخول');
hb0.innerHTML=ICON_USER;
hb0.onclick=window.openAcc;
document.querySelector('.hRow').appendChild(hb0);

function updateAccountButtons(signedIn){
 hb0.style.display=signedIn?'none':'';
 nb.style.display='';
}

window.openAcc=async()=>{
 await renderAcc();
 openPage('accPage');
};

window.accMode=m=>{
 mode=m;
 renderAcc();
};

async function renderAcc(){
 const b=$('accBody');
 const sb=await libReady;

 if(!sb){
  updateAccountButtons(false);
  b.innerHTML='<div class="card">تعذر تحميل خدمة الحساب. تحقق من الإنترنت ثم حدّث الصفحة.</div>';
  return;
 }

 try{
  const{data:{session},error}=await sb.auth.getSession();
  if(error)throw error;

  updateAccountButtons(!!session);

  /* المستخدم غير مسجل الدخول */
  if(!session){
   b.innerHTML=`
   <div class="card">
    <div class="accTabs">
     <button class="${mode==='in'?'on':''}" onclick="accMode('in')">تسجيل الدخول</button>
     <button class="${mode==='up'?'on':''}" onclick="accMode('up')">حساب جديد</button>
    </div>

    <div class="formGroup">
     <label>البريد الإلكتروني</label>
     <input id="accEm" type="email" autocomplete="email"
       placeholder="example@email.com"
       style="direction:ltr;text-align:left">
    </div>

    <div class="formGroup">
     <label>كلمة المرور</label>
     <input id="accPw" type="password"
       autocomplete="${mode==='in'?'current-password':'new-password'}"
       placeholder="6 أحرف على الأقل">
    </div>

    ${mode==='up'?`
    <div class="formGroup">
     <label>تأكيد كلمة المرور</label>
     <input id="accPw2" type="password"
       autocomplete="new-password"
       placeholder="أعد كتابة كلمة المرور">
    </div>`:''}

    <button class="checkout" id="accSubmit"
      style="margin-top:0" onclick="accGo()">
      ${mode==='in'?'تسجيل الدخول':'إنشاء الحساب'}
    </button>

    <div id="accMsg" class="accMsg" role="status"></div>
   </div>`;
   return;
  }

  /* المستخدم مسجل الدخول: عرض الحساب فقط */
  const u=session.user;

  const[pr,orders]=await Promise.all([
   sb.from('profiles').select('*').eq('id',u.id).maybeSingle(),
   sb.from('orders').select('id,total,status,created_at')
     .order('created_at',{ascending:false}).limit(20)
  ]);

  const p=pr.error?null:pr.data;
  const os=orders.error?[]:(orders.data||[]);

  b.innerHTML=`
  <div class="card">
   <h3>👤 بيانات حسابي</h3>
   <div style="direction:ltr;text-align:left;overflow-wrap:anywhere;margin:10px 0">
    ${esc(u.email)}
   </div>

   ${pr.error?`<div class="accMsg error">تعذر تحميل الملف الشخصي: ${esc(pr.error.message)}</div>`:''}

   <div class="formGroup">
    <label>الاسم</label>
    <input id="accName" value="${esc(p?.name||'')}">
   </div>

   <div class="formGroup">
    <label>رقم الجوال</label>
    <input id="accPhone" type="tel" value="${esc(p?.phone||'')}">
   </div>

   <div class="formGroup">
    <label>العنوان</label>
    <textarea id="accAddr">${esc(p?.address||'')}</textarea>
   </div>

   <button class="checkout" style="margin-top:0" onclick="accSave()">حفظ بياناتي</button>
   <div id="accMsg" class="accMsg" role="status"></div>
  </div>

  <div class="card">
   <h3>📦 طلباتي</h3>
   ${orders.error?`<div class="accMsg error">تعذر تحميل الطلبات: ${esc(orders.error.message)}</div>`:''}
   ${os.map(o=>`
    <div class="ordItem">
     <b>${esc(o.id)}</b> — ${esc(o.total)} ريال<br>
     ${esc(o.status||'جديد')} •
     ${o.created_at?new Date(o.created_at).toLocaleDateString('ar-SA'):''}
    </div>
   `).join('')||(!orders.error?'<div class="empty" style="padding:14px">لا توجد طلبات بعد</div>':'')}
  </div>

  <button class="checkout" style="background:#c62828" onclick="accOut()">تسجيل الخروج</button>
  `;

 }catch(e){
  console.error('renderAcc:',e);
  b.innerHTML='<div class="card"><div class="accMsg error">تعذر فتح الحساب: '+esc(e.message||'خطأ غير معروف')+'</div><button class="checkout" onclick="renderAcc()">إعادة المحاولة</button></div>';
 }
}

/* تسجيل الدخول وإنشاء الحساب */
window.accGo=async()=>{
 const sb=await libReady;
 const email=$('accEm')?.value.trim();
 const password=$('accPw')?.value;
 const password2=$('accPw2')?.value;
 const m=$('accMsg');
 const btn=$('accSubmit');

 if(!sb){
  m.textContent='تعذر تحميل خدمة الحساب. تحقق من الإنترنت.';
  m.className='accMsg error';
  return;
 }

 if(!email||!password){
  m.textContent='أدخل البريد الإلكتروني وكلمة المرور.';
  m.className='accMsg error';
  return;
 }

 if(password.length<6){
  m.textContent='كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  m.className='accMsg error';
  return;
 }

 if(mode==='up'&&password!==password2){
  m.textContent='كلمتا المرور غير متطابقتين. أعد كتابتهما.';
  m.className='accMsg error';
  return;
 }

 btn.disabled=true;
 btn.textContent='جارٍ التنفيذ...';
 m.textContent='';

 try{
  if(mode==='in'){
   const{data,error}=await sb.auth.signInWithPassword({email,password});
   if(error)throw error;
   if(!data.session)throw new Error('لم يتم إنشاء جلسة دخول.');
  }else{
   const{data,error}=await sb.auth.signUp({email,password});
   if(error)throw error;

   if(!data.session){
    m.className='accMsg success';
    m.textContent='تم إنشاء الحساب، لكن يلزم تأكيد البريد الإلكتروني. افتح بريدك واضغط رابط التأكيد، ثم ارجع وسجّل الدخول.';
    return;
   }
  }

  mode='in';
  updateAccountButtons(true);
  await renderAcc();

 }catch(e){
  console.error('Supabase Auth:',e);
  m.className='accMsg error';
  m.textContent='تعذر إكمال العملية: '+(e.message||'خطأ غير معروف');
 }finally{
  const currentBtn=$('accSubmit');
  if(currentBtn){
   currentBtn.disabled=false;
   currentBtn.textContent=mode==='in'?'تسجيل الدخول':'إنشاء الحساب';
  }
 }
};

/* حفظ بيانات الحساب */
window.accSave=async()=>{
 const sb=await libReady;
 const m=$('accMsg');

 try{
  const{data:{session},error:authError}=await sb.auth.getSession();
  if(authError)throw authError;

  if(!session){
   updateAccountButtons(false);
   throw new Error('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');
  }

  const{error}=await sb.from('profiles').upsert({
   id:session.user.id,
   name:$('accName').value.trim(),
   phone:$('accPhone').value.trim(),
   address:$('accAddr').value.trim(),
   updated_at:new Date().toISOString()
  });

  if(error)throw error;

  m.className='accMsg success';
  m.textContent='تم حفظ بياناتك بنجاح ✓';

 }catch(e){
  console.error('accSave:',e);
  m.className='accMsg error';
  m.textContent='تعذر الحفظ: '+(e.message||'خطأ غير معروف');
 }
};

/* تسجيل الخروج */
window.accOut=async()=>{
 const sb=await libReady;

 try{
  const{error}=await sb.auth.signOut();
  if(error)throw error;

  mode='in';
  updateAccountButtons(false);
  await renderAcc();

 }catch(e){
  alert('تعذر تسجيل الخروج: '+(e.message||'خطأ غير معروف'));
 }
};

/* تحديث شكل الأزرار عند تغير حالة الدخول */
(async()=>{
 const sb=await libReady;
 if(!sb)return;

 const{data:{session}}=await sb.auth.getSession();
 updateAccountButtons(!!session);

 sb.auth.onAuthStateChange((event,session)=>{
  updateAccountButtons(!!session);
 });
})();




