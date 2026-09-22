"use strict";
window.ChairHomeLayout={create({identity,toast}){
  const defaults=['board','hero','kpi','power','members','calendar','tasks','meetings'];
  const names={board:'核心團隊留言板',hero:'工作總覽',kpi:'本屆 KPI 目標',power:'本期 Power of One',members:'最新會員狀態',calendar:'工作月曆',tasks:'工作案件',meetings:'會議案件'};
  const key=`fulian-chair-home-layout-v1:${encodeURIComponent(identity.role)}:${encodeURIComponent(identity.identity)}`;
  const root=document.getElementById('mainContent'),reset=document.getElementById('homeLayoutReset');
  const nodes=new Map(defaults.map(id=>[id,root.querySelector(`[data-section="${id}"]`)]));
  const anchor=document.createComment('home-layout');root.insertBefore(anchor,nodes.get('board'));
  const live=document.createElement('span');live.className='layout-sr-only';live.setAttribute('role','status');document.body.append(live);
  let enabled=false,pending=null,drag=null,frame=0,order=read();
  function normalize(value){return [...new Set([...(Array.isArray(value)?value:[]).filter(id=>defaults.includes(id)),...defaults])];}
  function read(){try{return normalize(JSON.parse(localStorage.getItem(key)));}catch{return [...defaults];}}
  function current(){return [...root.children].map(el=>el.dataset.section).filter(id=>defaults.includes(id));}
  function apply(ids){ids.forEach(id=>root.insertBefore(nodes.get(id),anchor));}
  function announce(text){live.textContent=text;}
  function save(before){try{localStorage.setItem(key,JSON.stringify(current()));order=current();toast('首頁排列已保存');}catch{apply(before);order=before;toast('排列無法保存，已恢復原順序。');}}
  function refresh(){
    nodes.forEach((node,id)=>{
      const heading=node.querySelector('h1,h2');if(!heading||heading.querySelector('.home-drag-handle'))return;
      const button=document.createElement('button');button.type='button';button.className='home-drag-handle';button.dataset.homeMove=id;button.textContent='⠿';
      button.title='按住拖移；手機長按；鍵盤按空白鍵後用上下鍵移動';button.setAttribute('aria-label',`移動${names[id]}`);button.setAttribute('aria-pressed','false');
      heading.prepend(button);
      const grip=node.querySelector('.announcement-head,.panel-head,.kpi-head,.power-head')||heading.parentElement;
      grip.classList.add('home-drag-surface');
    });
  }
  function clearPending(){if(!pending)return;clearTimeout(pending.timer);pending.button.classList.remove('hold-pending');pending=null;}
  function start(id,button,point){
    if(!enabled)return;
    const node=nodes.get(id),before=current();
    drag={id,button,node,before,point};button.setAttribute('aria-pressed','true');node.classList.add('home-layout-selected');
    if(point){
      const rect=node.getBoundingClientRect(),slot=document.createElement('div');slot.className='home-layout-slot';slot.style.height=rect.height+'px';slot.setAttribute('aria-hidden','true');
      animations.get(node)?.cancel();animations.delete(node);
      root.insertBefore(slot,node);
      Object.assign(drag,{slot,origin:{x:rect.x,y:rect.y},offset:{x:point.x-rect.x,y:point.y-rect.y}});
      node.style.width=rect.width+'px';node.style.left=rect.x+'px';node.style.top=rect.y+'px';node.classList.add('home-layout-moving');
      root.setPointerCapture(point.pointerId);frame=requestAnimationFrame(scrollTick);
    }
    document.body.classList.add('home-layout-dragging');announce(`已選取${names[id]}，上下移動，放開或按 Enter 保存，Escape 取消。`);
  }
  const animations=new Map();
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function layoutRect(node){
    const rect=node.getBoundingClientRect(),transform=getComputedStyle(node).transform;
    const dy=transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
    return {top:rect.top-dy,height:rect.height};
  }
  function animatePositions(before){
    before.forEach((old,node)=>{
      animations.get(node)?.cancel();animations.delete(node);
      const rect=node.getBoundingClientRect(),dx=old.left-rect.left,dy=old.top-rect.top;
      if((Math.abs(dx)<1&&Math.abs(dy)<1)||reduced())return;
      const animation=node.animate([{transform:`translate3d(${dx}px,${dy}px,0)`},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
      animations.set(node,animation);animation.onfinish=()=>{if(animations.get(node)===animation)animations.delete(node);};
    });
  }
  function position(x,y){if(drag?.point){drag.point.x=x;drag.point.y=y;}}
  function paint(){
    const d=drag;if(!d?.point)return;
    const {x,y}=d.point;
    d.node.style.transform=`translate3d(${x-d.offset.x-d.origin.x}px,${y-d.offset.y-d.origin.y}px,0)`;
    const others=current().filter(id=>id!==d.id).map(id=>nodes.get(id));
    const target=others.find(node=>{const r=layoutRect(node);return y<r.top+r.height/2;});
    // Only move the placeholder when its insertion point changes. Hit testing
    // uses layout positions, not animated positions, to prevent oscillation.
    let next=d.slot.nextSibling;while(next===d.node)next=next.nextSibling;
    if(next!==(target||anchor)){
      const before=new Map(others.map(node=>[node,node.getBoundingClientRect()]));
      root.insertBefore(d.slot,target||anchor);animatePositions(before);
    }
  }
  function scrollTick(time){
    if(!drag?.point)return;
    const y=drag.point.y,top=document.querySelector('.topbar').getBoundingClientRect().bottom+40;
    const step=y<top?-Math.min(16,(top-y)/5):y>innerHeight-64?Math.min(16,(y-innerHeight+64)/5):0;
    const elapsed=Math.min(32,time-(drag.lastFrame||time));drag.lastFrame=time;
    if(step)window.scrollBy(0,step*elapsed/16.67);
    paint();frame=requestAnimationFrame(scrollTick);
  }
  function finish(cancel=false){
    clearPending();if(!drag)return;
    if(drag.point)paint();
    const d=drag,landing=d.node.getBoundingClientRect();drag=null;cancelAnimationFrame(frame);
    if(d.slot){root.insertBefore(d.node,d.slot);d.slot.remove();if(root.hasPointerCapture(d.point.pointerId))root.releasePointerCapture(d.point.pointerId);}
    d.node.style.width='';d.node.style.left='';d.node.style.top='';d.node.style.transform='';
    d.node.classList.remove('home-layout-moving','home-layout-selected');d.button.setAttribute('aria-pressed','false');document.body.classList.remove('home-layout-dragging');
    if(cancel){apply(d.before);announce('已取消移動');}else if(current().join()!==d.before.join()){save(d.before);announce(`${names[d.id]}位於第 ${current().indexOf(d.id)+1} 區`);}
    if(d.point&&!cancel)animatePositions(new Map([[d.node,landing]]));
    d.button.focus({preventScroll:true});
  }
  root.addEventListener('pointerdown',e=>{
    const surface=e.target.closest('.home-drag-surface'),handle=e.target.closest('[data-home-move]');
    if(!enabled||e.button!==0||!e.isPrimary||drag||(!handle&&!surface))return;
    if(!handle&&e.target.closest('button,a,input,textarea,select,summary,label'))return;
    const node=e.target.closest('[data-section]'),button=node?.querySelector('[data-home-move]');if(!button)return;
    e.preventDefault();clearPending();button.focus({preventScroll:true});button.classList.add('hold-pending');
    pending={button,id:button.dataset.homeMove,x:e.clientX,y:e.clientY,pointerId:e.pointerId,type:e.pointerType};
    pending.timer=setTimeout(()=>{const p=pending;if(!p)return;clearPending();start(p.id,p.button,{x:p.x,y:p.y,pointerId:p.pointerId});},280);
  });
  window.addEventListener('pointermove',e=>{
    if(pending&&e.pointerId===pending.pointerId&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>5){
      const p=pending;clearPending();
      if(p.type==='mouse'||p.type==='pen')start(p.id,p.button,{x:p.x,y:p.y,pointerId:p.pointerId});
    }
    if(drag?.point?.pointerId===e.pointerId){e.preventDefault();position(e.clientX,e.clientY);}
  },{passive:false});
  window.addEventListener('pointerup',e=>{if(pending?.pointerId===e.pointerId)clearPending();if(drag?.point?.pointerId===e.pointerId)finish();});
  window.addEventListener('pointercancel',e=>{if(pending?.pointerId===e.pointerId)clearPending();if(drag?.point?.pointerId===e.pointerId)finish(true);});
  root.addEventListener('lostpointercapture',()=>{if(drag?.point)finish(true);});
  root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-home-move],.home-drag-surface'))e.preventDefault();});
  root.addEventListener('click',e=>{if(e.target.closest('[data-home-move]')){e.preventDefault();if(!drag)announce('長按把手拖移，或按空白鍵再用上下鍵調整。');}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&(drag||pending)){e.preventDefault();finish(true);return;}
    const button=e.target.closest('[data-home-move]');if(!button||!enabled)return;
    if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();if(drag)finish();else start(button.dataset.homeMove,button);}
    else if(drag&&!drag.point&&['ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();const ids=current(),from=ids.indexOf(drag.id),to=from+(e.key==='ArrowUp'?-1:1);
      if(to>=0&&to<ids.length){[ids[from],ids[to]]=[ids[to],ids[from]];apply(ids);button.focus({preventScroll:true});drag.node.scrollIntoView({block:'nearest'});announce(`${names[drag.id]}位於第 ${to+1} 區`);}
    }else if(e.key==='Tab'&&drag)finish(true);
  });
  window.addEventListener('blur',()=>finish(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(true);});
  window.addEventListener('storage',e=>{if(e.key===key||e.key===null){finish(true);order=read();apply(order);}});
  reset.onclick=()=>{finish(true);try{localStorage.removeItem(key);order=[...defaults];apply(order);toast('已恢復預設排列：留言板在最上方');}catch{toast('無法恢復預設，請檢查瀏覽器儲存空間。');}};
  apply(order);refresh();
  return {refresh,setEnabled(value){finish(true);enabled=value;root.classList.toggle('home-layout-enabled',value);}};
}};
