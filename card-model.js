"use strict";
(() => {
  const colors=Object.freeze({green:"綠色",yellow:"黃色",orange:"橙色",red:"紅色",purple:"紫色",blue:"藍色",gray:"灰色"});
  const covers=Object.freeze(["wine","ocean","forest","sunset","lavender","slate"]);
  const FILE_LIMIT=750*1024, TOTAL_LIMIT=2*1024*1024;
  const defaults=()=>({labels:[],members:[],checklists:[],comments:[],attachments:[],cover:null,startDate:"",dueTime:""});
  const get=task=>({...defaults(),...task.card});
  const ensure=task=>(task.card=get(task));
  const safeURL=value=>{try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
  const dateOK=s=>s===""||/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+"T12:00:00Z").toISOString().slice(0,10)===s;
  const text=(v,max,required=false)=>typeof v==="string"&&v.length<=max&&(!required||!!v.trim());
  function collection(items,label){
    if(!Array.isArray(items))throw Error(`${label}格式不符，已保留原內容。`);
    const ids=new Set();for(const x of items){if(!x||!text(x.id,100,true)||ids.has(x.id))throw Error(`${label}識別資料不完整。`);ids.add(x.id);}
  }
  function validate(task){
    if(task.card===undefined)return;
    if(!task.card||Array.isArray(task.card)||typeof task.card!=="object")throw Error("卡片內容格式不符。");
    const c=get(task);
    for(const k of ["labels","members","checklists","comments","attachments"])collection(c[k],"卡片"+k);
    for(const l of c.labels)if(!text(l.name,80)||!Object.hasOwn(colors,l.color))throw Error("標籤內容不完整。");
    for(const m of c.members)if(!text(m.name,80,true))throw Error("卡片成員內容不完整。");
    for(const l of c.checklists){if(!text(l.title,160,true))throw Error("待辦清單需要名稱。");collection(l.items,"待辦項目");for(const i of l.items)if(!text(i.text,500,true)||typeof i.done!=="boolean")throw Error("待辦項目格式不符。");}
    for(const m of c.comments)if(!text(m.text,8000,true)||!text(m.author,80,true)||!text(m.createdAt,50,true))throw Error("留言內容不完整。");
    for(const a of c.attachments){
      if(!text(a.name,200,true)||!["link","file"].includes(a.kind))throw Error("附件內容不完整。");
      if(a.kind==="link"&&!safeURL(a.url))throw Error("附件連結只接受不含帳密的 http／https 網址。");
      if(a.kind==="file"){
        if(!Number.isSafeInteger(a.size)||a.size<0||a.size>FILE_LIMIT||!text(a.mime,120,true)||!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(a.mime)||typeof a.data!=="string")throw Error("附件檔案格式或大小不符。");
        const prefix=`data:${a.mime};base64,`;if(!a.data.startsWith(prefix))throw Error("附件編碼不符。");
        const encoded=a.data.slice(prefix.length);if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)||encoded.length/4*3-(encoded.endsWith("==")?2:encoded.endsWith("=")?1:0)!==a.size)throw Error("附件內容不完整。");
      }
    }
    if(!dateOK(c.startDate)||!text(c.dueTime,5)||c.dueTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.dueTime))throw Error("卡片日期或時間格式不符。");
    if(c.cover!==null){if(!c.cover||!(c.cover.type==="color"&&covers.includes(c.cover.value)||c.cover.type==="attachment"&&c.attachments.some(a=>a.id===c.cover.id&&isImage(a))))throw Error("卡片封面來源不符。");}
  }
  const isImage=a=>a?.kind==="file"&&["image/png","image/jpeg","image/gif","image/webp"].includes(a.mime);
  const progress=c=>{const items=c.checklists.flatMap(l=>l.items);return {done:items.filter(i=>i.done).length,total:items.length};};
  function validateAll(data){let total=0;for(const t of data.tasks){validate(t);total+=get(t).attachments.filter(a=>a.kind==="file").reduce((n,a)=>n+a.size,0);}if(total>TOTAL_LIMIT)throw Error("本機附件合計上限為 2 MB，請改附檔案連結。");}
  window.ChairCardModel=Object.freeze({colors,covers,FILE_LIMIT,TOTAL_LIMIT,get,ensure,validate,validateAll,safeURL,isImage,progress});
})();
