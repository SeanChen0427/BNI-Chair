"use strict";
(() => {
  const states=Object.freeze(["未開始","進行中","需協助","已完成"]);
  const lists=board=>board.lists||states.map((title,i)=>({id:`state-${i}`,title,status:title}));
  const listFor=(board,task)=>lists(board).find(l=>l.id===task.boardListId)||lists(board).find(l=>l.status===task.status)||lists(board)[0];
  const cards=(data,board,listId)=>data.tasks.filter(t=>t.boardId===board.id&&listFor(board,t)?.id===listId).sort((a,b)=>(a.boardOrder??Number.MAX_SAFE_INTEGER)-(b.boardOrder??Number.MAX_SAFE_INTEGER));
  function move(data,boardId,taskId,listId,beforeId,by){
    const board=data.boards.find(b=>b.id===boardId), task=data.tasks.find(t=>t.id===taskId&&t.boardId===boardId),list=board&&lists(board).find(l=>l.id===listId);
    if(!board||!task||!list)throw Error("看板或工作已變動，請重新開啟。");
    if(beforeId===taskId)return;
    const ordered=cards(data,board,listId).filter(t=>t.id!==taskId), index=beforeId?ordered.findIndex(t=>t.id===beforeId):ordered.length;
    if(index<0)throw Error("工作順序已變動，請重試。");
    ordered.splice(index,0,task);ordered.forEach((t,i)=>t.boardOrder=i);
    const previous={boardListId:listFor(board,task)?.id,status:task.status};
    task.boardListId=listId;if(list.status)task.status=list.status;
    const now=new Date().toISOString();task.updatedAt=now;task.history=[...(task.history||[]),{at:now,by,status:task.status,date:task.date||"",title:task.title,notes:task.notes||"",boardId,boardListId:listId,boardOrder:task.boardOrder,previous}];
  }
  function deletion(data,kind,id){
    if(!['board','task'].includes(kind))throw Error('刪除類型不符。');
    const item=data[kind==='board'?'boards':'tasks'].find(x=>x.id===id);
    if(!item)throw Error('項目已變動，請關閉後重新開啟。');
    if(kind==='board'){
      const count=data.tasks.filter(t=>t.boardId===id).length;
      if(count)throw Error(`看板還有 ${count} 張卡片，請先移出或逐張處理，再刪除空看板。`);
    }else if(item.sourceId||item.sourceEntryId||data.meetings.some(m=>m.agenda?.sections.some(s=>s.items.some(i=>i.taskId===id)))){
      throw Error('這筆工作連結會議紀錄，暫不提供刪除，以保留決議與工作追蹤。可更新工作狀態，或從工作案件調整所屬看板。');
    }
    return item;
  }
  function remove(data,kind,id,confirmation){
    const item=deletion(data,kind,id);
    if(confirmation!==item.title)throw Error('名稱不符，未刪除。請重新核對完整名稱。');
    const collection=kind==='board'?'boards':'tasks';
    data[collection]=data[collection].filter(x=>x.id!==id);
  }
  window.ChairBoardModel=Object.freeze({states,lists,listFor,cards,move,deletion,remove});
})();
