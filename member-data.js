"use strict";
(() => {
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const value=v=>v===null||v===undefined?'—':Number(v).toLocaleString('zh-TW');
  const known=['綠燈','黃燈','紅燈','黑燈','灰燈'];
  let data=null,filter='';
  const panel=()=>document.querySelector('[data-section="members"]');
  function render(){
    const root=panel();if(!root||!data)return;
    const source=data.source;
    const count=label=>data.members.filter(m=>m.light===label).length;
    const missing=data.members.filter(m=>!known.includes(m.light)).length;
    root.innerHTML=`<div class="panel-head"><div><small>MEMBER STATUS</small><h2>會員名單與數據</h2></div><button type="button" id="refreshMembers" class="text-button">重新讀取</button></div><div class="member-totals"><strong>現有會員 ${data.summary.total} 人</strong>${['綠燈','黃燈','紅燈'].map((label,i)=>`<span class="member-light light-${i}">${label} ${count(label)}</span>`).join('')}<span>黑／灰燈 ${count('黑燈')+count('灰燈')}</span><span>待確認 ${missing}</span></div><p class="muted tiny">${source?`已發布分析：${E(source.periodStart)} ～ ${E(source.periodEnd)} · 版本 ${E(source.analysisVersion)}<br>發布時間：${E(new Date(source.publishedAt||source.generatedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}))}`:'尚無已生效分析，僅顯示現有會員名單。'}<br>會員名單為目前狀態；燈號與數據依上述期間。缺資料顯示 —，不當作 0。</p><details class="member-directory"><summary>查看會員名單與數據（${data.summary.total} 人）</summary><label class="member-search">搜尋會員或專業別<input id="memberSearch" type="search" placeholder="輸入姓名或專業別" value="${E(filter)}"></label><div id="memberTable"></div></details>`;
    root.querySelector('#refreshMembers').onclick=load;
    root.querySelector('#memberSearch').oninput=e=>{filter=e.target.value;table();};table();
  }
  function table(){
    const rows=data.members.filter(m=>(m.name+' '+m.profession).includes(filter.trim()));
    panel().querySelector('#memberTable').innerHTML=`<div class="member-table-scroll"><table class="member-table"><thead><tr>${['姓名','專業別','燈號','分數','一對一','來賓','給予內部引薦','給予外部引薦','收到內部引薦','收到外部引薦','成交金額','培訓'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(m=>`<tr><th scope="row">${E(m.name)}</th><td>${E(m.profession)}</td><td>${E(m.light)}</td><td>${value(m.score)}</td>${['oneToOne','visitors','givenIn','givenOut','receivedIn','receivedOut','amount','education'].map(k=>`<td>${value(m.metrics[k])}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="12">沒有符合的會員</td></tr>'}</tbody></table></div>`;
  }
  async function load(){
    const root=panel();if(!root)return;
    root.setAttribute('aria-busy','true');const wasOpen=root.querySelector('details')?.open;
    root.innerHTML='<div class="panel-head"><h2>會員名單與數據</h2></div><p role="status">正在讀取會員資料…</p>';
    try{data=await ChairAuth.api('members');render();root.querySelector('details').open=!!wasOpen||location.hash==='#members';}
    catch(e){data=null;root.innerHTML=`<div class="panel-head"><h2>會員名單與數據</h2></div><p role="alert">${E(e.message)}</p>${[401,403].includes(e.status)?'<a href="index.html">重新登入</a>':'<button id="retryMembers" class="secondary">重試</button>'}`;const retry=root.querySelector('#retryMembers');if(retry)retry.onclick=load;}
    finally{root.removeAttribute('aria-busy');window.dispatchEvent(new Event('chair-members-render'));}
  }
  window.addEventListener('chair-auth-expired',()=>{data=null;const root=panel();if(root)root.innerHTML='<h2>會員名單與數據</h2><p>登入已失效，請<a href="index.html">重新登入</a>。</p>';});
  window.ChairMembers=Object.freeze({load});
  window.addEventListener('hashchange',()=>{if(location.hash==='#members'){const list=panel()?.querySelector('details');if(list)list.open=true;}});
})();
