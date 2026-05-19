// POST
async function createPost(e){
  const btn = e.target;
  btn.disabled = true;
  btn.innerText = "Posting...";
  console.log("🔥 createPost dipanggil");
  
  const user = auth.currentUser;
  if (!user) {
    console.log("🔥 createPost dipanggil");
    alert("Login dulu!");
    btn.disabled = false;
    btn.innerText = "Posting";
    return;
  }

  const username = user.displayName || user.email;
  const avatar = user.photoURL || '';
  const content = document.getElementById('content').value;
   console.log("📝 content:", content); 

  const fileInput = document.getElementById('file');
  const file = fileInput.files[0];

  if(!content && !file){
    console.log("⚠️ kosong semua");
    btn.disabled = false;
    return;
  }

  let fileUrl = null;

  if(file){
    console.log("📁 upload file...");
    fileUrl = await uploadToCloudinary(file);
    console.log("✅ file URL:", fileUrl);
  }

  // 🔥 INI YANG BENAR: cek LIVE dari real system kamu
  //  const isLive = window.isLiveActive === true;
  //  console.log("🔴 isLive:", isLive);

  const docRef = await db.collection('posts').add({
  user: username,
  uid: user.uid,
  avatar: avatar,
  content: content || "",
  fileUrl: fileUrl || null,
  likes: [],
  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  // isLive: isLive
  // roomId: window.currentLiveRoomId || null // 🔥 INI YANG KURANG
});
// if (isLive) {
//   window.isLiveActive = false; // 🔥 reset biar post berikutnya normal
// }
console.log("🚀 POST SUKSES ID:", docRef.id);
  // reset UI
  document.getElementById('content').value = '';
  document.getElementById("fileInfo").innerText = '';
  fileInput.value = '';
  document.getElementById("previewBox").innerHTML = '';
   document.getElementById("postModal").classList.remove("show");

  btn.disabled = false;
  btn.innerText = "Posting";
}

function openPost() {
  document.getElementById("postModal").classList.add("show");
}

function closePost() {
  document.getElementById("postModal").classList.remove("show");
}

function addPost(id, p){

  let div = document.getElementById("post-" + id);
  const feed = document.getElementById("feed");

  // 🔥 kalau belum ada → buat
  if(!div){
    div = document.createElement("div");
    div.className = "post";
    div.id = "post-" + id;

    // 🔥 masukin ke ATAS (biar realtime terasa)
    feed.prepend(div);
    feed.scrollTop = 0;
  }



  const time = p.timestamp?.toDate?.().toLocaleString?.() 
            || (p.timestamp instanceof Date ? p.timestamp.toLocaleString() : "...");

  div.innerHTML = `
   ${p.fileUrl ? `<img src="${p.fileUrl}" style="max-width:100%;" class="post-media" alt="img" loading="lazy">` : ""}
    
    ${p.isLive ? `
<div class="live-box">
  <div style="position:absolute;top:5px;left:5px;color:red;font-weight:bold;">
    🔴 LIVE
  </div>
   <video 
    id="live-${id}" 
    autoplay 
    muted 
    playsinline
    style="width:100%;background:black;" preload="none"
  </video>  
</div>
` : ""}
<div class="post-header"  >
       <div class="avatar-user" 
     onclick="openChat('${p.uid}','${p.user}')"
      style="background-image:url('${p.avatar || ""}');position:relative;">
       <span id="badge-${p.uid}" 
    style="
      position:absolute;
      top:-5px;
      right:-5px;
      background:red;
      color:white;
      font-size:10px;
      width:16px;
      height:16px;
      border-radius:50%;
      display:none;
      align-items:center;
      justify-content:center;
    ">
    1
  </span>
     
      
    </div>
    
     
    </div>
       <div class="info hidden" id="info-${id}">
        <div class="post-user">${p.user}</div>
        <div class="post-time">${time}</div>
      </div>
     <div class="content">${renderContent(p.content)}</div>
     
   
    <div class="post-actions">
       <div style="font-size:11px;margin-left:8px;font-weight:bold;color:black;"> <span id="like-${id}">${p.likes?.length || 0}</span></div>
      <button onclick="toggleLike('${id}')"> <svg viewBox="0 0 24 24" class="icon-line">
      <path d="M12 21s-6.5-4.3-9-7.8C1.2 10.8 2.5 7 5.8 6.2c1.8-.4 3.5.5 4.2 2 0 0 1.5-2.4 4.2-2 3.3.8 4.6 4.6 2.8 7-2.5 3.5-9 7.8-9 7.8z"
        fill="none"
        stroke="white"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"/>
    </svg></button>
      <button onclick="toggleComment('${id}')"> <svg viewBox="0 0 24 24" class="icon-line">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
        fill="none"
        stroke="white"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"/>
    </svg></button>

     <button  onclick="toggleInfo('${id}')"><svg class="icon-line" width="24" height="24" viewBox="0 0 24 24">
  <line x1="4" y1="6" x2="20" y2="6" stroke="white" stroke-width="2"/>
  <line x1="4" y1="12" x2="20" y2="12" stroke="white" stroke-width="2"/>
  <line x1="4" y1="18" x2="20" y2="18" stroke="white" stroke-width="2"/>
</svg></button>

      ${(p.uid === auth.currentUser?.uid || window.isAdmin)
        ? `<button onclick="deletePost('${id}')"> <svg viewBox="0 0 24 24" class="icon-line">
    <path d="M3 6h18" 
      stroke="white" stroke-width="1.8" stroke-linecap="round"/>

    <path d="M8 6V4h8v2" 
      stroke="white" stroke-width="1.8" stroke-linecap="round"/>

    <path d="M6 6l1 14h10l1-14" 
      stroke="white" stroke-width="1.8" stroke-linecap="round"/>

    <path d="M10 11v6M14 11v6" 
      stroke="white" stroke-width="1.8" stroke-linecap="round"/>
  </svg></button>`
        : ""}
    </div>

    <div id="commentBox-${id}" style="display:none">
      <div class="comment-input">
        <input id="c${id}" placeholder="Tulis komentar...">
        <button onclick="addComment('${id}')">➤</button>
      </div>
   

      <div id="comments-${id}"></div>
    </div>
  `;

  // 🔥 init komentar hanya sekali
  initComments(id);
  
  
}

