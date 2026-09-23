"use strict";
(() => {
  // Self-contained OOXML and ZIP (stored entries); no remote service or library.
  const xml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  const p=(text,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r>${String(text??'').split(/\r\n|\r|\n/).map((line,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${xml(line)}</w:t>`).join('')}</w:r></w:p>`;
  const value=v=>v===undefined||v===null||v===''?'尚未設定':String(v);
  const unit=id=>ChairMeetingModel.units.find(u=>u.id===id)?.name||id;
  const time=(a,b)=>[a,b].filter(Boolean).join('–');
  function documentXML(m,tasks=[]){
    const out=[p(m.title||'會議紀錄','Title'),p('會議紀錄','Subtitle'),p(`種類：${value(m.type)}    日期：${value(m.date)}`),p(`時間：${value(time(m.startTime,m.endTime))}    召集：${value(m.owner)}    狀態：${value(m.status)}`)];
    let powerShown=false,kpiShown=false;
    const power=()=>{const v=m.powerOfOne;out.push(p(`主題：${value(v?.title)}（${v?.published?'首頁顯示':'未顯示於首頁'}）`),p(`期間：${value(v?.start)} 至 ${value(v?.end)}`),p(`共同行動：${value(v?.action)}`));powerShown=true;};
    const kpi=()=>{out.push(p(`${ChairTermKpi.term.title} KPI 目標`));for(const f of ChairTermKpi.fields){const v=m.termKpi?.values?.[f.id];out.push(p(`${f.label}：${v===null||v===undefined?'尚未設定':ChairTermKpi.display(v)+' '+f.unit}`));}kpiShown=true;};
    ChairMeetingModel.orderedSections(m).forEach((s,index)=>{
      out.push(p(`${index+1} ${s.title}`,'Heading1'));
      if(m.type!==ChairMeetingModel.consensusType)out.push(p(`執掌：${unit(s.unitId)}`,'Subtitle'));
      const kind=ChairConsensus.kind(s);
      if(kind==='activities')for(const e of s.events||[])out.push(p(`${e.title||'未命名活動'}：${value(e.date)}${time(e.startTime,e.endTime)?'  '+time(e.startTime,e.endTime):''}`));
      if(kind==='termKpi')kpi();
      if(kind==='power')power();
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
      if(!count&&!['activities','termKpi','power','preSchedule'].includes(kind))out.push(p('尚無紀錄'));
    });
    if(m.termKpi&&!kpiShown){out.push(p('本屆分會 KPI 目標','Heading1'));kpi();}
    if(m.powerOfOne&&!powerShown){out.push(p('Power of One 設定','Heading1'));power();}
    if(m.notes){out.push(p('補充紀錄','Heading1'),p(m.notes));}
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${out.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  }
  const styles=`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="PingFang TC"/><w:sz w:val="22"/><w:lang w:val="zh-TW" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:color w:val="555555"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/></w:rPr></w:style></w:styles>`;
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
