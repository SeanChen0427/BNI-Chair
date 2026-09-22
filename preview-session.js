"use strict";
// This is a local UI identity only, never an authentication or permission boundary.
(() => {
  const KEY = "fulian-chair-rebuild-preview-identity-v1";
  const roles = Object.freeze({maintenance:"系統維護",chair:"主席",core:"核心",leader:"領頭羊"});
  const core = Object.freeze(["副主席","秘書財務","教育協調員","導師協調員","活動協調員","接待組長","成長協調員"]);
  const valid = s => s?.mode === "local-preview" && (s.role === "core" ? core.includes(s.identity) : ["chair","maintenance"].includes(s.role) && s.identity === roles[s.role]);
  window.PreviewIdentity = Object.freeze({roles,core,
    get(){try{const s=JSON.parse(sessionStorage.getItem(KEY));return valid(s)?s:null;}catch{return null;}},
    enter(role,identity){const s={mode:"local-preview",role,identity};if(!valid(s))throw Error("請重新選擇試看身分。");sessionStorage.setItem(KEY,JSON.stringify(s));},
    logout(){sessionStorage.removeItem(KEY);location.replace("index.html");}
  });
})();
