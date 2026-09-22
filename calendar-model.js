"use strict";
(() => {
// Cached 2026/10–2027/9 calendar from the verified D38 local preview.
  const HOLIDAYS=[
    ['2026-10-09','國慶日補假',true],['2026-10-10','國慶日'],['2026-10-25','臺灣光復暨金門古寧頭大捷紀念日'],['2026-10-26','光復紀念日補假',true],['2026-12-25','行憲紀念日'],
    ['2027-01-01','開國紀念日'],['2027-02-04','除夕前一日'],['2027-02-05','除夕'],['2027-02-06','春節初一'],['2027-02-07','春節初二'],['2027-02-08','春節初三'],['2027-02-09','春節補假',true],['2027-02-10','春節補假',true],['2027-02-28','和平紀念日'],['2027-03-01','和平紀念日補假',true],['2027-04-04','兒童節'],['2027-04-05','清明節'],['2027-04-06','兒童節補假',true],['2027-04-30','勞動節補假',true],['2027-05-01','勞動節'],['2027-06-09','端午節'],['2027-09-15','中秋節'],['2027-09-28','教師節']
  ].map(([date,title,substitute=false])=>({date,title,substitute}));
  // Dates supplied by Sean on 2026-09-21 (D83/C74); not an API-synced catalog.
  const TRAININGS=Object.freeze([
    ['2026-11-25','商業領袖論壇',{
      time:'13:00–16:30（台北時間）',location:'福華大飯店｜高雄市新興區七賢一路311號',
      source:'副主席課表／BNI 高雄市中心區官方詳情',
      sourceUrl:'https://bnikaohsiung.com.tw/zh-TW/eventdetails?eventId=m0nigBkR8vu%2FwS%2FLwHAikw%3D%3D',
      officialId:516212,verifiedAt:'2026-09-21',
      sourceNote:'2026/09/21 核對；副主席課表最後更新 06:00。'
    }],
    ['2027-03-26','期中領導團隊培訓'],
    ['2027-05-27','商業領袖論壇'],
    ['2027-09-20','領導團隊培訓']
  ].map(([date,title,details={}])=>Object.freeze({id:'training-'+date,kind:'training',date,title,time:'',location:'',source:'Sean 提供（2026/09/21）',sourceNote:'2026/09/21 核對副主席課表：尚未公布 2027 年場次，時間與地點待公布。',...details})));
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const validDate=value=>{if(value==='')return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00');return !Number.isNaN(date.getTime())&&iso(date)===value;};
  function days(month){const [year,m]=month.split('-').map(Number);const first=new Date(year,m-1,1,12);const count=new Date(year,m,0).getDate();return Array.from({length:Math.ceil((first.getDay()+count)/7)*7},(_,i)=>{const d=new Date(year,m-1,1-first.getDay()+i,12);return {date:iso(d),day:d.getDate(),inside:d.getMonth()===m-1};});}
  function recurring(date){if(date<'2026-10-01'||date>'2027-09-30'||new Date(date+'T12:00:00').getDay()!==2)return null;const h=HOLIDAYS.find(h=>h.date===date);return {id:'regular-'+date,kind:'regular',title:h?'例會休會':'週二例會',date,owner:'',status:h?'休會':'時間待定',note:h?.title||'依既有每週二例會安排'};}
  function trainings(){
    const catalog=window.ChairTrainingSnapshot?.items||[];
    // Match a known official link only; do not merge unrelated same-name courses.
    const overrides=new Map(TRAININGS.filter(t=>t.sourceUrl).map(t=>[t.sourceUrl,t]));
    const seen=new Set();
    return [...catalog.map(t=>{seen.add(t.sourceUrl);return {...t,...(overrides.get(t.sourceUrl)||{})};}),...TRAININGS.filter(t=>!t.sourceUrl||!seen.has(t.sourceUrl))];
  }
  function entries(data){return [...data.tasks.map(t=>({...t,kind:'task'})),...data.meetings.map(m=>({...m,kind:'meeting'})),...(window.ChairConsensus?.calendar(data)||[]),...trainings()];}
  function forDate(data,date){
    const items=entries(data).filter(e=>e.kind==='training'?e.date<=date&&date<=(e.endDate||e.date):e.date===date);
    const regular=recurring(date);if(regular)items.push(regular);
    // Preserve existing work/meeting order; training follows all chapter arrangements.
    return items.sort((a,b)=>Number(a.kind==='training')-Number(b.kind==='training'));
  }
  window.ChairCalendar=Object.freeze({HOLIDAYS,iso,validDate,days,recurring,entries,forDate});
})();
