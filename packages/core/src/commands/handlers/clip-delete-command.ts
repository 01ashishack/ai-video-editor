import type { Project } from "../../project/index.js";
import type { CommandHandler } from "../command-types.js";

export interface ClipDeleteCommandPayload {
  clipId: string;
}

export const clipDeleteCommandHandler: CommandHandler<
  ClipDeleteCommandPayload
> = (context) => {
  const { clipId } = context.command.payload;
  const projectHashBefore = context.project.metadata.contentHash;
  const clipExists = context.project.timeline.tracks.some((track) =>
    track.clips.some((clip) => clip.id === clipId)
  );

  if (!clipExists) {
    return {
      project: context.project as Project,
      result: {
        commandId: context.command.commandId,
        status: "rejected",
        projectId: context.command.projectId,
        summary: `Clip not found: ${clipId}.`,
        diff: {
          added: [],
          updated: [],
          removed: []
        },
        warnings: [],
        errors: [
          {
            code: "CLIP_NOT_FOUND",
            message: `Clip not found: ${clipId}.`
          }
        ],
        projectHashBefore
      }
    };
  }

  let deleted = false;
  const nextProject: Project = {
    ...context.project,
    timeline: {
      ...context.project.timeline,
      tracks: context.project.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => {
          if (!deleted && clip.id === clipId) {
            deleted = true;
            return false;
          }

          return true;
        })
      }))
    }
  };

  return {
    project: context.dryRun ? (context.project as Project) : nextProject,
    result: {
      commandId: context.command.commandId,
      status: context.dryRun ? "dry-run" : "applied",
      projectId: context.command.projectId,
      summary: `Deleted clip ${clipId}.`,
      diff: {
        added: [],
        updated: [],
        removed: [
          {
            path: `/timeline/clips/${clipId}`,
            entityType: "TimelineClip",
            entityId: clipId
          }
        ]
      },
      warnings: [],
      errors: [],
      projectHashBefore,
      projectHashAfter: context.dryRun
        ? undefined
        : nextProject.metadata.contentHash
    }
  };
};
