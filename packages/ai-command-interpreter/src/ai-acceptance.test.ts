import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import {
  EDITING_INTENT_SCHEMA_VERSION,
  MockLLMProvider,
  editProject
} from "./index.js";

function createAcceptanceProject(): Project {
  const scenes: Scene[] = [
    createScene("scene_001", 1, "The city wakes before sunrise."),
    createScene("scene_002", 2, "A creator prepares the first edit."),
    createScene("scene_003", 3, "The timeline comes together.")
  ];
  const videoTrack: Track = {
    id: "track_video_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips: [
      createClip("clip_intro", "track_video_001", "scene_001", 0, 4000),
      createClip("clip_broll", "track_video_001", "scene_002", 4000, 2000),
      createClip("clip_outro", "track_video_001", "scene_003", 6000, 3000)
    ]
  };
  const audioTrack: Track = {
    id: "track_audio_001",
    kind: "audio",
    role: "voiceover",
    name: "Voiceover",
    order: 2,
    clips: [
      createClip("clip_voiceover", "track_audio_001", "scene_001", 0, 9000)
    ]
  };

  return {
    ...createProject({
      projectId: "project_acceptance_001",
      name: "AI Acceptance Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes,
    timeline: {
      id: "project_acceptance_001_timeline",
      tracks: [videoTrack, audioTrack],
      transitions: [],
      markers: [
        {
          id: "marker_opening",
          time: 0,
          label: "Opening"
        }
      ]
    }
  };
}

function createScene(id: string, order: number, text: string): Scene {
  return {
    id,
    order,
    source: "srt",
    title: text,
    text,
    keywords: ["acceptance", `scene-${order}`],
    sourceRefs: [
      {
        sourceId: "source_srt_001",
        cueIndex: order
      }
    ],
    status: "assigned",
    constraints: {}
  };
}

function createClip(
  id: string,
  trackId: string,
  sceneId: string,
  start: number,
  duration: number
): TimelineClip {
  return {
    id,
    trackId,
    sceneId,
    mediaType: trackId.startsWith("track_audio") ? "audio" : "video",
    role: trackId.startsWith("track_audio") ? "voiceover" : "primary-visual",
    timelineRange: {
      start,
      duration
    },
    source: {
      assetId: `${id}_asset`
    },
    enabled: true,
    locked: false,
    links: [],
    render: {
      fit: "cover"
    }
  };
}

describe("AI editing acceptance", () => {
  it("edits a project from a delete clip request", async () => {
    const result = await editProject({
      project: createAcceptanceProject(),
      request: "delete clip_intro"
    });
    const videoClips = result.updatedProject.timeline.tracks[0]?.clips;

    expect(videoClips?.map((clip) => clip.id)).toEqual([
      "clip_broll",
      "clip_outro"
    ]);
    expect(result.executionResult.executedCommandCount).toBe(1);
    expect(result.intents).toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.delete",
        payload: {
          clipId: "clip_intro"
        }
      }
    ]);
    expect(result.confidence).toBe(0.95);
    expect(result.requiresClarification).toBe(false);
    expect(result.ambiguityReasons).toEqual([]);
  });

  it("edits a project from a move clip request", async () => {
    const result = await editProject({
      project: createAcceptanceProject(),
      request: "move clip_intro after clip_broll"
    });
    const clip = result.updatedProject.timeline.tracks[0]?.clips.find(
      (item) => item.id === "clip_intro"
    );

    expect(clip?.timelineRange.start).toBe(6000);
    expect(result.executionResult.executedCommandCount).toBe(1);
    expect(result.intents).toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.move",
        payload: {
          clipId: "clip_intro",
          placement: "after",
          targetClipId: "clip_broll"
        }
      }
    ]);
    expect(result.confidence).toBe(0.7);
    expect(result.requiresClarification).toBe(true);
    expect(result.ambiguityReasons).toEqual([
      "Relative target reference must be resolved."
    ]);
  });

  it("edits a project from a trim clip request", async () => {
    const result = await editProject({
      project: createAcceptanceProject(),
      request: "trim clip_voiceover to 2 seconds"
    });
    const clip = result.updatedProject.timeline.tracks[1]?.clips[0];

    expect(clip?.timelineRange.duration).toBe(2000);
    expect(result.executionResult.executedCommandCount).toBe(1);
    expect(result.intents).toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.trim",
        payload: {
          clipId: "clip_voiceover",
          duration: 2000
        }
      }
    ]);
    expect(result.confidence).toBe(0.95);
    expect(result.requiresClarification).toBe(false);
    expect(result.ambiguityReasons).toEqual([]);
  });

  it("edits a project from a split clip request", async () => {
    const result = await editProject({
      project: createAcceptanceProject(),
      request: "split clip_intro at 2 seconds"
    });
    const videoClips = result.updatedProject.timeline.tracks[0]?.clips;

    expect(videoClips?.map((clip) => clip.id)).toEqual([
      "clip_intro",
      "clip_intro_part2",
      "clip_broll",
      "clip_outro"
    ]);
    expect(videoClips?.[0]?.timelineRange).toEqual({
      start: 0,
      duration: 2000
    });
    expect(videoClips?.[1]?.timelineRange).toEqual({
      start: 2000,
      duration: 2000
    });
    expect(result.executionResult.executedCommandCount).toBe(1);
    expect(result.intents).toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "clip.split",
        payload: {
          clipId: "clip_intro",
          splitAt: 2000
        }
      }
    ]);
    expect(result.confidence).toBe(0.95);
    expect(result.requiresClarification).toBe(false);
    expect(result.ambiguityReasons).toEqual([]);
  });

  it("edits a project from an AI-generated scene replace request", async () => {
    const replacementText = "A sharper opening line sets the pace.";
    const provider = new MockLLMProvider({
      defaultResponse: JSON.stringify([
        {
          schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
          type: "scene.replace",
          payload: {
            sceneId: "scene_001",
            text: replacementText
          }
        }
      ])
    });

    const result = await editProject({
      project: createAcceptanceProject(),
      request: "make the opening narration sharper",
      provider
    });

    expect(result.updatedProject.scenes[0]?.text).toBe(replacementText);
    expect(result.updatedProject.scenes[0]?.title).toBe(replacementText);
    expect(result.executionResult.executedCommandCount).toBe(1);
    expect(result.intents).toEqual([
      {
        schemaVersion: EDITING_INTENT_SCHEMA_VERSION,
        type: "scene.replace",
        payload: {
          sceneId: "scene_001",
          text: replacementText
        }
      }
    ]);
    expect(result.confidence).toBe(0.95);
    expect(result.requiresClarification).toBe(false);
    expect(result.ambiguityReasons).toEqual([]);
  });

  it("produces deterministic public API results", async () => {
    const request = "trim clip_intro to 3 seconds";

    await expect(
      editProject({
        project: createAcceptanceProject(),
        request
      })
    ).resolves.toEqual(
      await editProject({
        project: createAcceptanceProject(),
        request
      })
    );
  });
});
