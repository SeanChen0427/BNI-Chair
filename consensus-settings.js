"use strict";
(() => {
  const M=ChairMeetingModel;
  const kinds={'本屆重要活動時間設定':'activities','本屆分會 KPI 目標':'termKpi','各執掌的看見與職務目標':'roleGoals','會前會會議時間設定':'preSchedule','交接會議議程':'handover','Power of One 設定':'power'};
  const kind=s=>s.kind||kinds[s.title]||'';
  const event=(title='')=>({id:crypto.randomUUID(),title,date:'',startTime:'',endTime:''});
  const schedule=()=>({weekday:'',startTime:'',endTime:'',note:''});
  const timeOK=s=>typeof s==='string'&&(!s||/^([01]\d|2[0-3]):[0-5]\d$/.test(s));
  function times(v){if(!timeOK(v.startTime??'')||!timeOK(v.endTime??''))throw Error('請填有效的開始與結束時間。');if(v.startTime&&v.endTime&&v.endTime<=v.startTime)throw Error('結束時間需晚於開始時間。');}
  function validateSchedule(v){if(!v||typeof v.weekday!=='string'||!['','0','1','2','3','4','5','6'].includes(v.weekday)||typeof v.note!=='string'||v.note.length>1000)throw Error('會前會設定格式不符。');times(v);}
  function validate(data){
    if(data.preMeetingSchedule!==undefined)validateSchedule(data.preMeetingSchedule);
    for(const m of data.meetings){times(m);for(const s of m.agenda?.sections||[]){
      if(s.events!==undefined){if(!Array.isArray(s.events))throw Error('活動設定格式不符。');const ids=new Set();for(const e of s.events){if(!e||typeof e.id!=='string'||!/^[\w-]{1,100}$/.test(e.id)||ids.has(e.id)||typeof e.title!=='string'||e.title.length>160||!M.dateOK(e.date))throw Error('活動名稱或日期格式不符。');if(e.date&&!e.title.trim())throw Error('已排日期的活動需填名稱。');ids.add(e.id);times(e);}}
      if(s.schedule!==undefined)validateSchedule(s.schedule);
    }}
  }
  function prepare(m,data){let changed=false;if(m.type!==M.consensusType)return changed;for(const s of m.agenda.sections){const k=kind(s);if(k&&!s.kind){s.kind=k;changed=true;}if(k==='activities'&&!s.events){s.events=['BOD','Power Day','週年慶'].map(event);changed=true;}if(k==='preSchedule'&&!s.schedule){const {weekday,startTime,endTime,note}=data.preMeetingSchedule||schedule();s.schedule={weekday,startTime,endTime,note};changed=true;}}return changed;}
  function applySchedule(data,m,by,edits){const s=m.agenda.sections.find(s=>kind(s)==='preSchedule');if(!s)return;const next={...(data.preMeetingSchedule||schedule())};for(const key of edits)next[key]=s.schedule[key];validateSchedule(next);data.preMeetingSchedule={...next,sourceId:m.id,updatedBy:by,updatedAt:new Date().toISOString()};}
  function calendar(data){return data.meetings.flatMap(m=>(m.agenda?.sections||[]).flatMap(s=>(s.events||[]).filter(e=>e.date&&e.title.trim()).map(e=>({...e,kind:'activity',id:m.id+'-'+e.id,sourceId:m.id,sectionId:s.id,status:'已排定',owner:'',title:e.title.trim()}))));}
  const scheduleText=v=>v?[v.weekday!==''?'每週'+['日','一','二','三','四','五','六'][Number(v.weekday)]:'時間彈性安排',[v.startTime,v.endTime].filter(Boolean).join('–'),v.note].filter(Boolean).join(' · '):'';
  function handover(source,sectionId){const s=source?.agenda?.sections.find(s=>s.id===sectionId&&kind(s)==='handover');if(!s)throw Error('找不到來源交接議程。');const lines=s.items.map(i=>i.text.trim()).filter(Boolean);if(!lines.length)throw Error('請先填寫至少一項交接議程。');return {title:'交接會議',type:'其他會議',sourceConsensus:{meetingId:source.id,sectionId:s.id},agenda:{version:1,sections:lines.map(text=>{const row=M.section('chair',text.slice(0,160));if(text.length>160)row.items[0].text=text;return row;})}};}
  window.ChairConsensus=Object.freeze({kind,kinds,event,schedule,prepare,validate,applySchedule,calendar,scheduleText,handover});
})();
