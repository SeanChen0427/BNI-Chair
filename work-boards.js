"use strict";
(() => {
  const units=[{id:"chair",name:"主席",short:"主"},{id:"vice",name:"副主席",short:"副"},{id:"finance",name:"秘書財務",short:"財"},{id:"education",name:"教育協調員",short:"教"},{id:"mentor",name:"導師協調員",short:"導"},{id:"activity",name:"活動協調員",short:"活"},{id:"reception",name:"接待組長",short:"接"},{id:"growth",name:"成長協調員",short:"成"}];
  const covers={wine:"酒紅",ocean:"海藍",forest:"森林",sunset:"暖陽",lavender:"暮紫",slate:"山巒"};
  const M=ChairBoardModel, states=M.states;
  window.ChairBoards=Object.freeze({units,create({getData,commit,deletion,openTask,identity,escape:E,toast}){
    const $=id=>document.getElementById(id), host=$("unitContent");
    let current=null, editor=null, search="", composer=null;
    const drafts=new Map();
    const href=(unit,tab="boards")=>`#units/${unit}/${tab}`;
    function frontTop(task){const c=ChairCardModel.get(task),a=c.attachments.find(a=>a.id===c.cover?.id);return (c.cover?`<div class="front-cover ${c.cover.type==='color'?'cover-'+c.cover.value:''}">${a&&ChairCardModel.isImage(a)?`<img src="${E(a.data)}" alt="${E(a.name)}">`:''}</div>`:'')+(c.labels.length?`<div class="front-labels">${c.labels.map(l=>`<span class="card-label label-${l.color}">${E(l.name||ChairCardModel.colors[l.color])}</span>`).join('')}</div>`:'');}
    function frontBottom(task){const c=ChairCardModel.get(task),p=ChairCardModel.progress(c);return p.total||c.comments.length||c.attachments.length||c.members.length?`<span class="front-badges">${p.total?`<span title="待辦完成進度">☑ ${p.done}/${p.total}</span>`:''}${c.comments.length?`<span title="留言">☏ ${c.comments.length}</span>`:''}${c.attachments.length?`<span title="附件">♧ ${c.attachments.length}</span>`:''}<span class="front-avatars">${c.members.map(m=>`<span class="card-avatar" title="${E(m.name)}">${E(m.name.slice(0,1))}</span>`).join('')}</span></span>`:'';}

    function parse(hash){
      const p=hash.replace(/^#/,"").split("/");
      if(p[0]!=="units")return null;
      const unit=units.find(u=>u.id===p[1]);
      if(!unit||!(p.length===3&&["boards","members","settings"].includes(p[2])||p.length===4&&p[2]==="board"&&p[3]))return null;
      return {unit,tab:p[2],boardId:p[3]||""};
    }
    function initNav(){
      $("unitNav").innerHTML=units.map(u=>`<details class="unit-nav-group" data-unit="${u.id}"><summary title="${u.name}"><span class="unit-icon">${u.short}</span><b>${u.name}</b><span class="unit-chevron">⌄</span></summary><div class="unit-subnav"><a href="${href(u.id)}">▦ <span>看板</span></a><a href="${href(u.id,"members")}">♧ <span>成員</span></a><a href="${href(u.id,"settings")}">⚙ <span>設定</span></a></div></details>`).join("");
      $("unitNav").addEventListener("click",e=>{if(e.target.closest("summary")&&$("appShell").classList.contains("compact")){$("toggleSidebar").click();}});
    }
    function title(){if(!current)return "工作單位";const b=getData().boards.find(b=>b.id===current.boardId&&b.unitId===current.unit.id);return current.unit.name+" · "+(current.tab==="board"?b?.title||"看板":["boards","members","settings"].includes(current.tab)?{boards:"看板",members:"成員",settings:"設定"}[current.tab]:"");}
    function renderNav(){
      document.querySelectorAll(".unit-subnav a").forEach(a=>{const selected=!!current&&a.hash===href(current.unit.id,current.tab==="board"?"boards":current.tab);a.classList.toggle("active",selected);if(selected)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
      if(current)$("unitNav").querySelector(`[data-unit="${current.unit.id}"]`).open=true;
    }
    function unitData(){return getData().workUnits.find(u=>u.id===current.unit.id)||{id:current.unit.id,description:"",members:[]};}
    function renderGrid(){
      const all=getData().boards.filter(b=>b.unitId===current.unit.id), boards=all.filter(b=>b.title.toLowerCase().includes(search.toLowerCase()));
      $("boardGrid").innerHTML=boards.map(b=>{const tasks=getData().tasks.filter(t=>t.boardId===b.id),done=tasks.filter(t=>t.status==="已完成").length;return `<a class="board-tile" href="${href(current.unit.id,"board/"+b.id)}"><div class="board-cover cover-${b.cover}" aria-hidden="true"><span>▦</span></div><div class="board-tile-body"><strong>${E(b.title)}</strong><small>${tasks.length?`${tasks.length} 項工作 · ${done} 項完成`:"尚無工作"}</small></div></a>`;}).join("")+`<button class="board-tile new-board-tile" data-board-action="create-board"><span aria-hidden="true">＋</span><strong>建立新的看板</strong></button>`;
      $("boardsCount").textContent=`${all.length} 個看板`;
      $("boardNoMatch").hidden=!search||!!boards.length;
    }
    function render(){
      renderNav();if(!current)return;
      const scroll=host.querySelector(".kanban-scroll")?.scrollLeft||0;
      const u=current.unit, config=unitData();
      const heading=`<header class="unit-heading"><div class="unit-avatar">${u.short}</div><div><h1>${u.name}</h1><p>${current.tab==="members"?"單位成員":current.tab==="settings"?"單位設定":"工作看板"}</p></div></header>`;
      if(current.tab==="boards"){
        host.innerHTML=heading+`<div class="unit-toolbar"><h2>所有看板 <span id="boardsCount"></span></h2><input id="boardSearch" type="search" value="${E(search)}" placeholder="尋找看板…" aria-label="尋找看板"></div><p id="boardNoMatch" class="muted" hidden>沒有符合的看板。</p><div id="boardGrid" class="board-grid"></div>`;
        const jobs=getData().tasks.filter(t=>t.sourceId&&(t.owner===u.name||t.collaborationUnits?.includes(u.id)));if(jobs.length)host.insertAdjacentHTML("beforeend",`<section class="meeting-inbox"><h2>會議安排 <small>${jobs.filter(t=>t.status!=="已完成").length} 項待處理</small></h2>${jobs.map(t=>`<article class="mw-job"><div><strong>${E(t.title)}</strong><p>${E(t.date||"日期待定")} · ${E(t.executionNode||getData().meetings.find(m=>m.id===t.sourceId)?.title||"來源會議")}</p></div><span class="mw-chip ${t.status==='已完成'?'green':'blue'}">${E(t.status)}</span><button data-edit="task" data-id="${E(t.id)}">開啟工作</button><button data-source-meeting="${E(t.sourceId)}" data-source-entry="${E(t.sourceEntryId||'')}">來源議程 ↗</button></article>`).join('')}</section>`);
        renderGrid();$("boardSearch").oninput=e=>{search=e.target.value;renderGrid();};
      }else if(current.tab==="members"){
        host.innerHTML=heading+`<div class="unit-toolbar"><h2>成員 <span>${config.members.length} 位</span></h2><button class="primary" data-board-action="create-member">＋ 新增成員</button></div><p class="muted unit-note">本機協作名單；新增姓名不會發送邀請或開通帳號。</p><div class="unit-member-list">${config.members.length?config.members.map(m=>`<article class="unit-member"><span class="member-avatar">${E(m.name.slice(0,1))}</span><div><strong>${E(m.name)}</strong><p>${E(m.note)}</p></div><button class="secondary" data-board-action="edit-member" data-id="${E(m.id)}">編輯</button></article>`).join(""):`<div class="unit-empty"><strong>尚未加入成員</strong><p>加入一起處理這個單位工作的人。</p></div>`}</div>`;
      }else if(current.tab==="settings"){
        host.innerHTML=heading+`<div class="unit-settings"><div><h2>單位資料</h2><button class="secondary" data-board-action="edit-unit">編輯</button></div><dl><dt>工作單位</dt><dd>${u.name}</dd><dt>說明</dt><dd>${E(config.description||"尚未填寫")}</dd></dl><p class="muted unit-note">正式成員權限與多人同步尚未啟用。</p></div>`;
      }else{
        const board=getData().boards.find(b=>b.id===current.boardId&&b.unitId===u.id);
        if(!board){host.innerHTML=heading+`<div class="unit-empty"><h2>找不到這個看板</h2><a href="${href(u.id)}">返回單位看板</a></div>`;return;}
        const lists=M.lists(board);
        host.innerHTML=`<a class="board-back" href="${href(u.id)}">‹ ${u.name}的看板</a><header class="kanban-heading cover-${board.cover}"><div><p>${u.name}</p><h1>${E(board.title)}</h1></div><button class="secondary" data-board-action="edit-board" data-id="${E(board.id)}">看板設定</button></header><div class="kanban-scroll" tabindex="0" aria-label="工作看板，可左右捲動"><div class="kanban-columns">${lists.map(l=>{
          const tasks=M.cards(getData(),board,l.id), i=states.indexOf(l.status);
          return `<section class="kanban-column" data-list-id="${E(l.id)}"><header draggable="true" data-drag-list="${E(l.id)}"><h2><i class="status-mark status-${i}"></i><button class="list-title" data-board-action="edit-list" data-id="${E(l.id)}" title="編輯清單">${E(l.title)}</button></h2><span>${tasks.length}</span><button class="list-menu" data-board-action="edit-list" data-id="${E(l.id)}" aria-label="${E(l.title)}清單設定">⋯</button></header>${l.status?`<span class="list-status">工作狀態：${E(l.status)}</span>`:""}<div class="kanban-cards">${tasks.map(t=>`<article class="work-card" draggable="true" data-drag-task="${E(t.id)}"><button class="work-card-open" data-edit="task" data-id="${E(t.id)}">${frontTop(t)}<strong>${E(t.title)}</strong>${t.notes?`<p>${E(t.notes.slice(0,90))}</p>`:""}<span class="work-card-meta"><span>${E(t.owner||"尚未指定")}</span>${t.date?`<time>${E(t.date.replaceAll("-","/"))}</time>`:""}</span>${frontBottom(t)}</button><details class="card-move-menu"><summary aria-label="移動工作：${E(t.title)}">移動</summary><label class="work-card-move"><span>清單</span><select aria-label="移動工作：${E(t.title)}" data-move-task="${E(t.id)}">${lists.map(x=>`<option value="${E(x.id)}"${x.id===l.id?" selected":""}>${E(x.title)}</option>`).join("")}</select></label><button data-board-action="card-up" data-id="${E(t.id)}">上移</button><button data-board-action="card-down" data-id="${E(t.id)}">下移</button></details></article>`).join("")}</div>${composer?.kind==="card"&&composer.listId===l.id?composeForm():`<button class="add-work-card" data-board-action="compose-card" data-id="${E(l.id)}">＋ 新增卡片</button>`}</section>`;
        }).join("")}<div class="add-list-column">${composer?.kind==="list"?composeForm():`<button class="add-list-button" data-board-action="compose-list">＋ 新增另一個清單</button>`}</div></div></div>`;
        host.querySelector(".kanban-scroll").scrollLeft=scroll;
      }
      $("pageName").textContent=title();document.title=title()+"｜富聯核心團隊";
    }
    const nameField=(name,label,value,max=160)=>`<label class="full">${label}<input name="${name}" required maxlength="${max}" value="${E(value)}"></label>`;
    function edit(kind,id=""){
      let item={};const config=unitData();
      if(kind==="board")item=getData().boards.find(b=>b.id===id&&b.unitId===current.unit.id)||{title:"",cover:"wine"};
      if(kind==="member")item=config.members.find(m=>m.id===id)||{name:"",note:""};
      if(kind==="unit")item=config;
      if(kind==="list")item=M.lists(getData().boards.find(b=>b.id===current.boardId)).find(l=>l.id===id);
      editor={kind,id,unitId:current.unit.id,revision:getData().revision,dirty:false};
      $("boardEditorTitle").textContent=kind==="unit"?"編輯單位資料":kind==="list"?"清單設定":(id?"編輯":"新增")+(kind==="board"?"看板":"成員");
      let fields=kind==="board"?nameField("title","看板名稱",item.title)+`<fieldset class="cover-picker full"><legend>封面色彩</legend>${Object.entries(covers).map(([key,name])=>`<label><input type="radio" name="cover" value="${key}"${item.cover===key?" checked":""}><span class="cover-${key}">${name}</span></label>`).join("")}</fieldset>`:kind==="member"?nameField("name","姓名",item.name,80)+`<label class="full">分工／備註<input name="note" maxlength="240" value="${E(item.note)}"></label>`:`<label class="full">${current.unit.name}的說明<textarea name="description" rows="4" maxlength="1200">${E(item.description)}</textarea></label>`;
      if(kind==="list"){
        editor.boardId=current.boardId;
        const lists=M.lists(getData().boards.find(b=>b.id===current.boardId));
        fields=nameField("title","清單名稱",item.title)+`<label>移入卡片時的工作狀態<select name="status"><option value="">維持原狀態</option>${states.map(s=>`<option${s===item.status?" selected":""}>${s}</option>`).join("")}</select></label><label>清單位置<select name="position">${lists.map((l,i)=>`<option value="${i}"${l.id===id?" selected":""}>第 ${i+1} 欄</option>`).join("")}</select></label>`;
      }
      $("deleteBoard").hidden=kind!=="board"||!id;
      $("boardEditorFields").innerHTML=fields;$("boardEditorError").textContent="";$("boardEditor").showModal();
    }
    function close(){if(editor?.dirty&&!confirm("尚未儲存的修改要放棄嗎？"))return;$("boardEditor").close();editor=null;}
    $("closeBoardEditor").onclick=close;$("cancelBoardEditor").onclick=close;$("boardEditor").addEventListener("cancel",e=>{e.preventDefault();close();});
    $("deleteBoard").onclick=()=>{
      if(!editor||editor.kind!=="board"||!editor.id)return;
      if(editor.dirty||composer?.text.trim()||drafts.has(editor.id)){$("boardEditorError").textContent="請先儲存或取消尚未完成的修改，再刪除看板。";return;}
      const request={...editor};
      try{deletion.open({kind:"board",id:request.id,revision:request.revision,after(){
        $("boardEditor").close();editor=null;drafts.delete(request.id);composer=null;
        location.hash=href(request.unitId);toast("看板已刪除");
      }});}catch(error){$("boardEditorError").textContent=error.message;}
    };
    $("boardEditorForm").oninput=()=>{if(editor)editor.dirty=true;};
    $("boardEditorForm").onsubmit=async e=>{
      e.preventDefault();if(!editor)return;const draft={...editor},v=Object.fromEntries(new FormData(e.currentTarget));
      try{
        if(draft.kind==="board"&&(!v.title.trim()||!Object.hasOwn(covers,v.cover)))throw Error("請輸入看板名稱並選擇封面。");
        if(draft.kind==="member"&&!v.name.trim())throw Error("請輸入成員姓名。");
        if(draft.kind==="list"&&(!v.title.trim()||!["",...states].includes(v.status)))throw Error("請輸入清單名稱及有效狀態。");
        let nextId=draft.id;
        await commit(d=>{
          const now=new Date().toISOString();
          if(draft.kind==="board"){
            const old=d.boards.find(b=>b.id===draft.id&&b.unitId===draft.unitId);
            if(draft.id&&!old)throw Error("看板已變動，請重新開啟。");
            if(old)Object.assign(old,{title:v.title.trim(),cover:v.cover,updatedAt:now});
            else{nextId=crypto.randomUUID();d.boards.push({id:nextId,unitId:draft.unitId,title:v.title.trim(),cover:v.cover,lists:states.map(title=>({id:crypto.randomUUID(),title,status:title})),createdAt:now,updatedAt:now});}
          }else if(draft.kind==="list"){
            const b=d.boards.find(b=>b.id===draft.boardId);if(!b)throw Error("看板已變動。");b.lists=M.lists(b);const l=b.lists.find(l=>l.id===draft.id);if(!l)throw Error("清單已變動。");
            const position=Number(v.position);if(!Number.isInteger(position)||position<0||position>=b.lists.length)throw Error("請選擇有效位置。");
            l.title=v.title.trim();l.status=v.status;b.lists.splice(b.lists.indexOf(l),1);b.lists.splice(position,0,l);b.updatedAt=now;
          }else{
            let unit=d.workUnits.find(u=>u.id===draft.unitId);
            if(!unit){unit={id:draft.unitId,description:"",members:[]};d.workUnits.push(unit);}
            if(draft.kind==="unit")unit.description=v.description.trim();
            else{const old=unit.members.find(m=>m.id===draft.id);if(draft.id&&!old)throw Error("成員資料已變動，請重新開啟。");if(old)Object.assign(old,{name:v.name.trim(),note:v.note.trim()});else unit.members.push({id:crypto.randomUUID(),name:v.name.trim(),note:v.note.trim()});}
            unit.updatedAt=now;
          }
        },draft.revision);
        $("boardEditor").close();editor=null;toast("已儲存在本機");
        if(draft.kind==="board"&&!draft.id)location.hash=href(draft.unitId,"board/"+nextId);
      }catch(err){$("boardEditorError").textContent=err.message;}
    };
    function composeForm(){return `<form id="quickCompose" class="quick-compose"><textarea name="title" rows="2" required maxlength="160" aria-label="${composer.kind==="card"?"卡片名稱":"清單名稱"}" placeholder="${composer.kind==="card"?"輸入這張卡片的名稱…":"輸入清單名稱…"}">${E(composer.text)}</textarea><div><button class="primary" type="submit">${composer.kind==="card"?"新增卡片":"新增清單"}</button><button type="button" class="compose-cancel" data-board-action="cancel-compose" aria-label="取消新增">×</button></div><p id="quickError" class="error" role="alert"></p></form>`;}
    function focusComposer(){host.querySelector("#quickCompose textarea")?.focus();}
    host.addEventListener("input",e=>{if(e.target.closest("#quickCompose")&&composer)composer.text=e.target.value;});
    host.addEventListener("keydown",e=>{if(e.target.closest("#quickCompose")&&composer){if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.closest("form").requestSubmit();}if(e.key==="Escape"){composer=null;render();}}});
    host.addEventListener("submit",async e=>{
      if(e.target.id!=="quickCompose")return;e.preventDefault();if(!composer)return;
      const title=composer.text.trim(), draft={...composer}, boardId=current.boardId;if(!title)return;
      try{await commit(d=>{
        const b=d.boards.find(b=>b.id===boardId);if(!b)throw Error("看板已變動。");const now=new Date().toISOString();
        if(draft.kind==="list"){b.lists=M.lists(b);b.lists.push({id:crypto.randomUUID(),title,status:""});b.updatedAt=now;}
        else{const l=M.lists(b).find(l=>l.id===draft.listId);if(!l)throw Error("清單已變動。");const status=l.status||states[0], owner=current.unit.name;d.tasks.push({id:crypto.randomUUID(),title,owner,status,date:"",notes:"",boardId:b.id,boardListId:l.id,boardOrder:M.cards(d,b,l.id).reduce((max,t)=>Math.max(max,t.boardOrder??0),-1)+1,createdAt:now,updatedAt:now,history:[{at:now,by:identity.identity,title,status,date:"",notes:"",boardId:b.id,boardListId:l.id}]});}
      },draft.revision);composer={...draft,text:"",revision:getData().revision};render();focusComposer();}
      catch(err){$("quickError").textContent=err.message;}
    });
    host.addEventListener("click",e=>{
      const b=e.target.closest("[data-board-action]");if(!b||!current)return;
      const action=b.dataset.boardAction;
      if(action==="create-board"||action==="edit-board")edit("board",b.dataset.id);
      if(action==="create-member"||action==="edit-member")edit("member",b.dataset.id);
      if(action==="edit-unit")edit("unit");
      if(action==="edit-list")edit("list",b.dataset.id);
      if(action==="compose-card"||action==="compose-list"){
        if(composer?.text.trim()&&!confirm("尚未新增的內容要放棄嗎？"))return;
        composer={kind:action==="compose-card"?"card":"list",listId:b.dataset.id||"",text:"",revision:getData().revision};render();focusComposer();
      }
      if(action==="cancel-compose"){composer=null;render();}
      if(action==="card-up"||action==="card-down"){
        const board=getData().boards.find(b=>b.id===current.boardId), task=getData().tasks.find(t=>t.id===b.dataset.id);if(!board||!task)return;
        const list=M.listFor(board,task), cards=M.cards(getData(),board,list.id), i=cards.indexOf(task);
        if(action==="card-up"&&i>0)moveTask(task.id,list.id,cards[i-1].id);
        if(action==="card-down"&&i<cards.length-1)moveTask(task.id,list.id,cards[i+2]?.id||"");
      }
    });
    function animatePositions(before){
      if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
      host.querySelectorAll("[data-drag-task]").forEach(el=>{const old=before.get(el.dataset.dragTask);if(!old)return;const rect=el.getBoundingClientRect(),x=old.x-rect.x,y=old.y-rect.y;if(x||y)el.animate([{transform:`translate(${x}px,${y}px)`},{transform:"translate(0,0)"}],{duration:180,easing:"cubic-bezier(.2,.8,.2,1)"});});
    }
    async function moveTask(id,listId,beforeId=""){
      if(!current)return;
      const positions=new Map([...host.querySelectorAll("[data-drag-task]")].map(el=>[el.dataset.dragTask,el.getBoundingClientRect()]));
      try{await commit(d=>M.move(d,current.boardId,id,listId,beforeId,identity.identity));animatePositions(positions);toast("卡片位置已儲存");}catch(err){toast(err.message);render();}
    }
    host.addEventListener("change",e=>{if(e.target.matches("[data-move-task]"))moveTask(e.target.dataset.moveTask,e.target.value);});
    let dragged=null, drop=null;
    const clearDrop=()=>host.querySelectorAll(".drop-before,.drop-after,.drop-column").forEach(el=>el.classList.remove("drop-before","drop-after","drop-column"));
    host.addEventListener("dragstart",e=>{
      const card=e.target.closest("[data-drag-task]"),list=e.target.closest("[data-drag-list]");if(!card&&!list||e.target.closest("select,summary"))return;
      dragged={kind:card?"card":"list",id:card?card.dataset.dragTask:list.dataset.dragList};e.dataTransfer.setData("text/plain",dragged.id);e.dataTransfer.effectAllowed="move";
      requestAnimationFrame(()=>{(card||list)?.classList.add("dragging");});
    });
    host.addEventListener("dragover",e=>{
      const col=e.target.closest("[data-list-id]");if(!col||!dragged)return;e.preventDefault();e.dataTransfer.dropEffect="move";clearDrop();
      const scroll=host.querySelector(".kanban-scroll"), rect=scroll.getBoundingClientRect();if(e.clientX>rect.right-65)scroll.scrollLeft+=18;else if(e.clientX<rect.left+65)scroll.scrollLeft-=18;
      if(dragged.kind==="list"){col.classList.add("drop-column");drop={listId:col.dataset.listId};return;}
      const candidates=[...col.querySelectorAll("[data-drag-task]")].filter(c=>c.dataset.dragTask!==dragged.id), before=candidates.find(c=>{const r=c.getBoundingClientRect();return e.clientY<r.top+r.height/2;});
      if(before)before.classList.add("drop-before");else if(candidates.length)candidates.at(-1).classList.add("drop-after");else col.classList.add("drop-column");
      drop={listId:col.dataset.listId,beforeId:before?.dataset.dragTask||""};
    });
    host.addEventListener("drop",async e=>{
      if(!dragged||!drop||!e.target.closest("[data-list-id]"))return;e.preventDefault();clearDrop();
      if(dragged.kind==="card")moveTask(dragged.id,drop.listId,drop.beforeId);
      else if(dragged.id!==drop.listId)try{const id=dragged.id,target=drop.listId;await commit(d=>{const b=d.boards.find(b=>b.id===current.boardId);if(!b)throw Error("看板已變動。");b.lists=M.lists(b);const from=b.lists.findIndex(l=>l.id===id),to=b.lists.findIndex(l=>l.id===target);if(from<0||to<0)throw Error("清單已變動。");const [l]=b.lists.splice(from,1);b.lists.splice(to,0,l);b.updatedAt=new Date().toISOString();});}catch(err){toast(err.message);}
      dragged=null;drop=null;
    });
    host.addEventListener("dragend",()=>{dragged=null;drop=null;clearDrop();host.querySelectorAll(".dragging").forEach(c=>c.classList.remove("dragging"));});
    initNav();
    return {parse,title,render,select(next){if(next&&!current)document.getElementById("workspacesNav").open=true;if(current?.unit.id!==next?.unit.id)search="";if(current?.boardId!==next?.boardId){if(current?.boardId){if(composer?.text.trim())drafts.set(current.boardId,composer);else drafts.delete(current.boardId);}composer=next?.boardId?drafts.get(next.boardId)||null:null;if(next?.boardId)drafts.delete(next.boardId);}current=next;render();},dirty:()=>!!editor?.dirty||!!composer?.text.trim()||drafts.size>0,storageChanged(){if(composer&&$("quickError"))$("quickError").textContent="另一分頁更新了資料。請保留內容並重新開啟新增欄核對。";if(editor)$("boardEditorError").textContent="另一分頁更新了資料。輸入已保留，請重新開啟後核對再儲存。";}};
  }});
})();
