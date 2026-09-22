"use strict";
(() => {
  window.ChairDeletion=Object.freeze({create({getData,commit}){
    const dialog=document.createElement('dialog');
    dialog.className='delete-confirmation';
    dialog.setAttribute('aria-labelledby','deleteTitle');
    dialog.setAttribute('aria-describedby','deleteImpact');
    dialog.innerHTML='<header class="dialog-head"><h2 id="deleteTitle"></h2></header><div class="delete-body"><strong id="deleteName"></strong><p id="deleteImpact"></p><label>請輸入完整名稱，確認要刪除<input id="deleteNameInput" autocomplete="off" spellcheck="false"></label><p id="deleteError" class="error" role="alert"></p></div><footer class="dialog-foot"><button type="button" class="secondary" id="cancelDeletion">取消</button><button type="button" class="danger-button" id="confirmDeletion" disabled>永久刪除</button></footer>';
    document.body.append(dialog);
    const $=id=>dialog.querySelector('#'+id);
    let pending=null;
    function close(){dialog.close();pending=null;}
    $('cancelDeletion').onclick=close;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    $('deleteNameInput').oninput=()=>{$('confirmDeletion').disabled=!pending||$('deleteNameInput').value!==pending.title;};
    // No form submit: Enter while typing the name must never delete anything.
    $('confirmDeletion').onclick=()=>{
      if(!pending||$('confirmDeletion').disabled)return;
      const request=pending;$('confirmDeletion').disabled=true;
      try{
        commit(d=>ChairBoardModel.remove(d,request.kind,request.id,$('deleteNameInput').value),request.revision);
      }catch(error){$('deleteError').textContent=error.message;return;}
      close();request.after();
    };
    return {open({kind,id,revision,after,label="卡片"}){
      const item=ChairBoardModel.deletion(getData(),kind,id);
      pending={kind,id,revision,after,title:item.title};
      $('deleteTitle').textContent=kind==='board'?'刪除空看板':label==='工作'?'刪除工作':'刪除卡片';
      $('deleteName').textContent=item.title;
      $('deleteImpact').textContent=kind==='board'?'將永久刪除這張空看板及其清單設定。刪除後無法復原。':(label==='工作'?'這筆工作若已放入看板，對應卡片也會同步刪除。':'這張卡片就是同一筆工作。')+'刪除後，工作清單與月曆中的這筆工作也會移除，描述、待辦、留言、附件及修改紀錄一併刪除，無法復原。';
      $('deleteNameInput').value='';$('deleteError').textContent='';$('confirmDeletion').disabled=true;
      dialog.showModal();$('cancelDeletion').focus();
    }};
  }});
})();
