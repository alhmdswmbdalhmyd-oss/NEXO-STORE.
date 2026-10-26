/* NEXO STORE - وضع التطبيق: منع النسخ والتحديد والزوم */
(function(){
"use strict";

/* 1) منع الزوم من الـ viewport */
var vp=document.querySelector('meta[name="viewport"]');
if(vp)vp.setAttribute("content","width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover");

/* 2) CSS */
var css=
"html,body{overscroll-behavior:none;touch-action:manipulation}"+
"body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}"+
"img,svg,a{-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none}"+
"img{pointer-events:none}"+
"input,textarea,select{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}"+
"button,.category,.catCard,.option,.chip,.product{-webkit-tap-highlight-color:transparent}"+
"input,textarea,select{font-size:16px}"+                 /* يمنع زوم iOS التلقائي عند الكتابة */
"::selection{background:transparent}"+
"input::selection,textarea::selection{background:rgba(8,118,217,.25)}"+
".pageContent,.modal,.fullPage,.productPage{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}";
var st=document.createElement("style");
st.textContent=css;
document.head.appendChild(st);

/* 3) أحداث المنع (الحقول مستثناة عشان الكتابة تشتغل) */
function isField(t){
  return t&&t.closest&&t.closest("input,textarea,select,[contenteditable='true']");
}
["contextmenu","dragstart","selectstart","copy","cut"].forEach(function(ev){
  document.addEventListener(ev,function(e){
    if(isField(e.target))return;
    e.preventDefault();
  },{capture:true});
});

/* 4) منع الزوم بالقرص (iOS) */
["gesturestart","gesturechange","gestureend"].forEach(function(ev){
  document.addEventListener(ev,function(e){e.preventDefault()},{passive:false});
});
document.addEventListener("touchmove",function(e){
  if(e.touches&&e.touches.length>1)e.preventDefault();
},{passive:false});

/* 5) منع الزوم بالضغط المزدوج */
var last=0;
document.addEventListener("touchend",function(e){
  var now=Date.now();
  if(now-last<=300&&!isField(e.target))e.preventDefault();
  last=now;
},{passive:false});

/* 6) منع الزوم بلوحة المفاتيح والعجلة (كمبيوتر) */
document.addEventListener("wheel",function(e){if(e.ctrlKey)e.preventDefault()},{passive:false});
document.addEventListener("keydown",function(e){
  if((e.ctrlKey||e.metaKey)&&["+","-","=","0"].indexOf(e.key)>-1)e.preventDefault();
});

/* 7) صور المنتجات غير قابلة للسحب */
function lock(root){
  (root||document).querySelectorAll("img").forEach(function(i){i.setAttribute("draggable","false")});
}
lock();
new MutationObserver(function(){lock()}).observe(document.body,{childList:true,subtree:true});
})();
