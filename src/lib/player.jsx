import { createContext, useContext, useEffect, useRef, useState } from 'react';

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);

let audio = null;
if (typeof window !== 'undefined') {
  audio = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
}

const FAV_KEY = 'waves_favs_v1';
function readFavs() {
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const visitorId = (() => {
  try {
    let v = localStorage.getItem('waves_vid');
    if (!v) {
      v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('waves_vid', v);
    }
    return v;
  } catch {
    return 'v_anon';
  }
})();

export function trackEvent(type, beatId, label) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, beat_id: beatId ?? null, label: label || null, visitor: visitorId }),
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function PlayerProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState(readFavs);

  const currentRef = useRef(null);
  const queueRef = useRef([]);
  currentRef.current = current;
  queueRef.current = queue;

  const playBeat = (beat, q) => {
    if (!audio || !beat || !beat.preview_url) return;
    const nextQ = q && q.length ? q : [beat];
    setQueue(nextQ);
    queueRef.current = nextQ;
    currentRef.current = beat;
    setCurrent(beat);
    setProgress(0);
    setCurTime(0);
    audio.src = beat.preview_url;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    trackEvent('play', beat.id, `Play — ${beat.title}`);
  };

  const playAt = (dir) => {
    const q = queueRef.current;
    const cur = currentRef.current;
    if (!q.length || !cur) return;
    const idx = q.findIndex((b) => b.id === cur.id);
    const nextIdx = (idx + dir + q.length) % q.length;
    playBeat(q[nextIdx], q);
  };

  const toggle = () => {
    if (!audio || !currentRef.current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const next = () => playAt(1);
  const prev = () => {
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    playAt(-1);
  };

  const seekTo = (frac) => {
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(0.999, frac)) * audio.duration;
  };

  const isFav = (id) => favorites.some((b) => b.id === id);

  const toggleFavorite = (beat) => {
    if (!beat) return;
    setFavorites((prev) => {
      const exists = prev.some((b) => b.id === beat.id);
      const nextL = exists
        ? prev.filter((b) => b.id !== beat.id)
        : [
            {
              id: beat.id,
              title: beat.title,
              genre: beat.genre,
              bpm: beat.bpm,
              price: beat.price,
              availability: beat.availability,
              artwork_url: beat.artwork_url,
              preview_url: beat.preview_url,
              collaborators: beat.collaborators,
            },
            ...prev,
          ];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(nextL));
      } catch {
        /* noop */
      }
      if (!exists) trackEvent('favorite', beat.id, `Favorite — ${beat.title}`);
      return nextL;
    });
  };

  useEffect(() => {
    if (!audio) return undefined;
    const onTime = () => {
      if (audio.duration && isFinite(audio.duration)) setProgress(audio.currentTime / audio.duration);
      setCurTime(audio.currentTime || 0);
    };
    const onMeta = () => setDuration(audio.duration && isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => playAt(1);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider
      value={{
        current,
        queue,
        playing,
        progress,
        curTime,
        duration,
        expanded,
        setExpanded,
        playBeat,
        toggle,
        next,
        prev,
        seekTo,
        favorites,
        isFav,
        toggleFavorite,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
