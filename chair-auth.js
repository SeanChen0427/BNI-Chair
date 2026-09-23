"use strict";
(() => {
  const url='https://fahrblkukuhgveiptufn.supabase.co';
  const key='sb_publishable_f5U5bDJjXjvRxYSzh7zqGQ__lF-jwPZ';
  const storageKey='fulian-chair-auth-v1';
  const accounts={chair:'fulian0857+chair@gmail.com',core:'fulian0857+core@gmail.com'};
  let session=null,refreshing=null,epoch=0;
  const headers=token=>({apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})});
  function clear(){epoch++;session=null;sessionStorage.removeItem(storageKey);}
  function persist(){sessionStorage.setItem(storageKey,JSON.stringify(session));}
  async function request(path,options={}){
    let response;
    try{response=await fetch(url+path,{...options,signal:AbortSignal.timeout(20000)});}catch{throw Error('連線失敗，請確認網路後重試。');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=Error(response.status===401?'帳號或密碼不正確，或登入已失效。':response.status===403?'此帳號尚未開通主席系統。':response.status===429?'嘗試次數過多，請稍後再試。':'服務暫時無法讀取，請稍後重試。');e.status=response.status;throw e;}
    return data;
  }
  async function token(){
    if(!session?.accessToken)throw Error('請先登入。');
    if(session.expiresAt>Date.now()+60000)return session.accessToken;
    if(!refreshing){const stamp=epoch;const refreshToken=session.refreshToken;
      refreshing=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:headers(),body:JSON.stringify({refresh_token:refreshToken})}).then(data=>{
        if(stamp!==epoch)throw Error('登入已變更，請重新登入。');
        session={...session,accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+data.expires_in*1000};persist();return session.accessToken;
      }).catch(e=>{if(stamp===epoch&&[400,401,403].includes(e.status))clear();throw e;}).finally(()=>{refreshing=null;});
    }return refreshing;
  }
  async function api(path){
    const access=await token();
    try{return await request('/functions/v1/chair-api/'+path,{headers:headers(access),cache:'no-store'});}
    catch(e){if([401,403].includes(e.status)){clear();window.dispatchEvent(new Event('chair-auth-expired'));}throw e;}
  }
  function identity(){return session?.identity&&session?.identities?.includes(session.identity)?{mode:'supabase',role:session.role,identity:session.identity}:null;}
  async function restore(){
    try{
      if(!session)session=JSON.parse(sessionStorage.getItem(storageKey)||'null');
      if(!session?.accessToken)return null;
      const allowed=await api('session');session={...session,...allowed};
      if(!session.identities.includes(session.identity))session.identity=null;
      persist();return identity();
    }catch(e){if(e.status===401||e.status===403)clear();throw e;}
  }
  async function login(username,password){
    const email=accounts[String(username).trim().toLowerCase()];
    if(!email)throw Error('請使用主席 chair 或核心 core 帳號。');
    clear();const stamp=epoch;
    const result=await request('/auth/v1/token?grant_type=password',{method:'POST',headers:headers(),body:JSON.stringify({email,password})});
    if(stamp!==epoch)throw Error('登入已取消，請重試。');
    session={accessToken:result.access_token,refreshToken:result.refresh_token,expiresAt:Date.now()+result.expires_in*1000};
    try{const allowed=await api('session');session={...session,...allowed,identity:allowed.role==='chair'?'主席':null};persist();return allowed;}catch(e){clear();throw e;}
  }
  function select(value){if(!session?.identities?.includes(value))throw Error('請選擇有效職務。');session.identity=value;persist();}
  function logout(){const old=session?.accessToken;clear();if(old)request('/auth/v1/logout?scope=local',{method:'POST',headers:headers(old)}).catch(()=>{});location.replace('index.html');}
  window.ChairAuth=Object.freeze({enabled:true,login,restore,identity,select,logout,api});
})();
