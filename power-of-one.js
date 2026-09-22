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
  function groups(meetings,day=today()){
    const rows=meetings.filter(m=>m.powerOfOne?.published).map(m=>({meeting:m,power:m.powerOfOne}));
    const byStart=(a,b)=>a.power.start.localeCompare(b.power.start)||a.meeting.id.localeCompare(b.meeting.id);
    return {current:rows.filter(r=>r.power.start<=day&&r.power.end>=day).sort(byStart),upcoming:rows.filter(r=>r.power.start>day).sort(byStart),past:rows.filter(r=>r.power.end<day).sort((a,b)=>byStart(b,a))};
  }
  window.ChairPowerOfOne=Object.freeze({empty,validate,groups,today});
})();
