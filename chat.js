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
      width:90%;
     padding:10px 15px;
    top:0;
     bottom:50px;
      background: linear-gradient(to bottom, #a7d8ff, #eaf6ff);
      z-index:9999;
      display:flex;
      gap:10px;
       flex-direction:column;
      justify-content:center;
      aligne-items:center;
    `;
    document.body.appendChild(box);
  }

  box.innerHTML = `
  
    <div style="padding:10px;
    background:rgba(255,255,255,0.96);
    box-shadow:rgba(0,0,0,0.2);
    color:#222;
    border-radius:10px;">
      Dari: ${targetName}
      <button style="float:right;color:white;width:30px;background:red" onclick="closeChat()">X</button>
    </div>

    <div id="chatMessages" style="flex:1;overflow:auto;
    color:#222;
   background: linear-gradient(
  to bottom,
  #87ceeb 0%,
  #b0e0ff 50%,
  #f0f8ff 100%
);
    border-radius:10px;"></div>

    <div class="box-kirim" style="display:flex;height:50px;padding:5px">
      <input id="chatInput" style="flex:1;
      
  background:#ddd;
border:1px solid #1e1e1e;
      color:#222;
      border:none;
    box-shadow:rgba(0,0,0,0.2);
    outline:none;
      border-radius:5px;
      height:30px;">
      <button style="width:65px;border-radius:10px;height:30px;background:#1877f2;" onclick="sendChat('${roomId}')">➤</button>
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
              background:${isMe ? '#4caf50' : '#eef2f4'};
              box-shadow:rgba(0,0,0,0.25)
              color:#222;
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

let chatFirstLoad = true;
function listenAllChats(){

  const user = auth.currentUser;
  if(!user) return;

  db.collectionGroup("messages")
    .onSnapshot(snap => {
console.log("📩 SNAPSHOT MASUK");
 if(chatFirstLoad){
        chatFirstLoad = false;
        return;
      }
      snap.docChanges().forEach(change => {

        if(change.type !== "added") return;

        const m = change.doc.data();
        if (!m.uid || m.uid === user.uid) return;
        const roomId = change.doc.ref.parent.parent.id;
        
        const parts = roomId.split("_");

        const otherUid = parts.find(id => id !== user.uid);
        if(!otherUid) return;
        console.log("💬 ROOM ID:", roomId);
        // ❗ jangan notif kalau lagi chat itu
         const isChatOpen = document.getElementById("chatBox");
       if(window.currentChatRoom === roomId && isChatOpen){
          return;
        }

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