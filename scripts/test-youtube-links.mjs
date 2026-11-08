import assert from "node:assert/strict";
import test from "node:test";
import {
  YOUTUBE_URL_ERROR,
  embedUrl,
  openUrl,
  parseYoutubeUrl,
} from "../src/lib/youtube/links.ts";

const VIDEO_ID = "dQw4w9WgXcQ";
const VIDEO_ID_ALT = "aBcDeFgHiJ-";
const PLAYLIST_ID = "PL1234567890abcdef";

function accepted(input, kind, youtubeId) {
  const result = parseYoutubeUrl(input);

  assert.equal(result.ok, true, `Lien refusé à tort : ${input}`);

  if (!result.ok) {
    return;
  }

  assert.equal(result.link.kind, kind, `Type inattendu pour : ${input}`);
  assert.equal(
    result.link.youtubeId,
    youtubeId,
    `Identifiant inattendu pour : ${input}`,
  );
}

function refused(input) {
  const result = parseYoutubeUrl(input);

  assert.equal(result.ok, false, `Lien accepté à tort : ${input}`);

  if (result.ok) {
    return;
  }

  assert.equal(
    result.error,
    YOUTUBE_URL_ERROR,
    `Message d'erreur inattendu pour : ${input}`,
  );
}

test("accepte les adresses de vidéos", () => {
  accepted(`https://www.youtube.com/watch?v=${VIDEO_ID}`, "video", VIDEO_ID);
  accepted(
    `https://www.youtube.com/watch?v=${VIDEO_ID}&list=${PLAYLIST_ID}&index=2`,
    "video",
    VIDEO_ID,
  );
  accepted(`https://youtube.com/watch?v=${VIDEO_ID}`, "video", VIDEO_ID);
  accepted(`https://m.youtube.com/watch?v=${VIDEO_ID}`, "video", VIDEO_ID);
  accepted(`https://www.youtube.com/watch?v=${VIDEO_ID_ALT}`, "video", VIDEO_ID_ALT);
  accepted(`https://youtu.be/${VIDEO_ID}`, "video", VIDEO_ID);
  accepted(`https://youtu.be/${VIDEO_ID}?t=30`, "video", VIDEO_ID);
  accepted(`https://youtu.be/${VIDEO_ID}/`, "video", VIDEO_ID);
  accepted(`https://www.youtube.com/shorts/${VIDEO_ID}`, "video", VIDEO_ID);
  accepted(
    `https://www.youtube.com/embed/${VIDEO_ID}?start=5`,
    "video",
    VIDEO_ID,
  );
  accepted(
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    "video",
    VIDEO_ID,
  );
  accepted(`https://www.youtube.com/live/${VIDEO_ID}`, "video", VIDEO_ID);
});

test("accepte les adresses de playlists", () => {
  accepted(
    `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`,
    "playlist",
    PLAYLIST_ID,
  );
  accepted(
    `https://m.youtube.com/playlist?list=${PLAYLIST_ID}&si=abcdef`,
    "playlist",
    PLAYLIST_ID,
  );
  accepted(
    `https://youtube.com/playlist?list=${PLAYLIST_ID}`,
    "playlist",
    PLAYLIST_ID,
  );
  accepted(
    `https://www.youtube-nocookie.com/playlist?list=${PLAYLIST_ID}`,
    "playlist",
    PLAYLIST_ID,
  );
  accepted(
    "https://www.youtube.com/playlist?list=ABCDEFGHIJ",
    "playlist",
    "ABCDEFGHIJ",
  );
});

test("refuse les protocoles, hôtes et identifiants non valides", () => {
  refused(`http://www.youtube.com/watch?v=${VIDEO_ID}`);
  refused(`https://youtube.com.evil.com/watch?v=${VIDEO_ID}`);
  refused(`https://youtu.be.evil.com/${VIDEO_ID}`);
  refused(`https://www.youtube-nocookie.com.evil.com/embed/${VIDEO_ID}`);
  refused(`https://evil.com/watch?v=${VIDEO_ID}`);
  refused("javascript:alert(1)");
  refused("data:text/html,<script>alert(1)</script>");
  refused(`https://user:pass@www.youtube.com/watch?v=${VIDEO_ID}`);
  refused(`https://user@youtu.be/${VIDEO_ID}`);
  refused(`https://www.youtube.com:8443/watch?v=${VIDEO_ID}`);
  refused(`ftp://www.youtube.com/watch?v=${VIDEO_ID}`);
  refused(`https://www.youtube.com/channel/UC1234567890abcdefghij`);
  refused("https://www.youtube.com/@somechannel");
  refused("https://www.youtube.com/results?search_query=test");
  refused(`https://www.youtube.com/watch?list=${PLAYLIST_ID}`);
  refused(`https://www.youtube.com/watch?v=dQw4w9WgXc`);
  refused(`https://www.youtube.com/watch?v=dQw4w9WgXcQx`);
  refused("https://www.youtube.com/watch?v=dQw4w9WgX!Q");
  refused("https://www.youtube.com/playlist?list=short");
  refused(`https://www.youtube.com/playlist?list=${"a".repeat(65)}`);
  refused(`https://youtu.be/${VIDEO_ID}/extra`);
  refused("https://www.youtube.com/embed/");
  refused("https://www.youtube.com/shorts/");
  refused("https://www.youtube.com/");
  refused("");
  refused("   ");
  refused("pas une adresse");
});

test("reconstruit les adresses d'intégration et de lecture", () => {
  assert.equal(
    embedUrl("video", VIDEO_ID),
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
  );
  assert.equal(
    embedUrl("playlist", PLAYLIST_ID),
    `https://www.youtube-nocookie.com/embed/videoseries?list=${PLAYLIST_ID}`,
  );
  assert.equal(
    openUrl("video", VIDEO_ID),
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  );
  assert.equal(
    openUrl("playlist", PLAYLIST_ID),
    `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`,
  );
});
