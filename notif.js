// NOTIFIKASI
function showNotification(user, text){
  notifQueue.push({ user, text });

  if(!showingNotif){
    processNotif();
  }
}

function processNotif(){

  if(notifQueue.length === 0){
    showingNotif = false;
    return;
  }

  showingNotif = true;

  const { user, text } = notifQueue.shift();

  const notif = document.createElement("div");

  notif.innerHTML = `
    <div style="
      position:fixed;
      top:10px;
      right:50px;
      background:#1877f2;
      color:white;
      padding:10px;
      border-radius:10px;
      z-index:99999;
      box-shadow:0 4px 10px rgba(0,0,0,0.2);
      max-width:250px;
    ">
      🔔 <b>${user}</b> posting baru
      <div style="font-size:12px;opacity:0.8;margin-top:5px;">
        ${text ? text.slice(0,60) : ""}
      </div>
    </div>
  `;

  document.body.appendChild(notif);

  const sound = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3");
sound.play().catch(()=>{});

  setTimeout(() => {
    notif.remove();
    processNotif();
  }, 4000);
}




async function loadAdsFromFirebase(){
  try {
    const snap = await db.collection("iklan").get();

    products = snap.docs.map(doc => doc.data());

    console.log("ADS LOADED:", products);

    adsReady = true;

  } catch (e) {
    console.log("ADS ERROR:", e);
    adsReady = false;
  }
}
window.addEventListener("load", async () => {
  await loadAdsFromFirebase();
});

// notif comentar
function listenCommentBadge(postId){

  db.collection("posts")
    .doc(postId)
    .collection("comments")
    .onSnapshot(snap => {

      const total = snap.size;

      const badge = document.getElementById("comment-badge-" + postId);
      if(!badge) return;

      if(total <= 0){
        badge.style.display = "none";
        return;
      }

      badge.style.display = "inline-flex";
      badge.innerText = total.toLocaleString("id-ID");

    });

}
