"use strict";
(() => {
  const units=[['chair','主席'],['vice','副主席'],['finance','秘書財務'],['growth','成長協調員'],['mentor','導師協調員'],['reception','接待組長'],['activity','活動協調員'],['education','教育協調員']].map(([id,name])=>({id,name}));
  const headings={chair:['下週25秒主題／主角','培訓','其他'],vice:['關懷名單','規範宣導','新申請','新宣誓名單','續約進度','委員紅綠燈狀況','其他'],finance:['續約／新申請','填單及繳費進度','來賓追蹤','其他'],growth:['產業交流聚／組聚回饋','BNI Game','內／外部見證','其他'],mentor:['0615狀況','畢業名單','新會員72H','下週0615分享','導師計劃進度','導生重點培訓','其他'],reception:['畢業名單確認','宣誓名單確認','例會後分房','其他'],activity:['培訓行事曆','公告','重點培訓','BNI Game','其他'],education:['3分教培進度','簡報人來賓','內／外部見證','簡報小組內訓','簡報者EDM','簡報者演練','其他']};
  const id=()=>crypto.randomUUID(), item=()=>({id:id(),text:'',tags:[],date:'',dateKind:'execution',time:'',node:'',units:[],work:false});
  const section=(unitId,title)=>({id:id(),unitId,title,items:[item()]});
  const consensusType='核心共識會議';
  const types=['會前會','會後會',consensusType,'三長共識','八長共識','領頭羊會議','其他會議'];
  const consensusTopics=[
    {title:'本屆重要活動時間設定',guide:'BOD、Power Day、週年慶等。'},
    {title:'本屆分會 KPI 目標',guide:'年度分會目標、每月來賓、首年留員率、每月1對1、總體留員率、培訓率、每月引薦單數、綠燈會員比例、每月引薦金額。'},
    {title:'三大重點與年度執行規劃',guide:''},
    {title:'Power of One 設定',guide:''},
    {title:'各執掌的看見與職務目標',guide:'主席、副主席、秘書財務、教育協調員、導師協調員、活動協調員、接待組長、成長協調員。各執掌分別填寫看見與職務目標。'},
    {title:'交接會議議程',guide:''},
    {title:'會前會會議時間設定',guide:''}
  ];
  // Reorder only the recognised topics; retain custom slots, IDs and content.
  function orderedSections(m){
    const sections=m.agenda?.sections||[];
    if(m.type!==consensusType)return [...sections];
    const kinds=['activities','termKpi','strategy','power','roleGoals','handover','preSchedule'];
    const rank=s=>s.kind?kinds.indexOf(s.kind):consensusTopics.findIndex(t=>t.title===s.title);
    const known=sections.filter(s=>rank(s)>=0).sort((a,b)=>rank(a)-rank(b));
    let n=0;return sections.map(s=>rank(s)>=0?known[n++]:s);
  }
  const roleTopic='各執掌的看見與職務目標';
  const roleItems=()=>units.map(u=>({...item(),roleId:u.id}));
  const template=type=>({version:1,...(type===consensusType?{consensusVersion:2}:{}),sections:type===consensusType?consensusTopics.map(t=>({...section('chair',t.title),...(t.title==='本屆分會 KPI 目標'?{kind:'termKpi'}:t.title===roleTopic?{kind:'roleGoals',items:roleItems()}:t.title==='三大重點與年度執行規劃'?{kind:'strategy'}:{})})):units.flatMap(u=>(type==='會前會'?headings[u.id]:type==='會後會'?(u.id==='finance'?['來賓狀況與跟進','例會回饋','後續安排']:['例會回饋','改善事項','後續安排']):['討論事項']).map(t=>section(u.id,t)))});
  const dateOK=s=>typeof s==='string'&&(!s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s);
  function validate(data){
    const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
    const fail=()=>{throw Error('會議紀錄格式不符，已保留原資料。');}, refs=new Set();
    for(const m of data.meetings){for(const v of [m,...(m.history||[])])for(const s of v.agenda?.sections||[])if(s.strategy!==undefined){if(!window.ChairStrategy)throw Error('年度規劃模組尚未載入，已停止寫入。');window.ChairStrategy.validate(s.strategy);}for(const v of [m,...(m.history||[])])if(v.termKpi!==undefined){if(!window.ChairTermKpi||v.termKpi?.termId!==window.ChairTermKpi.term.id)fail();window.ChairTermKpi.validateValues(v.termKpi.values);}if(m.agenda===undefined)continue;const a=m.agenda;if(a?.version!==1||a.consensusVersion!==undefined&&a.consensusVersion!==2||!Array.isArray(a.sections))fail();const seen=new Set();
      for(const s of a.sections){if(!s||!safeId(s.id)||seen.has(s.id)||!units.some(u=>u.id===s.unitId)||typeof s.title!=='string'||!s.title.trim()||s.title.length>160||!Array.isArray(s.items))fail();seen.add(s.id);
        for(const i of s.items){if(!i||i.roleId!==undefined&&!units.some(u=>u.id===i.roleId)||!safeId(i.id)||seen.has(i.id)||typeof i.text!=='string'||i.text.length>8000||!Array.isArray(i.tags)||i.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>60)||!dateOK(i.date)||!['execution','deadline','regular'].includes(i.dateKind)||typeof i.node!=='string'||i.node.length>160||typeof i.time!=='string'||i.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time)||!Array.isArray(i.units)||new Set(i.units).size!==i.units.length||i.units.some(x=>!units.some(u=>u.id===x))||typeof i.work!=='boolean')fail();seen.add(i.id);
          if(i.taskId){const t=data.tasks.find(t=>t.id===i.taskId);if(!t||refs.has(t.id)||t.sourceId!==m.id||t.sourceEntryId!==i.id||!i.work)fail();refs.add(t.id);}
        }
      }
    }
    for(const t of data.tasks){if(t.sourceEntryId&&!refs.has(t.id))fail();if(t.collaborationUnits!==undefined&&(!Array.isArray(t.collaborationUnits)||t.collaborationUnits.some(x=>!units.some(u=>u.id===x))))fail();if(t.meetingTags!==undefined&&(!Array.isArray(t.meetingTags)||t.meetingTags.some(x=>typeof x!=='string')))fail();}
  }
  // Persist meeting + new work in one ChairData.save transaction. Untouched fields
  // on existing tasks remain live; meeting text and snapshots retain their context.
  function apply(data,draft,by,edits=new Set()){
    const m=structuredClone(draft), old=data.meetings.find(x=>x.id===m.id), now=new Date().toISOString();
    m.agenda.sections=orderedSections(m);
    if(!m.title.trim())throw Error('請填寫會議名稱。');if(!dateOK(m.date))throw Error('請選擇有效的會議日期。');
    const oldItems=old?.agenda?.sections.flatMap(s=>s.items)||[], newIds=new Set(m.agenda.sections.flatMap(s=>s.items.map(i=>i.id)));
    for(const i of oldItems)if(i.taskId&&!newIds.has(i.id))throw Error('已有工作的紀錄請保留，避免失去會議來源。');
    for(const s of m.agenda.sections)for(const i of s.items){
      const previous=oldItems.find(x=>x.id===i.id), existing=i.taskId?data.tasks.find(t=>t.id===i.taskId):null;
      if(previous?.taskId&&previous.taskId!==i.taskId)throw Error('工作來源已變動，請重新開啟會議。');
      if(i.taskId&&!existing)throw Error('來源工作已變動，請重新開啟會議。');
      if(!i.work){if(existing)throw Error('已建立的工作需保留連結。');continue;}
      if(!i.text.trim())throw Error('請先填寫需要安排的工作內容。');
      if(!i.units.length&&m.type===consensusType)throw Error('請為共識議程的工作選擇承接單位。');
      if(!i.units.length)i.units=[s.unitId];
      let t=existing;
      if(!t){t={id:id(),title:i.text.trim().slice(0,160),notes:i.text.trim(),owner:'',date:'',status:'未開始',sourceId:m.id,sourceEntryId:i.id,proposedBy:s.unitId,createdAt:now,history:[]};data.tasks.push(t);i.taskId=t.id;}
      const changed=k=>!existing||edits.has(i.id+':'+k)||JSON.stringify(i[k])!==JSON.stringify(previous?.[k]);
      let updated=!existing;
      if(changed('text')){t.title=i.text.trim().slice(0,160);updated=true;}
      if(changed('units')){t.collaborationUnits=[...i.units];t.owner=units.find(u=>u.id===i.units[0]).name;updated=true;}
      for(const [key,field] of [['date','date'],['dateKind','dateKind'],['time','executionTime'],['node','executionNode'],['tags','meetingTags']])if(changed(key)){t[field]=structuredClone(i[key]);updated=true;}
      if(updated){t.updatedAt=now;t.history=[...(t.history||[]),{at:now,by,text:'會議安排更新',title:t.title,status:t.status,date:t.date}];}
    }
    m.title=m.title.trim();m.createdAt=old?.createdAt||now;m.updatedAt=now;
    if(m.powerOfOne!==undefined){window.ChairPowerOfOne.validate(m.powerOfOne);m.powerOfOne.title=m.powerOfOne.title.trim();m.powerOfOne.action=m.powerOfOne.action.trim();}
    if(m.powerOfOneMonths!==undefined){window.ChairPowerOfOne.validateMonths(m.powerOfOneMonths);for(const p of m.powerOfOneMonths){p.title=p.title.trim();p.action=p.action.trim();}}
    m.history=[...(old?.history||[]),{at:now,by,title:m.title,status:m.status,date:m.date,...(m.startTime!==undefined?{startTime:m.startTime,endTime:m.endTime||''}:{}),notes:m.notes,agenda:structuredClone(m.agenda),...(m.powerOfOne!==undefined?{powerOfOne:structuredClone(m.powerOfOne)}:{}),...(m.powerOfOneMonths!==undefined?{powerOfOneMonths:structuredClone(m.powerOfOneMonths)}:{}),...(m.termKpi!==undefined?{termKpi:structuredClone(m.termKpi)}:{})}];
    if(old)data.meetings[data.meetings.indexOf(old)]=m;else data.meetings.push(m);
    validate(data);return m;
  }
  window.ChairMeetingModel=Object.freeze({units,item,section,template,apply,validate,dateOK,consensusType,consensusTopics,types,roleTopic,roleItems,orderedSections});
})();
