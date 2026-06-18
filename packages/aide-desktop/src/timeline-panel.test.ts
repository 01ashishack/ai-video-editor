import {
  createProject,
  serializeProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import {
  openProject,
  type OpenProjectDialog,
  type OpenProjectDialogOptions,
  type OpenProjectDialogResult
} from "./open-project.js";
import {
  createTimelinePanel,
  createTimelinePanelModel
} from "./timeline-panel.js";
import type { DesktopBrowserWindow } from "./window.js";

describe("desktop timeline panel", () => {
  it("renders a single scene timeline", () => {
    const panel = createTimelinePanel(createSingleSceneProject());

    expect(panel).toContain("Scene 1: Introduction");
    expect(panel).toContain("Video Track: Video");
    expect(panel).toContain("[Opening Clip]");
    expect(panel).toContain("<span>0s</span>");
    expect(panel).toContain("─────");
    expect(panel).toContain("<span>5s</span>");
    expect(panel).toContain("duration 5s");
    expect(panel).toContain("Audio Track: Narration");
  });

  it("renders multiple scenes in scene order", () => {
    const model = createTimelinePanelModel(createMultipleSceneProject());

    expect(model.scenes.map((scene) => scene.name)).toEqual([
      "Introduction",
      "Conclusion"
    ]);
    expect(model.scenes[0]?.tracks.map((track) => track.name)).toEqual([
      "Video",
      "Narration"
    ]);
    expect(model.scenes[1]?.tracks[0]?.clips.map((clip) => clip.name)).toEqual([
      "Closing Clip"
    ]);
  });

  it("renders an empty timeline", () => {
    const project = createProject({
      projectId: "empty_timeline",
      name: "Empty Timeline",
      createdAt: "2026-06-18T00:00:00.000Z"
    });

    expect(createTimelinePanel(project)).toContain("No timeline scenes");
  });

  it("produces deterministic output", () => {
    const project = createMultipleSceneProject();

    expect(createTimelinePanel(project)).toBe(createTimelinePanel(project));
  });

  it("does not mutate the project", () => {
    const project = createMultipleSceneProject();
    const original = structuredClone(project);

    createTimelinePanelModel(project);
    createTimelinePanel(project);

    expect(project).toEqual(original);
  });

  it("renders the timeline through desktop project opening", async () => {
    const project = createMultipleSceneProject();
    const serializedProject = serializeProject(project);
    const window = new MockWindow();

    const result = await openProject(window, {
      dialog: new MockDialog({
        canceled: false,
        filePaths: ["timeline-project.json"]
      }),
      readTextFile: async () => serializedProject
    });
    const html = decodeDataUrl(window.loadedUrl);

    expect(result.opened).toBe(true);
    expect(html).toContain('aria-label="Timeline"');
    expect(html).toContain("Scene 1: Introduction");
    expect(html).toContain("[Opening Clip]");
    expect(html).toContain("duration 5s");
    expect(html).toContain("Scene 2: Conclusion");
    expect(serializeProject(project)).toBe(serializedProject);
  });
});

class MockWindow implements DesktopBrowserWindow {
  loadedUrl = "";

  loadURL(url: string): void {
    this.loadedUrl = url;
  }
}

class MockDialog implements OpenProjectDialog {
  constructor(private readonly result: OpenProjectDialogResult) {}

  async showOpenDialog(
    _window: DesktopBrowserWindow,
    _options: OpenProjectDialogOptions
  ): Promise<OpenProjectDialogResult> {
    return this.result;
  }
}

function createSingleSceneProject(): Project {
  const scene = createScene("scene_intro", 1, "Introduction");
  const videoTrack = createTrack("track_video", "video", "Video", 1, [
    createClip(
      "clip_open",
      "track_video",
      "scene_intro",
      0,
      5000,
      "Opening Clip",
      "video"
    )
  ]);
  const audioTrack = createTrack("track_audio", "audio", "Narration", 2, [
    createClip(
      "clip_narration",
      "track_audio",
      "scene_intro",
      0,
      10000,
      "Narration",
      "audio"
    )
  ]);

  return createTimelineProject([scene], [audioTrack, videoTrack]);
}

function createMultipleSceneProject(): Project {
  const scenes = [
    createScene("scene_conclusion", 2, "Conclusion"),
    createScene("scene_intro", 1, "Introduction")
  ];
  const videoTrack = createTrack("track_video", "video", "Video", 1, [
    createClip(
      "clip_close",
      "track_video",
      "scene_conclusion",
      10000,
      5000,
      "Closing Clip",
      "video"
    ),
    createClip(
      "clip_open",
      "track_video",
      "scene_intro",
      0,
      5000,
      "Opening Clip",
      "video"
    ),
    createClip(
      "clip_middle",
      "track_video",
      "scene_intro",
      5000,
      5000,
      "Middle Clip",
      "video"
    )
  ]);
  const audioTrack = createTrack("track_audio", "audio", "Narration", 2, [
    createClip(
      "clip_narration",
      "track_audio",
      "scene_intro",
      0,
      10000,
      "Narration",
      "audio"
    )
  ]);

  return createTimelineProject(scenes, [audioTrack, videoTrack]);
}

function createTimelineProject(scenes: Scene[], tracks: Track[]): Project {
  return {
    ...createProject({
      projectId: "timeline_project_001",
      name: "Timeline Project",
      createdAt: "2026-06-18T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "timeline_project_001_timeline",
      tracks,
      transitions: [],
      markers: []
    }
  };
}

function createScene(id: string, order: number, title: string): Scene {
  return {
    id,
    order,
    source: "manual",
    title,
    text: title,
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
}

function createTrack(
  id: string,
  kind: "video" | "audio",
  name: string,
  order: number,
  clips: TimelineClip[]
): Track {
  return {
    id,
    kind,
    role: kind === "audio" ? "voiceover" : "primary-video",
    name,
    order,
    clips
  };
}

function createClip(
  id: string,
  trackId: string,
  sceneId: string,
  start: number,
  duration: number,
  text: string,
  mediaType: "video" | "audio"
): TimelineClip {
  return {
    id,
    trackId,
    sceneId,
    mediaType,
    role: mediaType === "audio" ? "voiceover" : "primary-visual",
    timelineRange: {
      start,
      duration
    },
    text,
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
}

function decodeDataUrl(url: string): string {
  return decodeURIComponent(url.slice(url.indexOf(",") + 1));
}
