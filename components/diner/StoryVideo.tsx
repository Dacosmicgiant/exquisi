import { youtubePosterUrl, youtubeWatchUrl } from "@/lib/media/youtube";

/**
 * A dish's story video: poster first, player only on tap (rule 4: never preload video). Server-rendered; the poster is a
 * plain link to YouTube so it still works with scripts off. `StoryVideoScript` swaps the link for the player on tap.
 * The poster sits inside the closed story fold, so nothing is requested from YouTube until the diner opens the story.
 */
export function StoryVideo({ id, dishId, label }: { id: string; dishId: string; label: string }) {
  return (
    <div className="yt" data-yt={id} data-dish={dishId}>
      <a className="yt-play" href={youtubeWatchUrl(id)} target="_blank" rel="noopener noreferrer" aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={youtubePosterUrl(id)} alt="" width={480} height={360} loading="lazy" decoding="async" />
        <span className="yt-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </span>
      </a>
    </div>
  );
}

/**
 * Inline script (no client component, like the analytics and speech scripts): on tap, replaces the poster with the
 * privacy-enhanced YouTube embed and plays it; when its story or category is closed the player is put back, so a video
 * hidden inside a folded section never keeps playing. Only rendered when the menu has a video.
 */
export function StoryVideoScript() {
  const code = `(function(){try{var ID=/^[A-Za-z0-9_-]{11}$/;
function reset(root){var l=root.querySelectorAll("[data-yt]");for(var i=0;i<l.length;i++){var w=l[i];if(w.__o!=null){w.innerHTML=w.__o;w.__o=null}}}
document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("[data-yt] a.yt-play");if(!a)return;var w=a.parentNode,id=w.getAttribute("data-yt");if(!ID.test(id||""))return;e.preventDefault();
var f=document.createElement("iframe");f.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&rel=0&playsinline=1&modestbranding=1";f.title=a.getAttribute("aria-label")||"Video";f.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";f.allowFullscreen=true;f.referrerPolicy="strict-origin-when-cross-origin";
w.__o=w.innerHTML;w.replaceChildren(f)});
document.addEventListener("toggle",function(e){var t=e.target;if(t&&!t.open&&t.classList&&(t.classList.contains("story")||t.classList.contains("cat")))reset(t)},true)}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
