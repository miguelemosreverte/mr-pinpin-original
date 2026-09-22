for(const image of document.querySelectorAll('img[data-src]')) {
  const caption=image.nextElementSibling;
  image.addEventListener('load',()=>{image.hidden=false;caption.hidden=true;});
  image.addEventListener('error',()=>{image.hidden=true;caption.hidden=false;caption.textContent='Reference pending';});
  image.src=image.dataset.src;
}

const state=document.getElementById('model-state');
fetch('../models/pinpin-v2/model.glb',{method:'HEAD',cache:'no-store'})
  .then(response=>{state.textContent=response.ok ? 'Available' : response.status===404 ? 'Pending' : 'Availability unknown';})
  .catch(()=>{state.textContent='Availability unknown';});
