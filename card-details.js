"use strict";
(() => {
  const M=ChairCardModel, B=ChairBoardModel;
  const paths={label:"M20 13 13 20 3 10V3h7Z M7 7h.01",date:"M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",check:"M9 11l3 3L22 4M20 12v8H3V3h12",member:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM20 8v6m-3-3h6",attach:"m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9",description:"M3 5h18M3 10h18M3 15h12M3 20h12",comment:"M21 4H3v13h5l4 4v-4h9ZM7 8h10M7 12h6",image:"M3 3h18v18H3ZM3 17l6-6 5 5 3-3 4 4M15 7h.01",plus:"M12 4v16M4 12h16"};
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.plus}"/></svg>`;
  window.ChairCardDetails=Object.freeze({create({getData,commit,deletion,identity,escape:E,toast}){
    const dialog=document.getElementById("cardDetail");
    let state=null,busy=false;
    const current=()=>state&&getData().tasks.find(t=>t.id===state.id);
    const board=()=>getData().boards.find(b=>b.id===current()?.boardId);
    const stamp=x=>new Date(x).toLocaleString("zh-TW",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    const button=(action,label,extra="")=>`<button type="button" data-card-action="${action}" ${extra}>${label}</button>`;
    const dirty=()=>!!state&&(state.panelDirty||Object.entries(state.drafts).some(([key,value])=>key==="description"?value!==(current()?.notes||""):key==="title"?value!==(current()?.title||""):!!value.trim()));
    function markdown(value){return E(value||"").replace(/\*\*([^\n]+?)\*\*/g,"<strong>$1</strong>").replace(/^[-*] (.+)$/gm,"• $1").replace(/\n/g,"<br>");}
    async function save(message,change,after=()=>{}){
      if(!state||busy)return false;
      try{await commit(d=>{
        const task=d.tasks.find(t=>t.id===state.id);if(!task)throw Error("原工作已變動，請重新開啟。");
        const c=M.ensure(task);change(task,c,d);const now=new Date().toISOString();
        task.updatedAt=now;task.history=[...(task.history||[]),{at:now,by:identity.identity,text:message,title:task.title,status:task.status,date:task.date||"",...(message==="更新描述"?{notes:task.notes||""}:{}),boardId:task.boardId,boardListId:task.boardListId}];
      },state.revision);state.revision=getData().revision;state.error="";after();render();return true;}
      catch(e){state.error=e.message;showError();return false;}
    }
    function showError(){const el=dialog.querySelector(".card-error");if(el){el.textContent=state.error;el.hidden=!state.error;}}
    function render(){
      const t=current(),b=board();if(!t||!b)return;
      const c=M.get(t),list=B.listFor(b,t),leftScroll=dialog.querySelector(".detail-main")?.scrollTop||0,rightScroll=dialog.querySelector(".detail-activity")?.scrollTop||0;
      const cover=c.cover?.type==="attachment"?c.attachments.find(a=>a.id===c.cover.id):null;
      dialog.className=`card-detail ${state.activity?"":"activity-hidden"}`;
      dialog.innerHTML=`<header class="detail-top"><select id="detailList" aria-label="所在清單">${B.lists(b).map(l=>`<option value="${E(l.id)}"${l.id===list?.id?" selected":""}>${E(l.title)}</option>`).join("")}</select><div>${button("cover",icon("image"),'aria-label="設定卡片封面"')}${button("actions","⋯",'aria-label="卡片更多操作"')}${button("close","×",'aria-label="關閉卡片"')}</div></header>${c.cover?`<div class="detail-cover ${c.cover.type==="color"?"cover-"+c.cover.value:""}">${cover?`<img src="${E(cover.data)}" alt="${E(cover.name)}">`:""}</div>`:""}<p class="card-error" role="alert"${state.error?"":" hidden"}>${E(state.error)}</p><div class="detail-layout"><main class="detail-main"><div class="detail-title-row"><button class="completion-toggle ${t.status==="已完成"?"complete":""}" data-card-action="complete" aria-label="${t.status==="已完成"?"重新開啟工作":"標記工作完成"}" aria-pressed="${t.status==="已完成"}">${t.status==="已完成"?"✓":""}</button>${state.editing==="title"?`<form data-card-form="title"><input name="title" aria-label="卡片名稱" maxlength="160" required value="${E(state.drafts.title??t.title)}"><div class="inline-buttons"><button class="primary" type="submit">儲存</button>${button("cancel-title","取消")}</div></form>`:button("title",`<h1>${E(t.title)}</h1>`,'class="card-title-button"')}</div>
        <div class="detail-tools">${button("add",icon("plus")+"新增")}${button("labels",icon("label")+"標籤")}${button("dates",icon("date")+"日期")}${button("checklist",icon("check")+"待辦清單")}${button("members",icon("member")+"成員")}</div>
        ${c.labels.length||c.members.length||t.date||c.startDate?`<div class="card-facts">${c.members.length?`<div><h3>成員</h3><div class="card-avatars">${c.members.map(m=>button("members",E(m.name.slice(0,1)),`class="card-avatar" title="${E(m.name)}" aria-label="成員 ${E(m.name)}"`)).join("")}</div></div>`:""}${c.labels.length?`<div><h3>標籤</h3><div class="card-labels">${c.labels.map(l=>button("labels",E(l.name||M.colors[l.color]),`class="card-label label-${l.color}"`)).join("")}</div></div>`:""}${t.date||c.startDate?`<div><h3>日期</h3>${button("dates",`${E(c.startDate?c.startDate.replaceAll("-","/")+" → ":"")}${E(t.date?t.date.replaceAll("-","/"):"期限未定")} ${E(c.dueTime)}${t.status==="已完成"?" · 已完成":""}`,'class="date-fact"')}</div>`:""}</div>`:""}
        <section class="detail-section"><header><h2>${icon("description")}描述</h2>${state.editing!=="description"?button("description","編輯"):""}</header>${state.editing==="description"?`<form data-card-form="description"><div class="format-tools">${button("format-bold","B",'aria-label="插入粗體"')}${button("format-list","≡",'aria-label="插入清單"')}</div><textarea id="cardDescription" name="notes" rows="8" maxlength="8000" aria-label="卡片描述">${E(state.drafts.description??t.notes??"")}</textarea><div class="inline-buttons"><button type="submit" class="primary">儲存</button>${button("cancel-description","取消")}</div></form>`:t.notes?`<div class="card-description ${state.expanded?"expanded":""}">${markdown(t.notes)}</div>${t.notes.length>700?button("expand-description",state.expanded?"收起內容":"顯示更多",'class="description-more"'):""}`:button("description","新增更詳細的描述…",'class="description-empty"')}</section>
        ${c.attachments.length?`<section class="detail-section"><header><h2>${icon("attach")}附件</h2>${button("attachment","新增附件")}</header><div class="card-attachments">${c.attachments.map(a=>`<article class="card-attachment">${a.kind==="link"?`<a class="attachment-thumb" href="${E(a.url)}" target="_blank" rel="noopener noreferrer">↗</a>`:button("download",M.isImage(a)?`<img src="${E(a.data)}" alt="${E(a.name)}">`:"檔案",`class="attachment-thumb" data-id="${E(a.id)}"`)}<div><strong>${E(a.name)}</strong><p>${a.kind==="file"?Math.ceil(a.size/1024)+" KB · ":"連結 · "}${E(stamp(a.createdAt))}</p><div class="attachment-actions">${a.kind==="link"?`<a href="${E(a.url)}" target="_blank" rel="noopener noreferrer">開啟</a>`:button("download","下載",`data-id="${E(a.id)}"`)}${M.isImage(a)?button("image-cover",c.cover?.id===a.id?"移除封面":"設為封面",`data-id="${E(a.id)}"`):""}${button("remove-attachment","移除",`data-id="${E(a.id)}"`)}</div></div></article>`).join("")}</div></section>`:""}
        ${c.checklists.map(l=>{const done=l.items.filter(i=>i.done).length,pct=l.items.length?Math.round(done/l.items.length*100):0;return `<section class="detail-section checklist-section" data-checklist="${E(l.id)}"><header><h2>${icon("check")}${button("rename-checklist",E(l.title),`data-id="${E(l.id)}" class="checklist-name"`)}</h2><div>${button("hide-items",state.hiddenLists.has(l.id)?"顯示已完成":"隱藏已完成",`data-id="${E(l.id)}"`)}${button("remove-checklist","刪除",`data-id="${E(l.id)}"`)}</div></header><div class="checklist-progress"><span>${pct}%</span><progress value="${done}" max="${l.items.length||1}" aria-label="${E(l.title)}完成進度">${pct}%</progress></div><div class="check-items">${l.items.filter(i=>!state.hiddenLists.has(l.id)||!i.done).map(i=>`<div class="check-item ${i.done?"is-done":""}"><input type="checkbox" data-check-item="${E(i.id)}" data-list="${E(l.id)}" aria-label="完成 ${E(i.text)}"${i.done?" checked":""}>${button("edit-item",E(i.text),`data-list="${E(l.id)}" data-id="${E(i.id)}" class="check-item-text"`)}${button("remove-item","×",`aria-label="移除 ${E(i.text)}" data-list="${E(l.id)}" data-id="${E(i.id)}"`)}</div>`).join("")}</div><form class="check-item-form" data-card-form="item" data-list="${E(l.id)}"><input name="text" aria-label="新增 ${E(l.title)}的項目" placeholder="新增項目…" maxlength="500" required value="${E(state.drafts['item:'+l.id]||"")}"><button type="submit">新增</button></form></section>`;}).join("")}
        <div class="detail-responsibility"><span>負責職務</span>${button("owner",E(t.owner||"尚未指定"))}<span>工作狀態</span>${button("status",E(t.status))}</div>${t.sourceId?`<p class="detail-source">${E([...(t.meetingTags||[]),t.executionTime,t.executionNode].filter(Boolean).join(" · "))}<br>來源會議：${E(getData().meetings.find(m=>m.id===t.sourceId)?.title||"原會議")} <button type="button" data-source-meeting="${E(t.sourceId)}" data-source-entry="${E(t.sourceEntryId||'')}">查看來源議程 ↗</button></p>`:""}
      </main><aside class="detail-activity"><header><h2>${icon("comment")}留言與活動</h2>${button("activity-details",state.showHistory?"隱藏詳情":"顯示詳情")}</header><form class="comment-compose" data-card-form="comment"><textarea name="comment" aria-label="撰寫評論" placeholder="撰寫評論…" maxlength="8000" rows="2" required>${E(state.drafts.comment||"")}</textarea><button type="submit" class="primary">儲存留言</button></form><div class="card-timeline">${timeline(t,c)}</div></aside></div>
      <footer class="detail-footer"><span>雲端保存</span>${button("toggle-activity",icon("comment")+"留言與活動",`aria-pressed="${state.activity}"`)}</footer><div id="cardPopup" class="card-popup" ${state.panel?"":"hidden"} role="region" aria-label="卡片操作"><header><h2 id="cardPopupTitle"></h2>${button("close-panel","×",'aria-label="關閉卡片操作"')}</header><div id="cardPopupBody"></div></div>`;
      if(state.panel)renderPanel();
      dialog.querySelector(".detail-main").scrollTop=leftScroll;dialog.querySelector(".detail-activity").scrollTop=rightScroll;
    }
    function timeline(t,c){
      const entries=[...c.comments.map(x=>({...x,kind:"comment",at:x.createdAt,by:x.author})),...(state.showHistory?(t.history||[]).map((h,i)=>({...h,id:"history-"+i,kind:"history"})):[])].sort((a,b)=>b.at.localeCompare(a.at));
      return entries.length?entries.map(h=>`<article class="timeline-entry"><span class="card-avatar">${E((h.by||"團隊").slice(0,1))}</span><div><strong>${E(h.by||"團隊")}</strong>${h.kind==="comment"?`<div class="comment-body">${markdown(h.text)}</div>`:`<p>${E(h.text||(h.previous?"移動卡片至其他位置":"更新工作內容"))}${!h.text?` · ${E(h.status||"")}`:""}</p>`}<time>${E(stamp(h.at))}${h.updatedAt?" · 已編輯":""}</time>${h.kind==="comment"&&h.author===identity.identity?`<div class="comment-actions">${button("edit-comment","編輯",`data-id="${E(h.id)}"`)}${button("remove-comment","刪除",`data-id="${E(h.id)}"`)}</div>`:""}</div></article>`).join(""):`<p class="activity-empty">在這裡留下討論、補充與進度。</p>`;
    }
    function panel(kind,id="",list=""){
      if(state.panelDirty&&!confirm("尚未儲存的內容要放棄嗎？"))return;
      state.panel={kind,id,list};state.panelDirty=false;state.panelValues={};render();dialog.querySelector("#cardPopupBody input:not([type=radio]):not([type=checkbox]),#cardPopupBody textarea")?.focus();
    }
    const field=(name,label,value,type="text",max=160)=>`<label>${label}<input name="${name}" type="${type}" maxlength="${max}" value="${E(value||"")}"></label>`;
    const form=(kind,body)=>`<form data-card-form="${kind}">${body}<button class="primary" type="submit">儲存</button></form>`;
    function renderPanel(){
      const t=current(),c=M.get(t),p=state.panel,body=dialog.querySelector("#cardPopupBody"),b=board();let title="",html="";
      if(p.kind==="add"||p.kind==="actions"){
        title=p.kind==="add"?"新增至卡片":"卡片操作";const actions=p.kind==="add"?[["attachment","附件"],["labels","標籤"],["dates","日期"],["checklist","待辦清單"],["members","成員"],["cover","封面"]]:[["move","移動卡片"],["copy","複製卡片"],["cover","設定封面"],["delete-card","刪除卡片"]];html=actions.map(([action,label])=>button(action,label,'class="popup-menu-item"')).join("");
      }else if(p.kind==="labels"){
        title="標籤";html=c.labels.map(l=>`<div class="popup-label"><span class="card-label label-${l.color}">${E(l.name||M.colors[l.color])}</span>${button("edit-label","編輯",`data-id="${E(l.id)}"`)}${button("remove-label","×",`aria-label="移除標籤 ${E(l.name)}" data-id="${E(l.id)}"`)}</div>`).join("")+form("label",field("name","標籤名稱","","text",80)+colorOptions("color","blue"));
      }else if(p.kind==="edit-label"){
        title="編輯標籤";const l=c.labels.find(l=>l.id===p.id);html=form("label",field("name","標籤名稱",l.name,"text",80)+colorOptions("color",l.color));
      }else if(p.kind==="dates"){
        title="日期";html=form("dates",field("startDate","開始日期",c.startDate,"date")+field("date",t.dateKind==="regular"?"例會場次日期":t.dateKind==="execution"?"執行日期":"截止日期",t.date,"date")+field("dueTime","截止時間",c.dueTime,"time"))+button("clear-dates","移除日期",'class="popup-wide"');
      }else if(p.kind==="members"){
        title="成員";const roster=getData().workUnits.find(u=>u.id===b.unitId)?.members||[],people=[...roster,...c.members.filter(m=>!roster.some(r=>r.id===m.id))];
        html=people.length?people.map(m=>`<label class="member-choice"><input type="checkbox" data-member-id="${E(m.id)}"${c.members.some(x=>x.id===m.id)?" checked":""}><span class="card-avatar">${E(m.name.slice(0,1))}</span><span>${E(m.name)}</span></label>`).join(""):`<p class="popup-note">這個單位尚未加入成員，可先在下方新增。</p>`;
        html+=form("member",field("name","新增至單位並指派","","text",80))+`<p class="popup-note">使用本機協作名單，不會發送通知或開通帳號。</p>`;
      }else if(["checklist","rename-checklist","edit-item","edit-comment","title","copy"].includes(p.kind)){
        const l=c.checklists.find(l=>l.id===(p.list||p.id));title={checklist:"新增待辦清單","rename-checklist":"清單名稱","edit-item":"編輯待辦項目","edit-comment":"編輯留言",title:"卡片名稱",copy:"複製卡片"}[p.kind];
        if(p.kind==="edit-comment")html=form("edit-comment",`<label>留言<textarea name="text" rows="5" required maxlength="8000">${E(c.comments.find(x=>x.id===p.id).text)}</textarea></label>`);
        else html=form(p.kind,field("text",title,p.kind==="checklist"?"待辦清單":p.kind==="rename-checklist"?l.title:p.kind==="edit-item"?l.items.find(i=>i.id===p.id).text:p.kind==="copy"?t.title+"（副本）":t.title,"text",p.kind==="edit-item"?500:160));
      }else if(p.kind==="attachment"){
        title="附件";html=`<label class="file-pick">從電腦選擇檔案<input id="cardFileInput" type="file"></label><p class="popup-note">本機單檔上限 750 KB，附件合計上限 2 MB。較大的文件可附連結。</p><hr>`+form("attachment",field("url","貼上連結","","url",2000)+field("name","顯示名稱（可留空）","","text",200));
      }else if(p.kind==="cover"){
        title="卡片封面";html=`<div class="card-cover-choices">${M.covers.map((key,i)=>button("color-cover",["酒紅","海藍","森林","暖陽","暮紫","山巒"][i],`data-color="${key}" class="cover-${key}"`)).join("")}</div>${c.attachments.filter(M.isImage).map(a=>button("image-cover",`<img src="${E(a.data)}" alt="${E(a.name)}">`,`class="cover-image-choice" data-id="${E(a.id)}"`)).join("")}${button("attachment","新增圖片附件",'class="popup-wide"')}${c.cover?button("clear-cover","移除封面",'class="popup-wide"'):""}`;
      }else if(p.kind==="move"){
        title="移動卡片";html=form("move",`<label>清單<select name="listId">${B.lists(b).map(l=>`<option value="${E(l.id)}"${B.listFor(b,t)?.id===l.id?" selected":""}>${E(l.title)}</option>`).join("")}</select></label><label>位置<select name="position"><option value="bottom">最下方</option><option value="top">最上方</option></select></label>`);
      }else if(p.kind==="owner"||p.kind==="status"){
        title=p.kind==="owner"?"負責職務":"工作狀態";const choices=p.kind==="owner"?["",...ChairBoards.units.map(u=>u.name)]:B.states;
        html=form(p.kind,`<label>${title}<select name="value">${choices.map(v=>`<option value="${E(v)}"${t[p.kind]===v?" selected":""}>${E(v||"尚未指定")}</option>`).join("")}</select></label>`);
      }
      dialog.querySelector("#cardPopupTitle").textContent=title;body.innerHTML=html;
      for(const [name,value] of Object.entries(state.panelValues)){body.querySelectorAll(`[name="${name}"]`).forEach(el=>{if(el.type==="radio")el.checked=el.value===value;else el.value=value;});}
    }
    function colorOptions(name,value){return `<fieldset class="label-color-choices"><legend>顏色</legend>${Object.entries(M.colors).map(([key,title])=>`<label class="label-${key}"><input type="radio" name="${name}" value="${key}"${key===value?" checked":""}><span>${title}</span></label>`).join("")}</fieldset>`;}
    const closePanel=()=>{state.panel=null;state.panelDirty=false;state.panelValues={};};
    function close(){if(busy){toast("附件正在儲存，請稍候。");return;}if(dirty()&&!confirm("尚未儲存的內容要放棄嗎？"))return;dialog.close();state=null;}
    function setStatus(task,d,status){
      const b=d.boards.find(b=>b.id===task.boardId),l=b&&B.lists(b).find(l=>l.status===status);task.status=status;
      if(l){task.boardListId=l.id;task.boardOrder=B.cards(d,b,l.id).filter(t=>t.id!==task.id).reduce((n,t)=>Math.max(n,t.boardOrder??0),-1)+1;}
    }
    dialog.addEventListener("cancel",e=>{e.preventDefault();if(state.panel){if(!state.panelDirty||confirm("尚未儲存的內容要放棄嗎？")){closePanel();render();}}else close();});
    dialog.addEventListener("input",e=>{
      if(!state)return;const form=e.target.closest("form");if(!form)return;const kind=form.dataset.cardForm;
      if(form.closest("#cardPopup")){state.panelDirty=true;state.panelValues[e.target.name]=e.target.value;}
      else state.drafts[kind==="item"?"item:"+form.dataset.list:kind]=e.target.value;
    });
    dialog.addEventListener("submit",async e=>{
      const form=e.target.closest("[data-card-form]");if(!form||!state)return;e.preventDefault();
      const kind=form.dataset.cardForm,v=Object.fromEntries(new FormData(form)),p=state.panel&&{...state.panel};
      if(["label","member"].includes(kind)&&!(v.name||"").trim()&&kind!=="label"||["title","description","comment","item","edit-comment","checklist","rename-checklist","edit-item","copy"].includes(kind)&&!(v.title??v.notes??v.comment??v.text??"").trim()&&kind!=="description"){state.error="請先填寫內容。";showError();return;}
      const id=crypto.randomUUID(),now=new Date().toISOString();
      if(kind==="description")await save("更新描述",t=>t.notes=v.notes,()=>{delete state.drafts.description;state.editing=null;});
      else if(kind==="title")await save("修改卡片名稱",t=>t.title=v.title.trim(),()=>{delete state.drafts.title;state.editing=null;});
      else if(kind==="comment")await save("新增留言",(t,c)=>c.comments.push({id,text:v.comment.trim(),author:identity.identity,createdAt:now}),()=>delete state.drafts.comment);
      else if(kind==="item")await save("新增待辦項目",(t,c)=>{const l=c.checklists.find(l=>l.id===form.dataset.list);if(!l)throw Error("清單已變動。");l.items.push({id,text:v.text.trim(),done:false});},()=>delete state.drafts["item:"+form.dataset.list])&&dialog.querySelector(`[data-card-form="item"][data-list="${form.dataset.list}"] input`)?.focus();
      else if(kind==="label")await save(p.kind==="edit-label"?"修改標籤":"新增標籤",(t,c)=>{if(!Object.hasOwn(M.colors,v.color))throw Error("請選擇標籤顏色。");const old=c.labels.find(l=>l.id===p.id);if(old)Object.assign(old,{name:v.name.trim(),color:v.color});else c.labels.push({id,name:v.name.trim(),color:v.color});},closePanel);
      else if(kind==="dates"){
        if(!ChairCalendar.validDate(v.startDate)||!ChairCalendar.validDate(v.date)||v.startDate&&v.date&&v.startDate>v.date||v.dueTime&&!v.date){state.error="請核對起訖日期；截止時間需要截止日期。";showError();return;}
        await save("更新日期",(t,c)=>{t.date=v.date;c.startDate=v.startDate;c.dueTime=v.dueTime;},closePanel);
      }else if(kind==="member")await save("指派卡片成員",(t,c,d)=>{
        const unitId=board().unitId;let unit=d.workUnits.find(u=>u.id===unitId);if(!unit){unit={id:unitId,description:"",members:[]};d.workUnits.push(unit);}
        let member=unit.members.find(m=>m.name===v.name.trim());if(!member){member={id,name:v.name.trim(),note:""};unit.members.push(member);}if(!c.members.some(m=>m.id===member.id))c.members.push({id:member.id,name:member.name});unit.updatedAt=now;
      },closePanel);
      else if(kind==="checklist")await save("新增待辦清單",(t,c)=>c.checklists.push({id,title:v.text.trim(),items:[]}),closePanel);
      else if(kind==="rename-checklist")await save("修改清單名稱",(t,c)=>c.checklists.find(l=>l.id===p.id).title=v.text.trim(),closePanel);
      else if(kind==="edit-item")await save("修改待辦項目",(t,c)=>c.checklists.find(l=>l.id===p.list).items.find(i=>i.id===p.id).text=v.text.trim(),closePanel);
      else if(kind==="edit-comment")await save("編輯留言",(t,c)=>{const m=c.comments.find(m=>m.id===p.id&&m.author===identity.identity);if(!m)throw Error("無法編輯這則留言。");m.text=v.text.trim();m.updatedAt=now;},closePanel);
      else if(kind==="attachment")await save("新增附件連結",(t,c)=>{const url=M.safeURL(v.url);if(!url)throw Error("請填入有效的 http／https 連結，不含帳密。");c.attachments.push({id,kind:"link",url,name:v.name.trim()||new URL(url).hostname,createdAt:now});},closePanel);
      else if(kind==="move")await save("移動卡片",(t,c,d)=>{const b=d.boards.find(b=>b.id===t.boardId),before=v.position==="top"?B.cards(d,b,v.listId).find(x=>x.id!==t.id)?.id||"":"";B.move(d,t.boardId,t.id,v.listId,before,identity.identity);},closePanel);
      else if(kind==="owner")await save("修改負責職務",t=>{if(v.value&&!ChairBoards.units.some(u=>u.name===v.value))throw Error("請選擇職務。");t.owner=v.value;},closePanel);
      else if(kind==="status")await save("修改工作狀態",(t,c,d)=>{if(!B.states.includes(v.value))throw Error("請選擇有效狀態。");setStatus(t,d,v.value);},closePanel);
      else if(kind==="copy")await save("複製卡片",(t,c,d)=>{const next=structuredClone(t);next.id=id;delete next.sourceEntryId;next.title=v.text.trim();next.createdAt=now;next.updatedAt=now;next.card.comments=[];next.history=[{at:now,by:identity.identity,text:"由其他卡片複製",title:next.title,status:next.status,date:next.date}];next.boardOrder=d.tasks.filter(x=>x.boardId===t.boardId&&x.boardListId===t.boardListId).reduce((n,x)=>Math.max(n,x.boardOrder??0),-1)+1;d.tasks.push(next);},()=>{closePanel();toast("已複製到同一清單");});
    });
    dialog.addEventListener("click",async e=>{
      const el=e.target.closest("[data-card-action]");if(!el||!state)return;const action=el.dataset.cardAction,id=el.dataset.id,list=el.dataset.list;
      if(action==="close"){close();return;}
      if(action==="delete-card"){
        if(busy||dirty()){state.error="請先儲存或取消尚未完成的修改，再刪除卡片。";showError();return;}
        try{deletion.open({kind:"task",id:state.id,revision:state.revision,after(){dialog.close();state=null;toast("卡片與對應工作已刪除");}});}
        catch(error){state.error=error.message;showError();}
        return;
      }
      if(action==="close-panel"){if(!state.panelDirty||confirm("尚未儲存的內容要放棄嗎？")){closePanel();render();}return;}
      if(["add","labels","dates","checklist","members","attachment","cover","actions","move","owner","status","copy","edit-label","rename-checklist","edit-item","edit-comment"].includes(action)){panel(action,id,list);return;}
      if(action==="title"||action==="description"){state.editing=action;state.drafts[action]??=current()[action==="title"?"title":"notes"]||"";render();dialog.querySelector(action==="title"?'[data-card-form="title"] input':"#cardDescription")?.focus();}
      if(action==="cancel-title"||action==="cancel-description"){delete state.drafts[action.slice(7)];state.editing=null;render();}
      if(action==="format-bold"||action==="format-list"){const area=dialog.querySelector("#cardDescription"),start=area.selectionStart,end=area.selectionEnd,selected=area.value.slice(start,end);area.setRangeText(action==="format-bold"?"**"+(selected||"粗體文字")+"**":"- "+(selected||"項目"),start,end,"select");state.drafts.description=area.value;area.focus();}
      if(action==="expand-description"){state.expanded=!state.expanded;render();}
      if(action==="toggle-activity"){state.activity=!state.activity;render();}
      if(action==="activity-details"){state.showHistory=!state.showHistory;render();}
      if(action==="hide-items"){if(state.hiddenLists.has(id))state.hiddenLists.delete(id);else state.hiddenLists.add(id);render();}
      if(action==="complete")await save(current().status==="已完成"?"重新開啟工作":"完成工作",(t,c,d)=>{if(t.status==="已完成")setStatus(t,d,B.states.includes(c.previousStatus)&&c.previousStatus!=="已完成"?c.previousStatus:"未開始");else{c.previousStatus=t.status;setStatus(t,d,"已完成");}});
      if(action==="remove-label")await save("移除標籤",(t,c)=>c.labels=c.labels.filter(l=>l.id!==id));
      if(action==="clear-dates")await save("移除日期",(t,c)=>{t.date="";c.startDate="";c.dueTime="";},closePanel);
      if(action==="color-cover")await save("設定封面",(t,c)=>c.cover={type:"color",value:el.dataset.color},closePanel);
      if(action==="clear-cover")await save("移除封面",(t,c)=>c.cover=null,closePanel);
      if(action==="image-cover")await save("更新圖片封面",(t,c)=>c.cover=c.cover?.id===id?null:{type:"attachment",id},closePanel);
      if(action==="remove-checklist"&&confirm("刪除這份待辦清單及其中項目？"))await save("刪除待辦清單",(t,c)=>c.checklists=c.checklists.filter(l=>l.id!==id));
      if(action==="remove-item")await save("移除待辦項目",(t,c)=>c.checklists.find(l=>l.id===list).items=c.checklists.find(l=>l.id===list).items.filter(i=>i.id!==id));
      if(action==="remove-comment"&&confirm("刪除這則留言？"))await save("刪除留言",(t,c)=>c.comments=c.comments.filter(m=>m.id!==id||m.author!==identity.identity));
      if(action==="remove-attachment"&&confirm("從卡片移除此附件？"))await save("移除附件",(t,c)=>{c.attachments=c.attachments.filter(a=>a.id!==id);if(c.cover?.id===id)c.cover=null;});
      if(action==="download")download(M.get(current()).attachments.find(a=>a.id===id));
    });
    dialog.addEventListener("change",async e=>{
      if(!state)return;const el=e.target;
      if(el.id==="detailList")await save("移動卡片",(t,c,d)=>B.move(d,t.boardId,t.id,el.value,"",identity.identity));
      if(el.dataset.checkItem){const checked=el.checked;await save(checked?"完成待辦項目":"重新開啟待辦項目",(t,c)=>c.checklists.find(l=>l.id===el.dataset.list).items.find(i=>i.id===el.dataset.checkItem).done=checked)||render();}
      if(el.dataset.memberId){const checked=el.checked;await save(checked?"指派卡片成員":"移除卡片成員",(t,c,d)=>{if(!checked)c.members=c.members.filter(m=>m.id!==el.dataset.memberId);else{const m=d.workUnits.find(u=>u.id===board().unitId)?.members.find(m=>m.id===el.dataset.memberId);if(!m)throw Error("成員名單已變動。");c.members.push({id:m.id,name:m.name});}})||render();}
      if(el.id==="cardFileInput"&&el.files[0])attachFile(el.files[0]);
    });
    async function attachFile(file){
      if(file.size>M.FILE_LIMIT){state.error="單檔超過 750 KB，請改貼檔案連結。";showError();return;}
      const originalId=state.id,revision=state.revision;busy=true;
      try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error("讀取附件失敗。"));reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});
        if(!state||state.id!==originalId||state.revision!==revision)throw Error("卡片已變動，請重新選取附件。");
        const mime=(file.type||"application/octet-stream").toLowerCase(),encoded=`data:${mime};base64,`+String(data).split(",")[1];busy=false;
        await save("新增檔案附件",(t,c)=>c.attachments.push({id:crypto.randomUUID(),kind:"file",name:file.name.slice(0,200),size:file.size,mime,data:encoded,createdAt:new Date().toISOString()}),closePanel);
      }catch(e){if(state){state.error=e.message;showError();}}finally{busy=false;}
    }
    function download(a){if(!a||a.kind!=="file")return;const bytes=Uint8Array.from(atob(a.data.split(",")[1]),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:"application/octet-stream"})),link=document.createElement("a");link.href=url;link.download=a.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return {open(id){const t=getData().tasks.find(t=>t.id===id);if(!t?.boardId)return false;state={id,revision:getData().revision,drafts:{},panel:null,panelValues:{},panelDirty:false,editing:null,activity:true,showHistory:true,expanded:false,hiddenLists:new Set(),error:""};render();dialog.showModal();return true;},dirty:()=>dirty()||busy,storageChanged(){if(!state)return;if(dirty()){state.error="另一個分頁更新了資料。草稿已保留；請複製未存內容，重新開啟卡片後核對。";showError();}else{state.revision=getData().revision;render();}}};
  }});
})();
