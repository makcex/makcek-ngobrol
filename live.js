// LIVE VIDEO
window.liveState = {
  isLive: false,
  viewerCount: 0,
  status: "OFF"
};

window.liveStreams = window.liveStreams || {};


const iceServers = [
  // 🔵 STUN (gratis, cepat)
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },

  // 🟢 TURN (openrelay - GRATIS)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];


window.liveState = {
  isLive: false,
  roomId: null,
  stream: null,
  viewerCount: 0,
  pcs: {} // viewerId -> RTCPeerConnection
  
};

window.localStream = null;
window.pc = null; // host peer (single viewer per pc instance if simple)
window.viewerPCs = {};
window.currentRoomId = null;
window.liveState.unsubs ||= [];


function renderLiveUI() {
  let el = document.getElementById("live-container");

  if (!el) {
    el = document.createElement("div");
    el.id = "live-container";
    document.body.appendChild(el);
  }

  el.innerHTML = `
    <video id="localVideo"
      autoplay
      muted
      playsinline
      style="width:100%;height:100%;object-fit:cover;background:black;" preload="none"></video>

    <div id="live-status"
      style="position:absolute;top:33px;left:10px;color:white;">
      LIVE STARTING...
    </div>
  `;
}

function updateLiveUI() {
  const s = window.liveState;

  const status =
    !s.isLive ? "OFF" :
    s.viewerCount === 0 ? "NO VIEWER" :
    "LIVE";

  const el = document.getElementById("live-status");
  if (el) {
    el.innerText = `${status} | VIEWERS: ${s.viewerCount}`;
  }
}

async function startLive() {

  const user = auth.currentUser;
  if (!user) return;

  renderLiveUI();

  // 🔥 AMBIL CAMERA DULU
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  // 🔥 SIMPAN BARU
 
 window.liveState.stream = stream;
  window.liveState.isLive = true;

 const roomId = user.uid;

await db.collection("liveRooms")
  .doc(roomId)
  .set({
    active: true,
    hostId: user.uid,
    hostName: user.displayName || "User",
    hostPhoto: user.photoURL || "",
    viewerCount: 0,
    createdAt: Date.now()
  }, { merge: true });

window.liveState.roomId = roomId;

listenViewers(roomId);

  // 🔥 BARU LOG (INI YANG BENAR)
  console.log("🔥 STREAM OK:", stream);
  console.log("VIDEO TRACK:", stream.getVideoTracks());
  console.log("AUDIO TRACK:", stream.getAudioTracks());

  const video = document.querySelector("#live-container video");

  if (!video) {
    console.log("❌ VIDEO NOT FOUND");
    return;
  }

  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play().catch(err => console.log(err));
  };

  console.log("🎥 STREAM ATTACHED");
}

