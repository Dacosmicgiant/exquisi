/**
 * Two small conveniences for the folding categories, as an inline script (no client component, like the analytics
 * and speech scripts): opening a category scrolls it to the top of the screen (otherwise the one that just closed
 * above it shifts the page), and a link ending in #cat-<key> opens that category. Without JS the menu still works.
 */
export function CategoryScript() {
  const code = `(function(){try{var r=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)");
function openHash(){var h=location.hash.slice(1);if(h.indexOf("cat-")!==0)return;var el=document.getElementById(h);if(el&&el.tagName==="DETAILS"){el.open=true;el.scrollIntoView()}}
openHash();addEventListener("hashchange",openHash);
document.addEventListener("toggle",function(e){var t=e.target;if(!t||!t.classList||!t.classList.contains("cat")||!t.open)return;
requestAnimationFrame(function(){var y=t.getBoundingClientRect().top;if(y<0||y>innerHeight*0.4)t.scrollIntoView({behavior:r&&r.matches?"auto":"smooth",block:"start"})})},true)}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
