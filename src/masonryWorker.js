// Generates one masonry texture set off the main thread.
import { makeMasonry, Profiles } from './masonry.js';

self.onmessage = ({ data: { name, seed } }) => {
  const t = makeMasonry(Profiles[name], seed);
  self.postMessage({ name, seed, ...t }, [t.color.buffer, t.normal.buffer, t.roughness.buffer, t.occlusion.buffer]);
};
