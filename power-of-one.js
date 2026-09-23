"use strict";
(() => {
  const empty=()=>({title:'',start:'',end:'',action:'',published:false});
  const dateOK=s=>typeof s==='string'&&(!s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s);
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function validate(p){
    if(p===undefined)return;
    if(!p||typeof p.title!=='string'||p.title.length>160||typeof p.action!=='string'||p.action.length>4000||typeof p.published!=='boolean'||!dateOK(p.start)||!dateOK(p.end))throw Error('Power of One 格式不符，請核對主題、日期與行動。');
    if(p.start&&p.end&&p.end<p.start)throw Error('Power of One 結束日期不能早於開始日期。');
    if(p.published&&(!p.title.trim()||!p.action.trim()||!p.start||!p.end))throw Error('在首頁顯示前，請填寫 Power of One 主題、開始與結束日期及具體行動。');
  }
  const monthOK=s=>typeof s==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(s)&&Number(s.slice(0,4))>0;
  const monthly=(month='')=>({id:crypto.randomUUID(),month,title:'',action:'',published:false});
  function range(p){if(p.month&&monthOK(p.month)){const [year,month]=p.month.split('-').map(Number),last=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];return {start:p.month+'-01',end:p.month+'-'+String(last).padStart(2,'0')};}return p.legacyPeriod||{start:p.start||'',end:p.end||''};}
  const period=p=>p.month?`${p.month.slice(0,4)} 年 ${Number(p.month.slice(5))} 月`:[range(p).start,range(p).end].filter(Boolean).join(' — ');
  const entries=m=>m.powerOfOneMonths!==undefined?m.powerOfOneMonths:m.powerOfOne?[m.powerOfOne]:[];
  function editRows(m){
    if(m.powerOfOneMonths!==undefined)return structuredClone(m.powerOfOneMonths);
    const rows=[];
    if(m.powerOfOne){const old=m.powerOfOne,row={...monthly(),title:old.title,action:old.action,published:old.published},month=old.start?.slice(0,7);
      if(monthOK(month)&&old.start===range({month}).start&&old.end===range({month}).end)row.month=month;
      else if(old.start||old.end)row.legacyPeriod={start:old.start,end:old.end};
      rows.push(row);
    }
    if(m.type==='核心共識會議'){for(const month of ['2026-10','2026-11','2026-12'])if(!rows.some(p=>p.month===month))rows.push(monthly(month));}
    else if(!rows.length)rows.push(monthly());
    return rows;
  }
  function validateMonths(rows){
    if(!Array.isArray(rows)||rows.length>120)throw Error('Power of One 月度設定格式不符。');
    const ids=new Set(),months=new Set();
    for(const p of rows){
      if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id)||typeof p.month!=='string'||p.month&&!monthOK(p.month)||typeof p.title!=='string'||p.title.length>160||typeof p.action!=='string'||p.action.length>4000||typeof p.published!=='boolean')throw Error('請核對 Power of One 月份、目標與行動。');
      ids.add(p.id);
      if(p.month){if(months.has(p.month))throw Error('同一場會議的 Power of One 月份不能重複。');months.add(p.month);if(p.legacyPeriod!==undefined)throw Error('月度設定不可同時保留舊日期區間。');}
      if(p.legacyPeriod!==undefined){if(!p.legacyPeriod||typeof p.legacyPeriod!=='object')throw Error('原 Power of One 期間格式不符。');validate({...p,...p.legacyPeriod});}
      if(p.published&&(!p.title.trim()||!p.action.trim()||!p.month&&!p.legacyPeriod))throw Error('在首頁顯示前，請填寫月份、月度目標與具體行動。');
    }
  }
  function validateMeeting(m){if(m.powerOfOne!==undefined)validate(m.powerOfOne);if(m.powerOfOneMonths!==undefined)validateMonths(m.powerOfOneMonths);}
  function groups(meetings,day=today()){
    const rows=meetings.flatMap(meeting=>entries(meeting).filter(p=>p.published).map(p=>({meeting,power:{...p,...range(p)}})));
    const byStart=(a,b)=>a.power.start.localeCompare(b.power.start)||a.meeting.id.localeCompare(b.meeting.id);
    return {current:rows.filter(r=>r.power.start<=day&&r.power.end>=day).sort(byStart),upcoming:rows.filter(r=>r.power.start>day).sort(byStart),past:rows.filter(r=>r.power.end<day).sort((a,b)=>byStart(b,a))};
  }
  window.ChairPowerOfOne=Object.freeze({empty,validate,groups,today,monthly,monthOK,range,period,entries,editRows,validateMonths,validateMeeting});
})();
