async function loadMovies(){
  const box = document.getElementById("movieList");
  box.innerHTML = "⏳ Loading film...";

  try{
   const keyword = document.getElementById("search").value || "movie";

const res = await fetch(
  `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${keyword}+full+movie&type=video&videoDuration=long&maxResults=10&key=${YT_API_KEY}`
);
    const data = await res.json();
    console.log(data)
    renderMovies(data.items);

  } catch(e){
    box.innerHTML = "❌ Gagal load film";
  }
}

let allMovies = [];

function renderMovies(list){
  allMovies = list;

  const box = document.getElementById("movieList");
  box.innerHTML = "";

  list.forEach(v => {
    const id = v.id.videoId;
    const title = v.snippet.title;
   
    const img = v.snippet.thumbnails.medium.url;

    box.innerHTML += `
      <div onclick="playMovie('${id}')"
        style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #ddd;cursor:pointer;align-items:center;">
        
        <img src="${img}" style="width:80px;border-radius:8px;" alt="gambar produk" loading="lazy">
        
        <div>🎬 ${title}</div>
      </div>
    `;
  });
}
//  search movie
window.onload = function(){

  let searchTimer;
  const movieCache = {};

  document.getElementById("search").addEventListener("input", function(){

    clearTimeout(searchTimer);

    searchTimer = setTimeout(async () => {

      const keyword = this.value.trim() || "movie";
      const box = document.getElementById("movieList");

      box.innerHTML = "⏳ Cari film...";

      try{

        // 🔥 CACHE HIT (hemat API)
        if(movieCache[keyword]){
          renderList(movieCache[keyword], box);
          return;
        }

        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${keyword}+movie&type=video&videoDuration=long&maxResults=20&key=${YT_API_KEY}`
        );

        const data = await res.json();

        movieCache[keyword] = data.items;

        renderList(data.items, box);

      } catch(e){
        box.innerHTML = "❌ Gagal cari film";
      }

    }, 700); // ⏱ delay biar gak spam API

  });


  // 🔥 pisahin render biar clean
  function renderList(items, box){
    box.innerHTML = "";

    items.forEach(v => {
      const id = v.id.videoId;
      const title = v.snippet.title;
      const img = v.snippet.thumbnails.medium.url;

      box.innerHTML += `
        <div onclick="playMovie('${id}')"
          style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #ddd;cursor:pointer;align-items:center;">
          
          <img src="${img}" style="width:80px;border-radius:8px;" alt="movie" loading="lazy">
          
          <div>🎬 ${title}</div>
        </div>
      `;
    });
  }

}

// iklan di movies
function showMovieAd(){
  if(!adsReady || !products.length){
    console.log("ADS belum ready");
    return;
  }

  const item = products[Math.floor(Math.random() * products.length)];
  if(!item?.img) return;

  const ad = document.createElement("div");

  ad.innerHTML = `
    <div style="display:flex;gap:10px;padding:10px;background:transparent;border-radius:10px;justify-content:center;align-items:center;">
      <img src="${item.img}" style="width:70px;height:70px;object-fit:cover;" alt="iklan" loading="lazy">
      <div>
        <b>${item.name}</b><br>
        <button onclick="window.open('${item.link}','_blank')"style="margin-top:5px;background:#28a745;color:white;border:none;padding:5px 10px;border-radius:6px;">Beli</button>
      </div>
    </div>
  `;

  const container = document.getElementById("movieList");
  const items = container.children;
  const middle = Math.floor(items.length / 2);

  if(items.length > 0){
    container.insertBefore(ad, items[middle]);
  } else {
    container.appendChild(ad);
  }

  setTimeout(() => ad.remove(), 8000);
}
function playMovie(id){
  const player = document.getElementById("playerBox");

  player.innerHTML = `
    <div style="position:fixed;bottom:0;left:0;width:100%;background:#000;z-index:100000;padding:10px;">
      
      <iframe
        width="100%"
        height="220"
        src="https://www.youtube.com/embed/${id}?autoplay=1"
        allow="autoplay; encrypted-media"
        allowfullscreen>
      </iframe>

      <button onclick="window.open('https://www.youtube.com/watch?v=${id}','_blank')"
        style="position:absolute;top:5px;left:10px;background:#fff;color:#000;border:none;padding:5px 10px;border-radius:6px;">
        ▶️ Buka di YouTube
      </button>

      <button onclick="closePlayer()"
        style="position:absolute;top:5px;right:25px;background:red;color:white;border:none;border-radius:50%;width:30px;height:30px;">
        ✕
      </button>
    </div>
  `;
}

function closePlayer(){
  document.getElementById("playerBox").innerHTML = "";
 
}

function openMovies(){
  document.getElementById("movieSection").classList.toggle("show")

  loadMovies(); // 🔥 dipanggil di sini
}
window.addEventListener("load", () => {
  const movieList = document.getElementById("movieList");
  let movieLastStep = 0;

  movieList.addEventListener("scroll", function () {
    console.log("SCROLL MOVIE JALAN");
    const step = Math.floor(movieList.scrollTop / 600);

    if (step > movieLastStep) {
       showMovieAd();
      movieLastStep = step;
    }
  });
});