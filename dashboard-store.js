"use strict";
(() => {
  const KEY="fulian-chair-rebuild-dashboard-v1";
  const empty=()=>({version:1,revision:0,tasks:[],meetings:[],messages:[],links:[],read:[],boards:[],workUnits:[]});
  const validateBoards=data=>{
    for(const key of ["boards","workUnits"]){
      if(!Array.isArray(data[key]))throw Error("工作單位資料格式不符，已保留原內容。");
      const ids=new Set();for(const item of data[key]){if(!item||typeof item.id!=="string"||!item.id||ids.has(item.id))throw Error("工作單位資料不完整，已保留原內容。");ids.add(item.id);}
    }
    const units=["chair","vice","finance","education","mentor","activity","reception","growth"];
    for(const b of data.boards)if(!units.includes(b.unitId)||typeof b.title!=="string"||!b.title.trim()||!["wine","ocean","forest","sunset","lavender","slate"].includes(b.cover))throw Error("看板資料格式不符，已保留原內容。");
    for(const b of data.boards)if(b.lists!==undefined){
      if(!Array.isArray(b.lists)||!b.lists.length)throw Error("看板清單格式不符，已保留原內容。");
      const ids=new Set();for(const l of b.lists){if(!l||typeof l.id!=="string"||!l.id||ids.has(l.id)||typeof l.title!=="string"||!l.title.trim()||!["","未開始","進行中","需協助","已完成"].includes(l.status))throw Error("看板清單格式不符，已保留原內容。");ids.add(l.id);}
    }
    for(const u of data.workUnits){
      if(!units.includes(u.id)||typeof u.description!=="string"||!Array.isArray(u.members))throw Error("單位設定格式不符，已保留原內容。");
      const ids=new Set();for(const m of u.members){if(!m||typeof m.id!=="string"||ids.has(m.id)||typeof m.name!=="string"||!m.name.trim()||typeof m.note!=="string")throw Error("單位成員資料格式不符，已保留原內容。");ids.add(m.id);}
    }
    for(const t of data.tasks)if(t.boardId&&(!data.boards.some(b=>b.id===t.boardId)||!["未開始","進行中","需協助","已完成"].includes(t.status)))throw Error("工作看板連結不完整，已保留原內容。");
    for(const t of data.tasks)if(t.boardId){const b=data.boards.find(b=>b.id===t.boardId);if(t.boardListId&&b.lists&&!b.lists.some(l=>l.id===t.boardListId)||t.boardOrder!==undefined&&(!Number.isSafeInteger(t.boardOrder)||t.boardOrder<0))throw Error("卡片位置資料不完整，已保留原內容。");}
  };
  const validateConsensus=data=>{if(window.ChairConsensus)window.ChairConsensus.validate(data);else if(data.preMeetingSchedule!==undefined||data.meetings.some(m=>m.agenda?.sections.some(s=>s.events!==undefined||s.schedule!==undefined)))throw Error('共識設定模組尚未載入，已停止寫入。');};
  const validateKpi=data=>{if(data.termGoals!==undefined){if(!window.ChairTermKpi)throw Error("KPI 模組尚未載入，已停止寫入。");window.ChairTermKpi.validateAll(data);}};
  const validatePower=data=>{for(const m of data.meetings){if(m.powerOfOne!==undefined){if(!window.ChairPowerOfOne)throw Error("Power of One 模組尚未載入，已停止寫入。");window.ChairPowerOfOne.validate(m.powerOfOne);}}};
  const validateMeetings=data=>{if(data.meetings.some(m=>m.agenda!==undefined||m.termKpi!==undefined||m.history?.some(h=>h.termKpi!==undefined))||data.tasks.some(t=>t.sourceEntryId)){if(!window.ChairMeetingModel)throw Error("會議模組尚未載入，已停止寫入。");window.ChairMeetingModel.validate(data);}};
  const read=()=>{
    const raw=localStorage.getItem(KEY);if(raw===null)return empty();
    let data;try{data=JSON.parse(raw);}catch{throw Error("本機資料無法讀取，已停止寫入並保留原內容。");}
    if(data?.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||!["tasks","meetings","messages","links","read"].every(k=>Array.isArray(data[k])))throw Error("本機資料格式不符，已保留原內容，請先匯出備份。");
    for(const key of ["tasks","meetings","messages","links"]){const ids=new Set();for(const item of data[key]){if(!item||typeof item.id!=="string"||ids.has(item.id))throw Error("本機資料不完整，已停止寫入。");ids.add(item.id);}}
    // Additive v1 fields: old records remain unassigned; reads do not write storage.
    if(!Object.hasOwn(data,"boards"))data.boards=[];
    if(!Object.hasOwn(data,"workUnits"))data.workUnits=[];
    validateBoards(data);validateConsensus(data);validateMeetings(data);validatePower(data);validateKpi(data);if(data.tasks.some(t=>t.card!==undefined)){if(!window.ChairCardModel)throw Error("卡片資料模組尚未載入，已停止寫入。");window.ChairCardModel.validateAll(data);}return data;
  };
  window.ChairData = Object.freeze({KEY,empty,read,
    save(change,revision){const old=read();if(old.revision!==revision)throw Error("另一個分頁已更新資料。請先重新整理並核對；目前輸入已保留。");const next=structuredClone(old);change(next);validateBoards(next);validateConsensus(next);validateMeetings(next);validatePower(next);validateKpi(next);if(next.tasks.some(t=>t.card!==undefined)){if(!window.ChairCardModel)throw Error("卡片資料模組尚未載入，已停止寫入。");window.ChairCardModel.validateAll(next);}next.revision=old.revision+1;localStorage.setItem(KEY,JSON.stringify(next));return next;},
    raw(){return localStorage.getItem(KEY)||JSON.stringify(empty());}
  });
})();
