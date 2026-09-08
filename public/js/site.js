const btn=document.querySelector('.menu-toggle');const nav=document.querySelector('.site-header nav');if(btn&&nav){btn.addEventListener('click',()=>{const open=nav.dataset.open==='1';nav.dataset.open=open?'0':'1';nav.style.display=open?'none':'flex';if(!open){nav.style.position='absolute';nav.style.top='72px';nav.style.left='0';nav.style.right='0';nav.style.flexDirection='column';nav.style.background='#080808';nav.style.padding='22px';}});}


document.querySelectorAll("[data-artist-carousel]").forEach((carousel)=>{
  const track=carousel.querySelector(".artist-carousel-track");
  const prev=carousel.querySelector(".artist-carousel-prev");
  const next=carousel.querySelector(".artist-carousel-next");
  if(!track)return;
  const step=()=>{
    const card=track.querySelector(".artist-card");
    if(!card)return Math.max(track.clientWidth*.8,240);
    const gap=parseFloat(getComputedStyle(track).gap||"0")||0;
    return card.getBoundingClientRect().width+gap;
  };
  const update=()=>{
    if(!prev||!next)return;
    const max=Math.max(0,track.scrollWidth-track.clientWidth);
    prev.disabled=track.scrollLeft<=3;
    next.disabled=track.scrollLeft>=max-3;
  };
  prev?.addEventListener("click",()=>track.scrollBy({left:-step(),behavior:"smooth"}));
  next?.addEventListener("click",()=>track.scrollBy({left:step(),behavior:"smooth"}));
  track.addEventListener("scroll",update,{passive:true});
  window.addEventListener("resize",update);
  update();
});
