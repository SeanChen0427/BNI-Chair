"use strict";
(() => {
 const MIGRATED='fulian-chair-legacy-migrated-v1';
 const CACHE='fulian-chair-cloud-cache-v1',PENDING='fulian-chair-cloud-pending-v1',LEGACY='fulian-chair-rebuild-dashboard-v1';
 const collections=['meetings','tasks','boards','workUnits','messages','links'];
 const settings=['termGoals','preMeetingSchedule'];
 const readKey=()=> 'fulian-chair-cloud-read-v1:'+encodeURIComponent(ChairAuth.identity()?.identity||'');
 function readPreference(){try{const v=JSON.parse(localStorage.getItem(readKey())||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch{return [];}}
 let current=null,busy=false,ready=false,dbPromise;
 const stable=v=>JSON.stringify(canonical(v));
 function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
 function entities(d){const rows=new Map();for(const kind of collections)(d[kind]||[]).forEach((value,position)=>rows.set(kind+':'+value.id,{kind,id:value.id,value,position}));for(const id of settings)if(d[id]!==undefined)rows.set('settings:'+id,{kind:'settings',id,value:{value:d[id]},position:0});return rows;}
 function diff(a,b){const before=entities(a),after=entities(b),changes=[];for(const [key,row]of after)if(stable(before.get(key))!==stable(row))changes.push(row);for(const [key,row]of before)if(!after.has(key))changes.push({kind:row.kind,id:row.id,value:null});return changes;}
 async function hash(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 async function decode(receipt){if(typeof receipt?.stateText!=='string'||await hash(receipt.stateText)!==receipt.sha256)throw Error('雲端資料校驗失敗，已保留原內容。');const state=ChairData.parse(receipt.stateText);if(state.revision!==receipt.revision)throw Error('雲端版本不符。');return state;}
 function database(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const q=indexedDB.open('fulian-chair-versions-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('versions',{keyPath:'revision'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});return dbPromise;}
 async function mirror(receipt){const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('versions','readwrite');tx.objectStore('versions').put(receipt);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 function status(text,error=false){const el=document.getElementById('cloudStatus');if(el){el.textContent=text;el.classList.toggle('error',error);}}
 async function accept(receipt){const state=await decode(receipt);current={...state,read:readPreference()};let warning=false;try{await mirror(receipt);localStorage.setItem(CACHE,JSON.stringify(receipt));}catch{warning=true;}status(warning?'已存雲端；此裝置副本保存失敗，請匯出備份。':'已連線 · 雲端版本 '+state.revision,warning);return read();}
 async function send(body){try{return await ChairAuth.rpc(body);}catch(e){if(e.status)throw e;return ChairAuth.rpc(body);}}
 async function init(){
  const legacy=ChairData.parse(localStorage.getItem(LEGACY));
  let receipt=await ChairAuth.rpc({p_action:'read'});const remote=await decode(receipt);
  const legacyHash=await hash(stable([...entities(legacy).values()]));
  if(remote.revision>0&&entities(legacy).size&&localStorage.getItem(MIGRATED)!==legacyHash){
   let matched=!diff(legacy,remote).length;
   if(!matched){const initial=await decode(await ChairAuth.rpc({p_action:'version',p_version:1}));matched=!diff(legacy,initial).length;}
   if(!matched)throw Error('此瀏覽器還有未遷移的本機內容。請先匯出原本機備份核對，雲端內容未被覆蓋。');
   localStorage.setItem(MIGRATED,legacyHash);
  }
  // Preserve legacy bytes permanently; never replace a populated server from local storage.
  const pendingRaw=localStorage.getItem(PENDING);
  if(pendingRaw){const pending=JSON.parse(pendingRaw);try{receipt=await send(pending);localStorage.removeItem(PENDING);}catch(e){status('有未完成的雲端儲存，請先匯出待送內容後核對。',true);throw e;}}
  else if(remote.revision===0&&diff(ChairData.empty(),legacy).length){
   localStorage.setItem('fulian-chair-before-cloud-v1',localStorage.getItem(LEGACY));
   const body={p_action:'save',p_expected:0,p_changes:diff(ChairData.empty(),legacy),p_request:crypto.randomUUID(),p_identity:ChairAuth.identity().identity};
   localStorage.setItem(PENDING,JSON.stringify(body));receipt=await send(body);localStorage.removeItem(PENDING);
  }
  localStorage.setItem(MIGRATED,legacyHash);
  receipt=await ChairAuth.rpc({p_action:'read'});await accept(receipt);ready=true;return read();
 }
 function read(){return structuredClone(current);}
 async function save(old,next){
  if(busy)throw Error('正在儲存，請稍候。');
  if(localStorage.getItem(PENDING))throw Error('上次儲存尚待核對。請匯出待送內容後，按「重新讀取雲端」確認。');
  if(old.revision!==current.revision)throw Error('資料已更新，請先核對目前輸入。');
  const changes=diff(old,next);if(!changes.length){current.read=next.read||current.read;localStorage.setItem(readKey(),JSON.stringify(current.read));return read();}
  const body={p_action:'save',p_expected:old.revision,p_changes:changes,p_request:crypto.randomUUID(),p_identity:ChairAuth.identity().identity};
  localStorage.setItem(PENDING,JSON.stringify(body));busy=true;status('正在儲存至雲端…');
  try{const receipt=await send(body);const result=await accept(receipt);localStorage.removeItem(PENDING);return result;}
  catch(e){if(e.status&&e.code!=='VERSION_CONFLICT')localStorage.removeItem(PENDING);status(e.message||'網路中斷，草稿仍保留，尚未確認雲端儲存。',true);throw e;}
  finally{busy=false;}
 }
 async function refresh(){if(busy)return read();const pending=localStorage.getItem(PENDING);if(pending){try{await accept(await send(JSON.parse(pending)));localStorage.removeItem(PENDING);}catch(e){if(e.code==='VERSION_CONFLICT'){localStorage.setItem(PENDING+'-conflict-'+Date.now(),pending);localStorage.removeItem(PENDING);}else throw e;}}return accept(await ChairAuth.rpc({p_action:'read'}));}
 async function poll(){if(busy||localStorage.getItem(PENDING))return null;const receipt=await ChairAuth.rpc({p_action:'read'});if(receipt.revision>current.revision)return accept(receipt);return null;}
 async function history(){return ChairAuth.rpc({p_action:'history'});}
 async function version(revision){const receipt=await ChairAuth.rpc({p_action:'version',p_version:revision});await decode(receipt);await mirror(receipt);return receipt;}
 async function restore(receipt,expected){if(busy||localStorage.getItem(PENDING))throw Error('請先完成待送儲存。');const target=await decode(receipt);const body={p_action:'restore',p_expected:expected,p_changes:diff(current,target),p_request:crypto.randomUUID(),p_identity:ChairAuth.identity().identity};if(!body.p_changes.length)return read();localStorage.setItem(PENDING,JSON.stringify(body));busy=true;try{const result=await accept(await send(body));localStorage.removeItem(PENDING);return result;}finally{busy=false;}}
 window.ChairCloud={get ready(){return ready;},get busy(){return busy;},init,read,save,refresh,poll,history,version,restore,diff,decode,hash,status,PENDING};
})();
