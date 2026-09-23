"use strict";
(() => {
  const $=id=>document.getElementById(id);
  let busy=false;
  function error(message){$('loginError').textContent=message;}
  $('loginForm').onsubmit=async event=>{
    event.preventDefault();if(busy)return;busy=true;$('loginButton').disabled=true;error('');
    try{
      const allowed=await ChairAuth.login($('username').value,$('password').value);$('password').value='';
      if(allowed.role==='chair'){location.href='dashboard.html';return;}
      $('identity').replaceChildren(new Option('請選擇自己的職務',''),...allowed.identities.map(name=>new Option(name,name)));
      $('loginForm').hidden=true;$('identityForm').hidden=false;$('panelTitle').textContent='選擇職務';$('panelIntro').textContent='核心共用帳號';$('identity').focus();
    }catch(e){error(e.message);}finally{busy=false;$('loginButton').disabled=false;}
  };
  $('identityForm').onsubmit=event=>{event.preventDefault();try{ChairAuth.select($('identity').value);location.href='dashboard.html';}catch(e){error(e.message);}};
  document.querySelector('[data-back]').onclick=()=>ChairAuth.logout();
})();