function loadReplies(postId, commentId){

  const key = `${postId}_${commentId}`;

  if(replyListeners[key]){
    replyListeners[key]();
     delete replyListeners[key];
  }

  const ref = db.collection("posts")
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .collection("replies")
    .orderBy("timestamp","asc");

  replyListeners[key] = ref.onSnapshot(snap => {

    const box = document.getElementById(`replies-${postId}-${commentId}`);
    if(!box) return;

     box.innerHTML = "";

   snap.forEach(rdoc => {

  const r = rdoc.data();

  const item = document.createElement("div");

  item.className = "comment";

  item.innerHTML = `
    <div class="avatar-reply"
         style="background-image:url('${r.avatar || ""}')">
    </div>

    <div>
      <div class="bubble">
        <b>${escapeHTML(r.user)}</b><br>
        ${escapeHTML(r.text)}
      </div>
    </div>
  `;

  box.appendChild(item);

});
  });
}

async function addReply(postId, commentId){

  const input = document.getElementById(`r-${postId}-${commentId}`);
  if(!input) return;

  const text = input.value.trim();
  if(!text) return;

  const user = auth.currentUser;

  await db.collection("posts")
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .collection("replies")
    .add({
      user: user?.displayName || "Anon",
      avatar: user?.photoURL || "",
      uid: user?.uid,
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = "";

  const box = document.getElementById(`reply-${postId}-${commentId}`);
  if(box) box.style.display = "none";
}

function showReplyInput(postId, i){
  const el = document.getElementById(`reply-${postId}-${i}`);
  if(el) el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener("click", (e) => {

  const btn = e.target.closest(".btn-reply");
  if(!btn) return;

  const postId = btn.dataset.post;
  const commentId = btn.dataset.comment;

  const box = document.getElementById(`reply-${postId}-${commentId}`);
  if(!box) return;

  box.style.display = box.style.display === "block" ? "none" : "block";
});


function initComments(postId){

  const box = document.getElementById("comments-" + postId);
  if(!box) return;

  const user = auth.currentUser;

  if(unsubscribeMap[postId]){
    unsubscribeMap[postId]();
  }

  commentState[postId] = {
    lastDoc: null,
    loading: false,
    hasMore: true,
    limit: 5
  };

 loadCommentsPage(postId, box, user);
}

function loadCommentsPage(postId, box, user){

  const state = commentState[postId];
  if(!state || state.loading || !state.hasMore) return;

  state.loading = true;

  let query = db.collection("posts")
    .doc(postId)
    .collection("comments")
    .orderBy("timestamp", "desc")
    .limit(state.limit);

  if(state.lastDoc){
    query = query.startAfter(state.lastDoc);
  }

  query.get().then(snap => {

    if(snap.empty){
      state.hasMore = false;
      state.loading = false;
      return;
    }

    state.lastDoc = snap.docs[snap.docs.length - 1];
    state.hasMore = snap.docs.length === state.limit;

    snap.forEach(doc => {

      const c = doc.data();
      const commentId = doc.id;

      if(document.getElementById(`comment-${commentId}`)) return;

      const el = document.createElement("div");
      el.className = "comment";
      el.id = `comment-${commentId}`;

      el.innerHTML = `
        <div style="display:flex;gap:8px;">

          <div style="width:30px;height:30px;border-radius:50%;
            background-image:url('${c.avatar || ""}');
            background-size:cover;">
          </div>

          <div style="flex:1">

            <div class="bubble">
              <b>${escapeHTML(c.user)}</b><br>
              ${escapeHTML(c.text)}
            </div>

            <div class="actions">

              <span class="btn-reply"
                data-post="${postId}"
                data-comment="${commentId}"
                data-parent="${commentId}">
                💬 balas
              </span>

              <span class="btn-delete-comment"
                data-post="${postId}"
                data-id="${commentId}">
                🗑 hapus
              </span>

            </div>

            <!-- 🔥 FIX: SELALU ADA (NO DISPLAY NONE TOTAL) -->
            <div class="reply-box" id="reply-${postId}-${commentId}" style="display:none;">
  <input id="r-${postId}-${commentId}"
         placeholder="Tulis balasan..."
         style="width:70%;margin-top:5px;">
  <button onclick="addReply('${postId}','${commentId}')">
    ➤
  </button>
</div>

            <div class="replies" id="replies-${postId}-${commentId}"></div>

          </div>
        </div>
      `;

      box.appendChild(el);

      setTimeout(() => {
        loadReplies(postId, commentId);
      }, 0);

    });

    state.loading = false;
    updateLoadMore(postId, box, user);
  });
}
function updateLoadMore(postId, box, user) {
  const state = commentState[postId];
  const btnId = "loadMore-" + postId;

  let btn = document.getElementById(btnId);

  // 🔥 kalau sudah habis
  if(!state.hasMore){
    if(btn) btn.remove();
    return;
  }

  // 🔥 kalau masih ada data
  if(!btn){
    btn = document.createElement("button");
    btn.id = btnId;
    btn.innerText = "Lihat Komentar Lainnya";
     btn.style.cursor = "pointer";
    btn.style.color = "#65676b";
    btn.style.fontSize = "14px";
    btn.style.margin = "5px 0";

    btn.onclick = () => loadCommentsPage(postId, box, user);
    box.appendChild(btn);
  }
  
}



async function addComment(postId){
  const input = document.getElementById('c' + postId);
  const text = input.value.trim();
  if(!text) return;

  const user = auth.currentUser;
  if(!user){
    alert("Login dulu!");
    return;
  }

  await db.collection('posts')
    .doc(postId)
    .collection('comments')
    .add({
      user: user.displayName || user.email,
      uid: user.uid,
      avatar: user.photoURL || "",
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

  input.value = '';
  const box = document.getElementById("comments-" + postId);

if(commentState[postId]){
    commentState[postId].lastDoc = null;
    commentState[postId].hasMore = true;
    commentState[postId].loading = false;
  }

  if(box){
    box.innerHTML = "";
    loadCommentsPage(postId, box, user);
  }
}


function toggleComment(postId){
  const box = document.getElementById("commentBox-" + postId);
  if(!box) return;

  box.style.display = (box.style.display === "block") ? "none" : "block";
}

async function deleteCommentNew(postId, commentId){

  const user = auth.currentUser;
  const isAdmin = window.isAdmin === true;

  const ref = db.collection("posts")
    .doc(postId)
    .collection("comments")
    .doc(commentId);

  const snap = await ref.get();

  if(!snap.exists){
    alert("Komentar sudah tidak ada (sync issue)");
    return;
  }

  const data = snap.data();

  if(!data || !data.uid){
    alert("Data komentar rusak");
    return;
  }

  const isOwner = user && data.uid === user.uid;

  if(!isAdmin && !isOwner){
    alert("❌ Tidak boleh hapus komentar ini");
    return;
  }

   await ref.delete();

  // 🔥 HAPUS 1 ELEMENT SAJA (INI KUNCI)
  const el = document.getElementById(`comment-${commentId}`);
  if(el){
    el.remove();
  }

}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-delete-comment");
  if (!btn) return;

  const postId = btn.dataset.post;
  const commentId = btn.dataset.id;

  await deleteCommentNew(postId, commentId);
});

async function toggleLike(id){
  const user = auth.currentUser;

  if(!user){
    alert("Login dulu!");
    return;
  }

  const userId = user.uid; // paling aman (unik)
  const ref = db.collection('posts').doc(id);

  await db.runTransaction(async (t) => {
    const docSnap = await t.get(ref);
    let likes = docSnap.data().likes || [];

    if(likes.includes(userId)){
      likes = likes.filter(u => u !== userId);
    } else {
      likes.push(userId);
    }

    t.update(ref, { likes });
  });
}
// DELETE
async function deletePost(id){
  const currentUser = auth.currentUser;
  const docSnap = await db.collection('posts').doc(id).get();
  const data = docSnap.data();

  const isAdmin = window.isAdmin === true;
  const isOwner = currentUser && data.uid === currentUser.uid;

  if(!isAdmin && !isOwner){
    alert("❌ Tidak boleh hapus");
    return;
  }

  if(confirm('Hapus?')){
    await db.collection('posts').doc(id).delete();
  }
}
function updatePost(id, p){
  const likeEl = document.getElementById("like-" + id);
  if(likeEl){
    likeEl.innerText = p.likes?.length || 0;
  }
}

function removePost(id){
  const el = document.getElementById("post-" + id);
  if(el) el.remove();
}
