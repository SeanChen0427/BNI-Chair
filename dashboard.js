"use strict";
(async () => {
  if(window.ChairAuth?.enabled){try{await ChairAuth.restore();}catch(e){const alert=document.getElementById('storageAlert');alert.hidden=false;alert.textContent=e.message+' ';const retry=document.createElement('a');retry.href='index.html';retry.textContent='返回登入';alert.append(retry);return;}}
  const I=PreviewIdentity, S=ChairData, C=ChairCalendar, identity=I.get();
  if(!identity){location.replace("index.html");return;}
  if(window.ChairAuth?.enabled)ChairMembers.load();
  const $=id=>document.getElementById(id), E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const roles=["主席",...I.core], taskStates=ChairBoardModel.states, meetingStates=["準備中","待追蹤","已結束"];
  const today=C.iso(new Date()), titleMap={home:"主頁儀表板",tasks:"工作案件",meetings:"會議案件",meeting:"會議紀錄",calendar:"工作月曆",members:"會員狀態",resources:"常用資源",updates:"系統更新",settings:"系統設定",units:"各執掌工作區"};
  let data=S.empty(), blocked=false, route="home", month=today.slice(0,7), day=today, filter="pending", editorState=null;
  let activeHash="", meetingReturn={hash:"#meetings",scroll:0};
  function toast(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("toast").hidden=true,3500);}
  function storageError(error){blocked=true;$("storageAlert").hidden=false;$("storageAlert").textContent=error.message;}
  try{data=S.read();}catch(e){storageError(e);}
  function commit(change,revision=data.revision){if(blocked)throw Error("資料讀取異常，已停止寫入。請到系統設定匯出備份。");const next=S.save(change,revision);data=next;render();}
  document.querySelectorAll("[data-identity]").forEach(el=>el.textContent=identity.identity);
  document.querySelectorAll("[data-role]").forEach(el=>el.textContent=I.roles[identity.role]);
  // Repeated role labels are unnecessary for the chair/maintenance preview identity.
  if(identity.identity===I.roles[identity.role])document.querySelectorAll(".role-detail").forEach(el=>el.hidden=true);
  const byDate=(a,b)=>(a.date||"9999").localeCompare(b.date||"9999")||String(b.updatedAt||"").localeCompare(String(a.updatedAt||""));
  const stamp=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?"":date.toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});};
  const dateText=value=>value?value.replaceAll("-","/"):"日期待定";
  const empty=(title,detail="")=>`<div class="empty-state"><strong>${E(title)}</strong>${E(detail)}</div>`;
  const pill=s=>`<span class="pill ${s==="需協助"||s==="待追蹤"?"help":s==="已完成"||s==="已結束"?"done":s==="進行中"?"progress":""}">${E(s)}</span>`;
  let powerDay="";
  function renderPower(){
    powerDay=ChairPowerOfOne.today();
    const g=ChairPowerOfOne.groups(data.meetings),url=m=>"#meetings/"+encodeURIComponent(m.id)+"?view=power";
    const card=({meeting:m,power:p},label)=>`<article class="power-card"><div class="power-meta"><span>${label}</span><time>${E(dateText(p.start))} — ${E(dateText(p.end))}</time></div><h3>${E(p.title)}</h3><p class="power-action">${E(p.action)}</p><a class="power-source" data-power-meeting="${E(m.id)}" href="${url(m)}">${E(m.title)} · 查看設定與會議 ↗</a></article>`;
    const past=g.past.map(({meeting:m,power:p})=>`<a class="power-past" data-power-meeting="${E(m.id)}" href="${url(m)}"><strong>${E(p.title)}</strong><span>${E(dateText(p.start))} — ${E(dateText(p.end))} ↗</span></a>`).join('');
    $("powerOfOnePanel").innerHTML=`<div class="power-head"><h2>本期 Power of One</h2><div><a href="#meetings">會議設定</a><button type="button" data-power-new>＋ 新增設定</button></div></div>${g.current.length?g.current.map(r=>card(r,'進行中')).join(''):'<p class="power-empty">目前沒有進行中的 Power of One。</p>'}${g.upcoming.length?`<details class="power-archive" ${!g.current.length?'open':''}><summary>即將開始 · ${g.upcoming.length}</summary>${g.upcoming.map(r=>card(r,'即將開始')).join('')}</details>`:''}${g.past.length?`<details class="power-archive"><summary>過往設定 · ${g.past.length}</summary>${past}</details>`:''}`;
    $("powerOfOnePanel").querySelectorAll('[data-power-meeting]').forEach(a=>a.onclick=e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();openMeeting(a.dataset.powerMeeting,{view:'power'});});
    $("powerOfOnePanel").querySelector('[data-power-new]').onclick=()=>openMeeting('',{view:'power'});
    homeLayout.refresh();
  }
  function renderMessages(){
    $("messageList").innerHTML=data.messages.length?[...data.messages].reverse().map(m=>`<article class="announcement-item"><span class="announcement-avatar" aria-hidden="true">${E(m.author?.slice(0,1))}</span><div><div class="announcement-meta"><strong>${E(m.author)}</strong><time>${E(stamp(m.createdAt))}</time></div><p>${E(m.text)}</p></div></article>`).join(""):empty("還沒有留言","公告、提醒與交接資訊會留在這裡。");
  }
  function row(item,kind){const source=kind==="task"&&item.sourceId?data.meetings.find(m=>m.id===item.sourceId):null;return `<article class="record-row"><div class="record-title"><strong>${E(item.title)}</strong><small>${E(source?"來自："+source.title:kind==="meeting"?item.type:item.notes?.slice(0,60)||"")}</small></div>${pill(item.status)}<span class="record-owner">${E(item.owner||"尚未指定")}</span><time class="${item.date&&item.date<today&&!['已完成','已結束'].includes(item.status)?"overdue":""}">${E(dateText(item.date))}</time><button data-edit="${kind}" data-id="${E(item.id)}">開啟</button></article>`;}
  function renderLists(){
    const query=$("taskSearch").value.trim().toLowerCase();
    const tasks=data.tasks.filter(t=>(filter==="all"||filter==="done"&&t.status==="已完成"||filter==="help"&&t.status==="需協助"||filter==="mine"&&(t.owner===identity.identity||t.collaborationUnits?.includes(ChairBoards.units.find(u=>u.name===identity.identity)?.id))&&t.status!=="已完成"||filter==="pending"&&t.status!=="已完成")&&[t.title,t.owner,t.notes].join(" ").toLowerCase().includes(query)).sort(byDate);
    $("taskList").innerHTML=tasks.length?`<div class="record-header"><span>工作</span><span>狀態</span><span>負責職務</span><span>日期</span><span>下一步</span></div>`+tasks.map(t=>row(t,"task")).join(""):empty(data.tasks.length?"沒有符合的工作":"還沒有工作案件",data.tasks.length?"可切換篩選或搜尋其他關鍵字。":"從新增工作開始安排。");
    const mq=$("meetingSearch").value.trim().toLowerCase(), mf=$("meetingFilter").value;
    const meetings=data.meetings.filter(m=>(mf==="all"||mf==="done"&&m.status==="已結束"||mf==="follow"&&m.status==="待追蹤"||mf==="pending"&&m.status!=="已結束")&&[m.title,m.owner,m.notes,...(m.agenda?.sections.flatMap(s=>[s.title,...s.items.map(i=>i.text+" "+i.tags.join(" "))])||[])].join(" ").toLowerCase().includes(mq)).sort(byDate);
    $("meetingList").innerHTML=meetings.length?`<div class="record-header"><span>會議</span><span>狀態</span><span>召集職務</span><span>會議日期</span><span>下一步</span></div>`+meetings.map(m=>row(m,"meeting")).join(""):empty(data.meetings.length?"沒有符合的會議":"還沒有會議案件",data.meetings.length?"可切換篩選或搜尋其他關鍵字。":"先建立會議，留下議程與紀錄。");
  }
  function calendarEntries(date){return C.forDate(data,date);}
  function renderCalendar(){
    const [year,m]=month.split("-").map(Number);$("calendarTitle").textContent=`${year} 年 ${m} 月`;
    $("calendarGrid").innerHTML=["日","一","二","三","四","五","六"].map(w=>`<div class="weekday">${w}</div>`).join("")+C.days(month).map(d=>{const entries=calendarEntries(d.date);return `<button class="calendar-day ${d.inside?"":"outside"} ${d.date===day?"selected":""} ${d.date===today?"today":""}" data-day="${d.date}" aria-label="${d.date}，${entries.length}項安排" aria-pressed="${d.date===day}"><span class="day-number">${d.day}</span>${entries.slice(0,2).map(e=>`<span class="day-tag ${e.kind} ${e.status==='休會'?'cancelled':''}" data-calendar-kind="${e.kind}">${E(e.title)}</span>`).join("")}${entries.length>2?`<span class="day-more">＋${entries.length-2} 項</span>`:""}</button>`;}).join("");
    $("dayTitle").textContent=dateText(day);const entries=calendarEntries(day);
    $("dayList").innerHTML=entries.length?entries.map(e=>e.kind==="activity"?`<button class="agenda-entry" data-calendar-kind="activity" data-activity-source="${E(e.sourceId)}" data-activity-section="${E(e.sectionId)}"><strong>${E(e.title)}</strong><small>活動 · ${E([e.startTime,e.endTime].filter(Boolean).join("–")||"時間待定")} · 查看來源議程</small></button>`:e.kind==="training"?`<button class="agenda-entry" data-calendar-kind="training" data-training="${E(e.id)}"><strong>${E(e.title)}</strong><small>培訓 · ${E(e.time||"時間待補")}</small></button>`:e.kind==="regular"?`<div class="agenda-entry ${e.status==='休會'?'cancelled':''}" data-calendar-kind="regular"><strong>${E(e.title)}</strong><small>${E(e.note)} · ${E(e.status)}</small></div>`:`<button class="agenda-entry" data-calendar-kind="${e.kind}" data-edit="${e.kind}" data-id="${E(e.id)}"><strong>${E(e.title)}</strong><small>${e.kind==="task"?(e.dateKind==="regular"?"例會安排":e.dateKind==="execution"?"執行日期":"工作期限"):"會議"} · ${E(e.status)}${e.startTime?" · "+E([e.startTime,e.endTime].filter(Boolean).join("–")):""} · ${E(e.owner||"尚未指定")}</small></button>`).join(""):empty("當日沒有安排");
    $("trainingCatalogStatus").textContent=window.ChairTrainingSnapshot?`培訓課表：${window.ChairTrainingSnapshot.capturedOn.replaceAll("-","/")} 查核，尚未自動同步。`:"培訓課表暫時無法載入，目前僅顯示已指定的重要日期。";
    const pending=C.entries(data).filter(e=>!e.date).length;$("unscheduled").textContent=pending?`${pending} 件案件尚未排日期，可從工作／會議案件繼續安排。`:"日期會隨工作期限與會議安排更新。";
  }
  function notices(){return [...data.tasks.filter(t=>t.status!=="已完成"&&(t.status==="需協助"||t.date&&t.date<=today)).map(t=>({...t,kind:"task",reason:t.status==="需協助"?"需要協助":t.dateKind&&t.dateKind!=="deadline"?(t.date<today?"安排日期已過，待更新":"今天執行"):t.date<today?"工作已逾期":"工作今天到期"})),...data.meetings.filter(m=>m.status==="待追蹤"||m.status!=="已結束"&&m.date===today).map(m=>({...m,kind:"meeting",reason:m.status==="待追蹤"?"會議待追蹤":"今天有會議"}))].map(n=>({...n,key:`${n.kind}:${n.id}:${n.status}:${n.date}:${n.reason}`})).filter(n=>!data.read.includes(n.key));}
  function renderNotices(){const ns=notices();$("noticeCount").textContent=ns.length;$("noticeCount").hidden=!ns.length;$("readAll").disabled=!ns.length;$("notificationList").innerHTML=ns.length?ns.map(n=>`<button class="notice-item" data-edit="${n.kind}" data-id="${E(n.id)}"><strong>${E(n.title)}</strong><small>${E(n.reason)}</small></button>`).join(""):empty("目前沒有新提醒");}
  function safeURL(value){try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  function renderResources(){$("resourceList").innerHTML=data.links.length?data.links.map(l=>{const url=safeURL(l.url);return `<article class="resource-item"><div>${url?`<a href="${E(url)}" target="_blank" rel="noopener noreferrer">${E(l.title)} ↗</a>`:`<strong>${E(l.title)}</strong>`}<small>${E(l.notes||"")}</small></div><button class="text-button" data-edit="link" data-id="${E(l.id)}">編輯</button></article>`;}).join(""):empty("還沒有常用資源","可以加入團隊常用的文件與連結。");}
  function render(){
    const pending=data.tasks.filter(t=>t.status!=="已完成").length, meetings=data.meetings.filter(m=>m.status==="準備中").length;
    $("taskCount").textContent=pending;$("meetingCount").textContent=meetings;$("helpCount").textContent=data.tasks.filter(t=>t.status==="需協助").length;
    $("navTasks").textContent=pending;$("navMeetings").textContent=data.meetings.filter(m=>m.status!=="已結束").length;
    $("overviewPeriod").textContent=`${today.slice(0,4)} 年 ${Number(today.slice(5,7))} 月 · 工作保存在此瀏覽器`;
    termKpi.render();renderPower();renderMessages();renderLists();renderCalendar();renderNotices();renderResources();boards.render();homeLayout.refresh();
  }
  const homeLayout=ChairHomeLayout.create({identity,toast});
  window.addEventListener('chair-members-render',()=>homeLayout.refresh());
  const termKpi=ChairTermKpiUI.create({getData:()=>data,commit,identity,escape:E,toast});
  const deletion=ChairDeletion.create({getData:()=>data,commit});
  const boards=ChairBoards.create({getData:()=>data,commit,deletion,openTask:prefill=>openEditor("task","",prefill),identity,escape:E,toast});
  const cardDetails=ChairCardDetails.create({getData:()=>data,commit,deletion,identity,escape:E,toast});
  const meetingWorkspace=ChairMeetingWorkspace.create({getData:()=>data,commit,identity,escape:E,toast,openTask:id=>openEditor("task",id),onCreateMeeting:prefill=>openMeeting("",prefill),onSourceMeeting:(id,sectionId)=>openMeeting(id,{sectionId}),onBack:()=>navigate(meetingReturn.hash),onSaved:id=>{if(parseMeetingRoute(activeHash)?.id==="new"){history.replaceState(null,"","#meetings/"+encodeURIComponent(id)+(parseMeetingRoute(activeHash)?.params.get("view")==="power"?"?view=power":""));activeHash=location.hash;}}});
  function closeMenu(){$("sidebar").classList.remove("open");$("scrim").classList.remove("show");syncMenuLabel();}
  function syncMenuLabel(){const mobile=matchMedia("(max-width:800px)").matches,open=mobile?$("sidebar").classList.contains("open"):!$("appShell").classList.contains("compact");$("toggleSidebar").setAttribute("aria-expanded",String(open));$("toggleSidebar").setAttribute("aria-label",open?"收起工具列":"展開工具列");$("toggleSidebar").title=open?"收起工具列":"展開工具列";$("toggleSidebar").querySelector(".sidebar-toggle-label").textContent=open?"收起選單":"展開選單";if(!open&&$("sidebar").contains(document.activeElement))$("toggleSidebar").focus({preventScroll:true});$("sidebar").inert=!open;$("sidebar").setAttribute("aria-hidden",String(!open));}
  $("toggleSidebar").onclick=()=>{if(matchMedia("(max-width:800px)").matches){$("appShell").classList.remove("compact");$("sidebar").classList.toggle("open");$("scrim").classList.toggle("show",$("sidebar").classList.contains("open"));}else{$("appShell").classList.toggle("compact");}syncMenuLabel();};
  $("closeMenu").onclick=closeMenu;$("scrim").onclick=closeMenu;
  matchMedia("(max-width:800px)").addEventListener("change",()=>{closeMenu();syncMenuLabel();});
  function parseMeetingRoute(hash){
    const match=hash.match(/^#meetings\/([^?]+)(?:\?(.*))?$/);if(!match)return null;
    try{return {id:decodeURIComponent(match[1]),params:new URLSearchParams(match[2]||"")};}catch{return null;}
  }
  function navigate(hash){
    if(location.hash===hash)return;
    if(!termKpi.leave())return;
    if(route==="meeting"&&!meetingWorkspace.leave())return;
    location.hash=hash;
  }
  function openMeeting(id="",prefill={}){
    const params=new URLSearchParams();for(const key of ["sourceMeeting","sourceSection","type","sectionId"]){if(prefill[key])params.set(key,prefill[key]);}if(prefill.view)params.set("view",prefill.view);if(prefill.date)params.set("date",prefill.date);if(prefill.entryId)params.set("entry",prefill.entryId);
    const target="#meetings/"+encodeURIComponent(id||"new")+(params.size?"?"+params:"");
    if(route!=="meeting")meetingReturn={hash:location.hash||"#home",scroll:window.scrollY};
    navigate(target);
  }
  function changePage(){
    let nextHash=location.hash||"#home";
    if(nextHash===activeHash)return;
    if(!termKpi.leave()){history.pushState(null,"",activeHash);return;}
    if(route==="meeting"&&!meetingWorkspace.leave()){history.pushState(null,"",activeHash);return;}
    let meetingRoute=parseMeetingRoute(nextHash);
    if(meetingRoute&&(blocked||meetingRoute.id!=="new"&&!data.meetings.some(m=>m.id===meetingRoute.id))){
      toast(blocked?"資料異常，請先匯出備份。":"找不到這場會議，已返回會議列表。");meetingRoute=null;nextHash="#meetings";history.replaceState(null,"",nextHash);
    }
    const unitRoute=boards.parse(nextHash);route=meetingRoute?"meeting":unitRoute?"units":nextHash.slice(1);
    if(!Object.hasOwn(titleMap,route)||route==="units"&&!unitRoute||route==="meeting"&&!meetingRoute){route="home";nextHash="#home";history.replaceState(null,"",nextHash);}
    activeHash=nextHash;
    const sections=route==="home"?["hero","kpi","power","board","members","calendar","tasks","meetings"]:[route];
    document.querySelectorAll("[data-section]").forEach(el=>el.hidden=!sections.includes(el.dataset.section));
    $("mainContent").classList.toggle("meeting-page",!!meetingRoute);
    document.querySelectorAll(".nav-item").forEach(a=>{const active=a.hash==="#"+(meetingRoute?"meetings":route);a.classList.toggle("active",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
    $("pageName").textContent=titleMap[route];document.title=titleMap[route]+"｜富聯核心團隊";boards.select(unitRoute);
    $("help").setAttribute("aria-label",(unitRoute?boards.title():titleMap[route])+"操作教學");closeMenu();
    window.scrollTo(0,nextHash===meetingReturn.hash?meetingReturn.scroll:0);
    if(meetingRoute)meetingWorkspace.open(meetingRoute.id==="new"?"":meetingRoute.id,{view:meetingRoute.params.get("view")||"",date:meetingRoute.params.get("date")||"",entryId:meetingRoute.params.get("entry")||"",sourceMeeting:meetingRoute.params.get("sourceMeeting")||"",sourceSection:meetingRoute.params.get("sourceSection")||"",type:meetingRoute.params.get("type")||"",sectionId:meetingRoute.params.get("sectionId")||""});
    else $("mainContent").focus({preventScroll:true});
    if(route==="home")renderPower();
    homeLayout.refresh();homeLayout.setEnabled(route==="home");
  }
  window.addEventListener("hashchange",changePage);
  setInterval(()=>{if(route==="home"&&!document.hidden&&powerDay!==ChairPowerOfOne.today())renderPower();},60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&route==="home"&&powerDay!==ChairPowerOfOne.today())renderPower();});
  document.addEventListener("click",e=>{
    const link=e.target.closest('a[href^="#"]');if(!link||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    if(link.classList.contains("skip-link")){e.preventDefault();$("mainContent").focus();return;}
    if(route==="meeting"){e.preventDefault();navigate(link.hash);}
  },true);
  $("taskSearch").oninput=renderLists;$("meetingSearch").oninput=renderLists;$("meetingFilter").onchange=renderLists;
  $("taskFilters").onclick=e=>{const b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;$("taskFilters").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));renderLists();};
  $("messageInput").oninput=()=>$("messageLength").textContent=`${$("messageInput").value.length}／1000`;
  $("messageForm").onsubmit=e=>{e.preventDefault();const text=$("messageInput").value.trim();if(!text)return;try{commit(d=>d.messages.push({id:crypto.randomUUID(),text,author:identity.identity,createdAt:new Date().toISOString()}));$("messageForm").reset();$("messageLength").textContent="0／1000";toast("留言已儲存在本機");}catch(err){toast(err.message);}};
  const options=(items,value,placeholder="")=>(placeholder?`<option value="">${E(placeholder)}</option>`:"")+items.map(x=>`<option value="${E(x)}"${x===value?" selected":""}>${E(x)}</option>`).join("");
  function openEditor(kind,id="",prefill={}){
    if(blocked){toast("資料異常，請先到系統設定匯出備份。");return;}
    const collection=kind==="task"?"tasks":kind==="meeting"?"meetings":"links", existing=data[collection].find(x=>x.id===id);
    if(id&&!existing){toast("找不到這件案件，請重新整理。");return;}
    if(kind==="meeting"){openMeeting(id,prefill);return;}
    if(kind==="task"&&route==="units"&&existing?.boardId){cardDetails.open(id);return;}
    const item=existing||{title:"",owner:identity.role==="maintenance"?"":identity.identity,date:prefill.date||"",status:kind==="task"?taskStates[0]:meetingStates[0],notes:"",type:"會前會",...prefill};
    editorState={kind,id,collection,revision:data.revision,sourceId:item.sourceId||"",dirty:false,boardId:item.boardId||"",boardListId:item.boardListId||""};
    $("editorType").textContent=kind==="task"?"工作案件":kind==="meeting"?"會議案件":"常用資源";$("editorTitle").textContent=(id?"編輯":"新增")+(kind==="task"?"工作":kind==="meeting"?"會議":"連結");
    let fields=`<label class="full">${kind==="link"?"連結名稱":kind==="task"?"工作名稱":"會議名稱"}<input name="title" required maxlength="160" value="${E(item.title)}"></label>`;
    if(kind==="link")fields+=`<label class="full">網址<input name="url" type="url" required placeholder="https://" value="${E(item.url||"")}"></label>`;
    else fields+=`<label>${kind==="task"?"負責職務":"召集職務"}<select name="owner">${options(roles,item.owner,"尚未指定")}</select></label><label>${kind==="task"?(item.dateKind==="regular"?"例會場次日期":item.dateKind==="execution"?"執行日期":"工作期限"):"會議日期"}<input type="date" name="date" value="${E(item.date)}"></label><label>狀態<select name="status">${options(kind==="task"?taskStates:meetingStates,item.status)}</select></label>${kind==="meeting"?`<label>會議類型<input name="type" value="${E(item.type)}" maxlength="60" list="meetingTypes"><datalist id="meetingTypes">${["會前會","會後會","三長共識","八長共識","領頭羊會議","其他會議"].map(t=>`<option>${t}</option>`).join("")}</datalist></label>`:""}`;
    if(kind==="task"&&data.boards.length)fields+=`<label class="full">所屬看板<select name="boardId"><option value="">未放入看板</option>${data.boards.map(b=>`<option value="${E(b.id)}"${item.boardId===b.id?" selected":""}>${E(ChairBoards.units.find(u=>u.id===b.unitId)?.name)} · ${E(b.title)}</option>`).join("")}</select></label>`;
    fields+=`<label class="full">${kind==="meeting"?"議程／紀錄":kind==="task"?"進度與下一步":"備註"}<textarea name="notes" maxlength="8000" rows="5">${E(item.notes)}</textarea></label>`;
    if(kind==="task"&&item.sourceEntryId)fields+=`<div class="source-note mw-chips">${(item.meetingTags||[]).map(x=>`<span class="mw-chip purple">${E(x)}</span>`).join('')}${item.executionTime||item.executionNode?`<span class="mw-chip">${E([item.executionTime,item.executionNode].filter(Boolean).join(' · '))}</span>`:''}${(item.collaborationUnits||[]).map(id=>`<span class="mw-chip blue">${E(ChairBoards.units.find(u=>u.id===id)?.name)}</span>`).join('')}</div>`;
    if(item.sourceId){const source=data.meetings.find(m=>m.id===item.sourceId);fields+=`<div class="source-note">來源會議：${E(source?.title||"原會議")} <button type="button" data-source-meeting="${E(item.sourceId)}" data-source-entry="${E(item.sourceEntryId||'')}">查看來源議程 ↗</button></div>`;}
    if(kind==="meeting"&&id){const linked=data.tasks.filter(t=>t.sourceId===id);if(linked.length)fields+=`<div class="source-note">後續工作：${linked.map(t=>E(t.title)).join("、")}</div>`;}
    if(item.history?.length)fields+=`<details class="source-note"><summary>修改紀錄（${item.history.length}）</summary>${item.history.map(h=>`<div class="history-line">${E(stamp(h.at))} · ${E(h.by)} · ${E(h.status)} · ${E(dateText(h.date))}</div>`).join("")}</details>`;
    $("editor").classList.toggle("board-card-editor",kind==="task"&&route==="units"&&!!item.boardId);
    if(kind==="task"&&route==="units"&&item.boardId){$("editorType").textContent="工作卡片 · "+(data.boards.find(b=>b.id===item.boardId)?.title||"");$("editorTitle").textContent=item.title||"新增卡片";}
    $("editorFields").innerHTML=fields;$("editorError").textContent="";$("deleteTask").hidden=kind!=="task"||!id;$("meetingToTask").hidden=kind!=="meeting"||!id;$("editor").showModal();
  }
  function closeEditor(){if(editorState?.dirty&&!confirm("尚未儲存的修改要放棄嗎？"))return;$("editor").close();editorState=null;}
  $("deleteTask").onclick=()=>{
    if(editorState?.kind!=="task"||!editorState.id)return;
    if(editorState.dirty){$("editorError").textContent="請先儲存或取消尚未完成的修改，再刪除工作。";return;}
    const state=editorState;
    try{deletion.open({kind:"task",id:state.id,revision:state.revision,label:"工作",after(){
      $("editor").close();editorState=null;toast("工作已刪除，清單、月曆與看板已同步更新");
    }});}catch(error){$("editorError").textContent=error.message;}
  };
  $("closeEditor").onclick=closeEditor;$("cancelEditor").onclick=closeEditor;
  $("editor").addEventListener("cancel",e=>{e.preventDefault();closeEditor();});
  $("editorForm").oninput=()=>{if(editorState)editorState.dirty=true;};
  $("editorForm").onsubmit=e=>{e.preventDefault();if(!editorState)return;const values=Object.fromEntries(new FormData(e.currentTarget));values.title=values.title.trim();if(!values.title){$("editorError").textContent="請輸入名稱。";return;}
    const state={...editorState};try{if(state.kind==="link"){const url=safeURL(values.url);if(!url)throw Error("請使用 http 或 https 網址，且不要在網址內填入帳密。");values.url=url;}else{if(!C.validDate(values.date))throw Error("請輸入有效日期。");if(values.owner&&!roles.includes(values.owner))throw Error("請選擇有效職務。");if(!(state.kind==="task"?taskStates:meetingStates).includes(values.status))throw Error("請選擇有效狀態。");}
      if(state.kind==="task"&&values.boardId&&!data.boards.some(b=>b.id===values.boardId))throw Error("看板已變動，請重新選擇。");
      commit(d=>{const old=d[state.collection].find(x=>x.id===state.id);if(state.id&&!old)throw Error("原案件已變動，請重新核對。");const now=new Date().toISOString();const history=[...(old?.history||[]),{at:now,by:identity.identity,status:values.status||"連結更新",date:values.date||"",title:values.title,notes:values.notes}];const next={...old,...values,id:old?.id||crypto.randomUUID(),createdAt:old?.createdAt||now,updatedAt:now,history};if(state.sourceId)next.sourceId=state.sourceId;if(state.kind==="task"){if(!next.boardId){delete next.boardListId;delete next.boardOrder;}else{const board=d.boards.find(b=>b.id===next.boardId);const sameBoard=state.boardId===next.boardId;const list=sameBoard&&ChairBoardModel.lists(board).find(l=>l.id===state.boardListId);if(list&&(!list.status||list.status===next.status))next.boardListId=list.id;else next.boardListId=(ChairBoardModel.lists(board).find(l=>l.status===next.status)||ChairBoardModel.lists(board)[0]).id;if(!sameBoard||next.boardListId!==old?.boardListId)next.boardOrder=d.tasks.filter(t=>t.boardId===next.boardId&&t.boardListId===next.boardListId).reduce((max,t)=>Math.max(max,t.boardOrder??0),-1)+1;}}if(old)d[state.collection][d[state.collection].indexOf(old)]=next;else d[state.collection].push(next);},state.revision);
      $("editor").close();editorState=null;toast("已儲存");
    }catch(err){$("editorError").textContent=err.message;}
  };
  $("meetingToTask").onclick=()=>{const id=editorState?.id;if(!id)return;if(editorState.dirty){$("editorError").textContent="請先儲存這次會議修改，再安排後續工作。";return;}$("editor").close();openEditor("task","",{sourceId:id,owner:""});};
  document.addEventListener("click",e=>{const newButton=e.target.closest("[data-new]"), edit=e.target.closest("[data-edit]"),date=e.target.closest("[data-day]"),move=e.target.closest("[data-calendar-move]");
    const source=e.target.closest("[data-source-meeting]");if(source){if(editorState?.dirty){toast("請先儲存工作修改，再查看來源。");return;}$("editor").close();editorState=null;if($("cardDetail").open){if(cardDetails.dirty()){toast("請先儲存卡片修改，再查看來源。");return;}$("cardDetail").close();}openMeeting(source.dataset.sourceMeeting,{entryId:source.dataset.sourceEntry});}
    const activity=e.target.closest("[data-activity-source]");if(activity){openMeeting(activity.dataset.activitySource,{sectionId:activity.dataset.activitySection});return;}
    const training=e.target.closest("[data-training]");
    if(training){const item=C.entries(data).find(t=>t.kind==="training"&&t.id===training.dataset.training);if(item){$("trainingTitle").textContent=item.title;$("trainingContent").innerHTML=`<p>日期：${E(dateText(item.date))}${item.endDate&&item.endDate!==item.date?` 至 ${E(dateText(item.endDate))}`:""}</p><p>時間：${E(item.time||"待補")}</p><p>地點：${E(item.location||"待補")}</p><p class="muted">來源：${E(item.source)}</p>${item.sourceNote?`<p class="muted">${E(item.sourceNote)}</p>`:""}${safeURL(item.sourceUrl)?`<p><a href="${E(safeURL(item.sourceUrl))}" target="_blank" rel="noopener noreferrer">官方課程詳情 ↗</a></p>`:""}`;$("trainingDialog").showModal();}}
    if(newButton)openEditor(newButton.dataset.new);
    if(edit){$("notificationPanel").hidden=true;$("bell").setAttribute("aria-expanded","false");openEditor(edit.dataset.edit,edit.dataset.id);}
    if(date){day=date.dataset.day;month=day.slice(0,7);renderCalendar();}
    if(move){const [y,m]=month.split("-").map(Number),d=new Date(y,m-1+Number(move.dataset.calendarMove),1,12);month=C.iso(d).slice(0,7);day=month+"-01";renderCalendar();}
  });
  $("closeTraining").onclick=()=>$("trainingDialog").close();
  $("calendarToday").onclick=()=>{month=today.slice(0,7);day=today;renderCalendar();};$("dayTask").onclick=()=>openEditor("task","",{date:day});$("dayMeeting").onclick=()=>openEditor("meeting","",{date:day});$("newLink").onclick=()=>openEditor("link");
  $("bell").onclick=()=>{const open=$("notificationPanel").hidden;$("notificationPanel").hidden=!open;$("bell").setAttribute("aria-expanded",String(open));};
  document.addEventListener("click",e=>{if(!e.target.closest(".top-actions")){$("notificationPanel").hidden=true;$("bell").setAttribute("aria-expanded","false");}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeMenu();$("notificationPanel").hidden=true;$("bell").setAttribute("aria-expanded","false");}});
  $("readAll").onclick=()=>{try{const keys=notices().map(n=>n.key);commit(d=>d.read=[...new Set([...d.read,...keys])]);}catch(e){toast(e.message);}};
  const help={units:["選擇工作單位，再建立一張張有封面的看板。","看板內可原位新增卡片、自訂清單；拖曳卡片改變順序或移到其他清單。清單標示的狀態會套用到移入的工作。","點卡片可編輯原工作案件、職務與期限，月曆共用同一筆資料。卡片移動選單可供手機及鍵盤操作。","成員是本機協作名單，新增姓名不會發出邀請或開通權限。"],home:["按住區塊標題或 ⠿ 即可拖移，手機長按啟動，放開保存；系統設定可恢復預設排列。鍵盤可按空白鍵選取、上下键移動、Enter 保存、Escape 取消。","首頁本屆 KPI 可直接設定九項目標；留空顯示 —，修改後可查保存版本，目前尚未接入實績。","在會議內設定 Power of One，勾選在首頁顯示並儲存。首頁依期間呈現本期、即將開始及過往設定。","留言板可留下公告、提醒或交接內容，僅保存在目前瀏覽器。","會員狀態讀取委員會已發布分析；會員名單可展開查閱，並顯示來源期間。","工作期限與會議日期會出現在月曆。點案件可繼續更新。"],tasks:["按新增工作，填名稱後可保存；負責職務與期限可以稍後補。","用待處理、我的工作、需協助或已完成切換清單。","修改案件後按儲存，月曆與首頁同步更新，修改紀錄保留。"],meetings:["新增會議先選種類，再進入議程；要更換時點「更換種類」。","選會前會或會後會，切換執掌後在各議程獨立填寫；議程可增減、改名。","每筆紀錄旁可加標籤、執行日期／例會場次及協作單位；選單位即列入工作，儲存後同步各執掌工作區。","工作追蹤可更新同一筆工作的狀態；會議結束與工作完成分開。本機保存，尚無正式多人同步。"],calendar:["點日期看當日工作期限、會議、培訓及例會安排；點培訓可看詳細資訊。","從日期下方新增工作或會議，日期會先帶入；保存後才生效。","週二例會與國定假日／補假休會沿既有任期設定，例會時間未定。"],members:["此區讓核心幹部掌握分會整體紅綠燈人數與比例。","顯示目前在籍會員及最近已結束月份的已發布分析；缺少對應資料顯示 —，不當作零。"],resources:["保存常用文件或網站的連結。","只接受 http／https 網址，外部網站會在新分頁開啟。"],updates:["這裡列出新版各階段已完成及尚未接上的內容。"],settings:["匯出備份會下載此新版的本機內容，包含留言、工作、會議與資源。","登出會清除此分頁的登入；已保存在瀏覽器的工作內容仍保留。"]};
  $("help").onclick=()=>{$("helpTitle").textContent=titleMap[route]+"操作教學";$("helpContent").innerHTML=`<ul>${help[route==="meeting"?"meetings":route].map(t=>`<li>${E(t)}</li>`).join("")}</ul>`;$("helpDialog").showModal();};$("closeHelp").onclick=()=>$("helpDialog").close();$("version").onclick=()=>navigate("#updates");
  $("exportData").onclick=()=>{try{const blob=new Blob([S.raw()],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`富聯核心團隊-本機備份-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast(e.message);}};
  $("logout").onclick=()=>{if(($("messageInput").value.trim()||editorState?.dirty||boards.dirty()||cardDetails.dirty()||meetingWorkspace.dirty()||termKpi.dirty())&&!confirm("仍有未儲存內容，確定登出嗎？"))return;I.logout();};
  window.addEventListener("beforeunload",e=>{if($("messageInput").value.trim()||editorState?.dirty||boards.dirty()||cardDetails.dirty()||meetingWorkspace.dirty()||termKpi.dirty()){e.preventDefault();e.returnValue="";}});
  window.addEventListener("pageshow",()=>{if(!I.get())location.replace("index.html");});
  $("editor").addEventListener("close",()=>{if(route==="meeting")meetingWorkspace.refresh();});
  window.addEventListener("storage",e=>{if(e.key===S.KEY){try{data=S.read();render();boards.storageChanged();cardDetails.storageChanged();meetingWorkspace.storageChanged();termKpi.storageChanged();if(editorState)$("editorError").textContent="另一分頁更新了資料。目前輸入已保留，儲存前請重新核對。";}catch(err){storageError(err);}}});
  render();changePage();syncMenuLabel();
})();
