function openAffiliate(){

  // hide section lain
  document.getElementById("movieSection").classList.remove("show");

  // toggle affiliate
  const box = document.getElementById("affiliateSection");

  if(box.style.display === "block"){
    box.style.display = "none";
  } else {
    box.style.display = "block";
    loadAffiliate(); // 🔥 load produk
  }
}


let affiliateProducts = [];

async function loadAffiliate(){

  const box = document.getElementById("affiliateList");
  box.innerHTML = "Loading...";

  try {
    const snap = await db.collection("iklan").get();

    affiliateProducts = snap.docs.map(doc => doc.data());

    box.innerHTML = "";

    affiliateProducts.forEach(p => {

      box.innerHTML += `
        <div style="
          display:flex;
          gap:10px;
          padding:10px;
          margin-bottom:10px;
          background:transparent;
          border-radius:10px;
          box-shadow:0 2px 8px rgba(0,0,0,0.1);
          max-width: 300px;
        ">
          
          <img src="${p.img}" style="width:80px;border-radius:8px;" alt="gambar produk" loading="lazy">

          <div style="flex:1;">
            <div style="font-weight:bold;">${p.name}</div>

            <button onclick="window.open('${p.link}','_blank')" 
              style="margin-top:5px;background:#28a745;color:white;border:none;padding:5px 10px;border-radius:6px;">
              Beli Sekarang
            </button>
          </div>

        </div>
      `;
    });

    console.log("AFFILIATE LOADED:", affiliateProducts);

  } catch (e) {
    console.log("AFFILIATE ERROR:", e);
    box.innerHTML = "Gagal load data";
  }
}
function closeAffiliate(){
  document.getElementById("affiliateSection").style.display = "none";
}