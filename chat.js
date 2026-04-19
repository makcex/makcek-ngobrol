let currentChatUnsub = null;

window.currentChatRoom = null;

/* =========================
   OPEN CHAT
========================= */
window.openChat = function(targetUid, targetName){

  const user = auth.currentUser;
  if(!user) return alert("Login dulu");

  if(!targetUid) return console.log("TARGET NULL");

  const roomId = [user.uid, targetUid].sort().join("_");

  window.currentChatRoom = roomId;

  let box = document.getElementById("chatBox");

  if(!box){
    box = document.createElement("div");
    box.id = "chatBox";
    box.style = `
      position:fixed;
      bottom:0;
      right:0;
      width:300px;
      height:400px;
      background:#222;
      z-index:999999;
      display:flex;
      flex-direction:column;
    `;
    document.body.appendChild(box);
  }

  box.innerHTML = `
    <div style="padding:10px;background:#333;color:white;">
      Chat: ${targetName}
      <button style="float:right;" onclick="closeChat()">X</button>
    </div>

    <div id="chatMessages" style="flex:1;overflow:auto;color:white;"></div>

    <div style="display:flex;height:100px;">
      <input id="chatInput" style="flex:1;">
      <button style="width:65px;" onclick="sendChat('${roomId}')">➤</button>
    </div>
  `;

  // reset badge
  const badge = document.getElementById("badge-" + targetUid);
  if(badge){
    badge.style.display = "none";
    badge.innerText = "";
  }

  listenChat(roomId, targetUid);
};


/* =========================
   LISTEN CHAT
========================= */
function listenChat(roomId, targetUid){

  const box = document.getElementById("chatMessages");
  const user = auth.currentUser;

  if(!box || !user) return;

  if(currentChatUnsub){
    currentChatUnsub();
  }

  currentChatUnsub = db.collection("chats")
    .doc(roomId)
    .collection("messages")
    .orderBy("time", "asc")
    .onSnapshot(
  snap => {

    box.innerHTML = "";

    snap.forEach(doc => {
      const m = doc.data();
      if(!m) return; // 🔥 penting

      const isMe = m.uid === user.uid;

        box.innerHTML += `
          <div style="
            display:flex;
            justify-content:${isMe ? 'flex-end' : 'flex-start'};
            margin:5px 0;
          ">

            <div style="
              max-width:70%;
              padding:8px 10px;
              border-radius:12px;
              background:${isMe ? '#4caf50' : '#333'};
              color:white;
              position:relative;
              word-wrap:break-word;
            ">

              ${m.text}

              <button onclick="deleteMsg('${roomId}','${doc.id}')"
                style="
                  position:absolute;
                  top:-6px;
                  right:-6px;
                  background:red;
                  color:white;
                  border:none;
                  width:18px;
                  height:18px;
                  border-radius:50%;
                  font-size:10px;
                  cursor:pointer;
                ">
                ×
              </button>

            </div>
          </div>
        `;
      });

      box.scrollTop = box.scrollHeight;

    });
}
/* =========================
   SEND CHAT
========================= */
window.sendChat = async function(roomId){

  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if(!text) return;

  const user = auth.currentUser;
  if(!user) return alert("Login dulu!");

  await db.collection("chats")
    .doc(roomId)
    .collection("messages")
    .add({
      text,
      sender: user.displayName || user.email,
      uid: user.uid,
      time: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = "";
};


/* =========================
   CLOSE CHAT
========================= */
window.closeChat = function(){

  const box = document.getElementById("chatBox");
  if(box) box.remove();

  window.currentChatRoom = null;

  if(currentChatUnsub){
    currentChatUnsub();
    currentChatUnsub = null;
  }
};


/* =========================
   DELETE MESSAGE (USER + ADMIN)
========================= */
window.deleteMsg = async function(roomId, msgId){

 const ok = confirm("Hapus pesan ini?");
  if(!ok) return;

  const msgRef = db.collection("chats")
    .doc(roomId)
    .collection("messages")
    .doc(msgId);

  

  await msgRef.delete();
};
function showBadge(otherUid){

  let badge = document.getElementById("badge-" + otherUid);

  if(!badge){
    // 🔥 retry karena DOM belum siap
    setTimeout(() => {
      badge = document.getElementById("badge-" + otherUid);

      console.log("🔁 RETRY BADGE:", badge);

      if(badge){
        badge.style.display = "flex";
        badge.innerText = "1";
      }

    }, 500);

    return;
  }

  badge.style.display = "flex";
  badge.innerText = "1";
}
function listenAllChats(){

  const user = auth.currentUser;
  if(!user) return;

  db.collectionGroup("messages")
    .onSnapshot(snap => {
console.log("📩 SNAPSHOT MASUK");
      snap.docChanges().forEach(change => {

        if(change.type !== "added") return;

        const m = change.doc.data();

        const roomId = change.doc.ref.parent.parent.id;
        
        const parts = roomId.split("_");

        const otherUid = parts.find(id => id !== user.uid);
        if(!otherUid) return;
        console.log("💬 ROOM ID:", roomId);
        // ❗ jangan notif kalau lagi chat itu
        if(window.currentChatRoom === roomId) return;

      showBadge(otherUid);

      });

    });
}
auth.onAuthStateChanged(user => {
  if(user){
    console.log("🔥 LOGIN DETECTED - START LISTENER");
    listenAllChats();
  }
});