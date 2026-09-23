"use strict";
(() => {
  // Self-contained OOXML and ZIP (stored entries); no remote service or library.
  const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  const p=(text,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r>${String(text??'').split(/\r\n|\r|\n/).map((line,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${xml(line)}</w:t>`).join('')}</w:r></w:p>`;
  const value=v=>v===undefined||v===null||v===''?'尚未設定':String(v);
  const unit=id=>ChairMeetingModel.units.find(u=>u.id===id)?.name||id;
  const time=(a,b)=>[a,b].filter(Boolean).join('–');
  function strategyXML(plan){
    const S=ChairStrategy,out=[],width=650,colors={culture:'8A455E',accountability:'356B72',pt:'9A6A24'},pales={culture:'F7EFF2',accountability:'EDF5F5',pt:'FBF5E8'};
    const cell=(text,span=1,fill='FFFFFF',white=false,first=false)=>`<w:tc><w:tcPr><w:tcW w:w="${first?1760:width*span}" w:type="dxa"/>${span>1?`<w:gridSpan w:val="${span}"/>`:''}<w:shd w:fill="${fill}"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="Gantt"/></w:pPr><w:r><w:rPr>${white?'<w:color w:val="FFFFFF"/>':''}</w:rPr><w:t>${xml(text)}</w:t></w:r></w:p></w:tc>`;
    const row=(cells,header=false)=>`<w:tr><w:trPr><w:cantSplit/>${header?'<w:tblHeader/>':''}</w:trPr>${cells.join('')}</w:tr>`;
    const rows=[row([cell('2026/10—2027/9',1,'F3F5F7',false,true),...S.quarters.map(q=>cell(q.label+' '+q.period,3,'F3F5F7'))],true),row([cell('年度主軸／季度／月份',1,'FAFBFC',false,true),...S.months.map(m=>cell(Number(m.slice(5))+'月',1,'FAFBFC'))],true)];
    for(const a of plan.axes){rows.push(row([cell(a.title,1,pales[a.id],false,true),cell(a.focus,12,colors[a.id],true)]),row([cell('季度方向',1,'FFFFFF',false,true),...a.quarters.map((q,i)=>cell(S.quarters[i].label+' · '+(q.direction.trim()?'已設定':'待討論'),3,q.direction.trim()?pales[a.id]:'FFFFFF'))]),row([cell('每月工作',1,'FFFFFF',false,true),...a.quarters.flatMap(q=>q.months.map(m=>cell(m.action.trim()?'有工作':'—',1,m.action.trim()?pales[a.id]:'FFFFFF')))]));}
    out.push(p('年度甘特圖 · 色條表示本屆主軸；有工作表示已填規劃，非完成狀態。','Metadata'),`<w:tbl><w:tblPr><w:tblW w:w="9560" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="DDE3E8"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="1760"/>${S.months.map(()=>'<w:gridCol w:w="650"/>').join('')}</w:tblGrid>${rows.join('')}</w:tbl>`);
    for(const a of plan.axes){out.push(p(a.title+' · '+a.focus,'Heading2'));let any=false;for(let qi=0;qi<a.quarters.length;qi++){const q=a.quarters[qi];if(!q.direction.trim()&&!q.months.some(m=>m.action.trim()))continue;any=true;out.push(p(S.quarters[qi].label+'（'+S.quarters[qi].period+'）','Heading2'),p('季度方向：'+value(q.direction)));for(const m of q.months)out.push(p(m.month+'：'+value(m.action)));}if(!any)out.push(p('季度方向與每月工作待討論。'));}
    return out.join('');
  }
  function documentXML(m,tasks=[]){
    const out=[p(m.title||'會議紀錄','Title'),p('會議紀錄','Subtitle'),p(`種類：${value(m.type)}    日期：${value(m.date)}`),p(`時間：${value(time(m.startTime,m.endTime))}    召集：${value(m.owner)}    狀態：${value(m.status)}`)];
    let powerShown=false,kpiShown=false;
    const power=()=>{const rows=ChairPowerOfOne.entries(m);if(!rows.length)out.push(p('尚未設定月度目標'));for(const v of rows){out.push(p(`${v.month?'月份':'原期間'}：${value(ChairPowerOfOne.period(v))}`,'Heading2'),p(`月度目標：${value(v.title)}（${v.published?'首頁顯示':'未顯示於首頁'}）`),p(`具體行動：${value(v.action)}`));}powerShown=true;};
    const kpi=()=>{out.push(p(`${ChairTermKpi.term.title} KPI 目標`));for(const f of ChairTermKpi.fields){const v=m.termKpi?.values?.[f.id];out.push(p(`${f.label}：${v===null||v===undefined?'尚未設定':ChairTermKpi.display(v)+' '+f.unit}`));}kpiShown=true;};
    ChairMeetingModel.orderedSections(m).forEach((s,index)=>{
      out.push(p(`${index+1} ${s.title}`,'Heading1'));
      if(m.type!==ChairMeetingModel.consensusType)out.push(p(`執掌：${unit(s.unitId)}`,'Subtitle'));
      const kind=ChairConsensus.kind(s);
      if(kind==='activities')for(const e of s.events||[])out.push(p(`${e.title||'未命名活動'}：${value(e.date)}${time(e.startTime,e.endTime)?'  '+time(e.startTime,e.endTime):''}`));
      if(kind==='termKpi')kpi();
      if(kind==='power')power();
      if(kind==='strategy'){const plan=s.strategy||window.ChairStrategy?.empty();out.push(plan?strategyXML(plan):p('尚未設定年度規劃'));}
      if(kind==='preSchedule')out.push(p(`共識時段：${s.schedule?ChairConsensus.scheduleText(s.schedule)||'尚未設定':'尚未設定'}`));
      let count=0;
      for(const i of s.items||[]){
        const meaningful=i.text?.trim()||i.roleId||i.tags?.length||i.date||i.time||i.node||i.units?.length||i.work;
        if(!meaningful)continue;count++;
        if(i.roleId)out.push(p(unit(i.roleId),'Heading2'));
        out.push(p(i.text?.trim()?i.text:'尚無紀錄'));
        if(i.tags?.length)out.push(p(`標籤：${i.tags.join('、')}`,'Metadata'));
        if(i.date||i.time||i.node)out.push(p(`${{execution:'執行日期',deadline:'完成期限',regular:'例會場次'}[i.dateKind]||'日期'}：${value(i.date)}${i.time?' '+i.time:''}${i.node?' · '+i.node:''}`,'Metadata'));
        if(i.units?.length)out.push(p(`承接單位：${i.units.map(unit).join('、')}（首位為主責）`,'Metadata'));
        if(i.work){const t=tasks.find(t=>t.id===i.taskId);out.push(p(t?`工作目前進度：${t.status}；主責：${value(t.owner)}；日期：${value(t.date)}`:'已列入工作安排','Metadata'));}
      }
      if(!count&&!['activities','termKpi','power','preSchedule','strategy'].includes(kind))out.push(p('尚無紀錄'));
    });
    if(m.termKpi&&!kpiShown){out.push(p('本屆分會 KPI 目標','Heading1'));kpi();}
    if(ChairPowerOfOne.entries(m).length&&!powerShown){out.push(p('Power of One 設定','Heading1'));power();}
    if(m.notes){out.push(p('補充紀錄','Heading1'),p(m.notes));}
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${out.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  }
  const styles=`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="PingFang TC"/><w:sz w:val="22"/><w:lang w:val="zh-TW" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:color w:val="555555"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Gantt"><w:name w:val="Gantt"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="220" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
  function zip(files){
    const encoder=new TextEncoder(),locals=[],central=[];let offset=0;
    const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
    for(const [name,content]of Object.entries(files)){
      const n=encoder.encode(name),data=encoder.encode(content),checksum=crc(data),local=new Uint8Array(30+n.length),l=new DataView(local.buffer);
      l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);l.setUint32(14,checksum,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,n.length,true);local.set(n,30);locals.push(local,data);
      const center=new Uint8Array(46+n.length),c=new DataView(center.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,checksum,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,n.length,true);c.setUint32(42,offset,true);center.set(n,46);central.push(center);offset+=local.length+data.length;
    }
    const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,central.reduce((n,b)=>n+b.length,0),true);e.setUint32(16,offset,true);
    const parts=[...locals,...central,end],result=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let pos=0;for(const part of parts){result.set(part,pos);pos+=part.length;}return result;
  }
  function bytes(m,tasks=[]){return zip({
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'word/document.xml':documentXML(m,tasks),'word/styles.xml':styles
  });}
  const filename=m=>`${m.date||'未定日期'}_${m.title||'會議紀錄'}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,150)+'_會議紀錄.docx';
  function download(m,tasks){const url=URL.createObjectURL(new Blob([bytes(m,tasks)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})),a=document.createElement('a');a.href=url;a.download=filename(m);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  window.ChairMeetingWord=Object.freeze({bytes,documentXML,filename,download});
})();
