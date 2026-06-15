import type {
  Asset,
  TimelineClip
} from "../models/index.js";
import type { Project } from "../project/index.js";
import { buildTimelineFromScenes } from "../timeline/index.js";

export function assignAssetsToScenes(project: Project): Project {
  const projectWithTimeline = hasSceneClips(project)
    ? project
    : buildTimelineFromScenes(project);
  const assetBySceneId = new Map<string, Asset>();

  for (const scene of projectWithTimeline.scenes) {
    const asset = findBestAsset(scene.keywords, projectWithTimeline.assets);

    if (asset) {
      assetBySceneId.set(scene.id, asset);
    }
  }

  return {
    ...projectWithTimeline,
    timeline: {
      ...projectWithTimeline.timeline,
      tracks: projectWithTimeline.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => assignAssetToClip(clip, assetBySceneId))
      }))
    }
  };
}

function hasSceneClips(project: Project): boolean {
  return project.timeline.tracks.some((track) =>
    track.clips.some((clip) => clip.sceneId !== undefined)
  );
}

function assignAssetToClip(
  clip: TimelineClip,
  assetBySceneId: Map<string, Asset>
): TimelineClip {
  if (!clip.sceneId) {
    return clip;
  }

  const asset = assetBySceneId.get(clip.sceneId);

  if (!asset) {
    return clip;
  }

  return {
    ...clip,
    mediaType: asset.kind,
    source: {
      assetId: asset.id
    }
  };
}

function findBestAsset(
  sceneKeywords: string[],
  assets: Asset[]
): Asset | undefined {
  let bestAsset: Asset | undefined;
  let bestScore = 0;

  for (const asset of assets) {
    const score = countTagOverlap(sceneKeywords, asset.tags);

    if (score > bestScore) {
      bestAsset = asset;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestAsset : undefined;
}

function countTagOverlap(sceneKeywords: string[], assetTags: string[]): number {
  const normalizedAssetTags = new Set(assetTags.map(normalizeKeyword));

  return sceneKeywords
    .map(normalizeKeyword)
    .filter((keyword) => normalizedAssetTags.has(keyword)).length;
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}
