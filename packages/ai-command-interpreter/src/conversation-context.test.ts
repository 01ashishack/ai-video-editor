import {
  createProject,
  type Project,
  type Scene,
  type TimelineClip,
  type Track
} from "@aide/core";
import { describe, expect, it } from "vitest";
import {
  resolveContextReference,
  updateConversationContext
} from "./conversation-context.js";
import type { ConversationContext } from "./conversation-context-types.js";
import { runEditingSession } from "./editing-session.js";

function createContextProject(): Project {
  const scene: Scene = {
    id: "scene_001",
    order: 1,
    source: "manual",
    title: "Scene 1",
    text: "Scene 1",
    keywords: [],
    sourceRefs: [],
    status: "assigned",
    constraints: {}
  };
  const clip: TimelineClip = {
    id: "clip_alpha",
    trackId: "track_001",
    sceneId: scene.id,
    mediaType: "image",
    role: "primary-visual",
    timelineRange: {
      start: 0,
      duration: 1000
    },
    enabled: true,
    locked: false,
    links: [],
    render: {}
  };
  const track: Track = {
    id: "track_001",
    kind: "video",
    role: "primary-video",
    name: "Primary Video",
    order: 1,
    clips: [clip]
  };

  return {
    ...createProject({
      projectId: "project_001",
      name: "Context Project",
      createdAt: "2026-06-16T00:00:00.000Z"
    }),
    scenes: [scene],
    timeline: {
      id: "project_001_timeline",
      tracks: [track],
      transitions: [],
      markers: []
    }
  };
}

describe("conversation context", () => {
  it("stores session state", () => {
    const project = createContextProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");
    const context = updateConversationContext({}, session);

    expect(context.lastIntent).toEqual(session.intents.at(-1));
    expect(context.lastResolvedIntent).toEqual(session.resolvedIntents.at(-1));
    expect(context.lastPlannedCommands).toEqual(session.plannedCommands);
    expect(context.lastPlannedCommands).not.toBe(session.plannedCommands);
    expect(context.lastProjectId).toBe("project_001");
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("resolves it using the previous clip reference", () => {
    const project = createContextProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");
    const context = updateConversationContext({}, session);

    expect(resolveContextReference(context, "trim it to 250 ms")).toBe(
      "trim clip_alpha to 250 ms"
    );
    expect(resolveContextReference(context, "move it earlier")).toBe(
      "move clip_alpha earlier"
    );
  });

  it("is deterministic", () => {
    const project = createContextProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");
    const context = updateConversationContext({}, session);

    expect(updateConversationContext({}, session)).toEqual(
      updateConversationContext({}, session)
    );
    expect(resolveContextReference(context, "trim it to 250 ms")).toBe(
      resolveContextReference(context, "trim it to 250 ms")
    );
  });

  it("leaves requests unchanged for empty context", () => {
    expect(resolveContextReference({}, "trim it to 250 ms")).toBe(
      "trim it to 250 ms"
    );
  });

  it("does not mutate inputs", () => {
    const project = createContextProject();
    const session = runEditingSession(project, "trim clip_alpha to 500 ms");
    const context: ConversationContext = updateConversationContext({}, session);
    const originalContext = structuredClone(context);
    const originalSession = structuredClone(session);

    const nextContext = updateConversationContext(context, session);
    const resolvedRequest = resolveContextReference(context, "trim it to 250 ms");

    expect(context).toEqual(originalContext);
    expect(session).toEqual(originalSession);
    expect(nextContext).not.toBe(context);
    expect(resolvedRequest).toBe("trim clip_alpha to 250 ms");
  });
});
