"use strict";
(() => {
  const term=Object.freeze({id:'term-11',title:'第11屆',start:'2026-10-01',end:'2027-09-30'});
  const fields=Object.freeze([
    ['members','年度分會目標','人','count'],['visitors','每月來賓','人','count'],['firstYearRetention','首年留員率','%','rate'],
    ['oneToOnes','每月1對1','次','count'],['retention','總體留員率','%','rate'],['training','培訓率','%','rate'],
    ['referrals','每月引薦單數','單','count'],['greenMembers','綠燈會員比例','%','rate'],['referralAmount','每月引薦金額','元','amount']
  ].map(([id,label,unit,kind])=>Object.freeze({id,label,unit,kind})));
  const empty=()=>Object.fromEntries(fields.map(f=>[f.id,null]));
  function validateValues(values){
    if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length!==fields.length)throw Error('本屆 KPI 欄位不完整，已保留原資料。');
    for(const f of fields){const n=values[f.id];if(n===null)continue;
      if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>Number.MAX_SAFE_INTEGER||f.kind==='count'&&!Number.isSafeInteger(n)||f.kind==='rate'&&n>100||f.kind!=='count'&&Math.abs(n*100-Math.round(n*100))>0.000001)throw Error(f.label+'：請填'+(f.kind==='rate'?'0–100 的百分比':f.kind==='count'?'零或正整數':'零或正數，最多兩位小數')+'。');
    }
  }
  function parse(values){const out=empty();for(const f of fields){const s=String(values[f.id]??'').trim();if(!s)continue;if(!(/^\d+(?:\.\d{1,2})?$/.test(s))||f.kind==='count'&&s.includes('.'))throw Error(f.label+'：請填有效數字'+(f.kind==='count'?'（整數）':'（最多兩位小數）')+'。');out[f.id]=Number(s);}validateValues(out);return out;}
  function validateAll(data){if(data.termGoals===undefined)return;if(!Array.isArray(data.termGoals))throw Error('本屆 KPI 資料格式不符。');const ids=new Set();
    for(const t of data.termGoals){if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.title!=='string'||!ChairDate(t.start)||!ChairDate(t.end)||t.end<t.start||typeof t.updatedBy!=='string'||!validStamp(t.updatedAt)||!Array.isArray(t.history))throw Error('本屆 KPI 資料格式不符。');ids.add(t.id);validateValues(t.values);for(const h of t.history){if(!h||typeof h.by!=='string'||!validStamp(h.at))throw Error('KPI 保存紀錄格式不符。');validateValues(h.values);}}
  }
  const validStamp=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s));
  const ChairDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const current=data=>data.termGoals?.find(t=>t.id===term.id);
  function apply(data,values,by){validateValues(values);const old=current(data),at=new Date().toISOString();data.termGoals=data.termGoals||[];
    const next={...old,...term,values:structuredClone(values),updatedAt:at,updatedBy:by,history:[...(old?.history||[]),{at,by,values:structuredClone(values)}]};
    if(old)data.termGoals[data.termGoals.indexOf(old)]=next;else data.termGoals.push(next);validateAll(data);return next;
  }
  const display=n=>n===null||n===undefined?'—':new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);
  window.ChairTermKpi=Object.freeze({term,fields,empty,parse,validateValues,validateAll,current,apply,display});
})();