function listenViewers(roomId) {

  const unsub = db.collection("liveRooms")
    .doc(roomId)
    .collection("viewers")
    .onSnapshot(snapshot => {

      console.log("👀 VIEWER UPDATE:", snapshot.size);

      window.liveState.viewerCount = snapshot.size;
      db.collection("liveRooms")
  .doc(roomId)
  .set({
    viewerCount: snapshot.size
  }, { merge: true });

      updateLiveUI();

      snapshot.forEach(doc => {

  const viewerId = doc.id;

  const data = doc.data();

  // 🔥 VIEWER MATI / GHOST
  if (
    data.lastSeen &&
    Date.now() - data.lastSeen > 30000
  ) {

    console.log("🗑️ DEAD VIEWER:", viewerId);

    doc.ref.delete().catch(console.error);

    return;
  }

  // 🔥 viewer belum punya peer
  if (!window.liveState.pcs[viewerId]) {

    console.log("➕ VIEWER MASUK:", viewerId);

    handleViewer(
      viewerId,
      doc.ref
    );
  }
});
    }, error => {
      console.log("❌ LISTENER ERROR:", error);
    });
    window.liveState.unsubs.push(unsub);
}
async function handleViewer(viewerId, viewerRef) {

  console.log("⚡ HANDLE VIEWER:", viewerId);

  if (window.liveState.pcs[viewerId]) return;

  const stream = window.liveState.stream;

  if (!stream) {
    console.log("❌ STREAM BELUM READY");
    return;
  }

  const pc = new RTCPeerConnection(iceServers);
  window.liveState.pcs[viewerId] = pc;

  // kirim stream ke viewer
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
  });

  // ICE host → viewer
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      viewerRef.collection("hostCandidates").add(e.candidate.toJSON());
    }
  };

  let buffer = [];

  // ICE viewer → host
  viewerRef.collection("viewerCandidates")
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const c = new RTCIceCandidate(change.doc.data());

          if (!pc.remoteDescription) {
            buffer.push(c);
          } else {
            pc.addIceCandidate(c).catch(console.error);
          }
        }
      });
    });

  // OFFER
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

 await viewerRef.set({
  offer: pc.localDescription.toJSON()
}, { merge: true });
  console.log("📡 OFFER SENT:", pc.localDescription);

  // ANSWER (FIXED)
  viewerRef.onSnapshot(async snap => {
    const data = snap.data();

    if (data?.answer && !pc.currentRemoteDescription) {
      await pc.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );

      // flush ICE
      buffer.forEach(c => pc.addIceCandidate(c).catch(console.error));
      buffer = [];
    }
  });

  // cleanup
  pc.onconnectionstatechange = async () => {

  console.log(
    "📶 VIEWER:",
    pc.connectionState
  );

  if (
    [
      "failed",
      "closed",
      "disconnected"
    ].includes(pc.connectionState)
  ) {

    try {

      pc.close();

    } catch (e) {}

    try {

      await viewerRef.delete();

    } catch (e) {}
  }
};
}

function watchLiveRooms() {

  db.collection("liveRooms")
    .where("active", "==", true)
    .onSnapshot(snapshot => {

      const box =
        document.getElementById("liveUsers");

      if (!box) return;

      box.innerHTML = "";

      snapshot.forEach(doc => {

        const data = doc.data();

        box.innerHTML += `
          <div
            onclick="joinRoom('${doc.id}')"
            style="
              color: #777;
              text-shadow:
    0 1px 1px rgba(0,0,0,0.9),     /* shadow bawah */
    0 3px 6px rgba(0,0,0,0.7),     /* depth */
    0 -1px 2px rgba(255,255,255,0.25); /* 🔥 highlight diperkuat */
  letter-spacing: 0.3px; /* biar lebih clean */

  transition: all 0.25s ease;
              cursor:pointer;
              font-size:10px;
              z-index:5;
            "
          >
             ${data.hostName || "" }
          </div>
        `;
      });
    });
}
async function joinRoom(roomId) {

  console.log("📱 JOIN ROOM:", roomId);

  const pc = new RTCPeerConnection(iceServers);

  // BUAT DOC VIEWER DULU
  const viewerRef = db.collection("liveRooms")
    .doc(roomId)
    .collection("viewers")
    .doc();

  await viewerRef.set({
    createdAt: Date.now()
  });
const heartbeat = setInterval(() => {

  viewerRef.update({
    lastSeen: Date.now()
  }).catch(() => {});

}, 10000);

window.addEventListener("beforeunload", async () => {

  console.log("🛑 VIEWER TAB CLOSED");

  clearInterval(heartbeat);

  try {

    pc.close();

  } catch (e) {}

  try {

    await viewerRef.delete();

    console.log("🗑️ VIEWER CLEANED");

  } catch (e) {}
});
  
window.currentViewerRef = viewerRef;
window.currentViewerPC = pc;//  tambahan

window.addEventListener("beforeunload", async () => {

  try {

    pc.close();

    await viewerRef.delete();

  } catch (e) {}
});// tambahan

createStopButton();

  // TERIMA STREAM
  pc.ontrack = (event) => {

    let video = document.querySelector("#remoteVideo");

    if (!video) {
      video = document.createElement("video");
      video.id = "remoteVideo";
      video.autoplay = true;
      video.playsInline = true;
      video.controls = true;
      video.preload ="none"
      video.style.position = "fixed";
video.style.top = "0";
video.style.left = "0";
video.style.width = "100vw";
video.style.height = "100vh";
video.style.objectFit = "cover";
video.style.background = "red";
video.style.zIndex = "2";
video.style.display = "block";
video.style.opacity = "1";
video.style.visibility = "visible";


      document.body.appendChild(video);
    }
    

    video.srcObject = event.streams[0];
  };

  // ICE VIEWER -> HOST
  pc.onicecandidate = (e) => {
    if (e.candidate) {

      viewerRef
        .collection("viewerCandidates")
        .add(e.candidate.toJSON());
    }
  };

  // TERIMA OFFER
  viewerRef.onSnapshot(async snap => {

    const data = snap.data();

    if (data?.offer && !pc.currentRemoteDescription) {

      await pc.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      await viewerRef.update({
        answer: pc.localDescription.toJSON()
      });
    }
  });

  // HOST ICE
  viewerRef
    .collection("hostCandidates")
    .onSnapshot(snapshot => {

      snapshot.docChanges().forEach(change => {

        if (change.type === "added") {

          pc.addIceCandidate(
            new RTCIceCandidate(change.doc.data())
          ).catch(console.error);
        }
      });
    });

  console.log("📡 VIEWER READY");
}
function stopViewerLive() {

  console.log("🚪 VIEWER EXIT ROOM");

  // 🔥 tutup peer connection viewer
  if (window.currentViewerPC) {
    try {
      window.currentViewerPC.close();
    } catch (e) {}
  }

  // 🔥 hapus doc viewer di firestore
  if (window.currentViewerRef) {
    try {
      window.currentViewerRef.delete();
    } catch (e) {}
  }

  // reset state
  window.currentViewerPC = null;
  window.currentViewerRef = null;
  window.currentRoomId = null;

  // hapus video
  const v = document.querySelector("#remoteVideo");
  if (v) v.remove();

  const btn = document.getElementById("btn-stop-viewer");
  if (btn) btn.remove();

  console.log("✅ VIEWER LEFT ROOM");
}

