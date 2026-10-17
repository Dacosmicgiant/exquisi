/**
 * Menu analytics without a client component: an inline script (rendered once into the static HTML)
 * sends one `menu_view` per page load and a `story_open` when a diner opens a dish story. It uses
 * sendBeacon, never blocks rendering, and fails silently. Not rendered in the admin preview.
 */
export function AnalyticsBeacon({ slug, lang }: { slug: string; lang: string }) {
  const code = `(function(){try{var S=${JSON.stringify(slug)},L=${JSON.stringify(lang)};var s;try{s=sessionStorage.getItem("ms-sid");if(!s){s=((window.crypto&&crypto.randomUUID)?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/-/g,"");sessionStorage.setItem("ms-sid",s)}}catch(e){s="anon"+Math.random().toString(36).slice(2,12)}
function send(t,d){try{var b=JSON.stringify({slug:S,language:L,session_id:s,type:t,dish_id:d||undefined});if(!(navigator.sendBeacon&&navigator.sendBeacon("/api/events",new Blob([b],{type:"application/json"}))))fetch("/api/events",{method:"POST",body:b,keepalive:true,headers:{"content-type":"application/json"}}).catch(function(){})}catch(e){}}
send("menu_view");document.addEventListener("toggle",function(e){var t=e.target;if(t&&t.classList&&t.classList.contains("story")&&t.open)send("story_open",t.getAttribute("data-dish"))},true)}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
