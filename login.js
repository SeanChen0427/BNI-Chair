"use strict";
// Local UI identity only; no real account validation or production connection.
(() => {
  const roles = Object.freeze({maintenance:"系統維護",chair:"主席",core:"核心",leader:"領頭羊"});
  const coreRoles = Object.freeze(["副主席","秘書財務","教育協調員","導師協調員","活動協調員","接待組長","成長協調員"]);
  const leaderNames = Object.freeze([]); // No fabricated names or production member data.
  const $ = id => document.getElementById(id);
  let previewRole = null;
  function show(stage, title, intro) {
    $("loginForm").hidden = stage !== "login";
    $("identityForm").hidden = stage !== "identity";
    $("complete").hidden = stage !== "complete";
    $("previewControls").hidden = stage !== "login";
    $("panelTitle").textContent = title;
    $("panelIntro").textContent = intro;
    $("panelTitle").focus();
  }
  function finish(identity) {
    try {
      PreviewIdentity.enter(previewRole, identity);
      location.href = "dashboard.html";
    } catch {
      $("panelIntro").textContent = "瀏覽器無法保存試看身分，請確認允許本機儲存後重試。";
    }
  }
  function reset() {
    previewRole = null;
    $("loginForm").reset();
    $("identity").replaceChildren();
    $("selectedIdentity").textContent = "";
    $("loginButton").disabled = true;
    $("loginButton").textContent = "登入系統";
    $("password").placeholder = "請輸入密碼";
    $("previewPicker").open = false;
    document.querySelectorAll("[data-role]").forEach(b => b.setAttribute("aria-pressed", "false"));
    show("login", "登入工作台", "使用目前職務的共用帳號。");
  }
  document.querySelectorAll("[data-role]").forEach(button => button.addEventListener("click", () => {
    previewRole = button.dataset.role;
    $("username").value = `${roles[previewRole]}共用帳號（試看）`;
    $("password").placeholder = "試看流程免密碼";
    $("loginButton").disabled = false;
    $("loginButton").textContent = "試看登入";
    document.querySelectorAll("[data-role]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    $("loginButton").focus();
  }));
  $("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!Object.hasOwn(roles, previewRole)) return;
    if (previewRole === "maintenance" || previewRole === "chair") return finish(roles[previewRole]);
    const isCore = previewRole === "core", names = isCore ? coreRoles : leaderNames;
    $("identityLabel").textContent = isCore ? "職務" : "姓名";
    $("identity").replaceChildren(new Option(names.length ? "請選擇自己的職務" : "尚無可選姓名", ""));
    names.forEach(name => $("identity").add(new Option(name, name)));
    $("identity").disabled = !names.length;
    $("identityButton").disabled = !names.length;
    $("rosterNote").hidden = !!names.length;
    show("identity", isCore ? "選擇職務" : "選擇姓名", `${roles[previewRole]}共用帳號 · 流程試看`);
    if (names.length) $("identity").focus();
  });
  $("identityForm").addEventListener("submit", event => {
    event.preventDefault();
    const allowed = previewRole === "core" ? coreRoles : previewRole === "leader" ? leaderNames : [];
    if (allowed.includes($("identity").value)) finish($("identity").value);
  });
  document.querySelectorAll("[data-back]").forEach(button => button.addEventListener("click", reset));
})();
