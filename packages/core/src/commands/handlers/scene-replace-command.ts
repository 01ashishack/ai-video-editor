import type { CommandHandler } from "../command-types.js";
import type { Project } from "../../project/index.js";
import { deriveSceneTitle } from "../../scenes/index.js";

export interface SceneReplaceCommandPayload {
  sceneId: string;
  text: string;
}

export const sceneReplaceCommandHandler: CommandHandler<
  SceneReplaceCommandPayload
> = (context) => {
  const { sceneId, text } = context.command.payload;
  const projectHashBefore = context.project.metadata.contentHash;
  const scene = context.project.scenes.find((item) => item.id === sceneId);

  if (!scene) {
    return {
      project: context.project as Project,
      result: {
        commandId: context.command.commandId,
        status: "rejected",
        projectId: context.command.projectId,
        summary: `Scene not found: ${sceneId}.`,
        diff: {
          added: [],
          updated: [],
          removed: []
        },
        warnings: [],
        errors: [
          {
            code: "SCENE_NOT_FOUND",
            message: `Scene not found: ${sceneId}.`,
            path: "/scenes"
          }
        ],
        projectHashBefore
      }
    };
  }

  const nextProject: Project = {
    ...context.project,
    scenes: context.project.scenes.map((item) =>
      item.id === sceneId
        ? {
            ...item,
            title: deriveSceneTitle(text),
            text
          }
        : item
    )
  };
  const warnings =
    scene.text !== text
      ? [
          {
            code: "SCENE_KEYWORDS_STALE",
            message: "Keywords may no longer reflect scene text."
          }
        ]
      : [];

  return {
    project: context.dryRun ? (context.project as Project) : nextProject,
    result: {
      commandId: context.command.commandId,
      status: context.dryRun ? "dry-run" : "applied",
      projectId: context.command.projectId,
      summary: `Replaced text for scene ${sceneId}.`,
      diff: {
        added: [],
        updated: [
          {
            path: `/scenes/${sceneId}`,
            entityType: "Scene",
            entityId: sceneId
          }
        ],
        removed: []
      },
      warnings,
      errors: [],
      projectHashBefore,
      projectHashAfter: context.dryRun
        ? undefined
        : nextProject.metadata.contentHash
    }
  };
};
