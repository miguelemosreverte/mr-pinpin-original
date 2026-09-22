const revision=new URLSearchParams(location.search).get('rev');
for(const image of document.querySelectorAll('img[data-src]')) {
  const caption=image.nextElementSibling;
  image.addEventListener('load',()=>{image.hidden=false;caption.hidden=true;});
  image.addEventListener('error',()=>{image.hidden=true;caption.hidden=false;caption.textContent='Render pending';});
  image.src=image.dataset.src.includes('/pinpin-v3/') ? revisionUrl(image.dataset.src) : image.dataset.src;
}

const state=document.getElementById('model-state');
fetch(revisionUrl('../models/pinpin-v3/model.glb'),{method:'HEAD',cache:'no-store'})
  .then(response=>{state.textContent=response.ok ? 'Available' : response.status===404 ? 'Pending' : 'Availability unknown';})
  .catch(()=>{state.textContent='Availability unknown';});
function revisionUrl(path) {
  const url=new URL(path,location.href);
  if(revision)url.searchParams.set('rev',revision);
  return url.href;
}
for(const link of document.querySelectorAll('a[href]')) {
  if(link.getAttribute('href').includes('model=v3') || link.getAttribute('href').includes('/pinpin-v3/'))link.href=revisionUrl(link.href);
}
document.getElementById('revision-state').textContent=revision ? `Requested revision: ${revision}.` : 'Current published study.';