function createStopButton() {

  if (document.getElementById("btn-stop-viewer")) return;

  const btn = document.createElement("button");

  btn.id = "btn-stop-viewer";
  btn.innerText = "STOP LIVE";

  btn.onclick = stopViewerLive;

  btn.style.cssText = `
    position:fixed;
    bottom:20px;
    right:20px;
    z-index:999999;
    padding:1px 1px;
    background:red;
    color:white;
    border:none;
    border-radius:10px;
    
  `;

  document.body.appendChild(btn);
}

async function stopLive() {

  console.log("🛑 STOP LIVE DIJALANKAN");

  window.liveState.isLive = false;

  const roomId = window.liveState.roomId;

  // 🔥 update Firestore
  if (roomId) {
    await db.collection("liveRooms")
      .doc(roomId)
  .delete();
  }

  // 🔥 STOP CAMERA STREAM
  if (window.localStream) {
    window.localStream.getTracks().forEach(track => {
      track.stop();
    });
    window.localStream = null;
  }

  if (window.liveState.stream) {
    window.liveState.stream.getTracks().forEach(track => {
      track.stop();
    });
    window.liveState.stream = null;
  }

  // 🔥 CLOSE ALL PEER CONNECTIONS
  Object.values(window.liveState.pcs).forEach(pc => {
    try {
      pc.close();
    } catch (e) {}
  });

  window.liveState.pcs = {};

  // 🔥 RESET STATE
  window.liveState.roomId = null;
  window.liveState.viewerCount = 0;

  // 🔥 HAPUS UI BIAR CLEAR
  const el = document.getElementById("live-container");
  if (el) el.remove();

  const btn = document.getElementById("btn-stop-viewer");
  if (btn) btn.remove();

  updateLiveUI();

  console.log("✅ LIVE SUDAH STOP TOTAL");
}
